# MCP Server

Sonar ships a bundled MCP (Model Context Protocol) server that gives AI assistants direct access to your local dev environment's port state.

## What the MCP Server Does

The MCP server runs as a stdio JSON-RPC 2.0 process. It exposes three tools:

### `list_running_ports`
Scans ports 3000–9000 and returns all listening TCP processes.

**Returns:**
```json
{
  "count": 3,
  "ports": [
    {
      "port": 3000,
      "pid": 12345,
      "process_name": "node",
      "protocol": "tcp",
      "timestamp": "2024-01-15T14:32:00Z"
    }
  ]
}
```

### `get_port_info`
Deep info for a specific port — enriched with `ps` and `lsof` data.

**Input:** `{ "port": 3000 }`

**Returns:**
```json
{
  "port": 3000,
  "pid": 12345,
  "process_name": "node",
  "protocol": "tcp",
  "process_details": {
    "pid": "12345",
    "ppid": "1",
    "user": "aiyan",
    "elapsed": "01:23:45",
    "rss_kb": "89432",
    "command": "node dist/server.js"
  },
  "open_file_descriptors": 47
}
```

### `kill_port`
Sends `SIGTERM` to the process listening on a port.

**Input:** `{ "port": 3000 }`

**Returns:** Plain text confirmation or error message.

---

## Setup with Claude Desktop

Add the MCP server to your Claude Desktop config:

**Config file location:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "sonar": {
      "command": "/path/to/sonar/src-tauri/binaries/mcp-server-aarch64-apple-darwin",
      "args": []
    }
  }
}
```

Replace `/path/to/sonar` with the actual path to your Sonar repo or app bundle.

**If installed as an app bundle:**
```json
{
  "mcpServers": {
    "sonar": {
      "command": "/Applications/Sonar.app/Contents/MacOS/mcp-server-aarch64-apple-darwin"
    }
  }
}
```

Restart Claude Desktop after editing the config. The Sonar tools will appear in the tools panel.

---

## Setup with Claude Code

Add to `.mcp.json` in your project root (or `~/.claude/mcp.json` globally):

```json
{
  "mcpServers": {
    "sonar": {
      "command": "/path/to/sonar/src-tauri/binaries/mcp-server-aarch64-apple-darwin"
    }
  }
}
```

The tools `list_running_ports`, `get_port_info`, and `kill_port` become available in Claude Code sessions automatically.

---

## Protocol

The server implements MCP protocol version `2024-11-05` over stdin/stdout:
- Input: newline-delimited JSON-RPC 2.0 requests
- Output: newline-delimited JSON-RPC 2.0 responses
- Buffer: 4MB per message
- Notifications (no `id` field) are silently ignored
- Errors logged to stderr only (stdout is protocol-only)

Supported methods:
- `initialize` → capabilities declaration
- `ping` → empty object
- `tools/list` → tool schemas
- `tools/call` → dispatch to handler
- `resources/list` → empty (no resources)
- `prompts/list` → empty (no prompts)

---

## Example AI Interactions

Once connected, you can ask Claude things like:

> "What's running on my machine right now?"
→ Claude calls `list_running_ports`, returns a human-readable summary

> "Is my dev server running?"
→ Claude calls `list_running_ports`, checks for node/vite/etc on common ports

> "Kill whatever is on port 3000"
→ Claude calls `kill_port` with `{"port": 3000}`

> "Why is port 5432 taking so much memory?"
→ Claude calls `get_port_info` with `{"port": 5432}`, reports RSS + uptime

> "My app isn't starting — check what ports are in use"
→ Claude lists all ports and identifies potential conflicts

---

## Scanner Source

The MCP server uses the same internal `scanner.ScanPorts()` function as the HTTP port scanner. Both share `sonar/internal/scanner` Go package. No separate process required — the MCP binary is self-contained.

**Scanner strategy (in order):**
1. `lsof -nP -iTCP -sTCP:LISTEN` (macOS/Linux with lsof)
2. `/proc/net/tcp` parsing (Linux fallback)
3. TCP dial scan (last resort)

Port 5757 (Sonar's own HTTP server) is always excluded from results.

---

## Building the MCP Binary

```bash
cd src-tauri/src/go
./build.sh
```

Outputs to `src-tauri/binaries/mcp-server-aarch64-apple-darwin` (or the appropriate arch suffix for your machine).
