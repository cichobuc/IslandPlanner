'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getDb, schema } from '@/db';
import { canEdit, getTripAccess } from './access';
import type { ActionState } from './actions';

const NO_EDIT = 'Nemáš právo upravovať túto cestu.';
const revalidate = (tripId: string) => revalidatePath(`/[locale]/cesta/${tripId}`, 'layout');
const opt = <T extends z.ZodTypeAny>(t: T) =>
  z.preprocess((v) => (v === '' || v == null ? undefined : v), t.optional());

async function editableStay(tripId: string, stayId: string) {
  const access = await getTripAccess(tripId);
  if (!access || !canEdit(access.role)) return null;
  const [stay] = await getDb()
    .select()
    .from(schema.lodgingStays)
    .where(and(eq(schema.lodgingStays.id, stayId), eq(schema.lodgingStays.tripId, tripId)))
    .limit(1);
  return stay ? { access, stay } : null;
}

const offerSchema = z.object({
  tripId: z.uuid(),
  stayId: z.uuid(),
  name: z.string().trim().min(2).max(120),
  url: z.string().trim().url().optional().or(z.literal('')),
  kind: z.enum(['airbnb', 'hotel', 'guesthouse', 'hostel']),
  pricePerNight: z.coerce.number().min(0).max(10000),
  cleaningFee: opt(z.coerce.number().min(0).max(1000)),
  hasKitchen: z.enum(['yes', 'no']).default('yes'),
  checkInUntil: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional()
    .or(z.literal('')),
});

/** „Vložiť ponuku": ubytovanie z Booking/Airbnb (URL + cena) → lodging_options (per cesta) + priradenie k noci. Až tým je noc presná. */
export async function assignOfferAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = offerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { ok: false, error: `Skontroluj polia (${parsed.error.issues[0]?.path.join('.')}).` };
  const v = parsed.data;
  const ctx = await editableStay(v.tripId, v.stayId);
  if (!ctx) return { ok: false, error: NO_EDIT };
  const db = getDb();
  const [option] = await db
    .insert(schema.lodgingOptions)
    .values({
      tripId: v.tripId,
      regionId: ctx.stay.regionId,
      kind: v.kind,
      name: v.name,
      url: v.url || null,
      connectorId: 'lodging-manual',
      pricePerNight: { amount: v.pricePerNight, currency: 'EUR', source: 'manual' },
      cleaningFee:
        v.cleaningFee != null ? { amount: v.cleaningFee, currency: 'EUR', source: 'manual' } : null,
      hasKitchen: v.hasKitchen === 'yes',
      checkInUntil: v.checkInUntil || null,
      verifiedAt: new Date(),
    })
    .returning({ id: schema.lodgingOptions.id });
  await db
    .update(schema.lodgingStays)
    .set({
      lodgingOptionId: option.id,
      kindOverride: v.kind,
      priceOverride: null,
      hasKitchen: v.hasKitchen === 'yes',
      isManual: true,
      updatedAt: new Date(),
    })
    .where(eq(schema.lodgingStays.id, v.stayId));
  revalidate(v.tripId);
  return { ok: true };
}

const campSchema = z.object({
  tripId: z.uuid(),
  stayId: z.uuid(),
  source: z.enum(['tjalda', 'seed']),
  ref: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(120),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  perPersonIsk: z.coerce.number().min(0).max(20000),
  electricityIsk: opt(z.coerce.number().min(0).max(10000)),
  openUntil: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal('')),
  campingCard: z.enum(['1', '0']).default('0'),
  url: z.string().trim().url().optional().or(z.literal('')),
  hasKitchen: z.enum(['1', '0']).default('0'),
});

/** Priradiť kemp (tjalda živé / seed) k noci vetvy Karavan – ponuka sa uloží per cesta (konektor + ref), cena v ISK. */
export async function assignCampsiteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = campSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { ok: false, error: `Neplatný kemp (${parsed.error.issues[0]?.path.join('.')}).` };
  const v = parsed.data;
  const ctx = await editableStay(v.tripId, v.stayId);
  if (!ctx) return { ok: false, error: NO_EDIT };
  const db = getDb();
  const connectorId = `${v.source}:${v.ref}`;
  const [existing] = await db
    .select({ id: schema.lodgingOptions.id })
    .from(schema.lodgingOptions)
    .where(
      and(eq(schema.lodgingOptions.tripId, v.tripId), eq(schema.lodgingOptions.connectorId, connectorId)),
    )
    .limit(1);
  const values = {
    tripId: v.tripId,
    regionId: ctx.stay.regionId,
    kind: 'camper_site' as const,
    name: v.name,
    url: v.url || null,
    connectorId,
    lat: String(v.lat),
    lng: String(v.lng),
    pricePerPerson: {
      amount: v.perPersonIsk,
      currency: 'ISK',
      source: v.source === 'tjalda' ? ('api' as const) : ('seed' as const),
    },
    electricity: (v.electricityIsk ?? 0) > 0,
    openUntil: v.openUntil || null,
    hasKitchen: v.hasKitchen === '1',
    fetchedAt: new Date(),
  };
  let optionId = existing?.id;
  if (optionId)
    await db.update(schema.lodgingOptions).set(values).where(eq(schema.lodgingOptions.id, optionId));
  else
    optionId = (
      await db.insert(schema.lodgingOptions).values(values).returning({ id: schema.lodgingOptions.id })
    )[0].id;
  await db
    .update(schema.lodgingStays)
    .set({
      lodgingOptionId: optionId,
      kindOverride: 'camper_site',
      priceOverride: null,
      hasKitchen: true,
      isManual: true,
      notes: JSON.stringify({ electricityIsk: v.electricityIsk ?? 0, campingCard: v.campingCard === '1' }),
      updatedAt: new Date(),
    })
    .where(eq(schema.lodgingStays.id, v.stayId));
  revalidate(v.tripId);
  return { ok: true };
}

