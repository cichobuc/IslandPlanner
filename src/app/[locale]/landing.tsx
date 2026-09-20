import { getTranslations } from 'next-intl/server';
import { ButtonLink, IslandMark, Label } from '@/components/ui';

/** Neprihlásený návštevník: názov, veta, prihlásenie + Ako to funguje. */
export async function Landing() {
  const t = await getTranslations();
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-6 px-4 py-12">
      <div className="flex items-center gap-3">
        <span className="border-accent-line bg-accent-soft text-accent grid size-10 place-items-center rounded-[10px] border">
          <IslandMark size={22} />
        </span>
        <Label>{t('app.name')}</Label>
      </div>
      <h1 className="font-display text-[26px] leading-tight font-semibold">{t('app.tagline')}</h1>
      <p className="text-ink-2 text-sm">{t('home.landingLead')}</p>
      <div className="flex gap-3">
        <ButtonLink href="/prihlasenie">{t('home.cta')}</ButtonLink>
        <ButtonLink href="/ako-to-funguje" variant="secondary">
          {t('home.howItWorks')}
        </ButtonLink>
      </div>
    </main>
  );
}
