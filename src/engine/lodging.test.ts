import { describe, expect, it } from 'vitest';
import { FX } from './fixtures';
import { campingCardDecision, campsiteCost, lodgingEstimate, lodgingWarnings, stayCost } from './lodging';
import { eur } from './money';
import type { LodgingStayInput } from './types';

const stay = (o: Partial<LodgingStayInput>): LodgingStayInput => ({
  id: 's',
  scenarioKey: 'car',
  nightIndex: 1,
  nightDate: '2027-09-12',
  kind: 'guesthouse',
  ...o,
});

describe('lodging', () => {
  it('odhad z rozpätia seedu per región × typ, škálovaný na pax a mesiac (september = 1×, júl 1,3×, január 0,75×)', () => {
    expect(lodgingEstimate('south', 'guesthouse', 4)).toEqual({ min: 290, max: 430 });
    expect(lodgingEstimate('south', 'guesthouse', 2)).toEqual({ min: 145, max: 215 });
    expect(lodgingEstimate('neznamy', 'hostel', 4)).toEqual({ min: 180, max: 250 });
    expect(lodgingEstimate('south', 'guesthouse', 4, '2027-07-10')).toEqual({ min: 377, max: 559 });
    expect(lodgingEstimate('south', 'guesthouse', 4, '2027-01-10')).toEqual({ min: 217.5, max: 322.5 });
    // odhadovaná noc bez ponuky berie mesiac z dátumu noci
    const july = stayCost(stay({ regionId: 'south', nightDate: '2027-07-10' }), 4, 5, FX);
    expect(july.min).toBe(377);
    expect(july.confidence).toBe('estimate');
  });
  it('vybraná ponuka: noc + upratovanie/noci + service fee + city tax × pax', () => {
    const c = stayCost(
      stay({
        regionId: 'south',
        kind: 'airbnb',
        pricePerNight: eur(200, 'manual'),
        cleaningFee: eur(50, 'manual'),
        serviceFeePct: 14,
        cityTaxPp: eur(1, 'manual'),
      }),
      4,
      5,
      FX,
    );
    expect(c.amount).toBe(200 + 10 + 28 + 4);
    expect(c.confidence).toBe('exact');
    expect(c.hasKitchen).toBe(false);
  });
  it('kemp: pax × os./noc + elektrina + daň; Camping Card nuluje osoby v sieti', () => {
    const s = stay({ regionId: 'akureyri', kind: 'camper_site', scenarioKey: 'camper' });
    const without = campsiteCost(s, 4, FX, { campingCard: false }).amount;
    const withCard = campsiteCost(s, 4, FX, { campingCard: true });
    expect(without).toBeCloseTo((2500 * 4 + 1300 + 333 * 4) / 147, 1);
    expect(withCard.campingCardApplied).toBe(true);
    expect(withCard.amount).toBeCloseTo((1300 + 333 * 4) / 147, 1);
    expect(stayCost(s, 4, 9, FX).hasKitchen).toBe(true);
  });
  it('Camping Card sa pri 4 dospelých (2 karty, 398 €) oplatí až od ~ 10 nocí v sieti', () => {
    const inNet = (n: number) =>
      Array.from({ length: n }, (_, i) =>
        stay({ id: `n${i}`, regionId: 'akureyri', kind: 'camper_site', nightIndex: i + 1 }),
      );
    expect(campingCardDecision(inNet(5), 4, FX).worthIt).toBe(false);
    const d = campingCardDecision(inNet(10), 4, FX);
    expect(d.cards).toBe(2);
    expect(d.worthIt).toBe(true);
  });
  it('varovania: prílet po 20:00 mimo Reykjanes, odlet pred 10:00 ďaleko od KEF, zatvorený kemp, neskorý check-in', () => {
    const w = lodgingWarnings(
      [
        stay({ nightIndex: 1, regionId: 'reykjavik' }),
        stay({
          id: 'b',
          nightIndex: 2,
          regionId: 'south',
          openUntil: '2027-09-10',
          nightDate: '2027-09-13',
          checkInUntil: '20:00',
        }),
      ],
      { arrivalMinutesOfDay: 21 * 60, departureMinutesOfDay: 8 * 60, plannedArrivalByNight: { 2: '21:30' } },
    );
    expect(w.map((x) => x.code)).toEqual([
      'late_arrival_region',
      'early_departure_far',
      'closed',
      'check_in_late',
    ]);
  });
});
