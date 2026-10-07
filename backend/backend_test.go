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
		disableNevuSync:  false,
		db:               db,
		reviewsHandler:   NewReviewsHandler(db, true),
	}
	app.setStatus(true, false, "OK")

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
		Name:      "Nevu",
		Interval:  500,
		Available: true,
		Data: DiscoveryData{
			Port:     3000,
			Type:     "nevu",
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
	if parsed["name"] != "Nevu" || parsed["interval"].(float64) != 500 {
		t.Fatalf("Unexpected discovery json: %s", string(b))
	}
}

func TestParseTime(t *testing.T) {
	parsed := parseTime("2026-10-07T13:18:28Z")
	if parsed.IsZero() {
		t.Fatalf("Failed to parse RFC3339 timestamp")
	}
}
