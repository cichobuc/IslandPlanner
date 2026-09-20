import { daylightMinutes } from './time';
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
  /** otváracie hodiny HH:MM (ak sú známe) */
  openFrom?: string | null;
  openUntil?: string | null;
  bookingRequired?: boolean;
  /** vstupné na dospelého v EUR (0 = zadarmo); parkovné sa neráta */
  entryPpEur?: number;
};

export type DaySkeleton = {
  dayIndex: number;
  date: string;
  /** región prenocovania (posledný deň: null = KEF) */
  overnightRegionId: string | null;
  locked?: boolean;
  /** odchod z noci / začiatok dňa v minútach dňa (KEF čas); default 08:30, prvý deň = prílet + vyzdvihnutie auta */
  startMin?: number;
  /** najneskorší príchod do cieľa dňa (posledný deň = odlet − 3 h); default západ slnka + 30 min */
  endMin?: number;
};

export type MatrixLookup = (fromKey: string, toKey: string) => { km: number; min: number } | null;

export type GeneratedStop = {
  slug: string;
  order: number;
  stayMin: number;
  driveKmFromPrev: number;
  driveMinFromPrev: number;
  /** príchod v minútach dňa (KEF čas) – z odchodu, jazdy × 1,25 a 10 min na zastávku */
  arriveMin: number;
  score: number;
  /** horný kvartil skóre dňa = „musí“; ostatné sa dajú vynechať pri zlom počasí */
  must: boolean;
  afterSunset: boolean;
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
  startMin: number;
  /** príchod do cieľa dňa (noc / KEF) v minútach dňa */
  arriveEndMin: number;
  sunset: number;
  reserve: boolean;
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
  /** už zaradené / zamknuté zastávky per deň (slugy), ktoré ostávajú */
  keep?: Record<number, string[]>;
  /** pri ≥ 8 dňoch nechať 1 rezervný deň na počasie (default true) */
  reserveDay?: boolean;
  /** súradnice kotiev (`region:<id>`, `kef`) pre zoradenie pozdĺž smeru jazdy */
  anchorPoints?: Record<string, { lat: number; lng: number }>;
  /** úroveň míňania na atrakcie (default balanced) a počet osôb pre mešec */
  attractionBudget?: AttractionBudgetLevel;
  pax?: number;
};

/**
 * Koľko míňať na atrakcie (ADR-015): mešec na celú cestu = limit €/os/deň × dni × osoby, plus penalizácia ceny v skóre
 * (λ bodov za €) – platené miesto musí byť o toľko lepšie, o koľko je drahšie. Zadarmo miesta nie sú dotknuté.
 */
export type AttractionBudgetLevel = 'free' | 'budget' | 'balanced' | 'unlimited';
export const ATTRACTION_BUDGET: Record<
  AttractionBudgetLevel,
  { ppPerDayEur: number | null; lambda: number; labelSk: string }
> = {
  free: { ppPerDayEur: 0, lambda: Infinity, labelSk: 'len zadarmo' },
  budget: { ppPerDayEur: 12, lambda: 0.06, labelSk: 'úsporne · ≤ 12 €/os/deň' },
  balanced: { ppPerDayEur: 35, lambda: 0.025, labelSk: 'vyvážene · ≤ 35 €/os/deň' },
  unlimited: { ppPerDayEur: null, lambda: 0.005, labelSk: 'bez limitu' },
};

/** Hviezdičky kvality 1–5 (zo seedu `popularity` = „oplatí sa vidieť“) a hodnota za peniaze: hviezdičky na 10 € na osobu. */
export const stars = (p: Pick<PoiCandidate, 'popularity'>) =>
  Math.max(1, Math.min(5, Math.round(p.popularity)));
export function valueForMoney(p: Pick<PoiCandidate, 'popularity' | 'entryPpEur'>): number | null {
  const eur = p.entryPpEur ?? 0;
  if (eur <= 0) return null;
  return Math.round((stars(p) / (eur / 10)) * 10) / 10;
}

export const PACE_CAPACITY: Record<Pace, { dayMin: number; maxStops: number; maxDriveMin: number }> = {
  relaxed: { dayMin: 8 * 60, maxStops: 3, maxDriveMin: 4 * 60 },
  normal: { dayMin: 10 * 60, maxStops: 5, maxDriveMin: 5 * 60 },
  intense: { dayMin: 12 * 60, maxStops: 7, maxDriveMin: 6.5 * 60 },
};

