import type { LodgingKind } from '@/engine/types';

export type CampOffer = {
  source: 'tjalda' | 'seed';
  ref: string;
  name: string;
  lat: number;
  lng: number;
  perPersonIsk: number;
  electricityIsk: number;
  openUntil: string | null; // YYYY-MM-DD (odvodené zo sezóny pre rok noci) alebo null = celoročne
  openForNight: boolean;
  campingCard: boolean;
  hasKitchen: boolean;
  showers: boolean;
  url: string | null;
  distanceKm: number;
};

export type NightLite = {
  stayId: string;
  nightIndex: number;
  date: string;
  dow: string;
  regionId: string | null;
  regionName: string;
  place: string;
  kind: LodgingKind;
  assigned: { name: string; url: string | null; kind: LodgingKind; source: string; checkInUntil: string | null; openUntil: string | null } | null;
  noLodging: boolean;
  hasKitchen: boolean;
  amount: number;
  min: number;
  max: number;
  source: 'api' | 'seed' | 'manual' | 'estimate';
  isEstimate: boolean;
  campingCardApplied: boolean;
  warnings: string[];
  bookingUrl: string;
  airbnbUrl: string;
  camps: CampOffer[];
};

export type Step04Data = {
  tripId: string;
  mode: 'car' | 'camper';
  pax: number;
  nights: NightLite[];
  total: number;
  totalMin: number;
  totalMax: number;
  estimateShare: number;
  kitchenNights: number;
  dates: string | null;
  vehicleLabel: string | null;
  presetKey: string | null;
  campingCard: { on: boolean; cards: number; cost: number; saving: number; worthIt: boolean; expired: boolean } | null;
  tjaldaOk: boolean;
  canEdit: boolean;
};
