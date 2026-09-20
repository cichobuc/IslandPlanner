import { Users, Zap } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Button, ButtonLink, Card, Label, Notice, RingMap, Stepper, TopBar, TripLayout, type StepItem } from '@/components/ui';
import { getTripAccess } from '@/features/trips/access';
import { monthLabel, stepNames, tripProgress } from '@/features/trips/progress';
import { countTravelers, listTripMembers } from '@/features/trips/queries';
import { RenameTrip } from './rename-trip';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const access = await getTripAccess((await params).id);
  return { title: access?.trip.name ?? 'Cesta' };
}

/** Obrazovka Cesta – kostra v6 (Postup vľavo, obsah vpravo). Kroky sa dopĺňajú v blokoch 2.3–2.8. */
export default async function TripPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const access = await getTripAccess(id);
  if (!access) notFound();
  const t = await getTranslations('trip');
  const { trip, role } = access;
  const [members, travelersCount] = await Promise.all([listTripMembers(id), countTravelers(id)]);
  const progress = tripProgress({
    travelersCount,
    originAirports: trip.originAirports,
    startDate: trip.startDate,
    transportMode: trip.transportMode,
  });
  const names = stepNames(trip.transportMode);
  const steps: StepItem[] = names.map((name, i) => ({
    n: i + 1,
    name,
    summary:
      i === 0
        ? `${travelersCount} os. · ${trip.originAirports.join(' ')} · ${monthLabel(trip.targetMonth)}`
        : progress.steps[i] === 'pending'
          ? `po ${String(progress.active).padStart(2, '0')}`
          : '',
    state: progress.steps[i],
    href: `#krok-${i + 1}`,
  }));

  return (
    <div className="bg-bg min-h-dvh">
      <TopBar
        title={trip.name}
        mode="group"
        members={members.map((m) => m.displayName)}
        actions={
          <ButtonLink href={`/cesta/${id}/clenovia`} variant="ghost" size="sm" className="text-ink-2">
            <Users size={16} strokeWidth={1.8} /> <span className="hidden sm:inline">{t('members')}</span>
          </ButtonLink>
        }
      />
      <TripLayout
        aside={
          <>
            <Stepper steps={steps} />
            <Card className="flex flex-col gap-1.5 p-2.5">
              <RingMap points={[]} width={210} height={150} />
              <span className="flex justify-between px-1">
                <span className="text-[13px] font-semibold">Mapa okruhu</span>
                <span className="text-ink-3 text-[12px]">po 05</span>
              </span>
            </Card>
            <Button variant="secondary" disabled title="v1.1">
              <Zap size={16} strokeWidth={1.8} className="text-accent" /> Najlacnejšie pre všetkých
            </Button>
          </>
        }
      >
        <Card className="flex flex-col gap-1 px-5 py-4">
          <Label>Odhad cesty · {travelersCount} os.</Label>
          <span className="text-ink-3 text-sm">{t('estimateSoon')}</span>
        </Card>
        <section id="krok-1" className="flex flex-col gap-3">
          <Label className="text-accent">Krok 01 · {names[0]}</Label>
          <h1 className="font-display text-[22px] leading-[1.15] font-semibold sm:text-[26px]">{t('step1Soon')}</h1>
          <Notice tone="info">{t('step1SoonLead')}</Notice>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href={`/cesta/${id}/clenovia`} variant="secondary">
              <Users size={16} strokeWidth={1.8} /> {t('members')} · {members.length}
            </ButtonLink>
            {(role === 'owner' || role === 'editor') && <RenameTrip tripId={id} name={trip.name} />}
          </div>
        </section>
      </TripLayout>
    </div>
  );
}
