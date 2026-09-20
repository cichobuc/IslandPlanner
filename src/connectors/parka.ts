import { defineConnector, httpJson } from './base';
import fixture from './fixtures/parka.json';

export type ParkingQuery = Record<string, never>;
export type ParkingTier = {
  name: string;
  description: string | null;
  hours: number | null;
  priceIsk: number;
  isDefault: boolean;
};
export type ParkingLot = {
  id: number;
  slug: string;
  name: string;
  areaNumber: string | null;
  lat: number;
  lng: number;
  isClosed: boolean;
  lotType: string | null;
  fixedDayPrice: boolean;
  /** Kategória A – osobné auto (default) */
  carPriceIsk: number | null;
  tiers: ParkingTier[];
  note: string | null;
};

type Raw = {
  id: number;
  name: string;
  slug: string;
  area_number?: string | null;
  latitude: string | number;
  longitude: string | number;
  is_closed?: boolean;
  lot_type?: string | { slug?: string; name?: string } | null;
  fixed_day_price?: boolean;
  short_description?: string | null;
  prices?: Array<{
    name: string;
    description?: string | null;
    hours?: number | null;
    price: number;
    isDefault?: boolean;
    order?: number;
    end?: string | null;
  }>;
};

export function normalizeLot(r: Raw): ParkingLot {
  const active = (r.prices ?? []).filter((p) => !p.end || Date.parse(p.end) > Date.now());
  const tiers = active
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((p) => ({
      name: p.name,
      description: p.description ?? null,
      hours: p.hours ?? null,
      priceIsk: p.price,
      isDefault: Boolean(p.isDefault),
    }));
  const car =
    tiers.find((t) => t.isDefault) ??
    tiers.find((t) => /category a|family car|einkab/i.test(t.name)) ??
    tiers[0];
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    areaNumber: r.area_number ?? null,
    lat: Number(r.latitude),
    lng: Number(r.longitude),
    isClosed: Boolean(r.is_closed),
    lotType: typeof r.lot_type === 'string' ? r.lot_type : (r.lot_type?.slug ?? r.lot_type?.name ?? null),
    fixedDayPrice: Boolean(r.fixed_day_price),
    carPriceIsk: car?.priceIsk ?? null,
    tiers,
    note: r.short_description || null,
  };
}

/** Oficiálne parkovné pri atrakciách (Parka), 102 parkovísk. */
export const parka = defineConnector<ParkingQuery, ParkingLot[]>({
  id: 'parka',
  steps: [5, 6],
  ttlSec: 7 * 24 * 3600,
  rateLimit: { perSec: 1, perDay: 24 },
  legal: 'unofficial',
  verifiedAt: '2026-09-20',
  sourceUrl: 'https://tjalda.is/api/parkings',
  fallback: 'seed',
  cacheKey: () => 'all',
  request: async (_q, ctx) =>
    (await httpJson<Raw[]>(ctx, 'https://tjalda.is/api/parkings', {}, 40_000)).map(normalizeLot),
  fixture: () => (fixture as unknown as Raw[]).map(normalizeLot),
  healthQuery: () => ({}),
});

/** Nájde parkovisko k POI podľa slugu / názvu (Skógafoss → skogafoss). */
export function matchLot(lots: ParkingLot[], poiSlug: string, poiName?: string): ParkingLot | null {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/ð/g, 'd')
      .replace(/þ/g, 'th')
      .replace(/æ/g, 'ae')
      .replace(/[^a-z0-9]/g, '');
  const target = norm(poiSlug);
  const byName = poiName ? norm(poiName) : '';
  return (
    lots.find((l) => norm(l.slug) === target) ??
    lots.find((l) => target.includes(norm(l.slug)) || (byName && norm(l.name) === byName)) ??
    null
  );
}
