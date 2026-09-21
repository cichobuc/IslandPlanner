'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getDb, schema } from '@/db';
import type { FlightSelectionInput } from '@/engine/types';
import { canEdit, getTripAccess } from './access';
import { loadSnapshot, optionToInput, runFlightCascade } from './snapshot';

export type SelectState =
  { ok: true; changes: string[]; suggestions: string[] } | { ok: false; error: string } | null;

const NO_EDIT = 'Nemáš právo upravovať túto cestu.';
const revalidate = (tripId: string) => revalidatePath(`/[locale]/cesta/${tripId}`, 'layout');

const selectSchema = z.object({ tripId: z.uuid(), optionId: z.uuid() });

/** Vybrať kombináciu z vyhľadávania → flight_selection + kaskáda (dátumy, dni, noci per vetva). */
export async function selectFlightAction(_prev: SelectState, formData: FormData): Promise<SelectState> {
  const parsed = selectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'Neplatný výber.' };
  const { tripId, optionId } = parsed.data;
  const access = await getTripAccess(tripId);
  if (!access || !canEdit(access.role)) return { ok: false, error: NO_EDIT };
  const db = getDb();
  const [option] = await db
    .select()
    .from(schema.flightOptions)
    .where(and(eq(schema.flightOptions.id, optionId), eq(schema.flightOptions.tripId, tripId)))
    .limit(1);
  if (!option) return { ok: false, error: 'Kombinácia už nie je k dispozícii – obnov vyhľadávanie.' };

  await db
    .insert(schema.flightSelection)
    .values({
      tripId,
      flightOptionId: option.id,
      manual: null,
      lockedPrice: option.totalGroup,
      isManual: false,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.flightSelection.tripId,
      set: {
        flightOptionId: option.id,
        manual: null,
        lockedPrice: option.totalGroup,
        isManual: false,
        excluded: [],
        parkingOptionId: null,
        updatedAt: new Date(),
      },
    });
  const result = await runFlightCascade(tripId, optionToInput(option));
  revalidate(tripId);
  return {
    ok: true,
    changes: result.changes.map((c) => c.labelSk),
    suggestions: result.suggestions.map((s) => s.labelSk),
  };
}

const dt = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
const manualSchema = z.object({
  tripId: z.uuid(),
  origin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/),
  outDepAt: dt,
  outArrAt: dt,
  retDepAt: dt,
  retArrAt: dt,
  airline: z.string().trim().max(40).optional().or(z.literal('')),
  priceGroup: z.coerce.number().min(0).max(100000),
  bagsTotal: z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().min(0).max(5000).optional()),
  parkingTotal: z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().min(0).max(5000).optional()),
  url: z.string().trim().url().optional().or(z.literal('')),
});

/**
 * „+ Zadať let ručne": časy sú lokálne (odlet/prílet v čase daného letiska) – domov UTC+2 (leto), KEF UTC+0.
 * Cena skupiny = letenky bez batožiny; batožina a parkovanie sú voliteľné (parkovanie inak zo seedu podľa letiska).
 */
export async function selectManualFlightAction(_prev: SelectState, formData: FormData): Promise<SelectState> {
  const parsed = manualSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { ok: false, error: `Skontroluj polia (${parsed.error.issues[0]?.path.join('.')}).` };
  const v = parsed.data;
  const access = await getTripAccess(v.tripId);
  if (!access || !canEdit(access.role)) return { ok: false, error: NO_EDIT };
  const pax = (await loadSnapshot(v.tripId)).travelers.length || 1;
  const home = (s: string) => `${s}:00+02:00`;
  const kef = (s: string) => `${s}:00+00:00`;
  const farePpAmount = Math.round((v.priceGroup / pax) * 100) / 100;
  const manual = {
    origin: v.origin,
    outDepAt: home(v.outDepAt),
    outArrAt: kef(v.outArrAt),
    retDepAt: kef(v.retDepAt),
    retArrAt: home(v.retArrAt),
    airline: v.airline || undefined,
    url: v.url || undefined,
    farePp: farePpAmount,
    bagsTotal: v.bagsTotal,
    parkingTotal: v.parkingTotal,
  };
  if (
    Date.parse(manual.outArrAt) <= Date.parse(manual.outDepAt) ||
    Date.parse(manual.retDepAt) <= Date.parse(manual.outArrAt) ||
    Date.parse(manual.retArrAt) <= Date.parse(manual.retDepAt)
  )
    return { ok: false, error: 'Časy nejdú za sebou (odlet < prílet < návrat).' };
  const lockedPrice = { amount: v.priceGroup, currency: 'EUR', source: 'manual' as const };
  const db = getDb();
  await db
    .insert(schema.flightSelection)
    .values({
      tripId: v.tripId,
      flightOptionId: null,
      manual,
      lockedPrice,
      isManual: true,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.flightSelection.tripId,
      set: {
        flightOptionId: null,
        manual,
        lockedPrice,
        isManual: true,
        excluded: [],
        parkingOptionId: null,
        updatedAt: new Date(),
      },
    });
  const flight: FlightSelectionInput = {
    origin: v.origin,
    outDepAt: manual.outDepAt,
    outArrAt: manual.outArrAt,
    retDepAt: manual.retDepAt,
    retArrAt: manual.retArrAt,
    farePp: { amount: farePpAmount, currency: 'EUR', source: 'manual' },
  };
  const result = await runFlightCascade(v.tripId, flight);
  revalidate(v.tripId);
  return {
    ok: true,
    changes: result.changes.map((c) => c.labelSk),
    suggestions: result.suggestions.map((s) => s.labelSk),
  };
}

