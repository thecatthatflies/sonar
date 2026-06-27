import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputBase from '@mui/material/InputBase';
import Switch from '@mui/material/Switch';
import Collapse from '@mui/material/Collapse';
import Alert from '@mui/material/Alert';
import { useTheme, alpha } from '@mui/material/styles';
import {
  Binoculars, ArrowClockwise, CheckCircle, XCircle, Warning,
  Play, Trash, Copy, CaretDown, CaretRight, Database,
  StackSimple, Info, Plus, X,
} from '@phosphor-icons/react';
import { MONO } from '../theme';

// ── Types ──────────────────────────────────────────────────────────────────────

interface RouteResult {
  method: string;
  path: string;
  status: number;
  response_ms: number;
  content_type: string;
  is_json: boolean;
  allowed_methods?: string[];
  source: 'probe' | 'openapi';
}

interface ServiceInfo {
  framework: string;
  language: string;
  version: string;
  environment: string;
  health: 'ok' | 'error' | 'unknown';
  health_url: string;
  server_header: string;
}

interface AnalyzeResult {
  port: number;
  service: ServiceInfo;
  routes: RouteResult[];
}

interface DBInfo {
  type: string;
  port: number;
  status: 'online' | 'offline';
  note?: string;
}

interface TestResponse {
  status: number;
  status_text: string;
  headers: Record<string, string>;
  body: string;
  ms: number;
  cached: boolean;
  size: number;
  cache_hits: number;
  cache_misses: number;
}

interface HeaderPair { key: string; val: string }

// ── Constants ──────────────────────────────────────────────────────────────────

const SCANNER = 'http://localhost:5757';
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

const METHOD_COLORS: Record<string, string> = {
  GET:     '#61AFEF',
  POST:    '#98C379',
  PUT:     '#E5C07B',
  PATCH:   '#C678DD',
  DELETE:  '#E06C75',
  HEAD:    '#ABB2BF',
  OPTIONS: '#56B6C2',
};

const ENV_COLORS: Record<string, string> = {
  development: '#61AFEF',
  staging:     '#E5C07B',
  production:  '#E06C75',
  test:        '#56B6C2',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function mc(m: string) { return METHOD_COLORS[m] ?? '#ABB2BF'; }

function statusColor(s: number, err: string, warn: string, ok: string, info: string) {
  if (s >= 500) return err;
  if (s >= 400) return warn;
  if (s >= 300) return info;
  if (s >= 200) return ok;
  return '#ABB2BF';
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function highlightJSON(raw: string): string {
  let str: string;
  try { str = JSON.stringify(JSON.parse(raw), null, 2); }
  catch { str = raw; }
  str = str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return str
    .replace(/"((?:[^"\\]|\\.)*)"\s*:/g, '<span style="color:#61afef">"$1"</span>:')
    .replace(/:\s*"((?:[^"\\]|\\.)*)"/g, (_, v) => `: <span style="color:#98c379">"${v}"</span>`)
    .replace(/:\s*(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/g, ': <span style="color:#d19a66">$1</span>')
    .replace(/:\s*(true|false)/g, ': <span style="color:#c678dd">$1</span>')
    .replace(/:\s*(null)/g, ': <span style="color:#abb2bf">$1</span>');
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function MethodBadge({ method }: { method: string }) {
  const c = mc(method);
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      px: 0.75, py: 0.15, borderRadius: 1,
      bgcolor: alpha(c, 0.12), border: `1px solid ${alpha(c, 0.3)}`,
      minWidth: 56, flexShrink: 0,
    }}>
      <Typography sx={{ fontFamily: MONO, fontSize: '0.6rem', fontWeight: 700, color: c, letterSpacing: '0.05em' }}>
        {method}
      </Typography>
    </Box>
  );
}

