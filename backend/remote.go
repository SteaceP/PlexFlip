package main

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/zishang520/engine.io/v2/types"
	"github.com/zishang520/socket.io/v2/socket"
)

type RemoteServer struct {
	io      *socket.Server
	mu      sync.RWMutex
	clients map[socket.SocketId]*remoteClientInfo
}

type remoteClientInfo struct {
	socket   *socket.Socket
	user     *PlexUser
	deviceID DeviceID
}

func InitRemoteServer(corsOrigin string) *RemoteServer {
	opts := socket.DefaultServerOptions()
	opts.SetPath("/plexflip-remote")
	opts.SetCors(&types.Cors{
		Origin: corsOrigin,
	})

	io := socket.NewServer(nil, opts)
	server := &RemoteServer{
		io:      io,
		clients: make(map[socket.SocketId]*remoteClientInfo),
	}

	io.On("connection", func(clients ...any) {
		client := clients[0].(*socket.Socket)
		hs := client.Handshake()
		socketID := client.Id()
		strSocketID := string(socketID)

		log.Printf("REMOTE [%s] connected", strSocketID)

		devIDRaw := extractQueryParam(hs, "deviceID")
		if devIDRaw == "" {
			log.Printf("REMOTE [%s] disconnected: no deviceID provided", strSocketID)
			client.Emit("conn-error", SyncSocketError{
				Type:    "invalid_query",
				Message: "No deviceID provided",
			})
			go func() {
				time.Sleep(1 * time.Second)
				client.Disconnect(true)
			}()
			return
		}

		var deviceID DeviceID
		if err := json.Unmarshal([]byte(devIDRaw), &deviceID); err != nil {
			log.Printf("REMOTE [%s] disconnected: invalid deviceID json", strSocketID)
			client.Emit("conn-error", SyncSocketError{
				Type:    "invalid_query",
				Message: "Invalid deviceID json",
			})
			go func() {
				time.Sleep(1 * time.Second)
				client.Disconnect(true)
			}()
			return
		}

		token := extractToken(hs)
		if token == "" {
			log.Printf("REMOTE [%s] disconnected: no token provided", strSocketID)
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
			log.Printf("REMOTE [%s] disconnected: invalid token", strSocketID)
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

		deviceID.Socket = strSocketID

		server.mu.Lock()
		server.clients[socketID] = &remoteClientInfo{
			socket:   client,
			user:     user,
			deviceID: deviceID,
		}
		server.mu.Unlock()

		roomName := socket.Room("remote:" + user.UUID)
		client.Join(roomName)

		displayName := user.FriendlyName
		if displayName == "" {
			displayName = user.Username
		}
		log.Printf("REMOTE [%s] authenticated as %s on %s", strSocketID, displayName, deviceID.FriendlyName)

		client.On("getDevices", func(args ...any) {
			server.mu.RLock()
			var devices []DeviceID
			for sID, cInfo := range server.clients {
				if cInfo.user.UUID == user.UUID && cInfo.deviceID.ID != deviceID.ID {
					dev := cInfo.deviceID
					dev.Socket = string(sID)
					devices = append(devices, dev)
				}
			}
			server.mu.RUnlock()

			if devices == nil {
				devices = []DeviceID{}
			}

			if len(args) > 0 {
				if ack, ok := args[len(args)-1].(socket.Ack); ok {
					ack([]any{devices}, nil)
				}
			}
		})

		client.On("remoteAction", func(args ...any) {
			var ack socket.Ack
			if len(args) > 1 {
				if a, ok := args[len(args)-1].(socket.Ack); ok {
					ack = a
				}
			}

			if len(args) == 0 {
				if ack != nil {
					ack([]any{map[string]any{"success": false, "message": "Invalid action"}}, nil)
				}
				return
			}

			actionBytes, err := json.Marshal(args[0])
			if err != nil {
				if ack != nil {
					ack([]any{map[string]any{"success": false, "message": "Invalid action"}}, nil)
				}
				return
			}

			var action RemoteAction
			if err := json.Unmarshal(actionBytes, &action); err != nil || action.Target == "" || action.Action == "" {
				if ack != nil {
					ack([]any{map[string]any{"success": false, "message": "Invalid action"}}, nil)
				}
				return
			}

			targetSocketID := socket.SocketId(action.Target)
			server.mu.RLock()
			targetInfo, found := server.clients[targetSocketID]
			server.mu.RUnlock()

			if !found || targetInfo == nil {
				if ack != nil {
					ack([]any{map[string]any{"success": false, "message": "Target device not found"}}, nil)
				}
				return
			}

			if targetInfo.user.UUID != user.UUID {
				if ack != nil {
					ack([]any{map[string]any{"success": false, "message": "Unauthorized: device belongs to another user"}}, nil)
				}
				return
			}

			targetInfo.socket.Emit("remoteAction", action)
			if ack != nil {
				ack([]any{map[string]any{"success": true, "message": "Action sent"}}, nil)
			}
		})

		client.On("mediaState", func(args ...any) {
			if len(args) == 0 {
				return
			}
			stateMap, ok := args[0].(map[string]any)
			if !ok {
				// Convert via JSON
				b, err := json.Marshal(args[0])
				if err == nil {
					json.Unmarshal(b, &stateMap)
				}
			}
			if stateMap == nil {
				stateMap = make(map[string]any)
			}
			stateMap["deviceID"] = deviceID

			io.To(roomName).Emit("mediaState:"+strSocketID, stateMap)
		})

		client.On("disconnect", func(args ...any) {
			log.Printf("REMOTE [%s] disconnected", strSocketID)

			server.mu.Lock()
			delete(server.clients, socketID)
			server.mu.Unlock()

			io.To(roomName).Emit("deviceDisconnected", map[string]any{
				"socket":   strSocketID,
				"deviceID": deviceID,
			})
			client.Leave(roomName)
		})
	})

	return server
}
