import { defineConnector, httpJson } from './base';

export type RouteQuery = { coords: [number, number][] /* [lng, lat] */ };
export type RouteResult = {
  km: number;
  min: number;
  /** GeoJSON LineString súradnice [lng, lat] */
  line: [number, number][];
};

type Raw = {
  code: string;
  routes: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[];
};

/**
 * Geometria trasy dňa pre mapu (verejný OSRM, bez kľúča, ≤ 1 req/s). Matica km/min je predpočítaná (route_matrix);
 * toto sa volá len pri kreslení a výsledok sa drží 30 dní (cesty sa nemenia).
 */
export const osrm = defineConnector<RouteQuery, RouteResult>({
  id: 'osrm',
  steps: [5],
  ttlSec: 30 * 24 * 3600,
  rateLimit: { perSec: 1, perDay: 500 },
  legal: 'open-data',
  verifiedAt: '2026-09-20',
  sourceUrl: 'https://router.project-osrm.org',
  cacheKey: (q) => q.coords.map(([lng, lat]) => `${lng.toFixed(4)},${lat.toFixed(4)}`).join(';'),
  request: async (q, ctx) => {
    if (q.coords.length < 2) return { km: 0, min: 0, line: q.coords };
    const path = q.coords.map(([lng, lat]) => `${lng},${lat}`).join(';');
    const raw = await httpJson<Raw>(
      ctx,
      `https://router.project-osrm.org/route/v1/driving/${path}?overview=simplified&geometries=geojson`,
    );
    const r = raw.routes?.[0];
    if (raw.code !== 'Ok' || !r) throw new Error(`OSRM ${raw.code}`);
    return {
      km: Math.round(r.distance / 100) / 10,
      min: Math.round(r.duration / 60),
      line: r.geometry.coordinates,
    };
  },
  healthQuery: () => ({
    coords: [
      [-22.6056, 63.985],
      [-21.8722, 64.1451],
    ],
  }),
});