export const DRIVE_REAL_FACTOR = 1.25;
export const STOP_OVERHEAD_MIN = 10;
export const DEFAULT_START_MIN = 8 * 60 + 30;
/** max. obchádzka, ktorú sa oplatí spraviť pre jedno miesto (čistá jazda navyše) */
export const MAX_DETOUR_MIN = 75;
/** penalizácia plného dňa pri výbere dňa pre miesto (min za 100 % vyťaženia) */
export const LOAD_PENALTY_MIN = 60;

/** Hlavný okruh v smere hodinových ručičiek (Ring Road + Snæfellsnes na spiatočnej ceste); Westfjordy a Vysočina sú mimo okruhu. */
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
];

export const regionKey = (regionId: string | null | undefined, airportKey = 'kef') =>
  regionId ? `region:${regionId}` : airportKey;

/** Skóre POI: popularita + záujmy skupiny + sezóna; klenoty dostanú bonus podľa `gemShare`. */
export function scorePoi(p: PoiCandidate, interests: string[], gemShare = 0.3, lambda = 0): number {
  let s = p.popularity;
  for (const k of interests) s += (p.interestWeight[k] ?? 0) * 2;
  if (p.monthRating != null) s += (p.monthRating - 3) * 0.8;
  if (p.hiddenGem) s += gemShare * 3;
  // penalizácia ceny: pri „bez limitu“ takmer nič, pri „úsporne“ 50 € = −3 body (≈ rozdiel medzi 5★ a 2★)
  if (lambda && p.entryPpEur && Number.isFinite(lambda)) s -= lambda * p.entryPpEur;
  return Math.round(s * 100) / 100;
}

/** Regióny „po ceste“ medzi dvoma regiónmi v smere okruhu (vrátane oboch); okruh je cyklický (sever → Reykjavík ide cez západ). */
export function regionsBetween(from: string | null, to: string | null, order = RING_ORDER): string[] {
  if (!from && !to) return [];
  if (!from) return [to!];
  if (!to) return [from];
  if (from === to) return [from];
  const a = order.indexOf(from);
  const b = order.indexOf(to);
  if (a === -1 || b === -1) return [from, to];
  if (a <= b) return order.slice(a, b + 1);
  return [...order.slice(a), ...order.slice(0, b + 1)];
}

/** Východ a západ slnka v minútach dňa (KEF), symetricky okolo 13:30 (Island je „posunutý“ voči UTC). */
export function sunTimes(date: string): { sunrise: number; sunset: number } {
  const len = daylightMinutes(date);
  const noon = 13 * 60 + 30;
  return { sunrise: Math.round(noon - len / 2), sunset: Math.round(noon + len / 2) };
}

const hhmmToMin = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
export const fmtH = (min: number) =>
  `${Math.floor(min / 60)} h ${String(Math.round(min % 60)).padStart(2, '0')}`;
export const fmtClock = (min: number) =>
  `${String(Math.floor((((min % 1440) + 1440) % 1440) / 60)).padStart(2, '0')}:${String(Math.round(min % 60)).padStart(2, '0')}`;

type Pt = { lat: number; lng: number };
/** Projekcia bodu na os štart → cieľ (0 = štart, 1 = cieľ) v km-ekvivalentoch. */
function projection(p: Pt, a: Pt, b: Pt): number {
  const kx = Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180));
  const ax = a.lng * kx;
  const bx = b.lng * kx;
  const px = p.lng * kx;
  const dx = bx - ax;
  const dy = b.lat - a.lat;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-9) return 0;
  return ((px - ax) * dx + (p.lat - a.lat) * dy) / len2;
}

/**
 * Poradie zastávok v dni: najprv pozdĺž smeru jazdy (projekcia na os štart → cieľ), potom 2-opt na matici
 * so zafixovaným štartom a cieľom – odstráni cúvanie, ktoré robil „najbližší sused“.
 */
