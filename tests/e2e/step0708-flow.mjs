// e2e blok 2.8: hlavička Odhad cesty, krok 07 (úroveň, deň-override), krok 08 (súhrn, scenáre, na osobu, ručná položka, export JSON/CSV).
// Spustenie: pnpm dev -p 3111 && node tests/e2e/step0708-flow.mjs <adresár na PNG>
import { chromium } from '@playwright/test';
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

const SHOTS = process.argv[2];
const BASE = 'http://localhost:3111';
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY.trim(), { auth: { persistSession: false } });
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', prepare: false, max: 1 });
const USERS = [
  ['owner.test@example.com', 'Lukáš Test', '1993-03-12'],
  ['peter.test@example.com', 'Peter Test', '1996-07-01'],
];
const PW = 'TestHeslo2027xyz';
const cleanup = async () => {
  const emails = USERS.map(([e]) => e);
  await sql`delete from trips where owner_id in (select id from auth.users where email = any(${emails}))`;
  for (const u of (await admin.auth.admin.listUsers({ perPage: 200 })).data.users)
    if (emails.includes(u.email)) {
      const { error } = await admin.auth.admin.deleteUser(u.id);
      if (error) throw new Error(error.message);
    }
};
await cleanup();
for (const [email, name, birth] of USERS) {
  const { data, error } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true, app_metadata: { must_change_password: false, profile_completed: true } });
  if (error) throw new Error(error.message);
  await sql`insert into profiles (user_id, email, display_name, must_change_password, completed_at, birth_date, driver_licence, has_credit_card, airports, interests)
    values (${data.user.id}, ${email}, ${name}, false, now(), ${birth}, ${sql.json({ has: true, sinceYear: 2012, willingToDrive: 'yes' })}, true, '{KTW,BUD}'::text[], ${sql.json({ thermal: 3, glacier: 2 })})`;
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
const owner = () => sql`select id from auth.users where email=${USERS[0][0]}`;
await p.goto(`${BASE}/sk/prihlasenie`);
await p.fill('input[name=email]', USERS[0][0]);
await p.fill('input[name=password]', PW);
await p.click('button[type=submit]');
await p.waitForURL(`${BASE}/sk`);
await p.click('button:has-text("Nová cesta")');
await p.waitForURL('**/cesta/*');
const tripUrl = p.url().split('?')[0];
// člen Peter (2 os.)
await p.goto(`${tripUrl}/clenovia`);
const opt = (await p.locator('select[name=userId] option', { hasText: 'peter.test' }).textContent()).trim();
await p.selectOption('select[name=userId]', { label: opt });
await p.click('button:has-text("Pridať")');
await p.waitForSelector('main .rounded-card >> text=peter.test@example.com');
// let → auto → vozidlo → trasa
await p.goto(`${tripUrl}?krok=2`);
await p.click('button:has-text("Zadať let ručne")');
await p.waitForSelector('[role=dialog]');
await p.fill('[role=dialog] input[name=priceGroup]', '1280');
await p.click('[role=dialog] button:has-text("Uložiť a prepočítať")');
await p.waitForSelector('text=Ručný let uložený', { timeout: 60000 });
await p.goto(`${tripUrl}?krok=3`);
await p.click('[role=radio]:has-text("Auto")');
await p.waitForSelector('button:has-text("Zvoliť")', { timeout: 20000 });
await p.locator('button:has-text("Zvoliť")').nth(1).click();
await p.waitForSelector('button:has-text("Zvolené")', { timeout: 20000 });
await p.goto(`${tripUrl}?krok=4`, { timeout: 90000 });
await p.click('button:has-text("Generovať")');
await p.waitForSelector('text=/[1-9]\\d* zastávok/', { timeout: 60000 });
await p.waitForSelector('button:has-text("Pregenerovať")', { timeout: 20000 });
await shot('01-header-estimate');
// krok 07
await p.goto(`${tripUrl}?krok=7`);
await shot('02-step07');
await p.click('label:has(input[name=level][value=mid])');
await p.click('button:has-text("Uložiť")');
await p.waitForSelector('text=Uložené.', { timeout: 20000 });
await p.locator('select[name=level][aria-label="Úroveň dňa"]').nth(2).selectOption('comfort');
await p.waitForTimeout(1500);
await shot('03-step07-mid');
const [fp] = await sql`select level, day_overrides from food_profile f join trips t on t.id=f.trip_id where t.owner_id=(${owner()})`;
console.log('food_profile:', JSON.stringify(fp));
// krok 08
await p.goto(`${tripUrl}?krok=8`);
await shot('04-step08-summary');
await p.click('button:has-text("Scenáre")');
await shot('05-step08-scenarios');
await p.click('button:has-text("Na osobu")');
await shot('06-step08-per-person');
await p.click('button:has-text("Položka")');
await p.waitForSelector('[role=dialog]');
await p.fill('[role=dialog] input[name=label]', 'Cestovné poistenie s ľadovcami');
await p.fill('[role=dialog] input[name=amount]', '45');
await p.click('[role=dialog] label:has(input[name=split][value=person])');
await p.click('[role=dialog] button:has-text("Pridať")');
await p.waitForSelector('text=Cestovné poistenie', { timeout: 20000 });
await p.click('button:has-text("Súhrn")');
await p.fill('input[name=reservePct]', '5');
await p.fill('input[name=budgetTargetPp]', '1500');
await p.locator('form:has(input[name=reservePct]) button:has-text("Uložiť")').click();
await p.waitForSelector('text=Uložené.', { timeout: 20000 });
await shot('07-step08-final');
const json = await p.request.get(`${tripUrl.replace('/sk/cesta/', '/api/trips/')}/export?format=json`);
const csv = await p.request.get(`${tripUrl.replace('/sk/cesta/', '/api/trips/')}/export?format=csv`);
const j = await json.json();
console.log('export json:', json.status(), 'group', j.budget?.scenarios?.car?.group, 'pax', j.budget?.pax, '| csv:', csv.status(), (await csv.text()).split('\n').length, 'riadkov');
const [tr] = await sql`select reserve_pct, budget_target_pp from trips where owner_id=(${owner()})`;
console.log('trip settings:', JSON.stringify(tr));
const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 } });
const q = await ctx2.newPage();
await q.goto(`${BASE}/sk/prihlasenie`);
await q.fill('input[name=email]', USERS[1][0]);
await q.fill('input[name=password]', PW);
await q.click('button[type=submit]');
await q.waitForURL(`${BASE}/sk`);
await q.goto(`${tripUrl}?krok=8`);
await q.waitForLoadState('networkidle');
await q.screenshot({ path: `${SHOTS}/08-iphone-step08.png`, fullPage: true });
await b.close();
await cleanup();
await sql.end();
console.log('DONE');
