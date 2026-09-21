// Blok 1.4 dokončenie – „Kedy môžem“: profil (mesiace, blokované termíny, dĺžka) → krok 01 varovania → krok 02 kalendár + kombinácie.
// Spustenie: pnpm dev -p 3111 && node tests/e2e/profile-availability.mjs <adresár na PNG>
import { chromium } from '@playwright/test';
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

const SHOTS = process.argv[2] ?? '/tmp';
const BASE = process.env.E2E_BASE ?? 'http://localhost:3111';
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY.trim(), { auth: { persistSession: false } });
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', prepare: false, max: 1 });
const USERS = [
  ['owner.avail@example.com', 'Lukáš Avail'],
  ['peter.avail@example.com', 'Peter Avail'],
];
const PW = 'TestHeslo2027xyz';
const log = (...a) => console.log(...a);
const cleanup = async () => {
  const emails = USERS.map(([e]) => e);
  await sql`delete from trips where owner_id in (select id from auth.users where email = any(${emails}))`;
  for (const u of (await admin.auth.admin.listUsers({ perPage: 200 })).data.users)
    if (emails.includes(u.email)) await admin.auth.admin.deleteUser(u.id);
};
await cleanup();
const ids = {};
for (const [email, name] of USERS) {
  const { data, error } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true, app_metadata: { must_change_password: false, profile_completed: true } });
  if (error) throw new Error(error.message);
  ids[email] = data.user.id;
  await sql`insert into profiles (user_id, email, display_name, must_change_password, completed_at, birth_date, driver_licence, has_credit_card, airports, interests)
    values (${data.user.id}, ${email}, ${name}, false, now(), '1993-03-12', ${sql.json({ has: true })}, true, '{KTW,BUD}'::text[], ${sql.json({})})`;
}
// Peter: môže jún, júl (nie september) + blokovaný 12.–15. 9. 2027, max 8 dní – priamo v DB
await sql`update profiles set availability=${sql.json({ months: [6, 7], blocked: ['2027-09-12/2027-09-15'], maxDays: 8 })} where user_id=${ids[USERS[1][0]]}`;

const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
const shot = async (n) => { await p.waitForLoadState('networkidle').catch(() => {}); await p.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: true }); log(n); };
await p.goto(`${BASE}/sk/prihlasenie`);
await p.fill('input[name=email]', USERS[0][0]); await p.fill('input[name=password]', PW); await p.click('button[type=submit]');
await p.waitForURL(`${BASE}/sk`);
// vlastník: profil cez UI – september + október, blokované 20.–22. 9. 2027, 7–12 dní
await p.goto(`${BASE}/sk/profil`);
await p.locator('label:has(input[name="availMonths[]"][value="9"])').click();
await p.locator('label:has(input[name="availMonths[]"][value="10"])').click();
await p.click('button:has-text("+ Termín")');
await p.fill('input[name="blockedFrom[]"]', '2027-09-20');
await p.fill('input[name="blockedTo[]"]', '2027-09-22');
await p.fill('input[name=availMinDays]', '7');
await p.fill('input[name=availMaxDays]', '12');
await p.click('button[name=intent][value=save]');
await p.waitForSelector('text=Uložené', { timeout: 20000 }).catch(() => {});
await shot('01-profil-kedy-mozem');
const [row] = await sql`select availability from profiles where user_id=${ids[USERS[0][0]]}`;
log('DB availability:', JSON.stringify(row.availability));
if (!row.availability?.months?.includes(9) || row.availability.blocked?.[0] !== '2027-09-20/2027-09-22' || row.availability.minDays !== 7) throw new Error('availability sa neuložila správne');
// cesta + člen Peter
await p.goto(`${BASE}/sk`);
await p.click('button:has-text("Nová cesta")'); await p.waitForURL('**/cesta/*');
const tripUrl = p.url().split('?')[0];
await p.goto(`${tripUrl}/clenovia`);
const opt = (await p.locator('select[name=userId] option', { hasText: USERS[1][0] }).textContent()).trim();
await p.selectOption('select[name=userId]', { label: opt }); await p.click('button:has-text("Pridať")');
await p.waitForSelector(`main .rounded-card >> text=${USERS[1][0]}`);
await p.goto(`${tripUrl}?krok=1`);
await p.waitForSelector('text=Kedy a ako');
const warn = await p.locator('main').innerText();
log('krok 01 obsahuje:', /Peter nemôže v septembri/.test(warn) ? '✓ mesiac' : '✗ mesiac', /Blokované termíny/.test(warn) ? '✓ termíny' : '✗', /vyhovuje 7–8 dní/.test(warn) ? '✓ dĺžka' : '✗ dĺžka');
await shot('02-krok01-varovania');
// krok 02: kalendár označí 12.–15. a 20.–22. 9.
await p.goto(`${tripUrl}?krok=2`);
await p.waitForSelector('text=Kalendár', { timeout: 60000 });
await p.waitForTimeout(8000);
const marked = await p.locator('button[title^="Nemôže"]').count();
log('kalendár – označené dni:', marked, marked === 7 ? '✓' : '✗ (čakám 7)');
await shot('03-krok02-kalendar');
await b.close(); await cleanup(); await sql.end();
if (errors.length) log('PAGEERRORS:', errors);
log(marked === 7 && !errors.length ? 'DONE ✓' : 'DONE s problémami');
