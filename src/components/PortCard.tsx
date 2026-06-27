import { useState, MouseEvent } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Tooltip from '@mui/material/Tooltip';
import { useTheme, alpha } from '@mui/material/styles';
import {
  DotsThreeVertical, Funnel, ArrowSquareOut, EyeSlash, Eye,
  Cylinder, Trash, X,
} from '@phosphor-icons/react';
import { useToast } from '../lib/toast';
import PortContextMenu from './PortContextMenu';
import PortDetailsModal from './PortDetailsModal';
import type { PortInfo } from '../types';
import type { Visibility } from '../lib/portFilter';
import { MONO } from '../theme';

interface Props {
  info: PortInfo;
  isNew: boolean;
  isDisconnected: boolean;
  disconnectedSecondsAgo: number | null;
  selected: boolean;
  visibility: Visibility;
  showAll: boolean;
  onClick: () => void;
  onHide: () => void;
  onRestore: () => void;
  onOpenInTab?: (port: number) => void;
}

export default function PortCard({
  info, isNew, isDisconnected, disconnectedSecondsAgo,
  selected, visibility, showAll, onClick, onHide, onRestore, onOpenInTab,
}: Props) {
  const theme   = useTheme();
  const isDark  = theme.palette.mode === 'dark';
  const pri     = theme.palette.primary.main;
  const toast   = useToast();
  const isFiltered = visibility !== 'visible';

  const [menuAnchor,  setMenuAnchor]  = useState<HTMLElement | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [confirmKill, setConfirmKill] = useState(false);
  const [killing,     setKilling]     = useState(false);

  if (isFiltered && !showAll) return null;

  const liveStatus = isDisconnected ? 'gone'
    : isNew        ? 'new'
    : isFiltered   ? 'filtered'
    : 'online';

  const statusDef = {
    new:      { label: 'New',  dot: pri },
    online:   { label: 'Live', dot: theme.palette.success.main },
    gone:     { label: disconnectedSecondsAgo !== null ? `${disconnectedSecondsAgo}s` : 'Gone', dot: theme.palette.text.disabled },
    filtered: { label: visibility === 'user-hidden' ? 'Hidden' : 'Filtered', dot: theme.palette.text.disabled },
  }[liveStatus];

  const copyUrl = () => {
    const url = `http://localhost:${info.port}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success(`Copied ${url}`),
      () => toast.error('Clipboard unavailable'),
    );
  };

  const killPort = async () => {
    setKilling(true);
    try {
      const res  = await fetch('http://localhost:5757/api/kill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: info.port }),
      });
      const data = await res.json() as { success: boolean; message: string };
      if (data.success) toast.success(`Port ${info.port} killed`);
      else toast.error(`Kill failed: ${data.message}`);
    } catch {
      toast.error(`Failed to kill port ${info.port}`);
    } finally {
      setKilling(false);
      setConfirmKill(false);
    }
  };

  const borderColor = selected && !isFiltered
    ? alpha(pri, 0.55)
    : isNew && !isFiltered
    ? alpha(theme.palette.success.main, 0.45)
    : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  const faded = isFiltered || isDisconnected;

  return (
    <>
      <Box
        sx={{
          px: 1.25, mb: 0.375,
          '&:hover .port-row-actions': { opacity: 1 },
        }}
      >
        <Box
          sx={{
            borderRadius: 1.5,
            border: `1px solid ${borderColor}`,
            bgcolor: selected && !isFiltered
              ? alpha(pri, 0.07)
              : isNew && !isFiltered
              ? alpha(theme.palette.success.main, 0.04)
              : 'transparent',
            opacity: faded ? 0.45 : 1,
            filter: isFiltered ? 'saturate(0.35)' : 'none',
            transition: 'border-color 160ms ease, background 160ms ease, opacity 200ms ease',
            cursor: !isFiltered && !isDisconnected ? 'pointer' : 'default',
            animation: isNew && !isFiltered ? 'portGlow 2s ease-in-out infinite' : 'none',
            '@keyframes portGlow': {
              '0%, 100%': { boxShadow: `0 0 0 0 ${alpha(theme.palette.success.main, 0.3)}` },
              '50%':      { boxShadow: `0 0 0 4px ${alpha(theme.palette.success.main, 0)}` },
            },
            '&:hover': !faded ? {
              bgcolor: selected
                ? alpha(pri, 0.10)
                : isDark ? 'rgba(255,255,255,0.03)' : alpha(pri, 0.03),
              borderColor: selected
                ? alpha(pri, 0.7)
                : isDark ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.13)',
            } : {},
          }}
          onClick={!faded ? onClick : undefined}
          onContextMenu={(e: MouseEvent<HTMLDivElement>) => {
            if (faded) return;
            e.preventDefault();
            setMenuAnchor(e.currentTarget);
          }}
        >
          {/* Row 1: port number + status */}
          <Box sx={{ display: 'flex', alignItems: 'center', px: 1.5, pt: 1.125, pb: 0.25, gap: 0.75 }}>
            <Cylinder
              size={13}
              weight="duotone"
              color={faded ? theme.palette.text.disabled : selected ? pri : theme.palette.text.secondary}
            />
            <Typography
              sx={{
                fontFamily: MONO,
                fontWeight: 700,
                fontSize: '1.05rem',
                color: faded ? 'text.disabled' : selected ? 'primary.main' : 'text.primary',
                letterSpacing: '-0.03em',
                lineHeight: 1,
                flex: 1,
              }}
            >
              :{info.port}
            </Typography>

            {!isFiltered ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                <Box
                  sx={{
                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                    bgcolor: statusDef.dot,
                    boxShadow: (liveStatus === 'online' || liveStatus === 'new')
                      ? `0 0 0 2px ${alpha(statusDef.dot, 0.22)}`
                      : 'none',
                  }}
                />
                <Typography
                  sx={{
                    fontSize: '0.6rem',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    color: 'text.disabled',
                    textTransform: 'uppercase',
                    lineHeight: 1,
                  }}
                >
                  {statusDef.label}
                </Typography>
              </Box>
            ) : (
              <Funnel size={11} weight="duotone" color={theme.palette.text.disabled} />
            )}
          </Box>

          {/* Row 2: process name + PID + actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', px: 1.5, pb: 1, gap: 0.5 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                noWrap
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: faded ? 'text.disabled' : 'text.secondary',
                  lineHeight: 1.25,
                }}
              >
                {info.process_name}
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.625rem',
                  fontFamily: MONO,
                  color: 'text.disabled',
                  lineHeight: 1.4,
                }}
              >
                pid {info.pid}
              </Typography>
            </Box>

            {/* Actions: visible on hover / always on selected */}
            {!isFiltered && !isDisconnected && (
              <Box
                className="port-row-actions"
                sx={{
                  display: 'flex', gap: 0.25, flexShrink: 0,
                  opacity: selected ? 0.7 : 0,
                  transition: 'opacity 140ms ease',
                }}
                onClick={e => e.stopPropagation()}
              >
                <Tooltip title="Open" placement="top">
                  <IconButton
                    size="small"
                    onClick={onClick}
                    sx={{
                      p: 0.375,
                      color: 'text.disabled',
                      '&:hover': { color: pri, bgcolor: alpha(pri, 0.10) },
                    }}
                  >
                    <ArrowSquareOut size={12} weight="duotone" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={`Hide "${info.process_name}"`} placement="top">
                  <IconButton
                    size="small"
                    onClick={onHide}
                    sx={{
                      p: 0.375,
                      color: 'text.disabled',
                      '&:hover': {
                        color: 'text.secondary',
                        bgcolor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                      },
                    }}
                  >
                    <EyeSlash size={12} weight="duotone" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Options" placement="top">
                  <IconButton
                    size="small"
                    onClick={e => setMenuAnchor(e.currentTarget as HTMLElement)}
                    sx={{
                      p: 0.375,
                      color: 'text.disabled',
                      '&:hover': {
                        color: 'text.primary',
                        bgcolor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                      },
                    }}
                  >
                    <DotsThreeVertical size={12} weight="duotone" />
                  </IconButton>
                </Tooltip>
              </Box>
            )}

            {isFiltered && !isDisconnected && (
              <Tooltip
                title={visibility === 'auto-hidden' ? 'Override filter' : 'Remove from hidden'}
                placement="top"
              >
                <IconButton
                  size="small"
                  onClick={e => { e.stopPropagation(); onRestore(); }}
                  sx={{
                    p: 0.375,
                    flexShrink: 0,
                    color: 'text.disabled',
                    '&:hover': { color: pri, bgcolor: alpha(pri, 0.10) },
                  }}
                >
                  <Eye size={12} weight="duotone" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      </Box>

      <PortContextMenu
        anchor={menuAnchor}
        port={info.port}
        processName={info.process_name}
        onClose={() => setMenuAnchor(null)}
        onOpenInTab={() => onOpenInTab?.(info.port)}
        onCopyUrl={copyUrl}
        onKillRequest={() => setConfirmKill(true)}
        onShowDetails={() => setShowDetails(true)}
        onHide={onHide}
      />

      <PortDetailsModal
        open={showDetails}
        port={info.port}
        onClose={() => setShowDetails(false)}
      />

      <Dialog open={confirmKill} onClose={() => setConfirmKill(false)}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem' }}>
          Kill port {info.port}?
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: '0.875rem' }}>
            Sends <code>SIGTERM</code> to <strong>{info.process_name}</strong> (PID {info.pid}).
            Running work may be lost.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setConfirmKill(false)}
            startIcon={<X size={14} weight="duotone" />}
            sx={{ borderRadius: 7 }}
          >
            Cancel
          </Button>
          <Button
            onClick={killPort}
            disabled={killing}
            color="error"
            variant="contained"
            disableElevation
            startIcon={<Trash size={14} weight="duotone" />}
            sx={{ borderRadius: 7 }}
          >
            {killing ? 'Killing...' : 'Kill process'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
