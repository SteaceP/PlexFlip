package main

import (
	"embed"
	"io"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
)

//go:embed all:www
var embeddedFrontendFS embed.FS

var (
	embeddedDistFS fs.FS
	hasEmbeddedWWW bool
)

func init() {
	sub, err := fs.Sub(embeddedFrontendFS, "www")
	if err == nil {
		if f, err := sub.Open("index.html"); err == nil {
			f.Close()
			embeddedDistFS = sub
			hasEmbeddedWWW = true
		}
	}
}

func (a *ServerApp) initStaticServing() {
	a.resolveWWWDir()
	if hasEmbeddedWWW {
		log.Println("Static frontend: using embedded assets inside Go binary")
	} else if a.wwwDir != "" {
		log.Printf("Static frontend: using disk assets at %s", a.wwwDir)
	} else {
		log.Println("Static frontend: no embedded assets or static disk directory found")
	}
}

func (a *ServerApp) resolveWWWDir() {
	if dir := os.Getenv("STATIC_DIR"); dir != "" {
		if stat, err := os.Stat(dir); err == nil && stat.IsDir() {
			a.wwwDir = dir
			return
		}
	}

	candidates := []string{
		"www",
		"/app/www",
		"../frontend/build",
		"frontend/build",
	}
	for _, cand := range candidates {
		indexPath := filepath.Join(cand, "index.html")
		if stat, err := os.Stat(indexPath); err == nil && !stat.IsDir() {
			a.wwwDir = cand
			return
		}
	}
	a.wwwDir = ""
}

func (a *ServerApp) serveStaticOrSPA(w http.ResponseWriter, r *http.Request) {
	// If DEV_STATIC is explicitly enabled or STATIC_DIR is provided, prefer disk if available
	preferDisk := (os.Getenv("DEV_STATIC") == "true" || os.Getenv("STATIC_DIR") != "") && a.wwwDir != ""

	if preferDisk {
		a.serveFromDisk(w, r)
		return
	}

	// Serve from embedded binary assets if available
	if hasEmbeddedWWW && embeddedDistFS != nil {
		a.serveFromFS(embeddedDistFS, w, r)
		return
	}

	// Fallback to disk directory if available
	if a.wwwDir != "" {
		a.serveFromDisk(w, r)
		return
	}

	http.Error(w, "Frontend not found. Please build the frontend into the binary (e.g. 'make build' or 'pnpm run build') or run the frontend dev server.", http.StatusNotFound)
}

func (a *ServerApp) serveFromDisk(w http.ResponseWriter, r *http.Request) {
	if strings.Contains(r.URL.Path, "\\") {
		http.NotFound(w, r)
		return
	}

	cleanPath := strings.TrimPrefix(path.Clean(r.URL.Path), "/")
	if cleanPath == "" || cleanPath == "." {
		cleanPath = "index.html"
	}

	absWWWDir, err := filepath.Abs(a.wwwDir)
	if err != nil {
		absWWWDir = a.wwwDir
	}

	targetFilePath := filepath.Join(absWWWDir, filepath.FromSlash(cleanPath))
	rel, err := filepath.Rel(absWWWDir, targetFilePath)
	if err != nil || strings.HasPrefix(rel, "..") || strings.Contains(rel, ".."+string(filepath.Separator)) {
		http.NotFound(w, r)
		return
	}

	info, err := os.Stat(targetFilePath)
	if err == nil && !info.IsDir() {
		http.ServeFile(w, r, targetFilePath)
		return
	}

	// For missing static assets with extensions (e.g. .js, .css, .png), return 404
	ext := path.Ext(cleanPath)
	if ext != "" && ext != ".html" {
		http.NotFound(w, r)
		return
	}

	// Fallback to index.html for SPA client-side routes
	indexPath := filepath.Join(a.wwwDir, "index.html")
	if _, err := os.Stat(indexPath); err == nil {
		http.ServeFile(w, r, indexPath)
		return
	}

	http.NotFound(w, r)
}

func (a *ServerApp) serveFromFS(fsys fs.FS, w http.ResponseWriter, r *http.Request) {
	cleanPath := strings.TrimPrefix(path.Clean(r.URL.Path), "/")
	if cleanPath == "" || cleanPath == "." {
		cleanPath = "index.html"
	}

	// Check if the requested file exists
	f, err := fsys.Open(cleanPath)
	if err == nil {
		stat, err := f.Stat()
		if err == nil && !stat.IsDir() {
			f.Close()
			http.FileServer(http.FS(fsys)).ServeHTTP(w, r)
			return
		}
		f.Close()
	}

	// For missing static assets with extensions (e.g. .js, .css, .png), return 404
	ext := path.Ext(cleanPath)
	if ext != "" && ext != ".html" {
		http.NotFound(w, r)
		return
	}

	// Fallback to index.html for SPA client-side routes
	indexFile, err := fsys.Open("index.html")
	if err == nil {
		defer indexFile.Close()
		stat, err := indexFile.Stat()
		if err == nil {
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			http.ServeContent(w, r, "index.html", stat.ModTime(), indexFile.(io.ReadSeeker))
			return
		}
	}

	http.NotFound(w, r)
}
