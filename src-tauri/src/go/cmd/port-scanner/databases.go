package main

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"time"
)

// DBInfo describes a single detected database service.
type DBInfo struct {
	Type   string `json:"type"`
	Port   int    `json:"port"`
	Status string `json:"status"` // "online" | "offline"
	Note   string `json:"note,omitempty"`
}

// knownDBs lists well-known database/broker ports to probe.
var knownDBs = []struct {
	port   int
	dbType string
	note   string
}{
	{5432, "PostgreSQL", ""},
	{5433, "PostgreSQL", "alt port"},
	{27017, "MongoDB", ""},
	{27018, "MongoDB", "alt port"},
	{6379, "Redis", ""},
	{6380, "Redis", "alt port"},
	{3306, "MySQL", ""},
	{3307, "MySQL", "alt port"},
	{5984, "CouchDB", ""},
	{8086, "InfluxDB", ""},
	{9200, "Elasticsearch", "HTTP"},
	{9300, "Elasticsearch", "transport"},
	{5672, "RabbitMQ", "AMQP"},
	{15672, "RabbitMQ", "management"},
	{9092, "Kafka", ""},
	{2181, "ZooKeeper", ""},
	{7474, "Neo4j", "HTTP"},
	{7687, "Neo4j", "Bolt"},
	{4369, "RabbitMQ", "EPMD"},
	{8087, "Riak", ""},
	{11211, "Memcached", ""},
	{6432, "PgBouncer", ""},
	{28017, "MongoDB", "web UI"},
	{9042, "Cassandra", "CQL"},
	{7000, "Cassandra", "inter-node"},
	{4321, "Directus", ""},
	{8181, "CouchBase", ""},
}

// GET /api/databases
// Probes all known DB ports via TCP dial (150ms timeout).
// Returns only ports that are actually accepting connections.
func handleDatabases(w http.ResponseWriter, r *http.Request) {
	cors(w)
	if r.Method == http.MethodOptions {
		return
	}

	results := make([]DBInfo, 0)
	// Use a channel to probe in parallel
	type result struct {
		info   DBInfo
		online bool
	}

	ch := make(chan result, len(knownDBs))
	for _, db := range knownDBs {
		go func(port int, dbType, note string) {
			addr := fmt.Sprintf("localhost:%d", port)
			conn, err := net.DialTimeout("tcp", addr, 150*time.Millisecond)
			if err == nil {
				conn.Close()
				ch <- result{DBInfo{Type: dbType, Port: port, Status: "online", Note: note}, true}
			} else {
				ch <- result{DBInfo{Type: dbType, Port: port, Status: "offline", Note: note}, false}
			}
		}(db.port, db.dbType, db.note)
	}

	// Collect only online results
	for range knownDBs {
		r := <-ch
		if r.online {
			results = append(results, r.info)
		}
	}

	json.NewEncoder(w).Encode(map[string]any{
		"databases": results,
		"probed":    len(knownDBs),
	})
}