const clearSchema = z.object({ tripId: z.uuid() });

/** Zrušiť výber letu: dátumy preč, nezamknuté dni a neručné noci sa zmažú (ručné ostávajú). */
export async function clearFlightAction(_prev: SelectState, formData: FormData): Promise<SelectState> {
  const parsed = clearSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'Neplatný vstup.' };
  const { tripId } = parsed.data;
  const access = await getTripAccess(tripId);
  if (!access || !canEdit(access.role)) return { ok: false, error: NO_EDIT };
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.delete(schema.flightSelection).where(eq(schema.flightSelection.tripId, tripId));
    await tx
      .update(schema.trips)
      .set({ startDate: null, endDate: null, updatedAt: new Date() })
      .where(eq(schema.trips.id, tripId));
    await tx
      .delete(schema.itineraryDays)
      .where(and(eq(schema.itineraryDays.tripId, tripId), eq(schema.itineraryDays.locked, false)));
    await tx
      .delete(schema.lodgingStays)
      .where(and(eq(schema.lodgingStays.tripId, tripId), eq(schema.lodgingStays.isManual, false)));
  });
  revalidate(tripId);
  return { ok: true, changes: ['Výber letu zrušený – termín, dni a noci vymazané.'], suggestions: [] };
}

const extraSchema = z.object({
  tripId: z.uuid(),
  item: z.enum(['bags', 'parking', 'access', 'hub_night']),
  on: z.enum(['1', '0']),
});

/** Vyradiť / vrátiť položku vybraného letu (batožina, parkovanie, cesta na letisko, nocľah na hube) – rozpočet sa prepočíta. */
export async function setFlightExtraAction(_prev: SelectState, formData: FormData): Promise<SelectState> {
  const parsed = extraSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'Neplatný vstup.' };
  const { tripId, item, on } = parsed.data;
  const access = await getTripAccess(tripId);
  if (!access || !canEdit(access.role)) return { ok: false, error: NO_EDIT };
  const db = getDb();
  const [sel] = await db
    .select({ excluded: schema.flightSelection.excluded })
    .from(schema.flightSelection)
    .where(eq(schema.flightSelection.tripId, tripId))
    .limit(1);
  if (!sel) return { ok: false, error: 'Najprv vyber let.' };
  const set = new Set(sel.excluded ?? []);
  if (on === '1') set.delete(item);
  else set.add(item);
  await db
    .update(schema.flightSelection)
    .set({ excluded: [...set], updatedAt: new Date() })
    .where(eq(schema.flightSelection.tripId, tripId));
  revalidate(tripId);
  return { ok: true, changes: [], suggestions: [] };
}

const parkingSchema = z.object({ tripId: z.uuid(), parkingOptionId: z.string() });

/** Zvoliť parkovisko pri letisku odletu ('' = späť na najlacnejšie zo seedu); zároveň vráti položku parkovanie. */
export async function setParkingOptionAction(_prev: SelectState, formData: FormData): Promise<SelectState> {
  const parsed = parkingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'Neplatný vstup.' };
  const { tripId, parkingOptionId } = parsed.data;
  const access = await getTripAccess(tripId);
  if (!access || !canEdit(access.role)) return { ok: false, error: NO_EDIT };
  const db = getDb();
  const [sel] = await db
    .select({ excluded: schema.flightSelection.excluded })
    .from(schema.flightSelection)
    .where(eq(schema.flightSelection.tripId, tripId))
    .limit(1);
  if (!sel) return { ok: false, error: 'Najprv vyber let.' };
  await db
    .update(schema.flightSelection)
    .set({
      parkingOptionId: parkingOptionId || null,
      excluded: (sel.excluded ?? []).filter((x) => x !== 'parking'),
      updatedAt: new Date(),
    })
    .where(eq(schema.flightSelection.tripId, tripId));
  revalidate(tripId);
  return { ok: true, changes: [], suggestions: [] };
}
