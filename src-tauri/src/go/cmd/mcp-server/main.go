package main

import (
	"bufio"
	"encoding/json"
	"log"
	"os"
)

// JSON-RPC 2.0 types ──────────────────────────────────────────────────────────

type request struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      json.RawMessage `json:"id"`
	Method  string          `json:"method"`
	Params  json.RawMessage `json:"params,omitempty"`
}

type response struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      json.RawMessage `json:"id,omitempty"`
	Result  any             `json:"result,omitempty"`
	Error   *rpcError       `json:"error,omitempty"`
}

type rpcError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

func ok(id json.RawMessage, result any) response {
	return response{JSONRPC: "2.0", ID: id, Result: result}
}

func fail(id json.RawMessage, code int, msg string) response {
	return response{JSONRPC: "2.0", ID: id, Error: &rpcError{Code: code, Message: msg}}
}

// Capability declarations ─────────────────────────────────────────────────────

func initResult() any {
	return map[string]any{
		"protocolVersion": "2024-11-05",
		"capabilities":    map[string]any{"tools": map[string]any{}},
		"serverInfo":      map[string]any{"name": "sonar", "version": "0.2.0"},
	}
}

func toolList() any {
	return map[string]any{
		"tools": []any{
			// ── Port monitoring ────────────────────────────────────────────
			tool("list_running_ports",
				"List all processes listening on ports 1000–9999 on localhost. Returns port, PID, process name, protocol. Falls back to direct scan if Sonar is not running.",
				obj(nil),
			),
			tool("get_port_info",
				"Get full details for a specific port: user, elapsed time, memory (RSS), open file descriptors, full command line.",
				obj(map[string]any{"port": intProp("Port number to inspect")}),
			),
			tool("kill_port",
				"Send SIGTERM to the process listening on a given port. Safely terminates the process.",
				obj(map[string]any{"port": intProp("Port number to kill")}),
			),
			tool("filter_ports",
				"List running ports filtered by process name substring. Useful to find all ports belonging to 'node', 'python', 'java', etc.",
				obj(map[string]any{"process": strProp("Process name substring to filter by (e.g. 'node', 'python')")}),
			),
			tool("scan_port_range",
				"Scan a specific port range for listening processes. Use for targeted scanning outside the default 1000–9999 range.",
				obj(map[string]any{
					"min_port": intProp("Start of range (default 1000)"),
					"max_port": intProp("End of range (default 9999)"),
				}),
			),
			tool("get_service_health",
				"Check if a service on a given port responds on common health endpoints (/health, /healthz, /ping, /). Returns status code and whether service is alive.",
				obj(map[string]any{"port": intProp("Port number to health-check")}),
			),

			// ── Service analysis ───────────────────────────────────────────
			tool("analyze_service",
				"Deep-analyze a running service: detect framework (Express, FastAPI, Rails, etc.), language, version, environment, and discover API routes via probing and OpenAPI spec detection. Requires Sonar to be running.",
				obj(map[string]any{"port": intProp("Port number of the service to analyze")}),
			),
			tool("test_endpoint",
				"Make an HTTP request to a service endpoint and return the response status, headers, body, and latency. Useful for testing APIs.",
				obj(map[string]any{
					"url":    strProp("Full URL to request (e.g. http://localhost:3000/api/users)"),
					"method": strProp("HTTP method: GET, POST, PUT, PATCH, DELETE (default GET)"),
					"body":   strProp("Request body for POST/PUT/PATCH (JSON string)"),
				}),
			),

			// ── Database discovery ─────────────────────────────────────────
			tool("list_databases",
				"Discover running databases by scanning common ports: PostgreSQL (5432), MySQL (3306), MongoDB (27017), Redis (6379), Elasticsearch (9200), and more.",
				obj(nil),
			),

			// ── System ────────────────────────────────────────────────────
			tool("get_system_info",
				"Get system information: hostname, user, OS, uptime, memory stats, and disk usage.",
				obj(nil),
			),
			tool("list_all_processes",
				"List all running system processes (ps aux), optionally filtered by name substring.",
				obj(map[string]any{"filter": strProp("Optional name filter substring")}),
			),
			tool("run_command",
				"Execute a shell command and return its combined output. Use for running build commands, npm scripts, git operations, etc.",
				obj(map[string]any{"command": strProp("Shell command to execute")}),
			),
		},
	}
}

func tool(name, desc string, schema map[string]any) any {
	return map[string]any{"name": name, "description": desc, "inputSchema": schema}
}

func obj(props map[string]any) map[string]any {
	if props == nil {
		props = map[string]any{}
	}
	return map[string]any{"type": "object", "properties": props}
}

func intProp(desc string) map[string]any {
	return map[string]any{"type": "integer", "description": desc}
}

func strProp(desc string) map[string]any {
	return map[string]any{"type": "string", "description": desc}
}

// Dispatch ────────────────────────────────────────────────────────────────────

func handle(req request) (response, bool) {
	isNotification := req.ID == nil

	switch req.Method {
	case "initialize":
		return ok(req.ID, initResult()), true
	case "ping":
		return ok(req.ID, map[string]any{}), true
	case "tools/list":
		return ok(req.ID, toolList()), true
	case "resources/list":
		return ok(req.ID, map[string]any{"resources": []any{}}), true
	case "prompts/list":
		return ok(req.ID, map[string]any{"prompts": []any{}}), true
	case "notifications/initialized":
		return response{}, false
	case "tools/call":
		result, err := dispatchTool(req.Params)
		if err != nil {
			return fail(req.ID, -32000, err.Error()), true
		}
		return ok(req.ID, result), true
	default:
		if isNotification {
			return response{}, false
		}
		return fail(req.ID, -32601, "method not found: "+req.Method), true
	}
}

// Entry point ─────────────────────────────────────────────────────────────────

func main() {
	log.SetOutput(os.Stderr)
	log.SetFlags(0)
	log.Println("[sonar-mcp] started — 12 tools available")

	enc := json.NewEncoder(os.Stdout)
	sc := bufio.NewScanner(os.Stdin)
	sc.Buffer(make([]byte, 4*1024*1024), 4*1024*1024)

	for sc.Scan() {
		line := sc.Text()
		if line == "" {
			continue
		}
		var req request
		if err := json.Unmarshal([]byte(line), &req); err != nil {
			log.Printf("[sonar-mcp] parse error: %v", err)
			continue
		}
		resp, send := handle(req)
		if send {
			if err := enc.Encode(resp); err != nil {
				log.Printf("[sonar-mcp] encode error: %v", err)
			}
		}
	}

	if err := sc.Err(); err != nil {
		log.Printf("[sonar-mcp] stdin error: %v", err)
	}
}
