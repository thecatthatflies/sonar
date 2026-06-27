import { useState, useEffect, useCallback } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import { useTheme, alpha } from '@mui/material/styles';
import { X, CheckCircle, Warning, ArrowClockwise, Plugs } from '@phosphor-icons/react';
import { invoke } from '@tauri-apps/api/core';
import { open as shellOpen } from '@tauri-apps/plugin-shell';

// ── Agent definitions ─────────────────────────────────────────────────────────

interface Agent {
  id: string;
  name: string;
  description: string;
  configPath: string;
  configTemplate: (path: string) => string;
  mergeKey?: string; // top-level JSON key to merge into existing config
  restartHint: string;
  docsUrl?: string;
}

const AGENTS: Agent[] = [
  {
    id: 'claude-desktop',
    name: 'Claude Desktop',
    description: 'Anthropic\'s desktop app',
    configPath: '~/Library/Application Support/Claude/claude_desktop_config.json',
    mergeKey: 'mcpServers',
    configTemplate: (p) => JSON.stringify({ mcpServers: { sonar: { command: p, args: [] } } }, null, 2),
    restartHint: 'Restart Claude Desktop to activate.',
  },
  {
    id: 'claude-code',
    name: 'Claude Code',
    description: 'CLI & IDE extension',
    configPath: '.mcp.json',
    mergeKey: 'mcpServers',
    configTemplate: (p) => JSON.stringify({ mcpServers: { sonar: { type: 'stdio', command: p, args: [], env: {} } } }, null, 2),
    restartHint: 'Claude Code picks up .mcp.json automatically in the project root.',
  },
  {
    id: 'cursor',
    name: 'Cursor',
    description: 'AI code editor',
    configPath: '~/.cursor/mcp.json',
    mergeKey: 'mcpServers',
    configTemplate: (p) => JSON.stringify({ mcpServers: { sonar: { command: p, args: [] } } }, null, 2),
    restartHint: 'Restart Cursor or reload the MCP servers in settings.',
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    description: 'Codeium\'s AI editor',
    configPath: '~/.codeium/windsurf/mcp_config.json',
    mergeKey: 'mcpServers',
    configTemplate: (p) => JSON.stringify({ mcpServers: { sonar: { command: p, args: [] } } }, null, 2),
    restartHint: 'Restart Windsurf to activate.',
  },
  {
    id: 'continue',
    name: 'Continue',
    description: 'Open-source AI coding',
    configPath: '~/.continue/config.json',
    configTemplate: (p) => JSON.stringify({
      experimental: {
        modelContextProtocolServers: [{
          transport: { type: 'stdio', command: p, args: [] },
        }],
      },
    }, null, 2),
    restartHint: 'Reload VS Code or JetBrains after saving.',
  },
  {
    id: 'cline',
    name: 'Cline',
    description: 'VS Code agent extension',
    configPath: '~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json',
    mergeKey: 'mcpServers',
    configTemplate: (p) => JSON.stringify({
      mcpServers: { sonar: { command: p, args: [], disabled: false, autoApprove: ['list_running_ports', 'get_port_info', 'list_databases', 'get_system_info', 'scan_port_range', 'filter_ports', 'get_service_health'] } },
    }, null, 2),
    restartHint: 'Click "Refresh" in Cline\'s MCP panel.',
  },
  {
    id: 'zed',
    name: 'Zed',
    description: 'Fast collaborative editor',
    configPath: '~/.config/zed/settings.json',
    configTemplate: (p) => JSON.stringify({ context_servers: { sonar: { command: { path: p, args: [] }, settings: {} } } }, null, 2),
    restartHint: 'Restart Zed to activate.',
  },
];

// ── Agent logo SVGs ───────────────────────────────────────────────────────────

