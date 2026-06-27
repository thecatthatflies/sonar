import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import { useTheme, alpha } from '@mui/material/styles';
import {
  List as ListIcon,
  CaretLeft,
  CaretRight,
  ArrowClockwise,
  House,
  Moon,
  Sun,
  Broadcast,
  Plus,
  X,
  Terminal as TerminalIcon,
  Globe,
  XCircle,
} from '@phosphor-icons/react';
import { MONO } from '../theme';
import DevToolsMenu from './DevToolsMenu';
import type { AppTab, TabStatus } from '../types';

// Chrome-accurate dimensions
const TRAFFIC_LIGHT_W = 78;
const TAB_ROW_H       = 36;  // Chrome tab bar
const NAV_ROW_H       = 40;  // Chrome toolbar

function normalize(raw: string): string {
  const s = raw.trim();
  if (!s) return '';
  if (/^\d{2,5}$/.test(s))                                       return `http://localhost:${s}`;
  if (/^localhost(:\d+)?(\/.*)?$/.test(s))                       return `http://${s}`;
  if (/^https?:\/\//.test(s))                                     return s;
  if (/^\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/.*)?$/.test(s))         return `http://${s}`;
  if (/^[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})(:\d+)?(\/.*)?$/.test(s)) return `https://${s}`;
  return `https://duckduckgo.com/?q=${encodeURIComponent(s)}`;
}

interface Props {
  // Toolbar
  darkMode: boolean;
  onToggleDark: () => void;
  onToggleSidebar: () => void;
  currentUrl: string;
  onNavigate: (url: string) => void;
  portCount: number;
  activeTabDisplayText?: string;
  activePort: number | null;
  logsOpen: boolean;
  onToggleLogs: () => void;
  onOpenAIIntegrations: () => void;
  // Tab strip
  tabs: AppTab[];
  activeTabId: string;
  onTabSelect: (id: string) => void;
  onTabClose: (id: string) => void;
  onAddTab: () => void;
  tabStatuses: Record<string, TabStatus>;
  onFaviconError: (tabId: string) => void;
}

