package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
)

func setupTestDB(t *testing.T) (*Database, func()) {
	t.Helper()
	tmpFile, err := os.CreateTemp("", "test_perplexed_*.db")
	if err != nil {
		t.Fatalf("Failed to create temp db file: %v", err)
	}
	tmpPath := tmpFile.Name()
	tmpFile.Close()

	os.Setenv("DATABASE_PATH", tmpPath)
	db, err := initDB()
	if err != nil {
		os.Remove(tmpPath)
		t.Fatalf("Failed to init test db: %v", err)
	}

	cleanup := func() {
		db.Close()
		os.Remove(tmpPath)
		os.Unsetenv("DATABASE_PATH")
	}
	return db, cleanup
}

func TestDatabase_UserOptions(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	// Initial get
	opts, err := db.GetUserOptions("user-123")
	if err != nil {
		t.Fatalf("GetUserOptions failed: %v", err)
	}
	if len(opts) != 0 {
		t.Fatalf("Expected 0 options, got %d", len(opts))
	}

	// Insert option
	created, err := db.SetUserOption("user-123", "theme", "dark")
	if err != nil {
		t.Fatalf("SetUserOption failed: %v", err)
	}
	if created.Key != "theme" || created.Value != "dark" {
		t.Fatalf("Unexpected created option: %+v", created)
	}

	// Get single option
	opt, err := db.GetUserOption("user-123", "theme")
	if err != nil {
		t.Fatalf("GetUserOption failed: %v", err)
	}
	if opt == nil || opt.Value != "dark" {
		t.Fatalf("Expected value 'dark', got %+v", opt)
	}

	// Upsert option
	updated, err := db.SetUserOption("user-123", "theme", "light")
	if err != nil {
		t.Fatalf("SetUserOption update failed: %v", err)
	}
	if updated.Value != "light" {
		t.Fatalf("Expected 'light', got %s", updated.Value)
	}

	// Verify update
	opt, err = db.GetUserOption("user-123", "theme")
	if err != nil || opt == nil || opt.Value != "light" {
		t.Fatalf("Expected updated value 'light', got %+v", opt)
	}

	// Non-existent key
	missing, err := db.GetUserOption("user-123", "nonexistent")
	if err != nil {
		t.Fatalf("Expected nil err for missing option, got %v", err)
	}
	if missing != nil {
		t.Fatalf("Expected nil for missing option, got %+v", missing)
	}
}

func TestDatabase_Reviews(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	rating := 9
	spoilers := false
	user := &PlexUser{
		UUID:         "test-user-uuid",
		FriendlyName: "John Doe",
		Thumb:        "https://example.com/avatar.jpg",
	}

	err := db.UpsertLocalReview("plex://movie/1", user, "Great movie!", &rating, &spoilers)
	if err != nil {
		t.Fatalf("UpsertLocalReview failed: %v", err)
	}

	reviews, err := db.GetLocalReviews("plex://movie/1", "")
	if err != nil {
		t.Fatalf("GetLocalReviews failed: %v", err)
	}
	if len(reviews) != 1 {
		t.Fatalf("Expected 1 review, got %d", len(reviews))
	}
	if reviews[0].Message != "Great movie!" || *reviews[0].Rating != 9 {
		t.Fatalf("Unexpected review data: %+v", reviews[0])
	}
	if reviews[0].User == nil || reviews[0].User.Username != "John Doe" {
		t.Fatalf("Expected user John Doe, got %+v", reviews[0].User)
	}

	// Delete review
	err = db.DeleteLocalReview("plex://movie/1", "test-user-uuid")
	if err != nil {
		t.Fatalf("DeleteLocalReview failed: %v", err)
	}

	reviewsAfter, err := db.GetLocalReviews("plex://movie/1", "")
	if err != nil {
		t.Fatalf("GetLocalReviews after delete failed: %v", err)
	}
	if len(reviewsAfter) != 0 {
		t.Fatalf("Expected 0 reviews after delete, got %d", len(reviewsAfter))
	}
}

func TestServerApp_StatusAndConfigEndpoints(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	app := &ServerApp{
		deploymentID:     "abc12345",
		plexServer:       "http://localhost:32400",
		disablePlexFlipSync: false,
		db:               db,
		reviewsHandler:   NewReviewsHandler(db, true),
	}
	app.setStatus(true, false, "OK", true)

	handler := app.buildRouter()

	// Test GET /status
	req := httptest.NewRequest("GET", "/status", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("Expected 200, got %d", rec.Code)
	}
	var st Status
	if err := json.Unmarshal(rec.Body.Bytes(), &st); err != nil {
		t.Fatalf("Failed to parse /status json: %v", err)
	}
	if !st.Ready || st.Error || st.Message != "OK" {
		t.Fatalf("Unexpected status payload: %+v", st)
	}

	// Test GET /config
	req = httptest.NewRequest("GET", "/config", nil)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("Expected 200, got %d", rec.Code)
	}
	var cfg ConfigResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &cfg); err != nil {
		t.Fatalf("Failed to parse /config json: %v", err)
	}
	if cfg.PlexServer != "http://localhost:32400" || cfg.DeploymentID != "abc12345" {
		t.Fatalf("Unexpected config payload: %+v", cfg)
	}
}