function StatusBadge({ status }: { status: number }) {
  const theme = useTheme();
  if (!status) return <Typography sx={{ fontFamily: MONO, fontSize: '0.6875rem', color: 'text.disabled' }}>—</Typography>;
  const c = statusColor(status, theme.palette.error.main, theme.palette.warning.main, theme.palette.success.main, theme.palette.info.main);
  return (
    <Chip
      label={status}
      size="small"
      sx={{
        height: 18, fontSize: '0.6rem', fontFamily: MONO, fontWeight: 700,
        bgcolor: alpha(c, 0.12), color: c, border: `1px solid ${alpha(c, 0.3)}`,
        '& .MuiChip-label': { px: 0.75 },
      }}
    />
  );
}

function HealthDot({ health }: { health: string }) {
  const theme = useTheme();
  const c = health === 'ok' ? theme.palette.success.main
    : health === 'error' ? theme.palette.error.main
    : theme.palette.text.disabled;
  return (
    <Box sx={{
      width: 8, height: 8, borderRadius: '50%', bgcolor: c, flexShrink: 0,
      boxShadow: health === 'ok' ? `0 0 0 2px ${alpha(c, 0.25)}` : 'none',
    }} />
  );
}

// ── Test Panel ─────────────────────────────────────────────────────────────────

interface TestPanelProps {
  initialMethod: string;
  initialUrl: string;
  cacheEnabled: boolean;
  onCacheToggle: (v: boolean) => void;
  cacheStats: { hits: number; misses: number };
  onCacheClear: () => void;
}

