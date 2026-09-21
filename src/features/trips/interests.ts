import 'server-only';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { groupAvailability, type GroupAvailability } from '@/engine/availability';
import { INTEREST_KEYS, type InterestKey, type InterestScores } from '@/engine/types';

/**
 * Záujmy cesty pre generátor a hodnotenie okruhov: ručne zvolené v kroku 01 („Upraviť…“),
 * inak zjednotenie záujmov členov z profilov (skóre ≥ 2 = „chcem“ / „kvôli tomu idem“).
 */
export async function effectiveInterests(tripId: string, tripInterests: string[]): Promise<InterestKey[]> {
  const own = tripInterests.filter((i): i is InterestKey => (INTEREST_KEYS as readonly string[]).includes(i));
  if (own.length) return own;
  const rows = await getDb()
    .select({ interests: schema.profiles.interests })
    .from(schema.tripMembers)
    .innerJoin(schema.profiles, eq(schema.profiles.userId, schema.tripMembers.userId))
    .where(eq(schema.tripMembers.tripId, tripId));
  const sum: Partial<Record<InterestKey, number>> = {};
  for (const r of rows)
    for (const [k, v] of Object.entries((r.interests ?? {}) as InterestScores))
      if ((v ?? 0) >= 2) sum[k as InterestKey] = (sum[k as InterestKey] ?? 0) + (v ?? 0);
  return INTEREST_KEYS.filter((k) => (sum[k] ?? 0) > 0).sort((a, b) => (sum[b] ?? 0) - (sum[a] ?? 0));
}

/** „Kedy môžem“ z profilov členov → prienik pre cieľový mesiac a dĺžku cesty (krok 01 varovania, krok 02 kalendár). */
export async function tripAvailability(
  tripId: string,
  targetMonth: string,
  days: { min: number; max: number },
): Promise<GroupAvailability> {
  const rows = await getDb()
    .select({ name: schema.profiles.displayName, availability: schema.profiles.availability })
    .from(schema.tripMembers)
    .innerJoin(schema.profiles, eq(schema.profiles.userId, schema.tripMembers.userId))
    .where(eq(schema.tripMembers.tripId, tripId));
  return groupAvailability(
    rows.map((r) => ({ name: r.name.split(' ')[0], availability: r.availability })),
    targetMonth.slice(0, 7),
    days,
  );
}
