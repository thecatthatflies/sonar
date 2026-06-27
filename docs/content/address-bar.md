---
title: Address Bar
slug: address-bar
order: 2
description: Navigate local ports by number, hostname, URL, or search query.
---

# Address Bar

Sonar's address bar is the fastest way to navigate local services. It understands port numbers, hostnames, full URLs, and plain search queries — no prefix required.

## Input Resolution Order

The `normalize()` function in `TopBar.tsx` resolves input in this order:

### 1. Bare port number (2–5 digits)
```
3000      →  http://localhost:3000
5173      →  http://localhost:5173
8080      →  http://localhost:8080
65535     →  http://localhost:65535
```
Regex: `/^\d{2,5}$/`

Single-digit numbers are not matched (avoids accidental navigation when typing).

### 2. localhost with optional port and path
```
localhost             →  http://localhost
localhost:3000        →  http://localhost:3000
localhost:3000/api/v1 →  http://localhost:3000/api/v1
```
Regex: `/^localhost(:\d+)?(\/.*)?$/`

### 3. Explicit protocol
```
http://localhost:9000         →  (unchanged)
https://staging.example.com   →  (unchanged)
http://192.168.1.1:8080/api   →  (unchanged)
```
Regex: `/^https?:\/\//`

If you type a full URL with protocol it passes through unmodified.

### 4. IP address
```
192.168.1.100          →  http://192.168.1.100
10.0.0.1:8080          →  http://10.0.0.1:8080
10.0.0.1:4000/health   →  http://10.0.0.1:4000/health
```
Regex: `/^\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/.*)?$/`

Useful for accessing services on other machines on the local network.

### 5. Bare domain (has a dot, no spaces)
```
github.com              →  https://github.com
docs.rs                 →  https://docs.rs
npmjs.com/package/vite  →  https://npmjs.com/package/vite
api.example.com:8443    →  https://api.example.com:8443
```
Regex: `/^[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})(:\d+)?(\/.*)?$/`

Sonar assumes `https://` for all bare domains.

### 6. Everything else → DuckDuckGo
```
what is cors               →  https://duckduckgo.com/?q=what+is+cors
react hooks cheatsheet     →  https://duckduckgo.com/?q=react+hooks+cheatsheet
node.js error EADDRINUSE   →  https://duckduckgo.com/?q=node.js+error+EADDRINUSE
```

Anything with spaces, or that doesn't match the patterns above, becomes a search query. The query is `encodeURIComponent`-encoded.

## Keyboard Behavior

| Key | Action |
|---|---|
| `Enter` | Commit and navigate |
| `Escape` | Restore previous URL, blur |
| Click on bar | Focus and select all |
| Focus | Selects all text (10ms delay for WebKit) |

## Address Bar State

The bar displays two different values:

- **Focused** — shows `input` state (what you're typing)
- **Unfocused** — shows `currentUrl` (live URL from the active webview, updated via polling)

When the active tab is the **Terminal**, the bar shows `"Terminal"` and is non-interactive.

## URL Polling

For browser tabs, Sonar polls the current webview URL every 600ms via:
```
invoke('browser_url', { label: 'browser-PORT' })
```

When the URL changes (detected via `prevUrlRef`), the address bar updates and a title/metadata fetch is triggered. This keeps the bar accurate through in-page navigation and redirects.
