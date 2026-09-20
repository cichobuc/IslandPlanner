'use server';

import { and, eq, sql } from 'drizzle-orm';
import { getLocale } from 'next-intl/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getDb, schema } from '@/db';
import { travelerFromProfile } from '@/features/profile/traveler-from-profile';
import { getCurrentUser } from '@/lib/auth/session';
import { getTripAccess } from './access';
import { monthLabel } from './progress';

export type ActionState = { ok: true } | { ok: false; error: string } | null;

/** Predvolený cieľový mesiac (šprint: september 2027). Krok 01 ho nechá zmeniť. */
const DEFAULT_TARGET_MONTH = '2027-09-01';

/**
 * + Nová cesta: bez wizardu – založí cestu s predvoľbami a cestujúceho z profilu vlastníka (člen owner vzniká triggerom),
 * potom presmeruje na Cesta s krokom 01 (docs/obrazovky/01-cesty).
 */
export async function createTripAction(): Promise<void> {
  const me = await getCurrentUser();
  if (!me?.profile) redirect(`/${await getLocale()}/prihlasenie`);
  const db = getDb();
  const airports = me.profile.airports?.length ? me.profile.airports : undefined;
  const tripId = await db.transaction(async (tx) => {
    const [trip] = await tx
      .insert(schema.trips)
      .values({
        name: `Island · ${monthLabel(DEFAULT_TARGET_MONTH)}`,
        ownerId: me.user.id,
        targetMonth: DEFAULT_TARGET_MONTH,
        ...(airports ? { originAirports: airports } : {}),
        homeLabel: me.profile!.homeLabel ?? 'Bratislava',
        pace: me.profile!.pace ?? 'normal',
      })
      .returning({ id: schema.trips.id });
    // vlastníka ako člena (owner) pridá DB trigger trips_add_owner_member (src/db/sql/functions.sql)
    await tx.insert(schema.travelers).values({ ...travelerFromProfile(me.profile!), tripId: trip.id, sortOrder: 0 });
    return trip.id;
  });
  revalidatePath('/', 'layout');
  redirect(`/${await getLocale()}/cesta/${tripId}?krok=1`);
}

const memberSchema = z.object({
  tripId: z.uuid(),
  userId: z.uuid(),
  role: z.enum(['editor', 'viewer']).default('editor'),
});

/** Pridá existujúce konto ako člena (len vlastník) a zároveň ako cestujúceho z jeho profilu. */
export async function addMemberAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = memberSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'Vyber používateľa.' };
  const { tripId, userId, role } = parsed.data;
  const access = await getTripAccess(tripId);
  if (!access || access.role !== 'owner') return { ok: false, error: 'Členov spravuje vlastník cesty.' };

  const db = getDb();
  const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, userId)).limit(1);
  if (!profile) return { ok: false, error: 'Používateľ neexistuje.' };
  const [existing] = await db
    .select({ userId: schema.tripMembers.userId })
    .from(schema.tripMembers)
    .where(and(eq(schema.tripMembers.tripId, tripId), eq(schema.tripMembers.userId, userId)))
    .limit(1);
  if (existing) return { ok: false, error: 'Už je členom.' };

  await db.transaction(async (tx) => {
    await tx.insert(schema.tripMembers).values({ tripId, userId, role });
    const [traveler] = await tx
      .select({ id: schema.travelers.id })
      .from(schema.travelers)
      .where(and(eq(schema.travelers.tripId, tripId), eq(schema.travelers.userId, userId)))
      .limit(1);
    if (!traveler) {
      const [{ n }] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(schema.travelers)
        .where(eq(schema.travelers.tripId, tripId));
      await tx.insert(schema.travelers).values({ ...travelerFromProfile(profile), tripId, sortOrder: n });
    }
    await tx.update(schema.trips).set({ updatedAt: new Date() }).where(eq(schema.trips.id, tripId));
  });
  revalidatePath(`/[locale]/cesta/${tripId}`, 'layout');
  return { ok: true };
}

const roleSchema = z.object({ tripId: z.uuid(), userId: z.uuid(), role: z.enum(['editor', 'viewer']) });

export async function updateMemberRoleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = roleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'Neplatná rola.' };
  const { tripId, userId, role } = parsed.data;
  const access = await getTripAccess(tripId);
  if (!access || access.role !== 'owner') return { ok: false, error: 'Členov spravuje vlastník cesty.' };
  if (userId === access.trip.ownerId) return { ok: false, error: 'Vlastníkovi sa rola nemení.' };
  await getDb()
    .update(schema.tripMembers)
    .set({ role })
    .where(and(eq(schema.tripMembers.tripId, tripId), eq(schema.tripMembers.userId, userId)));
  revalidatePath(`/[locale]/cesta/${tripId}`, 'layout');
  return { ok: true };
}

const removeSchema = z.object({ tripId: z.uuid(), userId: z.uuid() });

/** Odoberie člena aj jeho riadok cestujúceho (ak vznikol z profilu). Vlastníka odobrať nejde. */
export async function removeMemberAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = removeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'Neplatný vstup.' };
  const { tripId, userId } = parsed.data;
  const access = await getTripAccess(tripId);
  if (!access || access.role !== 'owner') return { ok: false, error: 'Členov spravuje vlastník cesty.' };
  if (userId === access.trip.ownerId) return { ok: false, error: 'Vlastníka nejde odobrať.' };
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.delete(schema.tripMembers).where(and(eq(schema.tripMembers.tripId, tripId), eq(schema.tripMembers.userId, userId)));
    await tx.delete(schema.travelers).where(and(eq(schema.travelers.tripId, tripId), eq(schema.travelers.userId, userId)));
  });
  revalidatePath(`/[locale]/cesta/${tripId}`, 'layout');
  return { ok: true };
}

const renameSchema = z.object({ tripId: z.uuid(), name: z.string().trim().min(2).max(80) });

export async function renameTripAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = renameSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'Názov musí mať 2–80 znakov.' };
  const access = await getTripAccess(parsed.data.tripId);
  if (!access || (access.role !== 'owner' && access.role !== 'editor')) return { ok: false, error: 'Nemáš právo upravovať.' };
  await getDb()
    .update(schema.trips)
    .set({ name: parsed.data.name, updatedAt: new Date() })
    .where(eq(schema.trips.id, parsed.data.tripId));
  revalidatePath('/', 'layout');
  return { ok: true };
}
