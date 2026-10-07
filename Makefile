.PHONY: all build build-frontend build-backend clean dev-frontend dev-backend test docker-build help

SHELL := /bin/bash
BIN_DIR ?= bin
BINARY ?= $(BIN_DIR)/nevu
BACKEND_WWW := backend/www

all: build

help:
	@echo "Nevu Build Framework"
	@echo ""
	@echo "Targets:"
	@echo "  make build           - Build frontend and compile self-contained Go binary ($(BINARY))"
	@echo "  make build-frontend  - Build React frontend and copy assets into $(BACKEND_WWW)"
	@echo "  make build-backend   - Compile Go binary with embedded frontend"
	@echo "  make dev-frontend    - Run frontend development server (pnpm start)"
	@echo "  make dev-backend     - Run Go backend development server (go run .)"
	@echo "  make test            - Run Go backend test suite"
	@echo "  make clean           - Remove build artifacts and clean $(BACKEND_WWW)"
	@echo "  make docker-build    - Build Docker image with embedded frontend"

build: build-frontend build-backend

build-frontend:
	@echo "==> Building frontend with pnpm..."
	@pnpm --dir frontend run build
	@echo "==> Staging frontend assets for Go embed into $(BACKEND_WWW)..."
	@mkdir -p $(BACKEND_WWW)
	@rm -rf $(BACKEND_WWW)/*
	@cp -r frontend/build/* $(BACKEND_WWW)/
	@touch $(BACKEND_WWW)/.gitkeep

build-backend:
	@echo "==> Compiling Go binary with embedded frontend..."
	@mkdir -p $(BIN_DIR)
	@cd backend && CGO_ENABLED=0 go build -ldflags="-s -w" -o ../$(BINARY) .
	@echo "==> Successfully created standalone binary: $(BINARY)"

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
	@mkdir -p $(BACKEND_WWW)
	@rm -rf $(BACKEND_WWW)/*
	@touch $(BACKEND_WWW)/.gitkeep
	@rm -f backend/nevu backend/nevu-backend backend/backend

docker-build:
	@echo "==> Building Docker image..."
	@docker build -t ipmake/nevu:latest .