function RouteTestPanel({
  initialMethod, initialUrl,
  cacheEnabled, onCacheToggle, cacheStats, onCacheClear,
}: TestPanelProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const pri   = theme.palette.primary.main;

  const [method,    setMethod]    = useState(initialMethod);
  const [url,       setUrl]       = useState(initialUrl);
  const [headers,   setHeaders]   = useState<HeaderPair[]>([]);
  const [body,      setBody]      = useState('');
  const [sending,   setSending]   = useState(false);
  const [response,  setResponse]  = useState<TestResponse | null>(null);
  const [showHdrs,  setShowHdrs]  = useState(false);
  const [tab, setTab] = useState<'body' | 'headers'>('body');

  useEffect(() => { setMethod(initialMethod); setUrl(initialUrl); setResponse(null); }, [initialMethod, initialUrl]);

  const hasBody = ['POST', 'PUT', 'PATCH'].includes(method);

  const send = async () => {
    setSending(true);
    try {
      const hdrs: Record<string, string> = {};
      headers.forEach(h => { if (h.key.trim()) hdrs[h.key.trim()] = h.val; });
      const res = await fetch(`${SCANNER}/api/proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, url, headers: hdrs, body: hasBody ? body : '', cache: cacheEnabled }),
      });
      const data: TestResponse = await res.json();
      setResponse(data);
    } finally {
      setSending(false);
    }
  };

  const copyResponse = () => {
    if (response?.body) navigator.clipboard.writeText(response.body);
  };

  const panelBg = isDark ? '#0D1117' : '#F8FAFC';
  const respBg  = isDark ? '#0A0D12' : '#F0F4F8';

  return (
    <Box sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2, overflow: 'hidden', mt: 0.5 }}>
      {/* Request builder */}
      <Box sx={{ bgcolor: panelBg, p: 1.5 }}>
        {/* Method + URL row */}
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <Select
            value={method}
            onChange={e => setMethod(e.target.value)}
            size="small"
            sx={{
              fontFamily: MONO, fontSize: '0.75rem', fontWeight: 700,
              color: mc(method), minWidth: 100, flexShrink: 0,
              '& .MuiSelect-select': { py: 0.75, px: 1 },
              '& fieldset': { borderColor: alpha(mc(method), 0.3) },
              '&:hover fieldset': { borderColor: alpha(mc(method), 0.6) },
            }}
          >
            {HTTP_METHODS.map(m => (
              <MenuItem key={m} value={m} sx={{ fontFamily: MONO, fontSize: '0.75rem', color: mc(m) }}>{m}</MenuItem>
            ))}
          </Select>
          <InputBase
            fullWidth
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            sx={{
              fontFamily: MONO, fontSize: '0.75rem',
              bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
              borderRadius: 1, px: 1.5, py: 0.5,
              border: `1px solid ${theme.palette.divider}`,
            }}
          />
          <Button
            variant="contained"
            disableElevation
            size="small"
            startIcon={sending ? <CircularProgress size={12} sx={{ color: '#fff' }} /> : <Play size={14} weight="duotone" />}
            onClick={send}
            disabled={sending || !url.trim()}
            sx={{ flexShrink: 0, borderRadius: 1.5, fontFamily: MONO, fontSize: '0.75rem', minWidth: 80 }}
          >
            {sending ? 'Sending' : 'Send'}
          </Button>
        </Box>

        {/* Headers toggle */}
        <Box
          onClick={() => setShowHdrs(s => !s)}
          sx={{
            display: 'flex', alignItems: 'center', gap: 0.5,
            cursor: 'pointer', color: 'text.secondary',
            '&:hover': { color: 'text.primary' },
            mb: showHdrs ? 1 : 0,
            userSelect: 'none',
          }}
        >
          {showHdrs ? <CaretDown size={12} weight="duotone" /> : <CaretRight size={12} weight="duotone" />}
          <Typography sx={{ fontSize: '0.6875rem', fontFamily: MONO }}>
            Headers {headers.filter(h => h.key).length > 0 && `(${headers.filter(h => h.key).length})`}
          </Typography>
        </Box>

        <Collapse in={showHdrs}>
          <Box sx={{ mb: 1 }}>
            {headers.map((hdr, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
                <InputBase
                  placeholder="Header-Name"
                  value={hdr.key}
                  onChange={e => setHeaders(h => h.map((hh, j) => j === i ? { ...hh, key: e.target.value } : hh))}
                  sx={{
                    flex: 1, fontFamily: MONO, fontSize: '0.6875rem',
                    bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                    borderRadius: 1, px: 1, py: 0.375,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                />
                <InputBase
                  placeholder="value"
                  value={hdr.val}
                  onChange={e => setHeaders(h => h.map((hh, j) => j === i ? { ...hh, val: e.target.value } : hh))}
                  sx={{
                    flex: 2, fontFamily: MONO, fontSize: '0.6875rem',
                    bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                    borderRadius: 1, px: 1, py: 0.375,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                />
                <IconButton size="small" onClick={() => setHeaders(h => h.filter((_, j) => j !== i))} sx={{ p: 0.375 }}>
                  <X size={12} weight="duotone" />
                </IconButton>
              </Box>
            ))}
            <Button
              size="small"
              startIcon={<Plus size={12} weight="duotone" />}
              onClick={() => setHeaders(h => [...h, { key: '', val: '' }])}
              sx={{ fontSize: '0.6875rem', fontFamily: MONO, py: 0.25 }}
            >
              Add header
            </Button>
          </Box>
        </Collapse>

        {/* Body editor */}
        {hasBody && (
          <Box
            component="textarea"
            value={body}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value)}
            placeholder='{"key": "value"}'
            rows={4}
            sx={{
              width: '100%', resize: 'vertical', boxSizing: 'border-box',
              fontFamily: MONO, fontSize: '0.75rem',
              bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
              color: 'text.primary',
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 1, p: 1, outline: 'none',
              '&:focus': { borderColor: pri },
            }}
          />
        )}

        {/* Cache controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary', fontFamily: MONO }}>Cache GET</Typography>
            <Switch size="small" checked={cacheEnabled} onChange={e => onCacheToggle(e.target.checked)} sx={{ ml: -0.5 }} />
          </Box>
          {cacheEnabled && (
            <>
              <Typography sx={{ fontSize: '0.6875rem', color: 'text.disabled', fontFamily: MONO }}>
                {cacheStats.hits} hits · {cacheStats.misses} misses
              </Typography>
              <Tooltip title="Clear cache">
                <IconButton size="small" onClick={onCacheClear} sx={{ p: 0.375 }}>
                  <Trash size={12} weight="duotone" />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      </Box>

      {/* Response */}
      {response && (
        <>
          <Divider />
          <Box sx={{ bgcolor: respBg }}>
            {/* Response status bar */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 0.875, borderBottom: `1px solid ${theme.palette.divider}` }}>
              <StatusBadge status={response.status} />
              <Typography sx={{ fontFamily: MONO, fontSize: '0.6875rem', color: 'text.secondary' }}>
                {response.ms}ms
              </Typography>
              <Typography sx={{ fontFamily: MONO, fontSize: '0.6875rem', color: 'text.disabled' }}>
                {fmtSize(response.size)}
              </Typography>
              {response.cached && (
                <Chip label="cached" size="small" color="success" sx={{ height: 16, fontSize: '0.6rem', '& .MuiChip-label': { px: 0.5 } }} />
              )}
              <Box sx={{ flex: 1 }} />
              <Tooltip title="Copy response">
                <IconButton size="small" onClick={copyResponse} sx={{ p: 0.375, color: 'text.disabled', '&:hover': { color: 'text.primary' } }}>
                  <Copy size={13} weight="duotone" />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Response tabs */}
            <Box sx={{ display: 'flex', gap: 0.5, px: 1.5, pt: 0.75 }}>
              {(['body', 'headers'] as const).map(t => (
                <Box
                  key={t}
                  onClick={() => setTab(t)}
                  sx={{
                    px: 1, py: 0.375, borderRadius: 1, cursor: 'pointer', userSelect: 'none',
                    bgcolor: tab === t ? alpha(pri, 0.12) : 'transparent',
                    border: `1px solid ${tab === t ? alpha(pri, 0.3) : 'transparent'}`,
                    transition: 'all 120ms ease',
                  }}
                >
                  <Typography sx={{ fontFamily: MONO, fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.06em', color: tab === t ? pri : 'text.disabled' }}>
                    {t === 'body' ? 'BODY' : 'HEADERS'}
                    {t === 'headers' && ` (${Object.keys(response.headers).length})`}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Body */}
            {tab === 'body' && (
              <Box sx={{ px: 1.5, pb: 1.5, pt: 0.75, maxHeight: 320, overflowY: 'auto' }}>
                <Box
                  component="pre"
                  dangerouslySetInnerHTML={{
                    __html: response.headers['Content-Type']?.includes('json')
                      ? highlightJSON(response.body)
                      : response.body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
                  }}
                  sx={{
                    fontFamily: MONO, fontSize: '0.75rem', lineHeight: 1.6,
                    color: 'rgba(255,255,255,0.82)',
                    m: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}
                />
              </Box>
            )}

            {/* Response headers */}
            {tab === 'headers' && (
              <Box sx={{ px: 1.5, pb: 1.5, pt: 0.75, maxHeight: 260, overflowY: 'auto' }}>
                {Object.entries(response.headers).map(([k, v]) => (
                  <Box key={k} sx={{ display: 'flex', gap: 1, mb: 0.375, alignItems: 'baseline' }}>
                    <Typography sx={{ fontFamily: MONO, fontSize: '0.6875rem', color: '#61afef', flexShrink: 0, minWidth: 160 }}>
                      {k}
                    </Typography>
                    <Typography sx={{ fontFamily: MONO, fontSize: '0.6875rem', color: '#abb2bf', wordBreak: 'break-all' }}>
                      {v}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </>
      )}
    </Box>
  );
}

// ── Route row ──────────────────────────────────────────────────────────────────

interface RouteRowProps {
  route: RouteResult;
  port: number;
  selected: boolean;
  onSelect: () => void;
  cacheEnabled: boolean;
  onCacheToggle: (v: boolean) => void;
  cacheStats: { hits: number; misses: number };
  onCacheClear: () => void;
}

function RouteRow({ route, port, selected, onSelect, cacheEnabled, onCacheToggle, cacheStats, onCacheClear }: RouteRowProps) {
  const theme = useTheme();
  const pri   = theme.palette.primary.main;
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box>
      <Box
        onClick={onSelect}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          px: 1.5, py: 0.875,
          cursor: 'pointer',
          bgcolor: selected ? alpha(pri, 0.07) : 'transparent',
          borderLeft: `2px solid ${selected ? pri : 'transparent'}`,
          '&:hover': { bgcolor: selected ? alpha(pri, 0.09) : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)') },
          transition: 'all 120ms ease',
        }}
      >
        <MethodBadge method={route.method} />
        <Typography sx={{ fontFamily: MONO, fontSize: '0.8125rem', flex: 1, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {route.path}
        </Typography>
        {route.source === 'openapi' && (
          <Chip label="spec" size="small" sx={{ height: 16, fontSize: '0.5625rem', bgcolor: alpha('#56B6C2', 0.12), color: '#56B6C2', '& .MuiChip-label': { px: 0.5 } }} />
        )}
        {route.status > 0 && <StatusBadge status={route.status} />}
        {route.response_ms > 0 && (
          <Typography sx={{ fontFamily: MONO, fontSize: '0.6rem', color: 'text.disabled', flexShrink: 0, minWidth: 36, textAlign: 'right' }}>
            {route.response_ms}ms
          </Typography>
        )}
        {selected ? <CaretDown size={14} weight="duotone" color={pri} /> : <CaretRight size={14} weight="duotone" />}
      </Box>

      <Collapse in={selected}>
        <Box sx={{ px: 1.5, pb: 1.5 }}>
          <RouteTestPanel
            initialMethod={route.allowed_methods?.[0] ?? route.method}
            initialUrl={`http://localhost:${port}${route.path}`}
            cacheEnabled={cacheEnabled}
            onCacheToggle={onCacheToggle}
            cacheStats={cacheStats}
            onCacheClear={onCacheClear}
          />
        </Box>
      </Collapse>

      <Divider sx={{ opacity: 0.5 }} />
    </Box>
  );
}

// ── Database row ───────────────────────────────────────────────────────────────

function DBRow({ db }: { db: DBInfo }) {
  const theme = useTheme();
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 1.5,
      px: 2, py: 1.25,
      borderBottom: `1px solid ${theme.palette.divider}`,
    }}>
      <Database size={16} weight="duotone" color={db.status === 'online' ? theme.palette.success.main : theme.palette.text.disabled} />
      <Box sx={{ flex: 1 }}>
        <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
          {db.type}
          {db.note && <Typography component="span" sx={{ ml: 0.75, fontSize: '0.75rem', color: 'text.disabled' }}>({db.note})</Typography>}
        </Typography>
        <Typography sx={{ fontFamily: MONO, fontSize: '0.6875rem', color: 'text.secondary' }}>
          localhost:{db.port}
        </Typography>
      </Box>
      <Chip
        label={db.status}
        size="small"
        sx={{
          height: 20, fontSize: '0.6875rem',
          bgcolor: db.status === 'online' ? alpha(theme.palette.success.main, 0.12) : alpha(theme.palette.text.disabled, 0.08),
          color: db.status === 'online' ? 'success.main' : 'text.disabled',
          '& .MuiChip-label': { px: 0.75 },
        }}
      />
    </Box>
  );
}

