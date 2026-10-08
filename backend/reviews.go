package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sort"
	"strings"
)

const plexFlipHubUrl = "https://plexflip-cloud.coderage.workers.dev/"

type ReviewsHandler struct {
	db                   *Database
	disableGlobalReviews bool
	httpClient           *http.Client
}

func NewReviewsHandler(db *Database, disableGlobalReviews bool) *ReviewsHandler {
	return &ReviewsHandler{
		db:                   db,
		disableGlobalReviews: disableGlobalReviews,
		httpClient:           &http.Client{},
	}
}

// HandleGetReviews handles GET /reviews.
func (h *ReviewsHandler) HandleGetReviews(w http.ResponseWriter, r *http.Request) {
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

	itemID := r.URL.Query().Get("itemID")
	userID := r.URL.Query().Get("userID")

	if itemID == "" || !strings.HasPrefix(itemID, "plex://") {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid itemID"})
		return
	}

	reviews, err := h.db.GetLocalReviews(itemID, userID)
	if err != nil {
		log.Printf("Error fetching local reviews: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	if !h.disableGlobalReviews {
		reqBody, _ := json.Marshal(map[string]string{
			"itemID": itemID,
			"userID": userID,
		})

		outReq, err := http.NewRequestWithContext(r.Context(), "POST", plexFlipHubUrl+"review-get", bytes.NewReader(reqBody))
		if err == nil {
			outReq.Header.Set("x-plex-token", token)
			outReq.Header.Set("Content-Type", "application/json")

			resp, err := h.httpClient.Do(outReq)
			if err == nil {
				defer resp.Body.Close()
				if resp.StatusCode == http.StatusOK {
					var globalResult struct {
						Data []Review `json:"data"`
					}
					if err := json.NewDecoder(resp.Body).Decode(&globalResult); err == nil {
						for _, rev := range globalResult.Data {
							rev.Visibility = "GLOBAL"
							reviews = append(reviews, rev)
						}
					}
				}
			}
		}
	}

	// Sort by created_at desc (most recent first)
	sort.Slice(reviews, func(i, j int) bool {
		ti := parseTime(reviews[i].CreatedAt)
		tj := parseTime(reviews[j].CreatedAt)
		return ti.After(tj)
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(reviews)
}

type CreateReviewRequest struct {
	ItemID     string  `json:"itemID"`
	Message    string  `json:"message"`
	Rating     *int    `json:"rating"`
	Spoilers   *bool   `json:"spoilers"`
	Visibility string  `json:"visibility"`
}

// HandlePostReviews handles POST /reviews.
func (h *ReviewsHandler) HandlePostReviews(w http.ResponseWriter, r *http.Request) {
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

	var reqBody CreateReviewRequest
	if err := json.NewDecoder(r.Body).Decode(&reqBody); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	msgTrimmed := strings.TrimSpace(reqBody.Message)
	if reqBody.ItemID == "" || !strings.HasPrefix(reqBody.ItemID, "plex://") {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid itemID"})
		return
	}
	if len(msgTrimmed) == 0 || len(msgTrimmed) > 500 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid message"})
		return
	}
	if reqBody.Rating != nil && (*reqBody.Rating < 0 || *reqBody.Rating > 10) {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid rating"})
		return
	}
	if reqBody.Visibility != "GLOBAL" && reqBody.Visibility != "LOCAL" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid visibility"})
		return
	}

	if reqBody.Visibility == "GLOBAL" && h.disableGlobalReviews {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "Global reviews are disabled"})
		return
	}

	var errVal any = false

	if reqBody.Visibility == "GLOBAL" {
		hubPayload, _ := json.Marshal(map[string]any{
			"itemID":   reqBody.ItemID,
			"userID":   user.UUID,
			"message":  msgTrimmed,
			"rating":   reqBody.Rating,
			"spoilers": reqBody.Spoilers,
		})

		outReq, err := http.NewRequestWithContext(r.Context(), "POST", plexFlipHubUrl+"review-update", bytes.NewReader(hubPayload))
		if err != nil {
			errVal = "Failed to update review"
		} else {
			outReq.Header.Set("x-plex-token", token)
			outReq.Header.Set("Content-Type", "application/json")
			resp, err := h.httpClient.Do(outReq)
			if err != nil {
				errVal = "Failed to update review"
			} else {
				defer resp.Body.Close()
				bodyBytes, _ := io.ReadAll(resp.Body)
				if resp.StatusCode >= 400 {
					var hubResp struct {
						Error any `json:"error"`
					}
					if json.Unmarshal(bodyBytes, &hubResp) == nil && hubResp.Error != nil && hubResp.Error != false {
						errVal = fmt.Sprintf("%v", hubResp.Error)
					} else {
						errVal = fmt.Sprintf("Cloud error (%d)", resp.StatusCode)
					}
				} else {
					var hubResp struct {
						Error any `json:"error"`
					}
					if json.Unmarshal(bodyBytes, &hubResp) == nil && hubResp.Error != nil && hubResp.Error != false {
						errVal = fmt.Sprintf("%v", hubResp.Error)
					}
				}
			}
		}
	} else {
		// LOCAL review
		if err := h.db.UpsertLocalReview(reqBody.ItemID, user, msgTrimmed, reqBody.Rating, reqBody.Spoilers); err != nil {
			log.Printf("Error creating local review: %v", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Internal server error"})
			return
		}
	}

	w.Header().Set("Cache-Control", "public, max-age=3600")
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"error": errVal})
}

