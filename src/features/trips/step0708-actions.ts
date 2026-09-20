'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getDb, schema } from '@/db';
import { canEdit, getTripAccess } from './access';
import type { ActionState } from './actions';

const NO_EDIT = 'Nemáš právo upravovať túto cestu.';
const revalidate = (tripId: string) => revalidatePath(`/[locale]/cesta/${tripId}`, 'layout');
const optNum = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    z.coerce.number().min(min).max(max).optional(),
  );

async function editable(tripId: string) {
  const access = await getTripAccess(tripId);
  return access && canEdit(access.role) ? access : null;
}

const foodSchema = z.object({
  tripId: z.uuid(),
  level: z.enum(['budget', 'mid', 'comfort']),
  coffeePerDay: z.coerce.number().int().min(0).max(4).default(1),
  alcohol: z.enum(['yes', 'no']).default('no'),
  firstShopPp: optNum(0, 500),
});

/** Krok 07: úroveň stravy, káva/deň, alkohol, prvý nákup na osobu → food_profile (1 : 1 s cestou). */
export async function updateFoodProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = foodSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'Skontroluj polia.' };
  const v = parsed.data;
  if (!(await editable(v.tripId))) return { ok: false, error: NO_EDIT };
  const firstShop =
    v.firstShopPp != null ? { amount: v.firstShopPp, currency: 'EUR', source: 'manual' as const } : null;
  await getDb()
    .insert(schema.foodProfile)
    .values({
      tripId: v.tripId,
      level: v.level,
      coffeePerDay: v.coffeePerDay,
      alcohol: v.alcohol === 'yes',
      firstShop,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.foodProfile.tripId,
      set: {
        level: v.level,
        coffeePerDay: v.coffeePerDay,
        alcohol: v.alcohol === 'yes',
        firstShop,
        updatedAt: new Date(),
      },
    });
  revalidate(v.tripId);
  return { ok: true };
}

const dayLevelSchema = z.object({
  tripId: z.uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  level: z.enum(['budget', 'mid', 'comfort', 'default']),
});

/** Úroveň pre jeden deň (napr. „reštaurácia večer“ = komfort) → day_overrides. */
export async function setFoodDayLevelAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = dayLevelSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'Neplatný vstup.' };
  const { tripId, date, level } = parsed.data;
  if (!(await editable(tripId))) return { ok: false, error: NO_EDIT };
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.foodProfile)
    .where(eq(schema.foodProfile.tripId, tripId))
    .limit(1);
  const overrides = { ...(row?.dayOverrides ?? {}) };
  if (level === 'default') delete overrides[date];
  else overrides[date] = level;
  if (row)
    await db
      .update(schema.foodProfile)
      .set({ dayOverrides: overrides, updatedAt: new Date() })
      .where(eq(schema.foodProfile.tripId, tripId));
  else await db.insert(schema.foodProfile).values({ tripId, dayOverrides: overrides });
  revalidate(tripId);
  return { ok: true };
}

const manualSchema = z.object({
  tripId: z.uuid(),
  label: z.string().trim().min(2).max(80),
  amount: z.coerce.number().min(0).max(100000),
  currency: z.enum(['EUR', 'ISK']).default('EUR'),
  split: z.enum(['group', 'person']).default('group'),
  category: z.enum(['insurance', 'sim', 'souvenir', 'other']).default('other'),
  scenario: z.enum(['both', 'car', 'camper']).default('both'),
});

/** Krok 08: + Položka (poistenie, SIM, suveníry…) – per skupina alebo na osobu, pre obe vetvy alebo jednu. */
export async function addManualItemAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = manualSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { ok: false, error: `Skontroluj polia (${parsed.error.issues[0]?.path.join('.')}).` };
  const v = parsed.data;
  if (!(await editable(v.tripId))) return { ok: false, error: NO_EDIT };
  await getDb()
    .insert(schema.manualItems)
    .values({
      tripId: v.tripId,
      category: v.category,
      label: v.label,
      amount: { amount: v.amount, currency: v.currency, source: 'manual' },
      split: v.split,
      scenarioKey: v.scenario === 'both' ? null : v.scenario,
      isManual: true,
    });
  revalidate(v.tripId);
  return { ok: true };
}

const removeSchema = z.object({ tripId: z.uuid(), itemId: z.uuid() });

export async function removeManualItemAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = removeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'Neplatný vstup.' };
  const { tripId, itemId } = parsed.data;
  if (!(await editable(tripId))) return { ok: false, error: NO_EDIT };
  await getDb()
    .delete(schema.manualItems)
    .where(and(eq(schema.manualItems.id, itemId), eq(schema.manualItems.tripId, tripId)));
  revalidate(tripId);
  return { ok: true };
}

const budgetSchema = z.object({
  tripId: z.uuid(),
  reservePct: z.coerce.number().min(0).max(50),
  budgetTargetPp: optNum(0, 100000),
});

/** Rezerva % a cieľ na osobu (uložené na ceste). */
export async function updateBudgetSettingsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = budgetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'Skontroluj polia.' };
  const v = parsed.data;
  if (!(await editable(v.tripId))) return { ok: false, error: NO_EDIT };
  await getDb()
    .update(schema.trips)
    .set({
      reservePct: String(v.reservePct),
      budgetTargetPp: v.budgetTargetPp != null ? String(v.budgetTargetPp) : null,
      updatedAt: new Date(),
    })
    .where(eq(schema.trips.id, v.tripId));
  revalidate(v.tripId);
  return { ok: true };
}
