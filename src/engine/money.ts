import type { Confidence, Money, MoneySource } from './types';

export const round2 = (n: number) => Math.round(n * 100) / 100;

export const money = (amount: number, source: MoneySource, currency = 'EUR', provider?: string): Money => ({
  amount: round2(amount),
  currency,
  source,
  ...(provider ? { provider } : {}),
});
export const eur = (amount: number, source: MoneySource = 'estimate') => money(amount, source);
export const isk = (amount: number, source: MoneySource = 'seed') => money(amount, source, 'ISK');

export type Fx = { ISK_EUR: number };

/** Prevod na EUR podľa kurzu zo snapshotu (1 ISK = ISK_EUR €). */
export function toEur(m: Money | null | undefined, fx: Fx): number {
  if (!m) return 0;
  if (m.currency === 'EUR') return m.amount;
  if (m.currency === 'ISK') return round2(m.amount * fx.ISK_EUR);
  throw new Error(`Nepodporovaná mena ${m.currency}`);
}

const SOURCE_RANK: Record<MoneySource, number> = { manual: 0, api: 1, seed: 2, estimate: 3 };

/** Pôvod sa propaguje: najslabší zdroj vyhráva (estimate > seed > api > manual). */
export function mergeSource(...sources: (MoneySource | undefined | null)[]): MoneySource {
  let worst: MoneySource = 'manual';
  for (const s of sources) if (s && SOURCE_RANK[s] > SOURCE_RANK[worst]) worst = s;
  return worst;
}

export function confidenceOf(source: MoneySource): Confidence {
  if (source === 'manual') return 'exact';
  if (source === 'api') return 'cached';
  return 'estimate';
}

const CONF_RANK: Record<Confidence, number> = { exact: 0, cached: 1, estimate: 2 };
export function mergeConfidence(...cs: Confidence[]): Confidence {
  let worst: Confidence = 'exact';
  for (const c of cs) if (CONF_RANK[c] > CONF_RANK[worst]) worst = c;
  return worst;
}

/** Rozsah pre odhad: ±15 % (docs/05 „rozsah min–max podľa podielu odhadov"). */
export const ESTIMATE_SPREAD = 0.15;
export function rangeFor(amount: number, confidence: Confidence): { min: number; max: number } {
  if (confidence === 'estimate')
    return { min: round2(amount * (1 - ESTIMATE_SPREAD)), max: round2(amount * (1 + ESTIMATE_SPREAD)) };
  return { min: amount, max: amount };
}

export const sum = (xs: number[]) => round2(xs.reduce((a, b) => a + b, 0));
