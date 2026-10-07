package main

import (
	"context"
	"crypto/rand"
	"crypto/tls"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"
)

var (
	plexServerRegex = regexp.MustCompile(`^https?://[^/]+$`)
)

type ServerApp struct {
	status               Status
	statusMu             sync.RWMutex
	deploymentID         string
	plexServer           string
	disableTLSVerify     bool
	disableNevuSync      bool
	disableRequestLog    bool
	disableGlobalReviews bool
	port                 int
	listenPort           int
	wwwDir               string
	db                   *Database
	proxyService         *ProxyService
	reviewsHandler       *ReviewsHandler
	syncServer           *SyncServer
	remoteServer         *RemoteServer
}

func main() {
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		log.Fatalf("Failed to generate deployment ID: %v", err)
	}
	deploymentID := hex.EncodeToString(b)
	log.Printf("Deployment ID: %s", deploymentID)

	app := &ServerApp{
		deploymentID: deploymentID,
		status: Status{
			Ready:   false,
			Error:   false,
			Message: "Server is starting up...",
		},
	}

	app.initEnv()

	// Initialize Database
	db, err := initDB()
	if err != nil {
		log.Fatalf("Database initialization failed: %v", err)
	}
	defer db.Close()
	app.db = db

	// Initialize Plex client
	initPlexClient(app.disableTLSVerify)

	// Initialize Proxy Service
	proxySvc, err := NewProxyService(app.plexServer, app.disableTLSVerify, !app.disableRequestLog)
	if err != nil {
		log.Printf("Proxy service init warning: %v", err)
	}
	app.proxyService = proxySvc

	// Initialize Reviews Handler
	app.reviewsHandler = NewReviewsHandler(app.db, app.disableGlobalReviews)

	// Initialize Socket.io servers
	if !app.disableNevuSync {
		app.syncServer = InitSyncServer("*")
	}
	app.remoteServer = InitRemoteServer("*")

	// Determine static www directory
	app.resolveWWWDir()

	// Background startup checks & validation
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go app.runStartupChecks(ctx)

	// Start UDP discovery
	go StartDiscovery(ctx, app.port, app.deploymentID, app.plexServer)

	// Build HTTP router
	handler := app.buildRouter()

	listenAddr := fmt.Sprintf(":%d", app.listenPort)
	server := &http.Server{
		Addr:    listenAddr,
		Handler: handler,
	}

	go func() {
		log.Printf("Server started on http://localhost:%d", app.listenPort)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server ListenAndServe failed: %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	cancel()
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()
	server.Shutdown(shutdownCtx)
	log.Println("Server stopped")
}

func (a *ServerApp) initEnv() {
	portStr := os.Getenv("PORT")
	if portStr == "" {
		portStr = "3000"
	}
	p, err := strconv.Atoi(portStr)
	if err != nil {
		p = 3000
	}
	a.port = p

	listenPortStr := os.Getenv("LISTEN_PORT")
	if listenPortStr == "" {
		listenPortStr = "3000"
	}
	lp, err := strconv.Atoi(listenPortStr)
	if err != nil {
		lp = 3000
	}
	a.listenPort = lp

	a.plexServer = os.Getenv("PLEX_SERVER")
	a.disableTLSVerify = os.Getenv("DISABLE_TLS_VERIFY") == "true"
	a.disableNevuSync = os.Getenv("DISABLE_NEVU_SYNC") == "true"
	a.disableRequestLog = os.Getenv("DISABLE_REQUEST_LOGGING") == "true"
	a.disableGlobalReviews = os.Getenv("DISABLE_GLOBAL_REVIEWS") == "true"
}

func (a *ServerApp) resolveWWWDir() {
	candidates := []string{
		"www",
		"/app/www",
		"../frontend/build",
		"frontend/build",
	}
	for _, cand := range candidates {
		if stat, err := os.Stat(cand); err == nil && stat.IsDir() {
			a.wwwDir = cand
			return
		}
	}
	a.wwwDir = "www"
}

