import { defineConnector, httpJson } from './base';
import fixture from './fixtures/gasvaktin.json';

export type FuelQuery = Record<string, never>;
export type FuelStation = {
  key: string;
  name: string;
  company: string;
  lat: number;
  lng: number;
  petrol: number | null;
  diesel: number | null;
};
export type FuelResult = {
  /** medián ISK/l cez všetky stanice s cenou */
  petrol: number;
  diesel: number;
  min: { petrol: number; diesel: number };
  stations: FuelStation[];
  stationCount: number;
};

type Raw = {
  stations: Array<{
    key: string;
    name: string;
    company: string;
    geo: { lat: number; lon: number };
    bensin95: number | null;
    diesel: number | null;
  }>;
};

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round(((s[m - 1] + s[m]) / 2) * 10) / 10;
};

export const normalizeFuel = (raw: Raw): FuelResult => {
  const stations = raw.stations.map((s) => ({
    key: s.key,
    name: s.name,
    company: s.company,
    lat: s.geo.lat,
    lng: s.geo.lon,
    petrol: s.bensin95,
    diesel: s.diesel,
  }));
  const p = stations.map((s) => s.petrol).filter((x): x is number => typeof x === 'number' && x > 0);
  const d = stations.map((s) => s.diesel).filter((x): x is number => typeof x === 'number' && x > 0);
  return {
    petrol: median(p),
    diesel: median(d),
    min: { petrol: Math.min(...p), diesel: Math.min(...d) },
    stations,
    stationCount: stations.length,
  };
};

/** Ceny paliva po staniciach (open data, každých 15 min). */
export const gasvaktin = defineConnector<FuelQuery, FuelResult>({
  id: 'gasvaktin',
  steps: [3],
  ttlSec: 7 * 24 * 3600,
  legal: 'open-data',
  verifiedAt: '2026-09-20',
  sourceUrl: 'https://github.com/gasvaktin/gasvaktin',
  fallback: 'seed',
  cacheKey: () => 'all',
  request: async (_q, ctx) =>
    normalizeFuel(
      await httpJson<Raw>(
        ctx,
        'https://raw.githubusercontent.com/gasvaktin/gasvaktin/master/vaktin/gas.json',
      ),
    ),
  fixture: () => normalizeFuel(fixture as Raw),
  healthQuery: () => ({}),
});
