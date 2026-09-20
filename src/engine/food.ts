import { round2 } from './money';
import type { CustomFoodPrices, FoodInput, FoodLevel } from './types';

/** Seed ceny na osobu v € (docs/07, krok 07: úsporná ≈ 18–21 €/os/deň). */
export const FOOD_DEFAULTS = {
  breakfastSelf: 3,
  breakfastOut: 14,
  lunchSelf: 5,
  lunchFast: 12,
  lunchOut: 22,
  dinnerSelf: 8,
  dinnerOut: 32,
  coffee: 3,
  snack: 2,
  alcoholPerDay: 10,
  firstShopPp: 22,
};

export type FoodPrices = typeof FOOD_DEFAULTS;

export function foodPrices(custom?: CustomFoodPrices | null): FoodPrices {
  return { ...FOOD_DEFAULTS, ...(custom ?? {}) } as FoodPrices;
}

export type DayPart = 'full' | 'from_lunch' | 'from_dinner' | 'until_lunch' | 'breakfast_only' | 'none';

export type FoodDayInput = {
  date: string;
  level?: FoodLevel;
  kitchenMorning: boolean;
  kitchenEvening: boolean;
  part: DayPart;
  special?: { dinnerOut?: boolean; picnic?: boolean } | null;
};

export type FoodDayResult = {
  date: string;
  level: FoodLevel;
  breakfast: number;
  lunch: number;
  dinner: number;
  extras: number;
  perPerson: number;
  kitchenMorning: boolean;
  kitchenEvening: boolean;
  part: DayPart;
};

/** Strava jedného dňa na osobu (docs/05 §7). */
export function foodDay(
  day: FoodDayInput,
  food: FoodInput,
  prices = foodPrices(food.customPrices),
): FoodDayResult {
  const level = day.level ?? food.dayOverrides?.[day.date] ?? food.level;
  const p = prices;
  const has = (meal: 'breakfast' | 'lunch' | 'dinner') => {
    switch (day.part) {
      case 'none':
        return false;
      case 'from_lunch':
        return meal !== 'breakfast';
      case 'from_dinner':
        return meal === 'dinner';
      case 'until_lunch':
        return meal !== 'dinner';
      case 'breakfast_only':
        return meal === 'breakfast';
      default:
        return true;
    }
  };
  const breakfast = has('breakfast')
    ? day.kitchenMorning && level !== 'comfort'
      ? p.breakfastSelf
      : p.breakfastOut
    : 0;
  const lunch = has('lunch')
    ? day.special?.picnic
      ? p.lunchSelf
      : level === 'budget'
        ? p.lunchSelf
        : level === 'mid'
          ? p.lunchFast
          : p.lunchOut
    : 0;
  const dinner = has('dinner')
    ? day.special?.dinnerOut
      ? p.dinnerOut
      : day.kitchenEvening && level !== 'comfort'
        ? p.dinnerSelf
        : p.dinnerOut
    : 0;
  const mealsCount = [has('breakfast'), has('lunch'), has('dinner')].filter(Boolean).length;
  const extras =
    day.part === 'none'
      ? 0
      : round2(
          ((food.coffeePerDay ?? 1) * p.coffee +
            (food.snacksPerDay ?? 1) * p.snack +
            (food.alcohol ? p.alcoholPerDay : 0)) *
            (mealsCount / 3),
        );
  return {
    date: day.date,
    level,
    breakfast,
    lunch,
    dinner,
    extras,
    perPerson: round2(breakfast + lunch + dinner + extras),
    kitchenMorning: day.kitchenMorning,
    kitchenEvening: day.kitchenEvening,
    part: day.part,
  };
}

export type FoodTotal = {
  days: FoodDayResult[];
  perPerson: number;
  firstShopPp: number;
  total: number;
  pax: number;
};

export function foodTotal(days: FoodDayInput[], food: FoodInput, pax: number): FoodTotal {
  const prices = foodPrices(food.customPrices);
  const res = days.map((d) => foodDay(d, food, prices));
  const firstShopPp = food.firstShopPp ?? prices.firstShopPp;
  const perPerson = round2(res.reduce((a, d) => a + d.perPerson, 0) + firstShopPp);
  return { days: res, perPerson, firstShopPp, total: round2(perPerson * pax), pax };
}

/** Prvý deň od obeda ak prílet < 13:00 (KEF čas), inak od večere; posledný do obeda ak odlet po 12:00, inak nič. */
export function dayPartForArrival(arrivalMinutesOfDay: number): DayPart {
  if (arrivalMinutesOfDay < 13 * 60) return 'from_lunch';
  if (arrivalMinutesOfDay < 20 * 60) return 'from_dinner';
  return 'none';
}
export function dayPartForDeparture(departureMinutesOfDay: number): DayPart {
  if (departureMinutesOfDay >= 14 * 60) return 'until_lunch';
  if (departureMinutesOfDay >= 9 * 60) return 'breakfast_only';
  return 'none';
}
