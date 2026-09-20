import 'server-only';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import type { CacheStore, ConnectorId } from './types';

/** provider_cache v Postgrese (docs/03) – zdieľané medzi Vercel funkciami. */
export class DbCache implements CacheStore {
  async get(key: string) {
    const db = getDb();
    const [row] = await db
      .select()
      .from(schema.providerCache)
      .where(eq(schema.providerCache.key, key))
      .limit(1);
    if (!row) return null;
    if (row.expiresAt.getTime() < Date.now()) return null;
    return {
      payload: row.payload,
      fetchedAt: row.fetchedAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
    };
  }
  async set(key: string, connectorId: ConnectorId, payload: unknown, ttlSec: number) {
    const db = getDb();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSec * 1000);
    await db
      .insert(schema.providerCache)
      .values({ key, connectorId, payload, fetchedAt: now, expiresAt })
      .onConflictDoUpdate({
        target: schema.providerCache.key,
        set: { connectorId, payload, fetchedAt: now, expiresAt },
      });
  }
}
