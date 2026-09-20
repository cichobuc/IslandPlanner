import { INTEREST_LABELS_SK, type InterestKey, type LodgingKind, type Pace, type VehicleClass } from './types';

/** Regióny a presety okruhov (docs/07). Kilometre = orientačný odhad úseku medzi regiónmi. */
export type RegionId =
  | 'reykjanes'
  | 'reykjavik'
  | 'golden_circle'
  | 'south'
  | 'southeast'
  | 'eastfjords'
  | 'north_myvatn'
  | 'akureyri'
  | 'north_west'
  | 'snaefellsnes'
  | 'westfjords'
  | 'highlands';

/** Slovenské názvy regiónov (zhodné so seed `regions.name_sk`) pre štítky v rozpočte a tlači. */
export const REGION_LABEL_SK: Record<string, string> = {
  reykjanes: 'Reykjanes (KEF)',
  reykjavik: 'Reykjavík',
  golden_circle: 'Golden Circle',
  south: 'Juh (Selfoss–Vík)',
  southeast: 'Juhovýchod (Skaftafell–Höfn)',
  eastfjords: 'Východné fjordy',
  north_myvatn: 'Mývatn a okolie',
  akureyri: 'Akureyri / Eyjafjörður',
  north_west: 'Severozápad',
  snaefellsnes: 'Snæfellsnes',
  westfjords: 'Západné fjordy',
  highlands: 'Vysočina (F-cesty)',
};
export const LODGING_KIND_SK: Record<LodgingKind, string> = {
  airbnb: 'Airbnb',
  hotel: 'hotel',
  guesthouse: 'penzión',
  hostel: 'hostel',
  campsite: 'kemp',
  camper_site: 'kemp',
};

export type PresetKey =
  | 'golden_only'
  | 'golden_south'
  | 'south_only'
  | 'golden_west'
  | 'south_west'
  | 'south_east'
  | 'ring'
  | 'ring_snaefellsnes'
  | 'ring_westfjords';

/** `trip.routePreset`: 'auto' (podľa dní) alebo kľúč presetu zvolený v kroku 04. */
export const PRESET_AUTO = 'auto';

export type Preset = {
  key: PresetKey;
  nameSk: string;
  /** Jedna veta pre výber okruhu. */
  noteSk: string;
  /** Hlavné kotvy okruhu (na zobrazenie). */
  highlights: string[];
  minDays: number;
  maxDays: number;
  /** Regióny v poradí; noci = typické noci v regióne (váha pri rozdeľovaní) */
  legs: { region: RegionId; nights: number; km: number }[];
  totalKm: number;
};

