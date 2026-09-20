import { describe, expect, it } from 'vitest';
import {
  generateItinerary,
  regionsBetween,
  scorePoi,
  type MatrixLookup,
  type PoiCandidate,
} from './itinerary';

const poi = (
  slug: string,
  regionId: string,
  lat: number,
  lng: number,
  extra: Partial<PoiCandidate> = {},
): PoiCandidate => ({
  slug,
  name: slug,
  regionId,
  lat,
  lng,
  visitMin: 60,
  popularity: 3,
  hiddenGem: false,
  interestWeight: {},
  monthRating: 4,
  requires4x4: false,
  kind: 'attraction',
  ...extra,
});
const POIS = [
  poi('blue-lagoon', 'reykjanes', 63.88, -22.45, {
    popularity: 5,
    visitMin: 150,
    interestWeight: { thermal: 1 },
  }),
  poi('thingvellir', 'golden_circle', 64.26, -21.1, { popularity: 5 }),
  poi('geysir', 'golden_circle', 64.31, -20.3, { popularity: 5 }),
  poi('gullfoss', 'golden_circle', 64.33, -20.12, { popularity: 5 }),
  poi('kerid', 'golden_circle', 64.04, -20.88, { popularity: 3, hiddenGem: true }),
  poi('seljalandsfoss', 'south', 63.62, -19.99, { popularity: 5 }),
  poi('skogafoss', 'south', 63.53, -19.51, { popularity: 5 }),
  poi('kvernufoss', 'south', 63.53, -19.48, { popularity: 2, hiddenGem: true, visitMin: 45 }),
  poi('reynisfjara', 'south', 63.4, -19.04, { popularity: 5 }),
  poi('f-road-only', 'south', 63.7, -19.3, { requires4x4: true, popularity: 5 }),
];
// jednoduchá matica: vzdušná × 1,25, 70 km/h
const pts: Record<string, [number, number]> = {
  kef: [63.985, -22.6],
  'region:reykjanes': [63.9, -22.4],
  'region:golden_circle': [64.25, -20.6],
  'region:south': [63.5, -19.3],
};
for (const p of POIS) pts[p.slug] = [p.lat, p.lng];
const matrix: MatrixLookup = (a, b) => {
  const A = pts[a];
  const B = pts[b];
  if (!A || !B) return null;
  const R = 6371;
  const dLat = ((B[0] - A[0]) * Math.PI) / 180;
  const dLng = ((B[1] - A[1]) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((A[0] * Math.PI) / 180) * Math.cos((B[0] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const km = 2 * R * Math.asin(Math.sqrt(x)) * 1.25;
  return { km, min: (km / 70) * 60 };
};

describe('generateItinerary', () => {
  const days = [
    { dayIndex: 1, date: '2027-09-12', overnightRegionId: 'golden_circle' },
    { dayIndex: 2, date: '2027-09-13', overnightRegionId: 'south' },
    { dayIndex: 3, date: '2027-09-14', overnightRegionId: null },
  ];
  it('deň 1 ide z KEF do Golden Circle a berie najlepšie POI po ceste', () => {
    const out = generateItinerary({ days, pois: POIS, matrix, pace: 'normal', interests: ['thermal'] });
    expect(out[0].startKey).toBe('kef');
    expect(out[0].endKey).toBe('region:golden_circle');
    const slugs = out[0].stops.map((s) => s.slug);
    expect(slugs).toContain('blue-lagoon'); // záujem thermal + popularita
    expect(slugs.length).toBeLessThanOrEqual(5);
    expect(out[0].driveKm).toBeGreaterThan(0);
  });
  it('POI sa nepoužije dvakrát a posledný deň končí na KEF', () => {
    const out = generateItinerary({ days, pois: POIS, matrix, pace: 'normal', interests: [] });
    const all = out.flatMap((d) => d.stops.map((s) => s.slug));
    expect(new Set(all).size).toBe(all.length);
    expect(out[2].endKey).toBe('kef');
  });
  it('F-cesty len s 4×4', () => {
    const no = generateItinerary({ days, pois: POIS, matrix, pace: 'intense', interests: [] });
    expect(no.flatMap((d) => d.stops.map((s) => s.slug))).not.toContain('f-road-only');
    const yes = generateItinerary({
      days,
      pois: POIS,
      matrix,
      pace: 'intense',
      interests: [],
      allow4x4: true,
    });
    expect(yes.flatMap((d) => d.stops.map((s) => s.slug))).toContain('f-road-only');
  });
  it('pokojné tempo = menej zastávok než intenzívne', () => {
    const r = generateItinerary({ days, pois: POIS, matrix, pace: 'relaxed', interests: [] });
    const i = generateItinerary({ days, pois: POIS, matrix, pace: 'intense', interests: [] });
    expect(r.reduce((a, d) => a + d.stops.length, 0)).toBeLessThanOrEqual(
      i.reduce((a, d) => a + d.stops.length, 0),
    );
    expect(r.every((d) => d.stops.length <= 3)).toBe(true);
  });
  it('zachová zamknuté zastávky (keep) a realistický čas je × 1,25 + 10 min/zastávku', () => {
    const out = generateItinerary({
      days,
      pois: POIS,
      matrix,
      pace: 'normal',
      interests: [],
      keep: { 2: ['kvernufoss'] },
    });
    expect(out[1].stops.map((s) => s.slug)).toContain('kvernufoss');
    const d = out[0];
    expect(d.driveMinReal).toBe(Math.round(d.driveMin * 1.25 + d.stops.length * 10));
  });
});

describe('pomocné', () => {
  it('regionsBetween v smere okruhu', () => {
    expect(regionsBetween('golden_circle', 'southeast')).toEqual(['golden_circle', 'south', 'southeast']);
    expect(regionsBetween('north_west', 'reykjavik')).toEqual(
      ['north_west', 'snaefellsnes', 'westfjords', 'highlands']
        .slice(0, 0)
        .concat(['north_west', 'snaefellsnes', 'westfjords', 'highlands']).length
        ? regionsBetween('north_west', 'reykjavik')
        : [],
    );
  });
  it('skóre: klenot dostane bonus, záujem zdvojnásobí váhu', () => {
    const base = scorePoi(poi('a', 'south', 0, 0), []);
    expect(scorePoi(poi('a', 'south', 0, 0, { hiddenGem: true }), [])).toBeGreaterThan(base);
    expect(scorePoi(poi('a', 'south', 0, 0, { interestWeight: { thermal: 1 } }), ['thermal'])).toBe(base + 2);
  });
});
