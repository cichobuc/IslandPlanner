import { round2 } from './money';
import type { Split } from './types';

/**
 * Delenie položky medzi členov (docs/05 1d).
 * person: amounts per člen (už rozpočítané); group/vehicle: rovným dielom; custom: podiely (súčet = 1 alebo 100).
 */
export function splitAmount(
  amount: number,
  split: Split,
  memberIds: string[],
  opts: { perPerson?: Record<string, number>; customShares?: Record<string, number> | null } = {},
): Record<string, number> {
  const out: Record<string, number> = {};
  if (memberIds.length === 0) return out;
  if (split === 'person') {
    for (const id of memberIds) out[id] = round2(opts.perPerson?.[id] ?? 0);
    return out;
  }
  if (split === 'custom' && opts.customShares && Object.keys(opts.customShares).length) {
    const total = Object.values(opts.customShares).reduce((a, b) => a + b, 0) || 1;
    for (const id of memberIds) out[id] = round2((amount * (opts.customShares[id] ?? 0)) / total);
    return out;
  }
  // group / vehicle: rovným dielom, zvyšok centov prvému
  const base = Math.floor((amount * 100) / memberIds.length) / 100;
  let rest = round2(amount - base * memberIds.length);
  for (const id of memberIds) {
    out[id] = round2(base + (rest > 0 ? 0.01 : 0));
    if (rest > 0) rest = round2(rest - 0.01);
  }
  return out;
}

/** Cesta na letisko: 1 auto pre ≤ 4 os. a ≤ 4 kufre, inak viac áut vs. bus. */
export function airportVehicles(pax: number, checkedBags: number, seatsPerCar = 4, bagsPerCar = 4): number {
  return Math.max(1, Math.ceil(Math.max(pax / seatsPerCar, checkedBags / bagsPerCar)));
}

export function airportAccessCost(input: {
  pax: number;
  checkedBags: number;
  km: number; // jedna cesta
  consumptionL100km: number;
  fuelPriceEur: number;
  vignettes: number; // € spolu
  busTicketPp?: number | null;
}): { mode: 'car' | 'bus'; vehicles: number; total: number } {
  const vehicles = airportVehicles(input.pax, input.checkedBags);
  const carTotal = round2(
    vehicles * ((input.km * 2 * input.consumptionL100km) / 100) * input.fuelPriceEur +
      input.vignettes * vehicles,
  );
  if (vehicles > 1 && input.busTicketPp) {
    const bus = round2(input.busTicketPp * 2 * input.pax);
    if (bus < carTotal) return { mode: 'bus', vehicles: 0, total: bus };
  }
  return { mode: 'car', vehicles, total: carTotal };
}
