# MCP Server

Sonar ships a bundled MCP (Model Context Protocol) server that gives AI agents direct access to your local dev environment's service state.

## What the MCP server provides

| Tool | Description |
|---|---|
| `list_running_ports` | Scans ports 3000–9000 and returns all listening TCP processes |
| `get_port_info` | Deep info for a specific port: PID, user, memory, uptime, open file descriptors, full command |
| `kill_port` | Sends SIGTERM to the process on a given port |

---

## Setup: Claude Code

Add to `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "sonar": {
      "type": "stdio",
      "command": "/Applications/Sonar.app/Contents/MacOS/mcp-server-aarch64-apple-darwin",
      "args": []
    }
  }
}
```

For Intel Mac:
```json
{
  "mcpServers": {
    "sonar": {
      "type": "stdio",
      "command": "/Applications/Sonar.app/Contents/MacOS/mcp-server-x86_64-apple-darwin",
      "args": []
    }
  }
}
```

Claude Code picks up `.mcp.json` automatically. The Sonar tools appear in the next session.

---

## Setup: Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "sonar": {
      "command": "/Applications/Sonar.app/Contents/MacOS/mcp-server-aarch64-apple-darwin",
      "args": []
    }
  }
}
```

Restart Claude Desktop after saving. The Sonar tools appear in the tools panel.

---

## Setup: Linux

The MCP binary for Linux is at:
```
/path/to/Sonar.AppImage.home/usr/bin/mcp-server-x86_64-unknown-linux-gnu
```

Or if you built from source:
```
src-tauri/binaries/mcp-server-x86_64-unknown-linux-gnu
```

Configure your client the same way as above, pointing to the correct binary path.

---

## Tool reference

### `list_running_ports`

Returns all listening TCP processes on ports 3000–9000.

**No input required.**

**Response:**
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
    },
    {
      "port": 5173,
      "pid": 12346,
      "process_name": "vite",
      "protocol": "tcp",
      "timestamp": "2024-01-15T14:32:00Z"
    }
  ]
}
```

---

### `get_port_info`

Returns enriched information for a specific port using `ps` and `lsof` data.

**Input:**
```json
{ "port": 3000 }
```

**Response:**
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

---

### `kill_port`

Sends `SIGTERM` to the process listening on the given port.

**Input:**
```json
{ "port": 3000 }
```

**Response:** Plain text confirmation or error message.

---

## Example interactions

Once connected, you can ask your AI agent:

> "What's running on my machine right now?"

The agent calls `list_running_ports` and summarizes the result.

> "Is my dev server running?"

The agent checks for node/vite/etc. on common dev ports.

> "Kill whatever is on port 3000"

The agent calls `kill_port` with `{"port": 3000}`.

> "Why is port 5432 using so much memory?"

The agent calls `get_port_info` with `{"port": 5432}` and reports RSS + uptime.

> "My app won't start — check what's using port 3000"

The agent lists ports and identifies the conflicting process.

---

## Protocol details

The MCP server implements MCP protocol version `2024-11-05` over stdin/stdout:

- **Transport:** stdio (newline-delimited JSON-RPC 2.0)
- **Buffer:** 4 MB per message
- **Notifications** (no `id` field) are silently ignored
- **Errors** are logged to stderr only — stdout is protocol-only

Supported methods:
- `initialize` — capabilities declaration
- `ping` — empty object response
- `tools/list` — tool schemas
- `tools/call` — dispatch to handler
- `resources/list` — empty (no resources)
- `prompts/list` — empty (no prompts)

---

## Scanner internals

The MCP server uses the same `scanner.ScanPorts()` function as the HTTP port scanner. Both share the `sonar/internal/scanner` Go package. No separate process required — the MCP binary is self-contained.

**Scanner strategy (in order):**
1. `lsof -nP -iTCP -sTCP:LISTEN` — primary, fastest on macOS/Linux
2. `/proc/net/tcp` parsing — Linux fallback if lsof unavailable
3. TCP dial scan — last resort

Port 5757 (Sonar's own HTTP server) is always excluded from results.

---

## Building the MCP binary from source

```bash
cd src-tauri/src/go
./build.sh
```

Output: `src-tauri/binaries/mcp-server-<arch>-<os>`

The arch suffix matches Tauri's sidecar naming convention (e.g., `mcp-server-aarch64-apple-darwin` on Apple Silicon Mac).
