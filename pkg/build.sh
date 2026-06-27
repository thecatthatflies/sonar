#!/usr/bin/env bash
# Sonar release build script
# Usage: bash pkg/build.sh
# Detects current platform and produces release artifacts in pkg/{macos,linux,windows}/
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ICONS_SRC="$ROOT/src-tauri/icons"

# Read version from Cargo.toml
VERSION=$(grep '^version' "$ROOT/src-tauri/Cargo.toml" | head -1 | sed 's/version = "//;s/"//')
echo "==> Building Sonar v${VERSION}"
echo ""

# ── Prerequisites check ───────────────────────────────────────────────────────
need() { command -v "$1" &>/dev/null || { echo "ERROR: '$1' not found. Install it and retry."; exit 1; }; }
need pnpm
need cargo
need go

# ── Build Go sidecars ─────────────────────────────────────────────────────────
echo "==> Building Go sidecars..."
cd "$ROOT/src-tauri/src/go"
bash build.sh
cd "$ROOT"

# ── Install JS deps + build frontend ─────────────────────────────────────────
echo "==> Installing dependencies..."
pnpm install --frozen-lockfile

echo "==> Building frontend..."
pnpm build

# ── Platform detection + Tauri build ─────────────────────────────────────────
OS="$(uname -s)"

case "$OS" in
  Darwin)
    PLATFORM="macos"
    OUT_DIR="$SCRIPT_DIR/macos"
    mkdir -p "$OUT_DIR"

    echo "==> Building macOS release..."
    pnpm tauri build

    BUNDLE_ROOT="$ROOT/src-tauri/target/release/bundle"

    # Copy .dmg
    DMG=$(find "$BUNDLE_ROOT/dmg" -name "*.dmg" 2>/dev/null | head -1)
    if [[ -n "$DMG" ]]; then
      cp "$DMG" "$OUT_DIR/Sonar-${VERSION}.dmg"
      echo "    → $OUT_DIR/Sonar-${VERSION}.dmg"
    fi

    # Copy .app (zipped for distribution)
    APP=$(find "$BUNDLE_ROOT/macos" -name "*.app" -maxdepth 1 2>/dev/null | head -1)
    if [[ -n "$APP" ]]; then
      ditto -c -k --sequesterRsrc --keepParent "$APP" "$OUT_DIR/Sonar-${VERSION}.app.zip"
      echo "    → $OUT_DIR/Sonar-${VERSION}.app.zip"
    fi

    echo ""
    echo "macOS build complete. Files in pkg/macos/"
    ;;

  Linux)
    PLATFORM="linux"
    OUT_DIR="$SCRIPT_DIR/linux"
    mkdir -p "$OUT_DIR"

    echo "==> Building Linux release..."
    pnpm tauri build

    BUNDLE_ROOT="$ROOT/src-tauri/target/release/bundle"

    # AppImage
    APPIMAGE=$(find "$BUNDLE_ROOT/appimage" -name "*.AppImage" 2>/dev/null | head -1)
    if [[ -n "$APPIMAGE" ]]; then
      cp "$APPIMAGE" "$OUT_DIR/Sonar-${VERSION}.AppImage"
      chmod +x "$OUT_DIR/Sonar-${VERSION}.AppImage"
      echo "    → $OUT_DIR/Sonar-${VERSION}.AppImage"
    fi

    # .deb package
    DEB=$(find "$BUNDLE_ROOT/deb" -name "*.deb" 2>/dev/null | head -1)
    if [[ -n "$DEB" ]]; then
      cp "$DEB" "$OUT_DIR/Sonar-${VERSION}.deb"
      echo "    → $OUT_DIR/Sonar-${VERSION}.deb"
    fi

    # .rpm package
    RPM=$(find "$BUNDLE_ROOT/rpm" -name "*.rpm" 2>/dev/null | head -1)
    if [[ -n "$RPM" ]]; then
      cp "$RPM" "$OUT_DIR/Sonar-${VERSION}.rpm"
      echo "    → $OUT_DIR/Sonar-${VERSION}.rpm"
    fi

    # Install Linux icons to hicolor structure (for system integration)
    HICOLOR_SRC="$SCRIPT_DIR/linux/icons/hicolor"
    if [[ -d "$HICOLOR_SRC" ]]; then
      echo "    Hicolor icons available in pkg/linux/icons/hicolor/"
    fi

    echo ""
    echo "Linux build complete. Files in pkg/linux/"
    ;;

  MINGW*|MSYS*|CYGWIN*)
    PLATFORM="windows"
    OUT_DIR="$SCRIPT_DIR/windows"
    mkdir -p "$OUT_DIR"

    echo "==> Building Windows release..."
    pnpm tauri build

    BUNDLE_ROOT="$ROOT/src-tauri/target/release/bundle"

    # NSIS installer (.exe)
    NSIS=$(find "$BUNDLE_ROOT/nsis" -name "*.exe" 2>/dev/null | head -1)
    if [[ -n "$NSIS" ]]; then
      cp "$NSIS" "$OUT_DIR/Sonar-${VERSION}-setup.exe"
      echo "    → $OUT_DIR/Sonar-${VERSION}-setup.exe"
    fi

    # MSI installer
    MSI=$(find "$BUNDLE_ROOT/msi" -name "*.msi" 2>/dev/null | head -1)
    if [[ -n "$MSI" ]]; then
      cp "$MSI" "$OUT_DIR/Sonar-${VERSION}.msi"
      echo "    → $OUT_DIR/Sonar-${VERSION}.msi"
    fi

    echo ""
    echo "Windows build complete. Files in pkg/windows/"
    ;;

  *)
    echo "ERROR: Unsupported platform: $OS"
    echo "Supported: macOS (Darwin), Linux, Windows (MINGW/MSYS/CYGWIN)"
    exit 1
    ;;
esac

echo ""
echo "==> Done! Sonar v${VERSION} built for ${PLATFORM}."
echo "    Upload the files in pkg/${PLATFORM}/ to your GitHub release."