function AgentLogo({ id, size = 22 }: { id: string; size?: number }) {
  const theme = useTheme();
  const c = theme.palette.mode === 'dark' ? '#E2E6F0' : '#111827';

  switch (id) {
    case 'claude-desktop': case 'claude-code':
      return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M13.827 3.52h3.603L24 20h-3.603l-6.57-16.48zm-3.654 0H6.57L0 20h3.603l1.357-3.415h6.396l1.357 3.415h3.603L10.173 3.52zm-3.55 10.146 2.178-5.5 2.178 5.5H6.624z" fill={c} /></svg>;
    case 'cursor':
      return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case 'windsurf':
      return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M3 18C3 18 7 4 12 4C17 4 21 12 21 12" stroke={c} strokeWidth="2" strokeLinecap="round"/><path d="M3 18C9 14 12 14 15 14C18 14 21 12 21 12" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2"/><circle cx="12" cy="14" r="2.5" fill={c}/></svg>;
    case 'continue':
      return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1.5" fill={c}/><rect x="14" y="3" width="7" height="7" rx="1.5" fill={c} opacity="0.55"/><rect x="3" y="14" width="7" height="7" rx="1.5" fill={c} opacity="0.55"/><rect x="14" y="14" width="7" height="7" rx="1.5" fill={c} opacity="0.28"/></svg>;
    case 'cline':
      return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><polyline points="4,17 8,13 4,9" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="19" x2="20" y2="19" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg>;
    case 'zed':
      return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M4 6h16L4 18h16" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    default:
      return <Plugs size={size} color={c} weight="duotone" />;
  }
}

// ── Status type ───────────────────────────────────────────────────────────────

