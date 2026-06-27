package main

import (
	"encoding/json"
	"io"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

// ── Types ──────────────────────────────────────────────────────────────────────

type RouteResult struct {
	Method         string   `json:"method"`
	Path           string   `json:"path"`
	Status         int      `json:"status"`
	ResponseMs     int64    `json:"response_ms"`
	ContentType    string   `json:"content_type"`
	IsJSON         bool     `json:"is_json"`
	AllowedMethods []string `json:"allowed_methods,omitempty"`
	Source         string   `json:"source"` // "probe" | "openapi"
}

type ServiceInfo struct {
	Framework    string `json:"framework"`
	Language     string `json:"language"`
	Version      string `json:"version"`
	Environment  string `json:"environment"`
	Health       string `json:"health"` // "ok" | "error" | "unknown"
	HealthURL    string `json:"health_url"`
	ServerHeader string `json:"server_header"`
}

type AnalyzeResult struct {
	Port    int           `json:"port"`
	Service ServiceInfo   `json:"service"`
	Routes  []RouteResult `json:"routes"`
}

// ── HTTP client ─────────────────────────────────────────────────────────────────

var analyzeClient = &http.Client{
	Timeout: 3 * time.Second,
	CheckRedirect: func(_ *http.Request, via []*http.Request) error {
		if len(via) >= 2 {
			return http.ErrUseLastResponse
		}
		return nil
	},
}

// ── Paths to probe ──────────────────────────────────────────────────────────────

var probePaths = []string{
	"/",
	"/api",
	"/api/health",
	"/api/status",
	"/api/ping",
	"/api/version",
	"/api/info",
	"/api/routes",
	"/api/v1",
	"/api/v2",
	"/api/v1/health",
	"/graphql",
	"/api/graphql",
	"/health",
	"/status",
	"/ping",
	"/ready",
	"/livez",
	"/readyz",
	"/metrics",
	"/version",
	"/__health",
	// OpenAPI/docs — parsed for extra routes
	"/openapi.json",
	"/swagger.json",
	"/api-docs",
	"/api/docs",
	"/swagger",
	"/swagger/v1/swagger.json",
	"/api/openapi.json",
	"/api/swagger.json",
}

var healthPathSet = map[string]bool{
	"/health": true, "/api/health": true, "/api/status": true,
	"/status": true, "/ping": true, "/ready": true,
	"/livez": true, "/readyz": true, "/__health": true,
}

// ── OpenAPI doc ─────────────────────────────────────────────────────────────────

type openAPIDoc struct {
	Info  struct{ Version string `json:"version"` } `json:"info"`
	Paths map[string]map[string]any                  `json:"paths"`
}

var httpMethods = map[string]bool{
	"GET": true, "POST": true, "PUT": true, "PATCH": true,
	"DELETE": true, "HEAD": true, "OPTIONS": true,
}

func tryParseOpenAPI(body []byte) *openAPIDoc {
	var doc openAPIDoc
	if err := json.Unmarshal(body, &doc); err == nil && len(doc.Paths) > 0 {
		return &doc
	}
	return nil
}

// ── Framework detection ─────────────────────────────────────────────────────────

func detectFramework(hdrs http.Header, body string) (framework, language string) {
	xpb := strings.ToLower(hdrs.Get("X-Powered-By"))
	srv := strings.ToLower(hdrs.Get("Server"))
	b := strings.ToLower(body)
	switch {
	case strings.Contains(xpb, "next.js"):
		return "Next.js", "Node.js"
	case strings.Contains(xpb, "nestjs"):
		return "NestJS", "Node.js"
	case strings.Contains(xpb, "express"):
		return "Express", "Node.js"
	case strings.Contains(xpb, "koa"):
		return "Koa", "Node.js"
	case strings.Contains(xpb, "fastapi") || strings.Contains(srv, "uvicorn"):
		return "FastAPI", "Python"
	case strings.Contains(srv, "werkzeug"):
		return "Flask", "Python"
	case strings.Contains(srv, "gunicorn"):
		return "Gunicorn", "Python"
	case strings.Contains(srv, "django"):
		return "Django", "Python"
	case strings.Contains(xpb, "php"):
		return "PHP", "PHP"
	case strings.Contains(srv, "kestrel"):
		return "ASP.NET Core", ".NET"
	case strings.Contains(srv, "gin-gonic"):
		return "Gin", "Go"
	case strings.Contains(srv, "fiber"):
		return "Fiber", "Go"
	case strings.Contains(srv, "caddy"):
		return "Caddy", "Go"
	case strings.Contains(srv, "actix"):
		return "Actix", "Rust"
	case strings.Contains(srv, "rocket"):
		return "Rocket", "Rust"
	case strings.Contains(srv, "puma") || strings.Contains(srv, "unicorn"):
		return "Rails", "Ruby"
	case strings.Contains(srv, "nginx"):
		return "Nginx", "—"
	case strings.Contains(srv, "apache"):
		return "Apache", "—"
	case strings.Contains(b, "laravel"):
		return "Laravel", "PHP"
	case strings.Contains(b, `"spring"`) || strings.Contains(b, "springboot"):
		return "Spring Boot", "Java"
	}
	return "Unknown", "Unknown"
}

func detectEnvironment(hdrs http.Header, body string) string {
	for _, h := range []string{"X-Environment", "X-Env", "App-Environment", "X-App-Env"} {
		if v := strings.ToLower(hdrs.Get(h)); v != "" {
			return v
		}
	}
	b := strings.ToLower(body)
	switch {
	case strings.Contains(b, `"development"`) || strings.Contains(b, `"dev"`):
		return "development"
	case strings.Contains(b, `"production"`) || strings.Contains(b, `"prod"`):
		return "production"
	case strings.Contains(b, `"staging"`) || strings.Contains(b, `"stage"`):
		return "staging"
	case strings.Contains(b, `"test"`) || strings.Contains(b, `"testing"`):
		return "test"
	}
	return ""
}

func extractVersion(hdrs http.Header, body string) string {
	for _, h := range []string{"X-Version", "X-App-Version", "X-API-Version", "App-Version"} {
		if v := hdrs.Get(h); v != "" {
			return v
		}
	}
	return ""
}

// ── Parallel probing ────────────────────────────────────────────────────────────

type rawProbe struct {
	idx     int
	route   *RouteResult
	headers http.Header
	body    []byte
	openAPI *openAPIDoc
}

func probeOne(idx int, baseURL, path string, ch chan<- rawProbe) {
	url := baseURL + path
	start := time.Now()
	resp, err := analyzeClient.Get(url)
	ms := time.Since(start).Milliseconds()
	if err != nil {
		ch <- rawProbe{idx: idx}
		return
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 512*1024)) // 512 KB max

	ct := resp.Header.Get("Content-Type")
	isJSON := strings.Contains(ct, "json")

	// Skip HTML non-API responses (except root)
	if strings.Contains(ct, "text/html") && !isJSON && path != "/" {
		ch <- rawProbe{idx: idx, headers: resp.Header.Clone(), body: body}
		return
	}

	// Try OPTIONS for allowed methods
	var allowed []string
	if optReq, err2 := http.NewRequest(http.MethodOptions, url, nil); err2 == nil {
		if optResp, err3 := analyzeClient.Do(optReq); err3 == nil {
			optResp.Body.Close()
			if allow := optResp.Header.Get("Allow"); allow != "" {
				for _, m := range strings.Split(allow, ",") {
					if m2 := strings.TrimSpace(m); m2 != "" {
						allowed = append(allowed, m2)
					}
				}
			}
		}
	}

	route := &RouteResult{
		Method:         "GET",
		Path:           path,
		Status:         resp.StatusCode,
		ResponseMs:     ms,
		ContentType:    ct,
		IsJSON:         isJSON,
		AllowedMethods: allowed,
		Source:         "probe",
	}

	var doc *openAPIDoc
	if isJSON {
		doc = tryParseOpenAPI(body)
	}

	ch <- rawProbe{idx: idx, route: route, headers: resp.Header.Clone(), body: body, openAPI: doc}
}

