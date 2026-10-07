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
	"regexp"
	"strconv"
	"strings"
	"sync"
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
	plexServerMu         sync.RWMutex
	checkTrigger         chan struct{}
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
		checkTrigger: make(chan struct{}, 1),
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

	// If PLEX_SERVER wasn't set by environment variable, check the database
	if app.getPlexServer() == "" {
		if savedServer, err := db.GetServerConfig("plex_server"); err == nil && savedServer != "" {
			app.setPlexServer(savedServer)
			log.Printf("Loaded Plex server address from database: %s", savedServer)
		}
	}

	// Initialize Plex client
	initPlexClient(app.disableTLSVerify)

	// Initialize Proxy Service
	proxySvc, err := NewProxyService(app.getPlexServer(), app.disableTLSVerify, !app.disableRequestLog)
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

	// Initialize static frontend (embedded or disk)
	app.initStaticServing()

	// Background startup checks & validation
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go app.runStartupChecks(ctx)

	// Start UDP discovery
	go StartDiscovery(ctx, app.port, app.deploymentID, app.getPlexServer)

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

	// Run lifecycle (Wails v3 desktop GUI or headless server mode)
	app.runLifecycle(server, cancel)
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


func (a *ServerApp) getPlexServer() string {
	a.plexServerMu.RLock()
	defer a.plexServerMu.RUnlock()
	return a.plexServer
}

func (a *ServerApp) setPlexServer(server string) {
	a.plexServerMu.Lock()
	a.plexServer = server
	a.plexServerMu.Unlock()
}

func (a *ServerApp) triggerCheck() {
	select {
	case a.checkTrigger <- struct{}{}:
	default:
	}
}

func (a *ServerApp) setStatus(ready, isErr bool, msg string, configured bool) {
	a.statusMu.Lock()
	defer a.statusMu.Unlock()
	a.status.Ready = ready
	a.status.Error = isErr
	a.status.Message = msg
	a.status.PlexServer = a.getPlexServer()
	a.status.Configured = configured
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
		a.setStatus(false, true, msg, false)
		return
	}

	if os.Getenv("DISABLE_PROXY") != "" {
		msg := "DISABLE_PROXY environment variable is deprecated. \nPlease remove it from your environment variables"
		log.Println(msg)
		a.setStatus(false, true, msg, false)
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
		serverURL := a.getPlexServer()
		if serverURL == "" {
			msg := "Plex Media Server address is not configured. Please enter your Plex server address below."
			a.setStatus(false, true, msg, false)
			log.Println("Plex server address is not configured. Waiting for configuration via UI...")
			select {
			case <-ctx.Done():
				return
			case <-a.checkTrigger:
				continue
			}
		}

		if !plexServerRegex.MatchString(serverURL) {
			msg := "Invalid Plex server URL. The URL must start with http:// or https:// and must not end with a /"
			log.Println(msg)
			a.setStatus(false, true, msg, true)
			select {
			case <-ctx.Done():
				return
			case <-a.checkTrigger:
				continue
			case <-time.After(5 * time.Second):
				continue
			}
		}

		targetURL := serverURL + "/identity"
		req, err := http.NewRequestWithContext(ctx, "GET", targetURL, nil)
		if err == nil {
			resp, err := client.Do(req)
			if err == nil && resp.StatusCode == http.StatusOK {
				resp.Body.Close()
				a.setStatus(true, false, "OK", true)
				log.Printf("Successfully connected to Plex server at %s", serverURL)

				// Connected. Wait for server address change trigger or context done
				select {
				case <-ctx.Done():
					return
				case <-a.checkTrigger:
					continue
				}
			}
			if resp != nil {
				resp.Body.Close()
			}
			if err != nil {
				log.Printf("Error reaching PLEX_SERVER (%s): %v", serverURL, err)
			}
		}

		a.setStatus(false, true, fmt.Sprintf("Proxy cannot reach PLEX_SERVER (%s)", serverURL), true)
		log.Printf("Proxy cannot reach PLEX_SERVER (%s), retrying in 3 seconds...", serverURL)

		select {
		case <-ctx.Done():
			return
		case <-a.checkTrigger:
			continue
		case <-time.After(3 * time.Second):
			continue
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

		case path == "/config/plex-server" && r.Method == http.MethodPost:
			a.handleSetPlexServer(w, r)
			return

		case path == "/config/test-plex-server" && r.Method == http.MethodPost:
			a.handleTestPlexServer(w, r)
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
		case (path == "/api/open-browser" || path == "/open-browser") && (r.Method == http.MethodPost || r.Method == http.MethodGet):
			a.handleOpenBrowser(w, r)
			return
		}

		// Don't serve SPA fallback on /wails/ paths
		if strings.HasPrefix(path, "/wails/") {
			http.NotFound(w, r)
			return
		}

		// Static files & SPA fallback
		a.serveStaticOrSPA(w, r)
	})
}

