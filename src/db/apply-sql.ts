import 'dotenv/config';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { is, SQL } from 'drizzle-orm';
import { getTableConfig, PgDialect, PgPolicy, PgRole, PgTable } from 'drizzle-orm/pg-core';
import postgres from 'postgres';
import * as schema from './schema';

// Po `drizzle-kit push` doplní to, čo drizzle-kit nevie / robí zle:
//  1. src/db/sql/*.sql – RLS funkcie (security definer), triggery
//  2. RLS politiky s USING / WITH CHECK (drizzle-kit push ich vytvára bez podmienok!) – zdroj pravdy je pgPolicy v schéme
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL chýba');
  const sql = postgres(url, { ssl: 'require', max: 1, prepare: false, onnotice: () => {} });
  const dialect = new PgDialect();

  for (const f of ['functions.sql']) {
    await sql.unsafe(readFileSync(path.join(process.cwd(), 'src/db/sql', f), 'utf8'));
    console.log('✓', f);
  }

  const render = (chunk: unknown) => {
    if (!chunk) return null;
    if (is(chunk, SQL)) {
      const q = dialect.sqlToQuery(chunk);
      if (q.params.length) throw new Error(`Politika s parametrami nie je podporovaná: ${q.sql}`);
      return q.sql;
    }
    return String(chunk);
  };
  const roles = (to: PgPolicy['to']) => {
    const list = Array.isArray(to) ? to : to ? [to] : ['public'];
    return list
      .map((r) => (is(r, PgRole) ? `"${r.name}"` : r === 'public' ? 'public' : `"${String(r)}"`))
      .join(', ');
  };

  let n = 0;
  for (const value of Object.values(schema)) {
    if (!is(value, PgTable)) continue;
    const { name: table, policies } = getTableConfig(value);
    for (const p of policies) {
      const using = render(p.using);
      const check = render(p.withCheck);
      const stmt =
        `create policy "${p.name}" on "${table}" as ${(p.as ?? 'permissive').toUpperCase()} for ${(p.for ?? 'all').toUpperCase()} to ${roles(p.to)}` +
        (using ? ` using (${using})` : '') +
        (check ? ` with check (${check})` : '');
      await sql.unsafe(`drop policy if exists "${p.name}" on "${table}"`);
      await sql.unsafe(stmt);
      n++;
    }
  }
  console.log(`✓ ${n} RLS politík s USING/WITH CHECK`);

  const missing =
    await sql`select tablename, policyname from pg_policies where schemaname = 'public' and qual is null and with_check is null`;
  if (missing.length) {
    console.error(
      '✗ politiky bez podmienky:',
      missing.map((m) => `${m.tablename}.${m.policyname}`).join(', '),
    );
    process.exitCode = 1;
  }
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
