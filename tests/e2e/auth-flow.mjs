// Manuálny e2e tok auth (blok 1.3). POZOR: resetuje heslo správcu a zakladá peter.test@example.com.
// Spustenie: pnpm dev -p 3111 && node tests/e2e/auth-flow.mjs <adresár na PNG>. Blok 2.9 prerobí na Playwright test.
import { chromium } from '@playwright/test';
import { execSync } from 'node:child_process';
const SHOTS = process.argv[2];
const BASE = 'http://localhost:3111';
const out = execSync('pnpm exec tsx -r ./scripts/server-only-shim.cjs scripts/bootstrap-admin.ts "Lukáš"', {
  encoding: 'utf8',
});
const adminPw = out.match(/Dočasné heslo: (\S+)/)[1];
const adminEmail = 'l.pjecha@gmail.com';
const NEW_PW = 'test-heslo-lukas-2027';

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 820, height: 1180 } });
const p = await ctx.newPage();
const step = async (name) => {
  await p.waitForLoadState('networkidle');
  console.log(name, '→', p.url());
  await p.screenshot({ path: `${SHOTS}/${name}.png` });
};

await p.goto(`${BASE}/sk/profil`);
await step('01-redirect-to-login');
await p.fill('input[name=email]', adminEmail);
await p.fill('input[name=password]', 'zle-heslo');
await p.click('button[type=submit]');
await p.waitForSelector('text=Nesprávny');
await step('02-bad-login');
await p.fill('input[name=password]', adminPw);
await p.click('button[type=submit]');
await p.waitForURL('**/zmena-hesla');
await step('03-forced-change');
await p.goto(`${BASE}/sk/`);
await p.waitForURL('**/zmena-hesla');
console.log('home while must_change → stays on zmena-hesla ✓');
await p.fill('input[name=password]', 'kratke');
await p.fill('input[name=confirm]', 'kratke');
await p.click('button[type=submit]');
await p.waitForSelector('text=aspoň');
await step('04-too-short');
await p.fill('input[name=password]', NEW_PW);
await p.fill('input[name=confirm]', NEW_PW);
await p.click('button[type=submit]');
await p.waitForURL('**/profil');
await step('05-profil');
await p.goto(`${BASE}/sk/sprava/pouzivatelia`);
await step('06-admin-users');
await p.fill('input[name=displayName]', 'Peter Testovací');
await p.fill('input[name=email]', 'peter.test@example.com');
await p.click('button[type=submit]');
await p.waitForSelector('code');
await p.waitForSelector('text=Peter Testovací');
await step('07-user-created');
const peterPw = (await p.textContent('code')).trim();
await p.goto(`${BASE}/sk/`);
await step('08-home-signed-in');
await p.click('text=Odhlásiť sa');
await p.waitForURL('**/prihlasenie');
await step('09-signed-out');

// Peter
const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const q = await ctx2.newPage();
await q.goto(`${BASE}/sk/prihlasenie`);
await q.fill('input[name=email]', 'peter.test@example.com');
await q.fill('input[name=password]', peterPw);
await q.click('button[type=submit]');
await q.waitForURL('**/zmena-hesla');
await q.screenshot({ path: `${SHOTS}/10-peter-change-iphone.png` });
console.log('peter forced change →', q.url());
await q.fill('input[name=password]', 'peter-nove-heslo-2027');
await q.fill('input[name=confirm]', 'peter-nove-heslo-2027');
await q.click('button[type=submit]');
await q.waitForURL('**/profil');
console.log('peter →', q.url());
const r = await q.goto(`${BASE}/sk/sprava/pouzivatelia`);
console.log('peter admin page status:', r.status());
const api = await q.request.post(`${BASE}/api/admin/users`, {
  data: { email: 'x@example.com', displayName: 'X' },
});
console.log('peter POST /api/admin/users:', api.status());
// re-login peter with new pw
await q.goto(`${BASE}/sk/`);
await q.click('text=Odhlásiť sa');
await q.waitForURL('**/prihlasenie');
await q.goto(`${BASE}/sk/prihlasenie`);
await q.fill('input[name=email]', 'peter.test@example.com');
await q.fill('input[name=password]', 'peter-nove-heslo-2027');
await q.click('button[type=submit]');
await q.waitForURL(`${BASE}/sk`);
console.log('peter re-login with new pw → ', q.url());
await b.close();
console.log('DONE');