export function orderStops(
  startKey: string,
  endKey: string,
  list: PoiCandidate[],
  matrix: MatrixLookup,
  anchors: { start: Pt | null; end: Pt | null },
): PoiCandidate[] {
  if (list.length <= 1) return [...list];
  let seq = [...list];
  if (anchors.start && anchors.end) {
    const a = anchors.start;
    const b = anchors.end;
    seq.sort((p, q) => projection(p, a, b) - projection(q, a, b));
  } else {
    seq = nearestNeighbour(startKey, list, matrix);
  }
  const leg = (x: string, y: string) => matrix(x, y)?.min ?? 1e6;
  const cost = (s: PoiCandidate[]) => {
    let c = leg(startKey, s[0].slug);
    for (let i = 1; i < s.length; i++) c += leg(s[i - 1].slug, s[i].slug);
    return c + leg(s[s.length - 1].slug, endKey);
  };
  let best = cost(seq);
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < seq.length - 1; i++)
      for (let j = i + 1; j < seq.length; j++) {
        const cand = [...seq.slice(0, i), ...seq.slice(i, j + 1).reverse(), ...seq.slice(j + 1)];
        const c = cost(cand);
        if (c + 0.5 < best) {
          seq = cand;
          best = c;
          improved = true;
        }
      }
  }
  return seq;
}

