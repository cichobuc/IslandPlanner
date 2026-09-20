import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/auth/session';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const me = await getCurrentUser();

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-6 px-4 py-12">
      <div className="flex items-center gap-3">
        <span className="border-accent-line bg-accent-soft font-display text-accent grid size-10 place-items-center rounded-[10px] border text-lg font-semibold">
          ⛰
        </span>
        <span className="text-ink-3 text-[11px] font-medium tracking-[.08em] uppercase">{t('app.name')}</span>
      </div>
      <h1 className="font-display text-[26px] leading-tight font-semibold">{t('app.tagline')}</h1>
      <div className="rounded-card border-card-line bg-card text-ink-2 border p-4 text-sm">
        {t('home.status')}
      </div>
      {me ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-ink-2 text-sm">
            {t('home.signedInAs', { name: me.profile?.displayName ?? me.user.email ?? '' })}
          </span>
          <Link
            href="/profil"
            className="rounded-btn border-card-line bg-card text-ink-2 inline-flex h-[42px] items-center border px-4 text-sm font-medium"
          >
            {t('home.toProfile')}
          </Link>
          {me.profile?.isAdmin && (
            <Link
              href="/sprava/pouzivatelia"
              className="rounded-btn border-card-line bg-card text-ink-2 inline-flex h-[42px] items-center border px-4 text-sm font-medium"
            >
              {t('home.toUsers')}
            </Link>
          )}
          <form action={`/api/auth/signout?locale=${locale}`} method="post">
            <Button type="submit" variant="ghost">
              {t('home.signOut')}
            </Button>
          </form>
        </div>
      ) : (
        <div className="flex gap-3">
          <Link
            href="/prihlasenie"
            className="rounded-btn bg-accent inline-flex h-[42px] items-center px-4 text-sm font-semibold text-white"
          >
            {t('home.cta')}
          </Link>
          <Link
            href="/ako-to-funguje"
            className="rounded-btn border-card-line bg-card text-ink-2 inline-flex h-[42px] items-center border px-4 text-sm font-medium"
          >
            {t('home.howItWorks')}
          </Link>
        </div>
      )}
    </main>
  );
}
