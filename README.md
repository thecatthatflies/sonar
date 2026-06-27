# Sonar

**The developer browser built for local services.**

Sonar is a cross-platform desktop app that auto-discovers every port and service running on your machine, provides an embedded browser, native terminal, network inspector, and a full MCP server for AI agents — all in one window.

![Sonar](https://raw.githubusercontent.com/thecatthatflies/sonar/main/landing/dist/screenshots/app-browser2.png)

---

## Features

| Feature | Description |
|---|---|
| **Port monitor** | Real-time discovery of every service on ports 3000–9000. Process names, PIDs, protocols, memory — at a glance. |
| **Built-in browser** | Click any port to open it in a full browser tab. Type `3000` in the address bar to open `localhost:3000`. |
| **Integrated terminal** | A full terminal lives in the same window. Run commands, restart services, tail logs — no context switch. |
| **DevTools** | Native WebKit inspector for any tab you browse. Save and replay console log sessions. |
| **MCP server** | A bundled MCP server gives AI agents (Claude, Cursor, etc.) direct access to your local service state. |
| **Smart port filter** | Auto-hides system noise (Slack, Spotify, browsers) while surfacing your dev services. |
| **Local-first** | No account, no telemetry, no cloud sync. All data stays on your machine. |

---

## Download

**[→ Download the latest release](https://github.com/thecatthatflies/sonar/releases/latest)**

| Platform | Architecture | Link |
|---|---|---|
| macOS | Apple Silicon | [Sonar_aarch64.dmg](https://github.com/thecatthatflies/sonar/releases/latest/download/Sonar_aarch64.dmg) |
| macOS | Intel | [Sonar_x64.dmg](https://github.com/thecatthatflies/sonar/releases/latest/download/Sonar_x64.dmg) |
| Linux | x86_64 | [Sonar_x86_64.AppImage](https://github.com/thecatthatflies/sonar/releases/latest/download/Sonar_x86_64.AppImage) |
| Linux | ARM64 | [Sonar_aarch64.AppImage](https://github.com/thecatthatflies/sonar/releases/latest/download/Sonar_aarch64.AppImage) |
| Windows | — | Coming soon |

---

## Quick Start

### macOS

1. Download `Sonar_aarch64.dmg` (Apple Silicon) or `Sonar_x64.dmg` (Intel)
2. Open the `.dmg` and drag Sonar to `/Applications`
3. Launch Sonar from your Applications folder
4. If macOS blocks the app: **System Settings → Privacy & Security → Open Anyway**

### Linux

1. Download the `.AppImage` for your architecture
2. Make it executable:
   ```bash
   chmod +x Sonar_x86_64.AppImage
   ```
3. Run it:
   ```bash
   ./Sonar_x86_64.AppImage
   ```

---

## MCP Server

Sonar ships a bundled MCP server that lets AI agents discover, inspect, and kill your local services.

### Quick setup for Claude Code

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

### Quick setup for Claude Desktop

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

Restart your AI client after saving. The tools `list_running_ports`, `get_port_info`, and `kill_port` will appear automatically.

**[→ Full MCP documentation](MCP.md)** · [Web docs](https://sonardocs.aiyan.tech/mcp)

---

## Documentation

**Web docs:** [sonardocs.aiyan.tech](https://sonardocs.aiyan.tech)

| Doc | Description |
|---|---|
| [INSTALLATION.md](INSTALLATION.md) | Step-by-step install guides for macOS and Linux |
| [FEATURES.md](FEATURES.md) | Every feature in detail |
| [MCP.md](MCP.md) | MCP server reference and integration examples |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Common issues and fixes |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to build and contribute |

---

## Support

- **Bug reports:** [GitHub Issues](https://github.com/thecatthatflies/sonar/issues/new?template=bug_report.md)
- **Feature requests:** [GitHub Discussions](https://github.com/thecatthatflies/sonar/discussions/new?category=ideas)
- **Source code:** [github.com/thecatthatflies/sonar](https://github.com/thecatthatflies/sonar)

---

## License

[MIT](LICENSE)
