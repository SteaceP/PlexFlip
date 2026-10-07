package main

import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"
)

type userCacheItem struct {
	user      *PlexUser
	expiresAt time.Time
}

var (
	plexUserCache sync.Map
	plexClient    = &http.Client{
		Timeout: 5 * time.Second,
	}
)

func initPlexClient(disableTLS bool) {
	if disableTLS {
		plexClient.Transport = &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		}
	}
}

// CheckPlexUser validates a Plex token with plex.tv and returns the user object.
func CheckPlexUser(token string) (*PlexUser, error) {
	if token == "" {
		return nil, fmt.Errorf("empty token")
	}

	// Check short-lived cache (15 seconds) to avoid redundant roundtrips
	if val, ok := plexUserCache.Load(token); ok {
		item := val.(userCacheItem)
		if time.Now().Before(item.expiresAt) {
			return item.user, nil
		}
		plexUserCache.Delete(token)
	}

	req, err := http.NewRequest("GET", "https://plex.tv/api/v2/user", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("X-Plex-Token", token)
	req.Header.Set("Accept", "application/json")

	resp, err := plexClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("plex.tv responded with status %d", resp.StatusCode)
	}

	var user PlexUser
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, fmt.Errorf("failed to decode plex user: %w", err)
	}

	// Cache for 15 seconds
	plexUserCache.Store(token, userCacheItem{
		user:      &user,
		expiresAt: time.Now().Add(15 * time.Second),
	})

	return &user, nil
}
