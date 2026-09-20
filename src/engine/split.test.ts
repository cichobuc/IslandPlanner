import { describe, expect, it } from 'vitest';
import { airportAccessCost, airportVehicles, splitAmount } from './split';

describe('split', () => {
  const ids = ['a', 'b', 'c', 'd'];
  it('group rovným dielom, zvyšok centov nezmizne', () => {
    const s = splitAmount(100, 'group', ids);
    expect(Object.values(s).reduce((x, y) => x + y, 0)).toBeCloseTo(100, 2);
    expect(s.a).toBe(25);
    const t = splitAmount(10, 'group', ['a', 'b', 'c']);
    expect(Object.values(t).reduce((x, y) => x + y, 0)).toBeCloseTo(10, 2);
  });
  it('person podľa perPerson, custom podľa podielov', () => {
    expect(splitAmount(0, 'person', ids, { perPerson: { a: 12, b: 0, c: 8, d: 0 } })).toEqual({
      a: 12,
      b: 0,
      c: 8,
      d: 0,
    });
    expect(splitAmount(100, 'custom', ids, { customShares: { a: 50, b: 50 } })).toEqual({
      a: 50,
      b: 50,
      c: 0,
      d: 0,
    });
  });
  it('cesta na letisko: 1 auto pre 4 os. a 4 kufre, 2 autá pri 5 kufroch; bus keď je lacnejší', () => {
    expect(airportVehicles(4, 4)).toBe(1);
    expect(airportVehicles(4, 5)).toBe(2);
    expect(airportVehicles(5, 2)).toBe(2);
    const car = airportAccessCost({
      pax: 4,
      checkedBags: 2,
      km: 60,
      consumptionL100km: 6.5,
      fuelPriceEur: 1.6,
      vignettes: 0,
    });
    expect(car).toMatchObject({ mode: 'car', vehicles: 1 });
    expect(car.total).toBeCloseTo(12.48, 2);
    const bus = airportAccessCost({
      pax: 5,
      checkedBags: 5,
      km: 60,
      consumptionL100km: 6.5,
      fuelPriceEur: 1.6,
      vignettes: 15,
      busTicketPp: 3,
    });
    expect(bus.mode).toBe('bus');
  });
});