func TestProxyService_Validation(t *testing.T) {
	svc, err := NewProxyService("http://localhost:32400", false, false)
	if err != nil {
		t.Fatalf("Failed to create proxy service: %v", err)
	}

	// Bad POST proxy URL (traversal)
	badBody, _ := json.Marshal(ProxyRequestBody{
		URL:    "/../etc/passwd",
		Method: "GET",
	})
	req := httptest.NewRequest("POST", "/proxy", bytes.NewReader(badBody))
	rec := httptest.NewRecorder()
	svc.HandlePostProxy(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("Expected 400 for path traversal, got %d", rec.Code)
	}

	// Bad POST proxy method
	badMethodBody, _ := json.Marshal(ProxyRequestBody{
		URL:    "/status",
		Method: "DELETE",
	})
	req = httptest.NewRequest("POST", "/proxy", bytes.NewReader(badMethodBody))
	rec = httptest.NewRecorder()
	svc.HandlePostProxy(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("Expected 400 for disallowed method, got %d", rec.Code)
	}
}

func TestDiscovery_PacketJSON(t *testing.T) {
	packet := DiscoveryPacket{
		Name:      "PlexFlip",
		Interval:  500,
		Available: true,
		Data: DiscoveryData{
			Port:     3000,
			Type:     "plexflip",
			Protocol: "tcp",
			Txt: DiscoveryTxt{
				DeploymentID: "12345678",
				Version:      "1.0.0",
				PlexServer:   "http://localhost:32400",
			},
		},
	}
	b, err := json.Marshal(packet)
	if err != nil {
		t.Fatalf("Failed to marshal discovery packet: %v", err)
	}

	var parsed map[string]any
	if err := json.Unmarshal(b, &parsed); err != nil {
		t.Fatalf("Failed to unmarshal discovery packet: %v", err)
	}
	if parsed["name"] != "PlexFlip" || parsed["interval"].(float64) != 500 {
		t.Fatalf("Unexpected discovery json: %s", string(b))
	}
}

func TestParseTime(t *testing.T) {
	parsed := parseTime("2026-10-07T13:18:28Z")
	if parsed.IsZero() {
		t.Fatalf("Failed to parse RFC3339 timestamp")
	}
}

func TestStaticServing_Disk(t *testing.T) {
	t.Setenv("DEV_STATIC", "true")

	tmpDir, err := os.MkdirTemp("", "plexflip_static_test_*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	if err := os.WriteFile(tmpDir+"/index.html", []byte("<!doctype html><html><body>PlexFlip SPA</body></html>"), 0644); err != nil {
		t.Fatalf("Failed to write index.html: %v", err)
	}
	if err := os.MkdirAll(tmpDir+"/static", 0755); err != nil {
		t.Fatalf("Failed to create static dir: %v", err)
	}
	if err := os.WriteFile(tmpDir+"/static/app.js", []byte("console.log('app');"), 0644); err != nil {
		t.Fatalf("Failed to write app.js: %v", err)
	}

	app := &ServerApp{
		wwwDir: tmpDir,
	}
	handler := app.buildRouter()

	// 1. Root route
	req := httptest.NewRequest("GET", "/", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("PlexFlip SPA")) {
		t.Fatalf("Root route failed: %d, body: %s", rec.Code, rec.Body.String())
	}

	// 2. Exact asset
	req = httptest.NewRequest("GET", "/static/app.js", nil)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("console.log('app');")) {
		t.Fatalf("Static asset route failed: %d, body: %s", rec.Code, rec.Body.String())
	}

	// 3. SPA route fallback
	req = httptest.NewRequest("GET", "/browse/recommendations", nil)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("PlexFlip SPA")) {
		t.Fatalf("SPA route fallback failed: %d, body: %s", rec.Code, rec.Body.String())
	}

	// 4. Missing asset with extension should 404
	req = httptest.NewRequest("GET", "/static/missing.js", nil)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("Missing asset expected 404, got: %d", rec.Code)
	}
}

