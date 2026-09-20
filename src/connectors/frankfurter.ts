import { defineConnector, httpJson } from './base';
import fixture from './fixtures/frankfurter.json';

export type FxQuery = { base?: string; quote?: string };
export type FxResult = { base: string; quote: string; rate: number; date: string };

type Raw = { amount: number; base: string; date: string; rates: Record<string, number> };

const normalize = (raw: Raw, quote: string): FxResult => {
  const rate = raw.rates[quote];
  if (typeof rate !== 'number') throw new Error(`Kurz ${quote} chýba v odpovedi`);
  return { base: raw.base, quote, rate, date: raw.date };
};

/** Kurz ECB (denne ~ 16:00 CET), bez kľúča. */
export const frankfurter = defineConnector<FxQuery, FxResult>({
  id: 'frankfurter',
  steps: [8],
  ttlSec: 24 * 3600,
  legal: 'open-data',
  verifiedAt: '2026-09-20',
  sourceUrl: 'https://frankfurter.dev',
  cacheKey: (q) => `${q.base ?? 'EUR'}-${q.quote ?? 'ISK'}`,
  request: async (q, ctx) => {
    const base = q.base ?? 'EUR';
    const quote = q.quote ?? 'ISK';
    const raw = await httpJson<Raw>(
      ctx,
      `https://api.frankfurter.dev/v1/latest?base=${base}&symbols=${quote}`,
    );
    return normalize(raw, quote);
  },
  fixture: (q) => normalize(fixture as Raw, q.quote ?? 'ISK'),
  healthQuery: () => ({ base: 'EUR', quote: 'ISK' }),
});
