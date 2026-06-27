import { createTheme, alpha } from '@mui/material/styles';

const SANS = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif';
export const MONO = '"JetBrains Mono", "Fira Code", "Cascadia Code", "Courier New", Consolas, monospace';

const PRI_LIGHT = '#2563EB';
const PRI_DARK  = '#60A5FA';

const shape = { borderRadius: 8 };

const typography = {
  fontFamily: SANS,
  h1: { fontFamily: SANS, fontWeight: 700 },
  h2: { fontFamily: SANS, fontWeight: 700 },
  h3: { fontFamily: SANS, fontWeight: 600 },
  h4: { fontFamily: SANS, fontWeight: 600 },
  h5: { fontFamily: SANS, fontWeight: 600 },
  h6: { fontFamily: SANS, fontWeight: 600 },
  subtitle1: { fontFamily: SANS, fontWeight: 500 },
  subtitle2: { fontFamily: SANS, fontWeight: 500 },
  body1:    { fontFamily: SANS },
  body2:    { fontFamily: SANS },
  caption:  { fontFamily: SANS },
  overline: { fontFamily: SANS, letterSpacing: '0.10em', fontWeight: 600 },
  button:   { fontFamily: SANS, textTransform: 'none' as const, fontWeight: 600 },
};

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary:    { main: PRI_LIGHT, light: '#3B82F6', dark: '#1D4ED8', contrastText: '#fff' },
    secondary:  { main: '#6B7280', light: '#9CA3AF', dark: '#374151' },
    background: { default: '#F1F3F8', paper: '#FFFFFF' },
    text:       { primary: '#111827', secondary: '#6B7280' },
    divider:    'rgba(0,0,0,0.07)',
    success:    { main: '#059669', light: '#34D399' },
    error:      { main: '#DC2626', light: '#F87171' },
    warning:    { main: '#D97706', light: '#FBBF24' },
  },
  shape,
  typography,
  components: overrides('light'),
});

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary:    { main: PRI_DARK, light: '#93C5FD', dark: '#3B82F6', contrastText: '#0A0F1E' },
    secondary:  { main: '#9CA3AF', light: '#D1D5DB', dark: '#6B7280' },
    background: { default: '#0C0E14', paper: '#131620' },
    text:       { primary: '#E2E6F0', secondary: '#8B95AE' },
    divider:    'rgba(255,255,255,0.07)',
    success:    { main: '#34D399', light: '#6EE7B7' },
    error:      { main: '#F87171', light: '#FCA5A5' },
    warning:    { main: '#FBBF24', light: '#FCD34D' },
  },
  shape,
  typography,
  components: overrides('dark'),
});

function overrides(mode: 'light' | 'dark') {
  const light = mode === 'light';
  const pri   = light ? PRI_LIGHT : PRI_DARK;

  return {
    MuiCssBaseline: {
      styleOverrides: {
        '*, *::before, *::after': { boxSizing: 'border-box' },
        'html, body, #root': { height: '100%', overflow: 'hidden' },
        body: { fontFamily: SANS },
        '::-webkit-scrollbar': { width: 5, height: 5 },
        '::-webkit-scrollbar-track': { background: 'transparent' },
        '::-webkit-scrollbar-thumb': {
          background: light ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.10)',
          borderRadius: 3,
          '&:hover': { background: light ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.20)' },
        },
      },
    },

    MuiAppBar: {
      defaultProps:   { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderBottom: `1px solid ${light ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.07)'}`,
          backdropFilter: 'blur(12px)',
          backgroundColor: light ? alpha('#ffffff', 0.92) : alpha('#131620', 0.92),
        },
      },
    },

    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
          backgroundColor: light ? '#FFFFFF' : '#0F1118',
          borderRight: `1px solid ${light ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.07)'}`,
        },
      },
    },

    MuiCard: {
      defaultProps:   { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: 10,
          border: `1px solid ${light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)'}`,
          transition: 'border-color 160ms ease',
        },
      },
    },

    MuiCardActionArea: {
      styleOverrides: {
        root: { borderRadius: 10 },
        focusHighlight: { borderRadius: 10 },
      },
    },

    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 7,
          fontFamily: SANS,
          fontWeight: 600,
          letterSpacing: 0,
          padding: '5px 16px',
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
          '&:active': { transform: 'scale(0.98)' },
        },
        outlined: {
          borderWidth: '1px',
          '&:hover': { borderWidth: '1px' },
        },
      },
    },

    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          transition: 'background 140ms ease, color 140ms ease',
        },
      },
    },

    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 40 },
        indicator: {
          height: 2,
          borderRadius: '2px 2px 0 0',
          backgroundColor: pri,
        },
        scrollButtons: { width: 28 },
      },
    },

    MuiTab: {
      styleOverrides: {
        root: {
          fontFamily: SANS,
          fontWeight: 500,
          fontSize: '0.8125rem',
          textTransform: 'none',
          letterSpacing: 0,
          minHeight: 40,
          padding: '6px 14px',
          transition: 'color 140ms ease, background 140ms ease',
          '&.Mui-selected': { fontWeight: 600 },
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          fontFamily: SANS,
          fontWeight: 600,
          borderRadius: 6,
          fontSize: '0.6875rem',
        },
      },
    },

    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          margin: '1px 6px',
          fontFamily: SANS,
          transition: 'background 140ms ease',
          '&.Mui-selected': {
            backgroundColor: alpha(pri, 0.10),
            '&:hover': { backgroundColor: alpha(pri, 0.15) },
          },
        },
      },
    },

    MuiListItemText: {
      styleOverrides: {
        primary:   { fontFamily: SANS, fontWeight: 500 },
        secondary: { fontFamily: SANS },
      },
    },

    MuiListSubheader: {
      styleOverrides: {
        root: {
          fontFamily: SANS,
          fontWeight: 600,
          letterSpacing: '0.08em',
          fontSize: '0.625rem',
          textTransform: 'uppercase',
          lineHeight: '2.25rem',
          color: light ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.28)',
          backgroundColor: 'transparent',
          paddingLeft: 16,
        },
      },
    },

    MuiInputBase: {
      styleOverrides: {
        root: { fontFamily: MONO },
      },
    },

    MuiTooltip: {
      defaultProps: { arrow: false },
      styleOverrides: {
        tooltip: {
          fontFamily: SANS,
          fontWeight: 500,
          fontSize: '0.75rem',
          backgroundColor: light ? '#1F2937' : '#374151',
          color: '#F9FAFB',
          borderRadius: 6,
          padding: '4px 10px',
        },
      },
    },

    MuiDivider: {
      styleOverrides: {
        root: { borderColor: light ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' },
      },
    },

    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
          backgroundColor: light ? '#FFFFFF' : '#1C2030',
          border: `1px solid ${light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 10,
          boxShadow: light
            ? '0 4px 20px rgba(0,0,0,0.12)'
            : '0 8px 40px rgba(0,0,0,0.55)',
        },
      },
    },

    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
          borderRadius: 12,
          border: `1px solid ${light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'}`,
        },
      },
    },
  };
}