type ConnectStatus = 'idle' | 'connecting' | 'connected' | 'error';

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AIIntegrations({ open, onClose }: Props) {
  const theme  = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const pri    = theme.palette.primary.main;

  const [mcpPath,     setMcpPath]     = useState('');
  const [pathReady,   setPathReady]   = useState(false);
  const [statuses,    setStatuses]    = useState<Record<string, ConnectStatus>>({});
  const [errors,      setErrors]      = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    invoke<string>('get_mcp_path')
      .then(p => { setMcpPath(p); setPathReady(true); })
      .catch(() => setPathReady(true));
  }, [open]);

  const setStatus = (id: string, s: ConnectStatus) =>
    setStatuses(prev => ({ ...prev, [id]: s }));
  const setError = (id: string, msg: string) =>
    setErrors(prev => ({ ...prev, [id]: msg }));

  const connect = useCallback(async (agent: Agent) => {
    if (!mcpPath) return;
    setStatus(agent.id, 'connecting');
    setError(agent.id, '');

    try {
      let finalContent = agent.configTemplate(mcpPath);

      // If the agent uses a mergeKey, try to merge into existing config
      if (agent.mergeKey) {
        try {
          const existing = await invoke<string>('read_file', { path: agent.configPath });
          const parsed = JSON.parse(existing);
          const newSection = JSON.parse(finalContent);
          const merged = {
            ...parsed,
            [agent.mergeKey]: {
              ...(parsed[agent.mergeKey] ?? {}),
              ...newSection[agent.mergeKey],
            },
          };
          finalContent = JSON.stringify(merged, null, 2);
        } catch {
          // File doesn't exist or isn't valid JSON — just use the template
        }
      }

      await invoke('write_mcp_config', { path: agent.configPath, content: finalContent });
      setStatus(agent.id, 'connected');
    } catch (e: unknown) {
      setStatus(agent.id, 'error');
      setError(agent.id, String(e));
    }
  }, [mcpPath]);

  const border  = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const bg      = isDark ? '#0C0E14' : '#FFFFFF';
  const cardBg  = isDark ? '#131620' : '#F3F4F8';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      slotProps={{
        paper: {
          sx: {
            width: 680,
            maxWidth: '95vw',
            maxHeight: '90vh',
            bgcolor: bg,
            backgroundImage: 'none',
            border: `1px solid ${border}`,
            borderRadius: 3,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', px: 3, py: 2, borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
        <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: alpha(pri, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 1.5 }}>
          <Plugs size={17} weight="duotone" color={pri} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', lineHeight: 1.2 }}>
            Connect AI Assistant
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
            One click to give your AI live access to port data
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'text.disabled', '&:hover': { color: 'text.primary' } }}>
          <X size={16} weight="duotone" />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 2.5, overflowY: 'auto' }}>
        {/* Status banner if binary not resolved */}
        {pathReady && !mcpPath && (
          <Box sx={{ mb: 2, px: 2, py: 1.25, borderRadius: 2, bgcolor: alpha(theme.palette.warning.main, 0.08), border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}` }}>
            <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
              MCP binary not found. Run <code style={{ fontFamily: 'monospace', fontSize: 12 }}>pnpm tauri build</code> first.
            </Typography>
          </Box>
        )}

        {/* Agent cards */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {AGENTS.map(agent => {
            const status = statuses[agent.id] ?? 'idle';
            const err    = errors[agent.id] ?? '';

            return (
              <Box
                key={agent.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  px: 2,
                  py: 1.5,
                  borderRadius: 2,
                  bgcolor: cardBg,
                  border: `1px solid ${status === 'connected'
                    ? alpha(theme.palette.success.main, 0.35)
                    : status === 'error'
                    ? alpha(theme.palette.error.main, 0.25)
                    : border}`,
                  transition: 'border-color 200ms ease',
                }}
              >
                {/* Logo */}
                <Box sx={{ flexShrink: 0 }}>
                  <AgentLogo id={agent.id} size={22} />
                </Box>

                {/* Name + desc */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', lineHeight: 1.2 }}>
                      {agent.name}
                    </Typography>
                    {status === 'connected' && (
                      <Chip
                        label="Connected"
                        size="small"
                        icon={<CheckCircle size={11} weight="fill" />}
                        sx={{ height: 18, fontSize: '0.6rem', fontWeight: 600, bgcolor: alpha(theme.palette.success.main, 0.12), color: 'success.main', '& .MuiChip-label': { px: 0.75 }, '& .MuiChip-icon': { ml: 0.5 } }}
                      />
                    )}
                    {status === 'error' && (
                      <Chip
                        label="Failed"
                        size="small"
                        icon={<Warning size={11} weight="fill" />}
                        sx={{ height: 18, fontSize: '0.6rem', fontWeight: 600, bgcolor: alpha(theme.palette.error.main, 0.10), color: 'error.main', '& .MuiChip-label': { px: 0.75 }, '& .MuiChip-icon': { ml: 0.5 } }}
                      />
                    )}
                  </Box>
                  <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.125 }}>
                    {status === 'connected'
                      ? agent.restartHint
                      : status === 'error'
                      ? err
                      : agent.description}
                  </Typography>
                </Box>

                {/* Action */}
                <Box sx={{ flexShrink: 0, display: 'flex', gap: 0.75 }}>
                  {status === 'connected' ? (
                    <Tooltip title="Open config file">
                      <IconButton
                        size="small"
                        onClick={() => shellOpen(agent.configPath.replace('~', '$HOME')).catch(() => {})}
                        sx={{ color: 'text.disabled', '&:hover': { color: pri } }}
                      >
                        <ArrowClockwise size={15} weight="duotone" />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Button
                      size="small"
                      variant={status === 'error' ? 'outlined' : 'contained'}
                      disableElevation
                      disabled={!pathReady || !mcpPath || status === 'connecting'}
                      onClick={() => connect(agent)}
                      sx={{
                        fontSize: '0.78rem',
                        py: 0.375,
                        px: 1.625,
                        borderRadius: 6,
                        minWidth: 80,
                        color: status === 'error' ? 'error.main' : undefined,
                        borderColor: status === 'error' ? 'error.main' : undefined,
                      }}
                    >
                      {status === 'connecting' ? 'Connecting...'
                        : status === 'error'   ? 'Retry'
                        : 'Connect'}
                    </Button>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* Footer note */}
        <Typography sx={{ mt: 2.5, fontSize: '0.71875rem', color: 'text.disabled', textAlign: 'center' }}>
          Sonar writes the config to the correct location automatically. Your AI gets 12 tools: port monitoring, service analysis, database discovery, HTTP testing, and more.
        </Typography>
      </DialogContent>
    </Dialog>
  );
}
