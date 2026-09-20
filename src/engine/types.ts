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

export type WillingToDrive = 'yes' | 'no' | 'emergency';
export type DriverLicence = {
  has: boolean;
  sinceYear?: number;
  categories?: string[];
  willingToDrive?: WillingToDrive;
};
export type DroneProfile = {
  has: boolean;
  model?: string;
  weightG?: number;
  operatorId?: string;
  insurance?: boolean;
};
export const INTEREST_KEYS = [
  'thermal',
  'glacier',
  'puffin',
  'whale',
  'aurora',
  'hike',
  'lava',
  'culture',
  'photo',
  'drone',
] as const;
export type InterestKey = (typeof INTEREST_KEYS)[number];
export const INTEREST_LABELS_SK: Record<InterestKey, string> = {
  thermal: 'Termály',
  glacier: 'Ľadovce',
  puffin: 'Puffiny',
  whale: 'Veľryby',
  aurora: 'Polárna žiara',
  hike: 'Túry',
  lava: 'Láva',
  culture: 'Kultúra',
  photo: 'Foto',
  drone: 'Dron',
};
/** 0 = nie, 1 = rád, 2 = chcem, 3 = kvôli tomu idem */
export type InterestScore = 0 | 1 | 2 | 3;
export type InterestScores = Partial<Record<InterestKey, InterestScore>>;

export const ORIGIN_AIRPORTS = ['BTS', 'VIE', 'BUD', 'PRG', 'KTW'] as const;
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

// ---------------------------------------------------------------------------
// Vstup enginu – TripSnapshot (docs/03, docs/05). Čisté dáta, nezávislé od DB.
// ---------------------------------------------------------------------------

export type LodgingKind = 'airbnb' | 'hotel' | 'guesthouse' | 'hostel' | 'campsite' | 'camper_site';
export type VehicleKind = 'car' | 'camper';
export type VehicleClass = 'economy' | 'estate' | 'suv2wd' | '4x4' | 'camper2' | 'camper4' | 'camper4x4';
export type FuelType = 'petrol' | 'diesel';
export type Split = 'group' | 'vehicle' | 'person' | 'custom';
export type PricePer = 'person' | 'vehicle' | 'group';

export type TravelerInput = {
  id: string;
  name: string;
  birthDate?: string | null; // YYYY-MM-DD
  ageFallback?: number | null;
  isDriver?: boolean;
  bags?: Bags;
  hasCreditCard?: boolean;
};

export type PriceRule = {
  label: string;
  minAge?: number | null;
  maxAge?: number | null;
  price: Money;
  per: PricePer;
  variant?: string | null;
  isDefault?: boolean | null;
};

export type PoiInput = {
  id: string;
  slug: string;
  name: string;
  regionId?: string | null;
  visitMin?: number | null;
  parkingFee?: Money | null;
  priceRules: PriceRule[];
  requires4x4?: boolean | null;
  season?: { from: string; to: string } | null; // MM-DD
  bookAheadDays?: number | null;
};

export type StopInput = {
  id: string;
  poi?: PoiInput | null;
  customLabel?: string | null;
  stayMin?: number | null;
  skip?: boolean;
  must?: boolean;
  isManual?: boolean;
  entryOverride?: Money | null;
  variant?: string | null;
};

export type DayInput = {
  id: string;
  dayIndex: number; // 1..N
  date: string; // YYYY-MM-DD
  overnightRegionId?: string | null;
  driveKm?: number | null;
  driveMin?: number | null;
  driveMinReal?: number | null;
  locked?: boolean;
  stops: StopInput[];
};

export type FlightSelectionInput = {
  origin: string;
  dest?: string;
  outDepAt: string; // ISO s offsetom, napr. 2027-09-12T06:40:00+02:00
  outArrAt: string;
  retDepAt: string;
  retArrAt: string;
  farePp: Money;
  bagsTotal?: Money | null;
  bagsPerTraveler?: Record<string, Money> | null;
  parkingTotal?: Money | null;
  airportAccessTotal?: Money | null;
  hubNightTotal?: Money | null;
  isEstimate?: boolean;
};

