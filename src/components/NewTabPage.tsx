import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import InputBase from '@mui/material/InputBase';
import { useTheme, alpha } from '@mui/material/styles';
import { Broadcast, MagnifyingGlass } from '@phosphor-icons/react';
import { MONO } from '../theme';

// Port shortcuts shown on new tab page
const QUICK_PORTS = [3000, 3001, 4000, 5000, 8000, 8080, 8888, 9000];

interface Props {
  portCount: number;
  onNavigate: (url: string) => void;
}

export default function NewTabPage({ portCount, onNavigate }: Props) {
  const theme  = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const pri    = theme.palette.primary.main;

  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus the search bar
    setTimeout(() => inputRef.current?.focus(), 80);

    // Also listen for the global focus-addressbar event
    const h = () => inputRef.current?.focus();
    window.addEventListener('sonar:focus-addressbar', h);
    return () => window.removeEventListener('sonar:focus-addressbar', h);
  }, []);

  const commit = (raw = query) => {
    const s = raw.trim();
    if (!s) return;
    // Port shortcut: bare number
    if (/^\d{2,5}$/.test(s)) { onNavigate(`http://localhost:${s}`); return; }
    // localhost:port
    if (/^localhost(:\d+)?/.test(s)) { onNavigate(`http://${s}`); return; }
    // Full URL
    if (/^https?:\/\//.test(s)) { onNavigate(s); return; }
    // Domain
    if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(s)) { onNavigate(`https://${s}`); return; }
    // Search fallback
    onNavigate(`https://duckduckgo.com/?q=${encodeURIComponent(s)}`);
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') commit();
  };

  const bg     = isDark ? '#0C0E14' : '#F1F3F8';
  const inputBg = isDark ? alpha('#fff', 0.05) : alpha('#000', 0.04);
  const inputBgFocus = isDark ? alpha('#fff', 0.09) : alpha('#000', 0.07);

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        bgcolor: bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
        pb: '10vh',
      }}
    >
      {/* Logo */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
        <Broadcast size={52} weight="duotone" color={pri} />
        <Typography
          sx={{
            fontSize: '3rem',
            fontWeight: 800,
            letterSpacing: '-0.04em',
            color: pri,
            lineHeight: 1,
          }}
        >
          Sonar
        </Typography>
      </Box>

      {/* Search / address bar */}
      <Box
        sx={{
          width: '100%',
          maxWidth: 560,
          px: 2,
          position: 'relative',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            height: 52,
            bgcolor: inputBg,
            borderRadius: 26,
            px: 2.5,
            border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
            transition: 'background 160ms ease, border-color 160ms ease',
            '&:focus-within': {
              bgcolor: inputBgFocus,
              borderColor: alpha(pri, 0.5),
            },
          }}
          onClick={() => inputRef.current?.focus()}
        >
          <MagnifyingGlass size={18} weight="duotone" color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} style={{ flexShrink: 0 }} />
          <InputBase
            inputRef={inputRef}
            fullWidth
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder="localhost:3000  ·  URL  ·  search DuckDuckGo"
            inputProps={{ spellCheck: false, autoComplete: 'off', autoCapitalize: 'off' }}
            sx={{
              fontFamily: MONO,
              fontSize: 14,
              color: 'text.primary',
              '& input::placeholder': { color: 'text.disabled', opacity: 1 },
            }}
          />
        </Box>
      </Box>

      {/* Quick port links */}
      {portCount > 0 && (
        <Box sx={{ mt: 3.5, display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 560, px: 2 }}>
          {QUICK_PORTS.map(p => (
            <Box
              key={p}
              onClick={() => commit(String(p))}
              sx={{
                px: 1.5, py: 0.5,
                borderRadius: 10,
                bgcolor: isDark ? alpha('#fff', 0.04) : alpha('#000', 0.04),
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
                cursor: 'pointer',
                transition: 'all 130ms ease',
                '&:hover': { bgcolor: alpha(pri, 0.10), borderColor: alpha(pri, 0.3) },
              }}
            >
              <Typography sx={{ fontFamily: MONO, fontSize: '0.75rem', color: 'text.secondary' }}>
                :{p}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Hint */}
      <Typography
        sx={{
          mt: portCount > 0 ? 2.5 : 3.5,
          fontSize: '0.75rem',
          color: 'text.disabled',
          fontFamily: MONO,
        }}
      >
        {portCount > 0
          ? `${portCount} service${portCount !== 1 ? 's' : ''} running · pick a port or type a URL`
          : 'Type a port number, URL, or search query'}
      </Typography>
    </Box>
  );
}
