// e2e blok 2.5: krok 03 – ručný let (rýchle dátumy) → Auto → vozidlo → poistenie → prepnutie na Karavan (dáta Auto ostávajú).
// Spustenie: pnpm dev -p 3111 && node tests/e2e/step03-flow.mjs <adresár na PNG>
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
  await sql`insert into profiles (user_id, email, display_name, must_change_password, completed_at, birth_date, driver_licence, has_credit_card, airports)
    values (${data.user.id}, ${EMAIL}, 'Lukáš Test', false, now(), '1993-03-12', ${sql.json({ has: true, sinceYear: 2012, willingToDrive: 'yes' })}, true, '{KTW,BUD}'::text[])`;
}
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 820, height: 1180 } });
const p = await ctx.newPage();
p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
const shot = async (name) => {
  await p.waitForLoadState('networkidle');
  await p.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
  console.log(name);
};
await p.goto(`${BASE}/sk/prihlasenie`);
await p.fill('input[name=email]', EMAIL);
await p.fill('input[name=password]', PW);
await p.click('button[type=submit]');
await p.waitForURL(`${BASE}/sk`);
await p.click('button:has-text("Nová cesta")');
await p.waitForURL('**/cesta/*');
const tripUrl = p.url().split('?')[0];
// ručný let (bez čakania na živé vyhľadávanie)
await p.goto(`${tripUrl}?krok=2`);
await p.click('button:has-text("Zadať let ručne")');
await p.waitForSelector('[role=dialog]');
await p.fill('[role=dialog] input[name=priceGroup]', '640');
await p.click('[role=dialog] button:has-text("Uložiť a prepočítať")');
await p.waitForSelector('text=Ručný let uložený', { timeout: 60000 });
await p.goto(`${tripUrl}?krok=3`);
await shot('01-step03-undecided');
await p.click('[role=radio]:has-text("Auto")');
await p.waitForSelector('text=Vozidlo', { timeout: 20000 });
await shot('02-step03-car');
await p.locator('button:has-text("Zvoliť")').first().click();
await p.waitForSelector('button:has-text("Zvolené")', { timeout: 20000 });
await shot('03-vehicle-chosen');
const [v1] = await sql`select s.scenario_key, s.days, s.insurance_chosen, s.extras_chosen, o.name from vehicle_selection s join vehicle_options o on o.id=s.vehicle_option_id join trips t on t.id=s.trip_id where t.owner_id=(select id from auth.users where email=${EMAIL})`;
console.log('výber:', JSON.stringify(v1));
// poistenie: klik na prvý nezahrnutý checkbox, ak existuje
const insToggle = p.locator('label:has(input[name=insurance]:not(:disabled))').first();
if (await insToggle.count()) {
  await insToggle.click();
  await p.waitForTimeout(1500);
  const [v2] = await sql`select insurance_chosen from vehicle_selection where scenario_key='car' limit 1`;
  console.log('po prepnutí poistenia:', JSON.stringify(v2));
}
// prepnúť na Karavan
await p.click('[role=radio]:has-text("Karavan")');
await p.waitForSelector('text=/spí \\d/', { timeout: 20000 });
await shot('04-step03-camper');
await p.locator('button:has-text("Zvoliť")').first().click();
await p.waitForSelector('button:has-text("Zvolené")', { timeout: 20000 });
const rows = await sql`select s.scenario_key, o.name from vehicle_selection s join vehicle_options o on o.id=s.vehicle_option_id join trips t on t.id=s.trip_id where t.owner_id=(select id from auth.users where email=${EMAIL}) order by s.scenario_key`;
console.log('výbery per vetva:', rows.map((r) => `${r.scenario_key}=${r.name}`).join(' | '));
const [trip] = await sql`select transport_mode from trips where owner_id=(select id from auth.users where email=${EMAIL})`;
console.log('transport_mode:', trip.transport_mode);
await p.goto(`${tripUrl}`);
await shot('05-trip-after-step03');
const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 } });
const q = await ctx2.newPage();
await q.goto(`${BASE}/sk/prihlasenie`);
await q.fill('input[name=email]', EMAIL);
await q.fill('input[name=password]', PW);
await q.click('button[type=submit]');
await q.waitForURL(`${BASE}/sk`);
await q.goto(`${tripUrl}?krok=3`);
await q.waitForLoadState('networkidle');
await q.screenshot({ path: `${SHOTS}/06-iphone-step03.png`, fullPage: true });
await b.close();
await cleanup();
await sql.end();
console.log('DONE');