// HandleDeleteReviews handles DELETE /reviews.
func (h *ReviewsHandler) HandleDeleteReviews(w http.ResponseWriter, r *http.Request) {
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

	itemID := r.URL.Query().Get("itemID")
	visibility := r.URL.Query().Get("visibility")

	if itemID == "" || !strings.HasPrefix(itemID, "plex://") {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid itemID"})
		return
	}
	if visibility != "" && visibility != "GLOBAL" && visibility != "LOCAL" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid visibility"})
		return
	}

	if visibility == "GLOBAL" && h.disableGlobalReviews {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "Global reviews are disabled"})
		return
	}

	var errVal any = false

	if visibility == "GLOBAL" {
		hubPayload, _ := json.Marshal(map[string]string{
			"itemID": itemID,
		})

		outReq, err := http.NewRequestWithContext(r.Context(), "POST", plexFlipHubUrl+"review-delete", bytes.NewReader(hubPayload))
		if err != nil {
			errVal = "Failed to delete review"
		} else {
			outReq.Header.Set("x-plex-token", token)
			outReq.Header.Set("Content-Type", "application/json")
			resp, err := h.httpClient.Do(outReq)
			if err != nil {
				errVal = "Failed to delete review"
			} else {
				defer resp.Body.Close()
				bodyBytes, _ := io.ReadAll(resp.Body)
				if resp.StatusCode >= 400 {
					var hubResp struct {
						Error any `json:"error"`
					}
					if json.Unmarshal(bodyBytes, &hubResp) == nil && hubResp.Error != nil && hubResp.Error != false {
						errVal = fmt.Sprintf("%v", hubResp.Error)
					} else {
						errVal = fmt.Sprintf("Cloud error (%d)", resp.StatusCode)
					}
				} else {
					var hubResp struct {
						Error any `json:"error"`
					}
					if json.Unmarshal(bodyBytes, &hubResp) == nil && hubResp.Error != nil && hubResp.Error != false {
						errVal = fmt.Sprintf("%v", hubResp.Error)
					}
				}
			}
		}
	} else {
		// LOCAL
		if err := h.db.DeleteLocalReview(itemID, user.UUID); err != nil {
			log.Printf("Error deleting local review: %v", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Internal server error"})
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"error": errVal})
}
