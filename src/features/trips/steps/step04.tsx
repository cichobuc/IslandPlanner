import { and, asc, eq, inArray } from 'drizzle-orm';
import { Notice } from '@/components/ui';
import { tjalda, type Campsite } from '@/connectors/tjalda';
import { initConnectors } from '@/connectors/server';
import { getDb, schema } from '@/db';
import { deriveFromFlight } from '@/engine/cascade';
import { campingCardDecision, lodgingWarnings, stayCost } from '@/engine/lodging';
import { CAMPSITE_SEED } from '@/engine/presets';
import type { LodgingKind, LodgingStayInput, Money } from '@/engine/types';
import type { TripAccess } from '../access';
import { canEdit } from '../access';
import { dateRangeLabel } from '../progress';
import { getRates } from '../rates';
import { loadFlightInput } from '../snapshot';
import { Step04Client } from './step04-client';
import type { CampOffer, NightLite, Step04Data } from './step04-types';

const DOW = ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So'];
/** Miesto na vyhľadanie ubytovania v regióne (Booking/Airbnb link). */
const PLACE: Record<string, string> = {
  reykjanes: 'Keflavík',
  reykjavik: 'Reykjavík',
  golden_circle: 'Selfoss',
  south: 'Vík',
  southeast: 'Höfn',
  eastfjords: 'Egilsstaðir',
  north_myvatn: 'Mývatn',
  akureyri: 'Akureyri',
  north_west: 'Blönduós',
  snaefellsnes: 'Stykkishólmur',
  westfjords: 'Ísafjörður',
  highlands: 'Landmannalaugar',
};
const asMoney = (m: unknown): Money | null =>
  m && typeof m === 'object' && 'amount' in (m as object) ? (m as Money) : null;
const addDay = (iso: string) => new Date(Date.parse(iso) + 86_400_000).toISOString().slice(0, 10);
const distKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

