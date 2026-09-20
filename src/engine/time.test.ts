import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, inSeason, localParts } from './time';

describe('time', () => {
  it('lokálny čas KEF (UTC+0) a BA (UTC+2 v septembri)', () => {
    const kef = localParts('2027-09-12T09:15:00+00:00', 'Atlantic/Reykjavik');
    expect(kef).toMatchObject({ date: '2027-09-12', hour: 9, minute: 15 });
    const ba = localParts('2027-09-12T04:40:00Z', 'Europe/Bratislava');
    expect(ba).toMatchObject({ date: '2027-09-12', hour: 6, minute: 40 });
  });
  it('polnočný prechod: 23:30 UTC je v BA už ďalší deň', () => {
    expect(localParts('2027-09-21T23:30:00Z', 'Europe/Bratislava').date).toBe('2027-09-22');
    expect(localParts('2027-09-21T23:30:00Z', 'Atlantic/Reykjavik').date).toBe('2027-09-21');
  });
  it('addDays / daysBetween cez koniec mesiaca', () => {
    expect(addDays('2027-09-28', 5)).toBe('2027-10-03');
    expect(daysBetween('2027-09-12', '2027-09-21')).toBe(9);
  });
  it('sezóna cez Nový rok (ľadové jaskyne nov–mar)', () => {
    const s = { from: '11-01', to: '03-31' };
    expect(inSeason('2027-12-15', s)).toBe(true);
    expect(inSeason('2027-09-15', s)).toBe(false);
    expect(inSeason('2027-09-15', { from: '06-01', to: '09-30' })).toBe(true);
  });
});
