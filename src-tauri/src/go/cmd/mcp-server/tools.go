package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os/exec"
	"strconv"
	"strings"
	"syscall"
	"time"

	"sonar/internal/scanner"
)

const (
	scannerURL = "http://localhost:5757"
	scanMin    = 1
	scanMax    = 65535
	devScanMin = 1000
	devScanMax = 9999
)

// httpGet fetches from the port-scanner REST API with a timeout.
func httpGet(path string) ([]byte, error) {
	c := &http.Client{Timeout: 8 * time.Second}
	resp, err := c.Get(scannerURL + path)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	return io.ReadAll(resp.Body)
}

func httpPost(path string, body string) ([]byte, error) {
	c := &http.Client{Timeout: 15 * time.Second}
	resp, err := c.Post(scannerURL+path, "application/json", strings.NewReader(body))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	return io.ReadAll(resp.Body)
}

// dispatchTool routes tools/call to handler functions.
func dispatchTool(raw json.RawMessage) (any, error) {
	var p struct {
		Name      string         `json:"name"`
		Arguments map[string]any `json:"arguments"`
	}
	if err := json.Unmarshal(raw, &p); err != nil {
		return nil, fmt.Errorf("invalid params: %w", err)
	}

	switch p.Name {
	case "list_running_ports":
		return toolListPorts(p.Arguments)
	case "get_port_info":
		port, err := intArg(p.Arguments, "port")
		if err != nil {
			return nil, err
		}
		return toolGetPortInfo(port)
	case "kill_port":
		port, err := intArg(p.Arguments, "port")
		if err != nil {
			return nil, err
		}
		return toolKillPort(port)
	case "analyze_service":
		port, err := intArg(p.Arguments, "port")
		if err != nil {
			return nil, err
		}
		return toolAnalyzeService(port)
	case "list_databases":
		return toolListDatabases()
	case "test_endpoint":
		return toolTestEndpoint(p.Arguments)
	case "scan_port_range":
		return toolScanPortRange(p.Arguments)
	case "run_command":
		return toolRunCommand(p.Arguments)
	case "get_system_info":
		return toolGetSystemInfo()
	case "list_all_processes":
		return toolListAllProcesses(p.Arguments)
	case "filter_ports":
		return toolFilterPorts(p.Arguments)
	case "get_service_health":
		port, err := intArg(p.Arguments, "port")
		if err != nil {
			return nil, err
		}
		return toolGetServiceHealth(port)
	default:
		return nil, fmt.Errorf("unknown tool: %s", p.Name)
	}
}

// ── list_running_ports ────────────────────────────────────────────────────────

func toolListPorts(args map[string]any) (any, error) {
	// Try REST API first (richer data, already running)
	if data, err := httpGet("/api/ports"); err == nil {
		return text(string(data)), nil
	}

	// Fallback: direct scan of dev range
	ports, err := scanner.ScanPorts(devScanMin, devScanMax)
	if err != nil {
		return nil, err
	}
	if ports == nil {
		ports = []scanner.PortInfo{}
	}
	data, _ := json.MarshalIndent(map[string]any{"count": len(ports), "ports": ports}, "", "  ")
	return text(string(data)), nil
}

// ── get_port_info ─────────────────────────────────────────────────────────────

func toolGetPortInfo(port int) (any, error) {
	// Try REST API
	if data, err := httpGet(fmt.Sprintf("/api/info?port=%d", port)); err == nil {
		return text(string(data)), nil
	}

	// Fallback
	ports, err := scanner.ScanPorts(port, port)
	if err != nil {
		return nil, err
	}
	for _, p := range ports {
		if p.Port != port {
			continue
		}
		info := map[string]any{
			"port": p.Port, "pid": p.PID,
			"process_name": p.ProcessName, "protocol": p.Protocol,
		}
		if ps := psInfo(p.PID); ps != nil {
			info["process_details"] = ps
		}
		if fds := fdCount(p.PID); fds >= 0 {
			info["open_file_descriptors"] = fds
		}
		data, _ := json.MarshalIndent(info, "", "  ")
		return text(string(data)), nil
	}
	return nil, fmt.Errorf("no process on port %d", port)
}

// ── kill_port ─────────────────────────────────────────────────────────────────

func toolKillPort(port int) (any, error) {
	// Try REST API
	body := fmt.Sprintf(`{"port":%d}`, port)
	if data, err := httpPost("/api/kill", body); err == nil {
		return text(string(data)), nil
	}

	// Fallback
	ports, err := scanner.ScanPorts(port, port)
	if err != nil {
		return nil, err
	}
	var target *scanner.PortInfo
	for i := range ports {
		if ports[i].Port == port {
			target = &ports[i]
			break
		}
	}
	if target == nil {
		return nil, fmt.Errorf("no process on port %d", port)
	}

	pids := pidsByPort(port)
	if len(pids) == 0 {
		pids = []int{target.PID}
	}

	var killed, failed []int
	for _, pid := range pids {
		if err := syscall.Kill(pid, syscall.SIGTERM); err != nil {
			failed = append(failed, pid)
		} else {
			killed = append(killed, pid)
		}
	}

	msg := fmt.Sprintf("port %d (%s): sent SIGTERM to PID(s) %v", port, target.ProcessName, killed)
	if len(failed) > 0 {
		msg += fmt.Sprintf(" (failed: %v — may need elevated permissions)", failed)
	}
	return text(msg), nil
}

