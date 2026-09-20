import 'server-only';
import { getDb, schema } from '@/db';
import { DbCache } from './cache-db';
import { setDefaultCache } from './base';
import { CONNECTORS } from './index';
import type { HealthReport } from './types';

let initialized = false;
/** Na serveri: provider_cache v DB ako predvolená cache konektorov. */
export function initConnectors() {
  if (initialized) return;
  setDefaultCache(new DbCache());
  initialized = true;
}

/** Health všetkých konektorov + zápis do connector_health (tabuľka Stav zdrojov). */
export async function checkAllHealth(): Promise<HealthReport[]> {
  initConnectors();
  const reports = await Promise.all(CONNECTORS.map((c) => c.health()));
  const db = getDb();
  for (const r of reports) {
    await db
      .insert(schema.connectorHealth)
      .values({
        connectorId: r.connectorId,
        status: r.status,
        lastOkAt: r.status === 'ok' ? new Date(r.checkedAt) : undefined,
        lastError: r.error ?? null,
        latencyMs: r.latencyMs != null ? String(r.latencyMs) : null,
        checkedAt: new Date(r.checkedAt),
      })
      .onConflictDoUpdate({
        target: schema.connectorHealth.connectorId,
        set: {
          status: r.status,
          ...(r.status === 'ok' ? { lastOkAt: new Date(r.checkedAt) } : {}),
          lastError: r.error ?? null,
          latencyMs: r.latencyMs != null ? String(r.latencyMs) : null,
          checkedAt: new Date(r.checkedAt),
        },
      });
  }
  return reports;
}
