// ── Types ─────────────────────────────────────────────────────────────────────

export interface RouteInfo {
  method:      string;
  path:        string;
  status:      number | null;
  description: string;
  source:      'probe' | 'openapi' | 'inferred';
  latencyMs:   number | null;
  contentType: string | null;
}

export interface ServiceMeta {
  healthy:     boolean | null;
  latencyMs:   number | null;
  framework:   string | null;
  version:     string | null;
  environment: string | null;
  serverHeader: string | null;
  poweredBy:   string | null;
}

export interface DbInfo {
  type:   string;
  port:   number;
  status: 'online' | 'offline';
  note:   string;
}

// ── Framework / env detection ─────────────────────────────────────────────────

export function detectFramework(headers: Record<string, string>, body: string): string | null {
  const powered = (headers['x-powered-by'] ?? '').toLowerCase();
  const server  = (headers['server']       ?? '').toLowerCase();

  if (powered.includes('express'))    return 'Express';
  if (powered.includes('next.js'))    return 'Next.js';
  if (powered.includes('nestjs'))     return 'NestJS';
  if (powered.includes('fastify'))    return 'Fastify';
  if (powered.includes('koa'))        return 'Koa';
  if (powered.includes('hapi'))       return 'Hapi';
  if (powered.includes('adonis'))     return 'AdonisJS';
  if (powered.includes('sails'))      return 'Sails.js';
  if (powered.includes('laravel'))    return 'Laravel';
  if (powered.includes('symfony'))    return 'Symfony';
  if (server.includes('uvicorn'))     return 'FastAPI';
  if (server.includes('hypercorn'))   return 'FastAPI';
  if (server.includes('werkzeug'))    return 'Flask';
  if (server.includes('gunicorn'))    return 'Gunicorn';
  if (server.includes('daphne'))      return 'Django Channels';
  if (server.includes('gin'))         return 'Gin (Go)';
  if (server.includes('fiber'))       return 'Fiber (Go)';
  if (server.includes('echo'))        return 'Echo (Go)';
  if (server.includes('chi'))         return 'Chi (Go)';
  if (server.includes('puma'))        return 'Rails (Puma)';
  if (server.includes('unicorn'))     return 'Rails (Unicorn)';
  if (server.includes('sinatra'))     return 'Sinatra';
  if (server.includes('spring'))      return 'Spring Boot';
  if (server.includes('tomcat'))      return 'Tomcat';
  if (server.includes('netty'))       return 'Netty';
  if (server.includes('ktor'))        return 'Ktor';
  if (server.includes('caddy'))       return 'Caddy';
  if (server.includes('nginx'))       return 'nginx';

  // Body-based inference
  const b = body.slice(0, 1500).toLowerCase();
  if (b.includes('"swagger"') || b.includes('"openapi"')) return 'OpenAPI';
  if (b.includes('express'))   return 'Express';
  if (b.includes('fastapi'))   return 'FastAPI';
  if (b.includes('django'))    return 'Django';
  if (b.includes('rails'))     return 'Rails';

  return null;
}

export function detectEnvironment(headers: Record<string, string>, body: string): string | null {
  const env = headers['x-environment'] ?? headers['x-env'] ?? headers['x-app-env'] ?? '';
  if (env) return env;
  const b = body.slice(0, 1000).toLowerCase();
  if (/\bproduction\b/.test(b))  return 'production';
  if (/\bstaging\b/.test(b))     return 'staging';
  if (/\bdevelopment\b/.test(b)) return 'development';
  if (/\bdev\b/.test(b))         return 'development';
  return null;
}

export function extractVersion(headers: Record<string, string>, body: string): string | null {
  const viaHeader = headers['x-version'] ?? headers['x-api-version'] ?? '';
  if (viaHeader) return viaHeader;
  // Try to find version in JSON body
  try {
    const json = JSON.parse(body);
    const v = json.version ?? json.appVersion ?? json.api_version ?? json.data?.version ?? null;
    if (v && typeof v === 'string') return v;
    if (v && typeof v === 'number') return String(v);
  } catch { /* not JSON */ }
  return null;
}

// ── OpenAPI spec parsing ──────────────────────────────────────────────────────

const OPENAPI_PATHS = [
  '/openapi.json',
  '/swagger.json',
  '/api/openapi.json',
  '/api/swagger.json',
  '/api-docs',
  '/api/api-docs',
  '/docs/openapi.json',
  '/v1/openapi.json',
  '/v2/openapi.json',
  '/v3/openapi.json',
];

export async function findOpenAPISpec(base: string): Promise<RouteInfo[]> {
  for (const p of OPENAPI_PATHS) {
    try {
      const res = await fetch(base + p, { signal: AbortSignal.timeout(2000) });
      if (!res.ok) continue;
      const ct = res.headers.get('content-type') ?? '';
      if (!ct.includes('json') && !ct.includes('yaml')) continue;
      const data = await res.json();
      if (data.paths || data.openapi || data.swagger) {
        return parseOpenAPISpec(data);
      }
    } catch { /* continue */ }
  }
  return [];
}