// km = jazda do regiónu z predchádzajúceho (vrátane zachádzok), posledný úsek späť na KEF
export const PRESETS: Record<PresetKey, Preset> = {
  golden_only: {
    key: 'golden_only',
    nameSk: 'Reykjavík + Golden Circle',
    noteSk: 'Základňa v Reykjavíku, jeden deň Golden Circle, Blue Lagoon pred odletom – najmenej jazdy.',
    highlights: ['Þingvellir', 'Geysir', 'Gullfoss', 'Secret Lagoon', 'Reykjavík', 'Blue Lagoon'],
    minDays: 3,
    maxDays: 4,
    legs: [
      { region: 'reykjavik', nights: 2, km: 50 },
      { region: 'golden_circle', nights: 1, km: 120 },
      { region: 'reykjanes', nights: 0, km: 160 },
    ],
    totalKm: 400,
  },
  golden_south: {
    key: 'golden_south',
    nameSk: 'Golden Circle + juh',
    noteSk: 'Klasika na krátku cestu: Þingvellir, Geysir, Gullfoss a južné pobrežie po Vík.',
    highlights: ['Þingvellir', 'Gullfoss', 'Seljalandsfoss', 'Skógafoss', 'Reynisfjara', 'Vík'],
    minDays: 3,
    maxDays: 5,
    legs: [
      { region: 'reykjavik', nights: 1, km: 50 },
      { region: 'golden_circle', nights: 1, km: 120 },
      { region: 'south', nights: 2, km: 180 },
      { region: 'reykjanes', nights: 0, km: 230 },
    ],
    totalKm: 700,
  },
  south_only: {
    key: 'south_only',
    nameSk: 'Juh po Jökulsárlón',
    noteSk:
      'Bez Golden Circle: vodopády, Reynisfjara, Skaftafell a ľadovcová lagúna, späť tou istou cestou s nocou pri Víku.',
    highlights: ['Seljalandsfoss', 'Skógafoss', 'Reynisfjara', 'Skaftafell', 'Jökulsárlón', 'Diamond Beach'],
    minDays: 4,
    maxDays: 6,
    // posledná noc späť na juhu, aby posledný deň nebol 6 h jazdy z Höfnu na KEF
    legs: [
      { region: 'south', nights: 1, km: 230 },
      { region: 'southeast', nights: 2, km: 200 },
      { region: 'south', nights: 1, km: 270 },
      { region: 'reykjanes', nights: 0, km: 230 },
    ],
    totalKm: 900,
  },
  golden_west: {
    key: 'golden_west',
    nameSk: 'Golden Circle + Snæfellsnes',
    noteSk: 'Západ: Golden Circle a polostrov Snæfellsnes (Kirkjufell, Arnarstapi) – menej davov než juh.',
    highlights: ['Þingvellir', 'Gullfoss', 'Kirkjufell', 'Arnarstapi', 'Djúpalónssandur', 'Reykjavík'],
    minDays: 3,
    maxDays: 5,
    legs: [
      { region: 'reykjavik', nights: 1, km: 50 },
      { region: 'golden_circle', nights: 1, km: 120 },
      { region: 'snaefellsnes', nights: 2, km: 220 },
      { region: 'reykjanes', nights: 0, km: 260 },
    ],
    totalKm: 650,
  },
  south_west: {
    key: 'south_west',
    nameSk: 'Juh + Golden Circle + Snæfellsnes',
    noteSk: 'Južné pobrežie po Vík, Golden Circle a Snæfellsnes – to najznámejšie bez celého okruhu, veľa jazdy.',
    highlights: ['Seljalandsfoss', 'Reynisfjara', 'Gullfoss', 'Þingvellir', 'Kirkjufell', 'Reykjavík'],
    minDays: 5,
    maxDays: 7,
    legs: [
      { region: 'south', nights: 2, km: 230 },
      { region: 'golden_circle', nights: 1, km: 150 },
      { region: 'snaefellsnes', nights: 2, km: 250 },
      { region: 'reykjavik', nights: 1, km: 180 },
      { region: 'reykjanes', nights: 0, km: 50 },
    ],
    totalKm: 1050,
  },
  south_east: {
    key: 'south_east',
    nameSk: 'Juh + juhovýchod (Stokksnes)',
    noteSk: 'Golden Circle, celý juh po Jökulsárlón a Stokksnes, späť tou istou cestou s nocou pri Víku.',
    highlights: ['Gullfoss', 'Skógafoss', 'Reynisfjara', 'Jökulsárlón', 'Stokksnes', 'Höfn'],
    minDays: 6,
    maxDays: 7,
    // posledná noc späť na juhu (Vík ~ 2,5 h od KEF), nie v Höfne (6 h)
    legs: [
      { region: 'reykjavik', nights: 1, km: 50 },
      { region: 'golden_circle', nights: 1, km: 120 },
      { region: 'south', nights: 1, km: 180 },
      { region: 'southeast', nights: 2, km: 300 },
      { region: 'south', nights: 1, km: 270 },
      { region: 'reykjanes', nights: 0, km: 230 },
    ],
    totalKm: 1250,
  },
  ring: {
    key: 'ring',
    nameSk: 'Ring Road',
    noteSk: 'Celý okruh v smere hodín: juh → východ → Mývatn → Akureyri → západ; 1 330 km + zachádzky.',
    highlights: ['Jökulsárlón', 'Stuðlagil', 'Dettifoss', 'Mývatn', 'Goðafoss', 'Akureyri'],
    minDays: 8,
    maxDays: 12,
    legs: [
      { region: 'golden_circle', nights: 1, km: 130 },
      { region: 'south', nights: 2, km: 180 },
      { region: 'southeast', nights: 2, km: 300 },
      { region: 'eastfjords', nights: 1, km: 260 },
      { region: 'north_myvatn', nights: 2, km: 250 },
      { region: 'akureyri', nights: 1, km: 110 },
      { region: 'north_west', nights: 1, km: 250 },
      { region: 'reykjavik', nights: 1, km: 220 },
      { region: 'reykjanes', nights: 0, km: 50 },
    ],
    totalKm: 2150,
  },
  ring_snaefellsnes: {
    key: 'ring_snaefellsnes',
    nameSk: 'Ring + Snæfellsnes',
    noteSk: 'Ring Road a navyše polostrov Snæfellsnes pred návratom do Reykjavíku.',
    highlights: ['Jökulsárlón', 'Dettifoss', 'Mývatn', 'Akureyri', 'Kirkjufell', 'Arnarstapi'],
    minDays: 10,
    maxDays: 13,
    legs: [
      { region: 'golden_circle', nights: 1, km: 130 },
      { region: 'south', nights: 2, km: 180 },
      { region: 'southeast', nights: 2, km: 300 },
      { region: 'eastfjords', nights: 1, km: 260 },
      { region: 'north_myvatn', nights: 2, km: 250 },
      { region: 'akureyri', nights: 1, km: 110 },
      { region: 'north_west', nights: 1, km: 250 },
      { region: 'snaefellsnes', nights: 1, km: 200 },
      { region: 'reykjavik', nights: 1, km: 190 },
      { region: 'reykjanes', nights: 0, km: 50 },
    ],
    totalKm: 2400,
  },
  ring_westfjords: {
    key: 'ring_westfjords',
    nameSk: 'Ring + Westfjords',
    noteSk: 'Celý ostrov vrátane Západných fjordov (Dynjandi, Látrabjarg) – len pri ≥ 13 dňoch.',
    highlights: ['Jökulsárlón', 'Mývatn', 'Dynjandi', 'Látrabjarg', 'Kirkjufell', 'Reykjavík'],
    minDays: 13,
    maxDays: 21,
    legs: [
      { region: 'golden_circle', nights: 1, km: 130 },
      { region: 'south', nights: 2, km: 180 },
      { region: 'southeast', nights: 2, km: 300 },
      { region: 'eastfjords', nights: 1, km: 260 },
      { region: 'north_myvatn', nights: 2, km: 250 },
      { region: 'akureyri', nights: 1, km: 110 },
      { region: 'north_west', nights: 1, km: 250 },
      { region: 'westfjords', nights: 2, km: 350 },
      { region: 'snaefellsnes', nights: 1, km: 300 },
      { region: 'reykjavik', nights: 1, km: 190 },
      { region: 'reykjanes', nights: 0, km: 50 },
    ],
    totalKm: 3000,
  },
};

