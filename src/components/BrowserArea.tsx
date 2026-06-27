import { useEffect, useRef, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Globe } from '@phosphor-icons/react';
import { Webview } from '@tauri-apps/api/webview';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import { LogicalPosition, LogicalSize } from '@tauri-apps/api/dpi';
import { invoke } from '@tauri-apps/api/core';
import TerminalTab from './TerminalTab';
import AnalysisPanel from './AnalysisPanel';
import NewTabPage from './NewTabPage';
import { useLogger } from '../lib/logger';
import type { AppTab, TabStatus } from '../types';

function wvLabel(port: number) { return `browser-${port}`; }

function faviconUrl(url: string): string {
  try { return `${new URL(url).origin}/favicon.ico`; }
  catch { return ''; }
}

async function fetchPageMeta(url: string, signal: AbortSignal) {
  const start = Date.now();
  const res   = await fetch(url, { signal, cache: 'no-store' });
  const ms    = Date.now() - start;
  const html  = await res.text();
  const m     = html.match(/<title[^>]*>([^<]{1,120})<\/title>/i);
  return { title: m?.[1]?.trim() ?? '', ms };
}

interface Props {
  tabs: AppTab[];
  activeTabId: string;
  portCount: number;
  onUrlChange: (url: string) => void;
  onTabTitleChange: (tabId: string, title: string) => void;
  onTabStatusUpdate: (tabId: string, update: Partial<TabStatus>) => void;
  onNavigate: (url: string) => void;
}

