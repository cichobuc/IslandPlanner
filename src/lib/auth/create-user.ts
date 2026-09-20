import 'server-only';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { generateTempPassword } from '@/lib/auth/password';
import { sendTempPasswordEmail } from '@/lib/email';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export type CreateUserInput = {
  email: string;
  displayName: string;
  createdBy: string | null;
  isAdmin?: boolean;
  tripId?: string;
  role?: 'owner' | 'editor' | 'viewer';
};

export type CreateUserResult =
  | { ok: true; userId: string; tempPassword: string; emailSent: boolean; existed: false }
  | { ok: true; userId: string; tempPassword: string; emailSent: boolean; existed: true }
  | { ok: false; reason: string };

/**
 * Založí konto s dočasným heslom (service role), profil s must_change_password a voliteľne členstvo v ceste.
 * Ak konto existuje, vygeneruje nové dočasné heslo (reset správcom).
 */
export async function createUserWithTempPassword(input: CreateUserInput): Promise<CreateUserResult> {
  const email = input.email.trim().toLowerCase();
  const admin = createSupabaseAdmin();
  const db = getDb();
  const tempPassword = generateTempPassword();

  const [existing] = await db.select().from(schema.profiles).where(eq(schema.profiles.email, email)).limit(1);
  let userId: string;
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.userId, {
      password: tempPassword,
      app_metadata: { must_change_password: true },
    });
    if (error) return { ok: false, reason: error.message };
    userId = existing.userId;
    await db
      .update(schema.profiles)
      .set({ mustChangePassword: true })
      .where(eq(schema.profiles.userId, userId));
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { display_name: input.displayName },
      app_metadata: { must_change_password: true },
    });
    if (error || !data.user) return { ok: false, reason: error?.message ?? 'createUser failed' };
    userId = data.user.id;
    await db.insert(schema.profiles).values({
      userId,
      email,
      displayName: input.displayName.trim(),
      isAdmin: input.isAdmin ?? false,
      mustChangePassword: true,
      createdBy: input.createdBy,
    });
  }

  if (input.tripId) {
    await db
      .insert(schema.tripMembers)
      .values({ tripId: input.tripId, userId, role: input.role ?? 'editor' })
      .onConflictDoNothing();
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000';
  const emailSent = await sendTempPasswordEmail({
    to: email,
    displayName: input.displayName,
    tempPassword,
    appUrl,
  });
  return { ok: true, userId, tempPassword, emailSent, existed: Boolean(existing) } as CreateUserResult;
}