/** Poradie na výber (od najkratšieho). */
export const PRESET_ORDER: PresetKey[] = [
  'golden_only',
  'golden_south',
  'golden_west',
  'south_only',
  'south_west',
  'south_east',
  'ring',
  'ring_snaefellsnes',
  'ring_westfjords',
];

/** Preset podľa počtu dní (docs/05 §4.1) – voľba „Auto“. */
export function presetForDays(
  days: number,
  opts: { interests?: string[]; is4x4?: boolean; pace?: Pace } = {},
): Preset {
  if (days <= 5) return PRESETS.golden_south;
  if (days <= 7) return PRESETS.south_east;
  if (days >= 13) return PRESETS.ring_westfjords;
  if (days >= 10 && opts.interests?.includes('nature')) return PRESETS.ring_snaefellsnes;
  return PRESETS.ring;
}

export const isPresetKey = (k: string | null | undefined): k is PresetKey => !!k && k in PRESETS;

/** Preset z `trip.routePreset`: ručne zvolený kľúč, inak Auto podľa dní. */
export function resolvePreset(
  routePreset: string | null | undefined,
  days: number,
  opts: { interests?: string[]; is4x4?: boolean; pace?: Pace } = {},
): Preset {
  return isPresetKey(routePreset) ? PRESETS[routePreset] : presetForDays(days, opts);
}

