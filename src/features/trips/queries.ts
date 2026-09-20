import 'server-only';
import { and, asc, desc, eq, inArray, or, sql } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { tripProgress } from './progress';

export type TripListItem = {
  id: string;
  name: string;
  targetMonth: string;
  startDate: string | null;
  endDate: string | null;
  transportMode: 'car' | 'camper' | 'no_car' | null;
  status: 'draft' | 'planned' | 'booked' | 'done';
  updatedAt: Date;
  isOwner: boolean;
  travelersCount: number;
  memberNames: string[];
  progressDone: number;
};

/** Cesty, kde som vlastník alebo člen – pre obrazovku Cesty. */
export async function listTripsForUser(userId: string): Promise<TripListItem[]> {
  const db = getDb();
  const memberTripIds = db
    .select({ tripId: schema.tripMembers.tripId })
    .from(schema.tripMembers)
    .where(eq(schema.tripMembers.userId, userId));
  const trips = await db
    .select()
    .from(schema.trips)
    .where(or(eq(schema.trips.ownerId, userId), inArray(schema.trips.id, memberTripIds)))
    .orderBy(desc(schema.trips.updatedAt));
  if (trips.length === 0) return [];
  const ids = trips.map((t) => t.id);

  const [members, travelerCounts] = await Promise.all([
    db
      .select({
        tripId: schema.tripMembers.tripId,
        name: schema.profiles.displayName,
        joinedAt: schema.tripMembers.joinedAt,
      })
      .from(schema.tripMembers)
      .innerJoin(schema.profiles, eq(schema.profiles.userId, schema.tripMembers.userId))
      .where(inArray(schema.tripMembers.tripId, ids))
      .orderBy(asc(schema.tripMembers.joinedAt)),
    db
      .select({ tripId: schema.travelers.tripId, n: sql<number>`count(*)::int` })
      .from(schema.travelers)
      .where(inArray(schema.travelers.tripId, ids))
      .groupBy(schema.travelers.tripId),
  ]);

  return trips.map((t) => {
    const travelersCount = travelerCounts.find((c) => c.tripId === t.id)?.n ?? 0;
    return {
      id: t.id,
      name: t.name,
      targetMonth: t.targetMonth,
      startDate: t.startDate,
      endDate: t.endDate,
      transportMode: t.transportMode,
      status: t.status,
      updatedAt: t.updatedAt,
      isOwner: t.ownerId === userId,
      travelersCount,
      memberNames: members.filter((m) => m.tripId === t.id).map((m) => m.name),
      progressDone: tripProgress({
        travelersCount,
        originAirports: t.originAirports,
        startDate: t.startDate,
        transportMode: t.transportMode,
      }).done,
    };
  });
}

export type TripMember = {
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  displayName: string;
  email: string;
  profileCompleted: boolean;
  mustChangePassword: boolean;
  joinedAt: Date;
};

export async function listTripMembers(tripId: string): Promise<TripMember[]> {
  const rows = await getDb()
    .select({
      userId: schema.tripMembers.userId,
      role: schema.tripMembers.role,
      displayName: schema.profiles.displayName,
      email: schema.profiles.email,
      completedAt: schema.profiles.completedAt,
      mustChangePassword: schema.profiles.mustChangePassword,
      joinedAt: schema.tripMembers.joinedAt,
    })
    .from(schema.tripMembers)
    .innerJoin(schema.profiles, eq(schema.profiles.userId, schema.tripMembers.userId))
    .where(eq(schema.tripMembers.tripId, tripId))
    .orderBy(asc(schema.tripMembers.joinedAt));
  return rows.map((r) => ({ ...r, profileCompleted: Boolean(r.completedAt) }));
}

/** Profily, ktoré ešte nie sú členmi – ponuka „Pridať člena". */
export async function listAddableProfiles(tripId: string) {
  const db = getDb();
  const memberIds = db
    .select({ userId: schema.tripMembers.userId })
    .from(schema.tripMembers)
    .where(eq(schema.tripMembers.tripId, tripId));
  return db
    .select({
      userId: schema.profiles.userId,
      displayName: schema.profiles.displayName,
      email: schema.profiles.email,
    })
    .from(schema.profiles)
    .where(sql`${schema.profiles.userId} not in ${memberIds}`)
    .orderBy(asc(schema.profiles.displayName));
}

/** Počet cestujúcich v ceste (hlavička, súhrn). */
export async function countTravelers(tripId: string): Promise<number> {
  const [r] = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.travelers)
    .where(eq(schema.travelers.tripId, tripId));
  return r?.n ?? 0;
}

/** Počty pre stav krokov 04/05: noci aktívnej vetvy a dni so zastávkami. */
export async function countProgressInputs(tripId: string, mode: 'car' | 'camper' | 'no_car' | null) {
  const db = getDb();
  const scenario = mode === 'camper' ? 'camper' : 'car';
  const [[l], [d]] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.lodgingStays)
      .where(and(eq(schema.lodgingStays.tripId, tripId), eq(schema.lodgingStays.scenarioKey, scenario))),
    db
      .select({ n: sql<number>`count(distinct ${schema.itineraryStops.dayId})::int` })
      .from(schema.itineraryStops)
      .innerJoin(schema.itineraryDays, eq(schema.itineraryDays.id, schema.itineraryStops.dayId))
      .where(eq(schema.itineraryDays.tripId, tripId)),
  ]);
  return { lodgingCount: mode ? (l?.n ?? 0) : 0, dayCount: d?.n ?? 0 };
}