func (a *ServerApp) setStatus(ready, isErr bool, msg string) {
	a.statusMu.Lock()
	defer a.statusMu.Unlock()
	a.status.Ready = ready
	a.status.Error = isErr
	a.status.Message = msg
}

func (a *ServerApp) getStatus() Status {
	a.statusMu.RLock()
	defer a.statusMu.RUnlock()
	return a.status
}

func (a *ServerApp) runStartupChecks(ctx context.Context) {
	if os.Getenv("PROXY_PLEX_SERVER") != "" {
		msg := "PROXY_PLEX_SERVER environment variable is deprecated. \nPlease use PLEX_SERVER instead"
		log.Println(msg)
		a.setStatus(false, true, msg)
		return
	}

	if os.Getenv("DISABLE_PROXY") != "" {
		msg := "DISABLE_PROXY environment variable is deprecated. \nPlease remove it from your environment variables"
		log.Println(msg)
		a.setStatus(false, true, msg)
		return
	}

	if a.plexServer == "" {
		msg := "PLEX_SERVER environment variable not set"
		log.Println(msg)
		a.setStatus(false, true, msg)
		return
	}

	if !plexServerRegex.MatchString(a.plexServer) {
		msg := "Invalid PLEX_SERVER environment variable. \nThe URL must start with http:// or https:// and must not end with a /"
		log.Println(msg)
		a.setStatus(false, true, msg)
		return
	}

	// Verify reachability of PLEX_SERVER/identity
	client := &http.Client{
		Timeout: 5 * time.Second,
	}
	if a.disableTLSVerify {
		client.Transport = &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		}
	}

	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		targetURL := a.plexServer + "/identity"
		req, err := http.NewRequestWithContext(ctx, "GET", targetURL, nil)
		if err == nil {
			resp, err := client.Do(req)
			if err == nil && resp.StatusCode == http.StatusOK {
				resp.Body.Close()
				a.setStatus(true, false, "OK")
				return
			}
			if resp != nil {
				resp.Body.Close()
			}
			if err != nil {
				log.Printf("Error reaching PLEX_SERVER: %v", err)
			}
		}

		a.setStatus(false, true, "Proxy cannot reach PLEX_SERVER")
		log.Println("Proxy cannot reach PLEX_SERVER, retrying in 3 seconds...")

		select {
		case <-ctx.Done():
			return
		case <-time.After(3 * time.Second):
		}
	}
}

func (a *ServerApp) buildRouter() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !a.disableRequestLog {
			log.Printf("[%s] [%s] %s", time.Now().UTC().Format(time.RFC3339), r.Method, r.URL.RequestURI())
		}

		// CORS headers
		origin := r.Header.Get("Origin")
		if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
		} else {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "*")
		w.Header().Set("Access-Control-Expose-Headers", "*")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		path := r.URL.Path

		// Socket.IO paths
		if strings.HasPrefix(path, "/socket.io") {
			if a.syncServer != nil {
				a.syncServer.io.ServeHandler(nil).ServeHTTP(w, r)
			} else {
				http.NotFound(w, r)
			}
			return
		}

		if strings.HasPrefix(path, "/nevu-remote") {
			if a.remoteServer != nil {
				a.remoteServer.io.ServeHandler(nil).ServeHTTP(w, r)
			} else {
				http.NotFound(w, r)
			}
			return
		}

		// Dynamic proxy
		if strings.HasPrefix(path, "/dynproxy") ||
			strings.HasPrefix(path, "/video/") ||
			strings.HasPrefix(path, "/photo/") ||
			strings.HasPrefix(path, "/library/parts/") ||
			strings.HasPrefix(path, "/:/") {
			if a.proxyService != nil {
				a.proxyService.ServeDynProxy(w, r)
			} else {
				http.Error(w, "Proxy service unavailable", http.StatusBadGateway)
			}
			return
		}

		// REST Endpoints
		switch {
		case path == "/status" && r.Method == http.MethodGet:
			a.handleStatus(w, r)
			return

		case path == "/config" && r.Method == http.MethodGet:
			a.handleConfig(w, r)
			return

		case strings.HasPrefix(path, "/user/options"):
			a.handleUserOptions(w, r)
			return

		case path == "/reviews":
			switch r.Method {
			case http.MethodGet:
				a.reviewsHandler.HandleGetReviews(w, r)
			case http.MethodPost:
				a.reviewsHandler.HandlePostReviews(w, r)
			case http.MethodDelete:
				a.reviewsHandler.HandleDeleteReviews(w, r)
			default:
				http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			}
			return

		case path == "/proxy":
			if a.proxyService == nil {
				http.Error(w, "Proxy service unavailable", http.StatusBadGateway)
				return
			}
			switch r.Method {
			case http.MethodPost:
				a.proxyService.HandlePostProxy(w, r)
			case http.MethodGet:
				a.proxyService.HandleGetProxy(w, r)
			default:
				http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			}
			return
		}

		// Static files & SPA fallback
		a.serveStaticOrSPA(w, r)
	})
}

