import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { ProfileForm } from './profile-form';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('profile');
  return { title: t('title') };
}

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await getCurrentUser();
  if (!me?.profile) redirect(`/${locale}/prihlasenie`);
  const t = await getTranslations('profile');

  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-col gap-5 px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-ink-3 text-[11px] font-medium tracking-[.08em] uppercase">{t('kicker')}</span>
          <h1 className="font-display text-[26px] leading-tight font-semibold">{t('title')}</h1>
          <p className="text-ink-2 mt-1.5 text-sm">{t('lead')}</p>
        </div>
        <Link href="/" className="text-accent shrink-0 text-sm font-medium">
          {t('toTrips')} ›
        </Link>
      </div>
      <ProfileForm profile={me.profile} email={me.user.email ?? ''} />
    </main>
  );
}
