// Manuálny e2e test POST /api/flights/search (blok 1.9). Spustenie: pnpm dev -p 3111 && node tests/e2e/flights-search.mjs
import 'dotenv/config';
import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';
const BASE = 'http://localhost:3111';
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY.trim(),
  { auth: { persistSession: false } },
);
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', prepare: false, max: 1 });
const email = 'flights.test@example.com',
  pw = 'FlightsTest2027xyz';
const { data } = await admin.auth.admin.createUser({
  email,
  password: pw,
  email_confirm: true,
  app_metadata: { must_change_password: false, profile_completed: true },
});
await sql`insert into profiles (user_id, email, display_name, must_change_password, completed_at) values (${data.user.id}, ${email}, 'Lety Test', false, now())`;
try {
  const unauth = await fetch(`${BASE}/api/flights/search`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
  console.log('bez prihlásenia:', unauth.status);
  const b = await chromium.launch();
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  await p.goto(`${BASE}/sk/prihlasenie`);
  await p.fill('input[name=email]', email);
  await p.fill('input[name=password]', pw);
  await p.click('button[type=submit]');
  await p.waitForURL(`${BASE}/sk`);
  const t0 = Date.now();
  const res = await p.request.post(`${BASE}/api/flights/search`, {
    data: {
      origins: ['KTW', 'BUD', 'VIE'],
      month: '2027-09',
      minDays: 8,
      maxDays: 12,
      pax: 4,
      parking: true,
      allowSelfTransfer: true,
      stream: false,
      travelersBags: [
        { cabinSmall: 1, cabin10: 0, checked20: 1, checked32: 0 },
        { cabinSmall: 1, cabin10: 1, checked20: 0, checked32: 0 },
        { cabinSmall: 1, cabin10: 0, checked20: 1, checked32: 0 },
        { cabinSmall: 1, cabin10: 0, checked20: 0, checked32: 0 },
      ],
    },
  });
  console.log('JSON status', res.status(), 'za', Date.now() - t0, 'ms');
  const r = await res.json();
  console.log(
    'kandidáti',
    r.stats.candidates,
    '| per origin',
    JSON.stringify(r.stats.perOrigin),
    '| heatmap dní',
    Object.keys(r.heatmap).length,
    '| fx',
    JSON.stringify(r.fx),
  );
  console.log('warnings:', r.warnings.join(' | '));
  console.log(
    'stats:',
    Object.entries(r.connectorStats)
      .map(([k, v]) => `${k}=${v.ok ? v.count : 'X:' + v.reason}`)
      .join(', '),
  );
  for (const c of r.combos.slice(0, 6))
    console.log(
      ` ${c.origin} ${c.outDate}→${c.retDate} ${c.days}d | let ${c.farePp}€/os ${c.out.airlines.join('+')}${c.out.hub ? ' via ' + c.out.hub : ''}${c.out.hubNight ? '(noc)' : ''} / ${c.ret.airlines.join('+')} | batožina ${c.bags} park ${c.parking} cesta ${c.access} hub ${c.hubNights} | SPOLU ${c.totalGroup} € = ${c.totalPp}/os [${c.source}]`,
    );
  const cheapestDirect = r.combos.find((c) => c.transfers === 0);
  console.log(
    'najlacnejší priamy:',
    cheapestDirect
      ? `${cheapestDirect.origin} ${cheapestDirect.outDate} ${cheapestDirect.totalGroup} €`
      : 'žiadny v top 50',
  );
  // SSE
  const t1 = Date.now();
  const sse = await p.request.post(`${BASE}/api/flights/search`, {
    data: { origins: ['KTW'], month: '2027-09', minDays: 8, maxDays: 12, pax: 4, stream: true },
  });
  const text = await sse.text();
  const events = text
    .split('\n\n')
    .filter(Boolean)
    .map((chunk) => chunk.match(/^event: (\w+)/)?.[1]);
  console.log(
    'SSE status',
    sse.status(),
    sse.headers()['content-type'],
    '| udalosti:',
    events.filter((e) => e === 'progress').length,
    'progress +',
    events.filter((e) => e === 'result').length,
    'result za',
    Date.now() - t1,
    'ms (cache)',
  );
  const resultChunk = text.split('\n\n').find((c) => c.startsWith('event: result'));
  const rr = JSON.parse(resultChunk.replace(/^event: result\ndata: /, ''));
  console.log('SSE KTW combos:', rr.combos.length, 'najlacnejšie', rr.combos[0]?.totalGroup, '€');
  await b.close();
} finally {
  await admin.auth.admin.deleteUser(data.user.id);
  await sql.end();
}
