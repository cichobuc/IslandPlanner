'use server';

import { and, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getDb, schema } from '@/db';
import { INTEREST_KEYS } from '@/engine/types';
import { canEdit, getTripAccess } from './access';
import type { ActionState } from './actions';
import { monthLabel } from './progress';

const NO_EDIT = 'Nemáš právo upravovať túto cestu.';
const revalidate = (tripId: string) => revalidatePath(`/[locale]/cesta/${tripId}`, 'layout');

async function editable(tripId: string) {
  const access = await getTripAccess(tripId);
  return access && canEdit(access.role) ? access : null;
}

const int = (min: number, max: number) => z.coerce.number().int().min(min).max(max);
const optStr = z.string().trim().max(200).optional().or(z.literal(''));
/** Prázdny text z formulára = nevyplnené (z.coerce.number by z '' spravil 0). */
const optInt = (min: number, max: number) =>
  z.preprocess((v) => (v === '' || v == null ? undefined : v), int(min, max).optional());
const optNum = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    z.coerce.number().min(min).max(max).optional(),
  );

const travelerSchema = z.object({
  tripId: z.uuid(),
  travelerId: z.uuid().optional().or(z.literal('')),
  name: z.string().trim().min(1).max(60),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal('')),
  ageFallback: optInt(0, 110),
  isDriver: z.enum(['yes', 'no']).default('no'),
  driverSinceYear: optInt(1950, 2030),
  hasCreditCard: z.enum(['yes', 'no']).default('no'),
  cabinSmall: int(0, 4).default(1),
  cabin10: int(0, 4).default(0),
  checked20: int(0, 4).default(0),
  checked32: int(0, 4).default(0),
  sharesBagsWith: z.uuid().optional().or(z.literal('')),
  dietNote: optStr,
});

/** Sheet Cestujúci: založí alebo upraví riadok (meno, vek/dátum, vodič, kreditka, batožina, dvojica na kufor). */
export async function upsertTravelerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = travelerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { ok: false, error: `Skontroluj polia (${parsed.error.issues[0]?.path.join('.')}).` };
  const v = parsed.data;
  if (!(await editable(v.tripId))) return { ok: false, error: NO_EDIT };
  const db = getDb();
  const values = {
    name: v.name,
    birthDate: v.birthDate || null,
    ageFallback: v.birthDate ? null : (v.ageFallback ?? null),
    isDriver: v.isDriver === 'yes',
    driverSince: v.isDriver === 'yes' && v.driverSinceYear ? `${v.driverSinceYear}-01-01` : null,
    hasCreditCard: v.hasCreditCard === 'yes',
    bags: { cabinSmall: v.cabinSmall, cabin10: v.cabin10, checked20: v.checked20, checked32: v.checked32 },
    sharesBagsWith: v.sharesBagsWith || null,
    dietNote: v.dietNote || null,
    updatedAt: new Date(),
  };
  if (v.travelerId) {
    await db
      .update(schema.travelers)
      .set(values)
      .where(and(eq(schema.travelers.id, v.travelerId), eq(schema.travelers.tripId, v.tripId)));
  } else {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.travelers)
      .where(eq(schema.travelers.tripId, v.tripId));
    await db.insert(schema.travelers).values({ ...values, tripId: v.tripId, sortOrder: n });
  }
  // dvojica na kufor je symetrická
  if (v.sharesBagsWith && v.travelerId) {
    await db
      .update(schema.travelers)
      .set({ sharesBagsWith: v.travelerId })
      .where(and(eq(schema.travelers.id, v.sharesBagsWith), eq(schema.travelers.tripId, v.tripId)));
  }
  revalidate(v.tripId);
  return { ok: true };
}

const idSchema = z.object({ tripId: z.uuid(), travelerId: z.uuid() });

