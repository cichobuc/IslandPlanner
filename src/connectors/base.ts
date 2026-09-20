import type {
  CacheStore,
  Connector,
  ConnectorContext,
  ConnectorId,
  ConnectorMode,
  HealthReport,
  Result,
  StepNo,
} from './types';

/** Pamäťová cache (testy, fixtures, fallback bez DB). */
export class MemoryCache implements CacheStore {
  private map = new Map<
    string,
    { payload: unknown; fetchedAt: string; expiresAt: string; connectorId: ConnectorId }
  >();
  async get(key: string) {
    const v = this.map.get(key);
    if (!v) return null;
    if (Date.parse(v.expiresAt) < Date.now()) {
      this.map.delete(key);
      return null;
    }
    return v;
  }
  async set(key: string, connectorId: ConnectorId, payload: unknown, ttlSec: number) {
    const now = Date.now();
    this.map.set(key, {
      payload,
      connectorId,
      fetchedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + ttlSec * 1000).toISOString(),
    });
  }
  clear() {
    this.map.clear();
  }
}

export class ConnectorError extends Error {
  constructor(
    message: string,
    public retryable = true,
  ) {
    super(message);
  }
}

// jednoduchý rate limiter per konektor (≤ perSec req/s) – v jednom procese
const lastCall = new Map<ConnectorId, number>();
async function throttle(id: ConnectorId, perSec?: number) {
  if (!perSec) return;
  const minGap = 1000 / perSec;
  const last = lastCall.get(id) ?? 0;
  const wait = last + minGap - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall.set(id, Date.now());
}

export const DEFAULT_TIMEOUT_MS = 20_000;
export const USER_AGENT = 'IslandPlanner/0.1 (personal, non-commercial; +https://islandplanner.vercel.app)';

/** fetch s timeoutom, User-Agentom a jednoduchou chybou. */
export async function httpJson<T>(
  ctx: ConnectorContext,
  url: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await ctx.fetchImpl(url, {
      ...init,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', ...(init.headers ?? {}) },
      signal: ac.signal,
    });
    if (!res.ok)
      throw new ConnectorError(`HTTP ${res.status} ${url}`, res.status >= 500 || res.status === 429);
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof ConnectorError) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    throw new ConnectorError(msg.includes('abort') ? `timeout ${timeoutMs} ms` : msg, true);
  } finally {
    clearTimeout(timer);
  }
}

let defaultCache: CacheStore | null = null;
/** Nastaví predvolenú cache (DB store zo servera); bez nej sa použije MemoryCache. */
export function setDefaultCache(store: CacheStore) {
  defaultCache = store;
}
const memoryFallback = new MemoryCache();

export function resolveContext(partial: Partial<ConnectorContext> = {}): ConnectorContext {
  const env = partial.env ?? (process.env as Record<string, string | undefined>);
  const mode: ConnectorMode =
    partial.mode ?? (env.CONNECTOR_MODE === 'fixtures' || env.VITEST ? 'fixtures' : 'live');
  return {
    cache: partial.cache ?? defaultCache ?? memoryFallback,
    mode,
    fetchImpl: partial.fetchImpl ?? fetch,
    now: partial.now ?? (() => new Date()),
    bypassCache: partial.bypassCache ?? false,
    env,
  };
}

export type ConnectorDef<Q, R> = {
  id: ConnectorId;
  steps: StepNo[];
  kind?: 'live' | 'cached' | 'seed' | 'manual';
  ttlSec: number;
  rateLimit?: { perSec?: number; perDay?: number };
  legal: Connector<Q, R>['legal'];
  verifiedAt: string;
  sourceUrl: string;
  fallback?: ConnectorId;
  flag?: string;
  cacheKey: (q: Q) => string;
  /** Živý dotaz + normalizácia. Hodí ConnectorError pri zlyhaní. */
  request: (q: Q, ctx: ConnectorContext) => Promise<R>;
  /** Fixture (reálna odpoveď uložená v repo) – použije sa v režime fixtures alebo ako núdzový fallback. */
  fixture?: (q: Q) => R | Promise<R>;
  /** Dotaz pre health probe (predvolene null = probe podľa healthQuery) */
  healthQuery?: () => Q;
  /** Konfiguračná kontrola pred volaním (chýbajúci token, vypnutý flag) → reason */
  preflight?: (ctx: ConnectorContext) => string | null;
};

