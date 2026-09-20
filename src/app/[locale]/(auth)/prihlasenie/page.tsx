import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AuthCard } from '@/components/ui/auth-card';
import { LoginForm } from './login-form';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  return { title: t('signIn') };
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { next } = await searchParams;
  const t = await getTranslations('auth');
  return (
    <AuthCard title={t('signIn')} lead={t('signInLead')}>
      <LoginForm next={next} />
    </AuthCard>
  );
}
