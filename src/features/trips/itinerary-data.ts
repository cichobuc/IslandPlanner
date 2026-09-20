import 'server-only';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { osrm } from '@/connectors';
import { initConnectors } from '@/connectors/server';
import { getDb, schema } from '@/db';
import { ageOn, entryTotal } from '@/engine/ageRules';
import { fmtClock, fmtH, stars, sunTimes, valueForMoney } from '@/engine/itinerary';
import type { Money, PriceRule } from '@/engine/types';
import { getRates } from './rates';

export type StopLite = {
  stopId: string;
  slug: string;
  name: string;
  kind: string;
  order: number;
  stayMin: number;
  visitRange: string | null;
  driveKmFromPrev: number;
  driveMinFromPrev: number;
  entryGroup: number;
  parkingEur: number;
  perTraveler: { name: string; age: number; price: number }[];
  droneStatus: string;
  droneNote: string | null;
  hiddenGem: boolean;
  isManual: boolean;
  skip: boolean;
  must: boolean;
  arrive: string | null; // HH:MM (KEF)
  lat: number;
  lng: number;
  description: string | null;
  tips: string | null;
  bookingRequired: boolean;
  bookingUrl: string | null;
  seasonNote: string | null;
  monthRating: number | null;
  regionName: string;
  walkKm: number | null;
  difficulty: string | null;
  entryNote: string | null;
  stars: number;
  entryPpEur: number;
  valuePer10Eur: number | null;
  cheaper: { slug: string; name: string; entryPpEur: number } | null;
};

export type DayLite = {
  dayId: string;
  dayIndex: number;
  date: string;
  dow: string;
  regionId: string | null;
  regionName: string;
  locked: boolean;
  driveKm: number;
  driveMin: number;
  driveMinReal: number;
  warnings: string[];
  overnight: { regionName: string; lodgingName: string | null; lat: number; lng: number } | null;
  reserve: boolean;
  sunset: string;
  stops: StopLite[];
  entryGroup: number;
  startLatLng: [number, number];
  line: [number, number][] | null; // [lng, lat]
};

export type CatalogPoi = {
  slug: string;
  name: string;
  kind: string;
  regionId: string | null;
  regionName: string;
  lat: number;
  lng: number;
  visitMin: number;
  entryGroup: number;
  hiddenGem: boolean;
  droneStatus: string;
  monthRating: number | null;
  popularity: number;
  description: string | null;
  inPlanDay: number | null;
  stars: number;
  entryPpEur: number;
  valuePer10Eur: number | null;
  cheaper: { slug: string; name: string; entryPpEur: number } | null;
};

const DOW = ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So'];
const KEF: [number, number] = [63.985, -22.6056];

