import { ConnectorError, defineConnector, httpJson } from './base';
import calendarFixture from './fixtures/tp-flights-calendar.json';
import cheapFixture from './fixtures/tp-flights-cheap.json';

export type TpKind = 'calendar' | 'cheap' | 'direct' | 'monthly';
export type TpQuery = {
  kind: TpKind;
  origin: string;
  destination: string;
  /** YYYY-MM alebo YYYY-MM-DD (calendar/cheap/direct) */
  departDate?: string;
  returnDate?: string;
  /** dĺžka pobytu v dňoch (calendar) */
  length?: number;
  currency?: string;
};

/** Normalizovaná cena za deň (na osobu, bez batožiny) – vstup pre flightCombos. */
export type DayFare = {
  origin: string;
  destination: string;
  departDate: string; // YYYY-MM-DD
  returnDate: string | null;
  price: number;
  currency: string;
  airline: string | null;
  flightNumber: string | null;
  transfers: number;
  departureAt: string | null;
  returnAt: string | null;
  expiresAt: string | null;
  deepLink: string;
};

type RawFare = {
  origin?: string;
  destination?: string;
  price: number;
  airline?: string;
  flight_number?: number | string;
  departure_at?: string;
  return_at?: string;
  transfers?: number;
  expires_at?: string;
};
type CalendarRaw = { success: boolean; currency?: string; data: Record<string, RawFare> };
type CheapRaw = { success: boolean; currency?: string; data: Record<string, Record<string, RawFare>> };

const BASE = 'https://api.travelpayouts.com/v1/prices';

export function aviasalesLink(
  origin: string,
  destination: string,
  departDate: string,
  returnDate: string | null,
  pax = 1,
  marker?: string,
) {
  const dm = (d: string) => `${d.slice(8, 10)}${d.slice(5, 7)}`;
  const path = `${origin}${dm(departDate)}${destination}${returnDate ? dm(returnDate) : ''}${pax}`;
  return `https://www.aviasales.com/search/${path}${marker ? `?marker=${marker}` : ''}`;
}

const toFare = (q: TpQuery, departDate: string, r: RawFare, currency: string, marker?: string): DayFare => ({
  origin: r.origin ?? q.origin,
  destination: r.destination ?? q.destination,
  departDate,
  returnDate: r.return_at ? r.return_at.slice(0, 10) : null,
  price: r.price,
  currency,
  airline: r.airline ?? null,
  flightNumber: r.flight_number != null ? String(r.flight_number) : null,
  transfers: r.transfers ?? 0,
  departureAt: r.departure_at ?? null,
  returnAt: r.return_at ?? null,
  expiresAt: r.expires_at ?? null,
  deepLink: aviasalesLink(
    r.origin ?? q.origin,
    r.destination ?? q.destination,
    departDate,
    r.return_at ? r.return_at.slice(0, 10) : null,
    1,
    marker,
  ),
});

export function normalizeCalendar(q: TpQuery, raw: CalendarRaw, marker?: string): DayFare[] {
  const currency = (raw.currency ?? q.currency ?? 'eur').toUpperCase();
  return Object.entries(raw.data ?? {})
    .map(([date, r]) => toFare(q, date, r, currency, marker))
    .sort((a, b) => a.departDate.localeCompare(b.departDate));
}

export function normalizeCheap(q: TpQuery, raw: CheapRaw, marker?: string): DayFare[] {
  const currency = (raw.currency ?? q.currency ?? 'eur').toUpperCase();
  const out: DayFare[] = [];
  for (const [dest, byTransfers] of Object.entries(raw.data ?? {}))
    for (const [transfers, r] of Object.entries(byTransfers)) {
      const departDate = r.departure_at?.slice(0, 10) ?? q.departDate ?? '';
      out.push(
        toFare(
          { ...q, destination: dest },
          departDate,
          { ...r, transfers: Number(transfers) },
          currency,
          marker,
        ),
      );
    }
  return out.sort((a, b) => a.price - b.price);
}

/** Travelpayouts Flight Data Access API v1 (cache z Aviasales, história 7 dní; token X-Access-Token). */
export const tpFlights = defineConnector<TpQuery, DayFare[]>({
  id: 'tp-flights',
  steps: [2],
  kind: 'cached',
  ttlSec: 6 * 3600,
  rateLimit: { perSec: 2 },
  legal: 'affiliate',
  verifiedAt: '2026-09-20',
  sourceUrl: 'https://travelpayouts.github.io/slate/',
  fallback: 'gflights',
  cacheKey: (q) =>
    [
      q.kind,
      q.origin,
      q.destination,
      q.departDate ?? '',
      q.returnDate ?? '',
      q.length ?? '',
      q.currency ?? 'eur',
    ].join(':'),
  preflight: (ctx) => (ctx.env.TRAVELPAYOUTS_TOKEN?.trim() ? null : 'chýba TRAVELPAYOUTS_TOKEN'),
  request: async (q, ctx) => {
    const token = ctx.env.TRAVELPAYOUTS_TOKEN!.trim();
    const marker = ctx.env.TRAVELPAYOUTS_MARKER?.trim();
    const currency = q.currency ?? 'eur';
    const params = new URLSearchParams({ origin: q.origin, destination: q.destination, currency });
    if (q.departDate) params.set('depart_date', q.departDate);
    if (q.returnDate) params.set('return_date', q.returnDate);
    const headers = { 'X-Access-Token': token };
    if (q.kind === 'calendar') {
      params.set('calendar_type', 'departure_date');
      if (q.length) params.set('length', String(q.length));
      const raw = await httpJson<CalendarRaw>(ctx, `${BASE}/calendar?${params}`, { headers });
      if (!raw.success) throw new ConnectorError('success=false', false);
      return normalizeCalendar(q, raw, marker);
    }
    if (q.kind === 'monthly') {
      const raw = await httpJson<CalendarRaw>(ctx, `${BASE}/monthly?${params}`, { headers });
      if (!raw.success) throw new ConnectorError('success=false', false);
      return normalizeCalendar(q, raw, marker);
    }
    const raw = await httpJson<CheapRaw>(ctx, `${BASE}/${q.kind}?${params}`, { headers });
    if (!raw.success) throw new ConnectorError('success=false', false);
    return normalizeCheap(q, raw, marker);
  },
  fixture: (q) => {
    if (q.kind === 'calendar' || q.kind === 'monthly')
      return normalizeCalendar(q, calendarFixture as unknown as CalendarRaw);
    const fares = normalizeCheap(q, cheapFixture as unknown as CheapRaw);
    return q.kind === 'direct' ? fares.filter((f) => f.transfers === 0) : fares;
  },
  healthQuery: () => ({
    kind: 'cheap',
    origin: 'BUD',
    destination: 'KEF',
    departDate: '2027-09',
    returnDate: '2027-09',
  }),
});
