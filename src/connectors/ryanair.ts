import { defineConnector, httpJson } from './base';
import fixture from './fixtures/ryanair-BTS-STN.json';
import type { DayFare } from './tp-flights';

/** month = YYYY-MM */
export type RyanairQuery = { origin: string; destination: string; month: string; currency?: string };

type RawDay = {
  day: string;
  arrivalDate: string | null;
  departureDate: string | null;
  price: { value: number; currencyCode: string } | null;
  soldOut: boolean;
  unavailable: boolean;
};
type Raw = { outbound: { fares: RawDay[] } };

export function ryanairDeepLink(origin: string, destination: string, date: string, pax = 1) {
  return `https://www.ryanair.com/gb/en/trip/flights/select?adults=${pax}&dateOut=${date}&originIata=${origin}&destinationIata=${destination}&isReturn=false`;
}

export const normalizeRyanair = (q: RyanairQuery, raw: Raw): DayFare[] =>
  (raw.outbound?.fares ?? [])
    .filter((d) => d.price && !d.unavailable && !d.soldOut)
    .map((d) => ({
      origin: q.origin,
      destination: q.destination,
      departDate: d.day,
      returnDate: null,
      price: d.price!.value,
      currency: d.price!.currencyCode,
      airline: 'FR',
      flightNumber: null,
      transfers: 0,
      departureAt: d.departureDate,
      returnAt: null,
      expiresAt: null,
      deepLink: ryanairDeepLink(q.origin, q.destination, d.day),
    }));

/** Ryanair cheapestPerDay (neofic., bez kľúča): najlacnejšia cena za deň pre pár letísk – prvý segment self-transferu. Flag FLAG_RYANAIR. */
export const ryanair = defineConnector<RyanairQuery, DayFare[]>({
  id: 'ryanair',
  steps: [2],
  ttlSec: 6 * 3600,
  rateLimit: { perSec: 1, perDay: 500 },
  legal: 'unofficial',
  verifiedAt: '2026-09-20',
  sourceUrl: 'https://services-api.ryanair.com/farfnd/v4/oneWayFares/{o}/{d}/cheapestPerDay',
  fallback: 'tp-flights',
  flag: 'FLAG_RYANAIR',
  cacheKey: (q) => `${q.origin}-${q.destination}:${q.month}:${q.currency ?? 'EUR'}`,
  request: async (q, ctx) => {
    const url = `https://services-api.ryanair.com/farfnd/v4/oneWayFares/${q.origin}/${q.destination}/cheapestPerDay?outboundMonthOfDate=${q.month}-01&currency=${q.currency ?? 'EUR'}`;
    return normalizeRyanair(q, await httpJson<Raw>(ctx, url));
  },
  fixture: (q) => normalizeRyanair(q, fixture as Raw),
  healthQuery: () => ({ origin: 'BTS', destination: 'STN', month: '2027-09' }),
});
