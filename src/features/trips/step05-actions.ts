'use server';

import { and, asc, eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getDb, schema } from '@/db';
import { deriveFromFlight } from '@/engine/cascade';
import {
  generateItinerary,
  type DaySkeleton,
  type MatrixLookup,
  type PoiCandidate,
} from '@/engine/itinerary';
import { canEdit, getTripAccess } from './access';
import type { ActionState } from './actions';
import { loadFlightInput } from './snapshot';

const NO_EDIT = 'Nemáš právo upravovať túto cestu.';
const revalidate = (tripId: string) => revalidatePath(`/[locale]/cesta/${tripId}`, 'layout');

/** Matica trás z DB → lookup (kľúče: slug POI, `region:<id>`, `kef`). */
export async function loadMatrix(): Promise<MatrixLookup> {
  const rows = await getDb().select().from(schema.routeMatrix);
  const map = new Map(
    rows.map((r) => [`${r.fromSlug}>${r.toSlug}`, { km: Number(r.km), min: Number(r.min) }]),
  );
  return (a, b) => (a === b ? { km: 0, min: 0 } : (map.get(`${a}>${b}`) ?? null));
}

export async function loadPoiCandidates(month: number): Promise<PoiCandidate[]> {
  const rows = await getDb().select().from(schema.pois);
  return rows
    .filter((p) => p.kind !== 'campsite' && p.kind !== 'fuel' && p.kind !== 'grocery')
    .map((p) => ({
      slug: p.slug,
      name: p.nameSk ?? p.name,
      regionId: p.regionId,
      lat: Number(p.lat),
      lng: Number(p.lng),
      visitMin: p.visitMin ?? 60,
      popularity: p.popularity ?? 3,
      hiddenGem: Boolean(p.hiddenGem),
      interestWeight: (p.interestWeight as Record<string, number> | null) ?? {},
      monthRating:
        p.monthRating?.[String(month)] ??
        (p.bestMonths?.length ? (p.bestMonths.includes(month) ? 4 : 2) : null),
      requires4x4: Boolean(p.requires4x4),
      kind: p.kind,
    }));
}

async function editable(tripId: string) {
  const access = await getTripAccess(tripId);
  return access && canEdit(access.role) ? access : null;
}

const genSchema = z.object({
  tripId: z.uuid(),
  gemShare: z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    z.coerce.number().min(0).max(1).optional(),
  ),
});