// ── Service info banner ────────────────────────────────────────────────────────

function ServiceBanner({ service, port }: { service: ServiceInfo; port: number }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const pri    = theme.palette.primary.main;
  const bg     = isDark ? alpha('#fff', 0.03) : alpha(pri, 0.03);

  return (
    <Box sx={{ bgcolor: bg, borderBottom: `1px solid ${theme.palette.divider}`, px: 2, py: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <HealthDot health={service.health} />
          <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem' }}>
            {service.framework !== 'Unknown' ? service.framework : `localhost:${port}`}
          </Typography>
          {service.language !== '—' && service.language !== 'Unknown' && (
            <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>/ {service.language}</Typography>
          )}
        </Box>

        {service.version && (
          <Chip label={`v${service.version}`} size="small" variant="outlined"
            sx={{ height: 20, fontSize: '0.6875rem', '& .MuiChip-label': { px: 0.75 } }} />
        )}

        {service.environment && (
          <Chip
            label={service.environment}
            size="small"
            sx={{
              height: 20, fontSize: '0.6875rem',
              bgcolor: alpha(ENV_COLORS[service.environment] ?? '#ABB2BF', 0.12),
              color: ENV_COLORS[service.environment] ?? 'text.secondary',
              '& .MuiChip-label': { px: 0.75 },
            }}
          />
        )}

        {service.health !== 'unknown' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {service.health === 'ok'
              ? <CheckCircle size={14} weight="duotone" color={theme.palette.success.main} />
              : <XCircle size={14} weight="duotone" color={theme.palette.error.main} />}
            <Typography sx={{ fontSize: '0.75rem', color: service.health === 'ok' ? 'success.main' : 'error.main' }}>
              {service.health === 'ok' ? 'Healthy' : 'Degraded'}
              {service.health_url && ` · ${service.health_url}`}
            </Typography>
          </Box>
        )}

        {service.server_header && (
          <Typography sx={{ fontSize: '0.6875rem', color: 'text.disabled', fontFamily: MONO, ml: 'auto' }}>
            {service.server_header}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  port: number;
}

type PanelTab = 'routes' | 'databases' | 'service';

export default function AnalysisPanel({ port }: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const pri   = theme.palette.primary.main;

  const [panelTab, setPanelTab]   = useState<PanelTab>('routes');
  const [analysis,  setAnalysis]  = useState<AnalyzeResult | null>(null);
  const [databases, setDatabases] = useState<DBInfo[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [dbLoading, setDbLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null); // method|path
  const [cacheEnabled, setCacheEnabled]   = useState(false);
  const [cacheStats, setCacheStats]       = useState({ hits: 0, misses: 0 });
  const [methodFilter, setMethodFilter]   = useState<string | null>(null);

  const fetchAnalysis = useCallback(() => {
    setLoading(true);
    setError(null);
    setSelectedRoute(null);
    fetch(`${SCANNER}/api/analyze?port=${port}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d: AnalyzeResult) => setAnalysis(d))
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [port]);

  useEffect(() => { fetchAnalysis(); }, [fetchAnalysis]);

  useEffect(() => {
    if (panelTab !== 'databases') return;
    setDbLoading(true);
    fetch(`${SCANNER}/api/databases`)
      .then(r => r.json())
      .then(d => setDatabases(d.databases ?? []))
      .finally(() => setDbLoading(false));
  }, [panelTab]);

  const clearCache = async () => {
    await fetch(`${SCANNER}/api/proxy`, { method: 'DELETE' });
    setCacheStats({ hits: 0, misses: 0 });
  };

  const routes = analysis?.routes ?? [];
  const filteredRoutes = methodFilter ? routes.filter(r => r.method === methodFilter) : routes;
  const methods = [...new Set(routes.map(r => r.method))].sort();

  const bg     = isDark ? theme.palette.background.default : '#fff';
  const hdrBg  = isDark ? alpha('#fff', 0.03) : alpha(pri, 0.02);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: bg, overflow: 'hidden' }}>

      {/* Top header */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1,
        px: 2, py: 1,
        bgcolor: hdrBg,
        borderBottom: `1px solid ${theme.palette.divider}`,
        flexShrink: 0,
      }}>
        <Binoculars size={18} weight="duotone" color={pri} />
        <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: pri }}>
          Analyze
        </Typography>
        <Typography sx={{ fontFamily: MONO, fontSize: '0.875rem', color: 'text.secondary' }}>
          localhost:{port}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Re-analyze">
          <IconButton size="small" onClick={fetchAnalysis} disabled={loading}
            sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}>
            {loading
              ? <CircularProgress size={14} />
              : <ArrowClockwise size={16} weight="duotone" />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Service banner */}
      {analysis && <ServiceBanner service={analysis.service} port={port} />}

      {/* Tab bar */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 0.5,
        px: 1.5, py: 0.75,
        borderBottom: `1px solid ${theme.palette.divider}`,
        bgcolor: hdrBg,
        flexShrink: 0,
      }}>
        {([
          { id: 'routes',    label: 'API Routes',   icon: <StackSimple size={13} weight="duotone" />, count: routes.length as number | undefined },
          { id: 'databases', label: 'Databases',    icon: <Database    size={13} weight="duotone" />, count: databases.length || (undefined as number | undefined) },
          { id: 'service',   label: 'Service Info', icon: <Info        size={13} weight="duotone" />, count: undefined as number | undefined },
        ]).map(t => (
          <Box
            key={t.id}
            onClick={() => setPanelTab(t.id as PanelTab)}
            sx={{
              display: 'flex', alignItems: 'center', gap: 0.625,
              px: 1.25, py: 0.5, borderRadius: 1.5, cursor: 'pointer',
              bgcolor: panelTab === t.id ? alpha(pri, 0.10) : 'transparent',
              border: `1px solid ${panelTab === t.id ? alpha(pri, 0.3) : 'transparent'}`,
              transition: 'all 120ms ease',
              '&:hover': { bgcolor: panelTab === t.id ? alpha(pri, 0.10) : alpha(pri, 0.05) },
              userSelect: 'none',
            }}
          >
            <Box sx={{ color: panelTab === t.id ? pri : 'text.secondary' }}>{t.icon}</Box>
            <Typography sx={{
              fontSize: '0.75rem', fontWeight: panelTab === t.id ? 600 : 400,
              color: panelTab === t.id ? pri : 'text.secondary',
            }}>
              {t.label}
            </Typography>
            {t.count !== undefined && t.count > 0 && (
              <Chip label={t.count} size="small" sx={{
                height: 16, fontSize: '0.5625rem', fontWeight: 700,
                bgcolor: panelTab === t.id ? alpha(pri, 0.15) : alpha(theme.palette.text.disabled, 0.1),
                color: panelTab === t.id ? pri : 'text.secondary',
                '& .MuiChip-label': { px: 0.625 },
              }} />
            )}
          </Box>
        ))}
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

        {/* Loading */}
        {loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: 2 }}>
            <CircularProgress size={32} />
            <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
              Scanning localhost:{port}…
            </Typography>
            <Typography sx={{ color: 'text.disabled', fontSize: '0.75rem' }}>
              Probing {30} paths, checking OpenAPI specs
            </Typography>
          </Box>
        )}

        {error && !loading && (
          <Box sx={{ p: 2 }}>
            <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>
            <Button size="small" startIcon={<ArrowClockwise size={14} weight="duotone" />} onClick={fetchAnalysis}>
              Retry
            </Button>
          </Box>
        )}

        {/* ── Routes tab ── */}
        {!loading && !error && panelTab === 'routes' && (
          <Box>
            {/* Method filter */}
            {methods.length > 1 && (
              <Box sx={{ display: 'flex', gap: 0.5, px: 1.5, py: 0.875, borderBottom: `1px solid ${theme.palette.divider}`, flexWrap: 'wrap' }}>
                <Box
                  onClick={() => setMethodFilter(null)}
                  sx={{
                    px: 0.875, py: 0.25, borderRadius: 1, cursor: 'pointer', userSelect: 'none',
                    bgcolor: methodFilter === null ? alpha(pri, 0.12) : 'transparent',
                    border: `1px solid ${methodFilter === null ? alpha(pri, 0.3) : 'transparent'}`,
                    '&:hover': { bgcolor: alpha(pri, 0.07) },
                  }}
                >
                  <Typography sx={{ fontFamily: MONO, fontSize: '0.6rem', fontWeight: 700, color: methodFilter === null ? pri : 'text.secondary' }}>
                    ALL ({routes.length})
                  </Typography>
                </Box>
                {methods.map(m => (
                  <Box
                    key={m}
                    onClick={() => setMethodFilter(methodFilter === m ? null : m)}
                    sx={{
                      px: 0.875, py: 0.25, borderRadius: 1, cursor: 'pointer', userSelect: 'none',
                      bgcolor: methodFilter === m ? alpha(mc(m), 0.15) : 'transparent',
                      border: `1px solid ${methodFilter === m ? alpha(mc(m), 0.35) : 'transparent'}`,
                      '&:hover': { bgcolor: alpha(mc(m), 0.08) },
                    }}
                  >
                    <Typography sx={{ fontFamily: MONO, fontSize: '0.6rem', fontWeight: 700, color: mc(m) }}>
                      {m} ({routes.filter(r => r.method === m).length})
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}

            {filteredRoutes.length === 0 ? (
              <Box sx={{ px: 2, py: 4, textAlign: 'center' }}>
                <Binoculars size={32} weight="duotone" opacity={0.15} />
                <Typography sx={{ color: 'text.disabled', mt: 1 }}>No routes discovered</Typography>
                <Typography sx={{ color: 'text.disabled', fontSize: '0.75rem', mt: 0.5 }}>
                  Service may not expose API endpoints on common paths
                </Typography>
              </Box>
            ) : (
              filteredRoutes.map(r => {
                const key = `${r.method}|${r.path}`;
                return (
                  <RouteRow
                    key={key}
                    route={r}
                    port={port}
                    selected={selectedRoute === key}
                    onSelect={() => setSelectedRoute(selectedRoute === key ? null : key)}
                    cacheEnabled={cacheEnabled}
                    onCacheToggle={setCacheEnabled}
                    cacheStats={cacheStats}
                    onCacheClear={clearCache}
                  />
                );
              })
            )}
          </Box>
        )}

        {/* ── Databases tab ── */}
        {panelTab === 'databases' && (
          <Box>
            {dbLoading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 2 }}>
                <CircularProgress size={16} />
                <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>Scanning database ports…</Typography>
              </Box>
            )}
            {!dbLoading && databases.length === 0 && (
              <Box sx={{ px: 2, py: 4, textAlign: 'center' }}>
                <Database size={32} weight="duotone" opacity={0.15} />
                <Typography sx={{ color: 'text.disabled', mt: 1 }}>No databases detected</Typography>
                <Typography sx={{ color: 'text.disabled', fontSize: '0.75rem', mt: 0.5 }}>
                  Scanned 26 common ports (Postgres, Redis, Mongo, MySQL…)
                </Typography>
              </Box>
            )}
            {databases.map(db => (
              <DBRow key={`${db.type}-${db.port}`} db={db} />
            ))}
          </Box>
        )}

        {/* ── Service info tab ── */}
        {panelTab === 'service' && analysis && (
          <Box sx={{ p: 2 }}>
            {[
              ['Framework',    analysis.service.framework],
              ['Language',     analysis.service.language],
              ['Version',      analysis.service.version      || '—'],
              ['Environment',  analysis.service.environment  || '—'],
              ['Health',       analysis.service.health],
              ['Health URL',   analysis.service.health_url   || '—'],
              ['Server',       analysis.service.server_header || '—'],
            ].map(([label, value]) => (
              <Box key={label} sx={{ mb: 1.75 }}>
                <Typography variant="overline" sx={{ color: 'text.disabled', fontSize: '0.625rem', lineHeight: 1.4, display: 'block' }}>
                  {label}
                </Typography>
                <Typography sx={{ fontFamily: MONO, fontSize: '0.875rem', fontWeight: 500, color: 'text.primary' }}>
                  {value}
                </Typography>
              </Box>
            ))}

            <Divider sx={{ my: 2 }} />

            <Typography variant="overline" sx={{ color: 'text.disabled', fontSize: '0.625rem', display: 'block', mb: 1 }}>
              Discovered Routes
            </Typography>
            <Typography sx={{ fontFamily: MONO, fontSize: '0.875rem', color: 'text.primary' }}>
              {routes.filter(r => r.source === 'probe').length} probed
              {' · '}
              {routes.filter(r => r.source === 'openapi').length} from spec
              {' · '}
              {routes.length} total
            </Typography>
          </Box>
        )}

        {panelTab === 'service' && !analysis && !loading && (
          <Box sx={{ px: 2, py: 4, textAlign: 'center' }}>
            <Warning size={32} weight="duotone" opacity={0.15} />
            <Typography sx={{ color: 'text.disabled', mt: 1 }}>No service data</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
