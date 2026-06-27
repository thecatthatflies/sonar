# Features

## Port Monitor

Sonar auto-discovers every service listening on ports 3000–9000 and displays them in a live sidebar panel.

### What's shown

Each port card displays:
- Port number
- Process name (e.g., `node`, `go`, `postgres`)
- Protocol (`HTTP`, `TCP`)
- Live/stale status indicator

### Context menu

Right-click any port card (or click `⋮`) to access:

| Action | Description |
|---|---|
| **Open in new tab** | Opens `http://localhost:PORT` in Sonar's browser |
| **Copy URL** | Copies `http://localhost:PORT` to clipboard |
| **Kill port** | Sends `SIGTERM` to the process (with confirmation) |
| **Show details** | Displays PID, user, elapsed time, RSS memory, open file descriptors, and full command line |
| **Hide** | Hides this process from the sidebar permanently |

### Smart filter

Sonar automatically hides known system noise — Slack, Spotify, browsers, VPN clients, Apple system services — while surfacing your actual dev tools.

**Auto-shown processes:** Node.js, Python, Ruby, Go, Rust, Java, all major databases and web servers.

**Manual overrides:** Click **Hide** to hide any process. In "Show all" mode, click **Allow** to permanently un-hide an auto-hidden process.

See [Port Filter docs](https://sonardocs.aiyan.tech/port-filter) for the complete list and override behavior.

---

## Browser

Sonar's built-in browser works like a standard browser with developer-focused shortcuts.

### Smart address bar

Type in the address bar:

| Input | Resolves to |
|---|---|
| `3000` | `http://localhost:3000` |
| `localhost:3000` | `http://localhost:3000` |
| `http://localhost:9000` | unchanged |
| `192.168.1.100:8080` | `http://192.168.1.100:8080` |
| `github.com` | `https://github.com` |
| `what is cors` | `https://duckduckgo.com/?q=what+is+cors` |

Full reference in [Address Bar docs](https://sonardocs.aiyan.tech/address-bar).

### Tabs

- Click any port in the sidebar to open it in a new tab
- Multiple tabs open simultaneously
- Each tab is an independent WebView (isolated state)

---

## Terminal

A full native terminal lives inside Sonar. It uses your system shell (`$SHELL`) — bash, zsh, fish, or any other.

Use cases:
- Run `npm run dev` and switch to the browser tab without leaving the window
- Tail logs while inspecting the running app
- Kill and restart services inline
- Run database queries next to your app

The terminal is a proper PTY, not a wrapper — interactive programs (`vim`, `htop`, `psql`) work correctly.

---

## DevTools

### Inspect page

Click **⋮ → Inspect page** to open Safari Web Inspector attached to the active browser tab.

Provides:
- **Elements** — live DOM inspector with editing
- **Network** — XHR, fetch, WebSocket, and resource requests
- **Console** — JavaScript REPL
- **Sources** — source maps, breakpoints, step debugger
- **Timelines** — rendering performance

Requires **Safari → Settings → Advanced → Show features for web developers** on macOS.

### Console (log drawer)

Click **⋮ → Console** to open the log drawer at the bottom.

Features:
- **Log levels:** DEBUG, INFO, WARN, ERROR — toggleable per level
- **Deduplication:** repeated messages within 800ms collapse into `×N` badge
- **Time gaps:** `+4.2s` rulers appear between entries separated by more than 1 second
- **Clickable URLs:** `http://` and `https://` links open in a new Sonar tab
- **Auto-scroll:** toggle the blue `↓` button to pin/unpin
- **Save sessions:** the 💾 button saves the current log to localStorage for later review

Log sources: `scanner` (port polling), `navigator` (browser fetches), `webview` (webview lifecycle), `sonar` (general app events).

### Inspect Sonar

**⋮ → Inspect Sonar** opens the WebKit inspector on Sonar's own React UI. Useful for diagnosing Sonar itself, not the pages you browse.

### Reload Sonar

**⋮ → Reload Sonar** performs a full app reload without restarting the backend process.

Full reference in [DevTools docs](https://sonardocs.aiyan.tech/devtools).

---

## MCP Server

Sonar ships a bundled MCP (Model Context Protocol) server that gives AI agents direct, structured access to your local service state.

### Available tools

| Tool | Description |
|---|---|
| `list_running_ports` | Returns all TCP processes listening on ports 3000–9000 |
| `get_port_info` | Deep info for a specific port: PID, user, memory, uptime, command |
| `kill_port` | Sends SIGTERM to the process on a given port |

### Compatible agents

Any MCP-compatible client works: Claude Desktop, Claude Code, Cursor, and any client implementing MCP over stdio.

### Setup

See [MCP.md](MCP.md) for installation instructions and configuration examples.

---

## Privacy

Sonar is local-first by design:
- No account required
- No telemetry or crash reporting
- No cloud sync
- Port data and terminal output never leave your machine
- The MCP server exposes data only to clients you explicitly configure