// ── GET /api/analyze?port=N ─────────────────────────────────────────────────────

func handleAnalyze(w http.ResponseWriter, r *http.Request) {
	cors(w)
	if r.Method == http.MethodOptions {
		return
	}
	if r.Method != http.MethodGet {
		w.WriteHeader(405)
		return
	}

	portStr := r.URL.Query().Get("port")
	port, err := strconv.Atoi(portStr)
	if err != nil || port == 0 {
		w.WriteHeader(400)
		json.NewEncoder(w).Encode(map[string]string{"error": "invalid port"})
		return
	}

	baseURL := "http://localhost:" + strconv.Itoa(port)
	ch := make(chan rawProbe, len(probePaths))

	for i, p := range probePaths {
		go probeOne(i, baseURL, p, ch)
	}

	probes := make([]rawProbe, len(probePaths))
	for range probePaths {
		pr := <-ch
		probes[pr.idx] = pr
	}

	// First usable headers/body for framework detection
	var firstHeaders http.Header
	var firstBodyStr string

	routes := make([]RouteResult, 0, len(probePaths))
	existing := make(map[string]bool)

	for _, pr := range probes {
		if pr.headers != nil && firstHeaders == nil {
			firstHeaders = pr.headers
			firstBodyStr = string(pr.body)
		}
		if pr.route != nil {
			key := pr.route.Method + "|" + pr.route.Path
			if !existing[key] {
				routes = append(routes, *pr.route)
				existing[key] = true
			}
		}
		// Extract routes from OpenAPI specs
		if pr.openAPI != nil {
			for path, ops := range pr.openAPI.Paths {
				for method := range ops {
					m := strings.ToUpper(method)
					if !httpMethods[m] {
						continue
					}
					key := m + "|" + path
					if !existing[key] {
						routes = append(routes, RouteResult{
							Method: m,
							Path:   path,
							Source: "openapi",
						})
						existing[key] = true
					}
				}
			}
		}
	}
	if firstHeaders == nil {
		firstHeaders = http.Header{}
	}

	// Sort routes: probed first (by path), then openapi (by method+path)
	sort.Slice(routes, func(i, j int) bool {
		si, sj := routes[i].Source, routes[j].Source
		if si != sj {
			if si == "probe" { return true }
			return false
		}
		if routes[i].Path != routes[j].Path {
			return routes[i].Path < routes[j].Path
		}
		return routes[i].Method < routes[j].Method
	})

	// Health check
	health := "unknown"
	healthURL := ""
	for _, r := range routes {
		if healthPathSet[r.Path] {
			switch {
			case r.Status >= 200 && r.Status < 300 && health != "error":
				health = "ok"
				healthURL = r.Path
			case r.Status >= 500:
				health = "error"
				healthURL = r.Path
			}
		}
	}

	// Version from OpenAPI if not from headers
	ver := extractVersion(firstHeaders, firstBodyStr)
	if ver == "" {
		for _, pr := range probes {
			if pr.openAPI != nil && pr.openAPI.Info.Version != "" {
				ver = pr.openAPI.Info.Version
				break
			}
		}
	}

	fw, lang := detectFramework(firstHeaders, firstBodyStr)
	result := AnalyzeResult{
		Port: port,
		Service: ServiceInfo{
			Framework:    fw,
			Language:     lang,
			Version:      ver,
			Environment:  detectEnvironment(firstHeaders, firstBodyStr),
			Health:       health,
			HealthURL:    healthURL,
			ServerHeader: firstHeaders.Get("Server"),
		},
		Routes: routes,
	}
	json.NewEncoder(w).Encode(result)
}

