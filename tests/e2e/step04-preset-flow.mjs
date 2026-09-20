// Výber okruhu v kroku 04 (5-dňová cesta): hodnotenie okruhov, ručná voľba „Juh po Jökulsárlón“ → noci sa prerozdelia,
// zastávky pregenerujú; späť na Auto. Spustenie: pnpm dev -p 3111 && node tests/e2e/step04-preset-flow.mjs <adresár na PNG>
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
    values (${data.user.id}, ${EMAIL}, 'Lukáš Test', false, now(), '1993-03-12', ${sql.json({ has: true, sinceYear: 2012, willingToDrive: 'yes' })}, true, '{KTW,BUD}'::text[], ${sql.json({ thermal: 3, glacier: 2, whale: 2 })})`;
}
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 820, height: 1180 } });
const p = await ctx.newPage();
p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
p.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 240)); });
const shot = async (name) => {
  await p.waitForLoadState('networkidle').catch(() => {});
  await p.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
  console.log(name);
};
const owner = () => sql`select id from auth.users where email=${EMAIL}`;
const nights = async () =>
  (await sql`select d.day_index, d.overnight_region_id r from itinerary_days d join trips t on t.id=d.trip_id where t.owner_id=(${owner()}) and d.scenario_key='drive' order by d.day_index`)
    .map((x) => x.r ?? '–').join(' → ');
const preset = async () => (await sql`select route_preset from trips where owner_id=(${owner()})`)[0].route_preset;

await p.goto(`${BASE}/sk/prihlasenie`);
await p.fill('input[name=email]', EMAIL);
await p.fill('input[name=password]', PW);
await p.click('button[type=submit]');
await p.waitForURL(`${BASE}/sk`);
await p.click('button:has-text("Nová cesta")');
await p.waitForURL('**/cesta/*');
const tripUrl = p.url().split('?')[0];
// ručný let 12.–16. 9. = 5 dní
await p.goto(`${tripUrl}?krok=2`);
await p.click('button:has-text("Zadať let ručne")');
await p.waitForSelector('[role=dialog]');
const month = (await p.inputValue('[role=dialog] input[name=outDepAt]')).slice(0, 7);
await p.fill('[role=dialog] input[name=retDepAt]', `${month}-16T12:00`);
await p.fill('[role=dialog] input[name=retArrAt]', `${month}-16T18:30`);
await p.fill('[role=dialog] input[name=priceGroup]', '640');
await p.click('[role=dialog] button:has-text("Uložiť a prepočítať")');
await p.waitForSelector('text=Ručný let uložený', { timeout: 60000 });
await p.goto(`${tripUrl}?krok=3`);
await p.click('[role=radio]:has-text("Auto")');
await p.waitForSelector('button:has-text("Zvoliť")', { timeout: 20000 });
await p.locator('button:has-text("Zvoliť")').nth(1).click();
await p.waitForSelector('button:has-text("Zvolené")', { timeout: 20000 });
// krok 04: auto = golden_south
await p.goto(`${tripUrl}?krok=4`, { timeout: 90000 });
console.log('preset:', await preset(), '| noci:', await nights());
await p.click('button:has-text("Generovať")');
await p.waitForSelector('button:has-text("Pregenerovať")', { timeout: 60000 });
await shot('01-okruhy-auto');
// všetky okruhy
await p.click('button:has-text("všetky okruhy")');
await p.waitForTimeout(300);
await shot('02-okruhy-vsetky');
// zvoliť Juh po Jökulsárlón
await p.locator('[data-preset=south_only] button:has-text("Vybrať")').click();
await p.waitForSelector('text=okruh Juh po Jökulsárlón', { timeout: 90000 });
await p.waitForSelector('button:has-text("Pregenerovať nezamknuté"):not([disabled])', { timeout: 60000 });
await p.waitForTimeout(1000);
console.log('preset:', await preset(), '| noci:', await nights());
await shot('03-okruh-juh');
const stats = await sql`select d.day_index, count(s.id)::int stops, round(d.drive_km) km from itinerary_days d left join itinerary_stops s on s.day_id=d.id join trips t on t.id=d.trip_id where t.owner_id=(${owner()}) group by d.id order by d.day_index`;
console.log('dni:', stats.map((r) => `${r.day_index}:${r.stops}z/${r.km}km`).join(' '));
// krok 05 – noci podľa nového okruhu
await p.goto(`${tripUrl}?krok=5`);
await shot('04-kde-spat-po-zmene');
// detail atrakcie: fotka + odkazy (krok 06 ukazuje len platené miesta – Detail prvého)
await p.goto(`${tripUrl}?krok=6`);
await p.locator('main button:has-text("Detail")').first().click();
await p.waitForSelector('[role=dialog] img', { timeout: 20000 });
await p.waitForTimeout(1500);
await shot('04b-atrakcia-foto');
console.log('odkazy v sheete:', await p.locator('[role=dialog] a[target=_blank]').allTextContents());
await p.keyboard.press('Escape');
// späť na Auto
await p.goto(`${tripUrl}?krok=4`);
await p.click('button:has-text("Auto ·")');
await p.waitForSelector('text=(auto)', { timeout: 90000 });
await p.waitForTimeout(1000);
console.log('preset:', await preset(), '| noci:', await nights());
await shot('05-okruh-auto-spat');
await b.close();
await cleanup();
await sql.end();
