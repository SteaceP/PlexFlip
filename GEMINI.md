# Antigravity Rules for PlexFlip

This document defines the core architecture, active Model Context Protocol (MCP) servers, development workflows, and coding guidelines for the **PlexFlip** project. All agents working in this repository must adhere to these directives.

---

## 1. Project Overview & Architecture

**PlexFlip** is a modern desktop and web client for Plex Media Server. It replaces the classic Plex web UI with a sleek, responsive interface and native desktop integration.

### High-Level Architecture
- **Desktop Runtime**: [Wails v3](https://v3.wails.io/) native desktop wrapper for Linux (X11/Wayland), macOS, and Windows.
- **Backend**: Go 1.26 ([`backend/`](file:///home/steace/Documents/PlexFlip/backend))
  - Embedded HTTP reverse proxy forwarding requests to the target Plex Media Server.
  - SQLite storage ([`data/plexflip.db`](file:///home/steace/Documents/PlexFlip/data/plexflip.db)) via `modernc.org/sqlite` for user options, server configs, and cached metadata.
  - WebSocket synchronization ([`backend/sync.go`](file:///home/steace/Documents/PlexFlip/backend/sync.go)) for watch-together sessions (PlexFlip Sync).
  - SSDP discovery ([`backend/discovery.go`](file:///home/steace/Documents/PlexFlip/backend/discovery.go)) for local Plex server discovery.
  - Embedded frontend assets ([`backend/static.go`](file:///home/steace/Documents/PlexFlip/backend/static.go)) via `//go:embed all:www`.
  - Native desktop bridge ([`backend/wails.go`](file:///home/steace/Documents/PlexFlip/backend/wails.go)) exposing `DesktopService` methods to frontend.
- **Frontend**: React 19 + TypeScript ([`frontend/`](file:///home/steace/Documents/PlexFlip/frontend))
  - UI Library: Material-UI ([`@mui/material`](file:///home/steace/Documents/PlexFlip/frontend/package.json#L13) v7), Emotion, Framer Motion.
  - State Management: [Zustand](file:///home/steace/Documents/PlexFlip/frontend/package.json#L27).
  - Wails Integration: `@wailsio/runtime` + auto-generated bindings in [`frontend/bindings/`](file:///home/steace/Documents/PlexFlip/frontend/bindings).
  - Package Manager: **`pnpm`** exclusively.
- **Dual Runtime Modes**:
  1. *Desktop Window Mode*: Runs a dedicated Wails v3 webview window with native desktop controls and system window integration.
  2. *Headless / Server Mode*: Runs as a standalone HTTP web server without GUI dependencies (activated via `--server`, `HEADLESS=true`, or headless build `make build-server`).

---

## 2. Model Context Protocol (MCP) Servers

The following MCP servers are configured and active for this project. Agents must leverage these tools to query live state, generate bindings, validate compilation, and inspect external services instead of guessing or mocking.

### 2.1. Wails v3 Desktop MCP Server (`wails3`)
- **Transport**: `stdio` (`wails3 mcp -stdio -root /home/steace/Documents/PlexFlip`)
- **Scope**: Desktop app orchestration, build pipelines, task execution, and TypeScript binding generation.
- **Available Tools**:
  - `wails_project_build`: Builds desktop binaries, headless servers, or frontend packages.
  - `wails_project_dev_start`: Starts the development live-reload server.
  - `wails_project_doctor`: Diagnoses system prerequisites, WebKit/GTK libraries, and compiler toolchains.
  - `wails_project_generate_bindings`: **CRITICAL** - Generates and synchronizes TypeScript frontend bindings from Go exported methods in [`backend/wails.go`](file:///home/steace/Documents/PlexFlip/backend/wails.go).
  - `wails_project_inspect`: Inspects Wails v3 project metadata and configuration.
  - `wails_project_task_list` / `wails_project_task_run`: Inspects and executes tasks defined in [`Taskfile.yml`](file:///home/steace/Documents/PlexFlip/Taskfile.yml).
  - `wails_job_status` / `wails_job_stop`: Manages running Wails background jobs.
- **Agent Directives**:
  - Whenever you add or modify methods on [`DesktopService`](file:///home/steace/Documents/PlexFlip/backend/wails.go#L23) in Go, you **must** regenerate bindings using `wails_project_generate_bindings` (or `wails3 generate bindings`) so [`frontend/bindings/`](file:///home/steace/Documents/PlexFlip/frontend/bindings) stays in sync.
  - Use `wails_project_doctor` when diagnosing missing desktop libraries or compile failures.

### 2.2. Plex Media Server MCP Server (`plex`)
- **Transport**: `stdio` (`uvx --python 3.12 plex-mcp-server --transport stdio`)
- **Configuration**: Connects to the local Plex server at `http://192.168.2.123:32400` with pre-authenticated credentials.
- **Scope**: Direct live interaction with the Plex Media Server for inspecting libraries, media metadata, user playback state, and client sessions.
- **Available Tool Categories (55 tools)**:
  - **Libraries**: `library_list`, `library_get_details`, `library_get_contents`, `library_get_recently_added`, `library_get_stats`, `library_scan`, `library_refresh`.
  - **Media**: `media_search`, `media_get_details`, `media_get_artwork`, `media_list_available_artwork`, `media_edit_metadata`, `media_delete`.
  - **Playlists & Collections**: `playlist_list`, `playlist_get_contents`, `playlist_create`, `playlist_edit`, `playlist_delete`, `collection_list`, `collection_create`, `collection_edit`, `collection_delete`.
  - **Users & Playback**: `user_list_all_users`, `user_get_info`, `user_get_watch_history`, `user_get_on_deck`, `user_get_statistics`, `sessions_get_active`.
  - **Server Diagnostics**: `server_get_info`, `server_get_bandwidth`, `server_get_current_resources`, `server_get_alerts`, `server_get_butler_tasks`.
  - **Clients & Control**: `client_list`, `client_get_details`, `client_get_timelines`, `client_control_playback`, `client_navigate`.
- **Agent Directives**:
  - **Verify against real Plex data**: When building or debugging API proxies, metadata parsing, search filters, hero carousel displays, or stream track matching, query the `plex` MCP tools to inspect real response structures instead of guessing Plex API schemas.
  - Before modifying proxy routing in [`backend/proxy.go`](file:///home/steace/Documents/PlexFlip/backend/proxy.go), test the target endpoint with the Plex MCP server to confirm exact query parameters and headers.

### 2.3. Go Language Server MCP (`gopls-mcp-server`)
- **Transport**: `stdio` (`go run golang.org/x/tools/gopls@latest mcp`)
- **Scope**: Go code intelligence, compilation diagnostics, symbol search, and refactoring.
- **Available Tools**:
  - `go_diagnostics`: Runs compiler and type-checker diagnostics across the Go workspace.
  - `go_symbol_references`: Finds all references to Go functions, structs, and variables.
  - `go_package_api`: Inspects exported Go APIs and types.
  - `go_search`: Searches workspace symbols.
  - `go_vulncheck`: Scans Go dependencies for security vulnerabilities.
- **Agent Directives**:
  - Run `go_diagnostics` on `backend` after modifying Go files to ensure clean compilation and type correctness.
  - Keep the Go workspace file ([`go.work`](file:///home/steace/Documents/PlexFlip/go.work)) in mind; it links `./backend`.

### 2.4. TypeScript Language Server MCP (`ts-language-mcp`)
- **Transport**: `stdio` (`pnpm dlx --silent ts-language-mcp@latest`)
- **Scope**: TypeScript/React static analysis, diagnostics, and code organization.
- **Available Tools**:
  - `get_diagnostics` / `get_all_diagnostics`: Type checking and lint error inspection.
  - `get_definition`, `get_references`, `get_symbols`: Symbol resolution.
  - `format_document`, `organize_imports`: Code formatting and import cleanups.
- **Agent Directives**:
  - Run TypeScript diagnostics after modifying React components in [`frontend/src/`](file:///home/steace/Documents/PlexFlip/frontend/src) to catch React 19 typing mismatches or broken MUI imports early.

### 2.5. Chrome DevTools MCP (`chrome-devtools-mcp`)
- **Transport**: `stdio` (`npx -y chrome-devtools-mcp@latest`)
- **Scope**: Browser automation, DOM inspection, accessibility (a11y) verification, and console log auditing.
- **Agent Directives**:
  - Use when validating UI layout regressions, responsive breakpoints, or browser console errors on `http://localhost:4000` (dev) or `http://localhost:3000` (prod).

### 2.6. GitHub MCP Server (`github-mcp-server`)
- **Transport**: Docker container (`ghcr.io/github/github-mcp-server`)
- **Scope**: Issues, Pull Requests, releases, and repository workflows for `SteaceP/PlexFlip`.

### 2.7. Material UI MCP Server (`mui-mcp`)
- **Transport**: `stdio` (`cmd /c npx -y @mui/mcp@latest`)
- **Scope**: Official Material UI and MUI X documentation catalog and React component generation tools.
- **Available Tools**:
  - `useMuiDocs`: Fetches the documentation catalog (URLs + summaries) for `@mui/material`, `@mui/x-data-grid`, etc.
  - `fetchDocs`: Fetches full content of official MUI documentation pages.
  - `generateReactCode`: Generates Material UI React components grounded in official patterns.
- **Agent Directives**:
  - Use `useMuiDocs` and `fetchDocs` when verifying Material UI component APIs, props, theme overrides, and styling patterns in [`frontend/src/`](file:///f:/PlexFlip/frontend/src).

### 2.8. React Documentation MCP Server (`react-docs-mcp`)
- **Transport**: `stdio` (`cmd /c node C:/Users/steac/.gemini/antigravity/mcp-wrapper.js npx -y react-docs-mcp`)
- **Scope**: Offline semantic and hybrid keyword search over official React documentation (react.dev).
- **Available Tools**:
  - Semantic search and documentation lookup for React APIs, hooks, and patterns.
- **Agent Directives**:
  - Use when querying React 19 APIs, hooks, and lifecycle patterns in [`frontend/src/`](file:///f:/PlexFlip/frontend/src).

---

## 3. Development and Build Workflows

### 3.1. Package Management
- **Rule**: **Always use `pnpm`** for frontend dependencies.
  - Install dependencies: `pnpm --dir frontend install`
  - Never run `npm` or `yarn` directly in this repository.

### 3.2. Running in Development Mode
- **Native Desktop App (Wails v3)**:
  ```bash
  wails3 dev
  # Or via Make
  make wails-dev
  ```
  Starts Wails v3 development mode with live reload, frontend Vite/React dev server on port 4000, and Go hot-recompilation.
- **Classic Split Browser Mode**:
  - Terminal 1 (Frontend React Server):
    ```bash
    pnpm --dir frontend start
    ```
    (Runs on `http://localhost:4000`)
  - Terminal 2 (Backend Go Server):
    ```bash
    cd backend && PLEX_SERVER=http://192.168.2.123:32400 go run .
    ```
    (Listens on `http://localhost:3000`)

### 3.3. Building Binaries
- **Desktop Application (Native GUI)**:
  ```bash
  make build
  # Or: wails3 build
  ```
  Stages frontend build into [`backend/www/`](file:///home/steace/Documents/PlexFlip/backend/www) and compiles [`bin/plexflip`](file:///home/steace/Documents/PlexFlip/bin).
- **Headless Server (No GUI / Docker compatible)**:
  ```bash
  make build-server
  # Or: wails3 task build:server
  ```
  Compiles standalone server binary without GUI/WebKit dependencies to [`bin/plexflip-server`](file:///home/steace/Documents/PlexFlip/bin).
- **Desktop Distribution Packages**:
  ```bash
  make wails-package
  # Or: wails3 package
  ```
  Generates Linux AppImage, `.deb`, and `.rpm` packages.

### 3.4. Testing and Clean
- **Run Backend Tests**:
  ```bash
  make test
  # Or: cd backend && go test -v ./...
  ```
- **Clean Build Artifacts**:
  ```bash
  make clean
  ```

---

## 4. Backend Conventions (Go)

1. **Go Workspace**: The root directory contains [`go.work`](file:///home/steace/Documents/PlexFlip/go.work) pointing to `./backend`. Run Go commands from the project root or inside `backend/`.
2. **SQLite Access**:
   - Connection pool: SQLite works best with 1 writer or serialized access; adhere to `db.SetMaxOpenConns(1)` in [`backend/db.go`](file:///home/steace/Documents/PlexFlip/backend/db.go#L56).
   - Use `modernc.org/sqlite` (pure Go, CGO-free).
   - Database file defaults to [`data/plexflip.db`](file:///home/steace/Documents/PlexFlip/data/plexflip.db).
3. **Plex Reverse Proxy & Token Handling**:
   - Central proxy logic resides in [`backend/proxy.go`](file:///home/steace/Documents/PlexFlip/backend/proxy.go).
   - Rewrites cookies, paths, and injects authentication headers (`X-Plex-Token`).
   - Honor environment variables `PLEX_SERVER`, `PORT`, `LISTEN_PORT`, `DISABLE_TLS_VERIFY`, `DISABLE_REQUEST_LOGGING`.
4. **Wails Desktop Service**:
   - Methods exposed to the desktop frontend are attached to `DesktopService` in [`backend/wails.go`](file:///home/steace/Documents/PlexFlip/backend/wails.go#L23).
   - Always keep desktop methods safe for both GUI and headless invocations.
   - Graceful shutdown handles `SIGINT` / `SIGTERM` and cleans up both the HTTP server and Wails window.

---

## 5. Frontend Conventions (React 19 + TypeScript)

1. **Desktop vs. Web Detection**:
   - Use `isDesktopApp()` from [`frontend/src/common/DesktopApp.ts`](file:///home/steace/Documents/PlexFlip/frontend/src/common/DesktopApp.ts#L15).
   - Check `typeof window._wails !== "undefined"` to branch between Wails desktop APIs and web browser fallback behaviors.
2. **Wails Bindings**:
   - Import desktop native functions from [`frontend/bindings/plexflip/backend/desktopservice`](file:///home/steace/Documents/PlexFlip/frontend/src/common/DesktopApp.ts#L3).
   - Never edit files in `frontend/bindings/` directly; regenerate them using `wails3 generate bindings`.
3. **Styling & UI Components**:
   - Theme: Dark palette ([slate `#0f172a`](file:///home/steace/Documents/PlexFlip/backend/wails.go#L146), Plex accent amber `#e5a00d`).
   - Use Material-UI components ([`@mui/material`](file:///home/steace/Documents/PlexFlip/frontend/package.json#L13)) and Emotion styled components.
   - For micro-animations and carousel transitions, use Framer Motion.
4. **Authentication & Token Storage**:
   - Client-side auth tokens are stored in `localStorage` under `accessToken` and `accAccessToken`.

---

## 6. Agent Behavioral & Safety Directives

- **MCP First**: When addressing issues involving Plex metadata or desktop bindings, check with the `plex` or `wails3` MCP server before making assumptions.
- **Verification**: Always run `go_diagnostics` (Go) or `get_diagnostics` (TS) after code edits to ensure no syntax or typing errors remain.
- **Preserve Documentation**: Maintain existing comments and docstrings unless explicitly instructed otherwise.
- **Accidental Data Loss Prevention**: Do NOT delete database tables (`data/plexflip.db`), truncate collections, or run destructive git/filesystem commands without explicit user confirmation.
- **File Links**: Use GitHub-style markdown links with the `file://` scheme when referencing files and symbols (e.g., [`DesktopService`](file:///home/steace/Documents/PlexFlip/backend/wails.go#L23)).
