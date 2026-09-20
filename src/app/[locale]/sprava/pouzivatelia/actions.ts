'use server';

import { getTranslations } from 'next-intl/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createUserWithTempPassword } from '@/lib/auth/create-user';
import { requireAdmin } from '@/lib/auth/session';

export type CreateState =
  | { ok: true; email: string; tempPassword: string; emailSent: boolean; existed: boolean }
  | { ok: false; error: string }
  | null;

const form = z.object({ email: z.email(), displayName: z.string().trim().min(1).max(80) });

export async function createUserAction(_prev: CreateState, formData: FormData): Promise<CreateState> {
  const t = await getTranslations('admin');
  const me = await requireAdmin();
  if (!me) return { ok: false, error: t('forbidden') };
  const parsed = form.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: t('invalidInput') };
  const r = await createUserWithTempPassword({ ...parsed.data, createdBy: me.user.id });
  if (!r.ok) return { ok: false, error: r.reason };
  revalidatePath('/', 'layout');
  return {
    ok: true,
    email: parsed.data.email.toLowerCase(),
    tempPassword: r.tempPassword,
    emailSent: r.emailSent,
    existed: r.existed,
  };
}
