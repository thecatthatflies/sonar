import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../lib/toast';
import { useLogger } from '../lib/logger';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListSubheader from '@mui/material/ListSubheader';
import IconButton from '@mui/material/IconButton';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import { alpha, useTheme } from '@mui/material/styles';
import { ArrowClockwise, EyeSlash, Cylinder } from '@phosphor-icons/react';
import PortCard from './PortCard';
import {
  getVisibility,
  loadHiddenProcesses, saveHiddenProcesses,
  loadAllowedProcesses, saveAllowedProcesses,
  type Visibility,
} from '../lib/portFilter';
import type { PortInfo } from '../types';

const SCANNER_URL = 'http://localhost:5757/api/ports';
const POLL_MS     = 3_000;
const FADE_MS     = 10_000;
const NEW_MS      = 4_000;

interface TrackedPort {
  info: PortInfo;
  firstSeen: number;
  lastSeen: number;
  disconnectedAt: number | null;
}

function portKey(p: PortInfo) { return `${p.pid}:${p.port}`; }

interface Props {
  open: boolean;
  width: number;
  onPortOpen: (port: number) => void;
  activePort: number | null;
  onPortsChange: (n: number) => void;
  onOpenInTab?: (port: number) => void;
}

export default function Sidebar({ open, width, onPortOpen, activePort, onPortsChange, onOpenInTab }: Props) {
  const theme = useTheme();
  const pri   = theme.palette.primary.main;
  const toast = useToast();
  const { log } = useLogger();
  const toastedRef = useRef<Set<string>>(new Set());

  const [tracked, setTracked] = useState<Map<string, TrackedPort>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [scanMs,  setScanMs]  = useState<number | null>(null);
  const [, setTick]           = useState(0);

  // Filter state
  const [showAll,     setShowAll]     = useState(false);
  const [userHidden,  setUserHidden]  = useState<Set<string>>(() => loadHiddenProcesses());
  const [userAllowed, setUserAllowed] = useState<Set<string>>(() => loadAllowedProcesses());

  const hideProcess = useCallback((processName: string) => {
    const lower = processName.toLowerCase().trim();
    setUserHidden(prev => {
      const next = new Set(prev).add(lower);
      saveHiddenProcesses(next);
      return next;
    });
    // Remove from allowed if it was there
    setUserAllowed(prev => {
      if (!prev.has(lower)) return prev;
      const next = new Set(prev);
      next.delete(lower);
      saveAllowedProcesses(next);
      return next;
    });
  }, []);

  const restoreProcess = useCallback((processName: string) => {
    const lower = processName.toLowerCase().trim();
    // Remove from hidden
    setUserHidden(prev => {
      if (!prev.has(lower)) return prev;
      const next = new Set(prev);
      next.delete(lower);
      saveHiddenProcesses(next);
      return next;
    });
    // Add to allowed (overrides auto-block)
    setUserAllowed(prev => {
      if (prev.has(lower)) return prev;
      const next = new Set(prev).add(lower);
      saveAllowedProcesses(next);
      return next;
    });
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(SCANNER_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data       = await res.json();
      const fresh: PortInfo[] = data.ports ?? [];
      setScanMs(data.scan_time_ms ?? null);
      const now      = Date.now();
      const freshSet = new Set(fresh.map(portKey));

      // Toast newly-detected ports (once per key, skipping first scan)
      const isFirstScan = toastedRef.current.size === 0 && tracked.size === 0;
      if (!isFirstScan) {
        for (const p of fresh) {
          const k = portKey(p);
          if (!tracked.has(k) && !toastedRef.current.has(k)) {
            toastedRef.current.add(k);
            const vis = getVisibility(p, userHidden, userAllowed);
            if (vis === 'visible') {
              toast.info(`Port ${p.port} is listening (${p.process_name})`);
              log('info', `Port ${p.port} detected — ${p.process_name} (PID ${p.pid})`, 'scanner');
            } else {
              log('debug', `Port ${p.port} filtered — ${p.process_name} (${vis})`, 'scanner');
            }
          }
        }
      }
      // Seed toastedRef on first scan so we don't toast existing ports
      if (isFirstScan) {
        for (const p of fresh) toastedRef.current.add(portKey(p));
      }

      setTracked(prev => {
        const next = new Map(prev);
        for (const p of fresh) {
          const k = portKey(p);
          const e = next.get(k);
          next.set(k, { info: p, firstSeen: e?.firstSeen ?? now, lastSeen: now, disconnectedAt: null });
        }
        for (const [k, t] of next.entries()) {
          if (!freshSet.has(k)) {
            const at = t.disconnectedAt ?? now;
            if (!t.disconnectedAt) {
              log('warn', `Port ${t.info.port} gone — ${t.info.process_name}`, 'scanner');
            }
            if (now - at >= FADE_MS) next.delete(k);
            else next.set(k, { ...t, disconnectedAt: at });
          }
        }
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'fetch failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const poll = setInterval(refresh, POLL_MS);
    const tick = setInterval(() => setTick(t => t + 1), 1_000);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, [refresh]);

  const now    = Date.now();
  const sorted = [...tracked.values()].sort((a, b) => {
    const ad = a.disconnectedAt !== null ? 1 : 0;
    const bd = b.disconnectedAt !== null ? 1 : 0;
    return ad !== bd ? ad - bd : a.info.port - b.info.port;
  });

  // Annotate each port with its visibility
  const annotated = sorted.map(t => ({
    ...t,
    visibility: getVisibility(t.info, userHidden, userAllowed) as Visibility,
  }));

  const visible   = annotated.filter(t => t.visibility === 'visible' && !t.disconnectedAt);
  const hiddenAll = annotated.filter(t => t.visibility !== 'visible');
  const displayed = showAll ? annotated : annotated.filter(t => t.visibility === 'visible');

  // Only count non-disconnected active ports for the "active" badge
  useEffect(() => { onPortsChange(visible.length); }, [visible.length, onPortsChange]);

  const hiddenCount = hiddenAll.filter(t => !t.disconnectedAt).length;

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Services header */}
      <List
        sx={{ flex: 1, overflowY: 'auto', pb: 0, pt: 0 }}
        subheader={
          <ListSubheader sx={{ userSelect: 'none' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', pr: 0.5 }}>
              <span style={{ flex: 1 }}>Services</span>
              {scanMs !== null && (
                <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: 'inherit', fontSize: 10, mr: 0.5 }}>
                  {scanMs}ms
                </Typography>
              )}
              <Tooltip title="Refresh">
                <span>
                  <IconButton size="small" onClick={refresh} disabled={loading} sx={{ p: 0.5 }}>
                    {loading
                      ? <CircularProgress size={13} />
                      : <ArrowClockwise size={15} weight="duotone" />}
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          </ListSubheader>
        }
      >
        {/* Filter summary bar */}
        {hiddenCount > 0 && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mx: 1.5,
              mb: 0.75,
              px: 1.25,
              py: 0.5,
              borderRadius: 2,
              bgcolor: alpha(pri, 0.06),
              border: `1px solid ${alpha(pri, 0.12)}`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <EyeSlash size={13} weight="duotone" />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6875rem' }}>
                {hiddenCount} filtered
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6875rem' }}>
                {showAll ? 'Showing all' : 'Show all'}
              </Typography>
              <Switch
                size="small"
                checked={showAll}
                onChange={e => setShowAll(e.target.checked)}
                sx={{ ml: -0.5 }}
              />
            </Box>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mx: 1.5, mb: 1, fontSize: 11, py: 0.5, '& .MuiAlert-message': { fontFamily: 'inherit' } }}>
            Scanner offline
          </Alert>
        )}

        {!error && displayed.length === 0 && (
          <Box sx={{ px: 2.5, py: 3, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <Cylinder size={28} weight="duotone" opacity={0.2} />
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
              No dev services detected
            </Typography>
            {hiddenCount > 0 && !showAll && (
              <Typography
                variant="caption"
                sx={{ color: pri, cursor: 'pointer', display: 'block', mt: 0.5 }}
                onClick={() => setShowAll(true)}
              >
                {hiddenCount} filtered — show all?
              </Typography>
            )}
          </Box>
        )}

        {displayed.map(t => (
          <PortCard
            key={portKey(t.info)}
            info={t.info}
            selected={t.info.port === activePort}
            isNew={!t.disconnectedAt && now - t.firstSeen < NEW_MS}
            isDisconnected={t.disconnectedAt !== null}
            disconnectedSecondsAgo={t.disconnectedAt !== null ? Math.round((now - t.disconnectedAt) / 1000) : null}
            visibility={t.visibility}
            showAll={showAll}
            onClick={() => t.visibility === 'visible' && !t.disconnectedAt && onPortOpen(t.info.port)}
            onHide={() => hideProcess(t.info.process_name)}
            onRestore={() => restoreProcess(t.info.process_name)}
            onOpenInTab={onOpenInTab}
          />
        ))}

        {/* Separator before "show all" entries label */}
        {showAll && hiddenCount > 0 && displayed.some(t => t.visibility !== 'visible') && (
          <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
            <Chip
              icon={<EyeSlash size={12} weight="duotone" />}
              label={`${hiddenCount} filtered`}
              size="small"
              variant="outlined"
              sx={{ fontSize: 10, height: 20, '& .MuiChip-icon': { fontSize: 12 } }}
            />
          </Box>
        )}
      </List>

    </Box>
  );

  return (
    <Drawer
      variant="persistent"
      open={open}
      sx={{
        width: open ? width : 0,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width,
          position: 'relative',
          height: '100%',
          border: 'none',
          overflowX: 'hidden',
          transition: 'width 220ms cubic-bezier(0.4, 0, 0.2, 1)',
        },
      }}
    >
      {drawer}
    </Drawer>
  );
}