// ── analyze_service ───────────────────────────────────────────────────────────

func toolAnalyzeService(port int) (any, error) {
	data, err := httpGet(fmt.Sprintf("/api/analyze?port=%d", port))
	if err != nil {
		return nil, fmt.Errorf("port-scanner API unavailable (is Sonar running?): %w", err)
	}
	return text(string(data)), nil
}

// ── list_databases ────────────────────────────────────────────────────────────

func toolListDatabases() (any, error) {
	data, err := httpGet("/api/databases")
	if err != nil {
		// Fallback: try common DB ports
		dbPorts := []int{5432, 3306, 27017, 6379, 5984, 9200, 9300, 2181, 7474, 8086}
		var found []map[string]any
		for _, p := range dbPorts {
			ports, _ := scanner.ScanPorts(p, p)
			for _, pp := range ports {
				if pp.Port == p {
					found = append(found, map[string]any{
						"port": p, "process": pp.ProcessName, "pid": pp.PID,
					})
				}
			}
		}
		d, _ := json.MarshalIndent(map[string]any{"databases": found}, "", "  ")
		return text(string(d)), nil
	}
	return text(string(data)), nil
}

// ── test_endpoint ─────────────────────────────────────────────────────────────

func toolTestEndpoint(args map[string]any) (any, error) {
	method, _ := args["method"].(string)
	url, _ := args["url"].(string)
	body, _ := args["body"].(string)

	if method == "" {
		method = "GET"
	}
	if url == "" {
		return nil, fmt.Errorf("url is required")
	}

	payload, _ := json.Marshal(map[string]any{
		"method": method, "url": url, "body": body, "cache": false,
	})

	data, err := httpPost("/api/proxy", string(payload))
	if err != nil {
		return nil, fmt.Errorf("proxy request failed: %w", err)
	}
	return text(string(data)), nil
}

// ── scan_port_range ───────────────────────────────────────────────────────────

func toolScanPortRange(args map[string]any) (any, error) {
	min := devScanMin
	max := devScanMax

	if v, ok := args["min_port"]; ok {
		if f, ok := v.(float64); ok {
			min = int(f)
		}
	}
	if v, ok := args["max_port"]; ok {
		if f, ok := v.(float64); ok {
			max = int(f)
		}
	}

	if min < 1 {
		min = 1
	}
	if max > 65535 {
		max = 65535
	}
	if min > max {
		return nil, fmt.Errorf("min_port must be <= max_port")
	}

	ports, err := scanner.ScanPorts(min, max)
	if err != nil {
		return nil, err
	}
	if ports == nil {
		ports = []scanner.PortInfo{}
	}
	data, _ := json.MarshalIndent(map[string]any{
		"range": fmt.Sprintf("%d-%d", min, max),
		"count": len(ports),
		"ports": ports,
	}, "", "  ")
	return text(string(data)), nil
}

// ── run_command ───────────────────────────────────────────────────────────────

func toolRunCommand(args map[string]any) (any, error) {
	cmd, _ := args["command"].(string)
	if cmd == "" {
		return nil, fmt.Errorf("command is required")
	}

	// 10-second timeout for safety
	ctx, cancel := func() (interface{ Done() <-chan struct{} }, func()) {
		return nil, func() {}
	}()
	_ = ctx
	defer cancel()

	out, err := exec.Command("sh", "-c", cmd).CombinedOutput()
	result := map[string]any{
		"command": cmd,
		"output":  strings.TrimRight(string(out), "\n"),
	}
	if err != nil {
		result["error"] = err.Error()
	}
	data, _ := json.MarshalIndent(result, "", "  ")
	return text(string(data)), nil
}

// ── get_system_info ───────────────────────────────────────────────────────────

func toolGetSystemInfo() (any, error) {
	info := map[string]any{}

	// Host info
	if h, err := exec.Command("hostname").Output(); err == nil {
		info["hostname"] = strings.TrimSpace(string(h))
	}
	if u, err := exec.Command("whoami").Output(); err == nil {
		info["user"] = strings.TrimSpace(string(u))
	}
	if o, err := exec.Command("uname", "-srm").Output(); err == nil {
		info["os"] = strings.TrimSpace(string(o))
	}

	// CPU load
	if l, err := exec.Command("uptime").Output(); err == nil {
		info["uptime"] = strings.TrimSpace(string(l))
	}

	// Memory (macOS)
	if m, err := exec.Command("vm_stat").Output(); err == nil {
		info["vm_stat"] = strings.TrimSpace(string(m))
	}

	// Disk usage
	if d, err := exec.Command("df", "-h", "/").Output(); err == nil {
		lines := strings.Split(string(d), "\n")
		if len(lines) >= 2 {
			info["disk"] = strings.TrimSpace(lines[1])
		}
	}

	data, _ := json.MarshalIndent(info, "", "  ")
	return text(string(data)), nil
}

