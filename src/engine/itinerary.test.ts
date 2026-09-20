import { describe, expect, it } from 'vitest';
import {
  fmtClock,
  generateItinerary,
  orderStops,
  regionsBetween,
  scorePoi,
  sunTimes,
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
  poi('blue-lagoon', 'reykjanes', 63.8804, -22.4495, {
    popularity: 5,
    visitMin: 150,
    interestWeight: { thermal: 1 },
  }),
  poi('thingvellir', 'golden_circle', 64.2661, -21.0958, { popularity: 5, visitMin: 105 }),
  poi('geysir', 'golden_circle', 64.3105, -20.3024, { popularity: 5, visitMin: 45 }),
  poi('gullfoss', 'golden_circle', 64.3271, -20.1199, { popularity: 5, visitMin: 45 }),
  poi('kerid', 'golden_circle', 64.0413, -20.8851, { popularity: 3, hiddenGem: true, visitMin: 30 }),
  poi('seljalandsfoss', 'south', 63.6156, -19.9886, { popularity: 5 }),
  poi('skogafoss', 'south', 63.5321, -19.5114, { popularity: 5 }),
  poi('kvernufoss', 'south', 63.5285, -19.4836, { popularity: 2, hiddenGem: true, visitMin: 45 }),
  poi('reynisfjara', 'south', 63.4045, -19.0446, { popularity: 5, visitMin: 45 }),
  poi('f-road-only', 'south', 63.7, -19.3, { requires4x4: true, popularity: 5 }),
];
const ANCHORS: Record<string, { lat: number; lng: number }> = {
  kef: { lat: 63.985, lng: -22.6056 },
  'region:reykjanes': { lat: 63.9, lng: -22.4 },
  'region:golden_circle': { lat: 64.25, lng: -20.6 },
  'region:south': { lat: 63.5, lng: -19.3 },
};
const pts: Record<string, [number, number]> = Object.fromEntries(
  Object.entries(ANCHORS).map(([k, v]) => [k, [v.lat, v.lng]]),
);
for (const p of POIS) pts[p.slug] = [p.lat, p.lng];
// jednoduchá matica: vzdušná × 1,25, 70 km/h
const matrix: MatrixLookup = (a, b) => {
  const A = pts[a];
  const B = pts[b];
  if (!A || !B) return null;
  if (a === b) return { km: 0, min: 0 };
  const R = 6371;
  const dLat = ((B[0] - A[0]) * Math.PI) / 180;
  const dLng = ((B[1] - A[1]) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((A[0] * Math.PI) / 180) * Math.cos((B[0] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const km = 2 * R * Math.asin(Math.sqrt(x)) * 1.25;
  return { km, min: (km / 70) * 60 };
};
const days = [
  { dayIndex: 1, date: '2027-09-12', overnightRegionId: 'golden_circle', startMin: 10 * 60 + 15 },
  { dayIndex: 2, date: '2027-09-13', overnightRegionId: 'south' },
  { dayIndex: 3, date: '2027-09-14', overnightRegionId: null, endMin: 9 * 60 },
];
const base = { days, pois: POIS, matrix, anchorPoints: ANCHORS, interests: [] as string[] };

describe('generateItinerary – globálne priradenie', () => {
  it('miesta idú do dňa s najmenšou obchádzkou: Þingvellir deň 1, juh nie v dni 1, Golden Circle nie na konci', () => {
    const out = generateItinerary({ ...base, pace: 'normal' });
    const d1 = out[0].stops.map((s) => s.slug);
    const d3 = out[2].stops.map((s) => s.slug);
    expect(d1).toContain('thingvellir');
    expect(d1.some((s) => ['seljalandsfoss', 'skogafoss', 'reynisfjara'].includes(s))).toBe(false);
    expect(d3.some((s) => ['thingvellir', 'geysir', 'gullfoss', 'kerid'].includes(s))).toBe(false);
    // top miesta sa rozložia – žiadny deň nemá všetko
    expect(out[0].stops.length).toBeGreaterThan(0);
    expect(out[1].stops.length).toBeGreaterThan(0);
  });
  it('POI sa nepoužije dvakrát, posledný deň končí na KEF a rešpektuje odlet', () => {
    const out = generateItinerary({ ...base, pace: 'normal' });
    const all = out.flatMap((d) => d.stops.map((s) => s.slug));
    expect(new Set(all).size).toBe(all.length);
    expect(out[2].endKey).toBe('kef');
    // odlet skoro ráno: žiadne zastávky a varovanie, že presun z juhu na KEF sa do limitu nezmestí
    expect(out[2].stops).toHaveLength(0);
    expect(out[2].warnings.join(' ')).toMatch(/po limite/);
  });
  it('F-cesty len s 4×4', () => {
    expect(
      generateItinerary({ ...base, pace: 'intense' }).flatMap((d) => d.stops.map((s) => s.slug)),
    ).not.toContain('f-road-only');
    expect(
      generateItinerary({ ...base, pace: 'intense', allow4x4: true }).flatMap((d) =>
        d.stops.map((s) => s.slug),
      ),
    ).toContain('f-road-only');
  });
  it('pokojné tempo = menej zastávok než intenzívne', () => {
    const r = generateItinerary({ ...base, pace: 'relaxed' });
    const i = generateItinerary({ ...base, pace: 'intense' });
    expect(r.reduce((a, d) => a + d.stops.length, 0)).toBeLessThanOrEqual(
      i.reduce((a, d) => a + d.stops.length, 0),
    );
    expect(r.every((d) => d.stops.length <= 3)).toBe(true);
  });
  it('zachová zamknuté zastávky (keep)', () => {
    const out = generateItinerary({ ...base, pace: 'normal', keep: { 2: ['kvernufoss'] } });
    expect(out[1].stops.map((s) => s.slug)).toContain('kvernufoss');
  });
});

describe('poradie a časy', () => {
  it('poradie pozdĺž smeru jazdy – bez cúvania (projekcia rastie)', () => {
    const list = [POIS[3], POIS[1], POIS[4], POIS[2]]; // gullfoss, thingvellir, kerid, geysir – náročky pomiešané
    const seq = orderStops('region:golden_circle', 'region:south', list, matrix, {
      start: ANCHORS['region:golden_circle'],
      end: ANCHORS['region:south'],
    });
    // Kerið je najbližšie k juhu → posledný; celková jazda nie je horšia než pri poradí podľa projekcie
    expect(seq[seq.length - 1].slug).toBe('kerid');
    const cost = (s: PoiCandidate[]) =>
      ['region:golden_circle', ...s.map((x) => x.slug), 'region:south'].reduce(
        (a, k, i, arr) => (i ? a + matrix(arr[i - 1], k)!.min : 0),
        0,
      );
    expect(cost(seq)).toBeLessThanOrEqual(cost([POIS[1], POIS[2], POIS[3], POIS[4]]) + 0.01);
  });
  it('sloty: príchody rastú, prvý = štart + jazda × 1,25 + 10, štítky musí/voliteľné', () => {
    const out = generateItinerary({ ...base, pace: 'normal' });
    const d = out[1];
    for (let i = 1; i < d.stops.length; i++)
      expect(d.stops[i].arriveMin).toBeGreaterThan(d.stops[i - 1].arriveMin);
    expect(
      Math.abs(d.stops[0].arriveMin - (d.startMin + d.stops[0].driveMinFromPrev * 1.25 + 10)),
    ).toBeLessThanOrEqual(1);
    expect(d.stops.some((s) => s.must)).toBe(true);
    expect(d.driveMinReal).toBe(Math.round(d.driveMin * 1.25 + d.stops.length * 10));
  });
  it('nič po západe slnka; slnko v septembri ~ 06:40–20:20 (1. 9.) a kratšie ku koncu', () => {
    const out = generateItinerary({ ...base, pace: 'intense' });
    for (const d of out) for (const s of d.stops) expect(s.afterSunset).toBe(false);
    const a = sunTimes('2027-09-01');
    const b = sunTimes('2027-09-30');
    expect(fmtClock(a.sunset) > fmtClock(b.sunset)).toBe(true);
    expect(a.sunset - a.sunrise).toBeGreaterThan(b.sunset - b.sunrise);
  });
  it('otváracie hodiny: zatvorené miesto sa nezaradí', () => {
    const closed = poi('night-only', 'south', 63.5, -19.4, {
      popularity: 5,
      openFrom: '21:00',
      openUntil: '23:00',
    });
    const out = generateItinerary({ ...base, pois: [...POIS, closed], pace: 'intense' });
    expect(out.flatMap((d) => d.stops.map((s) => s.slug))).not.toContain('night-only');
  });
  it('≥ 8 dní → jeden rezervný deň s polovičnou kapacitou', () => {
    const many = Array.from({ length: 9 }, (_, i) => ({
      dayIndex: i + 1,
      date: `2027-09-${String(12 + i).padStart(2, '0')}`,
      overnightRegionId: i === 8 ? null : i < 3 ? 'golden_circle' : 'south',
    }));
    const out = generateItinerary({ ...base, days: many, pace: 'normal' });
    const reserve = out.filter((d) => d.reserve);
    expect(reserve).toHaveLength(1);
    expect(reserve[0].stops.length).toBeLessThanOrEqual(3);
    expect(reserve[0].warnings[0]).toMatch(/Rezervný/);
    expect(
      generateItinerary({ ...base, days: many, pace: 'normal', reserveDay: false }).some((d) => d.reserve),
    ).toBe(false);
  });
});

describe('pomocné', () => {
  it('regionsBetween v smere okruhu', () => {
    expect(regionsBetween('golden_circle', 'southeast')).toEqual(['golden_circle', 'south', 'southeast']);
    expect(regionsBetween(null, 'south')).toEqual(['south']);
    // spiatočná cesta zo severu ide cez západ (cyklicky), nie späť cez východ
    expect(regionsBetween('north_west', 'reykjavik')).toEqual(['north_west', 'snaefellsnes', 'reykjanes', 'reykjavik']);
    expect(regionsBetween('south', 'south')).toEqual(['south']);
  });
  it('skóre: klenot dostane bonus, záujem zdvojnásobí váhu', () => {
    const b = scorePoi(poi('a', 'south', 0, 0), []);
    expect(scorePoi(poi('a', 'south', 0, 0, { hiddenGem: true }), [])).toBeGreaterThan(b);
    expect(scorePoi(poi('a', 'south', 0, 0, { interestWeight: { thermal: 1 } }), ['thermal'])).toBe(b + 2);
  });
});
