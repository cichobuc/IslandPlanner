import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Server-only Drizzle klient (Postgres rola postgres obchádza RLS; prístup strážia features/*/access).
// Pre RLS-chránený prístup z UI sa používa Supabase klient (src/lib/supabase).
//
// Driver `pg` (node-postgres), nie postgres.js: postgres.js cez Supavisor (transakčný pooler, port 6543) zamŕzal,
// keď sa dotazy radili do fronty nad `max` (reprodukované 20. 9. 2026, `pg` prešiel 25 kôl). Jeden pool na proces
// aj v produkcii – predtým každý getDb() otváral nový pool → EMAXCONN na Supabase Free. `max: 2` na lambdu stačí,
// pooler multiplexuje; lokálne 5.
const globalForDb = globalThis as unknown as { pgPool?: Pool; pgUrl?: string };

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL chýba');
  if (!globalForDb.pgPool || globalForDb.pgUrl !== url) {
    globalForDb.pgPool = new Pool({
      connectionString: url,
      max: process.env.NODE_ENV === 'production' ? 2 : 5,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15_000,
      idleTimeoutMillis: 30_000,
    });
    globalForDb.pgPool.on('error', (e) => console.error('[db] pool error', e.message));
    globalForDb.pgUrl = url;
  }
  return drizzle(globalForDb.pgPool, { schema });
}

export type Db = ReturnType<typeof getDb>;
export { schema };
