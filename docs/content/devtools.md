---
title: DevTools
slug: devtools
order: 4
description: Inspect pages, view logs, and debug with Sonar's built-in DevTools.
---

# DevTools

Sonar ships two layers of DevTools: a native WebKit inspector for pages you browse, and a built-in console for Sonar's own internals.

## Accessing DevTools

Click the `⋮` button in the top-right of the toolbar. The menu has four options:

| Option | What it does |
|---|---|
| **Inspect page** | Opens WebKit inspector for the active browser tab |
| **Console** | Toggles the log drawer at the bottom |
| **Inspect Sonar** | Opens inspector for Sonar's React shell |
| **Reload Sonar** | Full app reload (useful after config changes) |

---

## Inspect Page

Opens Safari Web Inspector attached to the child WebView for the active port tab. You get:
- **Elements** — full DOM inspector with live editing
- **Network** — all XHR, fetch, WebSocket, and resource requests
- **Console** — JS console with REPL
- **Sources** — source maps, breakpoints, step debugger
- **Timelines** — rendering performance

This uses `webview.open_devtools()` in Rust, which triggers the native WKWebView inspector. On macOS this requires **Safari → Develop menu** to be enabled (Settings → Advanced → Show Develop menu).

The inspector is only enabled when a browser tab (not terminal) is active. If the option is grayed out, switch to a port tab first.

---

## Console (Log Drawer)

The Console panel slides up from the bottom of the window.

### Resize
Drag the top edge of the drawer to resize it between 120px and 680px tall.

### Log Levels

| Badge | Level | Color | Used for |
|---|---|---|---|
| `DBG` | debug | gray | Webview lifecycle, internal state |
| `INF` | info | blue | Port detected, page loaded successfully |
| `WRN` | warn | amber | Port gone, page returned error status |
| `ERR` | error | red | Page failed to load, connection errors |

Click any level badge to toggle it. At least one must remain active.

### Smart Features

**Deduplication** — if the same message (same level + source + text) fires within 800ms, it's collapsed into a single row with a `×N` repeat badge. Prevents log floods from polling loops.

**Time gap indicators** — when more than 1 second passes between consecutive log entries, a `+4.2s` ruler appears between them. Helps correlate timing during debugging.

**Clickable URLs** — any `http://` or `https://` URL in a log message becomes a clickable link that opens in a new Sonar tab.

### Log Sources

| Source | Emitted by | Examples |
|---|---|---|
| `scanner` | Sidebar port polling | Port 3000 detected — node, Port 5173 gone |
| `navigator` | BrowserArea fetch | `200 http://localhost:3000 — 124ms — "My App"` |
| `webview` | BrowserArea webview init | Webview created — browser-3000 @ http://localhost:3000 |
| `sonar` | Default fallback | General app events |

### Auto-scroll
The blue `↓` button toggles auto-scroll. When on, the console scrolls to new entries as they arrive. Click it to pause (useful when reviewing older entries).

### Clear
The trash button clears all current log entries. Does not affect saved sessions.

---

## Save Sessions

The 💾 button saves the current console session to `localStorage`.

**Save dialog:**
- Optional name (auto-generates `"Session — Jan 15, 02:32"` if left blank)
- Shows how many entries will be saved
- Press `Enter` or click Save

**Saved tab:**
Lists all saved sessions with:
- Session name
- Entry count
- Date
- `→` to load and view
- `🗑` to delete

**Viewing a saved session:**
Click `→` on any session — the Console tab switches to show that session's logs with the same filtering/display. A banner shows you're in a saved session. Click `← live` to return to the real-time console.

Sessions survive app restarts. They're stored under the key pattern `sonar:logs:TIMESTAMP` in `localStorage`.

---

## Inspect Sonar

Opens the WebKit inspector for Sonar's own UI shell (the React frontend). Use this to:
- Debug Sonar's own React component tree
- Inspect MUI theme variables
- Profile Sonar's rendering performance
- Debug event handling (port polling, webview events)

This is equivalent to "right-click → Inspect" on a normal webpage, but for Sonar itself.

---

## Rust IPC Commands

For advanced debugging, Sonar's Rust layer exposes these commands (callable via `invoke()` from the frontend):

| Command | Args | Returns |
|---|---|---|
| `browser_navigate` | `label, url` | `Result<(), String>` |
| `browser_reload` | `label` | `Result<(), String>` |
| `browser_back` | `label` | evals `history.back()` |
| `browser_forward` | `label` | evals `history.forward()` |
| `browser_url` | `label` | Current URL string |
| `browser_eval` | `label, key, js` | Emits `browser-eval-result` event |
| `browser_devtools` | `label` | Opens inspector on child webview |
| `open_devtools` | — | Opens inspector on main window |

`label` is always `browser-PORT` (e.g., `browser-3000`).
