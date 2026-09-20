'use server';

import { getLocale, getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createSupabaseServer } from '@/lib/supabase/server';

export type LoginState = { error?: string; email?: string } | null;

const schema = z.object({
  email: z.email(),
  password: z.string().min(1),
  next: z.string().optional(),
});

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const t = await getTranslations('auth');
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: t('invalidInput'), email: String(formData.get('email') ?? '') };

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email.trim().toLowerCase(),
    password: parsed.data.password,
  });
  if (error) return { error: t('badCredentials'), email: parsed.data.email };

  const locale = await getLocale();
  // cieľ určíme tu (nie v middleware) – pri RSC navigácii by sa URL v prehliadači neaktualizovala
  if (data.user?.app_metadata?.must_change_password === true) redirect(`/${locale}/zmena-hesla`);
  const next = parsed.data.next && parsed.data.next.startsWith('/') ? parsed.data.next : '/';
  redirect(`/${locale}${next}`);
}
