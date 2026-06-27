import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

let uid = 0;
const MAX_LIVE = 500;
const LS_PREFIX = 'sonar:logs:';
// Dedup window: same level+source+msg within this many ms → increment count
const DEDUP_MS = 800;

export interface LogEntry {
  id:     number;
  level:  LogLevel;
  msg:    string;
  source: string;
  ts:     Date;
  count:  number;  // >1 when deduplicated
}

export interface SavedSession {
  id:    string;
  name:  string;
  ts:    Date;
  logs:  LogEntry[];
  count: number;
}

interface Ctx {
  logs:               LogEntry[];
  log:                (level: LogLevel, msg: string, source?: string) => void;
  clear:              () => void;
  saveSession:        (name?: string) => string;
  loadSavedSessions:  () => SavedSession[];
  deleteSession:      (id: string) => void;
}

const LogCtx = createContext<Ctx | null>(null);

export function LoggerProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const log = useCallback((level: LogLevel, msg: string, source = 'sonar') => {
    setLogs(prev => {
      const last = prev[prev.length - 1];
      // Deduplicate: same level + source + msg within DEDUP_MS
      if (
        last &&
        last.level   === level &&
        last.source  === source &&
        last.msg     === msg &&
        Date.now() - last.ts.getTime() < DEDUP_MS
      ) {
        const updated = [...prev];
        updated[updated.length - 1] = { ...last, count: last.count + 1, ts: new Date() };
        return updated;
      }
      const next = [...prev, { id: uid++, level, msg, source, ts: new Date(), count: 1 }];
      return next.length > MAX_LIVE ? next.slice(-MAX_LIVE) : next;
    });
  }, []);

  const clear = useCallback(() => setLogs([]), []);

  const saveSession = useCallback((name?: string): string => {
    const id   = String(Date.now());
    const label = name?.trim() || `Session — ${new Date().toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })}`;
    const session: SavedSession = {
      id, name: label, ts: new Date(),
      logs: logs.map(e => ({ ...e, ts: e.ts.toISOString() as unknown as Date })),
      count: logs.length,
    };
    try {
      localStorage.setItem(`${LS_PREFIX}${id}`, JSON.stringify(session));
    } catch { /* storage full */ }
    return id;
  }, [logs]);

  const loadSavedSessions = useCallback((): SavedSession[] => {
    const sessions: SavedSession[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(LS_PREFIX)) continue;
      try {
        const raw = JSON.parse(localStorage.getItem(key)!);
        sessions.push({
          ...raw,
          ts:   new Date(raw.ts),
          logs: (raw.logs as (LogEntry & { ts: string })[]).map(e => ({
            ...e, ts: new Date(e.ts),
          })),
        });
      } catch { /* corrupted entry */ }
    }
    return sessions.sort((a, b) => b.ts.getTime() - a.ts.getTime());
  }, []);

  const deleteSession = useCallback((id: string) => {
    localStorage.removeItem(`${LS_PREFIX}${id}`);
  }, []);

  return (
    <LogCtx.Provider value={{ logs, log, clear, saveSession, loadSavedSessions, deleteSession }}>
      {children}
    </LogCtx.Provider>
  );
}

export function useLogger() {
  const ctx = useContext(LogCtx);
  if (!ctx) throw new Error('useLogger outside LoggerProvider');
  return ctx;
}