/** Krok 05 · Kde spať – noci per vetva (car → izby ako rozpätie/ponuka, camper → kempy tjalda + seed, Camping Card). */
export async function Step04({ access }: { access: TripAccess }) {
  const { trip, role } = access;
  if (!trip.transportMode || trip.transportMode === 'no_car') {
    return (
      <Notice tone="info">
        Najprv rozhodni v kroku 03 (Auto alebo Karavan) – podľa toho sú noci izby alebo kempy.
      </Notice>
    );
  }
  const mode = trip.transportMode;
  const db = getDb();
  const [stays, regions, travelers, flight, rates, vehicleSel] = await Promise.all([
    db
      .select()
      .from(schema.lodgingStays)
      .where(and(eq(schema.lodgingStays.tripId, trip.id), eq(schema.lodgingStays.scenarioKey, mode)))
      .orderBy(asc(schema.lodgingStays.nightIndex)),
    db.select().from(schema.regions),
    db.select().from(schema.travelers).where(eq(schema.travelers.tripId, trip.id)),
    loadFlightInput(trip.id),
    getRates(),
    db
      .select()
      .from(schema.vehicleSelection)
      .where(and(eq(schema.vehicleSelection.tripId, trip.id), eq(schema.vehicleSelection.scenarioKey, mode)))
      .limit(1),
  ]);
  if (stays.length === 0)
    return (
      <Notice tone="info">
        Noci vzniknú po výbere letu v kroku 02 (dátumy → počet nocí a regióny z návrhu trasy).
      </Notice>
    );

  const pax = travelers.length || 1;
  const fx = { ISK_EUR: rates.fx.ISK_EUR };
  const optionIds = stays.map((s) => s.lodgingOptionId).filter((x): x is string => Boolean(x));
  const options = optionIds.length
    ? await db.select().from(schema.lodgingOptions).where(inArray(schema.lodgingOptions.id, optionIds))
    : [];
  const regionById = new Map(regions.map((r) => [r.id, r]));
  const derived = flight ? deriveFromFlight(flight) : null;
  const campingCardOn = Boolean(vehicleSel[0]?.campingCard);
  const defaultKind: LodgingKind =
    mode === 'camper'
      ? 'camper_site'
      : access.me.profile?.comfort === 'camp'
        ? 'guesthouse'
        : (access.me.profile?.comfort ?? 'guesthouse');

  // kempy: tjalda (živé, cache 7 d) + seed POI kind=campsite, priradené k regiónu podľa najbližšieho centroidu
  let tjaldaOk = false;
  let camps: (CampOffer & { regionId: string })[] = [];
  if (mode === 'camper') {
    initConnectors();
    const [live, seedPois] = await Promise.all([
      tjalda.fetch({}).catch(() => null),
      db.select().from(schema.pois).where(eq(schema.pois.kind, 'campsite')),
    ]);
    const nearest = (lat: number, lng: number) => {
      let best: { id: string; d: number } | null = null;
      for (const r of regions) {
        const d = distKm({ lat, lng }, { lat: Number(r.centroidLat), lng: Number(r.centroidLng) });
        if (!best || d < best.d) best = { id: r.id, d };
      }
      return best!;
    };
    const year = (trip.startDate ?? trip.targetMonth).slice(0, 4);
    const seasonEnd = (c: Campsite) => (c.yearRound || !c.season ? null : `${year}-${c.season.to}`);
    if (live?.ok) {
      tjaldaOk = true;
      camps = live.data
        .filter((c) => c.prices.adultIsk && c.prices.adultIsk > 0)
        .map((c) => {
          const n = nearest(c.lat, c.lng);
          return {
            source: 'tjalda' as const,
            ref: c.slug,
            name: c.name,
            lat: c.lat,
            lng: c.lng,
            perPersonIsk: c.prices.adultIsk ?? 0,
            electricityIsk: c.prices.electricityIsk ?? 0,
            openUntil: seasonEnd(c),
            openForNight: true,
            campingCard: c.services.some((s) => /camping.?card/i.test(s)),
            hasKitchen: c.hasKitchen,
            showers: c.hasShowers,
            url: c.bookingUrl ?? c.website,
            distanceKm: Math.round(n.d),
            regionId: n.id,
          };
        });
    }
    const liveNames = new Set(camps.map((c) => c.name.toLowerCase()));
    for (const p of seedPois) {
      if (liveNames.has(p.name.toLowerCase())) continue;
      const rules = await db.select().from(schema.poiPriceRules).where(eq(schema.poiPriceRules.poiId, p.id));
      const person = rules.find((r) => r.per === 'person' && r.price.amount > 0);
      const elec = rules.find((r) => r.per === 'vehicle');
      const n = nearest(Number(p.lat), Number(p.lng));
      camps.push({
        source: 'seed',
        ref: p.slug,
        name: p.name,
        lat: Number(p.lat),
        lng: Number(p.lng),
        perPersonIsk: person?.price.amount ?? CAMPSITE_SEED[p.regionId ?? 'south']?.perPerson ?? 2500,
        electricityIsk: elec?.price.amount ?? 0,
        openUntil: (p.openHoursSeason as { open_until?: string } | null)?.open_until ?? null,
        openForNight: true,
        campingCard: CAMPSITE_SEED[p.regionId ?? '']?.campingCard ?? false,
        hasKitchen: (p.facilities ?? []).includes('kitchen'),
        showers: (p.facilities ?? []).includes('showers'),
        url: p.websiteUrl,
        distanceKm: Math.round(n.d),
        regionId: p.regionId ?? n.id,
      });
    }
  }

  const inputs: LodgingStayInput[] = stays.map((s) => {
    const o = options.find((x) => x.id === s.lodgingOptionId);
    const notes = s.notes?.startsWith('{')
      ? (JSON.parse(s.notes) as { electricityIsk?: number; campingCard?: boolean })
      : null;
    return {
      id: s.id,
      scenarioKey: s.scenarioKey,
      nightIndex: s.nightIndex,
      nightDate: s.nightDate,
      regionId: s.regionId,
      kind: s.kindOverride ?? o?.kind ?? defaultKind,
      pricePerNight: asMoney(o?.pricePerNight),
      priceOverride: asMoney(s.priceOverride),
      priceRangeMin: asMoney(s.priceRangeMin),
      priceRangeMax: asMoney(s.priceRangeMax),
      cleaningFee: asMoney(o?.cleaningFee),
      serviceFeePct: o?.serviceFeePct ? Number(o.serviceFeePct) : null,
      cityTaxPp: asMoney(o?.cityTaxPp),
      perPersonNight: asMoney(o?.pricePerPerson),
      electricity: notes?.electricityIsk
        ? { amount: notes.electricityIsk, currency: 'ISK', source: 'api' }
        : null,
      inCampingCardNetwork: notes?.campingCard ?? null,
      hasKitchen: s.hasKitchen,
      isManual: s.isManual,
      openUntil: o?.openUntil ?? null,
      checkInUntil: o?.checkInUntil ? String(o.checkInUntil).slice(0, 5) : null,
    };
  });
  const warnings = lodgingWarnings(inputs, {
    arrivalMinutesOfDay: derived?.arrivalMinutesOfDay,
    departureMinutesOfDay: derived?.departureMinutesOfDay,
  });
  const card = mode === 'camper' ? campingCardDecision(inputs, pax, fx) : null;

  let total = 0;
  let totalMin = 0;
  let totalMax = 0;
  let estimateAmount = 0;
  let kitchenNights = 0;
  const nights: NightLite[] = inputs.map((inp) => {
    const s = stays.find((x) => x.id === inp.id)!;
    const o = options.find((x) => x.id === s.lodgingOptionId);
    const c = stayCost(inp, pax, inputs.length, fx, { campingCard: campingCardOn });
    total += c.amount;
    totalMin += c.min;
    totalMax += c.max;
    if (c.confidence === 'estimate') estimateAmount += c.amount;
    if (c.hasKitchen) kitchenNights++;
    const region = inp.regionId ? regionById.get(inp.regionId) : null;
    const checkout = addDay(inp.nightDate);
    const place = PLACE[inp.regionId ?? ''] ?? 'Iceland';
    const nightCamps = camps
      .filter((cp) => cp.regionId === inp.regionId)
      .map((cp) => ({ ...cp, openForNight: !cp.openUntil || cp.openUntil >= inp.nightDate }))
      .sort((a, b) => Number(b.openForNight) - Number(a.openForNight) || a.perPersonIsk - b.perPersonIsk)
      .slice(0, 8);
    return {
      stayId: inp.id,
      nightIndex: inp.nightIndex,
      date: inp.nightDate,
      dow: DOW[new Date(inp.nightDate).getUTCDay()],
      regionId: inp.regionId ?? null,
      regionName: region?.nameSk ?? inp.regionId ?? '—',
      place,
      kind: inp.kind,
      assigned: o
        ? {
            name: o.name,
            url: o.url,
            kind: o.kind,
            source: o.connectorId,
            checkInUntil: o.checkInUntil ? String(o.checkInUntil).slice(0, 5) : null,
            openUntil: o.openUntil,
          }
        : null,
      noLodging: s.notes === 'bez ubytovania',
      hasKitchen: c.hasKitchen,
      amount: Math.round(c.amount),
      min: Math.round(c.min),
      max: Math.round(c.max),
      source: c.source,
      isEstimate: c.confidence === 'estimate',
      campingCardApplied: c.campingCardApplied,
      warnings: warnings.filter((w) => w.nightIndex === inp.nightIndex).map((w) => w.message),
      bookingUrl: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(place + ', Iceland')}&checkin=${inp.nightDate}&checkout=${checkout}&group_adults=${pax}&no_rooms=${Math.max(1, Math.ceil(pax / 2))}&group_children=0`,
      airbnbUrl: `https://www.airbnb.com/s/${encodeURIComponent(place)}--Iceland/homes?checkin=${inp.nightDate}&checkout=${checkout}&adults=${pax}`,
      camps: nightCamps,
    };
  });

  const vehicle = vehicleSel[0]?.vehicleOptionId
    ? (
        await db
          .select({ name: schema.vehicleOptions.name })
          .from(schema.vehicleOptions)
          .where(eq(schema.vehicleOptions.id, vehicleSel[0].vehicleOptionId))
          .limit(1)
      )[0]?.name
    : null;

  const data: Step04Data = {
    tripId: trip.id,
    mode,
    pax,
    nights,
    total: Math.round(total),
    totalMin: Math.round(totalMin),
    totalMax: Math.round(totalMax),
    estimateShare: Math.round(estimateAmount),
    kitchenNights,
    dates: trip.startDate && trip.endDate ? dateRangeLabel(trip.startDate, trip.endDate) : null,
    vehicleLabel: vehicle ?? null,
    presetKey: trip.routePreset,
    campingCard: card
      ? {
          on: campingCardOn,
          ...card,
          expired: (trip.startDate ?? '') > `${(trip.startDate ?? trip.targetMonth).slice(0, 4)}-09-15`,
        }
      : null,
    tjaldaOk,
    canEdit: canEdit(role),
  };
  return <Step04Client data={data} />;
}
