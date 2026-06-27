import { useState } from 'react';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import { alpha, useTheme } from '@mui/material/styles';
import {
  Gear,
  MagnifyingGlass,
  Terminal,
  Bug,
  ArrowClockwise,
  CheckCircle,
  Plugs,
} from '@phosphor-icons/react';
import { invoke } from '@tauri-apps/api/core';

interface Props {
  activePort:          number | null;
  logsOpen:            boolean;
  onToggleLogs:        () => void;
  onOpenAIIntegrations?: () => void;
}

function wvLabel(port: number) { return `browser-${port}`; }

export default function DevToolsMenu({ activePort, logsOpen, onToggleLogs, onOpenAIIntegrations }: Props) {
  const theme  = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const close = () => setAnchor(null);

  const paperSx = {
    minWidth: 220,
    bgcolor: isDark ? '#1A1D24' : '#ffffff',
    backgroundImage: 'none',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
    borderRadius: 2,
    boxShadow: isDark
      ? '0 8px 32px rgba(0,0,0,0.6)'
      : '0 8px 32px rgba(0,0,0,0.14)',
    overflow: 'hidden',
  };

  const itemSx = {
    px: 1.75,
    py: 0.875,
    borderRadius: 1,
    mx: 0.5,
    my: 0.125,
    '&:hover': {
      bgcolor: isDark ? 'rgba(255,255,255,0.06)' : alpha(theme.palette.primary.main, 0.06),
    },
  };

  const iconSx = { minWidth: 32 };

  return (
    <>
      <Tooltip title="DevTools">
        <IconButton
          size="small"
          onClick={e => setAnchor(e.currentTarget)}
          sx={{
            color: logsOpen ? 'primary.main' : 'inherit',
            '&:hover': { color: 'primary.main' },
          }}
        >
          <Gear size={18} weight="duotone" />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: paperSx } }}
        sx={{ '& .MuiList-root': { py: 0.5 } }}
      >
        {/* Header */}
        <Typography sx={{
          px: 2.25, pt: 1.25, pb: 0.75,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.10em',
          color: 'text.disabled',
          userSelect: 'none',
        }}>
          DEVTOOLS
        </Typography>

        {/* Inspect page */}
        <MenuItem
          onClick={async () => {
            if (activePort) await invoke('browser_devtools', { label: wvLabel(activePort) }).catch(() => {});
            close();
          }}
          disabled={!activePort}
          sx={itemSx}
        >
          <ListItemIcon sx={iconSx}>
            <MagnifyingGlass size={16} weight="duotone" />
          </ListItemIcon>
          <ListItemText
            primary="Inspect page"
            secondary={activePort ? `localhost:${activePort}` : 'No browser tab open'}
            slotProps={{
              primary: { sx: { fontSize: '0.875rem', fontWeight: 500 } },
              secondary: { sx: { fontSize: '0.75rem' } },
            }}
          />
        </MenuItem>

        {/* Console toggle */}
        <MenuItem
          onClick={() => { onToggleLogs(); close(); }}
          sx={itemSx}
        >
          <ListItemIcon sx={iconSx}>
            <Terminal size={16} weight="duotone" />
          </ListItemIcon>
          <ListItemText
            primary="Console"
            slotProps={{ primary: { sx: { fontSize: '0.875rem', fontWeight: 500 } } }}
          />
          {logsOpen && <CheckCircle size={14} color={theme.palette.primary.main} weight="duotone" />}
        </MenuItem>

        {/* Inspect Sonar shell */}
        <MenuItem
          onClick={async () => {
            await invoke('open_devtools').catch(() => {});
            close();
          }}
          sx={itemSx}
        >
          <ListItemIcon sx={iconSx}>
            <Bug size={16} weight="duotone" />
          </ListItemIcon>
          <ListItemText
            primary="Inspect Sonar"
            secondary="Opens shell inspector"
            slotProps={{
              primary: { sx: { fontSize: '0.875rem', fontWeight: 500 } },
              secondary: { sx: { fontSize: '0.75rem' } },
            }}
          />
        </MenuItem>

        <Divider sx={{ my: 0.5, opacity: 0.5 }} />

        {/* AI Integrations */}
        <MenuItem
          onClick={() => { onOpenAIIntegrations?.(); close(); }}
          sx={itemSx}
        >
          <ListItemIcon sx={iconSx}>
            <Plugs size={16} weight="duotone" />
          </ListItemIcon>
          <ListItemText
            primary="AI Integrations"
            secondary="Connect Claude, Cursor, Windsurf…"
            slotProps={{
              primary: { sx: { fontSize: '0.875rem', fontWeight: 500 } },
              secondary: { sx: { fontSize: '0.75rem' } },
            }}
          />
        </MenuItem>

        <Divider sx={{ my: 0.5, opacity: 0.5 }} />

        {/* Reload Sonar */}
        <MenuItem
          onClick={() => { close(); setTimeout(() => window.location.reload(), 80); }}
          sx={itemSx}
        >
          <ListItemIcon sx={iconSx}>
            <ArrowClockwise size={16} weight="duotone" />
          </ListItemIcon>
          <ListItemText
            primary="Reload Sonar"
            slotProps={{ primary: { sx: { fontSize: '0.875rem', fontWeight: 500 } } }}
          />
        </MenuItem>
      </Menu>
    </>
  );
}