export type LodgingStayInput = {
  id: string;
  scenarioKey: ScenarioKey;
  nightIndex: number; // 1..nights
  nightDate: string;
  regionId?: string | null;
  kind: LodgingKind;
  pricePerNight?: Money | null; // z vybranej ponuky
  priceOverride?: Money | null;
  priceRangeMin?: Money | null;
  priceRangeMax?: Money | null;
  cleaningFee?: Money | null;
  serviceFeePct?: number | null;
  cityTaxPp?: Money | null;
  perPersonNight?: Money | null; // kempy
  electricity?: Money | null; // kempy
  inCampingCardNetwork?: boolean | null;
  hasKitchen?: boolean | null;
  isManual?: boolean;
  openUntil?: string | null;
  checkInUntil?: string | null; // HH:MM
  minutesToKef?: number | null;
};

export type VehicleInput = {
  scenarioKey: ScenarioKey;
  kind: VehicleKind;
  class: VehicleClass;
  name?: string;
  days: number;
  pricePerDay: Money;
  consumptionL100km: number;
  fuel: FuelType;
  insurance?: Record<string, { perDay: number; included?: boolean }>;
  insuranceChosen?: string[];
  extras?: Record<string, { perDay?: number; flat?: number }>;
  extrasChosen?: Record<string, number>;
  oneWayFee?: Money | null;
  deposit?: Money | null;
  seats?: number;
  sleeps?: number;
  luggageCapacity?: number;
  campingCard?: boolean;
  consumptionOverride?: number | null;
  fuelPriceOverride?: number | null; // ISK/l
  isManual?: boolean;
};

export type FoodInput = {
  level: FoodLevel;
  customPrices?: CustomFoodPrices | null;
  coffeePerDay?: number;
  snacksPerDay?: number;
  alcohol?: boolean;
  firstShopPp?: number | null; // € na osobu, jednorazovo
  dayOverrides?: Record<string, FoodLevel> | null;
};

export type ManualItemInput = {
  id: string;
  category: 'insurance' | 'sim' | 'souvenir' | 'other';
  label: string;
  amount: Money;
  split: Split;
  customShares?: Record<string, number> | null;
  scenarioKey?: ScenarioKey | null;
};

export type TripInput = {
  id: string;
  startDate?: string | null;
  endDate?: string | null;
  transportMode?: TransportMode | null;
  reservePct: number;
  baseCurrency: string;
  pace: Pace;
  interests: string[];
  routePreset?: string | null;
  budgetTargetPp?: number | null;
  homeTz?: string;
};

export type TripSnapshot = {
  trip: TripInput;
  travelers: TravelerInput[];
  flight?: FlightSelectionInput | null;
  itinerary: DayInput[];
  lodgingStays: Partial<Record<ScenarioKey, LodgingStayInput[]>>;
  vehicle: Partial<Record<ScenarioKey, VehicleInput | null>>;
  food: FoodInput;
  manualItems: ManualItemInput[];
  fx: { ISK_EUR: number; date: string }; // 1 ISK = x EUR
  fuel: { petrol: number; diesel: number }; // ISK / l
  tollsIsk?: number;
};

// ---- výstup ----
export type BudgetCategory =
  'flights' | 'lodging' | 'transport' | 'attractions' | 'food' | 'other' | 'reserve';
export type Confidence = 'exact' | 'cached' | 'estimate';

export type BudgetLine = {
  id: string;
  category: BudgetCategory;
  label: string;
  amount: number; // EUR
  min: number;
  max: number;
  confidence: Confidence;
  source: MoneySource;
  split: Split;
  perTraveler: Record<string, number>;
  step: number; // 1–8
  scenarioKey?: ScenarioKey;
  note?: string;
};

export type CategoryTotals = {
  amount: number;
  min: number;
  max: number;
  confidence: Confidence;
  lines: BudgetLine[];
};

export type ScenarioTotals = {
  key: ScenarioKey;
  byCategory: Record<BudgetCategory, CategoryTotals>;
  group: number;
  min: number;
  max: number;
  perPerson: number;
  perTraveler: Record<string, number>;
  confidence: Confidence;
  vsTargetPp?: number | null;
  warnings: string[];
};

export type BudgetResult = {
  pax: number;
  days: number;
  nights: number;
  scenarios: Partial<Record<'car' | 'camper', ScenarioTotals>>;
  recommended?: 'car' | 'camper';
};
