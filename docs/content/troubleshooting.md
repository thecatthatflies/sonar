---
title: Troubleshooting
slug: troubleshooting
order: 6
description: Common issues and fixes for Sonar.
---

# Troubleshooting

## Sonar won't open on macOS

**Symptom:** "Sonar cannot be opened because it is from an unidentified developer"

**Fix:**
1. **System Settings → Privacy & Security**
2. Scroll to the Security section
3. Click **Open Anyway**

If that doesn't appear, try right-clicking the app and selecting **Open**, then click **Open** in the dialog.

---

## No ports showing in the sidebar

**Possible causes:**

### `lsof` not installed (Linux)
Sonar uses `lsof` as its primary scanner. Install it:
```bash
# Ubuntu / Debian
sudo apt install lsof

# Fedora
sudo dnf install lsof
```

### Ports outside the scan range
Sonar scans **3000–9000** only. Ports outside this range won't appear. For a port outside that range, type the full `localhost:PORT` in the address bar to browse it.

### Process is auto-hidden
Sonar auto-hides known system processes. Click **Show all ports** at the bottom of the sidebar to see everything. Dimmed entries are filtered. Click **Allow** to permanently un-hide one.

### Scanner exclusion
Port **5757** is always excluded (Sonar's own backend). This is intentional.

---

## Port shows wrong process name

Sonar reads process info from `lsof` and `/proc/net/tcp`. The name shown is the OS-reported process name. If it shows `node` instead of `next`, that's because Next.js runs on Node.js — the underlying process is `node`.

---

## Built-in browser shows blank page

**Check:**
- Is the service actually running? Look for it in the port sidebar.
- Try typing the URL manually in the address bar (e.g., `localhost:3000`)
- Open DevTools: **⋮ → Inspect page** to see network errors

If the page loads in your regular browser but not in Sonar, the service may be binding to a specific interface (e.g., `127.0.0.1` vs `0.0.0.0`). Try the explicit `http://127.0.0.1:PORT` form.

---

## DevTools (Inspect page) is grayed out

The WebKit inspector only works on browser tabs. If you're on the Terminal tab, switch to a port tab first.

On macOS, also verify **Safari → Settings → Advanced → Show features for web developers** is enabled. Sonar uses Safari's WebKit inspector.

---

## Terminal isn't working

Sonar's terminal uses your system shell (`$SHELL`). If it shows a blank or error:

1. Verify `$SHELL` is set: `echo $SHELL` in your regular terminal
2. Check that your shell exists at that path
3. Try reloading Sonar: **⋮ → Reload Sonar**

---

## MCP server not connecting

**Claude Code:** Verify your `.mcp.json` has `"type": "stdio"` and the path to the binary is correct:

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

Confirm the binary exists:
```bash
ls /Applications/Sonar.app/Contents/MacOS/mcp-server-*
```

**Claude Desktop:** Restart Claude Desktop after editing the config file. Changes are not picked up live.

---

## Port filter shows too many / too few ports

See the [Port Filter](port-filter) doc for the full list of auto-shown and auto-hidden processes, and how to override them.

To reset all filter overrides:
```js
localStorage.removeItem('sonar:filter:hidden');
localStorage.removeItem('sonar:filter:allowed');
```
Run this in **⋮ → Console** (JS REPL), then reload Sonar.

---

## Saved log sessions missing

Log sessions are stored in `localStorage` under keys matching `sonar:logs:*`. They persist across restarts but are stored per-device. Clearing browser storage in Sonar's own inspector will delete them.

---

## App is slow or unresponsive

Sonar polls ports every ~2 seconds. On machines with thousands of open connections, this can be slow. The `lsof` scanner is fastest — ensure it's installed (see above).

If the UI freezes: **⋮ → Reload Sonar** performs a full app reload without restarting the process.

---

## Still stuck?

[Open a GitHub issue](https://github.com/thecatthatflies/sonar/issues/new) with:
- Your OS and version
- Sonar version (visible in the window title bar)
- What you expected vs. what happened
- Any error messages from **⋮ → Console**
