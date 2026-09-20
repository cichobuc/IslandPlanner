import { ConnectorError, defineConnector, httpJson } from './base';
import type { ConnectorContext } from './types';
import fixtureBud from './fixtures/wizz-BUD-KEF.json';
import fixtureKtw from './fixtures/wizz-KTW-KEF.json';
import type { DayFare } from './tp-flights';

export type WizzQuery = { origin: string; destination: string; from: string; to: string };
export type WizzResult = { outbound: DayFare[]; inbound: DayFare[]; apiVersion: string };

type RawFlight = {
  departureStation: string;
  arrivalStation: string;
  departureDate: string;
  price: { amount: number; currencyCode: string } | null;
  priceType: string;
  departureDates?: string[];
};
type Raw = { outboundFlights: RawFlight[]; returnFlights: RawFlight[] };

export const WIZZ_FALLBACK_VERSION = '29.17.0';
const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36';
const VERSION_KEY = 'wizz:version';

/** Verzia API rotuje – zistí sa z homepage (regex be.wizzair.com/x.y.z), cache 24 h (docs/04 „self-heal"). */
export async function discoverWizzVersion(ctx: ConnectorContext, force = false): Promise<string> {
  if (!force) {
    const hit = await ctx.cache.get(VERSION_KEY);
    if (hit && typeof hit.payload === 'string' && hit.payload) return hit.payload;
  }
  try {
    const res = await ctx.fetchImpl('https://wizzair.com/en-gb', {
      headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'en-GB,en;q=0.9' },
    });
    const html = await res.text();
    const m = html.match(/be\.wizzair\.com\/(\d+\.\d+\.\d+)/);
    if (m) {
      await ctx.cache.set(VERSION_KEY, 'wizz', m[1], 24 * 3600);
      return m[1];
    }
  } catch {
    /* fallback nižšie */
  }
  return ctx.env.WIZZ_API_VERSION?.trim() || WIZZ_FALLBACK_VERSION;
}

export function wizzDeepLink(origin: string, destination: string, date: string, pax = 1) {
  return `https://wizzair.com/en-gb/booking/select-flight/${origin}/${destination}/${date}/null/${pax}/0/0/null`;
}

const toFares = (flights: RawFlight[]): DayFare[] =>
  flights
    .filter((f) => f.price && f.price.amount > 0)
    .map((f) => {
      const date = f.departureDate.slice(0, 10);
      return {
        origin: f.departureStation,
        destination: f.arrivalStation,
        departDate: date,
        returnDate: null,
        price: f.price!.amount,
        currency: f.price!.currencyCode,
        airline: 'W6',
        flightNumber: null,
        transfers: 0,
        departureAt: f.departureDates?.[0] ?? null,
        returnAt: null,
        expiresAt: null,
        deepLink: wizzDeepLink(f.departureStation, f.arrivalStation, date),
      };
    })
    .sort((a, b) => a.departDate.localeCompare(b.departDate));

export const normalizeWizz = (raw: Raw, apiVersion: string): WizzResult => ({
  outbound: toFares(raw.outboundFlights ?? []),
  inbound: toFares(raw.returnFlights ?? []),
  apiVersion,
});

async function callTimetable(ctx: ConnectorContext, version: string, q: WizzQuery): Promise<Raw> {
  return httpJson<Raw>(ctx, `https://be.wizzair.com/${version}/Api/search/timetable`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': BROWSER_UA,
      Origin: 'https://wizzair.com',
      Referer: 'https://wizzair.com/',
    },
    body: JSON.stringify({
      flightList: [
        { departureStation: q.origin, arrivalStation: q.destination, from: q.from, to: q.to },
        { departureStation: q.destination, arrivalStation: q.origin, from: q.from, to: q.to },
      ],
      priceType: 'regular',
      adultCount: 1,
      childCount: 0,
      infantCount: 0,
    }),
  });
}

/** Wizz Air timetable (neofic.): ceny po dňoch v mene odletu (PLN/HUF), priame KTW/BUD → KEF. Feature flag FLAG_WIZZ, ≤ 1 req/s. */
export const wizz = defineConnector<WizzQuery, WizzResult>({
  id: 'wizz',
  steps: [2],
  ttlSec: 6 * 3600,
  rateLimit: { perSec: 1, perDay: 200 },
  legal: 'unofficial',
  verifiedAt: '2026-09-20',
  sourceUrl: 'https://be.wizzair.com/{version}/Api/search/timetable',
  fallback: 'tp-flights',
  flag: 'FLAG_WIZZ',
  cacheKey: (q) => `${q.origin}-${q.destination}:${q.from}:${q.to}`,
  request: async (q, ctx) => {
    let version = await discoverWizzVersion(ctx);
    try {
      return normalizeWizz(await callTimetable(ctx, version, q), version);
    } catch (e) {
      // self-heal: verzia sa zmenila → zisti znova a skús raz
      if (e instanceof ConnectorError && /HTTP (400|404|410)/.test(e.message)) {
        version = await discoverWizzVersion(ctx, true);
        return normalizeWizz(await callTimetable(ctx, version, q), version);
      }
      throw e;
    }
  },
  fixture: (q) => normalizeWizz((q.origin === 'BUD' ? fixtureBud : fixtureKtw) as Raw, WIZZ_FALLBACK_VERSION),
  healthQuery: () => ({ origin: 'KTW', destination: 'KEF', from: '2027-09-01', to: '2027-09-30' }),
});