export type PresetRating = {
  key: PresetKey;
  /** 0–100 */
  score: number;
  /** 1–5 */
  stars: number;
  fit: 'ok' | 'too_long' | 'too_short';
  kmPerDay: number;
  /** Záujmy cesty, ktoré okruh pokrýva / nepokrýva (podľa POI v regiónoch okruhu). */
  interestsCovered: InterestKey[];
  interestsMissing: InterestKey[];
  reasonsSk: string[];
};

export type PresetPoiWeight = { regionId: string | null; interestWeight: Partial<Record<string, number>> };

/**
 * Ohodnotí okruh pre konkrétnu cestu (docs/obrazovky/krok-5 „Preset“): dni (40 b.), jazda vs. tempo (30 b.),
 * pokrytie záujmov POI v regiónoch okruhu (30 b.). Dôvody po slovensky – zobrazujú sa pod názvom okruhu.
 */
export function ratePreset(
  preset: Preset,
  ctx: { days: number; pace: Pace; interests: string[]; pois?: PresetPoiWeight[] },
): PresetRating {
  const reasons: string[] = [];
  const days = Math.max(1, ctx.days);
  let score = 0;
  let fit: PresetRating['fit'] = 'ok';
  if (days < preset.minDays) {
    const d = preset.minDays - days;
    fit = 'too_long';
    score += Math.max(0, 40 - 20 * d);
    reasons.push(`na ${days} dní príliš dlhý (min. ${preset.minDays})`);
  } else if (days > preset.maxDays) {
    const d = days - preset.maxDays;
    fit = 'too_short';
    score += Math.max(0, 40 - 10 * d);
    reasons.push(`na ${days} dní krátky – ${d} ${d === 1 ? 'deň' : d < 5 ? 'dni' : 'dní'} navyše (voľné dni / dlhšie pobyty)`);
  } else {
    score += 40;
    reasons.push(`sedí na ${days} dní`);
  }

  const kmPerDay = Math.round(preset.totalKm / days);
  const target = PACE_KM_PER_DAY[ctx.pace];
  const ratio = kmPerDay / target;
  if (ratio <= 0.8) {
    score += 30;
    reasons.push(`pohodová jazda ~${kmPerDay} km/deň`);
  } else if (ratio <= 1) {
    score += 25;
    reasons.push(`~${kmPerDay} km/deň, sedí na tempo`);
  } else if (ratio <= 1.25) {
    score += 15;
    reasons.push(`~${kmPerDay} km/deň – viac než tempo (${target})`);
  } else {
    reasons.push(`príliš veľa jazdy: ~${kmPerDay} km/deň pri tempe ${target}`);
  }

  const regions = new Set<string>(preset.legs.map((l) => l.region));
  const interests = ctx.interests.filter((i): i is InterestKey => i in INTEREST_LABELS_SK);
  const covered: InterestKey[] = [];
  const missing: InterestKey[] = [];
  if (interests.length && ctx.pois?.length) {
    for (const i of interests) {
      let inRoute = 0;
      let all = 0;
      let strong = false;
      for (const p of ctx.pois) {
        const w = p.interestWeight[i] ?? 0;
        if (!w) continue;
        all += w;
        if (p.regionId && regions.has(p.regionId)) {
          inRoute += w;
          if (w >= 3) strong = true;
        }
      }
      if (all === 0 || strong || inRoute / all >= 0.35) covered.push(i);
      else missing.push(i);
    }
    score += Math.round((30 * covered.length) / interests.length);
    if (missing.length) reasons.push(`mimo trasy: ${missing.map((m) => INTEREST_LABELS_SK[m].toLowerCase()).join(', ')}`);
    else reasons.push('pokrýva všetky záujmy');
  } else {
    score += 20;
  }

  return {
    key: preset.key,
    score: Math.min(100, score),
    stars: Math.max(1, Math.min(5, Math.round(score / 20))),
    fit,
    kmPerDay,
    interestsCovered: covered,
    interestsMissing: missing,
    reasonsSk: reasons,
  };
}

/**
 * Všetky okruhy ohodnotené pre cestu, v poradí PRESET_ORDER; `recommended` = najvyššie skóre
 * (pri zhode preset, ktorý by zvolilo Auto podľa dní, potom menej km).
 */