func (a *ServerApp) handleOpenBrowser(w http.ResponseWriter, r *http.Request) {
	var targetURL string
	if r.Method == http.MethodGet {
		targetURL = r.URL.Query().Get("url")
	} else {
		var req struct {
			URL string `json:"url"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err == nil && req.URL != "" {
			targetURL = req.URL
		} else {
			targetURL = r.URL.Query().Get("url")
		}
	}

	if targetURL == "" {
		http.Error(w, "Missing url parameter", http.StatusBadRequest)
		return
	}

	parsed, err := url.Parse(targetURL)
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		http.Error(w, "Invalid URL scheme: only http and https are allowed", http.StatusBadRequest)
		return
	}

	log.Printf("Opening external browser URL: %s", targetURL)
	if err := openBrowserOS(targetURL); err != nil {
		log.Printf("Failed to open browser: %v", err)
		http.Error(w, fmt.Sprintf("Failed to open browser: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func (a *ServerApp) handleStatus(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(a.getStatus())
}

func (a *ServerApp) handleConfig(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ConfigResponse{
		PlexServer:   a.getPlexServer(),
		DeploymentID: a.deploymentID,
		Configured:   a.getPlexServer() != "",
		Config: ConfigOpts{
			DisableProxy:    false,
			DisableNevuSync: a.disableNevuSync,
		},
	})
}

func normalizePlexURL(raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", fmt.Errorf("Plex server address cannot be empty")
	}

	// If missing scheme, default to http://
	if !strings.HasPrefix(raw, "http://") && !strings.HasPrefix(raw, "https://") {
		raw = "http://" + raw
	}

	// Remove trailing slashes
	raw = strings.TrimRight(raw, "/")

	parsed, err := url.Parse(raw)
	if err != nil || parsed.Host == "" {
		return "", fmt.Errorf("invalid server URL format")
	}

	if !plexServerRegex.MatchString(raw) {
		return "", fmt.Errorf("invalid server URL. The URL must start with http:// or https:// and must not end with a /")
	}

	return raw, nil
}

func (a *ServerApp) handleTestPlexServer(w http.ResponseWriter, r *http.Request) {
	var body struct {
		PlexServer string `json:"plexServer"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]any{"ok": false, "error": "Invalid request body"})
		return
	}

	normURL, err := normalizePlexURL(body.PlexServer)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]any{"ok": false, "error": err.Error()})
		return
	}

	client := &http.Client{Timeout: 5 * time.Second}
	if a.disableTLSVerify {
		client.Transport = &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		}
	}

	resp, err := client.Get(normURL + "/identity")
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]any{
			"ok":    false,
			"error": fmt.Sprintf("Failed to reach Plex server at %s: %v", normURL, err),
		})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]any{
			"ok":    false,
			"error": fmt.Sprintf("Plex server responded with status %d", resp.StatusCode),
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"ok":         true,
		"message":    fmt.Sprintf("Successfully reached Plex server at %s", normURL),
		"plexServer": normURL,
	})
}

func (a *ServerApp) handleSetPlexServer(w http.ResponseWriter, r *http.Request) {
	var body struct {
		PlexServer string `json:"plexServer"`
		Force      bool   `json:"force"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]any{"ok": false, "error": "Invalid request body"})
		return
	}

	normURL, err := normalizePlexURL(body.PlexServer)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]any{"ok": false, "error": err.Error()})
		return
	}

	if !body.Force {
		client := &http.Client{Timeout: 5 * time.Second}
		if a.disableTLSVerify {
			client.Transport = &http.Transport{
				TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
			}
		}

		resp, err := client.Get(normURL + "/identity")
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]any{
				"ok":    false,
				"error": fmt.Sprintf("Could not connect to Plex server at %s: %v", normURL, err),
			})
			return
		}
		resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]any{
				"ok":    false,
				"error": fmt.Sprintf("Plex server responded with status %d", resp.StatusCode),
			})
			return
		}
	}

	if a.db != nil {
		if err := a.db.SetServerConfig("plex_server", normURL); err != nil {
			log.Printf("Failed to persist plex server address to DB: %v", err)
			http.Error(w, "Failed to save configuration", http.StatusInternalServerError)
			return
		}
	}

	a.setPlexServer(normURL)
	if a.proxyService != nil {
		a.proxyService.UpdateTarget(normURL)
	}

	a.triggerCheck()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"ok":         true,
		"message":    fmt.Sprintf("Plex server updated to %s", normURL),
		"plexServer": normURL,
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


