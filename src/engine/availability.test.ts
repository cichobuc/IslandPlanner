import { describe, expect, it } from 'vitest';
import { expandRange, groupAvailability } from './availability';

describe('dostupnosť skupiny (00a Kedy môžem)', () => {
  it('rozsah dní', () => {
    expect(expandRange('2027-09-03/2027-09-05')).toEqual(['2027-09-03', '2027-09-04', '2027-09-05']);
    expect(expandRange('2027-09-03')).toEqual(['2027-09-03']);
    expect(expandRange('2027-09-05/2027-09-03')).toEqual([]);
  });
  it('prienik mesiacov, konflikt mesiaca, blokované dni v cieľovom mesiaci, dĺžka', () => {
    const g = groupAvailability(
      [
        { name: 'Lukáš', availability: { months: [6, 7, 9], blocked: ['2027-09-01/2027-09-03'], minDays: 7, maxDays: 12 } },
        { name: 'Peter', availability: { months: [9, 10], minDays: 8 } },
        { name: 'Jana', availability: null },
        { name: 'Martin', availability: { months: [6, 7], blocked: ['2027-08-30/2027-09-02', '2027-09-20'] } },
      ],
      '2027-09',
      { min: 8, max: 12 },
    );
    expect(g.monthsAll).toEqual([]); // 9 nesedí Martinovi, 6/7 nesedia Petrovi
    expect(g.monthConflicts).toEqual(['Martin']);
    expect(g.blockedDays['2027-09-01']).toEqual(['Lukáš', 'Martin']);
    expect(g.blockedDays['2027-08-31']).toBeUndefined();
    expect(g.blockedDays['2027-09-20']).toEqual(['Martin']);
    expect(g.days).toEqual({ min: 8, max: 12 });
    expect(g.filled).toBe(3);
    expect(g.warnings[0]).toContain('Martin nemôže v septembri');
    expect(g.warnings[1]).toContain('Lukáš: 1. 9.–3. 9.');
    expect(g.warnings[1]).toContain('Martin: 1. 9.–2. 9., 20. 9.');
    expect(g.warnings).toHaveLength(2);
  });
  it('nikto nič nevyplnil → bez obmedzení; dĺžka mimo → varovanie', () => {
    const none = groupAvailability([{ name: 'A', availability: null }], '2027-09', { min: 8, max: 12 });
    expect(none.warnings).toEqual([]);
    expect(none.filled).toBe(0);
    const d = groupAvailability([{ name: 'A', availability: { maxDays: 6 } }], '2027-09', { min: 8, max: 12 });
    expect(d.warnings[0]).toContain('mimo');
    const ok = groupAvailability([{ name: 'A', availability: { months: [9], minDays: 5, maxDays: 14 } }], '2027-09', { min: 8, max: 12 });
    expect(ok.monthsAll).toEqual([9]);
    expect(ok.warnings).toEqual([]);
  });
});
