---
title: Installation
slug: installation
order: 1
description: Install Sonar on macOS and Linux.
---

# Installation

## macOS

### Download

Get the latest release from [GitHub Releases](https://github.com/thecatthatflies/sonar/releases/latest):

| Architecture | File |
|---|---|
| Apple Silicon (M1/M2/M3/M4) | `Sonar_aarch64.dmg` |
| Intel | `Sonar_x64.dmg` |

Not sure which you have? Apple menu → **About This Mac**. Look for "Apple M" (Silicon) or "Intel" in the chip row.

### Install

1. Open the downloaded `.dmg`
2. Drag **Sonar** into your `/Applications` folder
3. Eject the disk image
4. Launch Sonar from Applications or Spotlight

### Gatekeeper

If macOS shows "Sonar cannot be opened because it is from an unidentified developer":

1. Open **System Settings → Privacy & Security**
2. Scroll to the Security section
3. Click **Open Anyway** next to the Sonar message

This is a one-time prompt. Sonar is not code-signed with an Apple Developer certificate, so macOS flags it. You can inspect the source at [github.com/thecatthatflies/sonar](https://github.com/thecatthatflies/sonar).

---

## Linux

### Download

Get the `.AppImage` for your architecture from [GitHub Releases](https://github.com/thecatthatflies/sonar/releases/latest):

| Architecture | File |
|---|---|
| x86_64 (most desktops/servers) | `Sonar_x86_64.AppImage` |
| ARM64 | `Sonar_aarch64.AppImage` |

### Install

```bash
# Make executable
chmod +x Sonar_x86_64.AppImage

# Run
./Sonar_x86_64.AppImage
```

To run from anywhere, move it to a directory on your PATH:

```bash
sudo mv Sonar_x86_64.AppImage /usr/local/bin/sonar
sonar
```

### AppImage dependencies

Most modern desktop Linux systems work out of the box. If you see errors about missing libraries:

```bash
# Ubuntu / Debian
sudo apt install libwebkit2gtk-4.1-0 libgtk-3-0 libayatana-appindicator3-1

# Fedora
sudo dnf install webkit2gtk4.1 gtk3
```

---

## System Requirements

| | Minimum |
|---|---|
| **macOS** | macOS 12 Monterey or later |
| **Linux** | Any modern desktop distribution with WebKit2GTK |
| **RAM** | 256 MB |
| **Disk** | 50 MB |

---

## Updating

Sonar does not auto-update. Check [GitHub Releases](https://github.com/thecatthatflies/sonar/releases) for new versions and repeat the install steps.

---

## Uninstall

**macOS:** Drag Sonar from `/Applications` to Trash. To also remove saved settings:
```bash
rm -rf ~/Library/Application\ Support/Sonar
```

**Linux:** Delete the AppImage file. To remove settings:
```bash
rm -rf ~/.config/Sonar
```
