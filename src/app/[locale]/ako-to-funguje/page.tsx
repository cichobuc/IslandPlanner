import { ArrowRight, Car, CalendarCheck, ChevronLeft, MapPinned, Plane, Sparkles, Tent, Users, Utensils, Wallet } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ButtonLink, Card, IslandMark, Label, RingMap, Tile, type Tone } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/auth/session';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('how');
  return { title: t('title') };
}

const TILES: { icon: typeof Users; tone: Tone }[] = [
  { icon: Users, tone: 'vio' },
  { icon: Plane, tone: 'info' },
  { icon: Car, tone: 'info' },
  { icon: Tent, tone: 'ok' },
  { icon: MapPinned, tone: 'info' },
  { icon: Sparkles, tone: 'vio' },
  { icon: Utensils, tone: 'warn' },
  { icon: Wallet, tone: 'warn' },
];

const RING = [
  { x: 100, y: 308, night: true },
  { x: 174, y: 276.1 },
  { x: 279.5, y: 375.2, night: true },
  { x: 421, y: 300.9 },
  { x: 510, y: 158.1, night: true },
  { x: 363, y: 64.9 },
  { x: 325.5, y: 108.6, night: true },
  { x: 134, y: 243.1 },
  { x: 100, y: 308 },
];

/** „Ako to funguje" – nadpis + odsek + mini mapa, 8 dlaždíc krokov, dole karta Začať (docs/obrazovky/00-vzor). */
export default async function HowItWorksPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('how');
  const me = await getCurrentUser();
  const steps = t.raw('steps') as { name: string; text: string; gives: string }[];
  const cta = !me
    ? { href: '/prihlasenie', label: t('ctaSignIn') }
    : me.profile?.completedAt
      ? { href: '/', label: t('ctaTrips') }
      : { href: '/profil', label: t('ctaProfile') };

  return (
    <div className="bg-bg min-h-dvh">
      <header className="border-card-line bg-card flex h-14 items-center gap-3.5 border-b px-4 sm:px-6">
        <Link href="/" className="text-ink-2 hover:text-accent flex items-center gap-1 text-[13px] font-semibold">
          <ChevronLeft size={16} strokeWidth={1.75} aria-hidden />
          Cesty
        </Link>
        <span className="flex items-center gap-2">
          <IslandMark size={20} className="text-accent" />
          <span className="font-display text-[15px] font-semibold">{t('title')}</span>
        </span>
      </header>
      <main className="mx-auto flex w-full max-w-[1180px] flex-col gap-[22px] px-4 py-7 pb-28 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
          <div className="flex max-w-[560px] flex-col gap-2.5">
            <Label>{t('kicker')}</Label>
            <h1 className="font-display text-[26px] leading-[1.1] font-semibold sm:text-[34px]">{t('headline')}</h1>
            <p className="text-ink-2 text-[15px] leading-[1.5]">{t('lead')}</p>
          </div>
          <div className="sm:ml-auto">
            <RingMap points={RING} width={200} height={143} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {steps.map((s, i) => (
            <Card key={s.name} className="flex flex-col gap-2 p-4">
              <span className="flex items-center gap-2.5">
                <Tile icon={TILES[i].icon} tone={TILES[i].tone} />
                <Label>{String(i + 1).padStart(2, '0')}</Label>
                <span className="font-display text-[15px] font-semibold">{s.name}</span>
              </span>
              <span className="text-ink-2 text-[13px] leading-[1.45]">{s.text}</span>
              <span className="text-accent flex items-center gap-1.5 text-[12px] font-semibold">
                <ArrowRight size={13} strokeWidth={2} aria-hidden /> {s.gives}
              </span>
            </Card>
          ))}
        </div>
      </main>
      <div className="fixed inset-x-4 bottom-4 sm:inset-x-6">
        <Card className="mx-auto flex max-w-[1132px] items-center gap-3 py-3 pr-3 pl-5">
          <span className="text-ink-2 hidden text-sm sm:inline">{t('ctaLead')}</span>
          <div className="grow" />
          <ButtonLink href={cta.href} className="w-full sm:w-auto">
            {cta.label} <ArrowRight size={16} strokeWidth={1.75} />
          </ButtonLink>
        </Card>
      </div>
    </div>
  );
}
