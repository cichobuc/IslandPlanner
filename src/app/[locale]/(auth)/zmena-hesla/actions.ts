'use server';

import { eq } from 'drizzle-orm';
import { getLocale, getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getDb, schema } from '@/db';
import { PASSWORD_MIN } from '@/lib/auth/password';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { createSupabaseServer } from '@/lib/supabase/server';

export type ChangeState = { error?: string } | null;

const form = z
  .object({ password: z.string().min(PASSWORD_MIN), confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ['confirm'] });

export async function changePasswordAction(_prev: ChangeState, formData: FormData): Promise<ChangeState> {
  const t = await getTranslations('auth');
  const parsed = form.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const path = parsed.error.issues[0]?.path[0];
    return {
      error: path === 'confirm' ? t('passwordsDiffer') : t('passwordTooShort', { min: PASSWORD_MIN }),
    };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t('notSignedIn') };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };

  // zhodiť príznak – v app_metadata (middleware) aj v profiles (docs/03)
  const admin = createSupabaseAdmin();
  await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { ...user.app_metadata, must_change_password: false },
  });
  await getDb()
    .update(schema.profiles)
    .set({ mustChangePassword: false })
    .where(eq(schema.profiles.userId, user.id));
  // nová session s novým JWT (bez príznaku)
  await supabase.auth.refreshSession();

  const locale = await getLocale();
  redirect(`/${locale}/profil`);
}
