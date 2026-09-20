import { describe, expect, it } from 'vitest';
import { computeBudget } from './budget';
import { applyFlightSelection } from './cascade';
import { baseSnapshot, bluLagoon, flightVie, seniorMuseum, thingvellir } from './fixtures';
import { eur } from './money';
import { paymentTimeline } from './timeline';
import { estimateBranch } from './transportMode';
import type { TripSnapshot } from './types';

function fullSnapshot(): TripSnapshot {
  const s = applyFlightSelection(baseSnapshot(), flightVie).snapshot;
  s.itinerary[0].stops.push({ id: 'a', poi: bluLagoon });
  s.itinerary[1].stops.push({ id: 'b', poi: thingvellir }, { id: 'c', poi: seniorMuseum });
  s.manualItems = [
    { id: 'm1', category: 'insurance', label: 'Poistenie', amount: eur(80, 'manual'), split: 'person' },
  ];
  return s;
}

describe('computeBudget', () => {
  const b = computeBudget(fullSnapshot());
  const car = b.scenarios.car!;
  const camper = b.scenarios.camper!;

  it('súčet kategórií = skupina; perPerson × pax = skupina (± zaokrúhlenie); Σ perTraveler = skupina', () => {
    for (const sc of [car, camper]) {
      const cats = Object.values(sc.byCategory).reduce((a, c) => a + c.amount, 0);
      expect(cats).toBeCloseTo(sc.group, 1);
      expect(sc.perPerson * b.pax).toBeCloseTo(sc.group, 0);
      expect(Object.values(sc.perTraveler).reduce((a, x) => a + x, 0)).toBeCloseTo(sc.group, 0);
    }
  });
  it('osobné položky sa delia podľa osoby: senior platí menej vstupné než dospelý', () => {
    expect(car.perTraveler.jana).toBeLessThan(car.perTraveler.lukas);
    const museum = car.byCategory.attractions.lines.find((l) => l.label.startsWith('Múzeum'))!;
    expect(museum.perTraveler).toEqual({ lukas: 20, peter: 20, jana: 12, eva: 20 });
  });
  it('kategórie a kroky: letenky (2), noci (4), doprava (3), atrakcie (6), strava (7), rezerva 10 %', () => {
    expect(car.byCategory.flights.amount).toBeCloseTo(295 * 4 + 160 + 90 + 40, 1);
    expect(car.byCategory.lodging.lines).toHaveLength(9);
    expect(car.byCategory.transport.lines.map((l) => l.id)).toEqual(['rental', 'insurance', 'fuel']);
    expect(car.byCategory.attractions.lines.length).toBe(3);
    const sub = car.group - car.byCategory.reserve.amount;
    expect(car.byCategory.reserve.amount).toBeCloseTo(sub * 0.1, 0);
  });
  it('karavan: kempy sú lacnejšie než penzióny, ale vozidlo drahšie; strava v karavane self', () => {
    expect(camper.byCategory.lodging.amount).toBeLessThan(car.byCategory.lodging.amount);
    expect(camper.byCategory.transport.amount).toBeGreaterThan(car.byCategory.transport.amount);
    expect(camper.byCategory.food.amount).toBeLessThanOrEqual(car.byCategory.food.amount);
    expect(['car', 'camper']).toContain(b.recommended);
  });
  it('rozsah min–max obaľuje sumu a odhady majú širší rozsah', () => {
    expect(car.min).toBeLessThanOrEqual(car.group);
    expect(car.max).toBeGreaterThanOrEqual(car.group);
    expect(car.byCategory.lodging.confidence).toBe('estimate');
    expect(car.byCategory.other.confidence).toBe('exact');
  });
  it('bez letu a bez itinerára vráti prázdny, ale konzistentný rozpočet', () => {
    const b0 = computeBudget(baseSnapshot());
    expect(b0.days).toBe(1);
    expect(b0.scenarios.car!.group).toBeGreaterThan(0);
  });
});

describe('estimateBranch', () => {
  const input = {
    days: 10,
    pax: 4,
    pace: 'normal' as const,
    interests: [],
    fx: { ISK_EUR: 1 / 147 },
    fuelIskPerL: { petrol: 320, diesel: 315 },
    food: { level: 'budget' as const },
  };
  it('auto vs. karavan vs. bez auta – typy krokov a rozumné sumy', () => {
    const car = estimateBranch('car', input);
    const camper = estimateBranch('camper', input);
    const none = estimateBranch('no_car', input);
    expect(car).toMatchObject({
      step4Kind: 'lodging',
      step5Kind: 'itinerary',
      km: 2150,
      vehicleClass: 'estate',
    });
    expect(camper).toMatchObject({ step4Kind: 'campsites', vehicleClass: 'camper4' });
    expect(none).toMatchObject({ step4Kind: 'base', step5Kind: 'tours', km: 0, vehicle: 0 });
    expect(camper.lodging.mid).toBeLessThan(car.lodging.mid);
    expect(car.total.mid).toBeGreaterThan(2000);
    expect(car.total.mid).toBeLessThan(6000);
    expect(none.tours).toBeGreaterThan(0);
  });
});

describe('paymentTimeline', () => {
  it('udalosti zoradené podľa dátumu, letenky dnes, vozidlo T−120', () => {
    const ev = paymentTimeline(fullSnapshot(), '2026-10-01');
    expect(ev[0].date <= ev[ev.length - 1].date).toBe(true);
    expect(ev.find((e) => e.label.startsWith('Letenky'))?.date).toBe('2026-10-01');
    expect(ev.find((e) => e.label.startsWith('Rezervácia vozidla'))?.date).toBe('2027-05-15');
  });
});
