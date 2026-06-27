import type { PortInfo } from '../types';

// ── Blocklist ─────────────────────────────────────────────────────────────────
// Lowercase, checked via `includes` so partial matches work (e.g. "discordhelper")

export const BLOCKED_PROCESSES = [
  // Communication
  'discord', 'discordhelper', 'discordptb', 'discordcanary',
  'slack', 'slackhelper',
  'telegram', 'signal',
  'whatsapp', 'messenger',
  'zoom', 'zoomus', 'cpthost',
  'teams', 'msteams',
  'skype',
  'facetime',
  'imessage',

  // Music / Media
  'spotify', 'spotifyclient',
  'applemusic', 'music',
  'itunes',
  'plex', 'plexmediaserver', 'plexmediascanner',
  'vlc', 'kodi',

  // Gaming platforms
  'steam', 'steamwebhelper', 'steam_osx',
  'epicgameslauncher', 'epicwebhelper',
  'origin', 'eadesktop',
  'battlenet', 'battle.net',
  'riotclient', 'leagueclient', 'valorant',
  'gog', 'gogalaxy',
  'ubisoft', 'upc',
  'rockstargames',

  // VPN / Network tunnels
  'openvpn', 'wireguard',
  'nordvpn', 'expressvpn', 'mullvad',
  'tunnelblick', 'viscosity',
  'vpnagent', 'anyconnect', 'ciscovpn',
  'tailscaled', 'tailscale',
  'zerotier',

  // macOS system services
  'controlce', 'controlcenter',
  'airplayreceiverd', 'rapportd',
  'sharingd', 'bluetoothd',
  'avconferenced', 'screensharingd',
  'universalaccessd', 'accessibilityd',
  'mds', 'mdworker', 'mdfind',
  'nsurlsessiond', 'nsurlstoraged',
  'trustd', 'syspolicyd',
  'securityd', 'securityagent',
  'loginwindow', 'launchservicesd',
  'airportd', 'configd',
  'springboard',
  'backupd', 'cloudd',
  'syncdefaultsd', 'parsecd',
  'imklaunchagent', 'coreauthd',
  'identityservicesd', 'apsd',

  // Windows system
  'svchost', 'lsass', 'winlogon',
  'wininit', 'services', 'spoolsv',
  'dllhost', 'searchindexer', 'wmiprvse',

  // Productivity / Cloud (non-dev)
  'notion',
  '1password', 'bitwarden', 'lastpass', 'keychain',
  'dropbox',
  'onedrive',
  'googledrive',
  'icloud',
  'evernote',
  'alfred', 'raycast',

  // Password managers / security (non-dev)
  'dashlane', 'keeper',
] as const;

// Regex patterns for names that are almost always system noise
const SYSTEM_PATTERNS: RegExp[] = [
  /helper(app)?$/i,
  /^com\.[a-z]/i,
  /^org\.[a-z]/i,
  /renderer$/i,
  /crashreporter$/i,
];

// Dev-relevant process names to always keep visible (overrides auto-block)
const DEV_PROCESSES: readonly string[] = [
  'node', 'nodemon', 'bun', 'deno',
  'python', 'python3', 'uvicorn', 'gunicorn', 'flask', 'fastapi',
  'ruby', 'rails', 'puma', 'unicorn',
  'java', 'spring', 'gradle',
  'go', 'air',
  'rust', 'cargo',
  'php', 'artisan',
  'elixir', 'phoenix',
  'nginx', 'apache', 'caddy', 'traefik',
  'postgres', 'mysqld', 'mongod', 'redis', 'memcached',
  'docker', 'containerd',
  'vite', 'webpack', 'parcel', 'esbuild', 'rollup',
  'next', 'nuxt', 'gatsby', 'astro', 'remix',
  'storybook',
  'jest', 'vitest', 'playwright', 'cypress',
];

export type Visibility = 'visible' | 'user-hidden' | 'auto-hidden';

export function getVisibility(
  info: PortInfo,
  userHidden: Set<string>,
  userAllowed: Set<string>,
): Visibility {
  const lower = info.process_name.toLowerCase().trim();

  // 1. User explicitly hidden → always hide
  if (userHidden.has(lower)) return 'user-hidden';

  // 2. User explicitly allowed → always show (overrides auto-block)
  if (userAllowed.has(lower)) return 'visible';

  // 3. Known dev process → always show
  if (DEV_PROCESSES.some(d => lower === d || lower.startsWith(d + ' '))) return 'visible';

  // 4. Check auto-blocklist (partial match)
  if (BLOCKED_PROCESSES.some(b => lower.includes(b))) return 'auto-hidden';

  // 5. System pattern heuristic
  if (SYSTEM_PATTERNS.some(p => p.test(lower))) return 'auto-hidden';

  return 'visible';
}

// ── LocalStorage persistence ──────────────────────────────────────────────────

const LS_HIDDEN  = 'sonar:filter:hidden';
const LS_ALLOWED = 'sonar:filter:allowed';

function loadSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    return new Set<string>(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function saveSet(key: string, s: Set<string>): void {
  try { localStorage.setItem(key, JSON.stringify([...s])); } catch { /* ignore */ }
}

export function loadHiddenProcesses()  { return loadSet(LS_HIDDEN);  }
export function loadAllowedProcesses() { return loadSet(LS_ALLOWED); }

export function saveHiddenProcesses(s: Set<string>)  { saveSet(LS_HIDDEN,  s); }
export function saveAllowedProcesses(s: Set<string>) { saveSet(LS_ALLOWED, s); }
