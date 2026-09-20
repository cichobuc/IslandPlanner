import type { FlightSelectionInput, PoiInput, TravelerInput, TripSnapshot } from './types';
import { eur, isk } from './money';

/** Testovací snapshot: 4 dospelí, VIE ⇄ KEF 12.–21. 9. 2027, Ring 10 dní. */
export const FX = { ISK_EUR: 1 / 147, date: '2026-09-20' };
export const FUEL = { petrol: 320, diesel: 315 };

export const travelers4: TravelerInput[] = [
  {
    id: 'lukas',
    name: 'Lukáš',
    birthDate: '1988-05-14',
    isDriver: true,
    bags: { cabinSmall: 1, cabin10: 0, checked20: 1, checked32: 0 },
    hasCreditCard: true,
  },
  {
    id: 'peter',
    name: 'Peter',
    birthDate: '1990-02-01',
    isDriver: true,
    bags: { cabinSmall: 1, cabin10: 1, checked20: 0, checked32: 0 },
  },
  {
    id: 'jana',
    name: 'Jana',
    birthDate: '1959-09-15',
    bags: { cabinSmall: 1, cabin10: 0, checked20: 1, checked32: 0 },
  },
  {
    id: 'eva',
    name: 'Eva',
    birthDate: '2000-12-30',
    bags: { cabinSmall: 1, cabin10: 0, checked20: 0, checked32: 0 },
  },
];

export const flightVie: FlightSelectionInput = {
  origin: 'VIE',
  outDepAt: '2027-09-12T06:40:00+02:00',
  outArrAt: '2027-09-12T09:15:00+00:00',
  retDepAt: '2027-09-21T15:20:00+00:00',
  retArrAt: '2027-09-21T21:05:00+02:00',
  farePp: eur(295, 'api'),
  bagsTotal: eur(160, 'seed'),
  parkingTotal: eur(90, 'seed'),
  airportAccessTotal: eur(40, 'estimate'),
};

export const bluLagoon: PoiInput = {
  id: 'p1',
  slug: 'blue-lagoon',
  name: 'Blue Lagoon',
  regionId: 'reykjanes',
  priceRules: [
    {
      label: 'Dospelý',
      minAge: 14,
      price: isk(11990, 'seed'),
      per: 'person',
      variant: 'basic',
      isDefault: true,
    },
    {
      label: 'Dieťa 2–13',
      minAge: 2,
      maxAge: 13,
      price: isk(0, 'seed'),
      per: 'person',
      variant: 'basic',
      isDefault: true,
    },
    {
      label: 'Premium',
      minAge: 14,
      price: isk(15990, 'seed'),
      per: 'person',
      variant: 'premium',
      isDefault: false,
    },
  ],
};

export const thingvellir: PoiInput = {
  id: 'p2',
  slug: 'thingvellir',
  name: 'Þingvellir',
  regionId: 'golden_circle',
  parkingFee: isk(1000, 'seed'),
  priceRules: [],
};

export const seniorMuseum: PoiInput = {
  id: 'p3',
  slug: 'museum',
  name: 'Múzeum',
  priceRules: [
    { label: 'Dospelý', minAge: 18, maxAge: 66, price: eur(20, 'seed'), per: 'person' },
    { label: 'Senior 67+', minAge: 67, price: eur(12, 'seed'), per: 'person' },
    { label: 'Dieťa', maxAge: 17, price: eur(0, 'seed'), per: 'person' },
  ],
};

export function baseSnapshot(overrides: Partial<TripSnapshot> = {}): TripSnapshot {
  return {
    trip: {
      id: 't1',
      startDate: null,
      endDate: null,
      transportMode: null,
      reservePct: 10,
      baseCurrency: 'EUR',
      pace: 'normal',
      interests: ['thermal', 'glacier'],
      homeTz: 'Europe/Bratislava',
    },
    travelers: travelers4,
    flight: null,
    itinerary: [],
    lodgingStays: {},
    vehicle: {
      car: {
        scenarioKey: 'car',
        kind: 'car',
        class: 'estate',
        name: 'Kombi',
        days: 10,
        pricePerDay: eur(70, 'seed'),
        consumptionL100km: 6.5,
        fuel: 'petrol',
        insurance: { cdw: { perDay: 0, included: true }, gp: { perDay: 9 } },
        insuranceChosen: ['gp'],
        seats: 5,
        luggageCapacity: 3,
      },
      camper: {
        scenarioKey: 'camper',
        kind: 'camper',
        class: 'camper4',
        name: 'Karavan 4',
        days: 10,
        pricePerDay: eur(210, 'seed'),
        consumptionL100km: 9,
        fuel: 'diesel',
        seats: 4,
        sleeps: 4,
        luggageCapacity: 4,
      },
    },
    food: { level: 'budget', coffeePerDay: 1, snacksPerDay: 1, alcohol: false },
    manualItems: [],
    fx: FX,
    fuel: FUEL,
    ...overrides,
  };
}
