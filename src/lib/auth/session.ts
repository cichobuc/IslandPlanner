import 'server-only';
import { eq } from 'drizzle-orm';
import { cache } from 'react';
import { getDb, schema } from '@/db';
import { createSupabaseServer } from '@/lib/supabase/server';

/** Prihlásený používateľ + profil (cache per request). null = neprihlásený. */
export const getCurrentUser = cache(async () => {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const db = getDb();
  const [profile] = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.userId, user.id))
    .limit(1);
  return { user, profile: profile ?? null };
});

export async function requireAdmin() {
  const me = await getCurrentUser();
  if (!me?.profile?.isAdmin) return null;
  return me;
}
