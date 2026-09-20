// e2e blok 2.2: Cesty → Nová cesta → členovia (4) → Ako to funguje. Len testovacie kontá *.test@example.com (na konci zmazané).
// Spustenie: pnpm dev -p 3111 && node tests/e2e/trips-flow.mjs <adresár na PNG>
import { chromium } from '@playwright/test';
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

const SHOTS = process.argv[2];
const BASE = 'http://localhost:3111';
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY.trim(), {
  auth: { persistSession: false },
});
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', prepare: false, max: 1 });
const USERS = [
  ['owner.test@example.com', 'Lukáš Test', true],
  ['peter.test@example.com', 'Peter Test', false],
  ['jana.test@example.com', 'Jana Test', false],
  ['martin.test@example.com', 'Martin Test', false],
];
const PW = 'TestHeslo2027xyz';
const cleanup = async () => {
  // trips.owner_id nemá kaskádu (vlastníkove cesty sa nemažú potichu) → najprv cesty, potom kontá
  const emails = USERS.map(([e]) => e);
  await sql`delete from trips where owner_id in (select id from auth.users where email = any(${emails}))`;
  for (const u of (await admin.auth.admin.listUsers({ perPage: 200 })).data.users)
    if (emails.includes(u.email)) {
      const { error } = await admin.auth.admin.deleteUser(u.id);
      if (error) throw new Error(`deleteUser ${u.email}: ${error.message}`);
    }
};
await cleanup();
for (const [email, name, isAdmin] of USERS) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PW,
    email_confirm: true,
    app_metadata: { must_change_password: false, profile_completed: true },
  });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  await sql`insert into profiles (user_id, email, display_name, is_admin, must_change_password, completed_at, airports)
    values (${data.user.id}, ${email}, ${name}, ${isAdmin}, false, now(), '{KTW,BUD}'::text[])`;
}

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 820, height: 1180 } });
const p = await ctx.newPage();
p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
const shot = async (name) => {
  await p.waitForLoadState('networkidle');
  await p.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
  console.log(name, '→', p.url());
};

await p.goto(`${BASE}/sk/`);
await shot('01-landing');
await p.goto(`${BASE}/sk/ako-to-funguje`);
await shot('02-how-anon');
await p.goto(`${BASE}/sk/prihlasenie`);
await p.fill('input[name=email]', USERS[0][0]);
await p.fill('input[name=password]', PW);
await p.click('button[type=submit]');
await p.waitForURL(`${BASE}/sk`);
await shot('03-trips-empty');
await p.click('button:has-text("Nová cesta")');
await p.waitForURL('**/cesta/*');
const tripUrl = p.url();
await shot('04-trip-new');
await p.click('a:has-text("Členovia")');
await p.waitForURL('**/clenovia');
await shot('05-members-1');
for (const [email] of USERS.slice(1)) {
  await p.selectOption('select[name=userId]', { label: (await p.locator('select[name=userId] option', { hasText: email }).textContent()).trim() });
  await p.click('button:has-text("Pridať")');
  await p.waitForSelector(`text=${email}`);
}
await shot('06-members-4');
const rows = await p.locator('main .rounded-card >> text=/@example.com/').count();
console.log('členov v zozname:', rows);
const [{ n }] = await sql`select count(*)::int as n from travelers t join trips tr on tr.id = t.trip_id where tr.owner_id = (select id from auth.users where email = ${USERS[0][0]})`;
console.log('cestujúcich v DB:', n);
// rola + odobratie
await p.locator('form').filter({ has: p.locator('select[name=role]') }).nth(1).locator('select').selectOption('viewer'); // Jana → viewer
await p.waitForTimeout(800);
await p.goto(tripUrl);
await shot('07-trip-4-members');
await p.goto(`${BASE}/sk/`);
await shot('08-trips-list');
await p.goto(`${BASE}/sk/ako-to-funguje`);
await shot('09-how-signed');

// člen (Peter) vidí cestu, ale nespravuje členov
const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const q = await ctx2.newPage();
await q.goto(`${BASE}/sk/prihlasenie`);
await q.fill('input[name=email]', USERS[1][0]);
await q.fill('input[name=password]', PW);
await q.click('button[type=submit]');
await q.waitForURL(`${BASE}/sk`);
await q.screenshot({ path: `${SHOTS}/10-peter-trips-iphone.png`, fullPage: true });
await q.goto(tripUrl);
await q.screenshot({ path: `${SHOTS}/11-peter-trip-iphone.png`, fullPage: true });
await q.goto(`${tripUrl}/clenovia`);
await q.screenshot({ path: `${SHOTS}/12-peter-members-iphone.png`, fullPage: true });
console.log('peter vidí Pridať člena?', await q.locator('button:has-text("Pridať")').count());
console.log('roly v DB:', (await sql`select p.display_name, m.role from trip_members m join profiles p on p.user_id = m.user_id order by m.joined_at`).map((r) => `${r.display_name}=${r.role}`).join(', '));
await q.goto(tripUrl);
console.log('peter (editor) vidí Premenovať?', await q.locator('button:has-text("Premenovať")').count());

await b.close();
await cleanup();
await sql.end();
console.log('DONE (testovacie kontá zmazané; cesta padla kaskádou)');
