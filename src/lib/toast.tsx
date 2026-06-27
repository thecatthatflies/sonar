import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import { useTheme, alpha } from '@mui/material/styles';
import {
  CheckCircle,
  XCircle,
  Warning,
  Info,
  X,
} from '@phosphor-icons/react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  action?:   ToastAction;
  duration?: number;
}

interface ToastItem {
  id:        string;
  variant:   ToastVariant;
  message:   string;
  action?:   ToastAction;
  duration:  number;
  exiting:   boolean;
}

export interface ToastAPI {
  success: (message: string, opts?: ToastOptions) => string;
  error:   (message: string, opts?: ToastOptions) => string;
  warning: (message: string, opts?: ToastOptions) => string;
  info:    (message: string, opts?: ToastOptions) => string;
  dismiss: (id?: string) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_VISIBLE    = 3;
const EXIT_MS        = 280;
const DEFAULT_MS: Record<ToastVariant, number> = {
  success: 3000,
  info:    3500,
  warning: 5000,
  error:   5000,
};

function uid() { return Math.random().toString(36).slice(2, 9); }

// ── Visual toast component ────────────────────────────────────────────────────

const VARIANT_CFG = {
  success: { Icon: CheckCircle, colorKey: 'success' as const },
  error:   { Icon: XCircle,     colorKey: 'error'   as const },
  warning: { Icon: Warning,     colorKey: 'warning' as const },
  info:    { Icon: Info,        colorKey: 'primary' as const },
} as const;

function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const theme  = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { Icon, colorKey } = VARIANT_CFG[item.variant];
  const color = theme.palette[colorKey].main;

  return (
    <Paper
      elevation={6}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        pl: 2.25,
        pr: 1,
        py: 1.375,
        borderRadius: 2.5,
        minWidth: 300,
        maxWidth: 420,
        cursor: 'pointer',
        border: `1px solid ${alpha(color, isDark ? 0.25 : 0.18)}`,
        bgcolor: isDark ? '#242424' : '#ffffff',
        backgroundImage: 'none',
        position: 'relative',
        overflow: 'hidden',
        userSelect: 'none',
        // ── enter / exit animations
        animation: item.exiting
          ? `_tExit ${EXIT_MS}ms cubic-bezier(0.4, 0, 1, 1) both`
          : '_tEnter 0.28s cubic-bezier(0.0, 0.0, 0.2, 1) both',
        '@keyframes _tEnter': {
          from: { opacity: 0, transform: 'translateY(14px) scale(0.96)' },
          to:   { opacity: 1, transform: 'translateY(0)  scale(1)' },
        },
        '@keyframes _tExit': {
          from: { opacity: 1, transform: 'translateY(0)  scale(1)',    maxHeight: 120, marginBottom: 0 },
          to:   { opacity: 0, transform: 'translateY(-8px) scale(0.97)', maxHeight: 0,   marginBottom: -8 },
        },
        '&:hover': { bgcolor: isDark ? '#2b2b2b' : '#f7f7f7' },
        transition: 'background 150ms ease',
      }}
      onClick={() => onDismiss(item.id)}
    >
      {/* Left accent stripe */}
      <Box sx={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: 3.5, bgcolor: color, borderRadius: '10px 0 0 10px',
      }} />

      {/* Icon */}
      <Box sx={{ color, flexShrink: 0, display: 'flex', lineHeight: 0 }}>
        <Icon size={20} weight="duotone" />
      </Box>

      {/* Message */}
      <Typography
        variant="body2"
        sx={{ flex: 1, fontSize: '0.875rem', fontWeight: 500, color: 'text.primary', lineHeight: 1.45 }}
      >
        {item.message}
      </Typography>

      {/* Optional action */}
      {item.action && (
        <Button
          size="small"
          onClick={e => { e.stopPropagation(); item.action!.onClick(); onDismiss(item.id); }}
          sx={{
            flexShrink: 0,
            fontSize: '0.75rem',
            fontWeight: 700,
            color,
            borderRadius: 20,
            minWidth: 0,
            px: 1.5,
            '&:hover': { bgcolor: alpha(color, 0.12) },
          }}
        >
          {item.action.label}
        </Button>
      )}

      {/* Dismiss ×  */}
      <IconButton
        size="small"
        onClick={e => { e.stopPropagation(); onDismiss(item.id); }}
        sx={{
          p: 0.375, flexShrink: 0,
          color: 'text.disabled',
          '&:hover': { color: 'text.secondary', bgcolor: 'action.hover' },
        }}
      >
        <X size={14} weight="duotone" />
      </IconButton>

      {/* Auto-dismiss progress bar */}
      <Box sx={{
        position: 'absolute', bottom: 0, left: 0,
        height: 2, bgcolor: color, opacity: 0.35,
        animation: `_tProgress ${item.duration}ms linear both`,
        '@keyframes _tProgress': {
          from: { width: '100%' },
          to:   { width: '0%' },
        },
      }} />
    </Paper>
  );
}

// ── Context + Provider ────────────────────────────────────────────────────────

const ToastCtx = createContext<ToastAPI | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Mark exiting → remove after animation
  const dismiss = useCallback((id?: string) => {
    if (!id) {
      // dismiss all
      setToasts(prev => prev.map(t => ({ ...t, exiting: true })));
      setTimeout(() => setToasts([]), EXIT_MS);
      return;
    }
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    const cleanup = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, EXIT_MS);
    // Clear the auto-dismiss timer for this id
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    // Store cleanup timer so we don't leak
    timers.current[`_x_${id}`] = cleanup;
  }, []);

  const add = useCallback((
    variant: ToastVariant,
    message: string,
    opts?: ToastOptions,
  ): string => {
    const id       = uid();
    const duration = opts?.duration ?? DEFAULT_MS[variant];

    setToasts(prev => {
      const next = [
        ...prev,
        { id, variant, message, action: opts?.action, duration, exiting: false },
      ];
      // When over max, kick out the oldest non-exiting one immediately
      const active = next.filter(t => !t.exiting);
      if (active.length > MAX_VISIBLE) {
        const oldest = active[0];
        clearTimeout(timers.current[oldest.id]);
        delete timers.current[oldest.id];
        // Mark exiting
        return next.map(t => t.id === oldest.id ? { ...t, exiting: true } : t);
      }
      return next;
    });

    timers.current[id] = setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  // Cleanup all timers on unmount
  useEffect(() => () => {
    Object.values(timers.current).forEach(clearTimeout);
  }, []);

  // Prune fully-exited toasts after animation
  useEffect(() => {
    const exiting = toasts.filter(t => t.exiting);
    if (exiting.length === 0) return;
    const t = setTimeout(() => {
      setToasts(prev => prev.filter(t => !t.exiting));
    }, EXIT_MS);
    return () => clearTimeout(t);
  }, [toasts]);

  const api: ToastAPI = {
    success: (msg, opts) => add('success', msg, opts),
    error:   (msg, opts) => add('error',   msg, opts),
    warning: (msg, opts) => add('warning', msg, opts),
    info:    (msg, opts) => add('info',    msg, opts),
    dismiss,
  };

  // Show only last MAX_VISIBLE (others auto-evicted above)
  const visible = toasts.slice(-MAX_VISIBLE);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      {createPortal(
        <Box
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            alignItems: 'flex-end',
            pointerEvents: 'none',
            '& > *': { pointerEvents: 'auto' },
          }}
        >
          {visible.map(t => (
            <Toast key={t.id} item={t} onDismiss={dismiss} />
          ))}
        </Box>,
        document.body,
      )}
    </ToastCtx.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ToastAPI {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be inside <ToastProvider>');
  return ctx;
}