export function defineConnector<Q, R>(def: ConnectorDef<Q, R>): Connector<Q, R> {
  const fetchFn = async (q: Q, partial?: Partial<ConnectorContext>): Promise<Result<R>> => {
    const ctx = resolveContext(partial);
    const key = `${def.id}:${def.cacheKey(q)}`;
    if (def.flag && ctx.env[def.flag] !== 'true')
      return { ok: false, reason: `konektor vypnutý (${def.flag})`, retryable: false, connectorId: def.id };

    if (ctx.mode === 'fixtures' && def.fixture) {
      return {
        ok: true,
        data: await def.fixture(q),
        fetchedAt: ctx.now().toISOString(),
        fromCache: false,
        fromFixture: true,
        connectorId: def.id,
      };
    }
    if (!ctx.bypassCache) {
      const hit = await ctx.cache.get(key);
      if (hit)
        return {
          ok: true,
          data: hit.payload as R,
          fetchedAt: hit.fetchedAt,
          fromCache: true,
          fromFixture: false,
          connectorId: def.id,
        };
    }
    const pre = def.preflight?.(ctx);
    if (pre) return { ok: false, reason: pre, retryable: false, connectorId: def.id };
    try {
      await throttle(def.id, def.rateLimit?.perSec);
      const data = await def.request(q, ctx);
      await ctx.cache.set(key, def.id, data, def.ttlSec);
      return {
        ok: true,
        data,
        fetchedAt: ctx.now().toISOString(),
        fromCache: false,
        fromFixture: false,
        connectorId: def.id,
      };
    } catch (e) {
      const err =
        e instanceof ConnectorError ? e : new ConnectorError(e instanceof Error ? e.message : String(e));
      return { ok: false, reason: err.message, retryable: err.retryable, connectorId: def.id };
    }
  };

  const health = async (partial?: Partial<ConnectorContext>): Promise<HealthReport> => {
    const ctx = resolveContext({ ...partial, bypassCache: true });
    const checkedAt = ctx.now().toISOString();
    const pre = def.preflight?.(ctx);
    if (pre) return { connectorId: def.id, status: 'degraded', error: pre, checkedAt };
    if (!def.healthQuery) return { connectorId: def.id, status: 'unknown', checkedAt };
    const t0 = Date.now();
    const r = await fetchFn(def.healthQuery(), { ...ctx, mode: ctx.mode });
    const latencyMs = Date.now() - t0;
    if (r.ok)
      return { connectorId: def.id, status: latencyMs > 8000 ? 'degraded' : 'ok', latencyMs, checkedAt };
    return {
      connectorId: def.id,
      status: r.retryable ? 'down' : 'degraded',
      latencyMs,
      error: r.reason,
      checkedAt,
    };
  };

  return {
    id: def.id,
    steps: def.steps,
    kind: def.kind ?? 'live',
    ttlSec: def.ttlSec,
    rateLimit: def.rateLimit ?? {},
    legal: def.legal,
    verifiedAt: def.verifiedAt,
    sourceUrl: def.sourceUrl,
    fallback: def.fallback,
    flag: def.flag,
    fetch: fetchFn,
    health,
  };
}

/** Prevod „1,800" / „1.800" / „2800" na číslo. */
export const parseIskNumber = (s: string): number | null => {
  const m = s.replace(/\s/g, '').match(/\d{1,3}(?:[.,]\d{3})+|\d+/);
  if (!m) return null;
  return Number(m[0].replace(/[.,]/g, ''));
};