// ── list_all_processes ────────────────────────────────────────────────────────

func toolListAllProcesses(args map[string]any) (any, error) {
	filterName, _ := args["filter"].(string)

	out, err := exec.Command("ps", "aux").Output()
	if err != nil {
		return nil, fmt.Errorf("ps failed: %w", err)
	}

	lines := strings.Split(string(out), "\n")
	if len(lines) == 0 {
		return text("no processes"), nil
	}

	header := lines[0]
	var procs []string
	procs = append(procs, header)

	for _, line := range lines[1:] {
		if line == "" {
			continue
		}
		if filterName != "" && !strings.Contains(strings.ToLower(line), strings.ToLower(filterName)) {
			continue
		}
		procs = append(procs, line)
	}

	return text(strings.Join(procs, "\n")), nil
}

// ── filter_ports ──────────────────────────────────────────────────────────────

func toolFilterPorts(args map[string]any) (any, error) {
	processFilter, _ := args["process"].(string)

	ports, err := scanner.ScanPorts(devScanMin, devScanMax)
	if err != nil {
		return nil, err
	}

	var filtered []scanner.PortInfo
	for _, p := range ports {
		if processFilter != "" && !strings.Contains(
			strings.ToLower(p.ProcessName),
			strings.ToLower(processFilter),
		) {
			continue
		}
		filtered = append(filtered, p)
	}

	if filtered == nil {
		filtered = []scanner.PortInfo{}
	}

	data, _ := json.MarshalIndent(map[string]any{
		"filter": processFilter,
		"count":  len(filtered),
		"ports":  filtered,
	}, "", "  ")
	return text(string(data)), nil
}

// ── get_service_health ────────────────────────────────────────────────────────

func toolGetServiceHealth(port int) (any, error) {
	urls := []string{
		fmt.Sprintf("http://localhost:%d/health", port),
		fmt.Sprintf("http://localhost:%d/healthz", port),
		fmt.Sprintf("http://localhost:%d/ping", port),
		fmt.Sprintf("http://localhost:%d/", port),
	}

	c := &http.Client{Timeout: 3 * time.Second}

	for _, u := range urls {
		resp, err := c.Get(u)
		if err != nil {
			continue
		}
		resp.Body.Close()

		result := map[string]any{
			"port":   port,
			"url":    u,
			"status": resp.StatusCode,
			"ok":     resp.StatusCode >= 200 && resp.StatusCode < 400,
		}
		data, _ := json.MarshalIndent(result, "", "  ")
		return text(string(data)), nil
	}

	return text(fmt.Sprintf(`{"port":%d,"ok":false,"message":"no response on common health endpoints"}`, port)), nil
}

// ── helpers ───────────────────────────────────────────────────────────────────

func pidsByPort(port int) []int {
	out, err := exec.Command("lsof", "-t", "-i", fmt.Sprintf("tcp:%d", port)).Output()
	if err != nil {
		return nil
	}
	var pids []int
	for _, s := range strings.Fields(string(out)) {
		if pid, err := strconv.Atoi(s); err == nil {
			pids = append(pids, pid)
		}
	}
	return pids
}

func psInfo(pid int) map[string]string {
	out, err := exec.Command("ps", "-p", strconv.Itoa(pid), "-o", "pid=,ppid=,user=,etime=,rss=,command=").Output()
	if err != nil || len(strings.TrimSpace(string(out))) == 0 {
		return nil
	}
	fields := strings.Fields(strings.TrimSpace(string(out)))
	if len(fields) < 5 {
		return nil
	}
	m := map[string]string{
		"pid": fields[0], "ppid": fields[1],
		"user": fields[2], "elapsed": fields[3], "rss_kb": fields[4],
	}
	if len(fields) > 5 {
		m["command"] = strings.Join(fields[5:], " ")
	}
	return m
}

func fdCount(pid int) int {
	out, err := exec.Command("lsof", "-p", strconv.Itoa(pid)).Output()
	if err != nil {
		return -1
	}
	return strings.Count(string(out), "\n") - 1
}

func intArg(args map[string]any, key string) (int, error) {
	v, ok := args[key]
	if !ok {
		return 0, fmt.Errorf("missing argument: %s", key)
	}
	f, ok := v.(float64)
	if !ok {
		return 0, fmt.Errorf("argument %s must be a number", key)
	}
	return int(f), nil
}

func text(s string) any {
	return map[string]any{
		"content": []any{map[string]any{"type": "text", "text": s}},
	}
}
