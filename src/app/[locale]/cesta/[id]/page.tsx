import { ChevronRight, Map as MapIcon, Users, Zap } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import {
  Button,
  ButtonLink,
  Card,
  Label,
  Notice,
  PhoneHeader,
  RingMap,
  Stepper,
  StickyBar,
  TopBar,
  TripLayout,
  type StepItem,
  TripSummary,
} from '@/components/ui';
import { getTripAccess } from '@/features/trips/access';
import { loadBudget, summaryColumns } from '@/features/trips/budget-data';
import { dateRangeLabel, stepNames, tripProgress } from '@/features/trips/progress';
import { countProgressInputs, countTravelers, listTripMembers } from '@/features/trips/queries';
import { Step01, step01Summary } from '@/features/trips/steps/step01';
import { Step02 } from '@/features/trips/steps/step02';
import { Step03 } from '@/features/trips/steps/step03';
import { Step04 } from '@/features/trips/steps/step04';
import { Step05 } from '@/features/trips/steps/step05';
import { Step06 } from '@/features/trips/steps/step06';
import { Step07 } from '@/features/trips/steps/step07';
import { Step08 } from '@/features/trips/steps/step08';
import { fmtEur, stepNo } from '@/lib/format';
import { RenameTrip } from './rename-trip';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const access = await getTripAccess((await params).id);
  return { title: access?.trip.name ?? 'Cesta' };
}

