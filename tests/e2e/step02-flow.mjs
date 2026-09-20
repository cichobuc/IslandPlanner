// e2e blok 2.4: krok 02 – auto vyhľadávanie (SSE), heatmapa, výber letu → kaskáda (dátumy, dni, noci), ručný let, zrušenie.
// Spustenie: pnpm dev -p 3111 && node tests/e2e/step02-flow.mjs <adresár na PNG>   (živé konektory, ~1–3 min)
import { chromium } from '@playwright/test';
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

const SHOTS = process.argv[2];
const BASE = 'http://localhost:3111';
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY.trim(), { auth: { persistSession: false } });
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', prepare: false, max: 1 });
const EMAIL = 'owner.test@example.com';
const PW = 'TestHeslo2027xyz';
const cleanup = async () => {
  await sql`delete from trips where owner_id in (select id from auth.users where email = ${EMAIL})`;
  for (const u of (await admin.auth.admin.listUsers({ perPage: 200 })).data.users)
    if (u.email === EMAIL) {
      const { error } = await admin.auth.admin.deleteUser(u.id);
      if (error) throw new Error(error.message);
    }
};
await cleanup();
{
  const { data, error } = await admin.auth.admin.createUser({ email: EMAIL, password: PW, email_confirm: true, app_metadata: { must_change_password: false, profile_completed: true } });
  if (error) throw new Error(error.message);
  await sql`insert into profiles (user_id, email, display_name, must_change_password, completed_at, birth_date, airports)
    values (${data.user.id}, ${EMAIL}, 'Lukáš Test', false, now(), '1993-03-12', '{KTW,BUD}'::text[])`;
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
await p.goto(`${BASE}/sk/prihlasenie`);
await p.fill('input[name=email]', EMAIL);
await p.fill('input[name=password]', PW);
await p.click('button[type=submit]');
await p.waitForURL(`${BASE}/sk`);
await p.click('button:has-text("Nová cesta")');
await p.waitForURL('**/cesta/*');
const tripUrl = p.url().split('?')[0];
await p.goto(`${tripUrl}?krok=2`);
await p.waitForSelector('text=Hľadám lety', { timeout: 20000 });
await shot('01-searching');
const t0 = Date.now();
await p.waitForSelector('button:has-text("Vybrať")', { timeout: 240000 });
console.log('vyhľadávanie hotové za', Math.round((Date.now() - t0) / 1000), 's');
await shot('02-results');
const [srch] = await sql`select count(*)::int as n from flight_options o join trips t on t.id=o.trip_id where t.owner_id=(select id from auth.users where email=${EMAIL})`;
console.log('flight_options v DB:', srch.n);
// klik na najlacnejší deň (⚡)
const best = p.locator('button:has([aria-label="najlacnejší deň"])').first();
if (await best.count()) {
  await best.click();
  await p.waitForTimeout(300);
  await shot('03-day-filter');
}
// vybrať prvú kombináciu
await p.locator('button:has-text("Vybrať")').first().click();
await p.waitForSelector('text=Let vybraný', { timeout: 60000 });
await shot('04-selected-toast');
const [trip] = await sql`select start_date::text, end_date::text, route_preset from trips where owner_id=(select id from auth.users where email=${EMAIL})`;
const [[days], [nights]] = await Promise.all([
  sql`select count(*)::int as n from itinerary_days d join trips t on t.id=d.trip_id where t.owner_id=(select id from auth.users where email=${EMAIL})`,
  sql`select scenario_key, count(*)::int as n from lodging_stays s join trips t on t.id=s.trip_id where t.owner_id=(select id from auth.users where email=${EMAIL}) group by scenario_key order by scenario_key`.then((r) => [r.map((x) => `${x.scenario_key}=${x.n}`).join(',')]),
]);
console.log('trip:', JSON.stringify(trip), 'dni:', days.n, 'noci:', nights);
await p.goto(`${tripUrl}?krok=2`);
await shot('05-selected-pinned');
// ručný let
await p.click('button:has-text("Zadať let ručne")');
await p.waitForSelector('[role=dialog]');
await p.fill('[role=dialog] input[name=priceGroup]', '980');
await shot('06-manual-sheet');
await p.click('[role=dialog] button:has-text("Uložiť a prepočítať")');
await p.waitForSelector('text=Ručný let uložený', { timeout: 60000 });
const [trip2] = await sql`select start_date::text, end_date::text from trips where owner_id=(select id from auth.users where email=${EMAIL})`;
console.log('po ručnom lete:', JSON.stringify(trip2));
await p.goto(`${tripUrl}`);
await shot('07-trip-after-flight');
// iPhone
const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 } });
const q = await ctx2.newPage();
await q.goto(`${BASE}/sk/prihlasenie`);
await q.fill('input[name=email]', EMAIL);
await q.fill('input[name=password]', PW);
await q.click('button[type=submit]');
await q.waitForURL(`${BASE}/sk`);
await q.goto(`${tripUrl}?krok=2`);
await q.waitForLoadState('networkidle');
await q.screenshot({ path: `${SHOTS}/08-iphone-step02.png`, fullPage: true });
await b.close();
await cleanup();
await sql.end();
console.log('DONE');
