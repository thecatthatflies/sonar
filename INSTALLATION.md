# Installation

## macOS

### Download

Get the latest release from [GitHub Releases](https://github.com/thecatthatflies/sonar/releases/latest):

| Architecture | File |
|---|---|
| Apple Silicon (M1/M2/M3/M4) | `Sonar_aarch64.dmg` |
| Intel | `Sonar_x64.dmg` |

**Which chip do you have?** Apple menu → **About This Mac**. Look for "Apple M" (Silicon) or "Intel".

### Install steps

1. Open the downloaded `.dmg`
2. Drag **Sonar** to `/Applications`
3. Eject the disk image
4. Open Sonar from Applications or Spotlight

### Gatekeeper bypass

macOS may block the app on first launch because Sonar is not signed with an Apple Developer certificate. To open it:

**Option A — Settings:**
1. Go to **System Settings → Privacy & Security**
2. Scroll to the Security section
3. Click **Open Anyway** next to the Sonar entry

**Option B — Right-click:**
1. Right-click Sonar.app in Finder
2. Select **Open**
3. Click **Open** in the confirmation dialog

This is a one-time prompt. You can review the source code at [github.com/thecatthatflies/sonar](https://github.com/thecatthatflies/sonar).

---

## Linux

### Download

Get the `.AppImage` from [GitHub Releases](https://github.com/thecatthatflies/sonar/releases/latest):

| Architecture | File |
|---|---|
| x86_64 | `Sonar_x86_64.AppImage` |
| ARM64 | `Sonar_aarch64.AppImage` |

### Install steps

```bash
# Make executable
chmod +x Sonar_x86_64.AppImage

# Run directly
./Sonar_x86_64.AppImage

# Or install system-wide
sudo mv Sonar_x86_64.AppImage /usr/local/bin/sonar
sonar
```

### Dependencies

Sonar requires WebKit2GTK. On most modern desktop Linux distributions this is already present. If you see errors about missing libraries:

```bash
# Ubuntu / Debian
sudo apt install libwebkit2gtk-4.1-0 libgtk-3-0 libayatana-appindicator3-1

# Fedora
sudo dnf install webkit2gtk4.1 gtk3
```

Sonar also uses `lsof` for port scanning. Install it if missing:

```bash
# Ubuntu / Debian
sudo apt install lsof

# Fedora
sudo dnf install lsof
```

---

## System Requirements

| | Requirement |
|---|---|
| **macOS** | 12 Monterey or later |
| **Linux** | Any modern desktop distribution with WebKit2GTK |
| **RAM** | 256 MB minimum |
| **Disk** | 50 MB |

---

## Updating

Sonar does not auto-update. Check [GitHub Releases](https://github.com/thecatthatflies/sonar/releases) and repeat the install steps when a new version is available.

---

## Uninstalling

**macOS:**
```bash
# Remove app
rm -rf /Applications/Sonar.app

# Remove settings (optional)
rm -rf ~/Library/Application\ Support/Sonar
```

**Linux:**
```bash
# Remove the AppImage (wherever you placed it)
rm /usr/local/bin/sonar

# Remove settings (optional)
rm -rf ~/.config/Sonar
```

---

## Troubleshooting installation

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues.