func TestStaticServing_FS(t *testing.T) {
	app := &ServerApp{}

	tmpDir, err := os.MkdirTemp("", "plexflip_fs_test_*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	if err := os.WriteFile(tmpDir+"/index.html", []byte("<!doctype html><html><body>Embedded SPA</body></html>"), 0644); err != nil {
		t.Fatalf("Failed to write index.html: %v", err)
	}
	if err := os.MkdirAll(tmpDir+"/static", 0755); err != nil {
		t.Fatalf("Failed to create static dir: %v", err)
	}
	if err := os.WriteFile(tmpDir+"/static/bundle.js", []byte("console.log('bundle');"), 0644); err != nil {
		t.Fatalf("Failed to write bundle.js: %v", err)
	}

	fsys := os.DirFS(tmpDir)

	// Test serveFromFS
	// 1. Root route
	req := httptest.NewRequest("GET", "/", nil)
	rec := httptest.NewRecorder()
	app.serveFromFS(fsys, rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("Embedded SPA")) {
		t.Fatalf("FS root route failed: %d, body: %s", rec.Code, rec.Body.String())
	}

	// 2. Exact asset
	req = httptest.NewRequest("GET", "/static/bundle.js", nil)
	rec = httptest.NewRecorder()
	app.serveFromFS(fsys, rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("console.log('bundle');")) {
		t.Fatalf("FS static asset failed: %d, body: %s", rec.Code, rec.Body.String())
	}

	// 3. SPA route fallback
	req = httptest.NewRequest("GET", "/settings/experience", nil)
	rec = httptest.NewRecorder()
	app.serveFromFS(fsys, rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("Embedded SPA")) {
		t.Fatalf("FS SPA fallback failed: %d, body: %s", rec.Code, rec.Body.String())
	}

	// 4. Missing asset with extension should 404
	req = httptest.NewRequest("GET", "/static/missing.css", nil)
	rec = httptest.NewRecorder()
	app.serveFromFS(fsys, rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("FS missing asset expected 404, got: %d", rec.Code)
	}
}

func TestDatabase_ServerConfig(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	// Initial get should be empty
	val, err := db.GetServerConfig("plex_server")
	if err != nil {
		t.Fatalf("GetServerConfig failed: %v", err)
	}
	if val != "" {
		t.Fatalf("Expected empty string, got %s", val)
	}

	// Set server config
	if err := db.SetServerConfig("plex_server", "http://192.168.2.123:32400"); err != nil {
		t.Fatalf("SetServerConfig failed: %v", err)
	}

	// Retrieve updated
	val, err = db.GetServerConfig("plex_server")
	if err != nil {
		t.Fatalf("GetServerConfig failed: %v", err)
	}
	if val != "http://192.168.2.123:32400" {
		t.Fatalf("Expected 'http://192.168.2.123:32400', got %s", val)
	}

	// Update existing
	if err := db.SetServerConfig("plex_server", "http://localhost:32400"); err != nil {
		t.Fatalf("SetServerConfig update failed: %v", err)
	}
	val, err = db.GetServerConfig("plex_server")
	if err != nil || val != "http://localhost:32400" {
		t.Fatalf("Expected 'http://localhost:32400', got %s", val)
	}
}

func TestNormalizePlexURL(t *testing.T) {
	tests := []struct {
		input    string
		expected string
		hasErr   bool
	}{
		{"http://192.168.1.50:32400", "http://192.168.1.50:32400", false},
		{"http://192.168.1.50:32400/", "http://192.168.1.50:32400", false},
		{"192.168.1.50:32400", "http://192.168.1.50:32400", false},
		{"https://plex.example.com", "https://plex.example.com", false},
		{"https://plex.example.com/", "https://plex.example.com", false},
		{"", "", true},
		{"http://", "", true},
		{"http://plex.com/some/path", "", true},
	}

	for _, tc := range tests {
		res, err := normalizePlexURL(tc.input)
		if tc.hasErr {
			if err == nil {
				t.Fatalf("Expected error for %q, got %q", tc.input, res)
			}
		} else {
			if err != nil {
				t.Fatalf("Unexpected error for %q: %v", tc.input, err)
			}
			if res != tc.expected {
				t.Fatalf("For %q, expected %q, got %q", tc.input, tc.expected, res)
			}
		}
	}
}

func TestProxyService_DynamicUpdate(t *testing.T) {
	// Create with empty server
	svc, err := NewProxyService("", false, false)
	if err != nil {
		t.Fatalf("NewProxyService with empty URL failed: %v", err)
	}

	// Attempting to proxy when unconfigured should return 503
	req := httptest.NewRequest("GET", "/dynproxy/status", nil)
	rec := httptest.NewRecorder()
	svc.ServeDynProxy(rec, req)
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("Expected 503 for unconfigured ServeDynProxy, got %d", rec.Code)
	}

	// Update target
	if err := svc.UpdateTarget("http://127.0.0.1:32400"); err != nil {
		t.Fatalf("UpdateTarget failed: %v", err)
	}
	server, parsed := svc.GetTarget()
	if server != "http://127.0.0.1:32400" || parsed == nil || parsed.Host != "127.0.0.1:32400" {
		t.Fatalf("Unexpected target after update: %s, %+v", server, parsed)
	}
}

