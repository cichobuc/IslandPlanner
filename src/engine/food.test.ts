import { describe, expect, it } from 'vitest';
import { FOOD_DEFAULTS, dayPartForArrival, dayPartForDeparture, foodDay, foodTotal } from './food';
import type { FoodInput } from './types';

const budget: FoodInput = { level: 'budget', coffeePerDay: 1, snacksPerDay: 1, alcohol: false };

describe('food', () => {
  it('kemp s karavanom → raňajky aj večere self', () => {
    const d = foodDay(
      { date: '2027-09-14', kitchenMorning: true, kitchenEvening: true, part: 'full' },
      budget,
    );
    expect(d.breakfast).toBe(FOOD_DEFAULTS.breakfastSelf);
    expect(d.dinner).toBe(FOOD_DEFAULTS.dinnerSelf);
    expect(d.perPerson).toBe(3 + 5 + 8 + 3 + 2);
  });
  it('hotel bez kuchynky → raňajky aj večera out; komfort vždy out', () => {
    const d = foodDay(
      { date: '2027-09-14', kitchenMorning: false, kitchenEvening: false, part: 'full' },
      budget,
    );
    expect(d.breakfast).toBe(FOOD_DEFAULTS.breakfastOut);
    expect(d.dinner).toBe(FOOD_DEFAULTS.dinnerOut);
    const c = foodDay(
      { date: '2027-09-14', kitchenMorning: true, kitchenEvening: true, part: 'full' },
      { ...budget, level: 'comfort' },
    );
    expect(c.dinner).toBe(FOOD_DEFAULTS.dinnerOut);
    expect(c.lunch).toBe(FOOD_DEFAULTS.lunchOut);
  });
  it('prvý deň od obeda / posledný do obeda podľa časov letu', () => {
    expect(dayPartForArrival(9 * 60 + 15)).toBe('from_lunch');
    expect(dayPartForArrival(18 * 60)).toBe('from_dinner');
    expect(dayPartForDeparture(15 * 60 + 20)).toBe('until_lunch');
    expect(dayPartForDeparture(7 * 60)).toBe('none');
    const first = foodDay(
      { date: 'x', kitchenMorning: false, kitchenEvening: true, part: 'from_lunch' },
      budget,
    );
    expect(first.breakfast).toBe(0);
    expect(first.lunch).toBeGreaterThan(0);
  });
  it('denný override úrovne a vlastné ceny', () => {
    const f: FoodInput = {
      ...budget,
      dayOverrides: { '2027-09-15': 'comfort' },
      customPrices: { dinnerOut: 40 },
    };
    const d = foodDay({ date: '2027-09-15', kitchenMorning: true, kitchenEvening: true, part: 'full' }, f);
    expect(d.level).toBe('comfort');
    expect(d.dinner).toBe(40);
  });
  it('súčet za skupinu = na osobu × pax, prvý nákup raz na osobu', () => {
    const days = [1, 2, 3].map((i) => ({
      date: `d${i}`,
      kitchenMorning: true,
      kitchenEvening: true,
      part: 'full' as const,
    }));
    const t = foodTotal(days, budget, 4);
    expect(t.perPerson).toBe(3 * 21 + FOOD_DEFAULTS.firstShopPp);
    expect(t.total).toBe(t.perPerson * 4);
  });
});
