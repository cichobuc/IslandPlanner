import type { LodgingKind, Pace, VehicleClass } from './types';

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

export type PresetKey = 'golden_south' | 'south_east' | 'ring' | 'ring_snaefellsnes' | 'ring_westfjords';

export type Preset = {
  key: PresetKey;
  minDays: number;
  maxDays: number;
  /** Regióny v poradí; noci = typické noci v regióne (váha pri rozdeľovaní) */
  legs: { region: RegionId; nights: number; km: number }[];
  totalKm: number;
};

// km = jazda do regiónu z predchádzajúceho (vrátane zachádzok), posledný úsek späť na KEF
export const PRESETS: Record<PresetKey, Preset> = {
  golden_south: {
    key: 'golden_south',
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
  south_east: {
    key: 'south_east',
    minDays: 6,
    maxDays: 7,
    legs: [
      { region: 'reykjavik', nights: 1, km: 50 },
      { region: 'golden_circle', nights: 1, km: 120 },
      { region: 'south', nights: 2, km: 180 },
      { region: 'southeast', nights: 2, km: 300 },
      { region: 'reykjanes', nights: 0, km: 500 },
    ],
    totalKm: 1250,
  },
  ring: {
    key: 'ring',
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

/** Preset podľa počtu dní (docs/05 §4.1). */
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

/** Seed rozpätia izieb per región × typ, 4 os./noc, € (docs/07). */
export const LODGING_RANGE: Record<string, Partial<Record<LodgingKind, [number, number]>>> = {
  reykjavik: { airbnb: [180, 260], guesthouse: [200, 280], hostel: [120, 160], hotel: [240, 340] },
  reykjanes: { airbnb: [180, 260], guesthouse: [200, 280], hostel: [120, 160], hotel: [240, 340] },
  golden_circle: { airbnb: [160, 240], guesthouse: [180, 260], hostel: [100, 150], hotel: [220, 320] },
  south: { airbnb: [160, 240], guesthouse: [180, 260], hostel: [100, 150], hotel: [220, 320] },
  southeast: { airbnb: [170, 250], guesthouse: [190, 270], hostel: [110, 150], hotel: [240, 330] },
  eastfjords: { airbnb: [150, 220], guesthouse: [170, 240], hostel: [100, 140], hotel: [210, 300] },
  north_myvatn: { airbnb: [150, 220], guesthouse: [170, 250], hostel: [100, 140], hotel: [220, 310] },
  akureyri: { airbnb: [150, 220], guesthouse: [170, 250], hostel: [100, 140], hotel: [220, 310] },
  north_west: { airbnb: [160, 230], guesthouse: [180, 250], hostel: [100, 140], hotel: [220, 310] },
  snaefellsnes: { airbnb: [160, 230], guesthouse: [180, 250], hostel: [100, 140], hotel: [220, 310] },
  westfjords: { airbnb: [150, 220], guesthouse: [170, 240], hostel: [90, 130], hotel: [200, 290] },
  highlands: { hostel: [100, 160], guesthouse: [180, 260] },
};

/** Kemp seed: ISK/os./noc + elektrina (docs/07). */
export const CAMPSITE_SEED: Record<string, { perPerson: number; electricity: number; campingCard: boolean }> =
  {
    reykjavik: { perPerson: 3200, electricity: 1300, campingCard: false },
    reykjanes: { perPerson: 2500, electricity: 1200, campingCard: false },
    golden_circle: { perPerson: 2000, electricity: 0, campingCard: false },
    south: { perPerson: 2500, electricity: 1200, campingCard: false },
    southeast: { perPerson: 2300, electricity: 1300, campingCard: true },
    eastfjords: { perPerson: 2200, electricity: 1000, campingCard: true },
    north_myvatn: { perPerson: 2500, electricity: 1200, campingCard: false },
    akureyri: { perPerson: 2200, electricity: 1200, campingCard: true },
    north_west: { perPerson: 2000, electricity: 1000, campingCard: true },
    snaefellsnes: { perPerson: 2000, electricity: 1000, campingCard: true },
    westfjords: { perPerson: 2000, electricity: 1000, campingCard: true },
    highlands: { perPerson: 2500, electricity: 0, campingCard: false },
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