export default function TopBar({
  darkMode, onToggleDark, onToggleSidebar,
  currentUrl, onNavigate, portCount,
  activeTabDisplayText, activePort, logsOpen, onToggleLogs, onOpenAIIntegrations,
  tabs, activeTabId, onTabSelect, onTabClose, onAddTab,
  tabStatuses, onFaviconError,
}: Props) {
  const theme  = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const pri    = theme.palette.primary.main;

  const [input,   setInput]   = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef              = useRef<HTMLInputElement>(null);

  const activeTabIsTerminal = !!activeTabDisplayText;
  const activeStatus = activeTabId ? tabStatuses[activeTabId] : undefined;
  const isLoading    = activeStatus?.status === 'loading';

  useEffect(() => { if (!focused) setInput(currentUrl); }, [currentUrl, focused]);

  useEffect(() => {
    const h = () => { inputRef.current?.focus(); inputRef.current?.select(); };
    window.addEventListener('sonar:focus-addressbar', h);
    return () => window.removeEventListener('sonar:focus-addressbar', h);
  }, []);

  const commit = () => {
    const url = normalize(input);
    if (url) { onNavigate(url); setInput(url); }
    inputRef.current?.blur();
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter')  commit();
    if (e.key === 'Escape') { setInput(currentUrl); inputRef.current?.blur(); }
  };

  // ── colours ──────────────────────────────────────────────────────────────────
  const rowBg = isDark
    ? 'rgba(13, 15, 22, 0.96)'
    : 'rgba(242, 244, 249, 0.96)';

  const tabActiveBg = isDark ? '#0C0E14' : '#FFFFFF';
  const tabHoverBg  = isDark ? alpha('#fff', 0.04) : alpha(pri, 0.04);
  const barBg       = isDark ? alpha('#fff', 0.07) : alpha(pri, 0.06);
  const barBgFocus  = isDark ? alpha('#fff', 0.11) : alpha(pri, 0.10);

  const divider = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  return (
    <Box
      sx={{
        flexShrink: 0,
        bgcolor: rowBg,
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: `1px solid ${divider}`,
        zIndex: 10,
        userSelect: 'none',
      }}
    >
      {/* ── ROW 1: tab strip (36px, Chrome tab bar) ──────────────────────── */}
      {/* "deep" = entire subtree is draggable; BUTTON/INPUT/role=tab auto-block within */}
      <Box
        sx={{
          height: TAB_ROW_H,
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
        }}
        data-tauri-drag-region="deep"
      >
        {/* Traffic light clearance — inherits drag from Row 1 */}
        <Box sx={{ width: TRAFFIC_LIGHT_W, flexShrink: 0, height: '100%' }} />

        {/* Sidebar toggle — IconButton renders as BUTTON → auto-blocks drag */}
        <Tooltip title="Toggle sidebar">
          <IconButton
            onClick={onToggleSidebar}
            size="small"
            sx={{ flexShrink: 0, mr: 0.5, color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
          >
            <ListIcon size={16} weight="duotone" />
          </IconButton>
        </Tooltip>

        {/* Brand — no interactive elements, inherits drag */}
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, mr: 1 }}
        >
          <Broadcast size={16} weight="duotone" color={pri} />
          <Typography sx={{ fontWeight: 700, fontSize: '0.8125rem', letterSpacing: '0.04em', color: pri, lineHeight: 1 }}>
            Sonar
          </Typography>
          {portCount > 0 && (
            <Chip
              label={portCount}
              size="small"
              color="primary"
              sx={{ height: 15, fontSize: 9, fontWeight: 700, '& .MuiChip-label': { px: 0.625 } }}
            />
          )}
        </Box>

        {/* Tab strip — inherits deep drag; each tab gets role="tab" to auto-block */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'stretch',
            overflowX: 'auto',
            overflowY: 'hidden',
            height: '100%',
            '&::-webkit-scrollbar': { height: 0 },
          }}
        >
          {tabs.map(tab => {
            const isActive = tab.id === activeTabId;
            const st       = tabStatuses[tab.id];
            const isPort   = tab.type === 'port';
            const hasFav   = isPort && st?.favicon && !st?.faviconFailed;
            const tabLoading = isPort && st?.status === 'loading';
            const tabError   = isPort && st?.status === 'error';

            return (
              <Box
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabSelect(tab.id)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.625,
                  px: 1.5,
                  minWidth: 80,
                  maxWidth: 190,
                  height: '100%',
                  flexShrink: 1,
                  cursor: 'pointer',
                  bgcolor: isActive ? tabActiveBg : 'transparent',
                  borderRight: `1px solid ${divider}`,
                  borderBottom: isActive ? `1px solid ${tabActiveBg}` : '1px solid transparent',
                  transition: 'background 140ms ease',
                  position: 'relative',
                  '&:hover': { bgcolor: isActive ? tabActiveBg : tabHoverBg },
                  '&:hover .tab-x': { opacity: 1 },
                }}
              >
                {/* Bottom accent for active tab */}
                {isActive && (
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 0, left: 0, right: 0,
                      height: 2,
                      bgcolor: pri,
                      borderRadius: '2px 2px 0 0',
                    }}
                  />
                )}

                {/* Icon */}
                {hasFav ? (
                  <Box
                    component="img"
                    src={st!.favicon!}
                    onError={() => onFaviconError(tab.id)}
                    sx={{ width: 13, height: 13, flexShrink: 0, borderRadius: 0.5 }}
                  />
                ) : tab.type === 'terminal' ? (
                  <TerminalIcon size={13} weight="duotone" color={isActive ? pri : theme.palette.text.secondary} style={{ flexShrink: 0 }} />
                ) : tabError ? (
                  <XCircle size={13} weight="duotone" color={theme.palette.error.main} style={{ flexShrink: 0 }} />
                ) : tabLoading ? (
                  <Box
                    sx={{
                      width: 12, height: 12, flexShrink: 0,
                      borderRadius: '50%',
                      border: `1.5px solid ${alpha(pri, 0.25)}`,
                      borderTopColor: pri,
                      animation: 'spin 0.65s linear infinite',
                      '@keyframes spin': { to: { transform: 'rotate(360deg)' } },
                    }}
                  />
                ) : (
                  <Globe size={13} weight="duotone" color={isActive ? pri : theme.palette.text.secondary} style={{ flexShrink: 0 }} />
                )}

                {/* Title */}
                <Typography
                  noWrap
                  sx={{
                    flex: 1,
                    fontSize: '0.78rem',
                    fontWeight: isActive ? 600 : 400,
                    color: tabError ? 'error.main' : isActive ? 'text.primary' : 'text.secondary',
                    lineHeight: 1,
                  }}
                >
                  {tab.title}
                </Typography>

                {/* Close — hidden for the last remaining terminal, shown otherwise */}
                {(tab.type !== 'terminal' || tabs.filter(t => t.type === 'terminal').length > 1) && (
                  <IconButton
                    component="span"
                    className="tab-x"
                    size="small"
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); onTabClose(tab.id); }}
                    sx={{
                      p: 0.25, flexShrink: 0, borderRadius: 1,
                      opacity: isActive ? 0.5 : 0,
                      color: 'text.secondary',
                      transition: 'opacity 130ms ease, color 130ms ease',
                      '&:hover': { opacity: 1, color: 'error.main', bgcolor: alpha(theme.palette.error.main, 0.10) },
                    }}
                  >
                    <X size={11} weight="bold" />
                  </IconButton>
                )}
              </Box>
            );
          })}
        </Box>

        {/* Add tab */}
        <Tooltip title="New tab (focus address bar)">
          <IconButton
            size="small"
            onClick={onAddTab}
            sx={{ mx: 0.5, flexShrink: 0, color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
          >
            <Plus size={15} weight="duotone" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* ── ROW 2: nav + address bar + actions (40px, Chrome toolbar) ───── */}
      {/* "deep" so empty gaps between nav buttons are draggable; buttons auto-block */}
      <Box
        sx={{
          height: NAV_ROW_H,
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          borderTop: `1px solid ${divider}`,
          px: 1,
        }}
        data-tauri-drag-region="deep"
      >
        {/* Left: nav buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0 }}>
          {[
            { title: 'Back',    icon: <CaretLeft      size={16} weight="duotone" />, ev: 'sonar:back'    },
            { title: 'Forward', icon: <CaretRight     size={16} weight="duotone" />, ev: 'sonar:forward' },
            { title: 'Reload',  icon: <ArrowClockwise size={16} weight="duotone" />, ev: 'sonar:reload'  },
            { title: 'Home',    icon: <House          size={16} weight="duotone" />, ev: 'sonar:home'    },
          ].map(({ title, icon, ev }) => (
            <Tooltip key={ev} title={title}>
              <span>
                <IconButton
                  size="small"
                  disabled={activeTabIsTerminal}
                  onClick={() => window.dispatchEvent(new CustomEvent(ev))}
                  sx={{
                    p: 0.625,
                    color: activeTabIsTerminal ? 'text.disabled' : 'text.secondary',
                    '&:hover:not(:disabled)': { color: 'text.primary' },
                  }}
                >
                  {icon}
                </IconButton>
              </span>
            </Tooltip>
          ))}
        </Box>

        {/* Right: actions */}
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
          <Tooltip title={darkMode ? 'Light mode' : 'Dark mode'}>
            <IconButton onClick={onToggleDark} size="small" sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}>
              {darkMode ? <Sun size={17} weight="duotone" /> : <Moon size={17} weight="duotone" />}
            </IconButton>
          </Tooltip>
          <DevToolsMenu activePort={activePort} logsOpen={logsOpen} onToggleLogs={onToggleLogs} onOpenAIIntegrations={onOpenAIIntegrations} />
        </Box>

        {/* Center: address bar — explicitly block drag (wrapper div has onClick but isn't a BUTTON) */}
        <Box
          data-tauri-drag-region="false"
          sx={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'min(520px, calc(100% - 280px))',
            height: 28,
            bgcolor: focused ? barBgFocus : barBg,
            borderRadius: 20,
            px: 2,
            display: 'flex',
            alignItems: 'center',
            outline: focused ? `2px solid ${alpha(pri, 0.7)}` : '2px solid transparent',
            transition: 'background 160ms ease, outline 120ms ease',
            cursor: activeTabIsTerminal ? 'default' : 'text',
            pointerEvents: 'auto',
          }}
          onClick={() => !activeTabIsTerminal && inputRef.current?.focus()}
        >
          <InputBase
            inputRef={inputRef}
            fullWidth
            value={focused ? input : (activeTabDisplayText ?? currentUrl)}
            placeholder="localhost:3000 · URL · search"
            disabled={activeTabIsTerminal}
            onChange={e => setInput(e.target.value)}
            onFocus={() => {
              setFocused(true);
              setInput(currentUrl);
              setTimeout(() => inputRef.current?.select(), 10);
            }}
            onBlur={() => setFocused(false)}
            onKeyDown={onKey}
            sx={{
              fontFamily: MONO,
              fontSize: 12,
              color: 'text.primary',
              '& input': { py: 0, textAlign: 'center' },
              '& input::placeholder': { color: 'text.disabled', opacity: 1, textAlign: 'center' },
              '& input:disabled': { WebkitTextFillColor: 'inherit', cursor: 'default' },
            }}
          />
        </Box>
      </Box>

      {/* Loading bar */}
      <Box sx={{ height: 2, flexShrink: 0 }}>
        {isLoading && (
          <LinearProgress
            sx={{
              height: 2,
              '& .MuiLinearProgress-bar': { bgcolor: pri },
              bgcolor: alpha(pri, 0.15),
            }}
          />
        )}
      </Box>
    </Box>
  );
}
