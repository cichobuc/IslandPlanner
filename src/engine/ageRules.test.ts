import { describe, expect, it } from 'vitest';
import { ageOn, entryTotal, fareBand, priceFor } from './ageRules';
import { FX, bluLagoon, seniorMuseum, thingvellir, travelers4 } from './fixtures';

describe('ageOn', () => {
  it('narodený 15. 9. 1959: 14. 9. 2027 → 67, 16. 9. → 68', () => {
    const jana = { birthDate: '1959-09-15' };
    expect(ageOn(jana, '2027-09-14')).toBe(67);
    expect(ageOn(jana, '2027-09-15')).toBe(68);
    expect(ageOn(jana, '2027-09-16')).toBe(68);
  });
  it('bez dátumu použije age_fallback', () => {
    expect(ageOn({ birthDate: null, ageFallback: 45 }, '2027-09-14')).toBe(45);
  });
});

describe('fareBand', () => {
  it('infant hranica < 2, dieťa 2–11, dospelý 12+', () => {
    expect(fareBand(1)).toBe('infant');
    expect(fareBand(2)).toBe('child');
    expect(fareBand(11)).toBe('child');
    expect(fareBand(12)).toBe('adult');
  });
});

describe('priceFor / entryTotal', () => {
  it('senior 67+ dostane seniorské vstupné v deň návštevy', () => {
    const jana = travelers4[2];
    expect(priceFor(seniorMuseum, jana, '2027-09-14')?.amount).toBe(12);
    expect(priceFor(seniorMuseum, travelers4[0], '2027-09-14')?.amount).toBe(20);
  });
  it('variant premium má prednosť, inak default', () => {
    expect(priceFor(bluLagoon, travelers4[0], '2027-09-13', 'premium')?.amount).toBe(15990);
    expect(priceFor(bluLagoon, travelers4[0], '2027-09-13')?.amount).toBe(11990);
  });
  it('POI bez pravidiel = 0 vstupné, parkovné per vehicle', () => {
    const e = entryTotal(thingvellir, travelers4, '2027-09-13', FX);
    expect(Object.values(e.perTraveler).every((v) => v === 0)).toBe(true);
    expect(e.vehicle).toBeCloseTo(1000 / 147, 2);
    expect(e.total).toBeCloseTo(6.8, 1);
  });
  it('4 dospelí Blue Lagoon v EUR', () => {
    const e = entryTotal(bluLagoon, travelers4, '2027-09-13', FX);
    expect(e.total).toBeCloseTo((4 * 11990) / 147, 1);
    expect(e.source).toBe('seed');
  });
});
