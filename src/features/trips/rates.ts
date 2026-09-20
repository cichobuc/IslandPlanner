import 'server-only';
import { frankfurter, gasvaktin } from '@/connectors';
import { initConnectors } from '@/connectors/server';
import { FUEL_SEED_ISK } from '@/engine/presets';
import type { MoneySource } from '@/engine/types';
import { DEFAULT_FX } from './snapshot';

export type Rates = {
  fx: { ISK_EUR: number; date: string; source: MoneySource };
  fuel: { petrol: number; diesel: number; source: MoneySource; stationCount?: number };
};

/** Kurz EUR→ISK (frankfurter) a cena paliva (gasvaktin), oba cez cache konektorov; pri výpadku seed. */
export async function getRates(): Promise<Rates> {
  initConnectors();
  const [fxR, fuelR] = await Promise.all([
    frankfurter.fetch({ base: 'EUR', quote: 'ISK' }).catch(() => null),
    gasvaktin.fetch({}).catch(() => null),
  ]);
  const fx =
    fxR?.ok && fxR.data.rate > 0
      ? { ISK_EUR: Math.round((1 / fxR.data.rate) * 1e6) / 1e6, date: fxR.data.date, source: 'api' as const }
      : { ...DEFAULT_FX, source: 'seed' as const };
  const fuel =
    fuelR?.ok && fuelR.data.petrol > 0
      ? { petrol: fuelR.data.petrol, diesel: fuelR.data.diesel, source: 'api' as const, stationCount: fuelR.data.stationCount }
      : { ...FUEL_SEED_ISK, source: 'seed' as const };
  return { fx, fuel };
}
