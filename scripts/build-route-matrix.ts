import 'dotenv/config';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Predpočítaná matica trás (K1 z auditu): všetky seed POI + kempy + KEF + centroidy regiónov → OSRM `table`
 * (verejný server, 1 request, ≤ 100 bodov). Výstup `seed/route_matrix.json` sa commituje; `pnpm seed` ho nahrá.
 * Pri výpadku OSRM ostáva Haversine × 1,25 (surface 'estimate') zo seedu. Spustenie: pnpm matrix:build
 */
type Pt = { key: string; lat: number; lng: number };
const read = <T>(f: string): T => JSON.parse(readFileSync(path.join(process.cwd(), 'seed', f), 'utf8')) as T;

async function main() {
  const pois = read<{ slug: string; lat: number; lng: number }[]>('pois.json');
  const camps = read<{ slug: string; lat: number; lng: number }[]>('campsites.json');
  const regions = read<{ id: string; centroid_lat: number; centroid_lng: number }[]>('regions.json');
  const points: Pt[] = [
    ...pois.map((p) => ({ key: p.slug, lat: p.lat, lng: p.lng })),
    ...camps.map((p) => ({ key: p.slug, lat: p.lat, lng: p.lng })),
    ...regions.map((r) => ({ key: `region:${r.id}`, lat: r.centroid_lat, lng: r.centroid_lng })),
    { key: 'kef', lat: 63.985, lng: -22.6056 },
  ];
  if (points.length > 100) throw new Error(`OSRM table zvládne 100 bodov, máme ${points.length}`);
  const coords = points.map((p) => `${p.lng},${p.lat}`).join(';');
  const url = `https://router.project-osrm.org/table/v1/driving/${coords}?annotations=distance,duration`;
  const t0 = Date.now();
  const res = await fetch(url, { headers: { 'User-Agent': 'IslandPlanner/0.1 (route matrix build)' } });
  if (!res.ok) throw new Error(`OSRM ${res.status}`);
  const data = (await res.json()) as { code: string; distances: (number | null)[][]; durations: (number | null)[][] };
  if (data.code !== 'Ok') throw new Error(`OSRM code ${data.code}`);
  const rows: { from: string; to: string; km: number; min: number }[] = [];
  let missing = 0;
  points.forEach((a, i) =>
    points.forEach((b, j) => {
      if (i === j) return;
      const d = data.distances[i]?.[j];
      const t = data.durations[i]?.[j];
      if (d == null || t == null) {
        missing++;
        return;
      }
      rows.push({ from: a.key, to: b.key, km: Math.round(d / 100) / 10, min: Math.round(t / 60) });
    }),
  );
  const out = { source: 'osrm', builtAt: new Date().toISOString().slice(0, 10), points: points.length, rows };
  writeFileSync(path.join(process.cwd(), 'seed', 'route_matrix.json'), JSON.stringify(out));
  console.log(`✓ route_matrix.json: ${points.length} bodov, ${rows.length} dvojíc, ${missing} bez trasy, ${Date.now() - t0} ms`);
}

void main();
