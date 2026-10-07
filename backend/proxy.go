package main

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"time"
)

type ProxyService struct {
	plexServer       string
	plexParsedURL    *url.URL
	disableTLSVerify bool
	httpClient       *http.Client
	reverseProxy     *httputil.ReverseProxy
	logRequests      bool
}

func getClientIP(r *http.Request) string {
	xff := r.Header.Get("X-Forwarded-For")
	if xff != "" {
		parts := strings.Split(xff, ",")
		ip := strings.TrimSpace(parts[0])
		return strings.ReplaceAll(ip, "::ffff:", "")
	}
	ip := r.RemoteAddr
	// Strip port
	if lastColon := strings.LastIndex(ip, ":"); lastColon != -1 {
		ip = ip[:lastColon]
	}
	ip = strings.Trim(ip, "[]")
	return strings.ReplaceAll(ip, "::ffff:", "")
}

func NewProxyService(plexServer string, disableTLSVerify, logRequests bool) (*ProxyService, error) {
	parsed, err := url.Parse(plexServer)
	if err != nil {
		return nil, fmt.Errorf("invalid PLEX_SERVER URL: %w", err)
	}

	transport := &http.Transport{
		Proxy:                 http.ProxyFromEnvironment,
		MaxIdleConns:          100,
		MaxIdleConnsPerHost:   100,
		IdleConnTimeout:       90 * time.Second,
		TLSHandshakeTimeout:   10 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
		ResponseHeaderTimeout: 0, // No timeout for media transcode start
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: disableTLSVerify,
		},
	}

	client := &http.Client{
		Transport: transport,
		Timeout:   0, // No timeout for streaming proxy requests
	}

	revProxy := &httputil.ReverseProxy{
		Transport:     transport,
		FlushInterval: -1, // Flush streaming chunks immediately to the video player
		Director: func(req *http.Request) {
			reqURI := req.URL.RequestURI()
			subpath := strings.TrimPrefix(reqURI, "/dynproxy")
			if subpath == "" {
				subpath = "/"
			}

			req.URL.Scheme = parsed.Scheme
			req.URL.Host = parsed.Host

			if targetParsed, err := url.Parse(subpath); err == nil {
				req.URL.Path = targetParsed.Path
				req.URL.RawPath = targetParsed.RawPath
				req.URL.RawQuery = targetParsed.RawQuery
			} else {
				req.URL.Path = subpath
			}

			req.Host = parsed.Host

			// Strip cookies
			req.Header.Del("Cookie")

			// Clean and set X-Forwarded-For
			clientIP := getClientIP(req)
			req.Header.Set("X-Forwarded-For", clientIP)
		},
		ModifyResponse: func(resp *http.Response) error {
			// Strip upstream CORS headers to avoid duplicate headers that browsers block
			resp.Header.Del("Access-Control-Allow-Origin")
			resp.Header.Del("Access-Control-Allow-Credentials")
			resp.Header.Del("Access-Control-Allow-Methods")
			resp.Header.Del("Access-Control-Allow-Headers")
			resp.Header.Del("Access-Control-Expose-Headers")

			// Rewrite Location header on redirects so the browser routes subsequent segments through /dynproxy
			if loc := resp.Header.Get("Location"); loc != "" {
				if u, err := url.Parse(loc); err == nil {
					if u.Host == "" || u.Host == parsed.Host {
						newPath := u.Path
						if !strings.HasPrefix(newPath, "/dynproxy") {
							newPath = "/dynproxy" + newPath
						}
						u.Scheme = ""
						u.Host = ""
						u.Path = newPath
						resp.Header.Set("Location", u.String())
					}
				}
			}
			return nil
		},
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			if errors.Is(err, context.Canceled) || errors.Is(err, io.ErrUnexpectedEOF) {
				// Normal client abort / scrub in video player
				return
			}
			log.Printf("[PROXY] Error proxying %s %s: %v", r.Method, r.URL.RequestURI(), err)
			http.Error(w, "Proxy error", http.StatusInternalServerError)
		},
	}

	return &ProxyService{
		plexServer:       plexServer,
		plexParsedURL:    parsed,
		disableTLSVerify: disableTLSVerify,
		httpClient:       client,
		reverseProxy:     revProxy,
		logRequests:      logRequests,
	}, nil
}

// ServeDynProxy handles /dynproxy/* requests.
func (p *ProxyService) ServeDynProxy(w http.ResponseWriter, r *http.Request) {
	p.reverseProxy.ServeHTTP(w, r)
}

type ProxyRequestBody struct {
	URL     string            `json:"url"`
	Method  string            `json:"method"`
	Headers map[string]string `json:"headers"`
	Data    any               `json:"data"`
}

