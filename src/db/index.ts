import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Server-only Drizzle klient (service role úroveň – Postgres rola postgres obchádza RLS).
// Pre RLS-chránený prístup z UI sa používa Supabase klient (src/lib/supabase).
const globalForDb = globalThis as unknown as { pgClient?: ReturnType<typeof postgres> };

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL chýba');
  const client = globalForDb.pgClient ?? postgres(url, { ssl: 'require', prepare: false, max: 5 });
  if (process.env.NODE_ENV !== 'production') globalForDb.pgClient = client;
  return drizzle(client, { schema });
}

export type Db = ReturnType<typeof getDb>;
export { schema };