// ── Proxy cache ─────────────────────────────────────────────────────────────────

type proxyCacheEntry struct {
	resp    proxyResponse
	expires time.Time
}

type proxyResponse struct {
	Status      int               `json:"status"`
	StatusText  string            `json:"status_text"`
	Headers     map[string]string `json:"headers"`
	Body        string            `json:"body"`
	Ms          int64             `json:"ms"`
	Cached      bool              `json:"cached"`
	Size        int               `json:"size"`
	CacheHits   int64             `json:"cache_hits"`
	CacheMisses int64             `json:"cache_misses"`
}

var (
	pCache   = make(map[string]proxyCacheEntry)
	pCacheMu sync.Mutex
	pHits    int64
	pMisses  int64
)

// ── POST /api/proxy ─────────────────────────────────────────────────────────────

type proxyRequest struct {
	Method  string            `json:"method"`
	URL     string            `json:"url"`
	Headers map[string]string `json:"headers"`
	Body    string            `json:"body"`
	Cache   bool              `json:"cache"`
}

func handleProxy(w http.ResponseWriter, r *http.Request) {
	cors(w)
	if r.Method == http.MethodOptions {
		return
	}

	// DELETE = clear cache
	if r.Method == http.MethodDelete {
		pCacheMu.Lock()
		pCache = make(map[string]proxyCacheEntry)
		h, m := pHits, pMisses
		pHits, pMisses = 0, 0
		pCacheMu.Unlock()
		json.NewEncoder(w).Encode(map[string]any{"cleared": true, "was_hits": h, "was_misses": m})
		return
	}

	if r.Method != http.MethodPost {
		w.WriteHeader(405)
		return
	}

	var req proxyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(400)
		json.NewEncoder(w).Encode(map[string]string{"error": "invalid body"})
		return
	}

	// Cache check (GET only)
	cacheKey := req.Method + "|" + req.URL
	if req.Cache && req.Method == "GET" {
		pCacheMu.Lock()
		if e, ok := pCache[cacheKey]; ok && time.Now().Before(e.expires) {
			pHits++
			resp := e.resp
			resp.Cached = true
			resp.CacheHits = pHits
			resp.CacheMisses = pMisses
			pCacheMu.Unlock()
			json.NewEncoder(w).Encode(resp)
			return
		}
		pMisses++
		pCacheMu.Unlock()
	}

	// Forward the request
	var bodyR io.Reader
	if req.Body != "" {
		bodyR = strings.NewReader(req.Body)
	}
	hReq, err := http.NewRequest(req.Method, req.URL, bodyR)
	if err != nil {
		w.WriteHeader(400)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	for k, v := range req.Headers {
		hReq.Header.Set(k, v)
	}
	if req.Body != "" && hReq.Header.Get("Content-Type") == "" {
		hReq.Header.Set("Content-Type", "application/json")
	}

	fwdClient := &http.Client{Timeout: 15 * time.Second}
	start := time.Now()
	resp, err := fwdClient.Do(hReq)
	ms := time.Since(start).Milliseconds()
	if err != nil {
		w.WriteHeader(502)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 2<<20)) // 2 MB

	hdrs := make(map[string]string, len(resp.Header))
	for k, vs := range resp.Header {
		hdrs[k] = strings.Join(vs, ", ")
	}

	pCacheMu.Lock()
	h, m := pHits, pMisses
	pCacheMu.Unlock()

	result := proxyResponse{
		Status:      resp.StatusCode,
		StatusText:  resp.Status,
		Headers:     hdrs,
		Body:        string(body),
		Ms:          ms,
		Size:        len(body),
		CacheHits:   h,
		CacheMisses: m,
	}

	if req.Cache && req.Method == "GET" && resp.StatusCode < 400 {
		pCacheMu.Lock()
		pCache[cacheKey] = proxyCacheEntry{resp: result, expires: time.Now().Add(30 * time.Second)}
		pCacheMu.Unlock()
	}

	json.NewEncoder(w).Encode(result)
}
