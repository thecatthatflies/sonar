import { useState, useCallback, useEffect, useRef } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import { lightTheme, darkTheme } from './theme';
import { ToastProvider } from './lib/toast';
import { LoggerProvider } from './lib/logger';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import BrowserArea from './components/BrowserArea';
import LogsDrawer from './components/LogsDrawer';
import AIIntegrations from './components/AIIntegrations';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import type { AppTab, TabStatus } from './types';
import './App.css';

const SIDEBAR_WIDTH = 260;

// Detect if this window is the settings window
const IS_SETTINGS = window.location.hash === '#settings';

export default function App() {
  const [darkMode,    setDarkMode]    = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [logsOpen,    setLogsOpen]    = useState(false);
  const [logsHeight,  setLogsHeight]  = useState(260);
  const [aiOpen,      setAiOpen]      = useState(false);

  const [tabs, setTabs] = useState<AppTab[]>([
    { id: 'terminal', type: 'terminal', title: 'Terminal' },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('terminal');
  const [currentUrl,  setCurrentUrl]  = useState('');
  const [portCount,   setPortCount]   = useState(0);
  const [tabStatuses, setTabStatuses] = useState<Record<string, TabStatus>>({});

  const tabsRef = useRef(tabs);
  useEffect(() => { tabsRef.current = tabs; }, [tabs]);
  const activeTabIdRef = useRef(activeTabId);
  useEffect(() => { activeTabIdRef.current = activeTabId; }, [activeTabId]);

  // ── Tab status ───────────────────────────────────────────────────────────
  const updateTabStatus = useCallback((tabId: string, update: Partial<TabStatus>) => {
    setTabStatuses(prev => ({ ...prev, [tabId]: { ...prev[tabId], ...update } as TabStatus }));
  }, []);

  const handleFaviconError = useCallback((tabId: string) => {
    setTabStatuses(prev => ({ ...prev, [tabId]: { ...prev[tabId], faviconFailed: true } as TabStatus }));
  }, []);

  // ── Tab management ────────────────────────────────────────────────────────
  const openNewTab = useCallback(() => {
    const id = `newtab-${Date.now()}`;
    setTabs(prev => [...prev, { id, type: 'newtab', title: 'New Tab' }]);
    setActiveTabId(id);
    setCurrentUrl('');
  }, []);

  const openNewTerminal = useCallback(() => {
    const termCount = tabsRef.current.filter(t => t.type === 'terminal').length;
    const id    = `terminal-${Date.now()}`;
    const title = termCount === 0 ? 'Terminal' : `Terminal ${termCount + 1}`;
    setTabs(prev => [...prev, { id, type: 'terminal', title }]);
    setActiveTabId(id);
  }, []);

  const openPort = useCallback((port: number) => {
    const id = `port-${port}`;
    setTabs(prev => prev.find(t => t.id === id)
      ? prev
      : [...prev, { id, type: 'port', port, title: `:${port}`, url: `http://localhost:${port}` }]
    );
    setActiveTabId(id);
    setCurrentUrl(`http://localhost:${port}`);
  }, []);

  const closeTab = useCallback((id: string) => {
    const terms = tabsRef.current.filter(t => t.type === 'terminal');
    if (terms.length === 1 && terms[0].id === id) return; // keep last terminal
    setTabs(prev => {
      const idx  = prev.findIndex(t => t.id === id);
      const next = prev.filter(t => t.id !== id);
      setActiveTabId(cur => {
        if (cur !== id) return cur;
        return next[Math.min(idx, next.length - 1)]?.id ?? 'terminal';
      });
      return next;
    });
    setTabStatuses(prev => { const n = { ...prev }; delete n[id]; return n; });
  }, []);

  const switchToTab = useCallback((delta: number) => {
    const t = tabsRef.current;
    const idx = t.findIndex(x => x.id === activeTabIdRef.current);
    const next = (idx + delta + t.length) % t.length;
    setActiveTabId(t[next].id);
  }, []);

  const switchToTabByIndex = useCallback((n: number) => {
    const t = tabsRef.current;
    if (t[n - 1]) setActiveTabId(t[n - 1].id);
  }, []);

  // ── Navigation ────────────────────────────────────────────────────────────
  const handleNavigate = useCallback((url: string) => {
    const active = tabsRef.current.find(t => t.id === activeTabIdRef.current);

    // If on a newtab, convert it to a port/browser tab
    if (active?.type === 'newtab') {
      const m    = url.match(/:(\d{2,5})/);
      const port = m ? parseInt(m[1]) : 0;
      if (port > 1024) {
        // Convert newtab → port tab
        setTabs(prev => prev.map(t => t.id === active.id
          ? { ...t, type: 'port', port, title: `:${port}`, url }
          : t));
        setCurrentUrl(url);
        window.dispatchEvent(new CustomEvent('sonar:navigate', { detail: { url, tabId: active.id } }));
        return;
      }
      // Convert newtab → generic browser tab
      setTabs(prev => prev.map(t => t.id === active.id
        ? { ...t, type: 'port', title: url, url }
        : t));
      setCurrentUrl(url);
      window.dispatchEvent(new CustomEvent('sonar:navigate', { detail: { url, tabId: active.id } }));
      return;
    }

    setCurrentUrl(url);
    if (!active || active.type === 'terminal') {
      const m    = url.match(/:(\d{2,5})/);
      const port = m ? parseInt(m[1]) : 0;
      if (port > 1024) { openPort(port); return; }
    }
    window.dispatchEvent(new CustomEvent('sonar:navigate', { detail: { url, tabId: activeTabIdRef.current } }));
  }, [openPort]);

  const handleUrlChange = useCallback((url: string) => {
    setCurrentUrl(url);
    setTabs(prev => prev.map(t =>
      t.id === activeTabIdRef.current && t.type === 'port' ? { ...t, url } : t
    ));
  }, []);

  const handleTabTitleChange = useCallback((tabId: string, title: string) => {
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, title } : t));
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // Ctrl+Tab / Ctrl+Shift+Tab — cycle tabs (no Cmd conflict on macOS)
      if (e.ctrlKey && !e.metaKey && e.key === 'Tab') {
        e.preventDefault();
        switchToTab(e.shiftKey ? -1 : 1);
        return;
      }

      if (!mod) return;

      switch (e.key) {
        case 't':
          e.preventDefault();
          if (e.shiftKey) openNewTerminal();
          else openNewTab();
          break;
        case 'w':
          e.preventDefault();
          closeTab(activeTabIdRef.current);
          break;
        case 'l':
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('sonar:focus-addressbar'));
          break;
        case 'r':
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('sonar:reload'));
          break;
        case '[':
          // Cmd+[ = back, Cmd+Shift+[ = prev tab
          e.preventDefault();
          if (e.shiftKey) switchToTab(-1);
          else window.dispatchEvent(new CustomEvent('sonar:back'));
          break;
        case ']':
          // Cmd+] = forward, Cmd+Shift+] = next tab
          e.preventDefault();
          if (e.shiftKey) switchToTab(1);
          else window.dispatchEvent(new CustomEvent('sonar:forward'));
          break;
        case 'ArrowLeft':
          // Ctrl+Alt+Left = prev tab (Linux/Windows alternative)
          if (e.altKey) { e.preventDefault(); switchToTab(-1); }
          break;
        case 'ArrowRight':
          // Ctrl+Alt+Right = next tab (Linux/Windows alternative)
          if (e.altKey) { e.preventDefault(); switchToTab(1); }
          break;
        case ',':
          e.preventDefault();
          invoke('open_settings').catch(console.error);
          break;
        case '1': case '2': case '3': case '4':
        case '5': case '6': case '7': case '8': case '9':
          e.preventDefault();
          switchToTabByIndex(Number(e.key));
          break;
        case 'b':
          e.preventDefault();
          setSidebarOpen(o => !o);
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [openNewTab, openNewTerminal, closeTab, switchToTab, switchToTabByIndex]);

  // ── Native menu events from Rust ──────────────────────────────────────────
  useEffect(() => {
    const unlisten = listen<{ id: string }>('menu-action', ({ payload }) => {
      switch (payload.id) {
        case 'new_tab':           openNewTab(); break;
        case 'new_terminal':      openNewTerminal(); break;
        case 'close_tab':         closeTab(activeTabIdRef.current); break;
        case 'toggle_sidebar':    setSidebarOpen(o => !o); break;
        case 'reload_page':
        case 'hard_reload':       window.dispatchEvent(new CustomEvent('sonar:reload')); break;
        case 'toggle_console':    setLogsOpen(o => !o); break;
        case 'inspect_sonar':     invoke('open_devtools').catch(() => {}); break;
        case 'nav_back':          window.dispatchEvent(new CustomEvent('sonar:back')); break;
        case 'nav_forward':       window.dispatchEvent(new CustomEvent('sonar:forward')); break;
        case 'nav_home':          window.dispatchEvent(new CustomEvent('sonar:home')); break;
        case 'focus_address':     window.dispatchEvent(new CustomEvent('sonar:focus-addressbar')); break;
        case 'prev_tab':          switchToTab(-1); break;
        case 'next_tab':          switchToTab(1); break;
        case 'refresh_ports':     window.dispatchEvent(new CustomEvent('sonar:refresh-ports')); break;
        case 'open_ai_integrations': setAiOpen(true); break;
        case 'settings':          invoke('open_settings').catch(() => {}); break;
      }
    });
    return () => { unlisten.then(f => f()); };
  }, [openNewTab, openNewTerminal, closeTab, switchToTab]);

  // ── Derived state ─────────────────────────────────────────────────────────
  const activeTab  = tabs.find(t => t.id === activeTabId);
  const activePort = activeTab?.type === 'port' ? (activeTab.port ?? null) : null;
  const activeTabDisplayText =
    activeTab?.type === 'terminal' ? 'Terminal'
    : activeTab?.type === 'newtab' ? 'New Tab'
    : activeTab?.type === 'analysis' ? `Analyzing :${activeTab.port}`
    : undefined;

  if (IS_SETTINGS) {
    return (
      <ThemeProvider theme={darkMode ? darkTheme : lightTheme}>
        <CssBaseline />
        <Box sx={{ p: 4 }}>
          <AIIntegrations open={true} onClose={() => window.close()} />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={darkMode ? darkTheme : lightTheme}>
      <CssBaseline />
      <LoggerProvider>
        <ToastProvider>
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
            <TopBar
              darkMode={darkMode}
              onToggleDark={() => setDarkMode(d => !d)}
              onToggleSidebar={() => setSidebarOpen(o => !o)}
              currentUrl={currentUrl}
              onNavigate={handleNavigate}
              portCount={portCount}
              activeTabDisplayText={activeTabDisplayText}
              activePort={activePort}
              logsOpen={logsOpen}
              onToggleLogs={() => setLogsOpen(o => !o)}
              onOpenAIIntegrations={() => setAiOpen(true)}
              tabs={tabs}
              activeTabId={activeTabId}
              onTabSelect={setActiveTabId}
              onTabClose={closeTab}
              onAddTab={openNewTab}
              tabStatuses={tabStatuses}
              onFaviconError={handleFaviconError}
            />

            <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
              <Sidebar
                open={sidebarOpen}
                width={SIDEBAR_WIDTH}
                onPortOpen={openPort}
                activePort={activePort}
                onPortsChange={setPortCount}
                onOpenInTab={openPort}
              />

              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  minWidth: 0,
                  overflow: 'hidden',
                  m: '4px',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: darkMode ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.09)',
                  boxShadow: darkMode
                    ? 'inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 1px rgba(0,0,0,0.4)'
                    : 'inset 0 1px 0 rgba(255,255,255,0.7), 0 0 0 1px rgba(0,0,0,0.04)',
                }}
              >
                <BrowserArea
                  tabs={tabs}
                  activeTabId={activeTabId}
                  portCount={portCount}
                  onUrlChange={handleUrlChange}
                  onTabTitleChange={handleTabTitleChange}
                  onTabStatusUpdate={updateTabStatus}
                  onNavigate={handleNavigate}
                />
              </Box>
            </Box>

            <LogsDrawer
              open={logsOpen}
              onClose={() => setLogsOpen(false)}
              height={logsHeight}
              onHeightChange={setLogsHeight}
            />
          </Box>

          <AIIntegrations open={aiOpen} onClose={() => setAiOpen(false)} />
        </ToastProvider>
      </LoggerProvider>
    </ThemeProvider>
  );
}
