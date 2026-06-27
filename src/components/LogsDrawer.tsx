import { useRef, useEffect, useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import { alpha, useTheme } from '@mui/material/styles';
import {
  X, Trash, ArrowDown, Bug, Info, Warning, XCircle,
  CheckCircle, ArrowsOutLineVertical, FloppyDisk,
  FolderOpen, Clock, CaretRight, Prohibit,
} from '@phosphor-icons/react';
import { useLogger, type LogLevel, type LogEntry, type SavedSession } from '../lib/logger';
import { MONO } from '../theme';

// ── constants ─────────────────────────────────────────────────────────────────
const LEVEL_COLOR: Record<LogLevel, string> = {
  debug: '#6B7280',
  info:  '#60A5FA',
  warn:  '#FBBF24',
  error: '#F87171',
};
const BG     = '#0E1117';
const BG_HDR = '#13161E';
const BORDER = 'rgba(255,255,255,0.07)';

// ── helpers ───────────────────────────────────────────────────────────────────
function LevelIcon({ level, size = 12 }: { level: LogLevel; size?: number }) {
  const c = LEVEL_COLOR[level];
  switch (level) {
    case 'debug': return <Bug      size={size} color={c} weight="duotone" />;
    case 'info':  return <Info     size={size} color={c} weight="duotone" />;
    case 'warn':  return <Warning  size={size} color={c} weight="duotone" />;
    case 'error': return <XCircle  size={size} color={c} weight="duotone" />;
  }
}

// Detect URLs in a message and wrap them
function renderMsg(msg: string, color: string) {
  const urlRe = /https?:\/\/[^\s"')>]+/g;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = urlRe.exec(msg)) !== null) {
    if (m.index > last) parts.push(msg.slice(last, m.index));
    const url = m[0];
    parts.push(
      <Box
        key={m.index}
        component="a"
        href={url}
        onClick={e => { e.preventDefault(); window.dispatchEvent(new CustomEvent('sonar:navigate', { detail: { url, tabId: '__new__' } })); }}
        sx={{
          color: LEVEL_COLOR.info,
          textDecoration: 'underline',
          textDecorationStyle: 'dotted',
          cursor: 'pointer',
          '&:hover': { textDecoration: 'underline', textDecorationStyle: 'solid' },
        }}
      >
        {url}
      </Box>
    );
    last = m.index + url.length;
  }
  if (last < msg.length) parts.push(msg.slice(last));
  return <span style={{ color }}>{parts}</span>;
}

function fmt(ts: Date) {
  const ms = String(ts.getMilliseconds()).padStart(3, '0');
  return ts.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + `.${ms}`;
}

function timeDiff(a: Date, b: Date) {
  const ms = b.getTime() - a.getTime();
  if (ms < 1000) return null;
  if (ms < 60000) return `+${(ms / 1000).toFixed(1)}s`;
  return `+${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

// ── sub-components ────────────────────────────────────────────────────────────
function LogRow({ entry, prev }: { entry: LogEntry; prev: LogEntry | undefined }) {
  const pri = useTheme().palette.primary.main;
  const gap = prev ? timeDiff(prev.ts, entry.ts) : null;
  const msgColor = entry.level === 'error' ? LEVEL_COLOR.error
    : entry.level === 'warn'  ? LEVEL_COLOR.warn
    : entry.level === 'debug' ? 'rgba(255,255,255,0.4)'
    : 'rgba(255,255,255,0.82)';

  return (
    <>
      {gap && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.25, opacity: 0.4 }}>
          <Box sx={{ flex: 1, height: 1, bgcolor: BORDER }} />
          <Typography sx={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
            {gap}
          </Typography>
          <Box sx={{ flex: 1, height: 1, bgcolor: BORDER }} />
        </Box>
      )}
      <Box sx={{
        display: 'flex',
        alignItems: 'baseline',
        borderBottom: `1px solid ${alpha(BORDER, 0.5)}`,
        borderLeft: `2px solid ${alpha(LEVEL_COLOR[entry.level], entry.level === 'error' ? 0.8 : entry.level === 'warn' ? 0.5 : 0.18)}`,
        '&:hover': { bgcolor: 'rgba(255,255,255,0.025)' },
        transition: 'background 80ms ease',
      }}>
        <Box sx={{ px: 1, py: 0.5, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          <LevelIcon level={entry.level} size={11} />
        </Box>
        <Typography sx={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.2)', flexShrink: 0, mr: 1.5, lineHeight: 1.85 }}>
          {fmt(entry.ts)}
        </Typography>
        <Typography sx={{ fontFamily: MONO, fontSize: 10, color: alpha(pri, 0.55), flexShrink: 0, minWidth: 70, mr: 1.5, lineHeight: 1.85 }}>
          [{entry.source}]
        </Typography>
        <Typography component="div" sx={{ fontFamily: MONO, fontSize: 11.5, lineHeight: 1.85, flex: 1, pr: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {renderMsg(entry.msg, msgColor)}
        </Typography>
        {entry.count > 1 && (
          <Box sx={{
            flexShrink: 0, mr: 1, px: 0.75, py: 0.125,
            borderRadius: 10,
            bgcolor: alpha(LEVEL_COLOR[entry.level], 0.18),
            border: `1px solid ${alpha(LEVEL_COLOR[entry.level], 0.35)}`,
          }}>
            <Typography sx={{ fontFamily: MONO, fontSize: 9, color: LEVEL_COLOR[entry.level], lineHeight: 1.4 }}>
              ×{entry.count}
            </Typography>
          </Box>
        )}
      </Box>
    </>
  );
}

function SessionRow({
  session, onLoad, onDelete,
}: {
  session: SavedSession;
  onLoad: (s: SavedSession) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center',
      px: 1.5, py: 1,
      borderBottom: `1px solid ${BORDER}`,
      gap: 1,
      '&:hover': { bgcolor: 'rgba(255,255,255,0.025)' },
    }}>
      <Clock size={14} color="rgba(255,255,255,0.3)" weight="duotone" />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontFamily: MONO, fontSize: 11.5, color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {session.name}
        </Typography>
        <Typography sx={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
          {session.count} entries · {session.ts.toLocaleDateString()}
        </Typography>
      </Box>
      <Tooltip title="View session" placement="top">
        <IconButton size="small" onClick={() => onLoad(session)} sx={{ p: 0.5, color: 'rgba(255,255,255,0.35)', '&:hover': { color: LEVEL_COLOR.info } }}>
          <CaretRight size={14} weight="duotone" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete" placement="top">
        <IconButton size="small" onClick={() => onDelete(session.id)} sx={{ p: 0.5, color: 'rgba(255,255,255,0.25)', '&:hover': { color: LEVEL_COLOR.error } }}>
          <Trash size={13} weight="duotone" />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

// ── main component ────────────────────────────────────────────────────────────
interface Props {
  open: boolean;
  onClose: () => void;
  height: number;
  onHeightChange: (h: number) => void;
}

type Tab = 'console' | 'saved';

export default function LogsDrawer({ open, onClose, height, onHeightChange }: Props) {
  const { logs, clear, saveSession, loadSavedSessions, deleteSession } = useLogger();
  const theme = useTheme();
  const pri   = theme.palette.primary.main;

  const endRef   = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startY   = useRef(0);
  const startH   = useRef(0);

  const [tab,         setTab]         = useState<Tab>('console');
  const [autoScroll,  setAutoScroll]  = useState(true);
  const [filter,      setFilter]      = useState<Set<LogLevel>>(new Set(['debug', 'info', 'warn', 'error']));
  const [viewSession, setViewSession] = useState<SavedSession | null>(null);
  const [sessions,    setSessions]    = useState<SavedSession[]>([]);
  const [saveDialog,  setSaveDialog]  = useState(false);
  const [saveName,    setSaveName]    = useState('');

  // Refresh sessions list when tab switches to saved
  useEffect(() => {
    if (tab === 'saved') setSessions(loadSavedSessions());
  }, [tab, loadSavedSessions]);

  useEffect(() => {
    if (autoScroll && open && tab === 'console') endRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [logs, autoScroll, open, tab]);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!dragging.current) return;
      onHeightChange(Math.max(120, Math.min(680, startH.current + startY.current - e.clientY)));
    };
    const up = () => { dragging.current = false; };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup',  up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, [onHeightChange]);

  const handleSave = () => {
    saveSession(saveName);
    setSaveDialog(false);
    setSaveName('');
    setSessions(loadSavedSessions());
    setTab('saved');
  };

  const handleDelete = useCallback((id: string) => {
    deleteSession(id);
    setSessions(s => s.filter(x => x.id !== id));
    if (viewSession?.id === id) setViewSession(null);
  }, [deleteSession, viewSession]);

  const toggleLevel = (l: LogLevel) => {
    setFilter(prev => {
      const next = new Set(prev);
      if (next.has(l)) { if (next.size > 1) next.delete(l); }
      else next.add(l);
      return next;
    });
  };

  const displayLogs  = viewSession?.logs ?? logs;
  const visible       = displayLogs.filter(e => filter.has(e.level));
  const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];

  if (!open) return null;

  return (
    <>
      <Box sx={{ flexShrink: 0, height, display: 'flex', flexDirection: 'column', bgcolor: BG, borderTop: `1px solid ${BORDER}` }}>

        {/* Drag handle */}
        <Box
          onMouseDown={e => { dragging.current = true; startY.current = e.clientY; startH.current = height; e.preventDefault(); }}
          sx={{
            height: 5, flexShrink: 0, cursor: 'ns-resize',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: 'transparent', transition: 'background 150ms ease',
            '&:hover': { bgcolor: alpha(pri, 0.35) },
            '&:hover .pip': { opacity: 1 },
          }}
        >
          <Box className="pip" sx={{ opacity: 0, transition: 'opacity 150ms ease' }}>
            <ArrowsOutLineVertical size={9} color="rgba(255,255,255,0.5)" />
          </Box>
        </Box>

        {/* Header */}
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 0.5,
          px: 1.5, py: 0.5,
          bgcolor: BG_HDR,
          borderBottom: `1px solid ${BORDER}`,
          flexShrink: 0,
        }}>
          {/* Tabs */}
          {(['console', 'saved'] as Tab[]).map(t => (
            <Box
              key={t}
              onClick={() => setTab(t)}
              sx={{
                px: 1.25, py: 0.375,
                borderRadius: 1,
                cursor: 'pointer',
                bgcolor: tab === t ? alpha(pri, 0.12) : 'transparent',
                border: `1px solid ${tab === t ? alpha(pri, 0.3) : 'transparent'}`,
                transition: 'all 150ms ease',
                '&:hover': { bgcolor: alpha(pri, tab === t ? 0.12 : 0.06) },
              }}
            >
              <Typography sx={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: tab === t ? pri : 'rgba(255,255,255,0.4)', userSelect: 'none' }}>
                {t === 'console' ? 'CONSOLE' : 'SAVED'}
                {t === 'saved' && sessions.length > 0 && ` (${sessions.length})`}
              </Typography>
            </Box>
          ))}

          {tab === 'console' && (
            <>
              <Box sx={{ width: 1, height: 16, bgcolor: BORDER, mx: 0.5 }} />
              {/* Level filter badges */}
              {levels.map(l => (
                <Tooltip key={l} title={l.charAt(0).toUpperCase() + l.slice(1)} placement="top">
                  <Box
                    onClick={() => toggleLevel(l)}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 0.5,
                      px: 0.625, py: 0.25, borderRadius: 1, cursor: 'pointer',
                      opacity: filter.has(l) ? 1 : 0.28,
                      bgcolor: filter.has(l) ? alpha(LEVEL_COLOR[l], 0.10) : 'transparent',
                      border: `1px solid ${filter.has(l) ? alpha(LEVEL_COLOR[l], 0.25) : 'transparent'}`,
                      transition: 'all 150ms ease',
                      '&:hover': { opacity: 1 },
                    }}
                  >
                    <LevelIcon level={l} size={10} />
                    <Typography sx={{ fontFamily: MONO, fontSize: 10, color: LEVEL_COLOR[l], lineHeight: 1 }}>
                      {logs.filter(e => e.level === l).length}
                    </Typography>
                  </Box>
                </Tooltip>
              ))}
            </>
          )}

          {tab === 'saved' && viewSession && (
            <Tooltip title="Back to sessions list" placement="top">
              <IconButton size="small" onClick={() => setViewSession(null)} sx={{ p: 0.5, color: 'rgba(255,255,255,0.4)', ml: 0.5 }}>
                <CaretRight size={13} style={{ transform: 'rotate(180deg)' }} weight="duotone" />
              </IconButton>
            </Tooltip>
          )}

          <Box sx={{ flex: 1 }} />

          {tab === 'console' && (
            <>
              {/* Auto-scroll */}
              <Tooltip title={autoScroll ? 'Auto-scroll on' : 'Auto-scroll off'} placement="top">
                <IconButton size="small" onClick={() => setAutoScroll(s => !s)}
                  sx={{ p: 0.5, color: autoScroll ? pri : 'rgba(255,255,255,0.25)' }}>
                  <ArrowDown size={13} weight="duotone" />
                </IconButton>
              </Tooltip>
              {/* Save */}
              <Tooltip title="Save logs" placement="top">
                <IconButton size="small" onClick={() => setSaveDialog(true)} disabled={logs.length === 0}
                  sx={{ p: 0.5, color: 'rgba(255,255,255,0.25)', '&:hover:not(:disabled)': { color: LEVEL_COLOR.info } }}>
                  <FloppyDisk size={13} weight="duotone" />
                </IconButton>
              </Tooltip>
              {/* Clear */}
              <Tooltip title="Clear" placement="top">
                <IconButton size="small" onClick={clear}
                  sx={{ p: 0.5, color: 'rgba(255,255,255,0.25)', '&:hover': { color: LEVEL_COLOR.error } }}>
                  <Trash size={13} weight="duotone" />
                </IconButton>
              </Tooltip>
            </>
          )}

          {tab === 'saved' && viewSession && (
            <Tooltip title="Delete this session" placement="top">
              <IconButton size="small" onClick={() => handleDelete(viewSession.id)}
                sx={{ p: 0.5, color: 'rgba(255,255,255,0.25)', '&:hover': { color: LEVEL_COLOR.error } }}>
                <Trash size={13} weight="duotone" />
              </IconButton>
            </Tooltip>
          )}

          {/* Close */}
          <Tooltip title="Close" placement="top">
            <IconButton size="small" onClick={onClose}
              sx={{ p: 0.5, color: 'rgba(255,255,255,0.25)', '&:hover': { color: 'rgba(255,255,255,0.8)' } }}>
              <X size={13} weight="duotone" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Body */}
        <Box sx={{
          flex: 1, overflowY: 'auto', overflowX: 'hidden',
          '&::-webkit-scrollbar': { width: 5 },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.08)', borderRadius: 3 },
          '&::-webkit-scrollbar-thumb:hover': { background: 'rgba(255,255,255,0.15)' },
        }}>

          {/* ── Console tab ── */}
          {tab === 'console' && (
            <>
              {viewSession && (
                <Box sx={{ px: 1.5, py: 0.75, borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FolderOpen size={13} color={LEVEL_COLOR.info} weight="duotone" />
                  <Typography sx={{ fontFamily: MONO, fontSize: 10.5, color: 'rgba(255,255,255,0.5)' }}>
                    Viewing: <span style={{ color: LEVEL_COLOR.info }}>{viewSession.name}</span>
                  </Typography>
                  <Box
                    onClick={() => setViewSession(null)}
                    sx={{ ml: 'auto', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', '&:hover': { color: 'rgba(255,255,255,0.6)' } }}
                  >
                    <Typography sx={{ fontFamily: MONO, fontSize: 10 }}>← live</Typography>
                  </Box>
                </Box>
              )}

              {visible.length === 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 1 }}>
                  <CheckCircle size={28} color="rgba(255,255,255,0.07)" weight="duotone" />
                  <Typography sx={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.15)' }}>
                    {viewSession ? 'No entries match filter' : 'No log entries'}
                  </Typography>
                </Box>
              ) : (
                visible.map((entry, idx) => (
                  <LogRow key={entry.id} entry={entry} prev={visible[idx - 1]} />
                ))
              )}
              <div ref={endRef} />
            </>
          )}

          {/* ── Saved tab ── */}
          {tab === 'saved' && !viewSession && (
            <>
              {sessions.length === 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 1 }}>
                  <FloppyDisk size={28} color="rgba(255,255,255,0.07)" weight="duotone" />
                  <Typography sx={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.15)' }}>
                    No saved sessions
                  </Typography>
                  <Typography sx={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.1)' }}>
                    Use the 💾 button in Console to save
                  </Typography>
                </Box>
              ) : (
                sessions.map(s => (
                  <SessionRow
                    key={s.id}
                    session={s}
                    onLoad={s => { setViewSession(s); setTab('console'); }}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </>
          )}

          {tab === 'saved' && viewSession && (
            visible.map((entry, idx) => (
              <LogRow key={entry.id} entry={entry} prev={visible[idx - 1]} />
            ))
          )}
        </Box>
      </Box>

      {/* Save dialog */}
      <Dialog
        open={saveDialog}
        onClose={() => setSaveDialog(false)}
        slotProps={{ paper: { sx: { bgcolor: '#1A1D24', backgroundImage: 'none', border: `1px solid ${BORDER}`, borderRadius: 3, minWidth: 360 } } }}
      >
        <DialogTitle sx={{ fontFamily: MONO, fontSize: 14, color: 'rgba(255,255,255,0.85)', pb: 1 }}>
          Save logs
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Session name (optional)"
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
            placeholder={`Session — ${new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
            sx={{
              mt: 0.5,
              '& .MuiInputBase-root': { fontFamily: MONO, fontSize: 13, bgcolor: 'rgba(255,255,255,0.04)' },
              '& .MuiInputLabel-root': { fontFamily: MONO, fontSize: 12 },
            }}
          />
          <Typography sx={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.3)', mt: 1.5 }}>
            {logs.length} entries will be saved to local storage.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setSaveDialog(false)} startIcon={<Prohibit size={14} weight="duotone" />} sx={{ fontFamily: MONO, fontSize: 12, borderRadius: 20 }}>Cancel</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disableElevation
            startIcon={<FloppyDisk size={14} weight="duotone" />}
            sx={{ fontFamily: MONO, fontSize: 12, borderRadius: 20, bgcolor: pri }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