/** Odobrať cestujúceho – len ručne pridaného (člen sa odoberá v Členoch). */
export async function removeTravelerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = idSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'Neplatný vstup.' };
  const { tripId, travelerId } = parsed.data;
  if (!(await editable(tripId))) return { ok: false, error: NO_EDIT };
  const db = getDb();
  const [t] = await db
    .select({ userId: schema.travelers.userId })
    .from(schema.travelers)
    .where(eq(schema.travelers.id, travelerId))
    .limit(1);
  if (!t) return { ok: false, error: 'Cestujúci neexistuje.' };
  if (t.userId) return { ok: false, error: 'Je člen cesty – odober ho v Členoch.' };
  await db
    .update(schema.travelers)
    .set({ sharesBagsWith: null })
    .where(eq(schema.travelers.sharesBagsWith, travelerId));
  await db
    .delete(schema.travelers)
    .where(and(eq(schema.travelers.id, travelerId), eq(schema.travelers.tripId, tripId)));
  revalidate(tripId);
  return { ok: true };
}

const airportSchema = z.object({
  tripId: z.uuid(),
  iata: z.string().regex(/^[A-Z]{3}$/),
  on: z.enum(['1', '0']),
});

/** Prepínač letiska zapnuté/vypnuté → `trips.origin_airports` (rozhoduje, kde sa hľadajú letenky). */
export async function toggleAirportAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = airportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'Neplatné letisko.' };
  const { tripId, iata, on } = parsed.data;
  const access = await editable(tripId);
  if (!access) return { ok: false, error: NO_EDIT };
  const set = new Set(access.trip.originAirports);
  if (on === '1') set.add(iata);
  else set.delete(iata);
  if (set.size === 0) return { ok: false, error: 'Aspoň jedno letisko musí ostať zapnuté.' };
  const order = ['BTS', 'VIE', 'BUD', 'PRG', 'KTW'];
  const next = [...set].sort((a, b) => ((order.indexOf(a) + 99) % 99) - ((order.indexOf(b) + 99) % 99));
  await getDb()
    .update(schema.trips)
    .set({ originAirports: next, updatedAt: new Date() })
    .where(eq(schema.trips.id, tripId));
  revalidate(tripId);
  return { ok: true };
}

const settingsSchema = z.object({
  tripId: z.uuid(),
  targetMonth: z.string().regex(/^\d{4}-\d{2}$/),
  minDays: int(3, 21),
  maxDays: int(3, 21),
  allowSelfTransfer: z.enum(['yes', 'no']).default('yes'),
  pace: z.enum(['relaxed', 'normal', 'intense']).default('normal'),
  budgetTargetPp: optNum(0, 100000),
});

/** Sekcia „Kedy a ako": mesiac, dĺžka pobytu, prestupy, tempo, záujmy, cieľový rozpočet. */
export async function updateTripSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { ok: false, error: `Skontroluj polia (${parsed.error.issues[0]?.path.join('.')}).` };
  const v = parsed.data;
  if (v.minDays > v.maxDays) return { ok: false, error: 'Minimum dní nemôže byť väčšie než maximum.' };
  const access = await editable(v.tripId);
  if (!access) return { ok: false, error: NO_EDIT };
  const newMonth = `${v.targetMonth}-01`;
  // predvolený názov „Island · <mesiac>" drží krok s mesiacom; vlastný názov sa nemení
  const rename =
    access.trip.name === `Island · ${monthLabel(access.trip.targetMonth)}`
      ? { name: `Island · ${monthLabel(newMonth)}` }
      : {};
  const interests = formData
    .getAll('interests')
    .map(String)
    .filter((k) => (INTEREST_KEYS as readonly string[]).includes(k));
  await getDb()
    .update(schema.trips)
    .set({
      targetMonth: newMonth,
      ...rename,
      minDays: v.minDays,
      maxDays: v.maxDays,
      allowSelfTransfer: v.allowSelfTransfer === 'yes',
      pace: v.pace,
      interests,
      budgetTargetPp: v.budgetTargetPp == null ? null : String(v.budgetTargetPp),
      updatedAt: new Date(),
    })
    .where(eq(schema.trips.id, v.tripId));
  revalidate(v.tripId);
  return { ok: true };
}
