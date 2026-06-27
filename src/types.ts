export interface PortInfo {
  port: number;
  pid: number;
  process_name: string;
  protocol: string;
  timestamp: string;
}

export interface AppTab {
  id: string;
  type: 'port' | 'terminal' | 'analysis' | 'newtab';
  port?: number;
  title: string;
  url?: string;
}

export interface TabStatus {
  status: 'idle' | 'loading' | 'ok' | 'error';
  favicon: string | null;
  faviconFailed: boolean;
  loadMs: number | null;
  displayUrl: string;
}
