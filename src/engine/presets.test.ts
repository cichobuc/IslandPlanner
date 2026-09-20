import { describe, expect, it } from 'vitest';
import { PRESETS, allocateNights, presetForDays } from './presets';

describe('presets', () => {
  it('preset podľa dní: 5 → golden_south, 7 → south_east, 10 → ring, 14 → ring_westfjords', () => {
    expect(presetForDays(5).key).toBe('golden_south');
    expect(presetForDays(7).key).toBe('south_east');
    expect(presetForDays(10).key).toBe('ring');
    expect(presetForDays(11, { interests: ['nature'] }).key).toBe('ring_snaefellsnes');
    expect(presetForDays(14).key).toBe('ring_westfjords');
  });
  it('9 nocí na ring: každý región aspoň 1 noc, súčet sedí, poradie po trase', () => {
    const r = allocateNights(PRESETS.ring, 9);
    expect(r).toHaveLength(9);
    expect(r[0]).toBe('golden_circle');
    expect(r[r.length - 1]).toBe('reykjavik');
    expect(new Set(r).size).toBe(8);
  });
  it('neskorý prílet pridá prvú noc pri KEF, skorý odlet poslednú', () => {
    const r = allocateNights(PRESETS.ring, 10, { lateArrival: true, earlyDeparture: true });
    expect(r[0]).toBe('reykjanes');
    expect(r[9]).toBe('reykjanes');
    expect(r).toHaveLength(10);
  });
  it('málo nocí (3 na golden_south) vyberie regióny s najvyššou váhou', () => {
    const r = allocateNights(PRESETS.golden_south, 3);
    expect(r).toHaveLength(3);
    expect(r).toContain('south');
  });
});