export function ratePresets(ctx: Parameters<typeof ratePreset>[1]): { ratings: PresetRating[]; recommended: PresetKey } {
  const ratings = PRESET_ORDER.map((k) => ratePreset(PRESETS[k], ctx));
  const auto = presetForDays(ctx.days, { interests: ctx.interests, pace: ctx.pace }).key;
  const best = [...ratings].sort(
    (a, b) =>
      b.score - a.score ||
      Number(b.key === auto) - Number(a.key === auto) ||
      PRESETS[a.key].totalKm - PRESETS[b.key].totalKm,
  )[0];
  return { ratings, recommended: best.key };
}

/**
 * Rozdelí N nocí na regióny presetu úmerne typickým nociam (najprv každý región s nights > 0 aspoň 1 noc,
 * potom zvyšok podľa váh; pri nedostatku nocí sa vynechávajú regióny s najnižšou váhou od konca).
 */
export function allocateNights(
  preset: Preset,
  nights: number,
  opts: { lateArrival?: boolean; earlyDeparture?: boolean } = {},
): RegionId[] {
  const out: RegionId[] = [];
  let remaining = nights;
  if (opts.lateArrival && remaining > 0) {
    out.push('reykjanes');
    remaining--;
  }
  const lastFixed: RegionId | null = opts.earlyDeparture && remaining > 0 ? 'reykjanes' : null;
  if (lastFixed) remaining--;

  const legs = preset.legs.filter((l) => l.nights > 0);
  const weight = legs.reduce((a, l) => a + l.nights, 0);
  const alloc = legs.map((l) => ({ region: l.region, n: remaining >= legs.length ? 1 : 0, w: l.nights }));
  let left = remaining - alloc.reduce((a, x) => a + x.n, 0);
  if (remaining < legs.length) {
    // málo nocí: vyber regióny s najvyššou váhou v poradí trasy
    const chosen = [...legs]
      .map((l, i) => ({ i, w: l.nights }))
      .sort((a, b) => b.w - a.w || a.i - b.i)
      .slice(0, remaining)
      .map((x) => x.i)
      .sort((a, b) => a - b);
    for (const i of chosen) alloc[i].n = 1;
    left = 0;
  }
  // zvyšok podľa váh (largest remainder)
  if (left > 0) {
    const shares = alloc.map((a) => (a.w / weight) * left);
    const floors = shares.map(Math.floor);
    let rest = left - floors.reduce((a, b) => a + b, 0);
    const order = shares.map((s, i) => ({ i, r: s - floors[i] })).sort((a, b) => b.r - a.r);
    floors.forEach((f, i) => (alloc[i].n += f));
    for (const o of order) {
      if (rest <= 0) break;
      alloc[o.i].n++;
      rest--;
    }
  }
  for (const a of alloc) for (let k = 0; k < a.n; k++) out.push(a.region);
  if (lastFixed) out.push(lastFixed);
  return out;
}

/** Odhad km/deň podľa tempa (docs/05 §4.3). */
export const PACE_KM_PER_DAY: Record<Pace, number> = { relaxed: 200, normal: 300, intense: 400 };
export const PACE_DRIVE_MIN_PER_DAY: Record<Pace, number> = { relaxed: 180, normal: 270, intense: 360 };

/**
 * Seed rozpätia izieb per región × typ – 4 dospelí / noc, €, základ = september (docs/07, overené 09/2026 podľa
 * Booking/Airbnb: penzión = 2 dvojlôžkové izby, Airbnb = celý byt/chata pre 4, hostel = 4 lôžka, hotel = 2 izby).
 * Mesiac škáluje `LODGING_SEASON_FACTOR`.
 */
