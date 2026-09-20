import { describe, expect, it } from 'vitest';
import { confidenceOf, eur, isk, mergeSource, rangeFor, toEur } from './money';
import { FX } from './fixtures';

describe('money', () => {
  it('ISK → EUR kurzom zo snapshotu', () => {
    expect(toEur(isk(14700), FX)).toBe(100);
    expect(toEur(eur(50), FX)).toBe(50);
  });
  it('pôvod sa propaguje: aspoň jeden estimate → estimate', () => {
    expect(mergeSource('manual', 'api')).toBe('api');
    expect(mergeSource('api', 'seed', 'estimate')).toBe('estimate');
    expect(mergeSource('manual')).toBe('manual');
  });
  it('konfidencia a rozsah', () => {
    expect(confidenceOf('manual')).toBe('exact');
    expect(confidenceOf('api')).toBe('cached');
    expect(rangeFor(100, 'estimate')).toEqual({ min: 85, max: 115 });
    expect(rangeFor(100, 'exact')).toEqual({ min: 100, max: 100 });
  });
});
