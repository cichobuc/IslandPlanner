import 'server-only';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { applyFlightSelection, type CascadeResult } from '@/engine/cascade';
import { PRESET_AUTO } from '@/engine/presets';
import type {
  FlightSelectionInput,
  LodgingStayInput,
  ManualItemInput,
  Money,
  PoiInput,
  PriceRule,
  ScenarioKey,
  TravelerInput,
  TripSnapshot,
  VehicleInput,
} from '@/engine/types';
import { getRates } from './rates';

/** Predvolené kurzy/palivo, kým ich nedodá frankfurter/gasvaktin snapshot (blok 2.5). */
export const DEFAULT_FX = { ISK_EUR: 0.0067, date: '2026-09-20' };
export const DEFAULT_FUEL = { petrol: 320, diesel: 318 };

const asMoney = (m: unknown): Money | null =>
  m && typeof m === 'object' && 'amount' in (m as object) ? (m as Money) : null;

/** Vybraný let ako vstup enginu (z flight_options alebo ručný záznam). */
export async function loadFlightInput(tripId: string): Promise<FlightSelectionInput | null> {
  const db = getDb();
  const [sel] = await db
    .select()
    .from(schema.flightSelection)
    .where(eq(schema.flightSelection.tripId, tripId))
    .limit(1);
  if (!sel) return null;
  if (sel.flightOptionId) {
    const [o] = await db
      .select()
      .from(schema.flightOptions)
      .where(eq(schema.flightOptions.id, sel.flightOptionId))
      .limit(1);
    if (o) return optionToInput(o);
  }
  if (sel.manual) {
    const m = sel.manual;
    return {
      origin: m.origin,
      outDepAt: m.outDepAt,
      outArrAt: m.outArrAt ?? m.outDepAt,
      retDepAt: m.retDepAt,
      retArrAt: m.retArrAt ?? m.retDepAt,
      farePp: {
        amount:
          m.farePp ??
          (sel.lockedPrice ? sel.lockedPrice.amount / Math.max(1, await countTravelersFor(tripId)) : 0),
        currency: 'EUR',
        source: 'manual',
      },
      isEstimate: false,
    };
  }
  return null;
}

async function countTravelersFor(tripId: string): Promise<number> {
  const rows = await getDb()
    .select({ id: schema.travelers.id })
    .from(schema.travelers)
    .where(eq(schema.travelers.tripId, tripId));
  return rows.length;
}

export function optionToInput(o: typeof schema.flightOptions.$inferSelect): FlightSelectionInput {
  return {
    origin: o.origin,
    dest: o.dest,
    outDepAt: o.outDepAt.toISOString(),
    outArrAt: (o.outArrAt ?? o.outDepAt).toISOString(),
    retDepAt: o.retDepAt.toISOString(),
    retArrAt: (o.retArrAt ?? o.retDepAt).toISOString(),
    farePp: o.farePp,
    bagsTotal: asMoney(o.bagsTotal),
    parkingTotal: asMoney(o.parkingTotal),
    airportAccessTotal: asMoney(o.airportAccessTotal),
    isEstimate: o.isEstimate,
  };
}

