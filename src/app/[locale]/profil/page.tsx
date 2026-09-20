import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getCurrentUser } from '@/lib/auth/session';
import { Notice } from '@/components/ui/notice';

// Blok 1.4 nahradí formulárom podľa docs/obrazovky/00a.
export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('nav');
  const me = await getCurrentUser();
  return (
    <main className="mx-auto flex w-full max-w-[720px] flex-col gap-5 px-4 py-8">
      <h1 className="font-display text-[26px] font-semibold">{t('profile')}</h1>
      <Notice tone="info">
        {me?.profile?.displayName} · {me?.user.email}
      </Notice>
    </main>
  );
}
