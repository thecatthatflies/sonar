package scanner

import (
	"bufio"
	"bytes"
	"encoding/binary"
	"encoding/hex"
	"fmt"
	"net"
	"os"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"
)

// PortInfo describes a single listening TCP port.
type PortInfo struct {
	Port        int       `json:"port"`
	PID         int       `json:"pid"`
	ProcessName string    `json:"process_name"`
	Protocol    string    `json:"protocol"`
	Timestamp   time.Time `json:"timestamp"`
}

// ScanPorts returns all listening TCP ports in [minPort, maxPort].
// Strategy: lsof (macOS/Linux) → /proc/net/tcp (Linux) → dial fallback.
func ScanPorts(minPort, maxPort int) ([]PortInfo, error) {
	if _, err := exec.LookPath("lsof"); err == nil {
		return lsofScan(minPort, maxPort)
	}
	if runtime.GOOS == "linux" {
		return procScan(minPort, maxPort)
	}
	return dialScan(minPort, maxPort)
}

const selfPort = 5757 // port-scanner's own HTTP server — always excluded

func lsofScan(minPort, maxPort int) ([]PortInfo, error) {
	cmd := exec.Command("lsof", "-nP", "-iTCP", "-sTCP:LISTEN")
	out, err := cmd.Output()
	if err != nil && len(out) == 0 {
		return []PortInfo{}, nil
	}

	now := time.Now().UTC()
	var ports []PortInfo
	seen := make(map[string]struct{})

	sc := bufio.NewScanner(bytes.NewReader(out))
	sc.Scan() // discard header

	for sc.Scan() {
		fields := strings.Fields(sc.Text())
		if len(fields) < 9 {
			continue
		}
		processName := fields[0]
		pid, err := strconv.Atoi(fields[1])
		if err != nil {
			continue
		}
		name := fields[8]
		lastColon := strings.LastIndex(name, ":")
		if lastColon == -1 {
			continue
		}
		port, err := strconv.Atoi(name[lastColon+1:])
		if err != nil || port < minPort || port > maxPort || port == selfPort {
			continue
		}
		key := fmt.Sprintf("%d:%d", pid, port)
		if _, dup := seen[key]; dup {
			continue
		}
		seen[key] = struct{}{}
		ports = append(ports, PortInfo{
			Port: port, PID: pid, ProcessName: processName,
			Protocol: "tcp", Timestamp: now,
		})
	}
	return ports, nil
}

func procScan(minPort, maxPort int) ([]PortInfo, error) {
	inodes, err := listenInodes(minPort, maxPort)
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	var ports []PortInfo
	for inode, port := range inodes {
		pid, name := inodeToPID(inode)
		ports = append(ports, PortInfo{
			Port: port, PID: pid, ProcessName: name,
			Protocol: "tcp", Timestamp: now,
		})
	}
	return ports, nil
}

func listenInodes(minPort, maxPort int) (map[uint64]int, error) {
	result := make(map[uint64]int)
	for _, path := range []string{"/proc/net/tcp", "/proc/net/tcp6"} {
		f, err := os.Open(path)
		if err != nil {
			continue
		}
		sc := bufio.NewScanner(f)
		sc.Scan()
		for sc.Scan() {
			fields := strings.Fields(sc.Text())
			if len(fields) < 10 || fields[3] != "0A" {
				continue
			}
			localParts := strings.Split(fields[1], ":")
			if len(localParts) < 2 {
				continue
			}
			pb, err := hex.DecodeString(localParts[len(localParts)-1])
			if err != nil || len(pb) < 2 {
				continue
			}
			port := int(binary.BigEndian.Uint16(pb))
			if port < minPort || port > maxPort || port == selfPort {
				continue
			}
			inode, err := strconv.ParseUint(fields[9], 10, 64)
			if err != nil {
				continue
			}
			result[inode] = port
		}
		f.Close()
	}
	return result, nil
}

func inodeToPID(inode uint64) (int, string) {
	target := fmt.Sprintf("socket:[%d]", inode)
	entries, _ := os.ReadDir("/proc")
	for _, e := range entries {
		pid, err := strconv.Atoi(e.Name())
		if err != nil {
			continue
		}
		fdDir := fmt.Sprintf("/proc/%d/fd", pid)
		fds, err := os.ReadDir(fdDir)
		if err != nil {
			continue
		}
		for _, fd := range fds {
			link, err := os.Readlink(fmt.Sprintf("%s/%s", fdDir, fd.Name()))
			if err == nil && link == target {
				return pid, procName(pid)
			}
		}
	}
	return 0, "unknown"
}

func procName(pid int) string {
	b, err := os.ReadFile(fmt.Sprintf("/proc/%d/comm", pid))
	if err != nil {
		return "unknown"
	}
	return strings.TrimSpace(string(b))
}

func dialScan(minPort, maxPort int) ([]PortInfo, error) {
	type result struct{ port int }
	total := maxPort - minPort + 1
	results := make(chan result, total)
	sem := make(chan struct{}, 512)
	now := time.Now().UTC()

	var wg sync.WaitGroup
	for p := minPort; p <= maxPort; p++ {
		wg.Add(1)
		go func(port int) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			conn, err := net.DialTimeout("tcp", fmt.Sprintf("127.0.0.1:%d", port), 50*time.Millisecond)
			if err == nil {
				conn.Close()
				results <- result{port}
			}
		}(p)
	}
	wg.Wait()
	close(results)

	var ports []PortInfo
	for r := range results {
		ports = append(ports, PortInfo{
			Port: r.port, PID: 0, ProcessName: "unknown",
			Protocol: "tcp", Timestamp: now,
		})
	}
	return ports, nil
}
