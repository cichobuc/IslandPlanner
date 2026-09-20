import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AuthCard } from '@/components/ui/auth-card';
import { Notice } from '@/components/ui/notice';
import { PASSWORD_MIN } from '@/lib/auth/password';
import { getCurrentUser } from '@/lib/auth/session';
import { ChangePasswordForm } from './change-form';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  return { title: t('changePassword') };
}

export default async function ChangePasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('auth');
  const me = await getCurrentUser();
  const forced = me?.user.app_metadata?.must_change_password === true;
  return (
    <AuthCard title={t('changePassword')} lead={forced ? t('changePasswordForcedLead') : undefined}>
      {forced && (
        <Notice tone="info" className="mb-4">
          {t('signedInAs', { email: me?.user.email ?? '' })}
        </Notice>
      )}
      <ChangePasswordForm min={PASSWORD_MIN} />
    </AuthCard>
  );
}
