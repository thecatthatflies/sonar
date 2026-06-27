# Sonar

The browser built for developers. No more typing `localhost:` — just hit the port number and go.

![platform](https://img.shields.io/badge/platform-macOS-blue) ![Tauri](https://img.shields.io/badge/built%20with-Tauri%202-orange)

---

## What is Sonar?

Sonar is a native macOS desktop app that replaces the browser tab you always have open for local dev. It auto-discovers every service running on your machine (ports 3000–9000), shows them in a sidebar, and lets you open, inspect, and kill them — without leaving your dev environment.

It's a full browser (WebKit), terminal emulator, port manager, DevTools console, and MCP server — in one compact window.

---

## Features

### Smart Port Discovery
A background Go scanner polls `lsof` every 3 seconds. Every TCP port in range 3000–9000 surfaces in the sidebar automatically. Noise (Discord, Slack, Spotify, Steam, Chrome, etc.) is filtered out — only your servers show.

- **New port glow** — pulses green for 4s when first detected
- **Graceful fadeout** — disconnected ports stay visible for 10s before disappearing
- **Process info** — process name and PID shown inline on each card

### Address Bar (smarter than Chrome)
The address bar accepts everything:

| What you type | Where it goes |
|---|---|
| `3000` | `http://localhost:3000` |
| `5173` | `http://localhost:5173` |
| `localhost:8080/api` | `http://localhost:8080/api` |
| `github.com` | `https://github.com` |
| `https://example.com` | `https://example.com` |
| `192.168.1.100:4000` | `http://192.168.1.100:4000` |
| `what is a TCP handshake` | `https://duckduckgo.com/?q=what+is+a+TCP+handshake` |

Anything that isn't a recognizable URL or port → DuckDuckGo. `Enter` to navigate, `Escape` to cancel.

### Multi-Tab Browser
- Click a port in sidebar → opens tab for that port
- Multiple tabs open simultaneously
- Page titles auto-update from `<title>` tags
- Favicons load from `/favicon.ico`
- Load time shown as `234ms` chip on active tab
- Close tabs with `×` (hover to reveal) or context menu

### Port Context Menu
Right-click any port card (or click `⋮`):
- **Open in new tab** — opens in browser tab
- **Copy URL** — copies `http://localhost:PORT`
- **Kill port** — SIGTERM with confirmation dialog
- **Show details** — PID, user, elapsed time, RSS memory, open FDs, full command line
- **Hide** — hides process from sidebar (persisted across restarts)

### Port Filtering
Auto-hides known noise: Discord, Slack, Telegram, Signal, Spotify, Steam, Chrome, Firefox, Zoom, Teams, Dropbox, and 30+ more.

Auto-shows dev tools: node, python, ruby, go, rust, vite, webpack, esbuild, deno, bun, redis, postgres, mysql, nginx, caddy, and others.

Override either direction:
- **Hide** on any card → that process stays hidden
- **Allow** in "Show all" mode → permanently visible even if it matches the auto-block list

Preferences persist in `localStorage`.

### Built-in Terminal
Full `sh` terminal inside the Terminal tab:
- Command history (`↑`/`↓`)
- Kill with `Ctrl+C` or the Kill button
- Color-coded stdout vs stderr
- Exit code display per command

### DevTools
Access via `⋮` menu (top right):

- **Inspect page** — native WebKit inspector (Safari Web Inspector) for the active tab
- **Console** — toggles Sonar's log drawer
- **Inspect Sonar** — inspector for Sonar's own React shell
- **Reload Sonar** — full app reload

### Console / Log Drawer
Slides up from the bottom (drag handle to resize 120–680px).

**Auto-logged events:**
- Port detected / port gone
- Page loaded with status + load time
- Page load errors
- Webview lifecycle events

**Smart behavior:**
- **Deduplication** — identical messages within 800ms collapse into `×N` badges
- **Time gaps** — gaps >1s show `+4.2s` divider
- **URL detection** — URLs in messages are clickable, open in a new Sonar tab
- **Level filtering** — toggle Debug / Info / Warn / Error with live counts

**Save sessions:** Click 💾 to save current logs to localStorage. Load any saved session in the **Saved** tab. Switch back to live with `← live`.

### MCP Server
Sonar bundles an MCP (Model Context Protocol) server exposing your local dev environment to AI assistants.

| Tool | Description |
|---|---|
| `list_running_ports` | All processes on ports 3000–9000 with PID, name, protocol |
| `get_port_info` | Deep info: elapsed time, user, RSS, open FDs, command line |
| `kill_port` | SIGTERM to process on given port |

See [docs/mcp.md](docs/mcp.md) for setup.

---

## Easter Eggs & Hidden Tricks

**Type just a number** — `3000`, `5173`, `8080` → `localhost:PORT`. No prefix needed.

**Type a bare domain** — `github.com`, `docs.rs` → Sonar prepends `https://`.

**Type anything else** → DuckDuckGo search.

**Right-click any port card** → full context menu without finding `⋮`.

**Drag the console handle** → resize from 120px to 680px.

**Port 5757** — Sonar's scanner is a real HTTP API:
- `GET localhost:5757/api/ports` → JSON of all ports
- `GET localhost:5757/api/info?port=3000` → deep process info
- `POST localhost:5757/api/kill` `{"port": 3000}` → kill it

**Filter override** — if a legitimate dev server is filtered, "Show all" → **Allow** to whitelist permanently.

**Keyboard shortcuts:**
- `Enter` in address bar → navigate
- `Escape` in address bar → cancel
- `Ctrl+C` in terminal → kill process
- `↑` / `↓` in terminal → command history

---

## Architecture

```
sonar/
├── src/                        # React (Vite + TypeScript + MUI)
│   ├── App.tsx                 # Root — state, layout, tab management
│   ├── components/
│   │   ├── TopBar.tsx          # Address bar, nav, brand, DevTools menu
│   │   ├── Sidebar.tsx         # Port list + filter controls
│   │   ├── PortCard.tsx        # Port card + context menu trigger
│   │   ├── PortContextMenu.tsx # Right-click menu
│   │   ├── PortDetailsModal.tsx# Process detail modal
│   │   ├── BrowserArea.tsx     # Tab strip + webview management
│   │   ├── TerminalTab.tsx     # Shell terminal
│   │   ├── LogsDrawer.tsx      # Console panel + saved sessions
│   │   └── DevToolsMenu.tsx    # ⋮ dropdown
│   ├── lib/
│   │   ├── logger.tsx          # Log context (dedup, save/load sessions)
│   │   ├── portFilter.ts       # Auto-hide/show logic + localStorage
│   │   └── toast.tsx           # Toast notification system
│   └── theme.ts                # MUI theme (light + dark, Lora font)
│
├── src-tauri/
│   ├── src/lib.rs              # Rust IPC: navigate, reload, back, forward,
│   │                           # devtools, eval, URL polling
│   └── src/go/
│       ├── cmd/port-scanner/   # HTTP server on :5757
│       │   └── main.go         # /api/ports  /api/kill  /api/info
│       ├── cmd/mcp-server/     # MCP stdio server (JSON-RPC 2.0)
│       │   ├── main.go
│       │   └── tools.go
│       └── internal/scanner/
│           └── scanner.go      # lsof → PortInfo[]
```

**Data flow:**
1. Go scanner (`lsof -nP -iTCP -sTCP:LISTEN`) → `/api/ports`
2. Sidebar polls every 3s → tracks new/gone ports
3. User clicks port → `openPort()` → new tab
4. BrowserArea creates Tauri child `Webview` over a placeholder `<div>`
5. URL polling (`browser_url` Rust command) detects navigation → updates address bar
6. `fetchPageMeta` fetches HTML, parses `<title>` → updates tab label

---

## Running

```bash
# Terminal 1 — port scanner
./src-tauri/binaries/port-scanner-aarch64-apple-darwin

# Terminal 2 — dev
pnpm tauri dev

# Build
pnpm tauri build
```

---

## Further Reading

- [docs/address-bar.md](docs/address-bar.md) — address bar behavior in depth
- [docs/devtools.md](docs/devtools.md) — console, inspector, debugging
- [docs/mcp.md](docs/mcp.md) — MCP server setup and Claude integration
- [docs/port-filter.md](docs/port-filter.md) — filter system internals