export const LODGING_RANGE: Record<string, Partial<Record<LodgingKind, [number, number]>>> = {
  reykjavik: { airbnb: [270, 400], guesthouse: [300, 440], hostel: [190, 260], hotel: [420, 600] },
  reykjanes: { airbnb: [250, 370], guesthouse: [280, 410], hostel: [180, 240], hotel: [380, 540] },
  golden_circle: { airbnb: [240, 360], guesthouse: [280, 410], hostel: [170, 240], hotel: [380, 540] },
  south: { airbnb: [250, 380], guesthouse: [290, 430], hostel: [180, 250], hotel: [400, 570] },
  southeast: { airbnb: [270, 400], guesthouse: [310, 460], hostel: [190, 260], hotel: [430, 620] },
  eastfjords: { airbnb: [220, 330], guesthouse: [260, 380], hostel: [160, 220], hotel: [340, 490] },
  north_myvatn: { airbnb: [250, 370], guesthouse: [290, 420], hostel: [170, 240], hotel: [390, 560] },
  akureyri: { airbnb: [230, 340], guesthouse: [270, 390], hostel: [160, 230], hotel: [360, 510] },
  north_west: { airbnb: [220, 330], guesthouse: [260, 380], hostel: [160, 220], hotel: [340, 490] },
  snaefellsnes: { airbnb: [240, 350], guesthouse: [280, 400], hostel: [160, 230], hotel: [370, 520] },
  westfjords: { airbnb: [220, 320], guesthouse: [250, 370], hostel: [150, 210], hotel: [330, 470] },
  highlands: { hostel: [240, 320], guesthouse: [300, 440] },
};

/**
 * Sezónny faktor ceny izieb podľa mesiaca (1 = september; docs/07 rad „Ceny ubytovania“: júl–august vrchol,
 * november–február najlacnejšie, okolo Vianoc a Silvestra opäť drahšie).
 */
export const LODGING_SEASON_FACTOR: Record<number, number> = {
  1: 0.75,
  2: 0.75,
  3: 0.85,
  4: 0.85,
  5: 0.95,
  6: 1.15,
  7: 1.3,
  8: 1.3,
  9: 1,
  10: 0.85,
  11: 0.75,
  12: 0.85,
};
export const lodgingSeasonFactor = (date: string | null | undefined): number => {
  const m = date ? Number(date.slice(5, 7)) : 9;
  return LODGING_SEASON_FACTOR[m] ?? 1;
};

/** Kemp seed: ISK/os./noc + elektrina (docs/07). */
export const CAMPSITE_SEED: Record<string, { perPerson: number; electricity: number; campingCard: boolean }> =
  {
    reykjavik: { perPerson: 3600, electricity: 1500, campingCard: false },
    reykjanes: { perPerson: 2800, electricity: 1300, campingCard: false },
    golden_circle: { perPerson: 2400, electricity: 1100, campingCard: false },
    south: { perPerson: 2800, electricity: 1300, campingCard: false },
    southeast: { perPerson: 2600, electricity: 1400, campingCard: true },
    eastfjords: { perPerson: 2500, electricity: 1200, campingCard: true },
    north_myvatn: { perPerson: 2800, electricity: 1300, campingCard: false },
    akureyri: { perPerson: 2500, electricity: 1300, campingCard: true },
    north_west: { perPerson: 2300, electricity: 1100, campingCard: true },
    snaefellsnes: { perPerson: 2400, electricity: 1100, campingCard: true },
    westfjords: { perPerson: 2300, electricity: 1100, campingCard: true },
    highlands: { perPerson: 2800, electricity: 0, campingCard: false },
  };
export const CAMPING_TAX_ISK = 333;
export const CAMPING_CARD_EUR = 199;
export const CAMPING_CARD_ADULTS = 2;

/** Predvolené vozidlá pre odhad vetiev (docs/07) – €/deň, l/100 km. */
export const VEHICLE_DEFAULTS: Record<
  VehicleClass,
  { perDay: number; consumption: number; fuel: 'petrol' | 'diesel'; kind: 'car' | 'camper' }
> = {
  economy: { perDay: 55, consumption: 6.0, fuel: 'petrol', kind: 'car' },
  estate: { perDay: 70, consumption: 6.5, fuel: 'petrol', kind: 'car' },
  suv2wd: { perDay: 85, consumption: 7.5, fuel: 'petrol', kind: 'car' },
  '4x4': { perDay: 110, consumption: 7.0, fuel: 'diesel', kind: 'car' },
  camper2: { perDay: 150, consumption: 8.5, fuel: 'diesel', kind: 'camper' },
  camper4: { perDay: 210, consumption: 9.0, fuel: 'diesel', kind: 'camper' },
  camper4x4: { perDay: 260, consumption: 10.0, fuel: 'diesel', kind: 'camper' },
};

export const FUEL_SEED_ISK = { petrol: 320, diesel: 315 };
export const TUNNEL_VADLAHEIDI_ISK = 1990;
