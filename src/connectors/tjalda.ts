import { defineConnector, httpJson, parseIskNumber } from './base';
import fixture from './fixtures/tjalda.json';

export type CampsiteQuery = { includeHidden?: boolean };

export type CampsitePrices = {
  adultIsk: number | null;
  seniorIsk: number | null;
  childIsk: number | null;
  childFreeUnderAge: number | null;
  electricityIsk: number | null;
  taxIsk: number | null;
  showerIsk: number | null;
  raw: string;
};

export type Campsite = {
  id: number;
  slug: string;
  name: string;
  city: string | null;
  lat: number;
  lng: number;
  region: string | null;
  prices: CampsitePrices;
  yearRound: boolean;
  season: { from: string; to: string } | null; // MM-DD
  openingText: string | null;
  services: string[];
  hasElectricity: boolean;
  hasShowers: boolean;
  hasKitchen: boolean;
  hasLaundry: boolean;
  hasWifi: boolean;
  bookableWithParka: boolean;
  acceptsDropIn: boolean;
  bookingUrl: string | null;
  website: string | null;
  phone: string | null;
  description: string | null;
};

export type TjaldaRaw = {
  id: number;
  name: string;
  slug: string;
  city?: string | null;
  latitude: string | number;
  longitude: string | number;
  prices?: string | null;
  prices_en?: string | null;
  opening_time?: string | null;
  opening_time_custom_text_en?: string | null;
  season_start_month?: number | null;
  season_start_day?: number | null;
  season_end_month?: number | null;
  season_end_day?: number | null;
  bookable_with_parka?: boolean;
  accepts_drop_in?: boolean;
  accepts_prebooked?: boolean;
  link_to_prebooked?: string | null;
  show_campsite_on_tjalda?: boolean;
  camping_website?: string | null;
  phone_number?: string | null;
  short_description_en?: string | null;
  region?: { name_en?: string | null; slug_en?: string | null } | null;
  services?: Array<{ slug: string; title_en?: string | null }>;
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Cenník je voľný text („Adults: ISK 1,800 per person / night", „Fullorðnir: 1.800 kr."). */
export function parseCampsitePrices(
  en: string | null | undefined,
  is: string | null | undefined,
): CampsitePrices {
  const text = en && en.trim().length > 10 ? en : (is ?? '');
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const find = (re: RegExp) => lines.find((l) => re.test(l));
  const num = (line?: string) => {
    if (!line) return null;
    const stripped = line
      .replace(/\b\d{4}\b(?=\s*(rates|verðskrá))/i, '')
      .replace(/\(.*?\d+\s*[-–]\s*\d+.*?\)/g, '');
    const m = stripped.match(/(\d{1,3}(?:[.,]\d{3})+|\d{3,6})/);
    if (!m) return null;
    const v = Number(m[1].replace(/[.,]/g, ''));
    return v >= 300 && v <= 20000 ? v : null;
  };
  const adultLine = find(/adult|fullorðn/i);
  const adultIsk = num(adultLine);
  const seniorIsk = num(find(/senior|eldri borgar|ellilíf/i));
  const childLine = find(/child|börn|unglingar|youth/i);
  const childIsk = /free|ókeypis|frítt/i.test(childLine ?? '') ? 0 : num(childLine);
  const freeLine = lines.find((l) => /(child|börn)/i.test(l) && /(free|ókeypis|frítt)/i.test(l));
  const ageM = freeLine?.match(/(\d{1,2})\s*(years|ára)/i);
  const childFreeUnderAge = ageM ? Number(ageM[1]) : null;
  const electricityIsk = num(find(/electric|rafmagn/i));
  const taxIsk = num(find(/tax|gistináttaskatt/i));
  const showerIsk = num(find(/shower|sturt/i));
  return { adultIsk, seniorIsk, childIsk, childFreeUnderAge, electricityIsk, taxIsk, showerIsk, raw: text };
}

export function normalizeCampsite(r: TjaldaRaw): Campsite {
  const services = (r.services ?? []).map((s) => s.title_en ?? s.slug);
  const has = (re: RegExp) => services.some((s) => re.test(s));
  const season =
    r.season_start_month && r.season_end_month
      ? {
          from: `${pad(r.season_start_month)}-${pad(r.season_start_day ?? 1)}`,
          to: `${pad(r.season_end_month)}-${pad(r.season_end_day ?? 28)}`,
        }
      : null;
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    city: r.city ?? null,
    lat: Number(r.latitude),
    lng: Number(r.longitude),
    region: r.region?.name_en ?? null,
    prices: parseCampsitePrices(r.prices_en, r.prices),
    yearRound: r.opening_time === '1',
    season,
    openingText: r.opening_time_custom_text_en || null,
    services,
    hasElectricity: has(/electric/i),
    hasShowers: has(/shower/i),
    hasKitchen: has(/kitchen|cooking/i),
    hasLaundry: has(/laundry|washing/i),
    hasWifi: has(/wi-?fi|internet/i),
    bookableWithParka: Boolean(r.bookable_with_parka),
    acceptsDropIn: Boolean(r.accepts_drop_in),
    bookingUrl: r.link_to_prebooked || null,
    website: r.camping_website
      ? r.camping_website.startsWith('http')
        ? r.camping_website
        : `https://${r.camping_website}`
      : null,
    phone: r.phone_number || null,
    description: r.short_description_en || null,
  };
}

const normalizeAll = (raw: TjaldaRaw[], includeHidden: boolean) =>
  raw.filter((r) => includeHidden || r.show_campsite_on_tjalda !== false).map(normalizeCampsite);

/** 180 kempov s cenami (text), otvorením a službami – nedokumentované JSON tjalda.is (beží na Parka). */
export const tjalda = defineConnector<CampsiteQuery, Campsite[]>({
  id: 'tjalda',
  steps: [4],
  ttlSec: 7 * 24 * 3600,
  rateLimit: { perSec: 1, perDay: 24 },
  legal: 'unofficial',
  verifiedAt: '2026-09-20',
  sourceUrl: 'https://tjalda.is/api/campsites',
  fallback: 'seed',
  cacheKey: (q) => (q.includeHidden ? 'all' : 'visible'),
  request: async (q, ctx) =>
    normalizeAll(
      await httpJson<TjaldaRaw[]>(ctx, 'https://tjalda.is/api/campsites', {}, 40_000),
      Boolean(q.includeHidden),
    ),
  fixture: (q) => normalizeAll(fixture as TjaldaRaw[], Boolean(q.includeHidden)),
  healthQuery: () => ({}),
});
