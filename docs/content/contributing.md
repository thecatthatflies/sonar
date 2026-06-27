---
title: Contributing
slug: contributing
order: 7
description: How to build Sonar from source and contribute.
---

# Contributing

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Rust | stable | [rustup.rs](https://rustup.rs) |
| Go | 1.21+ | [go.dev](https://go.dev/dl) |
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| pnpm | 8+ | `npm i -g pnpm` |
| Tauri CLI | v2 | `cargo install tauri-cli` |

macOS also needs Xcode Command Line Tools:
```bash
xcode-select --install
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

Run the app in development mode (hot-reload enabled):

```bash
pnpm tauri dev
```

This starts:
- Vite dev server for the React frontend
- Tauri shell watching for Rust changes
- Go backend via sidecar (auto-compiled)

---

## Building

### Build the Go binaries

```bash
cd src-tauri/src/go
./build.sh
```

This compiles:
- `port-scanner` — HTTP scan server, sidecar bundled in the app
- `mcp-server-<arch>` — MCP stdio server

Output goes to `src-tauri/binaries/`.

### Build the full app

```bash
pnpm tauri build
```

Outputs a `.dmg` (macOS) or `.AppImage` (Linux) in `src-tauri/target/release/bundle/`.

---

## Project structure

```
sonar/
├── src/              # React frontend (Vite)
│   ├── App.tsx
│   └── components/
├── src-tauri/        # Tauri + Rust shell
│   ├── src/
│   │   ├── lib.rs    # Tauri commands
│   │   └── go/       # Go backend source
│   │       ├── main.go
│   │       ├── scanner/
│   │       └── mcp/
│   └── binaries/     # Compiled Go binaries (gitignored)
├── landing/          # Landing page (Vite + React)
└── docs/             # Documentation site (Vite + React + Markdown)
```

---

## Architecture

- **React frontend** — rendered in Tauri's main webview
- **Rust (Tauri)** — native window, IPC bridge, child webview management
- **Go sidecar** — port scanner HTTP server on `localhost:5757`, MCP server
- **Child webviews** — each browser tab is a separate `WebviewWindow`

The Go scanner runs as a sidecar process (`port-scanner`). Sonar's Rust layer polls it via HTTP. The MCP binary (`mcp-server-*`) is a separate self-contained process invoked by AI clients.

---

## Making changes

1. Fork the repo on GitHub
2. Create a branch: `git checkout -b feature/my-change`
3. Make your changes
4. Test with `pnpm tauri dev`
5. Open a pull request against `main`

### Guidelines

- Keep PRs focused — one feature or fix per PR
- Test on macOS if possible (primary platform)
- The Go scanner is performance-sensitive — benchmark scan time if you change it
- UI changes: screenshot before/after in the PR description

---

## Reporting bugs

Use [GitHub Issues](https://github.com/thecatthatflies/sonar/issues/new?template=bug_report.md).

Include:
- OS and version
- Steps to reproduce
- Expected vs. actual behavior
- Logs from **⋮ → Console** if relevant
