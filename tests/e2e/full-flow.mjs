// Blok 2.9: celý tok na iPade (820×1180): prihlásenie → Cesty → nová cesta → 01 → 02 (ručný let) → 03 → 04 generátor → 05 ponuka → 06 → 07 → 08 export.
// Testovacie kontá *.test@example.com (na konci zmazané). Spustenie: pnpm dev -p 3111 && pnpm e2e <adresár na PNG>
import { chromium } from '@playwright/test';
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

const SHOTS = process.argv[2] ?? '/tmp';
const BASE = process.env.E2E_BASE ?? 'http://localhost:3111';
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY.trim(), { auth: { persistSession: false } });
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', prepare: false, max: 1 });
const USERS = [
  ['owner.test@example.com', 'Lukáš Test', '1993-03-12'],
  ['peter.test@example.com', 'Peter Test', '1996-07-01'],
  ['jana.test@example.com', 'Jana Test', '1998-02-20'],
  ['martin.test@example.com', 'Martin Test', '1986-11-05'],
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
await cleanup();
for (const [email, name, birth] of USERS) {
  const { data, error } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true, app_metadata: { must_change_password: false, profile_completed: true } });
  if (error) throw new Error(error.message);
  await sql`insert into profiles (user_id, email, display_name, must_change_password, completed_at, birth_date, driver_licence, has_credit_card, airports, interests)
    values (${data.user.id}, ${email}, ${name}, false, now(), ${birth}, ${sql.json({ has: true, sinceYear: 2012, willingToDrive: 'yes' })}, ${email.startsWith('owner')}, '{KTW,BUD,VIE}'::text[], ${sql.json({ thermal: 3, glacier: 2, hike: 2 })})`;
}
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
const shot = async (name) => {
  await p.waitForLoadState('networkidle').catch(() => {});
  await p.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
  log(name);
};
const owner = () => sql`select id from auth.users where email=${USERS[0][0]}`;

await p.goto(`${BASE}/sk/prihlasenie`);
await p.fill('input[name=email]', USERS[0][0]);
await p.fill('input[name=password]', PW);
await p.click('button[type=submit]');
await p.waitForURL(`${BASE}/sk`);
await shot('00-cesty');
await p.click('button:has-text("Nová cesta")');
await p.waitForURL('**/cesta/*');
const tripUrl = p.url().split('?')[0];
// členovia → 4
await p.goto(`${tripUrl}/clenovia`);
for (const [email] of USERS.slice(1)) {
  const opt = (await p.locator('select[name=userId] option', { hasText: email }).textContent()).trim();
  await p.selectOption('select[name=userId]', { label: opt });
  await p.click('button:has-text("Pridať")');
  await p.waitForSelector(`main .rounded-card >> text=${email}`);
}
await shot('00b-clenovia');
// 01
await p.goto(`${tripUrl}?krok=1`);
await p.locator('form:has(input[name=iata][value=VIE]) button').click();
await p.waitForTimeout(1200);
await shot('01-cestujuci');
// 02 – ručný let (živé vyhľadávanie beží na pozadí; nezávisíme od neho)
await p.goto(`${tripUrl}?krok=2`);
await p.click('button:has-text("Zadať let ručne")');
await p.waitForSelector('[role=dialog]');
await p.fill('[role=dialog] input[name=priceGroup]', '1180');
await p.click('[role=dialog] button:has-text("Uložiť a prepočítať")');
await p.waitForSelector('text=Ručný let uložený', { timeout: 60000 });
await shot('02-letenky');
// 03
await p.goto(`${tripUrl}?krok=3`);
await p.click('[role=radio]:has-text("Auto")');
await p.waitForSelector('button:has-text("Zvoliť")', { timeout: 20000 });
await p.locator('button:has-text("Zvoliť")').nth(1).click();
await p.waitForSelector('button:has-text("Zvolené")', { timeout: 20000 });
await shot('03-doprava');
// 04
await p.goto(`${tripUrl}?krok=4`, { timeout: 90000 });
await p.click('button:has-text("Generovať")');
await p.waitForSelector('text=/[1-9]\\d* zastávok/', { timeout: 60000 });
await p.waitForSelector('button:has-text("Pregenerovať")', { timeout: 20000 });
await shot('04-itinerar');
// 05
await p.goto(`${tripUrl}?krok=5`);
await p.locator('button:has-text("Spresniť")').nth(2).click();
await p.waitForSelector('[role=dialog]');
await p.fill('[role=dialog] input[name=name]', 'Vík Cottages');
await p.fill('[role=dialog] input[name=pricePerNight]', '236');
await p.click('[role=dialog] button:has-text("Vložiť ponuku")');
await p.waitForSelector('text=Vík Cottages', { timeout: 20000 });
await shot('05-kde-spat');
// 06
await p.goto(`${tripUrl}?krok=6`);
await shot('06-atrakcie');
// 07
await p.goto(`${tripUrl}?krok=7`);
await shot('07-strava');
// 08
await p.goto(`${tripUrl}?krok=8`);
await shot('08-rozpocet');
const exp = await p.request.get(`${tripUrl.replace('/sk/cesta/', '/api/trips/')}/export?format=json`);
const j = await exp.json();
const car = j.budget?.scenarios?.car;
log('rozpočet:', 'pax', j.budget?.pax, 'celkom', car?.group, '/os', car?.perPerson, 'rozsah', car?.min, '–', car?.max);
const perPersonSum = Object.values(car?.perTraveler ?? {}).reduce((a, x) => a + x, 0);
log('kontrola: Σ na osobu =', Math.round(perPersonSum), 'vs celkom', Math.round(car?.group ?? 0), Math.abs(perPersonSum - car.group) < 1 ? '✓' : '✗');
// tlač
await p.goto(`${tripUrl}/tlac`);
await p.waitForSelector('text=Checklist pred cestou');
await p.screenshot({ path: `${SHOTS}/08b-tlac.png`, fullPage: true });
log('08b-tlac');
await p.emulateMedia({ media: 'print' });
await p.pdf({ path: `${SHOTS}/cesta.pdf`, format: 'A4', printBackground: true });
await p.emulateMedia({ media: 'screen' });
log('PDF uložené');
// mapa
await p.goto(`${tripUrl}/mapa?den=2`, { timeout: 90000 });
await p.waitForFunction(() => window.__ipMap?.loaded(), null, { timeout: 90000 });
await p.waitForTimeout(2500);
await p.screenshot({ path: `${SHOTS}/09-mapa.png` });
log('09-mapa');
const [db] = await sql`select (select count(*)::int from travelers where trip_id=t.id) trav, (select count(*)::int from itinerary_stops s join itinerary_days d on d.id=s.day_id where d.trip_id=t.id) stops, (select count(*)::int from lodging_stays where trip_id=t.id and scenario_key='car') nights from trips t where owner_id=(${owner()})`;
log('DB:', JSON.stringify(db));
await b.close();
await cleanup();
await sql.end();
if (errors.length) log('PAGEERRORS:', errors);
log(errors.length ? 'DONE with page errors' : 'DONE ✓');
