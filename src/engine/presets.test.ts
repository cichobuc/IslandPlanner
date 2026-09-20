import { describe, expect, it } from 'vitest';
import { PRESETS, PRESET_ORDER, allocateNights, presetForDays, ratePresets, resolvePreset } from './presets';

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
  it('resolvePreset: ručný kľúč má prednosť, auto/null → podľa dní', () => {
    expect(resolvePreset('south_only', 10).key).toBe('south_only');
    expect(resolvePreset('auto', 10).key).toBe('ring');
    expect(resolvePreset(null, 5).key).toBe('golden_south');
    expect(resolvePreset('nonsense', 5).key).toBe('golden_south');
  });
  it('každý preset má meno, kotvy a končí na reykjanes (KEF)', () => {
    for (const k of PRESET_ORDER) {
      const p = PRESETS[k];
      expect(p.nameSk.length).toBeGreaterThan(3);
      expect(p.highlights.length).toBeGreaterThanOrEqual(4);
      expect(p.legs[p.legs.length - 1].region).toBe('reykjanes');
      expect(p.minDays).toBeLessThanOrEqual(p.maxDays);
    }
  });
  it('4 noci na south_only: juh aj juhovýchod po 2', () => {
    const r = allocateNights(PRESETS.south_only, 4);
    expect(r).toEqual(['south', 'south', 'southeast', 'southeast']);
  });
  it('hodnotenie na 5 dní: krátke okruhy sedia, ring je „málo dní“, odporúčaný má najvyššie skóre', () => {
    const pois = [
      { regionId: 'golden_circle', interestWeight: { thermal: 3 } },
      { regionId: 'south', interestWeight: { glacier: 2 } },
      { regionId: 'southeast', interestWeight: { glacier: 3 } },
      { regionId: 'north_myvatn', interestWeight: { whale: 3, thermal: 2 } },
      { regionId: 'akureyri', interestWeight: { whale: 3 } },
    ];
    const { ratings, recommended } = ratePresets({ days: 5, pace: 'normal', interests: ['thermal', 'whale'], pois });
    const by = Object.fromEntries(ratings.map((r) => [r.key, r]));
    expect(by.golden_south.fit).toBe('ok');
    expect(by.ring.fit).toBe('too_long');
    expect(by.ring.reasonsSk[0]).toContain('príliš dlhý');
    expect(by.golden_south.interestsCovered).toContain('thermal');
    expect(by.golden_south.interestsMissing).toContain('whale');
    expect(by.golden_south.reasonsSk.join(' ')).toContain('veľryby');
    expect(by.golden_only.fit).toBe('too_short');
    expect(by[recommended].score).toBe(Math.max(...ratings.map((r) => r.score)));
    for (const r of ratings) expect(r.stars).toBeGreaterThanOrEqual(1);
  });
  it('hodnotenie bez POI/záujmov dá pevných 20 b. za záujmy', () => {
    const { ratings } = ratePresets({ days: 10, pace: 'normal', interests: [] });
    const ring = ratings.find((r) => r.key === 'ring')!;
    expect(ring.fit).toBe('ok');
    expect(ring.score).toBeGreaterThanOrEqual(75);
  });
});
