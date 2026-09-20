import { confidenceOf, mergeSource, round2, toEur, type Fx } from './money';
import { TUNNEL_VADLAHEIDI_ISK } from './presets';
import type { Confidence, MoneySource, VehicleInput } from './types';

export type TransportCost = {
  rental: number;
  insurance: number;
  extras: number;
  oneWay: number;
  fuel: number;
  tolls: number;
  total: number;
  liters: number;
  source: MoneySource;
  confidence: Confidence;
  deposit: number;
};

/** Doprava na Islande (docs/05 §6): prenájom + poistenia + extras + palivo ×1,05 + tunel. */
export function transportCost(
  v: VehicleInput,
  ctx: {
    totalKm: number;
    fuelIskPerL: { petrol: number; diesel: number };
    fx: Fx;
    viaVadlaheidi?: boolean;
    tollCrossings?: number;
  },
): TransportCost {
  const days = Math.max(1, v.days);
  const rental = round2(toEur(v.pricePerDay, ctx.fx) * days);
  let insurance = 0;
  for (const key of v.insuranceChosen ?? []) {
    const ins = v.insurance?.[key];
    if (ins && !ins.included) insurance += ins.perDay * days;
  }
  let extras = 0;
  for (const [key, qty] of Object.entries(v.extrasChosen ?? {})) {
    const e = v.extras?.[key];
    if (!e) continue;
    extras += (e.perDay ?? 0) * days * qty + (e.flat ?? 0) * qty;
  }
  const oneWay = v.oneWayFee ? toEur(v.oneWayFee, ctx.fx) : 0;
  const consumption = v.consumptionOverride ?? v.consumptionL100km;
  const liters = round2((ctx.totalKm / 100) * consumption * 1.05);
  const iskPerL = v.fuelPriceOverride ?? ctx.fuelIskPerL[v.fuel];
  const fuel = round2(liters * iskPerL * ctx.fx.ISK_EUR);
  const crossings = ctx.tollCrossings ?? (ctx.viaVadlaheidi ? 1 : 0);
  const tolls = round2(crossings * TUNNEL_VADLAHEIDI_ISK * ctx.fx.ISK_EUR);
  const source = mergeSource(v.pricePerDay.source, 'seed');
  return {
    rental,
    insurance: round2(insurance),
    extras: round2(extras),
    oneWay,
    fuel,
    tolls,
    liters,
    total: round2(rental + insurance + extras + oneWay + fuel + tolls),
    source,
    confidence: v.pricePerDay.source === 'manual' ? 'exact' : confidenceOf(source),
    deposit: v.deposit ? toEur(v.deposit, ctx.fx) : 0,
  };
}

export type VehicleCheck = {
  code: 'seats' | 'luggage' | 'sleeps' | 'driver_age' | 'driver_years' | 'credit_card';
  message: string;
};

/** Kapacita a požiadavky požičovne (docs/05 1c, krok 03). */
export function vehicleChecks(
  v: Pick<VehicleInput, 'kind' | 'seats' | 'sleeps' | 'luggageCapacity'>,
  ctx: {
    pax: number;
    checkedBags: number;
    drivers: { age: number; years: number; hasCreditCard: boolean }[];
    driverMinAge?: number;
    driverMinYears?: number;
  },
): VehicleCheck[] {
  const out: VehicleCheck[] = [];
  if (v.seats != null && v.seats < ctx.pax)
    out.push({ code: 'seats', message: `Vozidlo má ${v.seats} miest, cestuje ${ctx.pax}.` });
  if (v.luggageCapacity != null && v.luggageCapacity < ctx.checkedBags)
    out.push({ code: 'luggage', message: `Zmestí sa ${v.luggageCapacity} kufrov, máte ${ctx.checkedBags}.` });
  if (v.kind === 'camper' && v.sleeps != null && v.sleeps < ctx.pax)
    out.push({ code: 'sleeps', message: `Karavan má ${v.sleeps} lôžka, cestuje ${ctx.pax}.` });
  const minAge = ctx.driverMinAge ?? 20;
  const minYears = ctx.driverMinYears ?? 1;
  const eligible = ctx.drivers.filter((d) => d.age >= minAge && d.years >= minYears);
  if (ctx.drivers.length && eligible.length === 0) {
    if (ctx.drivers.every((d) => d.age < minAge))
      out.push({ code: 'driver_age', message: `Žiadny vodič nemá ${minAge}+ rokov.` });
    else out.push({ code: 'driver_years', message: `Žiadny vodič nemá ${minYears}+ rokov praxe.` });
  }
  if (ctx.drivers.length && !ctx.drivers.some((d) => d.hasCreditCard))
    out.push({ code: 'credit_card', message: 'Nikto z vodičov nemá kreditnú kartu na depozit.' });
  return out;
}
