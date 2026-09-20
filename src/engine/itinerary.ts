import type { Pace } from './types';

/** Kandidát na zastávku (zo seedu `pois`). */
export type PoiCandidate = {
  slug: string;
  name: string;
  regionId: string | null;
  lat: number;
  lng: number;
  visitMin: number;
  popularity: number; // 1–5
  hiddenGem: boolean;
  interestWeight: Record<string, number>;
  monthRating: number | null; // 1–5 pre cieľový mesiac, null = neznáme
  requires4x4: boolean;
  kind: string;
};

export type DaySkeleton = {
  dayIndex: number;
  date: string;
  /** región prenocovania (posledný deň: null = KEF) */
  overnightRegionId: string | null;
  locked?: boolean;
  /** minúty svetla/kapacity k dispozícii (prvý/posledný deň menej – podľa letu) */
  availableMin?: number;
};

export type MatrixLookup = (fromKey: string, toKey: string) => { km: number; min: number } | null;

export type GeneratedStop = {
  slug: string;
  order: number;
  stayMin: number;
  driveKmFromPrev: number;
  driveMinFromPrev: number;
  score: number;
};

export type GeneratedDay = {
  dayIndex: number;
  startKey: string;
  endKey: string;
  stops: GeneratedStop[];
  driveKm: number;
  /** čistá jazda z matice */
  driveMin: number;
  /** realisticky: × 1,25 + 10 min na zastávku (docs/obrazovky/krok-5) */
  driveMinReal: number;
  totalMin: number;
  regionsVisited: string[];
  warnings: string[];
};

export type GenerateInput = {
  days: DaySkeleton[];
  pois: PoiCandidate[];
  matrix: MatrixLookup;
  pace: Pace;
  interests: string[];
  /** podiel klenotov 0–1 (docs: davy ↔ klenoty, default 0,3) */
  gemShare?: number;
  allow4x4?: boolean;
  /** kľúč štartu prvého dňa a cieľa posledného (KEF) */
  airportKey?: string;
  /** poradie regiónov na okruhu – pre výber regiónov „po ceste“ medzi nocami */
  ringOrder?: string[];
  /** už zaradené / zamknuté sloty per deň (slugy), ktoré ostávajú */
  keep?: Record<number, string[]>;
};

export const PACE_CAPACITY: Record<Pace, { dayMin: number; maxStops: number; maxDriveMin: number }> = {
  relaxed: { dayMin: 8 * 60, maxStops: 3, maxDriveMin: 4 * 60 },
  normal: { dayMin: 10 * 60, maxStops: 5, maxDriveMin: 5 * 60 },
  intense: { dayMin: 12 * 60, maxStops: 7, maxDriveMin: 6.5 * 60 },
};

export const DRIVE_REAL_FACTOR = 1.25;
export const STOP_OVERHEAD_MIN = 10;

export const RING_ORDER = [
  'reykjanes',
  'reykjavik',
  'golden_circle',
  'south',
  'southeast',
  'eastfjords',
  'north_myvatn',
  'akureyri',
  'north_west',
  'snaefellsnes',
  'westfjords',
  'highlands',
];

export const regionKey = (regionId: string | null | undefined, airportKey = 'kef') =>
  regionId ? `region:${regionId}` : airportKey;

/** Skóre POI: popularita + záujmy skupiny + sezóna; klenoty dostanú bonus podľa `gemShare`. */
export function scorePoi(p: PoiCandidate, interests: string[], gemShare = 0.3): number {
  let s = p.popularity;
  for (const k of interests) s += (p.interestWeight[k] ?? 0) * 2;
  if (p.monthRating != null) s += (p.monthRating - 3) * 0.8;
  if (p.hiddenGem) s += gemShare * 3;
  return Math.round(s * 100) / 100;
}

/** Regióny „po ceste“ medzi dvoma regiónmi v smere okruhu (vrátane oboch). */
export function regionsBetween(from: string | null, to: string | null, order = RING_ORDER): string[] {
  if (!from && !to) return [];
  if (!from) return [to!];
  if (!to) return [from];
  const a = order.indexOf(from);
  const b = order.indexOf(to);
  if (a === -1 || b === -1) return [from, to];
  if (a <= b) return order.slice(a, b + 1);
  // proti smeru (návrat na západ) – zoberieme kratšiu cestu
  return [...order.slice(b, a + 1)].reverse();
}

/**
 * Generátor kostry dní → zastávky (čistá funkcia, matica namiesto živého routingu – K1).
 * Deň i ide z prenocovania i-1 (deň 1 z KEF) do prenocovania i (posledný deň na KEF); kandidáti = POI v regiónoch po ceste,
 * greedy podľa skóre, kým sa zmestia do kapacity tempa; poradie najbližší sused od štartu.
 */
