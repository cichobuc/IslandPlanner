/** Základné typy zdieľané enginom, DB schémou a UI (docs/03, docs/05). */

export type MoneySource = 'api' | 'seed' | 'manual' | 'estimate';

/** Každá cena má pôvod (docs/02, zásada 3). */
export type Money = {
  amount: number;
  currency: string; // ISO 4217, predvolene EUR
  source: MoneySource;
  fetchedAt?: string; // ISO timestamp
  provider?: string; // connector id
};

export type ScenarioKey = 'car' | 'camper' | 'no_car' | 'drive';
export type TransportMode = 'car' | 'camper' | 'no_car';
export type Pace = 'relaxed' | 'normal' | 'intense';
export type Comfort = 'camp' | 'hostel' | 'guesthouse' | 'hotel';
export type FoodLevel = 'budget' | 'mid' | 'comfort';
export type BagType = 'cabin_small' | 'cabin_10' | 'checked_20' | 'checked_32' | 'priority';

export type Bags = { cabinSmall: number; cabin10: number; checked20: number; checked32: number };

export type DriverLicence = { has: boolean; since?: string; categories?: string[]; willingToDrive?: boolean };
export type DroneProfile = { has: boolean; weightG?: number; operatorId?: string; insurance?: boolean };
export type InterestScores = Partial<
  Record<
    'thermal' | 'glacier' | 'puffin' | 'whale' | 'aurora' | 'hike' | 'lava' | 'culture' | 'photo' | 'drone',
    0 | 1 | 2 | 3
  >
>;
export type Availability = { months?: number[]; blocked?: string[]; minDays?: number; maxDays?: number };
export type TravelDocs = {
  idValidUntil?: string;
  ehic?: boolean;
  insurance?: boolean;
  droneOperatorId?: string;
};

export type FlightLeg = {
  airline: string;
  flightNo?: string;
  from: string;
  to: string;
  dep: string;
  arr: string;
};

export type PriceRuleTier = { days: number; price: number } | { extraDayPrice: number } | { perDay: number };

export type CustomFoodPrices = Partial<
  Record<
    | 'breakfastSelf'
    | 'breakfastOut'
    | 'lunchSelf'
    | 'lunchOut'
    | 'dinnerSelf'
    | 'dinnerOut'
    | 'coffee'
    | 'snack'
    | 'alcoholPerDay',
    number
  >
>;
