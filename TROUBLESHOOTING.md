# Troubleshooting

## Sonar won't open on macOS

**Symptom:** "Sonar cannot be opened because it is from an unidentified developer"

Sonar is not signed with an Apple Developer certificate. To bypass Gatekeeper:

**Option A:**
1. **System Settings → Privacy & Security**
2. Scroll to Security section
3. Click **Open Anyway** next to Sonar

**Option B:**
1. Right-click `Sonar.app` in Finder
2. Select **Open**
3. Click **Open** in the confirmation dialog

---

## No ports showing in the sidebar

### `lsof` not installed (Linux)

Sonar's primary scanner uses `lsof`. Install it:
```bash
# Ubuntu / Debian
sudo apt install lsof

# Fedora
sudo dnf install lsof
```

### Port is outside the scan range

Sonar scans **ports 3000–9000**. Services outside this range won't appear automatically. To browse them, type the full URL in the address bar: `localhost:1234`.

### Process is auto-hidden

Sonar auto-hides known non-dev processes. Click **Show all ports** in the sidebar to see everything. Dimmed entries are filtered. Click **Allow** to permanently un-hide one.

---

## Port shows wrong process name

The name shown is the OS-reported process name from `lsof`. If it shows `node` instead of `next` or `vite`, that's because those tools run on Node.js — the OS sees the underlying `node` process. This is expected behavior.

---

## Built-in browser shows a blank page

1. Verify the service is running — check the port sidebar
2. Try navigating manually: type `localhost:3000` in the address bar
3. Open **⋮ → Inspect page** to see network errors in the Console

If the page loads in your regular browser but not Sonar, the service may bind to `127.0.0.1` specifically. Try `http://127.0.0.1:PORT` in the address bar.

---

## DevTools (Inspect page) is grayed out

The WebKit inspector only attaches to browser tabs. If you're viewing the Terminal tab, switch to a port tab first.

On macOS, also ensure **Safari → Settings → Advanced → Show features for web developers** is enabled.

---

## Terminal shows a blank or error

Sonar uses `$SHELL` for the terminal. If it's blank:

1. Check your shell path: `echo $SHELL` in a regular terminal
2. Verify the shell binary exists at that path
3. Try **⋮ → Reload Sonar**

---

## MCP server not connecting

**Verify the binary path exists:**
```bash
ls /Applications/Sonar.app/Contents/MacOS/mcp-server-*
```

**Claude Code** — ensure `.mcp.json` includes `"type": "stdio"`:
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

**Claude Desktop** — restart the app after editing the config. Changes are not live-reloaded.

See [MCP.md](MCP.md) for full setup instructions.

---

## Port filter showing too many or too few ports

See [FEATURES.md](FEATURES.md) for the full auto-hidden and auto-shown process lists.

To reset all filter overrides, open **⋮ → Console** and run:
```js
localStorage.removeItem('sonar:filter:hidden');
localStorage.removeItem('sonar:filter:allowed');
```
Then reload Sonar (**⋮ → Reload Sonar**).

---

## App is slow or unresponsive

Sonar polls ports every ~2 seconds. On machines with many open connections, install `lsof` if not present — it's significantly faster than the fallback TCP dial scanner.

If the UI freezes, **⋮ → Reload Sonar** reloads the frontend without restarting the backend.

---

## Saved log sessions are missing

Log sessions are stored in `localStorage`. They are per-device and per-app-instance. Clearing Sonar's local storage (via Inspect Sonar) removes them permanently.

---

## Still stuck?

[Open a GitHub issue](https://github.com/thecatthatflies/sonar/issues/new) with:
- Your OS and version
- Sonar version
- What you expected vs. what happened
- Error messages from **⋮ → Console**