/** Celý stav cesty pre engine (docs/05): let, cestujúci, dni so zastávkami (POI + cenníky), noci a vozidlo per vetva, strava, ručné položky, kurz a palivo. */
export async function loadSnapshot(tripId: string, opts: { rates?: boolean } = {}): Promise<TripSnapshot> {
  const db = getDb();
  const [trip] = await db.select().from(schema.trips).where(eq(schema.trips.id, tripId)).limit(1);
  if (!trip) throw new Error('Cesta neexistuje');
  const [travelers, days, stays, flight, vehicleRows, foodRow, manualRows, rates] = await Promise.all([
    db
      .select()
      .from(schema.travelers)
      .where(eq(schema.travelers.tripId, tripId))
      .orderBy(asc(schema.travelers.sortOrder)),
    db
      .select()
      .from(schema.itineraryDays)
      .where(and(eq(schema.itineraryDays.tripId, tripId), eq(schema.itineraryDays.scenarioKey, 'drive')))
      .orderBy(asc(schema.itineraryDays.dayIndex)),
    db
      .select()
      .from(schema.lodgingStays)
      .where(eq(schema.lodgingStays.tripId, tripId))
      .orderBy(asc(schema.lodgingStays.nightIndex)),
    loadFlightInput(tripId),
    db
      .select({ sel: schema.vehicleSelection, opt: schema.vehicleOptions })
      .from(schema.vehicleSelection)
      .innerJoin(schema.vehicleOptions, eq(schema.vehicleOptions.id, schema.vehicleSelection.vehicleOptionId))
      .where(eq(schema.vehicleSelection.tripId, tripId)),
    db.select().from(schema.foodProfile).where(eq(schema.foodProfile.tripId, tripId)).limit(1),
    db.select().from(schema.manualItems).where(eq(schema.manualItems.tripId, tripId)),
    opts.rates === false ? Promise.resolve(null) : getRates(),
  ]);
  const dayIds = days.map((d) => d.id);
  const stops = dayIds.length
    ? await db
        .select()
        .from(schema.itineraryStops)
        .where(inArray(schema.itineraryStops.dayId, dayIds))
        .orderBy(asc(schema.itineraryStops.order))
    : [];
  const poiIds = [...new Set(stops.map((s) => s.poiId).filter((x): x is string => Boolean(x)))];
  const [pois, rules, optionRows] = await Promise.all([
    poiIds.length
      ? db.select().from(schema.pois).where(inArray(schema.pois.id, poiIds))
      : Promise.resolve([]),
    poiIds.length
      ? db.select().from(schema.poiPriceRules).where(inArray(schema.poiPriceRules.poiId, poiIds))
      : Promise.resolve([]),
    (() => {
      const ids = stays.map((s) => s.lodgingOptionId).filter((x): x is string => Boolean(x));
      return ids.length
        ? db.select().from(schema.lodgingOptions).where(inArray(schema.lodgingOptions.id, ids))
        : Promise.resolve([]);
    })(),
  ]);
  const poiInput = new Map<string, PoiInput>();
  for (const p of pois)
    poiInput.set(p.id, {
      id: p.id,
      slug: p.slug,
      name: p.nameSk ?? p.name,
      regionId: p.regionId,
      visitMin: p.visitMin,
      parkingFee: asMoney(p.parkingFee),
      priceRules: rules
        .filter((r) => r.poiId === p.id)
        .map<PriceRule>((r) => ({
          label: r.label,
          minAge: r.minAge,
          maxAge: r.maxAge,
          price: r.price,
          per: r.per,
          variant: r.variant,
          isDefault: r.isDefault,
        })),
      requires4x4: p.requires4x4,
      season: p.season ?? null,
      bookAheadDays: p.bookAheadDays,
    });

  const lodgingStays: TripSnapshot['lodgingStays'] = {};
  for (const s of stays) {
    const o = optionRows.find((x) => x.id === s.lodgingOptionId);
    const notes = s.notes?.startsWith('{')
      ? (JSON.parse(s.notes) as { electricityIsk?: number; campingCard?: boolean })
      : null;
    (lodgingStays[s.scenarioKey] ??= []).push({
      id: s.id,
      scenarioKey: s.scenarioKey,
      nightIndex: s.nightIndex,
      nightDate: s.nightDate,
      regionId: s.regionId,
      kind: s.kindOverride ?? o?.kind ?? (s.scenarioKey === 'camper' ? 'camper_site' : 'guesthouse'),
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
    });
  }

  const vehicle: TripSnapshot['vehicle'] = {};
  for (const { sel, opt } of vehicleRows) {
    if (sel.scenarioKey !== 'car' && sel.scenarioKey !== 'camper') continue;
    vehicle[sel.scenarioKey] = {
      scenarioKey: sel.scenarioKey,
      kind: opt.kind,
      class: opt.class,
      name: opt.name,
      days: sel.days ?? trip.minDays,
      pricePerDay: sel.priceOverride ?? opt.pricePerDay,
      consumptionL100km: Number(opt.consumptionL100km),
      fuel: opt.fuel,
      insurance: opt.insurance ?? {},
      insuranceChosen: sel.insuranceChosen ?? [],
      extras: opt.extras ?? {},
      extrasChosen: sel.extrasChosen ?? {},
      deposit: opt.deposit ?? null,
      seats: opt.seats,
      sleeps: opt.sleeps ?? 0,
      luggageCapacity: opt.luggageCapacity ?? 2,
      campingCard: Boolean(sel.campingCard),
      consumptionOverride: sel.consumptionOverride ? Number(sel.consumptionOverride) : null,
      fuelPriceOverride: sel.fuelPriceOverride ? Number(sel.fuelPriceOverride) : null,
      isManual: sel.isManual,
    } satisfies VehicleInput;
  }

  const fp = foodRow[0];
  const manual = manualRows.map<ManualItemInput>((m) => ({
    id: m.id,
    category: m.category as ManualItemInput['category'],
    label: m.label,
    amount: m.amount,
    split: m.split,
    customShares: m.customShares ?? null,
    scenarioKey: m.scenarioKey ?? null,
  }));

  return {
    trip: {
      id: trip.id,
      startDate: trip.startDate,
      endDate: trip.endDate,
      transportMode: trip.transportMode,
      reservePct: Number(trip.reservePct),
      baseCurrency: trip.baseCurrency,
      pace: trip.pace,
      interests: trip.interests,
      routePreset: trip.routePreset,
      budgetTargetPp: trip.budgetTargetPp ? Number(trip.budgetTargetPp) : null,
      homeTz: 'Europe/Bratislava',
    },
    travelers: travelers.map<TravelerInput>((t) => ({
      id: t.id,
      name: t.name,
      birthDate: t.birthDate,
      ageFallback: t.ageFallback,
      isDriver: t.isDriver,
      driverSince: t.driverSince,
      hasCreditCard: t.hasCreditCard,
      bags: t.bags,
      sharesBagsWith: t.sharesBagsWith,
    })),
    flight,
    itinerary: days.map((d) => ({
      id: d.id,
      dayIndex: d.dayIndex,
      date: d.date ?? '',
      overnightRegionId: d.overnightRegionId,
      driveKm: d.driveKm ? Number(d.driveKm) : null,
      driveMin: d.driveMin,
      driveMinReal: d.driveMinReal,
      locked: d.locked,
      stops: stops
        .filter((s) => s.dayId === d.id)
        .map((s) => ({
          id: s.id,
          poi: s.poiId ? (poiInput.get(s.poiId) ?? null) : null,
          customLabel: s.customLabel,
          stayMin: s.stayMin,
          skip: s.skip,
          must: s.must,
          isManual: s.isManual,
          entryOverride: asMoney(s.entryOverride),
          variant: s.variant,
        })),
    })),
    lodgingStays,
    vehicle,
    food: {
      level: fp?.level ?? 'budget',
      customPrices: fp?.customPrices ?? null,
      coffeePerDay: fp?.coffeePerDay ?? 1,
      alcohol: fp?.alcohol ?? false,
      firstShopPp: fp?.firstShop ? Number(asMoney(fp.firstShop)?.amount ?? 0) : null,
      dayOverrides: fp?.dayOverrides ?? null,
    },
    manualItems: manual,
    fx: rates ? { ISK_EUR: rates.fx.ISK_EUR, date: rates.fx.date } : DEFAULT_FX,
    fuel: rates ? { petrol: rates.fuel.petrol, diesel: rates.fuel.diesel } : DEFAULT_FUEL,
  };
}

