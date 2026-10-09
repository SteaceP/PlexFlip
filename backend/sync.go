package main

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/zishang520/engine.io/v2/types"
	"github.com/zishang520/socket.io/v2/socket"
)

type SyncServer struct {
	io *socket.Server
}

func extractToken(hs *socket.Handshake) string {
	if hs == nil {
		return ""
	}
	if hs.Auth != nil {
		if authMap, ok := hs.Auth.(map[string]any); ok {
			if t, ok := authMap["token"].(string); ok && t != "" {
				return t
			}
		}
	}
	if hs.Headers != nil {
		if t := hs.Headers["x-plex-token"]; len(t) > 0 && t[0] != "" {
			return t[0]
		}
		if t := hs.Headers["X-Plex-Token"]; len(t) > 0 && t[0] != "" {
			return t[0]
		}
	}
	if hs.Query != nil {
		if t := hs.Query["token"]; len(t) > 0 && t[0] != "" {
			return t[0]
		}
	}
	return ""
}

func extractQueryParam(hs *socket.Handshake, key string) string {
	if hs == nil || hs.Query == nil {
		return ""
	}
	if vals, ok := hs.Query[key]; ok && len(vals) > 0 {
		return vals[0]
	}
	return ""
}

func generateRoomID(io *socket.Server) (string, error) {
	for i := 0; i < 15; i++ {
		b := make([]byte, 3)
		if _, err := rand.Read(b); err != nil {
			return "", err
		}
		id := hex.EncodeToString(b)
		if sids, ok := io.Sockets().Adapter().Rooms().Load(socket.Room(id)); ok && sids != nil && sids.Len() > 0 {
			continue
		}
		return id, nil
	}
	return "", fmt.Errorf("failed to generate unique room ID")
}

func InitSyncServer(corsOrigin string) *SyncServer {
	opts := socket.DefaultServerOptions()
	opts.SetCors(&types.Cors{
		Origin: corsOrigin,
	})

	io := socket.NewServer(nil, opts)

	io.On("connection", func(clients ...any) {
		client := clients[0].(*socket.Socket)
		hs := client.Handshake()
		socketID := string(client.Id())

		log.Printf("SYNC [%s] connected", socketID)

		roomQuery := extractQueryParam(hs, "room")
		if roomQuery == "" {
			log.Printf("SYNC [%s] disconnected: no room provided", socketID)
			client.Emit("conn-error", SyncSocketError{
				Type:    "invalid_room",
				Message: "No room provided",
			})
			go func() {
				time.Sleep(1 * time.Second)
				client.Disconnect(true)
			}()
			return
		}

		token := extractToken(hs)
		if token == "" {
			log.Printf("SYNC [%s] disconnected: no token provided", socketID)
			client.Emit("conn-error", SyncSocketError{
				Type:    "invalid_auth",
				Message: "No token provided",
			})
			go func() {
				time.Sleep(1 * time.Second)
				client.Disconnect(true)
			}()
			return
		}

		user, err := CheckPlexUser(token)
		if err != nil || user == nil {
			log.Printf("SYNC [%s] disconnected: invalid token", socketID)
			client.Emit("conn-error", SyncSocketError{
				Type:    "invalid_auth",
				Message: "Invalid token",
			})
			go func() {
				time.Sleep(1 * time.Second)
				client.Disconnect(true)
			}()
			return
		}

		displayName := user.FriendlyName
		if displayName == "" {
			displayName = user.Username
		}
		log.Printf("SYNC [%s] authenticated as %s", socketID, displayName)

		isHost := roomQuery == "new"
		var room string
		if isHost {
			newID, err := generateRoomID(io)
			if err != nil {
				log.Printf("SYNC [%s] failed to generate room ID: %v", socketID, err)
				client.Emit("conn-error", SyncSocketError{
					Type:    "invalid_room",
					Message: "Failed to generate room",
				})
				client.Disconnect(true)
				return
			}
			room = newID
			log.Printf("SYNC [%s] generated new room ID: %s", socketID, room)
		} else {
			room = roomQuery
			sids, ok := io.Sockets().Adapter().Rooms().Load(socket.Room(room))
			if !ok || sids == nil || sids.Len() == 0 {
				log.Printf("SYNC [%s] disconnected: invalid room %s", socketID, room)
				client.Emit("conn-error", SyncSocketError{
					Type:    "invalid_room",
					Message: "Invalid room",
				})
				go func() {
					time.Sleep(1 * time.Second)
					client.Disconnect(true)
				}()
				return
			}
		}

		client.Join(socket.Room(room))

		client.Emit("ready", SyncReady{
			Room: room,
			Host: isHost,
		})

		member := SyncMember{
			UID:    user.UUID,
			Socket: socketID,
			Name:   displayName,
			Avatar: user.Thumb,
		}

		io.To(socket.Room(room)).Emit("EVNT_USER_JOIN", member)

		// Event handlers
		client.OnAny(func(events ...any) {
			if len(events) == 0 {
				return
			}
			eventName, ok := events[0].(string)
			if !ok {
				return
			}
			args := events[1:]

			if isHost && strings.HasPrefix(eventName, "SYNC_") {
				log.Printf("SYNC [%s] emitting HOST %s to %s", socketID, eventName, room)
				io.To(socket.Room(room)).Emit("HOST_"+eventName, args...)
				return
			}

			if isHost && strings.HasPrefix(eventName, "RES_") {
				log.Printf("SYNC [%s] emitting %s to %s", socketID, eventName, room)
				emitArgs := append([]any{member}, args...)
				io.To(socket.Room(room)).Emit(eventName, emitArgs...)
				return
			}

			if strings.HasPrefix(eventName, "EVNT_") {
				log.Printf("SYNC [%s] emitting EVENT %s to %s", socketID, eventName, room)
				emitArgs := append([]any{member}, args...)
				io.To(socket.Room(room)).Emit(eventName, emitArgs...)
				return
			}
		})

		client.On("disconnect", func(args ...any) {
			log.Printf("SYNC [%s] disconnected", socketID)
			if isHost {
				io.To(socket.Room(room)).Emit("conn-error", SyncSocketError{
					Type:    "host_disconnect",
					Message: "Host disconnected",
				})
				if sids, ok := io.Sockets().Adapter().Rooms().Load(socket.Room(room)); ok && sids != nil {
					for _, sid := range sids.Keys() {
						if targetSock, found := io.Sockets().Sockets().Load(sid); found {
							targetSock.Disconnect(true)
						}
					}
				}
			} else {
				io.To(socket.Room(room)).Emit("EVNT_USER_LEAVE", member)
			}
		})
	})

	return &SyncServer{io: io}
}
