import type { VehicleCheck } from '@/engine/transport';
import type { FuelType, TransportMode, VehicleClass } from '@/engine/types';

export type VehicleLite = {
  id: string;
  kind: 'car' | 'camper';
  class: VehicleClass;
  provider: string;
  name: string;
  seats: number;
  sleeps: number;
  fuel: FuelType;
  consumption: number;
  pricePerDay: number;
  source: 'api' | 'seed' | 'manual' | 'estimate';
  insurance: Record<string, { perDay: number; included?: boolean; note?: string }>;
  extras: Record<string, { perDay?: number; flat?: number; note?: string }>;
  deposit: number;
  driverMinAge: number;
  driverMinYears: number;
  kmLimitPerDay: number | null;
  heater: boolean;
  luggageCapacity: number;
  fRoadsAllowed: boolean;
  url: string | null;
  notes: string | null;
  verifiedAt: string | null;
  /** vypočítané pre dni prenájmu a zvolené poistenia/extras (pre nezvolené = predvolené) */
  cost: {
    rental: number;
    insurance: number;
    extras: number;
    fuel: number;
    tolls: number;
    total: number;
    liters: number;
    deposit: number;
  };
  checks: VehicleCheck[];
};

export type VehicleSel = {
  vehicleOptionId: string | null;
  days: number;
  insuranceChosen: string[];
  extrasChosen: Record<string, number>;
  consumptionOverride: number | null;
  fuelPriceOverride: number | null;
};

export type BranchCard = {
  mode: TransportMode;
  total: number;
  min: number;
  max: number;
  perPerson: number;
  vehicle: number;
  fuel: number;
  lodging: number;
  food: number;
  tours: number;
};

export type Step03Data = {
  tripId: string;
  mode: TransportMode | null;
  pax: number;
  days: number;
  km: number;
  kmSource: 'itinerary' | 'preset';
  presetKey: string;
  flightTotal: number;
  pickup: string | null;
  ret: string | null;
  dates: string | null;
  drivers: { name: string; age: number; years: number; hasCreditCard: boolean }[];
  branches: BranchCard[];
  vehicles: VehicleLite[];
  selection: Partial<Record<'car' | 'camper', VehicleSel>>;
  rates: { fx: number; fxSource: string; petrol: number; diesel: number; fuelSource: string };
  viaVadlaheidi: boolean;
  canEdit: boolean;
};