function parseOpenAPISpec(spec: Record<string, unknown>): RouteInfo[] {
  const routes: RouteInfo[] = [];
  const paths = (spec.paths ?? {}) as Record<string, Record<string, Record<string, unknown>>>;
  const METHODS = ['get','post','put','patch','delete','options','head'];
  for (const [path, ops] of Object.entries(paths)) {
    for (const [method, op] of Object.entries(ops)) {
      if (!METHODS.includes(method)) continue;
      routes.push({
        method:      method.toUpperCase(),
        path,
        status:      null,
        description: String(op['summary'] ?? op['description'] ?? ''),
        source:      'openapi',
        latencyMs:   null,
        contentType: null,
      });
    }
  }
  return routes;
}

// ── Route probing ─────────────────────────────────────────────────────────────

const PROBE_PATHS = [
  '/',
  '/health',
  '/status',
  '/ping',
  '/ready',
  '/live',
  '/api',
  '/api/health',
  '/api/status',
  '/api/ping',
  '/api/v1',
  '/api/v2',
  '/api/v3',
  '/api/routes',
  '/api/endpoints',
  '/api/users',
  '/api/user',
  '/api/auth',
  '/api/login',
  '/api/me',
  '/api/info',
  '/api/config',
  '/docs',
  '/swagger',
  '/graphql',
  '/api/graphql',
];

export async function probeRoutes(
  base: string,
  onProgress?: (done: number, total: number) => void
): Promise<RouteInfo[]> {
  const results: RouteInfo[] = [];
  let done = 0;

  await Promise.all(
    PROBE_PATHS.map(async path => {
      try {
        const start = Date.now();
        const res = await fetch(base + path, {
          method: 'GET',
          signal: AbortSignal.timeout(3000),
          headers: { Accept: 'application/json, text/plain, */*' },
        });
        const latencyMs = Date.now() - start;
        const ct = res.headers.get('content-type') ?? '';
        if (res.status < 400 || res.status === 405) {
          results.push({
            method:      'GET',
            path,
            status:      res.status,
            description: '',
            source:      'probe',
            latencyMs,
            contentType: ct.split(';')[0].trim() || null,
          });
        }
      } catch { /* unreachable path */ }
      done++;
      onProgress?.(done, PROBE_PATHS.length);
    })
  );

  return results.sort((a, b) => a.path.localeCompare(b.path));
}

// ── Service metadata ──────────────────────────────────────────────────────────

const HEALTH_PATHS = ['/health', '/status', '/api/health', '/api/status', '/ping', '/ready', '/'];

export async function analyzeService(base: string): Promise<ServiceMeta> {
  for (const path of HEALTH_PATHS) {
    try {
      const start = Date.now();
      const res   = await fetch(base + path, {
        signal: AbortSignal.timeout(3000),
        headers: { Accept: 'application/json, text/html, */*' },
      });
      const latencyMs  = Date.now() - start;
      const body       = await res.text();
      const hdrs: Record<string, string> = {};
      res.headers.forEach((v, k) => { hdrs[k] = v; });

      return {
        healthy:      res.ok,
        latencyMs,
        framework:    detectFramework(hdrs, body),
        version:      extractVersion(hdrs, body),
        environment:  detectEnvironment(hdrs, body),
        serverHeader: res.headers.get('server'),
        poweredBy:    res.headers.get('x-powered-by'),
      };
    } catch { /* try next */ }
  }
  return { healthy: false, latencyMs: null, framework: null, version: null, environment: null, serverHeader: null, poweredBy: null };
}

// ── Database detection ────────────────────────────────────────────────────────

export async function fetchDatabases(): Promise<DbInfo[]> {
  try {
    const res = await fetch('http://localhost:5757/api/databases', { signal: AbortSignal.timeout(5000) });
    const data = await res.json() as { databases: DbInfo[] };
    return data.databases ?? [];
  } catch {
    return [];
  }
}

// ── Response cache ────────────────────────────────────────────────────────────

interface CacheEntry { data: unknown; ts: number; status: number; latencyMs: number; }

const responseCache = new Map<string, CacheEntry>();
const CACHE_TTL = 60_000;

export function getCached(key: string): CacheEntry | null {
  const e = responseCache.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > CACHE_TTL) { responseCache.delete(key); return null; }
  return e;
}

export function setCache(key: string, entry: CacheEntry) {
  responseCache.set(key, entry);
}

export function clearCache(prefix?: string) {
  if (!prefix) { responseCache.clear(); return; }
  for (const k of responseCache.keys()) {
    if (k.startsWith(prefix)) responseCache.delete(k);
  }
}

export function getCacheStats() {
  return { size: responseCache.size, keys: [...responseCache.keys()] };
}
