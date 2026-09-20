import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Server-only Drizzle klient (Postgres rola postgres obchádza RLS; prístup strážia features/*/access).
// Pre RLS-chránený prístup z UI sa používa Supabase klient (src/lib/supabase).
//
// Jeden klient na proces – aj v produkcii. Vercel lambda drží proces medzi requestami a Supabase Free má
// nízky limit spojení (EMAXCONN 20. 9. 2026, keď každý getDb() otváral nový pool). `max: 2` na serverless,
// `prepare: false` kvôli transakčnému pooleru (pgbouncer), idle spojenia sa zatvárajú po 20 s.
const globalForDb = globalThis as unknown as { pgClient?: ReturnType<typeof postgres>; pgUrl?: string };

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL chýba');
  if (!globalForDb.pgClient || globalForDb.pgUrl !== url) {
    globalForDb.pgClient = postgres(url, {
      ssl: 'require',
      prepare: false,
      max: process.env.NODE_ENV === 'production' ? 2 : 5,
      idle_timeout: 20,
      max_lifetime: 60 * 30,
      connect_timeout: 15,
    });
    globalForDb.pgUrl = url;
  }
  return drizzle(globalForDb.pgClient, { schema });
}

export type Db = ReturnType<typeof getDb>;
export { schema };