// HandlePostProxy handles POST /proxy.
func (p *ProxyService) HandlePostProxy(w http.ResponseWriter, r *http.Request) {
	ip := getClientIP(r)

	var reqBody ProxyRequestBody
	if err := json.NewDecoder(r.Body).Decode(&reqBody); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	if p.logRequests {
		log.Printf("[%s] [PROXY] [%s] %s from %s", time.Now().UTC().Format(time.RFC3339), reqBody.Method, reqBody.URL, ip)
	}

	// Validate URL
	if !strings.HasPrefix(reqBody.URL, "/") || strings.Contains(reqBody.URL, "..") {
		http.Error(w, "Invalid URL", http.StatusBadRequest)
		return
	}

	// Validate Method
	method := strings.ToUpper(reqBody.Method)
	if method != "GET" && method != "POST" && method != "PUT" {
		http.Error(w, "Invalid method", http.StatusBadRequest)
		return
	}

	targetURL := p.plexServer + reqBody.URL

	var bodyReader io.Reader
	if reqBody.Data != nil {
		dataBytes, err := json.Marshal(reqBody.Data)
		if err == nil {
			bodyReader = bytes.NewReader(dataBytes)
		}
	}

	outReq, err := http.NewRequestWithContext(r.Context(), method, targetURL, bodyReader)
	if err != nil {
		log.Printf("[POST /proxy] Error creating request for %s %s: %v", method, targetURL, err)
		http.Error(w, "Proxy error", http.StatusInternalServerError)
		return
	}

	for k, v := range reqBody.Headers {
		outReq.Header.Set(k, v)
	}
	outReq.Header.Set("Accept", "application/json")
	if reqBody.Data != nil {
		outReq.Header.Set("Content-Type", "application/json")
	}
	outReq.Header.Set("User-Agent", "Mozilla/5.0")
	outReq.Header.Set("X-Forwarded-For", ip)

	resp, err := p.httpClient.Do(outReq)
	if err != nil {
		if errors.Is(err, context.Canceled) {
			return
		}
		log.Printf("[POST /proxy] Error executing request for %s %s: %v", method, targetURL, err)
		http.Error(w, "Proxy error", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if ct := resp.Header.Get("Content-Type"); ct != "" {
		w.Header().Set("Content-Type", ct)
	}
	if cl := resp.Header.Get("Content-Length"); cl != "" {
		w.Header().Set("Content-Length", cl)
	}

	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

// HandleGetProxy handles GET /proxy.
func (p *ProxyService) HandleGetProxy(w http.ResponseWriter, r *http.Request) {
	ip := getClientIP(r)

	q := r.URL.Query()
	urlParam := q.Get("url")
	methodParam := q.Get("method")
	if methodParam == "" {
		methodParam = "GET"
	}
	method := strings.ToUpper(methodParam)

	// Validate URL
	if !strings.HasPrefix(urlParam, "/") || strings.Contains(urlParam, "..") {
		http.Error(w, "Invalid URL", http.StatusBadRequest)
		return
	}

	// Validate Method
	if method != "GET" && method != "POST" && method != "PUT" {
		http.Error(w, "Invalid method", http.StatusBadRequest)
		return
	}

	// Pass query params without url and method
	targetQuery := url.Values{}
	for k, vals := range q {
		if k != "url" && k != "method" {
			for _, v := range vals {
				targetQuery.Add(k, v)
			}
		}
	}

	targetURL := p.plexServer + urlParam
	if len(targetQuery) > 0 {
		if strings.Contains(targetURL, "?") {
			targetURL += "&" + targetQuery.Encode()
		} else {
			targetURL += "?" + targetQuery.Encode()
		}
	}

	outReq, err := http.NewRequestWithContext(r.Context(), method, targetURL, nil)
	if err != nil {
		log.Printf("[GET /proxy] Error creating request for %s %s: %v", method, targetURL, err)
		http.Error(w, "Proxy error", http.StatusInternalServerError)
		return
	}

	for k, vals := range r.Header {
		for _, v := range vals {
			outReq.Header.Add(k, v)
		}
	}
	outReq.Header.Set("Accept", "application/json")
	outReq.Header.Set("User-Agent", "Mozilla/5.0")
	outReq.Header.Set("X-Forwarded-For", ip)

	resp, err := p.httpClient.Do(outReq)
	if err != nil {
		if errors.Is(err, context.Canceled) {
			return
		}
		log.Printf("[GET /proxy] Error executing request for %s %s: %v", method, targetURL, err)
		http.Error(w, "Proxy error", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if ct := resp.Header.Get("Content-Type"); ct != "" {
		w.Header().Set("Content-Type", ct)
	}
	if cl := resp.Header.Get("Content-Length"); cl != "" {
		w.Header().Set("Content-Length", cl)
	}

	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}
