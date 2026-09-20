// e2e blok 2.7: krok 05 – generátor (matica OSRM), zastávky, detail, pridať/odstrániť; mapa (MapLibre) s trasou a bodmi.
// Spustenie: pnpm dev -p 3111 && node tests/e2e/step05-flow.mjs <adresár na PNG>
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
  await sql`insert into profiles (user_id, email, display_name, must_change_password, completed_at, birth_date, driver_licence, has_credit_card, airports, interests)
    values (${data.user.id}, ${EMAIL}, 'Lukáš Test', false, now(), '1993-03-12', ${sql.json({ has: true, sinceYear: 2012, willingToDrive: 'yes' })}, true, '{KTW,BUD}'::text[], ${sql.json({ thermal: 3, glacier: 2, hike: 2 })})`;
}
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 820, height: 1180 } });
const p = await ctx.newPage();
p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('CONSOLE', m.type(), m.text().slice(0, 240)); });
const shot = async (name, full = true) => {
  if (full) await p.waitForLoadState('networkidle'); // mapa: dlaždice sa načítavajú priebežne
  await p.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: full });
  console.log(name);
};
const owner = () => sql`select id from auth.users where email=${EMAIL}`;
await p.goto(`${BASE}/sk/prihlasenie`);
await p.fill('input[name=email]', EMAIL);
await p.fill('input[name=password]', PW);
await p.click('button[type=submit]');
await p.waitForURL(`${BASE}/sk`);
await p.click('button:has-text("Nová cesta")');
await p.waitForURL('**/cesta/*');
const tripUrl = p.url().split('?')[0];
// let ručne (12.–21. 9. = 10 dní) → Auto → vozidlo
await p.goto(`${tripUrl}?krok=2`);
await p.click('button:has-text("Zadať let ručne")');
await p.waitForSelector('[role=dialog]');
await p.fill('[role=dialog] input[name=priceGroup]', '640');
await p.click('[role=dialog] button:has-text("Uložiť a prepočítať")');
await p.waitForSelector('text=Ručný let uložený', { timeout: 60000 });
await p.goto(`${tripUrl}?krok=3`);
await p.click('[role=radio]:has-text("Auto")');
await p.waitForSelector('button:has-text("Zvoliť")', { timeout: 20000 });
await p.locator('button:has-text("Zvoliť")').nth(1).click();
await p.waitForSelector('button:has-text("Zvolené")', { timeout: 20000 });
// krok 05
await p.goto(`${tripUrl}?krok=5`, { timeout: 90000 });
await shot('01-step05-empty');
await p.click('button:has-text("Generovať")');
await p.waitForSelector('text=/[1-9]\\d* zastávok/', { timeout: 60000 });
await p.waitForSelector('button:has-text("Pregenerovať")', { timeout: 20000 });
await shot('02-step05-generated');
const stats = await sql`select d.day_index, d.drive_km, d.drive_min_real, count(s.id)::int stops from itinerary_days d left join itinerary_stops s on s.day_id=d.id join trips t on t.id=d.trip_id where t.owner_id=(${owner()}) group by d.id order by d.day_index`;
console.log('dni:', stats.map((r) => `${r.day_index}:${r.stops}z/${Math.round(r.drive_km)}km/${r.drive_min_real}min`).join(' '));
// detail zastávky
const firstStop = p.locator('button:has-text("💎"), [class*="pl-"] button').first();
await p.locator('button[aria-label="Rozbaliť"]').nth(1).click();
await p.waitForTimeout(300);
const stopTitle = p.locator('.bg-\\[\\#FAFBFC\\] button').first();
if (await stopTitle.count()) {
  await stopTitle.click();
  await p.waitForSelector('[role=dialog]');
  await shot('03-stop-sheet');
  await p.keyboard.press('Escape');
}
void firstStop;
// pridať zastávku do dňa 1
await p.locator('button:has-text("Zastávka")').first().click();
await p.waitForSelector('[role=dialog]');
await shot('04-add-sheet');
const addBtn = p.locator('[role=dialog] button:has-text("+ Pridať")').first();
const hadCatalog = await addBtn.count();
if (hadCatalog) {
  await addBtn.click();
  await p.waitForSelector('text=ručne', { timeout: 20000 });
}
console.log('katalóg na pridanie:', hadCatalog ? 'áno' : 'prázdny');
// odstrániť prvú ručnú/generovanú zastávku dňa 1
const removeBtn = p.locator('button[aria-label="Odstrániť zastávku"]').first();
if (await removeBtn.count()) {
  await removeBtn.click();
  await p.waitForTimeout(1500);
}
await shot('05-step05-edited');
// krok 06
await p.goto(`${tripUrl}?krok=6`);
await shot('05b-step06');
const add6 = p.locator('button:has-text("+ Pridať")').first();
if (await add6.count()) { await add6.click(); await p.waitForTimeout(2000); }
const [c6] = await sql`select count(*)::int n from itinerary_stops s join itinerary_days d on d.id=s.day_id join trips t on t.id=d.trip_id where t.owner_id=(${owner()})`;
console.log('zastávok po kroku 06:', c6.n);
// mapa
await p.goto(`${tripUrl}/mapa?den=2`, { timeout: 90000 });
await p.waitForFunction(() => window.__ipMap?.loaded(), null, { timeout: 90000 });
await p.waitForTimeout(2500);
console.log('map dbg:', JSON.stringify(await p.evaluate(() => { const m = window.__ipMap; const c = document.querySelector('canvas'); return { loaded: m?.loaded(), styleLoaded: m?.isStyleLoaded(), canvas: c ? [c.width, c.height, c.clientWidth, c.clientHeight] : null, container: (() => { const el = c?.parentElement?.parentElement; return el ? [el.clientWidth, el.clientHeight] : null; })(), zoom: m?.getZoom(), center: m?.getCenter(), sources: m ? Object.keys(m.getStyle()?.sources ?? {}) : null }; })));
await shot('06-map-day2', false);
const firstSlug = (await sql`select po.slug from itinerary_stops s join pois po on po.id=s.poi_id join itinerary_days d on d.id=s.day_id join trips t on t.id=d.trip_id where t.owner_id=(${owner()}) order by d.day_index, s."order" limit 1`)[0]?.slug;
if (firstSlug) {
  await p.goto(`${tripUrl}/mapa?poi=${firstSlug}`, { timeout: 90000 });
  await p.waitForFunction(() => window.__ipMap?.loaded(), null, { timeout: 90000 });
  await p.waitForTimeout(2500);
  await shot('07-map-selected', false);
  await p.click('button:has-text("Detail")');
  await p.waitForSelector('[role=dialog]');
  await shot('08-map-detail', false);
}
const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 } });
const q = await ctx2.newPage();
await q.goto(`${BASE}/sk/prihlasenie`);
await q.fill('input[name=email]', EMAIL);
await q.fill('input[name=password]', PW);
await q.click('button[type=submit]');
await q.waitForURL(`${BASE}/sk`);
await q.goto(`${tripUrl}?krok=5`);
await q.waitForLoadState('networkidle');
await q.screenshot({ path: `${SHOTS}/09-iphone-step05.png`, fullPage: true });
await q.goto(`${tripUrl}/mapa?den=1`);
await q.waitForFunction(() => window.__ipMap?.loaded(), null, { timeout: 90000 });
await q.waitForTimeout(2500);
await q.screenshot({ path: `${SHOTS}/10-iphone-map.png` });
await b.close();
await cleanup();
await sql.end();
console.log('DONE');
