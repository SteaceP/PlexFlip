package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"time"
)

type DiscoveryPacket struct {
	Name      string        `json:"name"`
	Interval  int           `json:"interval"`
	Available bool          `json:"available"`
	Data      DiscoveryData `json:"data"`
}

type DiscoveryData struct {
	Port     int          `json:"port"`
	Type     string       `json:"type"`
	Protocol string       `json:"protocol"`
	Txt      DiscoveryTxt `json:"txt"`
}

type DiscoveryTxt struct {
	DeploymentID string `json:"deploymentID"`
	Version      string `json:"version"`
	PlexServer   string `json:"plexServer"`
}

const (
	multicastAddr = "224.0.0.234:44201"
)

// StartDiscovery broadcasts service announcements over UDP multicast.
func StartDiscovery(ctx context.Context, port int, deploymentID string, getPlexServer func() string) {
	addr, err := net.ResolveUDPAddr("udp4", multicastAddr)
	if err != nil {
		log.Printf("Discovery: error resolving UDP multicast address: %v", err)
		return
	}

	conn, err := net.DialUDP("udp4", nil, addr)
	if err != nil {
		log.Printf("Discovery: error dialing UDP multicast: %v", err)
		return
	}
	defer conn.Close()

	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()

	var lastServer string
	var data []byte

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			currentServer := getPlexServer()
			if currentServer != lastServer || data == nil {
				lastServer = currentServer
				packet := DiscoveryPacket{
					Name:      "Nevu",
					Interval:  500,
					Available: true,
					Data: DiscoveryData{
						Port:     port,
						Type:     "nevu",
						Protocol: "tcp",
						Txt: DiscoveryTxt{
							DeploymentID: deploymentID,
							Version:      "1.0.0",
							PlexServer:   currentServer,
						},
					},
				}
				var err error
				data, err = json.Marshal(packet)
				if err != nil {
					log.Printf("Discovery: error marshaling packet: %v", err)
					continue
				}
			}

			if _, err := conn.Write(data); err != nil {
				// Silently continue or log if necessary
				_ = fmt.Sprintf("failed to send announcement: %v", err)
			}
		}
	}
}