/** ⚙ Generovať: zastávky pre nezamknuté dni scenára `drive`; ručné zastávky ostávajú (keep). Km → dni → palivo v 03. */
export async function generateItineraryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = genSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'Neplatný vstup.' };
  const { tripId } = parsed.data;
  const access = await editable(tripId);
  if (!access) return { ok: false, error: NO_EDIT };
  const { trip } = access;
  const db = getDb();
  const [days, flight, matrix, pois, vehicle] = await Promise.all([
    db
      .select()
      .from(schema.itineraryDays)
      .where(and(eq(schema.itineraryDays.tripId, tripId), eq(schema.itineraryDays.scenarioKey, 'drive')))
      .orderBy(asc(schema.itineraryDays.dayIndex)),
    loadFlightInput(tripId),
    loadMatrix(),
    loadPoiCandidates(Number(trip.targetMonth.slice(5, 7))),
    db
      .select({ cls: schema.vehicleOptions.class })
      .from(schema.vehicleSelection)
      .innerJoin(schema.vehicleOptions, eq(schema.vehicleOptions.id, schema.vehicleSelection.vehicleOptionId))
      .where(
        and(
          eq(schema.vehicleSelection.tripId, tripId),
          eq(schema.vehicleSelection.scenarioKey, trip.transportMode === 'camper' ? 'camper' : 'car'),
        ),
      )
      .limit(1),
  ]);
  if (days.length === 0) return { ok: false, error: 'Najprv vyber let v kroku 02 – dni vzniknú z dátumov.' };
  const derived = flight ? deriveFromFlight(flight) : null;
  const dayIds = days.map((d) => d.id);
  const existing = dayIds.length
    ? await db.select().from(schema.itineraryStops).where(inArray(schema.itineraryStops.dayId, dayIds))
    : [];
  const poiById = new Map(
    (await db.select({ id: schema.pois.id, slug: schema.pois.slug }).from(schema.pois)).map((p) => [
      p.id,
      p.slug,
    ]),
  );
  const keep: Record<number, string[]> = {};
  for (const d of days) {
    const kept = existing
      .filter((s) => s.dayId === d.id && (s.isManual || d.locked) && s.poiId)
      .map((s) => poiById.get(s.poiId!)!)
      .filter(Boolean);
    if (kept.length) keep[d.dayIndex] = kept;
  }
  const skeleton: DaySkeleton[] = days.map((d, i) => ({
    dayIndex: d.dayIndex,
    date: d.date ?? '',
    overnightRegionId: i === days.length - 1 ? null : d.overnightRegionId,
    locked: d.locked,
    availableMin:
      i === 0 && derived
        ? Math.max(120, 19 * 60 - derived.arrivalMinutesOfDay - 60)
        : i === days.length - 1 && derived
          ? Math.max(60, derived.departureMinutesOfDay - 3 * 60 - 8 * 60)
          : undefined,
  }));
  const allow4x4 = vehicle[0]?.cls === '4x4' || vehicle[0]?.cls === 'camper4x4';
  const result = generateItinerary({
    days: skeleton,
    pois,
    matrix,
    pace: trip.pace,
    interests: trip.interests,
    allow4x4,
    gemShare: parsed.data.gemShare ?? 0.3,
    keep,
  });
  const slugToId = new Map([...poiById.entries()].map(([id, slug]) => [slug, id]));

  await db.transaction(async (tx) => {
    for (const g of result) {
      const day = days.find((d) => d.dayIndex === g.dayIndex)!;
      if (day.locked) continue;
      await tx
        .delete(schema.itineraryStops)
        .where(and(eq(schema.itineraryStops.dayId, day.id), eq(schema.itineraryStops.isManual, false)));
      const manual = existing.filter((s) => s.dayId === day.id && s.isManual);
      for (const s of g.stops) {
        const m = manual.find((x) => x.poiId && poiById.get(x.poiId) === s.slug);
        if (m) {
          await tx
            .update(schema.itineraryStops)
            .set({
              order: s.order,
              driveKmFromPrev: String(s.driveKmFromPrev),
              driveMinFromPrev: Math.round(s.driveMinFromPrev),
            })
            .where(eq(schema.itineraryStops.id, m.id));
          continue;
        }
        await tx.insert(schema.itineraryStops).values({
          dayId: day.id,
          order: s.order,
          poiId: slugToId.get(s.slug) ?? null,
          stayMin: s.stayMin,
          driveKmFromPrev: String(Math.round(s.driveKmFromPrev * 10) / 10),
          driveMinFromPrev: Math.round(s.driveMinFromPrev),
          isManual: false,
        });
      }
      const titleRegion = g.regionsVisited[g.regionsVisited.length - 1];
      await tx
        .update(schema.itineraryDays)
        .set({
          driveKm: String(g.driveKm),
          driveMin: g.driveMin,
          driveMinReal: g.driveMinReal,
          title: titleRegion ?? null,
          notes: g.warnings.length ? g.warnings.join(' · ') : null,
          updatedAt: new Date(),
        })
        .where(eq(schema.itineraryDays.id, day.id));
    }
  });
  revalidate(tripId);
  return { ok: true };
}

const stopSchema = z.object({ tripId: z.uuid(), dayId: z.uuid(), poiSlug: z.string().min(1) });

/** + Pridať zastávku do dňa (z katalógu / kroku 06) – ručná, generátor ju zachová. */
export async function addStopAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = stopSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'Neplatný vstup.' };
  const { tripId, dayId, poiSlug } = parsed.data;
  if (!(await editable(tripId))) return { ok: false, error: NO_EDIT };
  const db = getDb();
  const [day] = await db
    .select()
    .from(schema.itineraryDays)
    .where(and(eq(schema.itineraryDays.id, dayId), eq(schema.itineraryDays.tripId, tripId)))
    .limit(1);
  const [poi] = await db
    .select({ id: schema.pois.id, visitMin: schema.pois.visitMin })
    .from(schema.pois)
    .where(eq(schema.pois.slug, poiSlug))
    .limit(1);
  if (!day || !poi) return { ok: false, error: 'Deň alebo miesto neexistuje.' };
  const stops = await db.select().from(schema.itineraryStops).where(eq(schema.itineraryStops.dayId, dayId));
  if (stops.some((s) => s.poiId === poi.id)) return { ok: false, error: 'Už je v tomto dni.' };
  await db
    .insert(schema.itineraryStops)
    .values({ dayId, order: stops.length, poiId: poi.id, stayMin: poi.visitMin ?? 60, isManual: true });
  await recomputeDay(tripId, dayId);
  revalidate(tripId);
  return { ok: true };
}