/** Kaskáda z aktuálneho snapshotu (výber letu, zmena okruhu): okruh = `trip.routePreset` (Auto podľa dní alebo ručný). */
export async function runFlightCascade(tripId: string, flight: FlightSelectionInput) {
  const snapshot = await loadSnapshot(tripId);
  const result = applyFlightSelection(snapshot, flight);
  await persistFlightCascade(tripId, result);
  return result;
}

/**
 * Zápis výsledku kaskády po výbere letu: dátumy cesty, kostra dní (scenár `drive`, nezamknuté sa prepíšu)
 * a noci per scenár (ručné ostávajú – engine ich už zachoval v snapshote). `routePreset` ostáva (Auto / ručný).
 */
export async function persistFlightCascade(tripId: string, result: CascadeResult) {
  const db = getDb();
  const { snapshot, derived } = result;
  await db.transaction(async (tx) => {
    await tx
      .update(schema.trips)
      .set({
        startDate: derived.startDate,
        endDate: derived.endDate,
        routePreset: snapshot.trip.routePreset ?? PRESET_AUTO,
        updatedAt: new Date(),
      })
      .where(eq(schema.trips.id, tripId));

    // dni: zamknuté ostávajú (engine ich vrátil s pôvodným id), ostatné nanovo
    await tx
      .delete(schema.itineraryDays)
      .where(
        and(
          eq(schema.itineraryDays.tripId, tripId),
          eq(schema.itineraryDays.scenarioKey, 'drive'),
          eq(schema.itineraryDays.locked, false),
        ),
      );
    const lockedIds = new Set(
      (
        await tx
          .select({ id: schema.itineraryDays.id })
          .from(schema.itineraryDays)
          .where(eq(schema.itineraryDays.tripId, tripId))
      ).map((r) => r.id),
    );
    const dayIdByIndex = new Map<number, string>();
    for (const d of snapshot.itinerary) {
      if (lockedIds.has(d.id)) {
        await tx
          .update(schema.itineraryDays)
          .set({ date: d.date, dayIndex: d.dayIndex })
          .where(eq(schema.itineraryDays.id, d.id));
        dayIdByIndex.set(d.dayIndex, d.id);
        continue;
      }
      const [row] = await tx
        .insert(schema.itineraryDays)
        .values({
          tripId,
          scenarioKey: 'drive',
          dayIndex: d.dayIndex,
          date: d.date,
          overnightRegionId: d.overnightRegionId ?? null,
          driveKm: d.driveKm != null ? String(d.driveKm) : '0',
          driveMin: d.driveMin ?? 0,
          locked: false,
        })
        .returning({ id: schema.itineraryDays.id });
      dayIdByIndex.set(d.dayIndex, row.id);
    }

    // noci per scenár: ručné update dátumu, ostatné nanovo
    for (const key of ['car', 'camper'] as ScenarioKey[]) {
      const stays: LodgingStayInput[] = snapshot.lodgingStays[key] ?? [];
      await tx
        .delete(schema.lodgingStays)
        .where(
          and(
            eq(schema.lodgingStays.tripId, tripId),
            eq(schema.lodgingStays.scenarioKey, key),
            eq(schema.lodgingStays.isManual, false),
          ),
        );
      const manualIds = new Set(
        (
          await tx
            .select({ id: schema.lodgingStays.id })
            .from(schema.lodgingStays)
            .where(and(eq(schema.lodgingStays.tripId, tripId), eq(schema.lodgingStays.scenarioKey, key)))
        ).map((r) => r.id),
      );
      for (const s of stays) {
        if (manualIds.has(s.id)) {
          await tx
            .update(schema.lodgingStays)
            .set({
              nightDate: s.nightDate,
              nightIndex: s.nightIndex,
              dayId: dayIdByIndex.get(s.nightIndex) ?? null,
            })
            .where(eq(schema.lodgingStays.id, s.id));
          continue;
        }
        await tx.insert(schema.lodgingStays).values({
          tripId,
          scenarioKey: key,
          nightDate: s.nightDate,
          nightIndex: s.nightIndex,
          dayId: dayIdByIndex.get(s.nightIndex) ?? null,
          regionId: s.regionId ?? null,
          // predvolene s kuchynkou (úsporná strava, penzión/Airbnb ju mávajú) – v kroku 05 sa dá vypnúť
          hasKitchen: true,
          isManual: false,
        });
      }
    }
  });
}