/** Obrazovka Cesta (v6): Postup vľavo, jeden aktívny krok vpravo; `?krok=N` volí krok (predvolene prvý nehotový). */
export default async function TripPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ krok?: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const access = await getTripAccess(id);
  if (!access) notFound();
  const t = await getTranslations('trip');
  const { trip, role } = access;
  const [members, travelersCount, counts, budget] = await Promise.all([
    listTripMembers(id),
    countTravelers(id),
    countProgressInputs(id, trip.transportMode),
    trip.startDate ? loadBudget(id).catch(() => null) : Promise.resolve(null),
  ]);
  const totals = budget?.totals ?? null;
  const cat = (k: 'flights' | 'transport' | 'lodging' | 'attractions' | 'food') =>
    totals ? fmtEur(totals.byCategory[k].amount) : '';
  const progress = tripProgress({
    travelersCount,
    originAirports: trip.originAirports,
    startDate: trip.startDate,
    transportMode: trip.transportMode,
    ...counts,
  });
  const requested = Number((await searchParams).krok);
  const current = requested >= 1 && requested <= 8 ? requested : progress.active;
  const names = stepNames(trip.transportMode);
  const steps: StepItem[] = names.map((name, i) => {
    const n = i + 1;
    const done = progress.steps[i] === 'done';
    return {
      n,
      name,
      summary:
        n === 1
          ? step01Summary(travelersCount, trip.originAirports, trip.targetMonth)
          : n === 2 && trip.startDate && trip.endDate
            ? `${dateRangeLabel(trip.startDate, trip.endDate)} · ${Math.round((Date.parse(trip.endDate) - Date.parse(trip.startDate)) / 86_400_000) + 1} dní${totals ? ` · ${cat('flights')}` : ''}`
            : n === 3 && trip.transportMode
              ? `${{ car: 'Auto', camper: 'Karavan', no_car: 'Bez auta' }[trip.transportMode]}${totals ? ` · ${cat('transport')}` : ''}`
              : n === 4 && counts.dayCount > 0 && totals
                ? `${counts.dayCount} dní so zastávkami · ${cat('attractions')} vstupné`
                : n === 5 && counts.lodgingCount > 0 && totals
                  ? `${counts.lodgingCount} nocí · ${totals.byCategory.lodging.confidence === 'estimate' ? '≈ ' : ''}${cat('lodging')}`
                  : n === 7 && totals
                    ? `${budget?.snapshot.food.level === 'budget' ? 'úsporná' : budget?.snapshot.food.level === 'mid' ? 'stredná' : 'komfortná'} · ${cat('food')}`
                    : n === 8 && totals
                      ? `${fmtEur(totals.group)} · ${fmtEur(totals.perPerson)}/os`
                      : done || n <= progress.active
                        ? ''
                        : `po ${stepNo(n - 1)}`,
      state: n === current ? 'active' : done ? 'done' : 'pending',
      href: `?krok=${n}`,
    };
  });

  return (
    <div className="bg-bg min-h-dvh pb-24 sm:pb-0">
      <TopBar
        title={trip.name}
        mode="group"
        members={members.map((m) => m.displayName)}
        actions={
          <span className="flex items-center gap-1">
            {(role === 'owner' || role === 'editor') && <RenameTrip tripId={id} name={trip.name} />}
            <ButtonLink href={`/cesta/${id}/clenovia`} variant="ghost" size="sm" className="text-ink-2">
              <Users size={16} strokeWidth={1.8} /> <span className="hidden sm:inline">{t('members')}</span>
            </ButtonLink>
          </span>
        }
      />
      <PhoneHeader
        steps={steps}
        step={current}
        name={names[current - 1]}
        total={totals?.group ?? 0}
        perPerson={totals?.perPerson ?? 0}
      />
      <TripLayout
        aside={
          <>
            <Stepper steps={steps} />
            <Card className="flex flex-col gap-1.5 p-2.5">
              <RingMap points={[]} width={210} height={150} />
              <span className="flex justify-between px-1">
                <span className="text-[13px] font-semibold">Mapa okruhu</span>
                <span className="text-ink-3 text-[12px]">po 04</span>
              </span>
            </Card>
            <Button variant="secondary" disabled title="v1.1">
              <Zap size={16} strokeWidth={1.8} className="text-accent" /> Najlacnejšie pre všetkých
            </Button>
          </>
        }
      >
        {totals ? (
          <TripSummary
            total={totals.group}
            perPerson={totals.perPerson}
            pax={travelersCount}
            range={totals.min !== totals.max ? { min: totals.min, max: totals.max } : undefined}
            step={current}
            columns={summaryColumns(totals)}
            className="hidden sm:flex"
          />
        ) : (
          <Card className="hidden flex-col gap-1 px-5 py-4 sm:flex">
            <Label>Odhad cesty · {travelersCount} os.</Label>
            <span className="text-ink-3 text-sm">{t('estimateSoon')}</span>
          </Card>
        )}
        {current === 1 ? (
          <Step01 access={access} />
        ) : current === 2 ? (
          <Step02 access={access} />
        ) : current === 3 ? (
          <Step03 access={access} />
        ) : current === 4 ? (
          <Step05 access={access} />
        ) : current === 5 ? (
          <Step04 access={access} />
        ) : current === 6 ? (
          <Step06 access={access} />
        ) : current === 7 ? (
          <Step07 access={access} />
        ) : current === 8 ? (
          <Step08 access={access} />
        ) : (
          <section className="flex flex-col gap-3">
            <Label className="text-accent">
              Krok {stepNo(current)} · {names[current - 1]}
            </Label>
            <h1 className="font-display text-[22px] leading-[1.15] font-semibold sm:text-[26px]">
              {names[current - 1]}
            </h1>
            <Notice tone="info">Krok sa stavia (bloky 2.4–2.8).</Notice>
          </section>
        )}
      </TripLayout>
      <StickyBar backHref={current > 1 ? `/cesta/${id}?krok=${current - 1}` : '/'}>
        <Button variant="secondary" icon aria-label="Mapa" disabled>
          <MapIcon size={18} strokeWidth={1.75} />
        </Button>
        {current < 8 && (
          <ButtonLink href={`/cesta/${id}?krok=${current + 1}`} className="grow">
            Pokračovať na {stepNo(current + 1)} {names[current]} <ChevronRight size={16} strokeWidth={1.75} />
          </ButtonLink>
        )}
      </StickyBar>
    </div>
  );
}
