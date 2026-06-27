# Contributing

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Rust | stable | [rustup.rs](https://rustup.rs) |
| Go | 1.21+ | [go.dev/dl](https://go.dev/dl) |
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| pnpm | 8+ | `npm i -g pnpm` |
| Tauri CLI | v2 | `cargo install tauri-cli` |

macOS also needs Xcode Command Line Tools:
```bash
xcode-select --install
```

Linux also needs WebKit2GTK:
```bash
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev  # Debian/Ubuntu
sudo dnf install webkit2gtk4.1-devel gtk3-devel       # Fedora
```

---

## Clone and install

```bash
git clone https://github.com/thecatthatflies/sonar.git
cd sonar
pnpm install
```

---

## Development

Start the app in dev mode with hot reload:

```bash
pnpm tauri dev
```

This starts:
- Vite dev server for the React frontend (port 1420)
- Tauri wrapper watching for Rust changes
- Go backend via sidecar (auto-compiled on first run)

---

## Building

### Build Go binaries

```bash
cd src-tauri/src/go
./build.sh
```

Compiles:
- `port-scanner` — HTTP API server, bundled as a Tauri sidecar
- `mcp-server-<arch>` — MCP stdio server

Output goes to `src-tauri/binaries/`.

### Build the full app

```bash
pnpm tauri build
```

Output:
- macOS: `src-tauri/target/release/bundle/dmg/Sonar_*.dmg`
- Linux: `src-tauri/target/release/bundle/appimage/Sonar_*.AppImage`

---

## Project structure

```
sonar/
├── src/                    # React frontend
│   ├── App.tsx
│   ├── types.ts
│   └── theme.ts
├── src-tauri/              # Rust + Tauri shell
│   ├── src/
│   │   ├── lib.rs          # Tauri command handlers
│   │   └── go/             # Go backend source
│   │       ├── main.go     # HTTP scanner server
│   │       ├── scanner/    # Port scanning logic
│   │       └── mcp/        # MCP server
│   ├── binaries/           # Compiled Go binaries (gitignored)
│   └── tauri.conf.json
├── landing/                # Landing page (separate Vite project)
│   └── src/
│       └── pages/
└── docs/                   # Docs site (Vite + Markdown)
    └── content/            # Markdown source files
```

---

## Architecture

```
┌─────────────────────────────────────────┐
│  Sonar window (Tauri / WebKit)          │
│  ┌─────────────────────────────────┐   │
│  │  React UI (Vite)                │   │
│  │  - Sidebar (ports)              │   │
│  │  - BrowserArea (child webviews) │   │
│  │  - Terminal (PTY)               │   │
│  └─────────────┬───────────────────┘   │
│                │ Tauri IPC invoke()     │
│  ┌─────────────▼───────────────────┐   │
│  │  Rust (Tauri lib.rs)            │   │
│  │  - Command handlers             │   │
│  │  - WebviewWindow management     │   │
│  └─────────────┬───────────────────┘   │
└────────────────┼────────────────────────┘
                 │ HTTP :5757
        ┌────────▼────────┐   stdio
        │  Go sidecar     │◄──────── AI agents
        │  port-scanner   │          (MCP server)
        └─────────────────┘
```

- **React** renders in Tauri's main WebView
- **Rust** bridges native OS APIs and manages child WebView windows for each browser tab
- **Go sidecar** runs as a separate process — the scanner polls `lsof`/`/proc/net/tcp` and exposes results via HTTP; the MCP binary is separate and invoked by AI clients directly

---

## Submitting changes

1. Fork the repo
2. Create a branch: `git checkout -b fix/my-fix` or `feature/my-feature`
3. Make your changes
4. Test with `pnpm tauri dev`
5. Open a pull request against `main`

### Guidelines

- One feature or fix per PR — keep them focused
- Test on macOS (primary platform) if you can
- For scanner changes, benchmark scan time before and after
- Include a screenshot in the PR description for UI changes
- Keep commit messages clear: what changed and why

---

## Reporting bugs

[Open a GitHub issue](https://github.com/thecatthatflies/sonar/issues/new?template=bug_report.md) with reproduction steps, OS/version, and logs from **⋮ → Console** if relevant.