func (a *ServerApp) handleStatus(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(a.getStatus())
}

func (a *ServerApp) handleConfig(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ConfigResponse{
		PlexServer:   a.plexServer,
		DeploymentID: a.deploymentID,
		Config: ConfigOpts{
			DisableProxy:    false,
			DisableNevuSync: a.disableNevuSync,
		},
	})
}

func (a *ServerApp) handleUserOptions(w http.ResponseWriter, r *http.Request) {
	token := r.Header.Get("x-plex-token")
	if token == "" {
		token = r.Header.Get("X-Plex-Token")
	}
	if token == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	user, err := CheckPlexUser(token)
	if err != nil || user == nil {
		http.Error(w, "Unauthorized user", http.StatusUnauthorized)
		return
	}

	// Route /user/options/:key or /user/options
	subpath := strings.TrimPrefix(r.URL.Path, "/user/options")
	subpath = strings.TrimPrefix(subpath, "/")

	if subpath == "" {
		switch r.Method {
		case http.MethodGet:
			options, err := a.db.GetUserOptions(user.UUID)
			if err != nil {
				log.Printf("Error fetching user options: %v", err)
				http.Error(w, "Internal server error", http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(options)
			return
		case http.MethodPost:
			var body struct {
				Key   string `json:"key"`
				Value string `json:"value"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Key == "" || body.Value == "" {
				http.Error(w, "Bad request", http.StatusBadRequest)
				return
			}
			opt, err := a.db.SetUserOption(user.UUID, body.Key, body.Value)
			if err != nil {
				log.Printf("Error setting user option: %v", err)
				http.Error(w, "Internal server error", http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(opt)
			return
		}
	} else {
		// Specific key
		if r.Method == http.MethodGet {
			key, _ := url.PathUnescape(subpath)
			opt, err := a.db.GetUserOption(user.UUID, key)
			if err != nil {
				log.Printf("Error fetching user option: %v", err)
				http.Error(w, "Internal server error", http.StatusInternalServerError)
				return
			}
			if opt == nil {
				http.Error(w, "Option not found", http.StatusNotFound)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(opt)
			return
		}
	}

	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}

func (a *ServerApp) serveStaticOrSPA(w http.ResponseWriter, r *http.Request) {
	if a.wwwDir == "" {
		http.NotFound(w, r)
		return
	}

	cleanPath := filepath.Clean(r.URL.Path)
	targetFilePath := filepath.Join(a.wwwDir, cleanPath)

	info, err := os.Stat(targetFilePath)
	if err == nil && !info.IsDir() {
		http.ServeFile(w, r, targetFilePath)
		return
	}

	// Fallback to index.html for SPA routes
	indexPath := filepath.Join(a.wwwDir, "index.html")
	if _, err := os.Stat(indexPath); err == nil {
		http.ServeFile(w, r, indexPath)
		return
	}

	http.NotFound(w, r)
}
