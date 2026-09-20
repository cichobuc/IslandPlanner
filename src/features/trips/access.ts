import 'server-only';
import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { getCurrentUser } from '@/lib/auth/session';

export type TripRole = 'owner' | 'editor' | 'viewer';
export type TripAccess = {
  trip: typeof schema.trips.$inferSelect;
  role: TripRole;
  me: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
};

/**
 * Prístup k ceste podľa `trip_members` (Drizzle ide cez service rolu, RLS neplatí → kontrola tu).
 * Správca inštancie má prístup ako viewer, ak nie je členom. null = neprihlásený / bez prístupu.
 */
export async function getTripAccess(tripId: string): Promise<TripAccess | null> {
  const me = await getCurrentUser();
  if (!me) return null;
  const db = getDb();
  const [trip] = await db.select().from(schema.trips).where(eq(schema.trips.id, tripId)).limit(1);
  if (!trip) return null;
  if (trip.ownerId === me.user.id) return { trip, role: 'owner', me };
  const [m] = await db
    .select({ role: schema.tripMembers.role })
    .from(schema.tripMembers)
    .where(and(eq(schema.tripMembers.tripId, tripId), eq(schema.tripMembers.userId, me.user.id)))
    .limit(1);
  if (m) return { trip, role: m.role, me };
  if (me.profile?.isAdmin) return { trip, role: 'viewer', me };
  return null;
}

export const canEdit = (role: TripRole) => role === 'owner' || role === 'editor';
