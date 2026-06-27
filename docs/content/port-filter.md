---
title: Port Filter
slug: port-filter
order: 3
description: How Sonar auto-hides system noise and surfaces only your dev services.
---

# Port Filter

Sonar automatically distinguishes dev services from system noise using a three-priority filter system.

## How It Works

Every port entry passes through `getVisibility()` in `src/lib/portFilter.ts`:

```
getVisibility(info, userHidden, userAllowed) → 'visible' | 'user-hidden' | 'auto-hidden'
```

**Priority order (highest first):**

1. `userHidden` — process name is in the user's explicit hide list → `'user-hidden'`
2. `userAllowed` — process name is in the user's explicit allow list → `'visible'`
3. `DEV_PROCESSES` — known dev tool → `'visible'`
4. `BLOCKED_PROCESSES` — known noise → `'auto-hidden'`
5. System patterns (regex) — matches system naming convention → `'auto-hidden'`
6. Default — everything else → `'visible'`

## Auto-Blocked Processes

### Communication & Social
Discord, DiscordHelper, Slack, SlackHelper, Telegram, Signal, WhatsApp, Skype, Teams, Zoom, FaceTime

### Media & Entertainment
Spotify, SpotifyHelper, iTunes, Music, Podcasts, AppleTVHelper

### Browsers (as processes, not as browsing targets)
Chrome, Chromium, Firefox, Safari, Arc, Brave, Opera, Edge

### Cloud & Sync
Dropbox, OneDrive, GoogleDrive, iCloud

### Gaming
Steam, EpicGames, Battle.net, EA Desktop, GOG Galaxy

### VPN & Network
Tailscale, Wireguard, OpenVPN, ExpressVPN, NordVPN, Cloudflare WARP

### Apple System Services
AirPlay, AirDrop, Bonjour, mDNSResponder, cloudd, nsurlsessiond, symptomsd, rapportd

### System Patterns (regex)
- `/helper$/i` — most background helper processes
- `/^com\.[a-z]/i` — reverse-domain Java/macOS conventions
- `/agent$/i` — LaunchAgent-style processes
- `/daemon$/i` — background daemons

## Auto-Shown Dev Processes

Node.js ecosystem: `node`, `nodejs`, `npm`, `npx`, `yarn`, `pnpm`, `deno`, `bun`, `vite`, `webpack`, `esbuild`, `rollup`, `parcel`, `next`, `nuxt`, `remix`, `astro`, `sveltekit`, `turbo`

Python: `python`, `python3`, `uvicorn`, `gunicorn`, `flask`, `django`, `fastapi`, `hypercorn`

Ruby: `ruby`, `rails`, `puma`, `unicorn`, `sinatra`

Go: `go`, `air`

Rust: `cargo`, `trunk`

Java/JVM: `java`, `kotlin`, `mvn`, `gradle`, `spring`

Databases: `postgres`, `postgresql`, `mysql`, `mariadb`, `mongodb`, `redis`, `sqlite`

Web servers: `nginx`, `caddy`, `apache`, `httpd`, `haproxy`

## User Overrides

### Hiding a process
Click **Hide** on any port card. The process name (lowercased) is added to `userHidden`.

Effect: all ports from that process disappear from the sidebar. Persists across restarts.

```
localStorage: sonar:filter:hidden  →  Set<string> (process names)
```

### Restoring / allowing a process
In "Show all" mode, click:
- **Restore** — removes from `userHidden` (for manually hidden processes)
- **Allow** — adds to `userAllowed` (for auto-hidden processes), permanently overrides the auto-block

```
localStorage: sonar:filter:allowed  →  Set<string> (process names)
```

### Resetting all filters
Open browser DevTools (F12 or Inspect Sonar from the `⋮` menu) and run:
```js
localStorage.removeItem('sonar:filter:hidden');
localStorage.removeItem('sonar:filter:allowed');
```
Then reload Sonar.

## Show All Mode

Toggle **Show all ports** in the sidebar Controls section (or via the filter summary banner when hidden ports exist). In this mode:

- Filtered ports appear dimmed (42% opacity, slight grayscale)
- Show a `Filtered` or `Hidden` status chip
- Cannot be opened in a tab (clicking is disabled)
- Show **Allow** or **Restore** buttons for overriding

Turning off "Show all" hides them again immediately.

## Hidden Port Counter

When ports are filtered, a banner appears at the top of the sidebar:
```
👁 3 filtered    Show all  ○
```

The count reflects only currently-connected ports (disconnected filtered ports don't count). The toggle switch controls the show-all mode inline.

## Port Scanner Range

The scanner covers ports **3000–9000**. Port 5757 is always excluded (Sonar's own scanner). Ports 1–2999 and 9001+ are never scanned — this range covers common ephemeral ports and well-known system services while keeping scan time fast (typically 5–15ms with lsof on macOS).
