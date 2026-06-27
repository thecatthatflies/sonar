import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import {
  ArrowSquareOut,
  Copy,
  Trash,
  Info,
  EyeSlash,
} from '@phosphor-icons/react';

interface Props {
  anchor: HTMLElement | null;
  port: number;
  processName: string;
  onClose: () => void;
  onOpenInTab: () => void;
  onCopyUrl: () => void;
  onKillRequest: () => void;
  onShowDetails: () => void;
  onHide: () => void;
}

export default function PortContextMenu({
  anchor, port, processName,
  onClose, onOpenInTab, onCopyUrl, onKillRequest, onShowDetails, onHide,
}: Props) {
  const theme  = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const pri    = theme.palette.primary.main;

  const iconProps = { size: 16, weight: 'duotone' as const };

  const item = (
    icon: React.ReactNode,
    label: string,
    handler: () => void,
    opts?: { danger?: boolean; dividerAbove?: boolean }
  ) => (
    <>
      {opts?.dividerAbove && <Divider sx={{ my: 0.5 }} />}
      <MenuItem
        onClick={() => { onClose(); handler(); }}
        sx={{
          py: 0.75,
          px: 1.5,
          borderRadius: 1.5,
          mx: 0.5,
          minWidth: 200,
          gap: 1,
          color: opts?.danger ? 'error.main' : 'text.primary',
          '&:hover': {
            bgcolor: opts?.danger
              ? alpha(theme.palette.error.main, 0.10)
              : alpha(pri, 0.08),
          },
        }}
      >
        <ListItemIcon sx={{ minWidth: 24, color: 'inherit' }}>
          {icon}
        </ListItemIcon>
        <ListItemText
          primary={label}
          slotProps={{ primary: { sx: { fontSize: '0.8125rem', fontWeight: 500 } } }}
        />
      </MenuItem>
    </>
  );

  return (
    <Menu
      anchorEl={anchor}
      open={Boolean(anchor)}
      onClose={onClose}
      slotProps={{
        paper: {
          elevation: 4,
          sx: {
            mt: 0.5,
            borderRadius: 2,
            minWidth: 220,
            bgcolor: isDark ? '#252525' : '#fff',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
            py: 0.75,
            backgroundImage: 'none',
          },
        },
      }}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
    >
      {/* Header */}
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          px: 2, pb: 0.5,
          color: 'text.disabled',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.6875rem',
          letterSpacing: '0.04em',
        }}
      >
        :{port} · {processName}
      </Typography>
      <Divider sx={{ mb: 0.5 }} />

      {item(<ArrowSquareOut {...iconProps} />, 'Open in new tab', onOpenInTab)}
      {item(<Copy {...iconProps} />, 'Copy URL', onCopyUrl)}
      {item(<Info {...iconProps} />, 'Show details', onShowDetails)}

      {item(<EyeSlash {...iconProps} />, 'Hide port', onHide, { dividerAbove: true })}
      {item(
        <Trash {...iconProps} color={theme.palette.error.main} />,
        'Kill port',
        onKillRequest,
        { danger: true },
      )}
    </Menu>
  );
}
