import { toEur, type Fx } from './money';
import type { Money, PoiInput, PriceRule, TravelerInput } from './types';

/** Celé roky k dátumu (vek v deň X). */
export function ageOn(traveler: Pick<TravelerInput, 'birthDate' | 'ageFallback'>, date: string): number {
  if (!traveler.birthDate) return traveler.ageFallback ?? 30;
  const [by, bm, bd] = traveler.birthDate.split('-').map(Number);
  const [y, m, d] = date.split('-').map(Number);
  let age = y - by;
  if (m < bm || (m === bm && d < bd)) age--;
  return age;
}

export type FareAgeBand = 'infant' | 'child' | 'adult';
/** Letenky: infant < 2, dieťa 2–11, dospelý; LCC účtujú dieťa ako dospelého. */
export function fareBand(age: number): FareAgeBand {
  if (age < 2) return 'infant';
  if (age < 12) return 'child';
  return 'adult';
}

const ruleMatches = (r: PriceRule, age: number, variant?: string | null) =>
  (r.minAge == null || age >= r.minAge) &&
  (r.maxAge == null || age <= r.maxAge) &&
  (variant ? (r.variant ?? 'basic') === variant : r.isDefault !== false);

/** Prvé pravidlo per person, kde min ≤ vek ≤ max; bez pravidiel → 0. */
export function priceFor(
  poi: Pick<PoiInput, 'priceRules'>,
  traveler: TravelerInput,
  visitDate: string,
  variant?: string | null,
): Money | null {
  const age = ageOn(traveler, visitDate);
  const personRules = poi.priceRules.filter((r) => r.per === 'person');
  const rule =
    personRules.find((r) => ruleMatches(r, age, variant)) ??
    personRules.find((r) => ruleMatches(r, age, null));
  return rule?.price ?? null;
}

export type EntryBreakdown = {
  perTraveler: Record<string, number>;
  vehicle: number;
  group: number;
  total: number;
  source: Money['source'];
};

/** Vstupné zastávky: Σ per person + parkovné per vehicle + skupinové pravidlá. */
export function entryTotal(
  poi: Pick<PoiInput, 'priceRules' | 'parkingFee'>,
  travelers: TravelerInput[],
  visitDate: string,
  fx: Fx,
  opts: { vehicles?: number; variant?: string | null } = {},
): EntryBreakdown {
  const vehicles = opts.vehicles ?? 1;
  const perTraveler: Record<string, number> = {};
  const sources: Money['source'][] = [];
  for (const t of travelers) {
    const m = priceFor(poi, t, visitDate, opts.variant);
    perTraveler[t.id] = m ? toEur(m, fx) : 0;
    if (m) sources.push(m.source);
  }
  let vehicle = 0;
  if (poi.parkingFee) {
    vehicle += toEur(poi.parkingFee, fx) * vehicles;
    sources.push(poi.parkingFee.source);
  }
  for (const r of poi.priceRules.filter((r) => r.per === 'vehicle')) {
    if (opts.variant && (r.variant ?? 'basic') !== opts.variant) continue;
    vehicle += toEur(r.price, fx) * vehicles;
    sources.push(r.price.source);
  }
  let group = 0;
  for (const r of poi.priceRules.filter((r) => r.per === 'group')) {
    if (opts.variant && (r.variant ?? 'basic') !== opts.variant) continue;
    group += toEur(r.price, fx);
    sources.push(r.price.source);
  }
  const people = Object.values(perTraveler).reduce((a, b) => a + b, 0);
  const worst = sources.reduce<Money['source']>((acc, s) => (rank(s) > rank(acc) ? s : acc), 'manual');
  return {
    perTraveler,
    vehicle,
    group,
    total: Math.round((people + vehicle + group) * 100) / 100,
    source: sources.length ? worst : 'seed',
  };
}
const rank = (s: Money['source']) => ({ manual: 0, api: 1, seed: 2, estimate: 3 })[s];
