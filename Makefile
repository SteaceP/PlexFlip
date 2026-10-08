.PHONY: all build build-frontend build-backend build-desktop build-server clean dev-frontend dev-backend test docker-build wails-dev wails-build wails-package help

SHELL := /bin/bash
BIN_DIR ?= bin
BINARY ?= $(BIN_DIR)/plexflip
SERVER_BINARY ?= $(BIN_DIR)/plexflip-server
BACKEND_WWW := backend/www

all: build

help:
	@echo "PlexFlip Build Framework"
	@echo ""
	@echo "Targets:"
	@echo "  make build           - Build frontend and compile native desktop binary ($(BINARY))"
	@echo "  make build-desktop   - Compile Wails v3 native desktop binary"
	@echo "  make build-server    - Compile headless/server binary without GUI ($(SERVER_BINARY))"
	@echo "  make build-frontend  - Build React frontend and copy assets into $(BACKEND_WWW)"
	@echo "  make build-backend   - Compile Go binary with embedded frontend (alias for build-desktop)"
	@echo "  make wails-dev       - Run application in Wails v3 dev mode"
	@echo "  make wails-build     - Build native desktop application using Wails v3 CLI"
	@echo "  make wails-package   - Package production desktop installer (AppImage, deb, rpm)"
	@echo "  make dev-frontend    - Run frontend development server (pnpm start)"
	@echo "  make dev-backend     - Run Go backend development server (go run .)"
	@echo "  make test            - Run Go backend test suite"
	@echo "  make clean           - Remove build artifacts and clean $(BACKEND_WWW)"
	@echo "  make docker-build    - Build Docker image with embedded frontend"

build: build-frontend build-desktop

build-frontend:
	@echo "==> Building frontend with pnpm..."
	@pnpm --dir frontend run build
	@echo "==> Staging frontend assets for Go embed into $(BACKEND_WWW)..."
	@mkdir -p $(BACKEND_WWW)
	@rm -rf $(BACKEND_WWW)/*
	@cp -r frontend/build/* $(BACKEND_WWW)/
	@touch $(BACKEND_WWW)/.gitkeep

build-backend: build-desktop

build-desktop:
	@echo "==> Compiling native Wails v3 desktop binary with embedded frontend..."
	@mkdir -p $(BIN_DIR)
	@cd backend && go build -tags production -trimpath -ldflags="-w -s" -o ../$(BINARY) .
	@echo "==> Successfully created standalone desktop binary: $(BINARY)"

build-server:
	@echo "==> Compiling headless Go server binary with embedded frontend..."
	@mkdir -p $(BIN_DIR)
	@cd backend && CGO_ENABLED=0 go build -tags server,production -trimpath -ldflags="-w -s" -o ../$(SERVER_BINARY) .
	@echo "==> Successfully created standalone server binary: $(SERVER_BINARY)"

wails-dev:
	@wails3 dev

wails-build:
	@wails3 build

wails-package:
	@wails3 package

dev-frontend:
	@pnpm --dir frontend start

dev-backend:
	@cd backend && go run .

test:
	@cd backend && go test -v ./...

clean:
	@echo "==> Cleaning build artifacts..."
	@rm -rf $(BIN_DIR)
	@rm -rf frontend/build
	@rm -rf frontend/bindings
	@mkdir -p $(BACKEND_WWW)
	@rm -rf $(BACKEND_WWW)/*
	@touch $(BACKEND_WWW)/.gitkeep
	@rm -f backend/plexflip backend/plexflip-backend backend/backend backend/plexflip-server

docker-build:
	@echo "==> Building Docker image..."
	@docker build -t coderage/plexflip:latest .
