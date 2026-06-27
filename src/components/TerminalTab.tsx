import { useEffect, useRef, memo } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import '@xterm/xterm/css/xterm.css';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

const XTERM_THEME = {
  background:          '#0d0d0d',
  foreground:          '#e5e5e5',
  cursor:              '#e5e5e5',
  cursorAccent:        '#0d0d0d',
  selectionBackground: 'rgba(255,255,255,0.15)',
  selectionForeground: undefined,
  black:               '#1a1a1a',
  red:                 '#cc5555',
  green:               '#55aa55',
  yellow:              '#aaaa00',
  blue:                '#5588cc',
  magenta:             '#aa55aa',
  cyan:                '#55aaaa',
  white:               '#c0c0c0',
  brightBlack:         '#555555',
  brightRed:           '#ff5555',
  brightGreen:         '#55ff55',
  brightYellow:        '#ffff55',
  brightBlue:          '#5555ff',
  brightMagenta:       '#ff55ff',
  brightCyan:          '#55ffff',
  brightWhite:         '#ffffff',
};

interface Props {
  tabId: string;
}

const TerminalTab = memo(function TerminalTab({ tabId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef      = useRef<Terminal | null>(null);
  const fitRef       = useRef<FitAddon | null>(null);
  const mountedRef   = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mountedRef.current) return;
    mountedRef.current = true;

    const term = new Terminal({
      theme:            XTERM_THEME,
      fontFamily:       '"JetBrains Mono", "Cascadia Code", "Fira Code", Menlo, monospace',
      fontSize:         12,
      lineHeight:       1.0,
      letterSpacing:    0,
      cursorBlink:      true,
      cursorStyle:      'block',
      cursorWidth:      1,
      scrollback:       10000,
      allowProposedApi: true,
      convertEol:       false,
      scrollSensitivity:  1,
    });

    const fit     = new FitAddon();
    const unicode = new Unicode11Addon();
    term.loadAddon(fit);
    term.loadAddon(unicode);
    term.open(container);

    // Activate Unicode 11 so emoji/symbols render correctly
    term.unicode.activeVersion = '11';

    // WebGL renderer — GPU-accelerated like Ghostty. Fall back to DOM on context loss.
    let webgl: WebglAddon | null = null;
    try {
      webgl = new WebglAddon();
      webgl.onContextLoss(() => {
        webgl?.dispose();
        webgl = null;
      });
      term.loadAddon(webgl);
    } catch {
      // WebGL unavailable; DOM renderer fallback is already active
    }

    termRef.current = term;
    fitRef.current  = fit;

    let aborted = false;
    const cleanups: Array<() => void> = [];

    const startup = async () => {
      await new Promise<void>(r => requestAnimationFrame(() => r()));
      if (aborted) return;

      try { fit.fit(); } catch { /* ignore */ }

      try {
        const unlistenOutput = await listen<string>(`pty-output:${tabId}`, ({ payload }) => {
          termRef.current?.write(payload);
        });
        if (aborted) { unlistenOutput(); return; }
        cleanups.push(unlistenOutput);

        const unlistenExit = await listen<string>(`pty-exit:${tabId}`, () => {
          termRef.current?.write('\r\n\x1b[2m[shell exited]\x1b[0m\r\n');
        });
        if (aborted) { unlistenExit(); return; }
        cleanups.push(unlistenExit);

        await invoke('pty_create', { tabId, cols: term.cols, rows: term.rows });

        term.onData(data => {
          invoke('pty_write', { tabId, data }).catch(() => {});
        });

        term.onResize(({ cols, rows }) => {
          invoke('pty_resize', { tabId, cols, rows }).catch(() => {});
        });

      } catch (e) {
        if (!aborted) {
          term.write(`\x1b[1;31m[PTY error: ${e}]\x1b[0m\r\n`);
        }
      }
    };

    startup();

    const ro = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        if (fitRef.current) {
          try { fitRef.current.fit(); } catch { /* ignore */ }
        }
      });
    });
    ro.observe(container);

    return () => {
      aborted = true;
      ro.disconnect();
      cleanups.forEach(fn => fn());
      invoke('pty_close', { tabId }).catch(() => {});
      webgl?.dispose();
      term.dispose();
      termRef.current   = null;
      fitRef.current    = null;
      mountedRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabId]);

  return (
    <div
      ref={containerRef}
      style={{
        width:           '100%',
        height:          '100%',
        backgroundColor: '#0d0d0d',
        padding:         '4px',
        boxSizing:       'border-box',
        overflow:        'hidden',
      }}
    />
  );
});

export default TerminalTab;
