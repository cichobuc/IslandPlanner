// e2e blok 2.6: krok 04 – Auto: noci s rozpätím, vložiť ponuku, noc bez ubytovania; Karavan: kempy (tjalda/seed), priradiť, Camping Card.
// Spustenie: pnpm dev -p 3111 && node tests/e2e/step04-flow.mjs <adresár na PNG>
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
const NAV = { timeout: 90000 };
const ctx = await b.newContext({ viewport: { width: 820, height: 1180 } });
const p = await ctx.newPage();
p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
const shot = async (name) => {
  await p.waitForLoadState('networkidle');
  await p.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
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
await p.goto(`${tripUrl}?krok=2`);
await p.click('button:has-text("Zadať let ručne")');
await p.waitForSelector('[role=dialog]');
await p.fill('[role=dialog] input[name=priceGroup]', '640');
await p.click('[role=dialog] button:has-text("Uložiť a prepočítať")');
await p.waitForSelector('text=Ručný let uložený', { timeout: 60000 });
await p.goto(`${tripUrl}?krok=3`);
await p.click('[role=radio]:has-text("Auto")');
await p.waitForSelector('button:has-text("Zvoliť")', { timeout: 20000 });
await p.locator('button:has-text("Zvoliť")').first().click();
await p.waitForSelector('button:has-text("Zvolené")', { timeout: 20000 });
// krok 04 – Auto
await p.goto(`${tripUrl}?krok=4`, NAV);
await shot('01-step04-car');
await p.locator('button:has-text("Spresniť")').nth(2).click();
await p.waitForSelector('[role=dialog]');
await shot('02-night-sheet-car');
await p.fill('[role=dialog] input[name=name]', 'Vík Cottages');
await p.fill('[role=dialog] input[name=url]', 'https://www.booking.com/hotel/is/vik-cottages.html');
await p.fill('[role=dialog] input[name=pricePerNight]', '236');
await p.click('[role=dialog] button:has-text("Vložiť ponuku")');
await p.waitForSelector('text=Vík Cottages', { timeout: 20000 });
// noc bez ubytovania (posledná)
await p.locator('button:has-text("Spresniť")').last().click();
await p.waitForSelector('[role=dialog]');
await p.click('[role=dialog] button:has-text("Noc bez ubytovania")');
await p.waitForSelector('text=bez ubytovania (nočný let', { timeout: 20000 });
await shot('03-step04-car-filled');
const stays = await sql`select night_index, is_manual, lodging_option_id is not null as assigned, has_kitchen, price_override from lodging_stays s join trips t on t.id=s.trip_id where t.owner_id=(${owner()}) and s.scenario_key='car' order by night_index`;
console.log('car noci:', stays.map((s) => `${s.night_index}:${s.assigned ? 'ponuka' : s.price_override ? '0€' : 'odhad'}`).join(' '));
// prepnúť na Karavan
await p.goto(`${tripUrl}?krok=3`);
await p.click('[role=radio]:has-text("Karavan")');
await p.waitForSelector('text=/spí \\d/', { timeout: 20000 });
await p.locator('button:has-text("Zvoliť")').first().click();
await p.waitForSelector('button:has-text("Zvolené")', { timeout: 20000 });
await p.goto(`${tripUrl}?krok=4`);
await shot('04-step04-camper');
await p.locator('button:has-text("Spresniť")').first().click();
await p.waitForSelector('[role=dialog]');
await shot('05-night-sheet-camper');
const assign = p.locator('[role=dialog] button:has-text("Priradiť")').first();
if (await assign.count()) {
  await assign.click();
  await p.waitForSelector('text=tjalda, text=seed', { timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(1500);
}
const cardBtn = p.locator('button:has-text("Vypnutá")');
if (await cardBtn.count()) {
  await cardBtn.click();
  await p.waitForSelector('button:has-text("Zapnutá")', { timeout: 20000 });
}
await shot('06-step04-camper-filled');
const camp = await sql`select s.night_index, o.name, o.connector_id, o.price_per_person from lodging_stays s join lodging_options o on o.id=s.lodging_option_id join trips t on t.id=s.trip_id where t.owner_id=(${owner()}) and s.scenario_key='camper'`;
console.log('camper priradené:', JSON.stringify(camp));
const [vs] = await sql`select camping_card from vehicle_selection v join trips t on t.id=v.trip_id where t.owner_id=(${owner()}) and v.scenario_key='camper'`;
console.log('camping_card:', vs?.camping_card);
const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 } });
const q = await ctx2.newPage();
await q.goto(`${BASE}/sk/prihlasenie`);
await q.fill('input[name=email]', EMAIL);
await q.fill('input[name=password]', PW);
await q.click('button[type=submit]');
await q.waitForURL(`${BASE}/sk`);
await q.goto(`${tripUrl}?krok=4`);
await q.waitForLoadState('networkidle');
await q.screenshot({ path: `${SHOTS}/07-iphone-step04.png`, fullPage: true });
await b.close();
await cleanup();
await sql.end();
console.log('DONE');
