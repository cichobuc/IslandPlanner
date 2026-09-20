import { describe, expect, it } from 'vitest';
import { dateRangeLabel, monthLabel, stepNames, tripProgress } from './progress';

describe('tripProgress', () => {
  it('nová cesta: krok 1 aktívny, nič hotové', () => {
    const p = tripProgress({ travelersCount: 0, originAirports: ['KTW'], startDate: null, transportMode: null });
    expect(p.done).toBe(0);
    expect(p.active).toBe(1);
    expect(p.steps[0]).toBe('active');
    expect(p.steps[7]).toBe('pending');
  });
  it('s cestujúcimi a letom je aktívny krok 3', () => {
    const p = tripProgress({ travelersCount: 4, originAirports: ['KTW'], startDate: '2027-09-12', transportMode: null });
    expect(p.done).toBe(2);
    expect(p.active).toBe(3);
    expect(p.steps.slice(0, 3)).toEqual(['done', 'done', 'active']);
  });
  it('vetva mení názvy krokov 04/05', () => {
    expect(stepNames('camper')[3]).toBe('Kempy');
    expect(stepNames('no_car').slice(3, 5)).toEqual(['Základňa', 'Výlety']);
    expect(stepNames('car')[3]).toBe('Kde spať');
  });
});

describe('labels', () => {
  it('mesiac', () => expect(monthLabel('2027-09-01')).toBe('september 2027'));
  it('rozsah dátumov v jednom mesiaci', () => expect(dateRangeLabel('2027-09-12', '2027-09-21')).toBe('12.–21. 9.'));
  it('rozsah cez mesiace', () => expect(dateRangeLabel('2027-09-28', '2027-10-03')).toBe('28. 9.–3. 10.'));
});
