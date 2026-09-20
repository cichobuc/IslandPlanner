import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function NotFound() {
  const t = await getTranslations('nav');
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-4 px-4">
      <h1 className="font-display text-[26px] font-semibold">404</h1>
      <p className="text-ink-2">Stránka sa nenašla.</p>
      <Link href="/" className="text-accent font-medium">
        {t('trips')}
      </Link>
    </main>
  );
}