const staySchema = z.object({
  tripId: z.uuid(),
  stayId: z.uuid(),
  op: z.enum(['clear', 'no_lodging', 'kitchen_on', 'kitchen_off']),
});

/** Noc späť na odhad · noc bez ubytovania (nočný let / v aute = 0 €) · kuchynka pri odhade. */
export async function updateStayAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = staySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'Neplatný vstup.' };
  const { tripId, stayId, op } = parsed.data;
  const ctx = await editableStay(tripId, stayId);
  if (!ctx) return { ok: false, error: NO_EDIT };
  const set =
    op === 'clear'
      ? {
          lodgingOptionId: null,
          kindOverride: null,
          priceOverride: null,
          hasKitchen: null,
          isManual: false,
          notes: null,
        }
      : op === 'no_lodging'
        ? {
            lodgingOptionId: null,
            kindOverride: null,
            priceOverride: { amount: 0, currency: 'EUR', source: 'manual' as const },
            hasKitchen: false,
            isManual: true,
            notes: 'bez ubytovania',
          }
        : { hasKitchen: op === 'kitchen_on', isManual: true };
  await getDb()
    .update(schema.lodgingStays)
    .set({ ...set, updatedAt: new Date() })
    .where(eq(schema.lodgingStays.id, stayId));
  revalidate(tripId);
  return { ok: true };
}

const kindSchema = z.object({ tripId: z.uuid(), kind: z.enum(['hostel', 'guesthouse', 'airbnb', 'hotel']) });

/** Štandard izieb pre všetky odhadované noci vetvy Auto (bez ponuky) – rozpätie zo seedu podľa typu. */
export async function setEstimateKindAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = kindSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'Neplatný typ.' };
  const { tripId, kind } = parsed.data;
  const access = await getTripAccess(tripId);
  if (!access || !canEdit(access.role)) return { ok: false, error: NO_EDIT };
  const db = getDb();
  const stays = await db
    .select({ id: schema.lodgingStays.id, lodgingOptionId: schema.lodgingStays.lodgingOptionId, notes: schema.lodgingStays.notes })
    .from(schema.lodgingStays)
    .where(and(eq(schema.lodgingStays.tripId, tripId), eq(schema.lodgingStays.scenarioKey, 'car')));
  const ids = stays.filter((s) => !s.lodgingOptionId && s.notes !== 'bez ubytovania').map((s) => s.id);
  for (const id of ids)
    await db
      .update(schema.lodgingStays)
      .set({ kindOverride: kind, updatedAt: new Date() })
      .where(eq(schema.lodgingStays.id, id));
  revalidate(tripId);
  return { ok: true };
}

const cardSchema = z.object({ tripId: z.uuid(), on: z.enum(['1', '0']) });

/** Camping Card (2 dospelí/karta, 199 €, platí do 15. 9.) – uložená pri vozidle vetvy Karavan. */
export async function setCampingCardAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = cardSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'Neplatný vstup.' };
  const { tripId, on } = parsed.data;
  const access = await getTripAccess(tripId);
  if (!access || !canEdit(access.role)) return { ok: false, error: NO_EDIT };
  const res = await getDb()
    .update(schema.vehicleSelection)
    .set({ campingCard: on === '1', updatedAt: new Date() })
    .where(and(eq(schema.vehicleSelection.tripId, tripId), eq(schema.vehicleSelection.scenarioKey, 'camper')))
    .returning({ id: schema.vehicleSelection.id });
  if (res.length === 0) return { ok: false, error: 'Najprv zvoľ karavan v kroku 03.' };
  revalidate(tripId);
  return { ok: true };
}

const regionSchema = z.object({
  tripId: z.uuid(),
  stayId: z.uuid(),
  regionId: z.string().regex(/^[a-z_]+$/),
});

/**
 * Prepísať región noci (napr. chcem spať v Höfne, nie v Skaftafelli): noc vetvy + prenocovanie dňa v itinerári (scenár drive).
 * Priradené ubytovanie sa zruší (je v inom regióne); trasa dostane návrh pregenerovať dotknuté dni v kroku 04.
 */
export async function setNightRegionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = regionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'Neplatný región.' };
  const { tripId, stayId, regionId } = parsed.data;
  const ctx = await editableStay(tripId, stayId);
  if (!ctx) return { ok: false, error: NO_EDIT };
  const db = getDb();
  const [region] = await db
    .select({ id: schema.regions.id })
    .from(schema.regions)
    .where(eq(schema.regions.id, regionId))
    .limit(1);
  if (!region) return { ok: false, error: 'Región neexistuje.' };
  if (ctx.stay.regionId === regionId) return { ok: true };
  await db.transaction(async (tx) => {
    // obe vetvy majú tú istú noc – región je vlastnosť trasy, nie ubytovania
    await tx
      .update(schema.lodgingStays)
      .set({
        regionId,
        lodgingOptionId: null,
        kindOverride: null,
        priceOverride: null,
        isManual: true,
        notes: null,
        updatedAt: new Date(),
      })
      .where(
        and(eq(schema.lodgingStays.tripId, tripId), eq(schema.lodgingStays.nightIndex, ctx.stay.nightIndex)),
      );
    await tx
      .update(schema.itineraryDays)
      .set({ overnightRegionId: regionId, updatedAt: new Date() })
      .where(
        and(
          eq(schema.itineraryDays.tripId, tripId),
          eq(schema.itineraryDays.scenarioKey, 'drive'),
          eq(schema.itineraryDays.dayIndex, ctx.stay.nightIndex),
        ),
      );
  });
  revalidate(tripId);
  return { ok: true };
}
