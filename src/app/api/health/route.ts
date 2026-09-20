import { NextResponse } from 'next/server';
import { CONNECTORS } from '@/connectors';
import { checkAllHealth } from '@/connectors/server';
import type { HealthReport } from '@/connectors/types';
import { getDb, schema } from '@/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const FRESH_MS = 5 * 60 * 1000;

/** GET /api/health – stav konektorov. Živý probe max. 1× za 5 min (alebo ?fresh=1), inak posledný zápis z connector_health. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const t0 = Date.now();
  let reports: HealthReport[] | null = null;
  let cached = false;
  if (url.searchParams.get('fresh') !== '1') {
    const rows = await getDb().select().from(schema.connectorHealth);
    const recent = rows.filter((r) => r.checkedAt && Date.now() - r.checkedAt.getTime() < FRESH_MS);
    if (
      recent.length >= CONNECTORS.length &&
      CONNECTORS.every((c) => recent.some((r) => r.connectorId === c.id))
    ) {
      reports = CONNECTORS.map((c) => {
        const r = recent.find((x) => x.connectorId === c.id)!;
        return {
          connectorId: c.id,
          status: r.status,
          latencyMs: r.latencyMs != null ? Number(r.latencyMs) : undefined,
          error: r.lastError ?? undefined,
          checkedAt: r.checkedAt!.toISOString(),
        };
      });
      cached = true;
    }
  }
  reports ??= await checkAllHealth();
  const summary = {
    ok: reports.filter((r) => r.status === 'ok').length,
    total: reports.length,
    cached,
    ms: Date.now() - t0,
    mode: process.env.CONNECTOR_MODE === 'fixtures' ? 'fixtures' : 'live',
    connectors: reports.map((r) => {
      const c = CONNECTORS.find((x) => x.id === r.connectorId)!;
      return {
        id: r.connectorId,
        status: r.status,
        latencyMs: r.latencyMs ?? null,
        error: r.error ?? null,
        checkedAt: r.checkedAt,
        steps: c.steps,
        legal: c.legal,
        ttlSec: c.ttlSec,
        fallback: c.fallback ?? null,
      };
    }),
  };
  return NextResponse.json(summary, { status: summary.ok === summary.total ? 200 : 207 });
}
