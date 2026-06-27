package main

import (
	"encoding/json"
	"log"
	"net/http"
	"time"
)

const (
	minPort    = 3000
	maxPort    = 9000
	listenAddr = ":5757"
)

type Response struct {
	Ports      []PortInfo `json:"ports"`
	ScanTimeMs int64      `json:"scan_time_ms"`
}

func handlePorts(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Content-Type", "application/json")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"error": "method not allowed"})
		return
	}

	start := time.Now()
	ports, err := scanPorts(minPort, maxPort)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	if ports == nil {
		ports = []PortInfo{}
	}

	json.NewEncoder(w).Encode(Response{
		Ports:      ports,
		ScanTimeMs: time.Since(start).Milliseconds(),
	})
}

func main() {
	http.HandleFunc("/api/ports", handlePorts)
	log.Printf("sonar port scanner on %s (ports %d-%d)", listenAddr, minPort, maxPort)
	log.Fatal(http.ListenAndServe(listenAddr, nil))
}
