import { foodTotal, type FoodDayInput } from './food';
import { lodgingEstimate } from './lodging';
import { round2 } from './money';
import { CAMPSITE_SEED, CAMPING_TAX_ISK, VEHICLE_DEFAULTS, resolvePreset, allocateNights } from './presets';
import type { FoodInput, LodgingKind, Pace, TransportMode, VehicleClass } from './types';

export type BranchEstimate = {
  mode: TransportMode;
  vehicleClass: VehicleClass | null;
  days: number;
  nights: number;
  km: number;
  vehicle: number;
  fuel: number;
  lodging: { min: number; max: number; mid: number };
  food: number;
  tours: number;
  total: { min: number; max: number; mid: number };
  perPerson: number;
  step4Kind: 'lodging' | 'campsites' | 'base';
  step5Kind: 'itinerary' | 'tours';
};

export type BranchEstimateInput = {
  days: number;
  pax: number;
  pace: Pace;
  interests: string[];
  /** ručne zvolený okruh z kroku 04 (inak Auto podľa dní) */
  routePreset?: string | null;
  fx: { ISK_EUR: number };
  fuelIskPerL: { petrol: number; diesel: number };
  food: FoodInput;
  /** komfort skupiny → typ izby pre vetvu Auto */
  lodgingKind?: LodgingKind;
  vehicleClass?: Partial<Record<'car' | 'camper', VehicleClass>>;
  /** Bez auta: odhad výletov na osobu za deň (seed) */
  tourPpPerDay?: number;
  hotelKind?: LodgingKind;
};

export const stepKinds = (mode: TransportMode) =>
  mode === 'no_car'
    ? { step4Kind: 'base' as const, step5Kind: 'tours' as const }
    : {
        step4Kind: mode === 'camper' ? ('campsites' as const) : ('lodging' as const),
        step5Kind: 'itinerary' as const,
      };

/** Odhad vetvy pre rozhodovací riadok kroku 03 (docs/05 2b). */
export function estimateBranch(mode: TransportMode, input: BranchEstimateInput): BranchEstimate {
  const days = Math.max(1, input.days);
  const nights = Math.max(0, days - 1);
  const preset = resolvePreset(input.routePreset, days, { interests: input.interests, pace: input.pace });
  const regions = allocateNights(preset, nights);
  const kinds = stepKinds(mode);

  const cls: VehicleClass | null =
    mode === 'no_car'
      ? null
      : (input.vehicleClass?.[mode] ??
        (mode === 'camper' ? (input.pax > 2 ? 'camper4' : 'camper2') : 'estate'));
  const km = mode === 'no_car' ? 0 : preset.totalKm;
  let vehicle = 0;
  let fuel = 0;
  if (cls) {
    const v = VEHICLE_DEFAULTS[cls];
    vehicle = round2(v.perDay * days);
    fuel = round2((km / 100) * v.consumption * 1.05 * input.fuelIskPerL[v.fuel] * input.fx.ISK_EUR);
  }

  let lmin = 0;
  let lmax = 0;
  if (mode === 'camper') {
    for (const r of regions) {
      const s = CAMPSITE_SEED[r] ?? CAMPSITE_SEED.south;
      const night =
        (s.perPerson * input.pax + s.electricity + CAMPING_TAX_ISK * input.pax) * input.fx.ISK_EUR;
      lmin += night * 0.9;
      lmax += night * 1.1;
    }
  } else if (mode === 'car') {
    const kind = input.lodgingKind ?? 'guesthouse';
    for (const r of regions) {
      const e = lodgingEstimate(r, kind, input.pax) ?? { min: 0, max: 0 };
      lmin += e.min;
      lmax += e.max;
    }
  } else {
    // základňa v Reykjavíku
    const kind = input.hotelKind ?? input.lodgingKind ?? 'guesthouse';
    const e = lodgingEstimate('reykjavik', kind, input.pax) ?? { min: 0, max: 0 };
    lmin = e.min * nights;
    lmax = e.max * nights;
  }
  const lodging = { min: round2(lmin), max: round2(lmax), mid: round2((lmin + lmax) / 2) };

  const kitchen = mode === 'camper' || (mode === 'car' && (input.lodgingKind ?? 'guesthouse') !== 'hotel');
  const foodDays: FoodDayInput[] = Array.from({ length: days }, (_, i) => ({
    date: `d${i + 1}`,
    kitchenMorning: kitchen,
    kitchenEvening: kitchen,
    part: i === 0 ? 'from_lunch' : i === days - 1 ? 'until_lunch' : 'full',
  }));
  const food = foodTotal(foodDays, input.food, input.pax).total;

  const tours =
    mode === 'no_car' ? round2((input.tourPpPerDay ?? 95) * input.pax * Math.max(0, days - 2)) : 0;

  const fixed = vehicle + fuel + food + tours;
  const total = {
    min: round2(fixed + lodging.min),
    max: round2(fixed + lodging.max),
    mid: round2(fixed + lodging.mid),
  };
  return {
    mode,
    vehicleClass: cls,
    days,
    nights,
    km,
    vehicle,
    fuel,
    lodging,
    food,
    tours,
    total,
    perPerson: round2(total.mid / input.pax),
    ...kinds,
  };
}
