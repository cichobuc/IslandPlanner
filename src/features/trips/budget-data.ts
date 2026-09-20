import 'server-only';
import { computeBudget, foodDaysFor } from '@/engine/budget';
import { foodTotal } from '@/engine/food';
import type { BudgetResult, ScenarioTotals, TripSnapshot } from '@/engine/types';
import { loadSnapshot } from './snapshot';

export type TripBudget = {
  snapshot: TripSnapshot;
  result: BudgetResult;
  /** aktívna vetva (z kroku 03; bez rozhodnutia = auto) */
  active: 'car' | 'camper';
  totals: ScenarioTotals | null;
};

/** Rozpočet celej cesty z plného snapshotu (engine `computeBudget`) – hlavička „Odhad cesty“, kroky 07/08, Postup. */
export async function loadBudget(tripId: string): Promise<TripBudget> {
  const snapshot = await loadSnapshot(tripId);
  const result = computeBudget(snapshot);
  const active: 'car' | 'camper' = snapshot.trip.transportMode === 'camper' ? 'camper' : 'car';
  return { snapshot, result, active, totals: result.scenarios[active] ?? null };
}

/** Strava po dňoch pre krok 07 (rovnaký výpočet ako v rozpočte). */
export function foodBreakdown(snapshot: TripSnapshot, key: 'car' | 'camper') {
  const days = foodDaysFor(snapshot, key);
  const pax = snapshot.travelers.length || 1;
  return { days, total: foodTotal(days, snapshot.food, pax), pax };
}

/** Súhrn pre hlavičku: 4 stĺpce Letenky / Doprava / Kde spať / Ostatné so zdrojom (najslabší v kategórii). */
export function summaryColumns(t: ScenarioTotals) {
  const src = (
    c: (typeof t.byCategory)[keyof typeof t.byCategory],
  ): 'api' | 'seed' | 'estimate' | 'manual' | 'range' => {
    if (c.lines.length === 0) return 'estimate';
    if (c.confidence === 'estimate') return c.lines.some((l) => l.min !== l.max) ? 'range' : 'estimate';
    const rank = { manual: 0, api: 1, seed: 2, estimate: 3 } as const;
    return c.lines.reduce<'api' | 'seed' | 'estimate' | 'manual'>(
      (worst, l) => (rank[l.source] > rank[worst] ? l.source : worst),
      'manual',
    );
  };
  const other =
    t.byCategory.attractions.amount +
    t.byCategory.food.amount +
    t.byCategory.other.amount +
    t.byCategory.reserve.amount;
  return [
    {
      label: 'Letenky',
      amount: t.byCategory.flights.amount,
      source: src(t.byCategory.flights),
      approx: t.byCategory.flights.confidence === 'estimate',
    },
    {
      label: 'Doprava',
      amount: t.byCategory.transport.amount,
      source: src(t.byCategory.transport),
      approx: t.byCategory.transport.confidence === 'estimate',
    },
    {
      label: 'Kde spať',
      amount: t.byCategory.lodging.amount,
      source: src(t.byCategory.lodging),
      approx: t.byCategory.lodging.confidence === 'estimate',
    },
    { label: 'Ostatné', amount: other, source: 'estimate' as const, approx: true },
  ];
}
