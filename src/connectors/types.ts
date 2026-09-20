/** Jednotné rozhranie konektorov (docs/04). */
export type ConnectorId =
  | 'tp-flights'
  | 'ryanair'
  | 'wizz'
  | 'gflights'
  | 'viator'
  | 'osrm'
  | 'ors'
  | 'overpass'
  | 'nominatim'
  | 'gasvaktin'
  | 'frankfurter'
  | 'open-meteo'
  | 'openfreemap'
  | 'drone-zones'
  | 'tjalda'
  | 'tjalda-geo'
  | 'parka'
  | 'manual'
  | 'seed';

export type StepNo = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type HealthStatus = 'ok' | 'degraded' | 'down' | 'unknown';

export type Result<R> =
  | {
      ok: true;
      data: R;
      fetchedAt: string;
      fromCache: boolean;
      fromFixture: boolean;
      connectorId: ConnectorId;
    }
  | { ok: false; reason: string; retryable: boolean; connectorId: ConnectorId };

export type HealthReport = {
  connectorId: ConnectorId;
  status: HealthStatus;
  latencyMs?: number;
  error?: string;
  checkedAt: string;
};

export interface CacheStore {
  get(key: string): Promise<{ payload: unknown; fetchedAt: string; expiresAt: string } | null>;
  set(key: string, connectorId: ConnectorId, payload: unknown, ttlSec: number): Promise<void>;
}

export type ConnectorMode = 'live' | 'fixtures';

export type ConnectorContext = {
  cache: CacheStore;
  mode: ConnectorMode;
  fetchImpl: typeof fetch;
  now: () => Date;
  /** ignoruj cache (health probe, cron refresh) */
  bypassCache?: boolean;
  env: Record<string, string | undefined>;
};

export interface Connector<Q, R> {
  id: ConnectorId;
  steps: StepNo[];
  kind: 'live' | 'cached' | 'seed' | 'manual';
  ttlSec: number;
  rateLimit: { perSec?: number; perDay?: number };
  legal: 'official' | 'affiliate' | 'unofficial' | 'open-data';
  verifiedAt: string;
  sourceUrl: string;
  fallback?: ConnectorId;
  /** feature flag (env) – neoficiálne konektory */
  flag?: string;
  fetch(q: Q, ctx?: Partial<ConnectorContext>): Promise<Result<R>>;
  health(ctx?: Partial<ConnectorContext>): Promise<HealthReport>;
}
