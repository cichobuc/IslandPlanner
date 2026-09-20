// Jednorazový SQL príkaz nad DB (keď drizzle-kit push potrebuje TTY): node scripts/db-sql.mjs "alter table pois add column if not exists wiki_url text"
import 'dotenv/config';
import postgres from 'postgres';
const stmt = process.argv[2];
if (!stmt) throw new Error('chýba SQL');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1, prepare: false });
const r = await sql.unsafe(stmt);
console.log('ok', r.count ?? r.length);
await sql.end();
