'use server';

import { eq } from 'drizzle-orm';
import { getLocale, getTranslations } from 'next-intl/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getDb, schema } from '@/db';
import type { InterestScores } from '@/engine/types';
import { formDataToObject, profileFormSchema } from '@/features/profile/schema';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export type ProfileState = { ok: true; savedAt: string } | { ok: false; error: string } | null;

export async function saveProfileAction(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const t = await getTranslations('profile');
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: t('notSignedIn') };

  const parsed = profileFormSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: `${t('invalidInput')} (${issue?.path.join('.')})` };
  }
  const v = parsed.data;
  const now = new Date();
  const completing = v.intent === 'done';

  await getDb()
    .update(schema.profiles)
    .set({
      displayName: v.displayName,
      birthDate: v.birthDate,
      homeLabel: v.homeLabel || 'Bratislava',
      locale: v.locale,
      driverLicence: {
        has: v.driverHas,
        sinceYear: v.driverSinceYear ?? undefined,
        categories: v.driverCategories,
        willingToDrive: v.willingToDrive,
      },
      hasCreditCard: v.hasCreditCard,
      drone: v.droneHas
        ? {
            has: true,
            model: v.droneModel || undefined,
            weightG: v.droneWeightG ?? undefined,
            operatorId: v.droneOperatorId || undefined,
            insurance: v.droneInsurance,
          }
        : { has: false },
      interests: v.interests as InterestScores,
      pace: v.pace,
      comfort: v.comfort,
      foodLevel: v.foodLevel,
      bagsPref: v.bagsPref,
      budgetTarget: v.budgetTarget != null ? String(v.budgetTarget) : null,
      airports: v.airports,
      docs: { idValidUntil: v.idValidUntil ?? undefined, ehic: v.ehic, insurance: v.insurance },
      completedAt: completing ? now : (me.profile?.completedAt ?? null),
    })
    .where(eq(schema.profiles.userId, me.user.id));

  if (completing && me.user.app_metadata?.profile_completed !== true) {
    await createSupabaseAdmin().auth.admin.updateUserById(me.user.id, {
      app_metadata: { ...me.user.app_metadata, profile_completed: true },
    });
  }

  revalidatePath('/', 'layout');
  if (completing) {
    const locale = await getLocale();
    redirect(`/${locale}/`);
  }
  return { ok: true, savedAt: now.toISOString() };
}