function nearestNeighbour(startKey: string, list: PoiCandidate[], matrix: MatrixLookup): PoiCandidate[] {
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

type DayCtx = {
  day: DaySkeleton;
  idx: number;
  startKey: string;
  endKey: string;
  startPt: Pt | null;
  endPt: Pt | null;
  regions: string[];
  startMin: number;
  endLimit: number;
  sunset: number;
  cap: { dayMin: number; maxStops: number; maxDriveMin: number };
  reserve: boolean;
  baselineMin: number;
  chosen: PoiCandidate[];
};

/**
 * Generátor kostry dní → zastávky (čistá funkcia, matica namiesto živého routingu – K1).
 * 1) každé POI dostane deň s najmenšou obchádzkou (globálne, nie per deň), 2) POI sa pridávajú podľa skóre,
 * kým sa zmestia do kapacity tempa a do západu slnka, 3) poradie v dni pozdĺž smeru + 2-opt, 4) časové sloty,
 * 5) pri ≥ 8 dňoch jeden rezervný deň (polovičná kapacita), 6) horný kvartil skóre = „musí“.
 */
export function generateItinerary(input: GenerateInput): GeneratedDay[] {
  const cap = PACE_CAPACITY[input.pace];
  const budget = ATTRACTION_BUDGET[input.attractionBudget ?? 'balanced'];
  const pax = Math.max(1, input.pax ?? 1);
  const poolEur = budget.ppPerDayEur == null ? Infinity : budget.ppPerDayEur * input.days.length * pax;
  let spentEur = 0;
  // jeden „veľký zážitok“ nad mešec: 5★ miesto, ktoré sedí na záujem skupiny (nie pri „úsporne“)
  let splurgeUsed = false;
  const costOf = (p: PoiCandidate) => (p.entryPpEur ?? 0) * pax;
  const isSplurge = (p: PoiCandidate) =>
    !splurgeUsed &&
    input.attractionBudget !== 'budget' &&
    stars(p) === 5 &&
    input.interests.some((k) => (p.interestWeight[k] ?? 0) >= 0.8);
  const airport = input.airportKey ?? 'kef';
  const order = input.ringOrder ?? RING_ORDER;
  const sorted = [...input.days].sort((a, b) => a.dayIndex - b.dayIndex);
  const poiBySlug = new Map(input.pois.map((p) => [p.slug, p]));
  const leg = (a: string, b: string) => input.matrix(a, b) ?? { km: 0, min: 0 };
  const anchorPt = (key: string): Pt | null => {
    const p = poiBySlug.get(key);
    return p ? { lat: p.lat, lng: p.lng } : (input.anchorPoints?.[key] ?? null);
  };

  const ctxs: DayCtx[] = sorted.map((day, idx) => {
    const prev = sorted[idx - 1];
    const startRegion = idx === 0 ? null : (prev.overnightRegionId ?? null);
    const endRegion = day.overnightRegionId ?? null;
    const isLast = idx === sorted.length - 1;
    const startKey = idx === 0 ? airport : regionKey(startRegion, airport);
    const endKey = isLast && !day.overnightRegionId ? airport : regionKey(endRegion, airport);
    const sun = sunTimes(day.date || '2027-09-15');
    const startMin = day.startMin ?? DEFAULT_START_MIN;
    const endLimit = Math.min(day.endMin ?? sun.sunset + 30, startMin + cap.dayMin);
    return {
      day,
      idx,
      startKey,
      endKey,
      startPt: anchorPt(startKey),
      endPt: anchorPt(endKey),
      regions: regionsBetween(
        startRegion ?? (idx === 0 ? 'reykjanes' : null),
        endRegion ?? (isLast ? 'reykjanes' : null),
        order,
      ),
      startMin,
      endLimit,
      sunset: sun.sunset,
      cap,
      reserve: false,
      baselineMin: leg(startKey, endKey).min,
      chosen: [],
    };
  });

  // rezervný deň: pri ≥ 8 dňoch stredný deň s najkratším presunom (ideálne 2 noci v tom istom regióne)
  if ((input.reserveDay ?? true) && ctxs.length >= 8) {
    const middle = ctxs.slice(1, -1).filter((c) => !c.day.locked);
    const sameRegion = middle.filter((c) => c.startKey === c.endKey);
    const pool = sameRegion.length ? sameRegion : middle;
    const pick = pool.sort((a, b) => a.baselineMin - b.baselineMin)[0];
    if (pick) pick.reserve = true;
  }

  // simulácia dňa pre danú množinu zastávok
  const simulate = (c: DayCtx, list: PoiCandidate[]) => {
    const seq = orderStops(c.startKey, c.endKey, list, input.matrix, { start: c.startPt, end: c.endPt });
    let t = c.startMin;
    let km = 0;
    let min = 0;
    let prevKey = c.startKey;
    const stops: GeneratedStop[] = [];
    let closedHit = false;
    seq.forEach((p, i) => {
      const l = leg(prevKey, p.slug);
      km += l.km;
      min += l.min;
      t += l.min * DRIVE_REAL_FACTOR + STOP_OVERHEAD_MIN;
      const arrive = Math.round(t);
      if (p.openFrom && arrive < hhmmToMin(p.openFrom)) t = hhmmToMin(p.openFrom); // počká na otvorenie
      if (p.openUntil && arrive > hhmmToMin(p.openUntil) - p.visitMin) closedHit = true;
      stops.push({
        slug: p.slug,
        order: i,
        stayMin: p.visitMin,
        driveKmFromPrev: Math.round(l.km * 10) / 10,
        driveMinFromPrev: Math.round(l.min),
        arriveMin: arrive,
        score: scorePoi(p, input.interests, input.gemShare),
        must: false,
        afterSunset: arrive > c.sunset,
      });
      t += p.visitMin;
      prevKey = p.slug;
    });
    const last = leg(prevKey, c.endKey);
    km += last.km;
    min += last.min;
    t += last.min * DRIVE_REAL_FACTOR;
    return { seq, stops, km, min, arriveEnd: Math.round(t), closedHit };
  };

  const fits = (c: DayCtx, list: PoiCandidate[], forced: boolean) => {
    if (forced) return true;
    const maxStops = c.reserve ? Math.max(1, Math.ceil(c.cap.maxStops / 2)) : c.cap.maxStops;
    if (list.length > maxStops) return false;
    const r = simulate(c, list);
    if (r.closedHit) return false;
    if (r.arriveEnd > c.endLimit) return false;
    if (r.stops.some((s) => s.afterSunset)) return false;
    return true;
  };

  // 1) zamknuté / ručné najprv
  const used = new Set<string>();
  for (const c of ctxs) {
    for (const slug of input.keep?.[c.day.dayIndex] ?? []) {
      const p = poiBySlug.get(slug);
      if (!p || used.has(slug)) continue;
      c.chosen.push(p);
      used.add(slug);
    }
  }

  // 2) globálne: každé POI → dni podľa obchádzky; potom podľa skóre plniť
  type Option = { c: DayCtx; detour: number };
  const candidates = input.pois
    .filter((p) => !used.has(p.slug))
    .filter((p) => !p.requires4x4 || input.allow4x4)
    .filter((p) => p.monthRating == null || p.monthRating >= 2)
    .filter((p) => budget.ppPerDayEur !== 0 || !(p.entryPpEur && p.entryPpEur > 0))
    .map((p) => {
      const options: Option[] = ctxs
        .filter((c) => !c.day.locked && p.regionId && c.regions.includes(p.regionId))
        .map((c) => ({ c, detour: leg(c.startKey, p.slug).min + leg(p.slug, c.endKey).min - c.baselineMin }))
        .filter((o) => o.detour <= MAX_DETOUR_MIN)
        .sort((a, b) => a.detour - b.detour || a.c.idx - b.c.idx);
      return { p, score: scorePoi(p, input.interests, input.gemShare), options };
    })
    .filter((x) => x.options.length > 0)
    .sort((a, b) => b.score - a.score);

  // vyťaženie dňa (0–1) – aby sa top miesta rozložili a nie nahrnuli do jedného dňa
  const load = (c: DayCtx) => {
    const span = Math.max(60, c.endLimit - c.startMin);
    return c.chosen.length
      ? Math.min(1.5, (simulate(c, c.chosen).arriveEnd - c.startMin) / span)
      : c.baselineMin / span;
  };
  for (const { p, options } of candidates) {
    // mešec na celú cestu: platené miesto sa zmestí, len ak zostáva; zadarmo vždy
    const entryCost = costOf(p);
    let splurge = false;
    if (entryCost > 0 && spentEur + entryCost > poolEur) {
      if (!isSplurge(p)) continue;
      splurge = true;
    }
    const ranked = options
      .map((o) => ({ ...o, cost: o.detour + LOAD_PENALTY_MIN * load(o.c) }))
      .sort((a, b) => a.cost - b.cost || a.c.idx - b.c.idx);
    for (const { c } of ranked) {
      if (fits(c, [...c.chosen, p], false)) {
        c.chosen.push(p);
        used.add(p.slug);
        spentEur += entryCost;
        if (splurge) splurgeUsed = true;
        break;
      }
    }
  }

  // 3) výstup so slotmi, štítkami a varovaniami
  return ctxs.map((c) => {
    const r = simulate(c, c.chosen);
    const scores = r.stops.map((s) => s.score).sort((a, b) => b - a);
    const q = scores[Math.floor((scores.length - 1) * 0.25)] ?? Infinity;
    const stops = r.stops.map((s) => ({ ...s, must: r.stops.length <= 2 || s.score >= q }));
    const driveMinReal = Math.round(Math.round(r.min) * DRIVE_REAL_FACTOR + stops.length * STOP_OVERHEAD_MIN);
    const warnings: string[] = [];
    if (c.reserve) warnings.push('Rezervný deň – pri zlom počasí sem presuň zastávky');
    if (driveMinReal > c.cap.maxDriveMin)
      warnings.push(`${fmtH(driveMinReal)} jazdy – nad limitom tempa (${fmtH(c.cap.maxDriveMin)})`);
    // na nocľah stačí doraziť do 30 min po západe; skorší limit (odlet) má prednosť
    if (c.day.endMin != null && r.arriveEnd > c.day.endMin)
      warnings.push(
        `Príchod ${fmtClock(r.arriveEnd)} po limite ${fmtClock(c.day.endMin)} – vyraz skôr alebo presuň noc bližšie`,
      );
    else if (r.arriveEnd > c.sunset + 30)
      warnings.push(`Príchod ${fmtClock(r.arriveEnd)} po západe slnka (${fmtClock(c.sunset)})`);
    if (stops.length === 0 && !c.reserve)
      warnings.push(c.regions.length ? 'Voľný deň – v regióne nie je POI v seede' : 'Voľný deň');
    return {
      dayIndex: c.day.dayIndex,
      startKey: c.startKey,
      endKey: c.endKey,
      stops,
      driveKm: Math.round(r.km),
      driveMin: Math.round(r.min),
      driveMinReal,
      totalMin: r.arriveEnd - c.startMin,
      startMin: c.startMin,
      arriveEndMin: r.arriveEnd,
      sunset: c.sunset,
      reserve: c.reserve,
      regionsVisited: c.regions,
      warnings,
    };
  });
}

export type { Pt as LatLng };
