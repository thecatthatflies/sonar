package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"sonar/internal/scanner"
)

const (
	minPort    = 3000
	maxPort    = 9000
	listenAddr = ":5757"
)

func cors(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
	w.Header().Set("Content-Type", "application/json")
}

// GET /api/ports
func handlePorts(w http.ResponseWriter, r *http.Request) {
	cors(w)
	if r.Method == http.MethodOptions { return }
	if r.Method != http.MethodGet {
		w.WriteHeader(405)
		json.NewEncoder(w).Encode(map[string]string{"error": "method not allowed"})
		return
	}

	start := time.Now()
	ports, err := scanner.ScanPorts(minPort, maxPort)
	if err != nil {
		w.WriteHeader(500)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	if ports == nil {
		ports = []scanner.PortInfo{}
	}
	json.NewEncoder(w).Encode(map[string]any{
		"ports":        ports,
		"scan_time_ms": time.Since(start).Milliseconds(),
	})
}

// GET /api/info?port=3000 — detailed process info for a specific port
func handleInfo(w http.ResponseWriter, r *http.Request) {
	cors(w)
	if r.Method == http.MethodOptions { return }
	if r.Method != http.MethodGet {
		w.WriteHeader(405)
		return
	}

	portStr := r.URL.Query().Get("port")
	port, err := strconv.Atoi(portStr)
	if err != nil {
		w.WriteHeader(400)
		json.NewEncoder(w).Encode(map[string]string{"error": "invalid port"})
		return
	}

	ports, _ := scanner.ScanPorts(port, port)
	if len(ports) == 0 {
		w.WriteHeader(404)
		json.NewEncoder(w).Encode(map[string]string{"error": "no process on port"})
		return
	}
	p := ports[0]

	type Detail struct {
		scanner.PortInfo
		User    string `json:"user"`
		Elapsed string `json:"elapsed"`
		RSSKB   int    `json:"rss_kb"`
		OpenFDs int    `json:"open_fds"`
		Command string `json:"command"`
	}

	d := Detail{PortInfo: p}

	// ps -p <pid> -o user=,etime=,rss=,command=
	if out, err := exec.Command(
		"ps", "-p", strconv.Itoa(p.PID),
		"-o", "user=,etime=,rss=,command=",
	).Output(); err == nil {
		fields := strings.Fields(strings.TrimSpace(string(out)))
		if len(fields) >= 3 {
			d.User    = fields[0]
			d.Elapsed = fields[1]
			d.RSSKB, _ = strconv.Atoi(fields[2])
			if len(fields) > 3 {
				d.Command = strings.Join(fields[3:], " ")
			}
		}
	}

	// Count open file descriptors via lsof
	if out, err := exec.Command("lsof", "-p", strconv.Itoa(p.PID)).Output(); err == nil {
		d.OpenFDs = strings.Count(string(out), "\n") - 1
	}

	json.NewEncoder(w).Encode(d)
}

// POST /api/kill   body: {"port": 3000}
func handleKill(w http.ResponseWriter, r *http.Request) {
	cors(w)
	if r.Method == http.MethodOptions { return }
	if r.Method != http.MethodPost {
		w.WriteHeader(405)
		return
	}

	var body struct {
		Port int `json:"port"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Port == 0 {
		w.WriteHeader(400)
		json.NewEncoder(w).Encode(map[string]string{"error": `body must be {"port": N}`})
		return
	}

	ports, _ := scanner.ScanPorts(body.Port, body.Port)
	if len(ports) == 0 {
		w.WriteHeader(404)
		json.NewEncoder(w).Encode(map[string]any{"success": false, "message": fmt.Sprintf("no process on port %d", body.Port)})
		return
	}

	var killed, failed []int
	for _, p := range ports {
		if p.PID == 0 {
			continue
		}
		if err := killProcess(p.PID); err != nil {
			failed = append(failed, p.PID)
		} else {
			killed = append(killed, p.PID)
		}
	}

	if len(killed) == 0 {
		w.WriteHeader(500)
		json.NewEncoder(w).Encode(map[string]any{
			"success": false,
			"message": fmt.Sprintf("could not kill port %d (permission denied?)", body.Port),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]any{
		"success": true,
		"message": fmt.Sprintf("sent SIGTERM to PID(s) %v", killed),
		"killed":  killed,
	})
}

func main() {
	http.HandleFunc("/api/ports",     handlePorts)
	http.HandleFunc("/api/info",      handleInfo)
	http.HandleFunc("/api/kill",      handleKill)
	http.HandleFunc("/api/databases", handleDatabases)
	http.HandleFunc("/api/analyze",   handleAnalyze)
	http.HandleFunc("/api/proxy",     handleProxy)
	log.Printf("sonar port scanner on %s (ports %d-%d)", listenAddr, minPort, maxPort)
	log.Fatal(http.ListenAndServe(listenAddr, nil))
}
