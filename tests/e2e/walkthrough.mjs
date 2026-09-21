// Prehliadka: celý tok ako full-flow, ale na desktope (1440×1000), trip ostane v DB (testovací vlastník) a PNG každého kroku.
// Spustenie: pnpm dev -p 3111 && node tests/e2e/walkthrough.mjs <adresár na PNG>
import { chromium } from '@playwright/test';
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

const SHOTS = process.argv[2] ?? '/tmp';
const BASE = process.env.E2E_BASE ?? 'http://localhost:3111';
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY.trim(), { auth: { persistSession: false } });
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', prepare: false, max: 1 });
const USERS = [
  ['owner.walk@example.com', 'Lukáš Test', '1993-03-12'],
  ['peter.walk@example.com', 'Peter Test', '1996-07-01'],
  ['jana.walk@example.com', 'Jana Test', '1998-02-20'],
  ['martin.walk@example.com', 'Martin Test', '1986-11-05'],
];
const PW = 'TestHeslo2027xyz';
const t0 = Date.now();
const log = (...a) => console.log(`[${String(Math.round((Date.now() - t0) / 1000)).padStart(3)}s]`, ...a);
const cleanup = async () => {
  const emails = USERS.map(([e]) => e);
  await sql`delete from trips where owner_id in (select id from auth.users where email = any(${emails}))`;
  for (const u of (await admin.auth.admin.listUsers({ perPage: 200 })).data.users)
    if (emails.includes(u.email)) {
      const { error } = await admin.auth.admin.deleteUser(u.id);
      if (error) throw new Error(error.message);
    }
};
if (process.argv[3] === 'cleanup') { await cleanup(); await sql.end(); log('cleanup ✓'); process.exit(0); }
await cleanup();
for (const [email, name, birth] of USERS) {
  const { data, error } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true, app_metadata: { must_change_password: false, profile_completed: true } });
  if (error) throw new Error(error.message);
  await sql`insert into profiles (user_id, email, display_name, must_change_password, completed_at, birth_date, driver_licence, has_credit_card, airports, interests)
    values (${data.user.id}, ${email}, ${name}, false, now(), ${birth}, ${sql.json({ has: true, sinceYear: 2012, willingToDrive: 'yes' })}, ${email.startsWith('owner')}, '{KTW,BUD,VIE}'::text[], ${sql.json({ thermal: 3, glacier: 2, hike: 2 })})`;
}
const b = await chromium.launch();
const PHONE = process.env.PHONE === '1';
const ctx = await b.newContext(PHONE ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: 1440, height: 1000 } });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
const shot = async (name) => {
  await p.waitForLoadState('networkidle').catch(() => {});
  await p.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
  log(name);
};

await p.goto(`${BASE}/sk/prihlasenie`);
await p.fill('input[name=email]', USERS[0][0]);
await p.fill('input[name=password]', PW);
await p.click('button[type=submit]');
await p.waitForURL(`${BASE}/sk`);
await shot('00-cesty');
await p.click('button:has-text("Nová cesta")');
await p.waitForURL('**/cesta/*');
const tripUrl = p.url().split('?')[0];
log('trip', tripUrl);
await p.goto(`${tripUrl}/clenovia`);
for (const [email] of USERS.slice(1)) {
  const opt = (await p.locator('select[name=userId] option', { hasText: email }).textContent()).trim();
  await p.selectOption('select[name=userId]', { label: opt });
  await p.click('button:has-text("Pridať")');
  await p.waitForSelector(`main .rounded-card >> text=${email}`);
}
await p.goto(`${tripUrl}?krok=1`);
await p.locator('form:has(input[name=iata][value=VIE]) button').click();
await p.waitForTimeout(1200);
await shot('01-cestujuci');
await p.goto(`${tripUrl}?krok=2`);
await p.locator('button:has-text("Zadať let ručne"):visible').first().click();
await p.waitForSelector('[role=dialog]');
await p.fill('[role=dialog] input[name=priceGroup]', '1180');
await p.click('[role=dialog] button:has-text("Uložiť a prepočítať")');
await p.waitForSelector('text=Ručný let uložený', { timeout: 60000 });
await shot('02-letenky');
// rozpis letu: parkovanie preč → suma klesne; iné parkovisko
const park = p.locator('li:has-text("Parkovanie") button:has-text("Dať preč")');
if (await park.count()) {
  const before = await p.locator('text=/Letenky\\s+[\\d\\s]+€/').first().textContent().catch(() => '');
  await park.click();
  await p.waitForSelector('li:has-text("Parkovanie") button:has-text("Vrátiť")', { timeout: 20000 });
  await shot('02b-letenky-bez-parkovania');
  await p.click('li:has-text("Parkovanie") button:has-text("Vrátiť")');
  await p.waitForSelector('li:has-text("Parkovanie") button:has-text("Dať preč")', { timeout: 20000 });
  log('parkovanie preč/späť ✓', before ?? '');
}
await p.goto(`${tripUrl}?krok=3`);
await p.click('[role=radio]:has-text("Auto")');
await p.waitForSelector('button:has-text("Zvoliť")', { timeout: 20000 });
await p.locator('button:has-text("Zvoliť")').nth(1).click();
await p.waitForSelector('button:has-text("Zvolené")', { timeout: 20000 });
await shot('03-doprava');
await p.goto(`${tripUrl}?krok=4`, { timeout: 90000 });
await p.click('button:has-text("Generovať")');
await p.waitForSelector('text=/[1-9]\\d* zastávok/', { timeout: 60000 });
await p.waitForSelector('button:has-text("Pregenerovať")', { timeout: 20000 });
await shot('04-itinerar');
// vlastný limit na atrakcie 200 €/os + pregenerovanie
await p.click('button:has-text("Upraviť limit")');
await p.fill('input[name=ppEur]', '200');
await p.click('form:has(input[name=ppEur]) button:has-text("Uložiť")');
await p.waitForSelector('text=limit 200 €/os', { timeout: 20000 });
await p.click('button:has-text("Pregenerovať nezamknuté")');
await p.waitForTimeout(4000);
await p.waitForSelector('button:has-text("Pregenerovať")', { timeout: 20000 });
await shot('04b-itinerar-limit200');
await p.goto(`${tripUrl}?krok=5`);
await shot('05-kde-spat');
await p.click('button:has-text("Airbnb · byt pre 4")');
await p.waitForTimeout(2500);
await shot('05b-kde-spat-airbnb');
await p.goto(`${tripUrl}?krok=6`);
await shot('06-atrakcie');
const swap = p.locator('button:has-text("Vymeniť")').first();
if (await swap.count()) {
  await swap.click();
  await p.waitForTimeout(3000);
  await shot('06b-atrakcie-swap');
}
await p.goto(`${tripUrl}?krok=7`);
await shot('07-strava');
await p.goto(`${tripUrl}?krok=8`);
await shot('08-rozpocet');
const exp = await p.request.get(`${tripUrl.replace('/sk/cesta/', '/api/trips/')}/export?format=json`);
const j = await exp.json();
await import('node:fs').then((fs) => fs.writeFileSync(`${SHOTS}/export.json`, JSON.stringify(j, null, 1)));
await p.goto(`${tripUrl}/tlac`);
await p.waitForSelector('text=Checklist pred cestou');
await shot('09-tlac');
await b.close();
await sql.end();
if (errors.length) log('PAGEERRORS:', errors);
log('DONE', tripUrl);
