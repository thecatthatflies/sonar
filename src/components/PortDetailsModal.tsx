import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import { useTheme, alpha } from '@mui/material/styles';
import { Cylinder, X } from '@phosphor-icons/react';
import { MONO } from '../theme';

interface Details {
  port:         number;
  pid:          number;
  process_name: string;
  protocol:     string;
  timestamp:    string;
  user:         string;
  elapsed:      string;
  rss_kb:       number;
  open_fds:     number;
  command:      string;
}

interface Props {
  open: boolean;
  port: number | null;
  onClose: () => void;
}

function fmt(label: string, value: React.ReactNode, mono = false) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="overline" sx={{ color: 'text.disabled', fontSize: '0.625rem', lineHeight: 1.4, display: 'block' }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontFamily: mono ? MONO : 'inherit',
          fontSize: mono ? '0.8125rem' : '0.875rem',
          wordBreak: 'break-all',
          color: 'text.primary',
          fontWeight: 500,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

export default function PortDetailsModal({ open, port, onClose }: Props) {
  const theme   = useTheme();
  const isDark  = theme.palette.mode === 'dark';
  const pri     = theme.palette.primary.main;

  const [details, setDetails] = useState<Details | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!open || !port) return;
    setDetails(null);
    setError(null);
    setLoading(true);

    fetch(`http://localhost:5757/api/info?port=${port}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Details>;
      })
      .then(d => { setDetails(d); setLoading(false); })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, [open, port]);

  const memMB = details ? (details.rss_kb / 1024).toFixed(1) : '-';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          elevation: 8,
          sx: {
            borderRadius: 3,
            backgroundImage: 'none',
            bgcolor: isDark ? '#1E1E1E' : '#fff',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
          },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40, height: 40, borderRadius: 2,
              bgcolor: alpha(pri, 0.12),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Cylinder size={22} weight="duotone" color={pri} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {details?.process_name ?? '...'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: MONO }}>
              PID {details?.pid ?? '—'} · {details?.protocol?.toUpperCase() ?? 'TCP'}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 2.5 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        )}

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {details && (
          <Grid container spacing={0} columns={2}>
            <Grid size={1}>
              {fmt('User', details.user || '—')}
              {fmt('Elapsed', details.elapsed || '—', true)}
              {fmt('Memory', `${memMB} MB`)}
            </Grid>
            <Grid size={1}>
              {fmt('Port', details.port, true)}
              {fmt('Open FDs', details.open_fds > 0 ? details.open_fds : '—')}
              {fmt('Protocol', details.protocol.toUpperCase())}
            </Grid>

            {details.command && (
              <Grid size={2}>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="overline" sx={{ color: 'text.disabled', fontSize: '0.625rem', display: 'block', mb: 0.5 }}>
                  Command
                </Typography>
                <Box
                  sx={{
                    bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                    borderRadius: 2,
                    p: 1.5,
                    overflowX: 'auto',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontFamily: MONO,
                      fontSize: '0.75rem',
                      color: 'text.secondary',
                      whiteSpace: 'pre',
                      display: 'block',
                    }}
                  >
                    {details.command}
                  </Typography>
                </Box>
              </Grid>
            )}

            <Grid size={2} sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={`localhost:${details.port}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontFamily: MONO, fontSize: '0.75rem' }}
                  onClick={() => navigator.clipboard.writeText(`http://localhost:${details.port}`)}
                />
                <Chip
                  label={`PID ${details.pid}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontFamily: MONO, fontSize: '0.75rem' }}
                  onClick={() => navigator.clipboard.writeText(String(details.pid))}
                />
              </Box>
              <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 0.75, fontSize: '0.6875rem' }}>
                Click chips to copy · Data as of {new Date(details.timestamp).toLocaleTimeString()}
              </Typography>
            </Grid>
          </Grid>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
        <Button onClick={onClose} startIcon={<X size={14} weight="duotone" />} sx={{ borderRadius: 20 }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
