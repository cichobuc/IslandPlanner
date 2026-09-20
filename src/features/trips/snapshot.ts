import 'server-only';
import { and, asc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import type { CascadeResult } from '@/engine/cascade';
import type {
  FlightSelectionInput,
  LodgingStayInput,
  Money,
  ScenarioKey,
  TravelerInput,
  TripSnapshot,
} from '@/engine/types';

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
      farePp: sel.lockedPrice ?? { amount: 0, currency: 'EUR', source: 'manual' },
      isEstimate: false,
    };
  }
  return null;
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

/** Celý stav cesty pre engine (docs/05). Vozidlo/strava sa doplnia v blokoch 2.5/2.8. */
export async function loadSnapshot(tripId: string): Promise<TripSnapshot> {
  const db = getDb();
  const [trip] = await db.select().from(schema.trips).where(eq(schema.trips.id, tripId)).limit(1);
  if (!trip) throw new Error('Cesta neexistuje');
  const [travelers, days, stays, flight] = await Promise.all([
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
  ]);
  const lodgingStays: TripSnapshot['lodgingStays'] = {};
  for (const s of stays) {
    (lodgingStays[s.scenarioKey] ??= []).push({
      id: s.id,
      scenarioKey: s.scenarioKey,
      nightIndex: s.nightIndex,
      nightDate: s.nightDate,
      regionId: s.regionId,
      kind: s.kindOverride ?? (s.scenarioKey === 'camper' ? 'camper_site' : 'guesthouse'),
      priceOverride: asMoney(s.priceOverride),
      priceRangeMin: asMoney(s.priceRangeMin),
      priceRangeMax: asMoney(s.priceRangeMax),
      hasKitchen: s.hasKitchen,
      isManual: s.isManual,
    });
  }
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
      stops: [],
    })),
    lodgingStays,
    vehicle: {},
    food: { level: 'budget' },
    manualItems: [],
    fx: DEFAULT_FX,
    fuel: DEFAULT_FUEL,
  };
}

/**
 * Zápis výsledku kaskády po výbere letu: dátumy cesty, preset, kostra dní (scenár `drive`, nezamknuté sa prepíšu)
 * a noci per scenár (ručné ostávajú – engine ich už zachoval v snapshote).
 */
export async function persistFlightCascade(tripId: string, result: CascadeResult, routePreset: string) {
  const db = getDb();
  const { snapshot, derived } = result;
  await db.transaction(async (tx) => {
    await tx
      .update(schema.trips)
      .set({
        startDate: derived.startDate,
        endDate: derived.endDate,
        routePreset,
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
          hasKitchen: key === 'camper' ? true : null,
          isManual: false,
        });
      }
    }
  });
}