export default function BrowserArea({
  tabs, activeTabId, portCount,
  onUrlChange, onTabTitleChange, onTabStatusUpdate, onNavigate,
}: Props) {
  const { log } = useLogger();

  const frameRef      = useRef<HTMLDivElement>(null);
  const webviewsRef   = useRef<Record<string, Webview>>({});
  const activePortRef = useRef<number | null>(null);
  const prevUrlRef    = useRef<Record<string, string>>({});
  const fetchCtlRef   = useRef<Record<string, AbortController>>({});

  const activeTab  = tabs.find(t => t.id === activeTabId);
  const activePort = activeTab?.type === 'port' ? (activeTab.port ?? null) : null;

  useEffect(() => { activePortRef.current = activePort; }, [activePort]);

  // ── Webview positioning ────────────────────────────────────────────────────
  const reposition = useCallback(async () => {
    const port = activePortRef.current;
    if (!port || !frameRef.current) return;
    const rect = frameRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const wv = webviewsRef.current[wvLabel(port)];
    if (!wv) return;
    try {
      await Promise.all([
        wv.setPosition(new LogicalPosition(rect.left, rect.top)),
        wv.setSize(new LogicalSize(rect.width, rect.height)),
      ]);
    } catch { /* not ready */ }
  }, []);

  // Re-run when activePort changes so we observe the frame element once it mounts.
  // Without activePort as a dep, frameRef.current is null on initial setup (no port tab yet)
  // and the sidebar-collapse / initial-size events are never caught.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const obs = new ResizeObserver(() => reposition());
    obs.observe(frame);
    return () => obs.disconnect();
  }, [reposition, activePort]);

  // ── Fetch page title/status ───────────────────────────────────────────────
  const fetchTitle = useCallback(async (tabId: string, url: string) => {
    if (!url || url === 'about:blank') return;
    fetchCtlRef.current[tabId]?.abort();
    const ctl = new AbortController();
    fetchCtlRef.current[tabId] = ctl;

    // Optimistic: the webview loads independently; status reflects the webview, not our side-fetch
    onTabStatusUpdate(tabId, { displayUrl: url, status: 'loading', loadMs: null });

    try {
      const { title, ms } = await fetchPageMeta(url, ctl.signal);
      if (ctl.signal.aborted) return;
      const favicon = faviconUrl(url);
      onTabStatusUpdate(tabId, { favicon, loadMs: ms, status: 'ok' });
      if (title) onTabTitleChange(tabId, title);
      log('info', `${url} — ${ms}ms`, 'navigator');
    } catch (e: unknown) {
      if ((e as Error)?.name === 'AbortError') return;
      // Side-fetch failed (CORS, network, etc.) — webview still loads normally
      onTabStatusUpdate(tabId, { status: 'ok', loadMs: null });
      log('debug', `Side-fetch skipped for ${url}: ${String(e)}`, 'navigator');
    }
  }, [onTabTitleChange, onTabStatusUpdate, log]);

  // ── Create / show / hide webviews ─────────────────────────────────────────
  useEffect(() => {
    const activate = async () => {
      await Promise.all(
        Object.entries(webviewsRef.current)
          .filter(([l]) => l !== (activePort ? wvLabel(activePort) : ''))
          .map(([, wv]) => wv.hide().catch(() => {}))
      );
      if (!activePort || !frameRef.current) return;

      const rect = frameRef.current.getBoundingClientRect();
      const lbl  = wvLabel(activePort);

      if (webviewsRef.current[lbl]) {
        const wv = webviewsRef.current[lbl];
        try {
          await wv.setPosition(new LogicalPosition(rect.left, rect.top));
          await wv.setSize(new LogicalSize(Math.max(rect.width, 1), Math.max(rect.height, 1)));
          await wv.show();
        } catch { /* destroyed */ }
      } else {
        const tab = tabs.find(t => t.port === activePort);
        const url = tab?.url ?? `http://localhost:${activePort}`;
        const win = getCurrentWindow();
        webviewsRef.current[lbl] = new Webview(win, lbl, {
          url,
          x: rect.left, y: rect.top,
          width:  Math.max(rect.width, 1),
          height: Math.max(rect.height, 1),
        });
        log('debug', `Webview created — ${lbl} @ ${url}`, 'webview');
        fetchTitle(activeTabId, url);
        // Eval title from the webview itself after it loads (avoids CORS dependency)
        setTimeout(() => {
          invoke('browser_eval', { label: lbl, key: 'title', js: 'document.title' }).catch(() => {});
        }, 1500);
      }
    };
    activate().catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePort]);

  // ── Cleanup removed tabs ───────────────────────────────────────────────────
  const prevTabsRef = useRef<AppTab[]>([]);
  useEffect(() => {
    prevTabsRef.current
      .filter(t => t.type === 'port' && !tabs.find(nt => nt.id === t.id))
      .forEach(t => {
        const l = wvLabel(t.port!);
        webviewsRef.current[l]?.close().catch(() => {});
        delete webviewsRef.current[l];
        fetchCtlRef.current[t.id]?.abort();
        delete fetchCtlRef.current[t.id];
      });
    prevTabsRef.current = tabs;
  }, [tabs]);

  useEffect(() => () => {
    Object.values(webviewsRef.current).forEach(wv => wv.close().catch(() => {}));
  }, []);

  // ── Poll active webview URL ────────────────────────────────────────────────
  useEffect(() => {
    if (!activePort) return;
    const id = setInterval(async () => {
      const port = activePortRef.current;
      if (!port) return;
      try {
        const url = await invoke<string>('browser_url', { label: wvLabel(port) });
        if (!url || url === 'about:blank') return;
        const prev = prevUrlRef.current[activeTabId] ?? '';
        if (url !== prev) {
          prevUrlRef.current[activeTabId] = url;
          onUrlChange(url);
          onTabStatusUpdate(activeTabId, { displayUrl: url });
          fetchTitle(activeTabId, url);
          // Also eval title from webview after navigation settles
          setTimeout(() => {
            invoke('browser_eval', { label: wvLabel(port), key: 'title', js: 'document.title' }).catch(() => {});
          }, 800);
        }
      } catch { /* not ready */ }
    }, 600);
    return () => clearInterval(id);
  }, [activePort, activeTabId, onUrlChange, fetchTitle, onTabStatusUpdate]);

  // ── Browser eval result listener ──────────────────────────────────────────
  useEffect(() => {
    const unlisten = listen<{ label: string; key: string; value: string }>(
      'browser-eval-result',
      ({ payload }) => {
        if (payload.key === 'title' && payload.value) {
          const tab = tabs.find(t => t.type === 'port' && wvLabel(t.port!) === payload.label);
          if (tab) {
            const raw = payload.value.replace(/^"|"$/g, '');
            onTabTitleChange(tab.id, raw);
          }
        }
      }
    );
    return () => { unlisten.then(f => f()); };
  }, [tabs, onTabTitleChange]);

  // ── Navigation events ─────────────────────────────────────────────────────
  useEffect(() => {
    const onNav = async (e: Event) => {
      const { url, tabId } = (e as CustomEvent).detail as { url: string; tabId: string };
      if (tabId !== activeTabId) return;
      const tab = tabs.find(t => t.id === tabId);
      if (!tab || tab.type !== 'port') return;
      prevUrlRef.current[tabId] = '';
      await invoke('browser_navigate', { label: wvLabel(tab.port!), url }).catch(console.error);
      fetchTitle(tabId, url);
      onUrlChange(url);
    };
    const onBack = async () => {
      if (!activePort) return;
      prevUrlRef.current[activeTabId] = '';
      await invoke('browser_back', { label: wvLabel(activePort) }).catch(() => {});
    };
    const onFwd = async () => {
      if (!activePort) return;
      prevUrlRef.current[activeTabId] = '';
      await invoke('browser_forward', { label: wvLabel(activePort) }).catch(() => {});
    };
    const onReload = async () => {
      if (!activePort) return;
      await invoke('browser_reload', { label: wvLabel(activePort) }).catch(() => {});
      const url = prevUrlRef.current[activeTabId];
      if (url) fetchTitle(activeTabId, url);
    };
    const onHome = async () => {
      if (!activePort) return;
      const url = `http://localhost:${activePort}`;
      prevUrlRef.current[activeTabId] = '';
      await invoke('browser_navigate', { label: wvLabel(activePort), url }).catch(() => {});
      fetchTitle(activeTabId, url);
      onUrlChange(url);
    };

    window.addEventListener('sonar:navigate', onNav);
    window.addEventListener('sonar:back',     onBack);
    window.addEventListener('sonar:forward',  onFwd);
    window.addEventListener('sonar:reload',   onReload);
    window.addEventListener('sonar:home',     onHome);
    return () => {
      window.removeEventListener('sonar:navigate', onNav);
      window.removeEventListener('sonar:back',     onBack);
      window.removeEventListener('sonar:forward',  onFwd);
      window.removeEventListener('sonar:reload',   onReload);
      window.removeEventListener('sonar:home',     onHome);
    };
  }, [activeTabId, activePort, tabs, onUrlChange, fetchTitle]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ flex: 1, overflow: 'hidden', minHeight: 0, position: 'relative' }}>
      {/* Terminal tabs — all mounted, toggled by visibility to preserve shell state */}
      {tabs.filter(t => t.type === 'terminal').map(tab => (
        <Box
          key={tab.id}
          sx={{
            position: 'absolute', inset: 0,
            // visibility:hidden keeps xterm alive without layout cost
            visibility: activeTab?.id === tab.id ? 'visible' : 'hidden',
            pointerEvents: activeTab?.id === tab.id ? 'auto' : 'none',
          }}
        >
          <TerminalTab tabId={tab.id} />
        </Box>
      ))}

      {/* Analysis panel */}
      {activeTab?.type === 'analysis' && activeTab.port && (
        <Box sx={{ position: 'absolute', inset: 0 }}>
          <AnalysisPanel port={activeTab.port} />
        </Box>
      )}

      {/* Port webview frame */}
      {activeTab?.type === 'port' && (
        <Box ref={frameRef} className="browser-frame-placeholder" sx={{ position: 'absolute', inset: 0 }} />
      )}

      {/* New tab page */}
      {activeTab?.type === 'newtab' && (
        <Box sx={{ position: 'absolute', inset: 0 }}>
          <NewTabPage portCount={portCount} onNavigate={onNavigate} />
        </Box>
      )}

      {/* Empty state */}
      {!activeTab && (
        <Box sx={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100%', gap: 1.5, color: 'text.disabled',
        }}>
          <Globe size={52} weight="duotone" opacity={0.12} />
          <Typography sx={{ color: 'text.disabled', fontSize: '0.9rem', fontWeight: 500 }}>
            Open a service from the sidebar
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled', opacity: 0.6 }}>
            or type a URL in the address bar
          </Typography>
        </Box>
      )}
    </Box>
  );
}