export function generateItinerary(input: GenerateInput): GeneratedDay[] {
  const cap = PACE_CAPACITY[input.pace];
  const airport = input.airportKey ?? 'kef';
  const order = input.ringOrder ?? RING_ORDER;
  const used = new Set<string>();
  for (const slugs of Object.values(input.keep ?? {})) slugs.forEach((s) => used.add(s));
  const bySlug = new Map(input.pois.map((p) => [p.slug, p]));
  const leg = (a: string, b: string) => input.matrix(a, b) ?? { km: 0, min: 0 };
  const out: GeneratedDay[] = [];
  const sorted = [...input.days].sort((a, b) => a.dayIndex - b.dayIndex);

  sorted.forEach((day, idx) => {
    const prev = sorted[idx - 1];
    const startRegion = idx === 0 ? null : (prev.overnightRegionId ?? null);
    const endRegion = day.overnightRegionId ?? null;
    const startKey = idx === 0 ? airport : regionKey(startRegion, airport);
    const endKey =
      idx === sorted.length - 1 && !day.overnightRegionId ? airport : regionKey(endRegion, airport);
    const regions = regionsBetween(
      startRegion ?? (idx === 0 ? 'reykjanes' : null),
      endRegion ?? (idx === sorted.length - 1 ? 'reykjanes' : null),
      order,
    );
    const budget = Math.min(day.availableMin ?? cap.dayMin, cap.dayMin);
    const warnings: string[] = [];

    const keepSlugs = input.keep?.[day.dayIndex] ?? [];
    const candidates = input.pois
      .filter((p) => !used.has(p.slug) || keepSlugs.includes(p.slug))
      .filter((p) => p.regionId && regions.includes(p.regionId))
      .filter((p) => !p.requires4x4 || input.allow4x4)
      .filter((p) => p.monthRating == null || p.monthRating >= 2)
      .map((p) => ({
        p,
        score: keepSlugs.includes(p.slug) ? 999 : scorePoi(p, input.interests, input.gemShare),
      }))
      .sort((a, b) => b.score - a.score);

    // greedy: pridávaj podľa skóre, kým celkový čas (jazda cez zastávky × faktor + pobyt) sedí v rozpočte
    const chosen: PoiCandidate[] = [];
    const routeMin = (list: PoiCandidate[]) => {
      const seq = orderNearest(startKey, list, input.matrix);
      let km = 0;
      let min = 0;
      let prevKey = startKey;
      for (const p of seq) {
        const l = leg(prevKey, p.slug);
        km += l.km;
        min += l.min;
        prevKey = p.slug;
      }
      const last = leg(prevKey, endKey);
      km += last.km;
      min += last.min;
      return { seq, km, min };
    };
    const baseline = routeMin([]);
    if (baseline.min * DRIVE_REAL_FACTOR > cap.maxDriveMin)
      warnings.push(
        `Presun ${Math.round(baseline.km)} km · ${fmtH(baseline.min * DRIVE_REAL_FACTOR)} – nad limitom tempa`,
      );
    for (const c of candidates) {
      if (chosen.length >= cap.maxStops && !keepSlugs.includes(c.p.slug)) break;
      const trial = [...chosen, c.p];
      const r = routeMin(trial);
      const total = r.min * DRIVE_REAL_FACTOR + trial.reduce((a, p) => a + p.visitMin + STOP_OVERHEAD_MIN, 0);
      if (total <= budget || keepSlugs.includes(c.p.slug)) {
        chosen.push(c.p);
        used.add(c.p.slug);
      }
    }
    const final = routeMin(chosen);
    let prevKey = startKey;
    const stops: GeneratedStop[] = final.seq.map((p, i) => {
      const l = leg(prevKey, p.slug);
      prevKey = p.slug;
      return {
        slug: p.slug,
        order: i,
        stayMin: p.visitMin,
        driveKmFromPrev: l.km,
        driveMinFromPrev: l.min,
        score: scorePoi(p, input.interests, input.gemShare),
      };
    });
    const driveMinReal = Math.round(final.min * DRIVE_REAL_FACTOR + stops.length * STOP_OVERHEAD_MIN);
    const totalMin = driveMinReal + stops.reduce((a, s) => a + s.stayMin, 0);
    if (driveMinReal > cap.maxDriveMin)
      warnings.push(`${fmtH(driveMinReal)} jazdy – nad limitom tempa (${fmtH(cap.maxDriveMin)})`);
    if (stops.length === 0)
      warnings.push(regions.length ? 'Voľný deň – v regióne nie je POI v seede' : 'Voľný deň');
    out.push({
      dayIndex: day.dayIndex,
      startKey,
      endKey,
      stops,
      driveKm: Math.round(final.km),
      driveMin: Math.round(final.min),
      driveMinReal,
      totalMin,
      regionsVisited: regions,
      warnings,
    });
    void bySlug;
  });
  return out;
}

/** Najbližší sused od štartu (dostatočné pre ≤ 7 zastávok). */
export function orderNearest(startKey: string, list: PoiCandidate[], matrix: MatrixLookup): PoiCandidate[] {
  const rest = [...list];
  const seq: PoiCandidate[] = [];
  let cur = startKey;
  while (rest.length) {
    let best = 0;
    let bestMin = Infinity;
    rest.forEach((p, i) => {
      const m = matrix(cur, p.slug)?.min ?? Infinity;
      if (m < bestMin) {
        bestMin = m;
        best = i;
      }
    });
    const [p] = rest.splice(best, 1);
    seq.push(p);
    cur = p.slug;
  }
  return seq;
}

export const fmtH = (min: number) =>
  `${Math.floor(min / 60)} h ${String(Math.round(min % 60)).padStart(2, '0')}`;
