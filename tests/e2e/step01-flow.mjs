// e2e blok 2.3: krok 01 – cestujúci (sheet, ručný cestujúci, batožina/dvojica), letiská (prepínač), nastavenia (mesiac, dni, tempo).
// Spustenie: pnpm dev -p 3111 && node tests/e2e/step01-flow.mjs <adresár na PNG>
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
      if (error) throw new Error(`deleteUser ${u.email}: ${error.message}`);
    }
};
await cleanup();
for (const [email, name, birth] of USERS) {
  const { data, error } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true, app_metadata: { must_change_password: false, profile_completed: true } });
  if (error) throw new Error(error.message);
  await sql`insert into profiles (user_id, email, display_name, must_change_password, completed_at, birth_date, driver_licence, has_credit_card, airports)
    values (${data.user.id}, ${email}, ${name}, false, now(), ${birth}, ${sql.json({ has: true, sinceYear: 2012, willingToDrive: 'yes' })}, true, '{KTW,BUD}'::text[])`;
}

const b = await chromium.launch();
const run = async (vp, tag) => {
  const ctx = await b.newContext({ viewport: vp });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  const shot = async (name) => {
    await p.waitForLoadState('networkidle');
    await p.screenshot({ path: `${SHOTS}/${tag}-${name}.png`, fullPage: true });
  };
  await p.goto(`${BASE}/sk/prihlasenie`);
  await p.fill('input[name=email]', USERS[0][0]);
  await p.fill('input[name=password]', PW);
  await p.click('button[type=submit]');
  await p.waitForURL(`${BASE}/sk`);
  return { p, shot, ctx };
};

const { p, shot, ctx } = await run({ width: 820, height: 1180 }, 'ipad');
await p.click('button:has-text("Nová cesta")');
await p.waitForURL('**/cesta/*');
const tripUrl = p.url().split('?')[0];
console.log('po založení →', p.url());
await shot('01-step01');
// pridať člena Petra cez Členovia
await p.goto(`${tripUrl}/clenovia`);
const peterOpt = (await p.locator('select[name=userId] option', { hasText: 'peter.test' }).textContent()).trim();
await p.selectOption('select[name=userId]', { label: peterOpt });
await p.click('button:has-text("Pridať")');
await p.waitForSelector('main .rounded-card >> text=peter.test@example.com');
await p.goto(`${tripUrl}?krok=1`);
// ručný cestujúci
await p.click('button:has-text("Cestujúci")');
await p.waitForSelector('[role=dialog]');
await p.fill('[role=dialog] input[name=name]', 'Jana Ručná');
await p.fill('[role=dialog] input[name=ageFallback]', '29');
await p.click('[role=dialog] [aria-label="Podaná 20 kg +"]');
await shot('02-traveler-sheet');
await p.click('[role=dialog] button:has-text("Uložiť")');
await p.waitForSelector('text=Jana Ručná');
// upraviť Lukáša: kufor s Janou
await p.click('button:has-text("Lukáš Test")');
await p.waitForSelector('[role=dialog]');
await p.selectOption('[role=dialog] select[name=sharesBagsWith]', { label: 'Jana Ručná' });
await p.click('[role=dialog] button:has-text("Uložiť")');
await p.waitForSelector('text=kufor s Jana');
// letiská: vypnúť BUD, zapnúť VIE
await p.locator('form:has(input[name=iata][value=BUD]) button').click();
await p.waitForSelector('text=Vypnuté');
await p.locator('form:has(input[name=iata][value=VIE]) button').click();
await p.waitForTimeout(1200);
// nastavenia: mesiac +1, dni 9–11, tempo pokojné
await p.click('button[aria-label="Ďalší mesiac"]');
await p.fill('input[name=minDays]', '9');
await p.fill('input[name=maxDays]', '11');
await p.click('label:has(input[name=pace][value=relaxed])');
await p.click('button:has-text("Uložiť nastavenia")');
await p.waitForSelector('text=Uložené.');
await shot('03-step01-filled');
const [trip] = await sql`select name, origin_airports, target_month::text, min_days, max_days, pace, budget_target_pp from trips order by created_at desc limit 1`;
console.log('trip:', JSON.stringify(trip));
const travelers = await sql`select t.name, t.age_fallback, t.bags, t.shares_bags_with is not null as paired from travelers t join trips tr on tr.id=t.trip_id where tr.owner_id=(select id from auth.users where email=${USERS[0][0]}) order by sort_order`;
console.log('travelers:', travelers.map((t) => `${t.name}(${t.age_fallback ?? 'dob'},20kg=${t.bags.checked20},pár=${t.paired})`).join(' | '));
// pokračovať → krok 2
await p.click('a:has-text("Pokračovať na 02")');
await p.waitForURL('**krok=2');
await shot('04-step02-stub');
await ctx.close();

const m = await run({ width: 390, height: 844 }, 'iphone');
await m.p.goto(`${tripUrl}?krok=1`);
await m.shot('01-step01');
await m.p.click('button:has-text("Lukáš Test")');
await m.p.waitForSelector('[role=dialog]');
await m.shot('02-traveler-sheet');
await m.ctx.close();

await b.close();
await cleanup();
await sql.end();
console.log('DONE');
