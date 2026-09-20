import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-6 px-4 py-12">
      <div className="flex items-center gap-3">
        <span className="bg-accent-soft text-accent border-accent-line font-display grid size-10 place-items-center rounded-[10px] border text-lg font-semibold">
          ⛰
        </span>
        <span className="text-ink-3 text-[11px] font-medium tracking-[.08em] uppercase">{t('app.name')}</span>
      </div>
      <h1 className="font-display text-[26px] leading-tight font-semibold">{t('app.tagline')}</h1>
      <div className="border-card-line bg-card text-ink-2 rounded-xl border p-4 text-sm">
        {t('home.status')}
      </div>
      <div className="flex gap-3">
        <Link
          href="/prihlasenie"
          className="bg-accent inline-flex h-[42px] items-center rounded-[9px] px-4 text-sm font-semibold text-white"
        >
          {t('home.cta')}
        </Link>
        <Link
          href="/ako-to-funguje"
          className="border-card-line text-ink-2 bg-card inline-flex h-[42px] items-center rounded-[9px] border px-4 text-sm font-medium"
        >
          {t('home.howItWorks')}
        </Link>
      </div>
    </main>
  );
}