func TestServerApp_PlexServerConfigurationEndpoints(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	// Mock upstream Plex server responding to /identity
	plexMock := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/identity" {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"MediaContainer":{"machineIdentifier":"test-machine-123"}}`))
			return
		}
		http.NotFound(w, r)
	}))
	defer plexMock.Close()

	proxySvc, _ := NewProxyService("", false, false)
	app := &ServerApp{
		deploymentID: "test-deploy",
		checkTrigger: make(chan struct{}, 1),
		db:           db,
		proxyService: proxySvc,
	}
	app.setStatus(false, true, "Plex Media Server address is not configured.", false)

	handler := app.buildRouter()

	// Check status initially unconfigured
	req := httptest.NewRequest("GET", "/status", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	var st Status
	json.Unmarshal(rec.Body.Bytes(), &st)
	if st.Configured || st.Ready {
		t.Fatalf("Expected unconfigured status initially, got %+v", st)
	}

	// Test POST /config/test-plex-server with mock server
	testBody, _ := json.Marshal(map[string]string{
		"plexServer": plexMock.URL,
	})
	req = httptest.NewRequest("POST", "/config/test-plex-server", bytes.NewReader(testBody))
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("Expected 200 from test endpoint, got %d (body: %s)", rec.Code, rec.Body.String())
	}

	// Test POST /config/plex-server to set server address
	setBody, _ := json.Marshal(map[string]any{
		"plexServer": plexMock.URL,
	})
	req = httptest.NewRequest("POST", "/config/plex-server", bytes.NewReader(setBody))
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("Expected 200 from set endpoint, got %d (body: %s)", rec.Code, rec.Body.String())
	}

	// Verify server was persisted to DB
	saved, err := db.GetServerConfig("plex_server")
	if err != nil || saved != plexMock.URL {
		t.Fatalf("Expected DB to have %s, got %s (err: %v)", plexMock.URL, saved, err)
	}

	// Verify in-memory state updated
	if app.getPlexServer() != plexMock.URL {
		t.Fatalf("Expected in-memory plexServer to be %s, got %s", plexMock.URL, app.getPlexServer())
	}

	// Verify GET /config reflects configured state
	req = httptest.NewRequest("GET", "/config", nil)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	var cfg ConfigResponse
	json.Unmarshal(rec.Body.Bytes(), &cfg)
	if !cfg.Configured || cfg.PlexServer != plexMock.URL {
		t.Fatalf("Unexpected /config response: %+v", cfg)
	}
}

func TestServerApp_AuthEndpoints(t *testing.T) {
	app := &ServerApp{
		deploymentID:    "test-auth",
		pendingAuthPins: make(map[string]string),
	}
	handler := app.buildRouter()

	// 1. Test POST /api/auth-pin to register PIN
	pinBody, _ := json.Marshal(map[string]string{
		"pinID":    "123456",
		"clientID": "plexflip-client-test",
	})
	req := httptest.NewRequest("POST", "/api/auth-pin", bytes.NewReader(pinBody))
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("Expected 200 from POST /api/auth-pin, got %d", rec.Code)
	}

	// 2. Test GET /api/auth-pin with pinID
	req = httptest.NewRequest("GET", "/api/auth-pin?pinID=123456", nil)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("Expected 200 from GET /api/auth-pin, got %d", rec.Code)
	}
	var res map[string]string
	json.Unmarshal(rec.Body.Bytes(), &res)
	if res["clientID"] != "plexflip-client-test" {
		t.Fatalf("Expected clientID plexflip-client-test, got %q", res["clientID"])
	}

	// 3. Test GET /api/auth-pin with fallback (no pinID parameter)
	req = httptest.NewRequest("GET", "/api/auth-pin", nil)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("Expected 200 from GET /api/auth-pin, got %d", rec.Code)
	}
	res = nil
	json.Unmarshal(rec.Body.Bytes(), &res)
	if res["clientID"] != "plexflip-client-test" {
		t.Fatalf("Expected fallback clientID plexflip-client-test, got %q", res["clientID"])
	}

	// 4. Test POST /api/auth-complete
	completeBody, _ := json.Marshal(map[string]string{
		"authToken":   "auth-tok-123",
		"accessToken": "acc-tok-456",
		"serverID":    "machine-abc",
	})
	req = httptest.NewRequest("POST", "/api/auth-complete", bytes.NewReader(completeBody))
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("Expected 200 from POST /api/auth-complete, got %d", rec.Code)
	}

	// 5. Test POST /api/auth-focus
	req = httptest.NewRequest("POST", "/api/auth-focus", nil)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("Expected 200 from POST /api/auth-focus, got %d", rec.Code)
	}
}

