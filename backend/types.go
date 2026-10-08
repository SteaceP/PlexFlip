package main

import (
	"time"
)

// Status represents the server readiness and health status.
type Status struct {
	Ready      bool   `json:"ready"`
	Error      bool   `json:"error"`
	Message    string `json:"message"`
	PlexServer string `json:"plexServer,omitempty"`
	Configured bool   `json:"configured"`
}

// ConfigResponse represents the response for /config endpoint.
type ConfigResponse struct {
	PlexServer   string     `json:"PLEX_SERVER"`
	DeploymentID string     `json:"DEPLOYMENTID"`
	Configured   bool       `json:"CONFIGURED"`
	Config       ConfigOpts `json:"CONFIG"`
}

type ConfigOpts struct {
	DisableProxy        bool `json:"DISABLE_PROXY"`
	DisablePlexFlipSync bool `json:"DISABLE_PLEXFLIP_SYNC"`
}

// PlexUser represents a user returned by Plex.tv API v2.
type PlexUser struct {
	ID           int    `json:"id"`
	UUID         string `json:"uuid"`
	Username     string `json:"username"`
	Title        string `json:"title"`
	Email        string `json:"email"`
	FriendlyName string `json:"friendlyName"`
	Thumb        string `json:"thumb"`
	AuthToken    string `json:"authToken"`
}

// UserOption represents a saved setting for a user.
type UserOption struct {
	UserUID string `json:"userUid"`
	Key     string `json:"key"`
	Value   string `json:"value"`
}

// ReviewUser represents public profile details in a review.
type ReviewUser struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Avatar   string `json:"avatar"`
}

// Review represents a movie or show review.
type Review struct {
	ItemID     string      `json:"itemID"`
	UserID     string      `json:"userID"`
	CreatedAt  string      `json:"created_at"`
	Rating     *int        `json:"rating"`
	Message    string      `json:"message"`
	Spoilers   bool        `json:"spoilers"`
	Visibility string      `json:"visibility"` // "LOCAL" or "GLOBAL"
	User       *ReviewUser `json:"user,omitempty"`
}

// DeviceID represents a remote control device.
type DeviceID struct {
	Socket         string `json:"socket"`
	ID             string `json:"id"`
	Type           string `json:"type"` // "mobile" | "desktop" | "tv" | "web"
	FriendlyName   string `json:"friendlyName"`
	IsControllable bool   `json:"isControllable"`
	IsRemote       bool   `json:"isRemote"`
}

// RemoteAction represents an action sent from one remote device to another.
type RemoteAction struct {
	Target string         `json:"target"`
	Action string         `json:"action"` // "resume", "pause", "seek", "launch", "skipMarker", etc.
	Data   map[string]any `json:"data,omitempty"`
}

// SyncMember represents a participant in a watch-together room.
type SyncMember struct {
	UID    string `json:"uid"`
	Socket string `json:"socket"`
	Name   string `json:"name"`
	Avatar string `json:"avatar"`
}

// SyncSocketError represents an error sent over Socket.io.
type SyncSocketError struct {
	Type    string `json:"type"`
	Message string `json:"message"`
}

// SyncReady represents the ready payload sent to a socket joining a room.
type SyncReady struct {
	Room string `json:"room"`
	Host bool   `json:"host"`
}

// PlayBackState represents current playback state for sync.
type PlayBackState struct {
	Key   string  `json:"key,omitempty"`
	State string  `json:"state"`
	Time  *float64 `json:"time,omitempty"`
}

// InternalReviewHelper represents date parsing helper.
func parseTime(t string) time.Time {
	formats := []string{
		time.RFC3339Nano,
		time.RFC3339,
		"2006-01-02 15:04:05",
		"2006-01-02T15:04:05",
	}
	for _, f := range formats {
		if pt, err := time.Parse(f, t); err == nil {
			return pt
		}
	}
	return time.Time{}
}