const removeSchema = z.object({ tripId: z.uuid(), stopId: z.uuid() });

export async function removeStopAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = removeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'Neplatný vstup.' };
  const { tripId, stopId } = parsed.data;
  if (!(await editable(tripId))) return { ok: false, error: NO_EDIT };
  const db = getDb();
  const [stop] = await db
    .select()
    .from(schema.itineraryStops)
    .where(eq(schema.itineraryStops.id, stopId))
    .limit(1);
  if (!stop) return { ok: false, error: 'Zastávka neexistuje.' };
  await db.delete(schema.itineraryStops).where(eq(schema.itineraryStops.id, stopId));
  await recomputeDay(tripId, stop.dayId);
  revalidate(tripId);
  return { ok: true };
}

const lockSchema = z.object({ tripId: z.uuid(), dayId: z.uuid(), locked: z.enum(['1', '0']) });

/** Zamknúť deň – generátor aj kaskáda ho nechajú tak. */
export async function lockDayAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = lockSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'Neplatný vstup.' };
  const { tripId, dayId, locked } = parsed.data;
  if (!(await editable(tripId))) return { ok: false, error: NO_EDIT };
  await getDb()
    .update(schema.itineraryDays)
    .set({ locked: locked === '1', updatedAt: new Date() })
    .where(and(eq(schema.itineraryDays.id, dayId), eq(schema.itineraryDays.tripId, tripId)));
  revalidate(tripId);
  return { ok: true };
}

/** Prepočet km/min dňa z matice po ručnej zmene zastávok (poradie ostáva, ako je). */
async function recomputeDay(tripId: string, dayId: string) {
  const db = getDb();
  const days = await db
    .select()
    .from(schema.itineraryDays)
    .where(and(eq(schema.itineraryDays.tripId, tripId), eq(schema.itineraryDays.scenarioKey, 'drive')))
    .orderBy(asc(schema.itineraryDays.dayIndex));
  const idx = days.findIndex((d) => d.id === dayId);
  if (idx === -1) return;
  const day = days[idx];
  const prev = days[idx - 1];
  const startKey = idx === 0 ? 'kef' : prev.overnightRegionId ? `region:${prev.overnightRegionId}` : 'kef';
  const endKey =
    idx === days.length - 1 ? 'kef' : day.overnightRegionId ? `region:${day.overnightRegionId}` : 'kef';
  const matrix = await loadMatrix();
  const stops = await db
    .select()
    .from(schema.itineraryStops)
    .where(eq(schema.itineraryStops.dayId, dayId))
    .orderBy(asc(schema.itineraryStops.order));
  const slugById = new Map(
    (await db.select({ id: schema.pois.id, slug: schema.pois.slug }).from(schema.pois)).map((p) => [
      p.id,
      p.slug,
    ]),
  );
  let cur = startKey;
  let km = 0;
  let min = 0;
  let order = 0;
  for (const s of stops) {
    if (s.skip) continue;
    const key = s.poiId ? (slugById.get(s.poiId) ?? cur) : cur;
    const leg = matrix(cur, key) ?? { km: 0, min: 0 };
    await db
      .update(schema.itineraryStops)
      .set({
        order: order++,
        driveKmFromPrev: String(Math.round(leg.km * 10) / 10),
        driveMinFromPrev: Math.round(leg.min),
      })
      .where(eq(schema.itineraryStops.id, s.id));
    km += leg.km;
    min += leg.min;
    cur = key;
  }
  const last = matrix(cur, endKey) ?? { km: 0, min: 0 };
  km += last.km;
  min += last.min;
  const real = Math.round(min * 1.25 + stops.filter((s) => !s.skip).length * 10);
  await db
    .update(schema.itineraryDays)
    .set({
      driveKm: String(Math.round(km)),
      driveMin: Math.round(min),
      driveMinReal: real,
      updatedAt: new Date(),
    })
    .where(eq(schema.itineraryDays.id, dayId));
}
