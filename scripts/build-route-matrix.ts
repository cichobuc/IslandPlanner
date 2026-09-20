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
  // OSRM table zvládne 100 súradníc na request → bloky 50 × 50 (sources/destinations), 1 req/s
  const CHUNK = 50;
  const chunks: Pt[][] = [];
  for (let i = 0; i < points.length; i += CHUNK) chunks.push(points.slice(i, i + CHUNK));
  const t0 = Date.now();
  const rows: { from: string; to: string; km: number; min: number }[] = [];
  let missing = 0;
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  for (let ci = 0; ci < chunks.length; ci++)
    for (let cj = 0; cj < chunks.length; cj++) {
      const A = chunks[ci];
      const B = ci === cj ? [] : chunks[cj];
      const all = [...A, ...B];
      const coords = all.map((p) => `${p.lng},${p.lat}`).join(';');
      const sources = A.map((_, i) => i).join(';');
      const destinations = (ci === cj ? A : B).map((_, i) => (ci === cj ? i : A.length + i)).join(';');
      const url = `https://router.project-osrm.org/table/v1/driving/${coords}?annotations=distance,duration&sources=${sources}&destinations=${destinations}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'IslandPlanner/0.1 (route matrix build)' } });
      if (!res.ok) throw new Error(`OSRM ${res.status} (blok ${ci},${cj})`);
      const data = (await res.json()) as {
        code: string;
        distances: (number | null)[][];
        durations: (number | null)[][];
      };
      if (data.code !== 'Ok') throw new Error(`OSRM code ${data.code}`);
      const dest = ci === cj ? A : B;
      A.forEach((a, i) =>
        dest.forEach((b, j) => {
          if (a.key === b.key) return;
          const d = data.distances[i]?.[j];
          const t = data.durations[i]?.[j];
          if (d == null || t == null) {
            missing++;
            return;
          }
          rows.push({ from: a.key, to: b.key, km: Math.round(d / 100) / 10, min: Math.round(t / 60) });
        }),
      );
      await sleep(1100);
    }
  const out = { source: 'osrm', builtAt: new Date().toISOString().slice(0, 10), points: points.length, rows };
  writeFileSync(path.join(process.cwd(), 'seed', 'route_matrix.json'), JSON.stringify(out));
  console.log(
    `✓ route_matrix.json: ${points.length} bodov, ${rows.length} dvojíc, ${missing} bez trasy, ${Date.now() - t0} ms`,
  );
}

void main();
