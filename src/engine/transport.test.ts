import { describe, expect, it } from 'vitest';
import { FUEL, FX, baseSnapshot } from './fixtures';
import { transportCost, vehicleChecks } from './transport';

describe('transport', () => {
  it('prenájom + poistenie/deň + palivo ×1,05 + tunel', () => {
    const v = baseSnapshot().vehicle.car!;
    const c = transportCost(v, { totalKm: 2000, fuelIskPerL: FUEL, fx: FX, viaVadlaheidi: true });
    expect(c.rental).toBe(700);
    expect(c.insurance).toBe(90);
    expect(c.liters).toBeCloseTo(136.5, 1);
    expect(c.fuel).toBeCloseTo((136.5 * 320) / 147, 0);
    expect(c.tolls).toBeCloseTo(1990 / 147, 1);
    expect(c.total).toBeCloseTo(700 + 90 + c.fuel + c.tolls, 1);
  });
  it('prepísaná spotreba a cena paliva', () => {
    const v = { ...baseSnapshot().vehicle.car!, consumptionOverride: 8, fuelPriceOverride: 300 };
    const c = transportCost(v, { totalKm: 1000, fuelIskPerL: FUEL, fx: FX });
    expect(c.liters).toBe(84);
    expect(c.fuel).toBeCloseTo((84 * 300) / 147, 1);
  });
  it('kontroly: miesta, kufre, lôžka, vek/prax vodiča, kreditka', () => {
    const w = vehicleChecks(
      { kind: 'camper', seats: 4, sleeps: 2, luggageCapacity: 2 },
      { pax: 4, checkedBags: 3, drivers: [{ age: 19, years: 1, hasCreditCard: false }] },
    );
    expect(w.map((x) => x.code)).toEqual(['luggage', 'sleeps', 'driver_age', 'credit_card']);
    expect(
      vehicleChecks(
        { kind: 'car', seats: 5, luggageCapacity: 3 },
        { pax: 4, checkedBags: 2, drivers: [{ age: 39, years: 20, hasCreditCard: true }] },
      ),
    ).toEqual([]);
  });
});