/** Dni + zastávky scenára `drive` s vstupným podľa veku, nocami a (voliteľne) geometriou trasy z OSRM. */
export async function loadItinerary(tripId: string, opts: { geometry?: boolean } = {}) {
  const db = getDb();
  const [trip] = await db.select().from(schema.trips).where(eq(schema.trips.id, tripId)).limit(1);
  if (!trip) throw new Error('Cesta neexistuje');
  const scenario = trip.transportMode === 'camper' ? 'camper' : 'car';
  const [days, travelers, regions, rates, pois, rules, stays] = await Promise.all([
    db
      .select()
      .from(schema.itineraryDays)
      .where(and(eq(schema.itineraryDays.tripId, tripId), eq(schema.itineraryDays.scenarioKey, 'drive')))
      .orderBy(asc(schema.itineraryDays.dayIndex)),
    db
      .select()
      .from(schema.travelers)
      .where(eq(schema.travelers.tripId, tripId))
      .orderBy(asc(schema.travelers.sortOrder)),
    db.select().from(schema.regions),
    getRates(),
    db.select().from(schema.pois),
    db.select().from(schema.poiPriceRules),
    db
      .select()
      .from(schema.lodgingStays)
      .where(and(eq(schema.lodgingStays.tripId, tripId), eq(schema.lodgingStays.scenarioKey, scenario))),
  ]);
  const dayIds = days.map((d) => d.id);
  const stops = dayIds.length
    ? await db
        .select()
        .from(schema.itineraryStops)
        .where(inArray(schema.itineraryStops.dayId, dayIds))
        .orderBy(asc(schema.itineraryStops.order))
    : [];
  const optionIds = stays.map((s) => s.lodgingOptionId).filter((x): x is string => Boolean(x));
  const options = optionIds.length
    ? await db.select().from(schema.lodgingOptions).where(inArray(schema.lodgingOptions.id, optionIds))
    : [];
  const regionById = new Map(regions.map((r) => [r.id, r]));
  const poiById = new Map(pois.map((p) => [p.id, p]));
  const rulesByPoi = new Map<string, PriceRule[]>();
  for (const r of rules)
    (rulesByPoi.get(r.poiId) ?? rulesByPoi.set(r.poiId, []).get(r.poiId)!).push({
      label: r.label,
      minAge: r.minAge,
      maxAge: r.maxAge,
      price: r.price,
      per: r.per,
      variant: r.variant,
      isDefault: r.isDefault,
    });
  const fx = { ISK_EUR: rates.fx.ISK_EUR };
  const month = Number((trip.startDate ?? trip.targetMonth).slice(5, 7));
  const travelerInputs = travelers.map((t) => ({
    id: t.id,
    name: t.name,
    birthDate: t.birthDate,
    ageFallback: t.ageFallback,
    isDriver: t.isDriver,
    hasCreditCard: t.hasCreditCard,
    bags: t.bags,
  }));
  const entryFor = (poi: (typeof pois)[number], date: string) => {
    const e = entryTotal(
      { priceRules: rulesByPoi.get(poi.id) ?? [], parkingFee: (poi.parkingFee as Money | null) ?? null },
      travelerInputs,
      date,
      fx,
    );
    return {
      total: Math.round(e.total),
      parking: Math.round(e.vehicle),
      perTraveler: travelers.map((t) => ({
        name: t.name,
        age: ageOn(t, date),
        price: Math.round(e.perTraveler[t.id] ?? 0),
      })),
    };
  };
  const adultEur = (poi: (typeof pois)[number]) => {
    const r = rules.filter(
      (x) => x.poiId === poi.id && x.per === 'person' && x.isDefault !== false && x.maxAge == null,
    );
    if (!r.length) return 0;
    const m = r[0].price;
    return Math.round((m.currency === 'ISK' ? m.amount * fx.ISK_EUR : m.amount) * 100) / 100;
  };
  const extras = (poi: (typeof pois)[number]) => {
    const eur = adultEur(poi);
    const alt = poi.cheaperAlternativePoiId ? pois.find((x) => x.id === poi.cheaperAlternativePoiId) : null;
    return {
      stars: stars({ popularity: poi.popularity ?? 3 }),
      entryPpEur: eur,
      valuePer10Eur: valueForMoney({ popularity: poi.popularity ?? 3, entryPpEur: eur }),
      cheaper: alt ? { slug: alt.slug, name: alt.nameSk ?? alt.name, entryPpEur: adultEur(alt) } : null,
    };
  };
  const monthRating = (p: (typeof pois)[number]) =>
    p.monthRating?.[String(month)] ?? (p.bestMonths?.length ? (p.bestMonths.includes(month) ? 4 : 2) : null);

  const inPlan = new Map<string, number>();
  const dayLites: DayLite[] = [];
  let prevEnd: [number, number] = KEF;
  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    const date = d.date ?? '';
    const dayStops: StopLite[] = stops
      .filter((s) => s.dayId === d.id)
      .flatMap((s): StopLite[] => {
        const p = s.poiId ? poiById.get(s.poiId) : null;
        if (!p) return [];
        inPlan.set(p.slug, d.dayIndex);
        const e = entryFor(p, date);
        return [
          {
            stopId: s.id,
            slug: p.slug,
            name: p.nameSk ?? p.name,
            kind: p.kind,
            order: s.order,
            stayMin: s.stayMin ?? p.visitMin ?? 60,
            visitRange: p.visitMinMin && p.visitMinMax ? `${p.visitMinMin}–${p.visitMinMax} min` : null,
            driveKmFromPrev: Number(s.driveKmFromPrev ?? 0),
            driveMinFromPrev: s.driveMinFromPrev ?? 0,
            entryGroup: e.total,
            parkingEur: e.parking,
            perTraveler: e.perTraveler,
            droneStatus: p.droneStatus ?? 'unknown',
            droneNote: p.droneNoteSk,
            hiddenGem: Boolean(p.hiddenGem),
            isManual: s.isManual,
            skip: s.skip,
            must: s.must,
            arrive: s.arriveAt
              ? new Intl.DateTimeFormat('sk-SK', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                  timeZone: 'UTC',
                }).format(s.arriveAt)
              : null,
            lat: Number(p.lat),
            lng: Number(p.lng),
            description: p.descriptionSk,
            tips: p.tipsSk,
            bookingRequired: Boolean(p.bookingRequired),
            bookingUrl: p.bookingUrl,
            seasonNote: p.seasonNoteSk,
            monthRating: monthRating(p),
            regionName: (p.regionId && regionById.get(p.regionId)?.nameSk) ?? '',
            walkKm: p.walkKm ? Number(p.walkKm) : null,
            difficulty: p.difficulty,
            entryNote: p.entryNoteSk,
            ...extras(p),
          },
        ];
      });
    const isLast = i === days.length - 1;
    const stay = stays.find((s) => s.nightIndex === d.dayIndex);
    const option = stay?.lodgingOptionId ? options.find((o) => o.id === stay.lodgingOptionId) : null;
    const region = d.overnightRegionId ? regionById.get(d.overnightRegionId) : null;
    const overnight = isLast
      ? null
      : {
          regionName: region?.nameSk ?? d.overnightRegionId ?? '—',
          lodgingName: option?.name ?? null,
          lat: option?.lat ? Number(option.lat) : region ? Number(region.centroidLat) : KEF[0],
          lng: option?.lng ? Number(option.lng) : region ? Number(region.centroidLng) : KEF[1],
        };
    const endLatLng: [number, number] = overnight ? [overnight.lat, overnight.lng] : KEF;
    const dayRegion = d.overnightRegionId ? regionById.get(d.overnightRegionId) : null;
    dayLites.push({
      dayId: d.id,
      dayIndex: d.dayIndex,
      date,
      dow: date ? DOW[new Date(date).getUTCDay()] : '',
      regionId: d.overnightRegionId,
      regionName: isLast ? 'odlet KEF' : (dayRegion?.nameSk ?? '—'),
      locked: d.locked,
      driveKm: Number(d.driveKm ?? 0),
      driveMin: d.driveMin ?? 0,
      driveMinReal: d.driveMinReal ?? Math.round((d.driveMin ?? 0) * 1.25),
      warnings: d.notes ? d.notes.split(' · ') : [],
      reserve: d.title === 'rezerva',
      sunset: fmtClock(sunTimes(date || '2027-09-15').sunset),
      overnight,
      stops: dayStops,
      entryGroup: dayStops.reduce((a, s) => a + (s.skip ? 0 : s.entryGroup), 0),
      startLatLng: prevEnd,
      line: null,
    });
    prevEnd = endLatLng;
  }

  if (opts.geometry) {
    initConnectors();
    for (const d of dayLites) {
      const pts: [number, number][] = [
        [d.startLatLng[1], d.startLatLng[0]],
        ...d.stops.filter((s) => !s.skip).map((s) => [s.lng, s.lat] as [number, number]),
        [d.overnight?.lng ?? KEF[1], d.overnight?.lat ?? KEF[0]],
      ];
      const r = await osrm.fetch({ coords: pts }).catch(() => null);
      d.line = r?.ok ? r.data.line : pts;
    }
  }

  const catalog: CatalogPoi[] = pois
    .filter((p) => p.kind !== 'campsite' && p.kind !== 'fuel' && p.kind !== 'grocery')
    .map((p) => ({
      slug: p.slug,
      name: p.nameSk ?? p.name,
      kind: p.kind,
      regionId: p.regionId,
      regionName: (p.regionId && regionById.get(p.regionId)?.nameSk) ?? '',
      lat: Number(p.lat),
      lng: Number(p.lng),
      visitMin: p.visitMin ?? 60,
      entryGroup: entryFor(p, trip.startDate ?? `${trip.targetMonth.slice(0, 7)}-15`).total,
      hiddenGem: Boolean(p.hiddenGem),
      droneStatus: p.droneStatus ?? 'unknown',
      monthRating: monthRating(p),
      popularity: p.popularity ?? 3,
      description: p.descriptionSk,
      inPlanDay: inPlan.get(p.slug) ?? null,
      ...extras(p),
    }))
    .sort((a, b) => (a.inPlanDay ?? 99) - (b.inPlanDay ?? 99) || b.popularity - a.popularity);

  const totals = {
    km: dayLites.reduce((a, d) => a + d.driveKm, 0),
    driveMinReal: dayLites.reduce((a, d) => a + d.driveMinReal, 0),
    stops: dayLites.reduce((a, d) => a + d.stops.filter((s) => !s.skip).length, 0),
    entryGroup: dayLites.reduce((a, d) => a + d.entryGroup, 0),
    warnings: dayLites.reduce((a, d) => a + d.warnings.length, 0),
  };
  return { trip, days: dayLites, catalog, totals, pax: travelers.length || 1, fmtH };
}
