import 'dotenv/config';
import { MemoryCache } from '../src/connectors/base';
import { frankfurter } from '../src/connectors/frankfurter';
import { ryanair } from '../src/connectors/ryanair';
import { tpFlights } from '../src/connectors/tp-flights';
import { wizz } from '../src/connectors/wizz';

// Spike K2 (docs/09): pokrytie cien za dni v mesiaci pre 5 letísk → KEF.
// Spustenie: pnpm spike:coverage [2027-09]
const month = process.argv[2] ?? '2027-09';
const [y, m] = month.split('-').map(Number);
const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
const ORIGINS = ['BTS', 'VIE', 'BUD', 'PRG', 'KTW'];
const HUBS = ['STN', 'LTN', 'BER', 'DUB'];
const WIZZ_DIRECT = ['KTW', 'BUD'];

const ctx = {
  mode: 'live' as const,
  cache: new MemoryCache(),
  env: { ...process.env, FLAG_WIZZ: 'true', FLAG_RYANAIR: 'true' },
};
const pct = (n: number) => `${Math.round((n / daysInMonth) * 100)} %`.padStart(6);

async function main() {
  const fx = await frankfurter.fetch({ base: 'EUR', quote: 'PLN' }, ctx);
  const fxHuf = await frankfurter.fetch({ base: 'EUR', quote: 'HUF' }, ctx);
  const toEur = (price: number, cur: string) =>
    cur === 'EUR'
      ? price
      : cur === 'PLN' && fx.ok
        ? price / fx.data.rate
        : cur === 'HUF' && fxHuf.ok
          ? price / fxHuf.data.rate
          : NaN;

  console.log(`Pokrytie ${month} (${daysInMonth} dní) → KEF\n`);
  console.log('letisko  zdroj                      dni s cenou  min €   medián €');
  const summary: Record<string, { direct: number; segment: number }> = {};

  for (const origin of ORIGINS) {
    summary[origin] = { direct: 0, segment: 0 };
    const directDays = new Set<string>();
    // Wizz priame
    if (WIZZ_DIRECT.includes(origin)) {
      const r = await wizz.fetch(
        { origin, destination: 'KEF', from: `${month}-01`, to: `${month}-${daysInMonth}` },
        ctx,
      );
      if (r.ok) {
        const prices = r.data.outbound
          .map((f) => toEur(f.price, f.currency))
          .filter((x) => !Number.isNaN(x))
          .sort((a, b) => a - b);
        r.data.outbound.forEach((f) => directDays.add(f.departDate));
        console.log(
          `${origin.padEnd(8)} wizz priame                ${String(r.data.outbound.length).padStart(3)} ${pct(r.data.outbound.length)}  ${prices[0]?.toFixed(0).padStart(5)}   ${prices[Math.floor(prices.length / 2)]?.toFixed(0).padStart(6)}   (späť ${r.data.inbound.length} dní, API ${r.data.apiVersion})`,
        );
      } else console.log(`${origin.padEnd(8)} wizz priame                CHYBA ${r.reason}`);
    }
    // tp-flights calendar (priame + s prestupom, ak je token)
    const tp = await tpFlights.fetch(
      { kind: 'calendar', origin, destination: 'KEF', departDate: month },
      ctx,
    );
    if (tp.ok) {
      const direct = tp.data.filter((f) => f.transfers === 0);
      tp.data.forEach((f) => directDays.add(f.departDate));
      const prices = tp.data.map((f) => f.price).sort((a, b) => a - b);
      console.log(
        `${origin.padEnd(8)} tp-flights (všetky)        ${String(tp.data.length).padStart(3)} ${pct(tp.data.length)}  ${prices[0]?.toFixed(0).padStart(5)}   ${prices[Math.floor(prices.length / 2)]?.toFixed(0).padStart(6)}   (priame ${direct.length})`,
      );
    } else console.log(`${origin.padEnd(8)} tp-flights                 – ${tp.reason}`);
    summary[origin].direct = directDays.size;

    // Ryanair segmenty do hubov
    const segDays = new Set<string>();
    for (const hub of HUBS) {
      const r = await ryanair.fetch({ origin, destination: hub, month }, ctx);
      if (r.ok && r.data.length) {
        r.data.forEach((f) => segDays.add(f.departDate));
        const prices = r.data.map((f) => f.price).sort((a, b) => a - b);
        console.log(
          `${origin.padEnd(8)} ryanair → ${hub}              ${String(r.data.length).padStart(3)} ${pct(r.data.length)}  ${prices[0].toFixed(0).padStart(5)}   ${prices[Math.floor(prices.length / 2)].toFixed(0).padStart(6)}`,
        );
      } else if (!r.ok) console.log(`${origin.padEnd(8)} ryanair → ${hub}              CHYBA ${r.reason}`);
    }
    summary[origin].segment = segDays.size;
    console.log('');
  }

  console.log('Súhrn (dni s aspoň jednou cenou):');
  for (const [o, s] of Object.entries(summary))
    console.log(`  ${o}: priame/tp ${pct(s.direct)} · segment do hubu ${pct(s.segment)}`);
  console.log(`\nKurz: 1 € = ${fx.ok ? fx.data.rate : '?'} PLN, ${fxHuf.ok ? fxHuf.data.rate : '?'} HUF`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
