import { airportAccessCost } from '@/engine/split';
import { parkingFromRules } from '@/engine/flightCombos';
import type { PriceRuleTier } from '@/engine/types';

/** Diaľničné známky na cestu z BA (€, spolu tam aj späť, 1 auto) – seed 09/2026. */
export const VIGNETTES: Record<string, number> = { BTS: 0, VIE: 12.4, BUD: 20, PRG: 14, KTW: 22 };
/** Bus z BA na letisko, €/os. jedna cesta (RegioJet/FlixBus, seed). */
export const BUS_PP: Record<string, number> = { PRG: 18, BUD: 9, VIE: 8 };
export const FUEL_EUR_PER_L = 1.6;
/** Letiská s priamym letom do KEF (Wizz, sezónne) – ostatné len cez hub. */
export const DIRECT_TO_KEF: Record<string, string> = { KTW: 'priamy Wizz (ut/št/so/ne)', BUD: 'priamy Wizz' };
export const VIGNETTE_COUNTRY: Record<string, string> = { VIE: 'AT', BUD: 'HU', PRG: 'CZ', KTW: 'PL + CZ' };

export type AirportFacts = {
  iata: string;
  km: number;
  min: number;
  vehicles: number;
  mode: 'car' | 'bus';
  access: number;
  parking: number | null;
  parkingDays: number;
  total: number;
  perPerson: number;
  direct: string | null;
  vignette: string | null;
};

/** Fakty do riadku letiska v kroku 01: cesta z domu (1 auto pre ≤ 4), parkovanie na N dní, spolu a na osobu. */
export function airportFacts(input: {
  iata: string;
  km: number | null;
  min: number | null;
  pax: number;
  checkedBags: number;
  days: number;
  parkingLists: PriceRuleTier[][];
}): AirportFacts {
  const km = input.km ?? 100;
  const access = airportAccessCost({
    pax: input.pax,
    checkedBags: input.checkedBags,
    km,
    consumptionL100km: 6.5,
    fuelPriceEur: FUEL_EUR_PER_L,
    vignettes: VIGNETTES[input.iata] ?? 0,
    busTicketPp: BUS_PP[input.iata] ?? null,
  });
  const parkingDays = input.days + 1;
  const parking =
    access.mode === 'car' && input.parkingLists.length
      ? Math.min(...input.parkingLists.map((r) => parkingFromRules(r, parkingDays))) * access.vehicles
      : null;
  const total = Math.round((access.total + (parking ?? 0)) * 100) / 100;
  return {
    iata: input.iata,
    km,
    min: input.min ?? Math.round(km / 1.2),
    vehicles: access.vehicles,
    mode: access.mode,
    access: access.total,
    parking,
    parkingDays,
    total,
    perPerson: Math.round((total / Math.max(1, input.pax)) * 100) / 100,
    direct: DIRECT_TO_KEF[input.iata] ?? null,
    vignette: VIGNETTE_COUNTRY[input.iata] ?? null,
  };
}
