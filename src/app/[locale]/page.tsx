import { CalendarCheck, GitFork, Plus } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AvatarStack, Button, ButtonLink, Chip, ChipRow, Label, ListCard, ListRow, Notice, StepSection, Tag, Tile } from '@/components/ui';
import { createTripAction } from '@/features/trips/actions';
import { dateRangeLabel, monthLabel } from '@/features/trips/progress';
import { listTripsForUser } from '@/features/trips/queries';
import { getCurrentUser } from '@/lib/auth/session';
import { AppBar } from './app-bar';
import { Landing } from './landing';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await getCurrentUser();
  if (!me?.profile) return <Landing />;

  const t = await getTranslations('trips');
  const trips = await listTripsForUser(me.user.id);
  const dayCount = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000) + 1;

  return (
    <div className="bg-bg min-h-dvh">
      <AppBar me={{ name: me.profile.displayName, isAdmin: me.profile.isAdmin }} locale={locale} />
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-[18px] px-4 pt-5 pb-8 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-[26px] leading-tight font-semibold">{t('title')}</h1>
            <span className="text-ink-2 text-sm">{t('lead')}</span>
          </div>
          <div className="grow" />
          <Button variant="secondary" disabled title="v1.1">
            <GitFork size={16} strokeWidth={1.8} /> {t('fromTemplate')}
          </Button>
          <form action={createTripAction}>
            <Button type="submit">
              <Plus size={16} strokeWidth={1.75} /> {t('newTrip')}
            </Button>
          </form>
        </div>

        <StepSection title={t('mine')}>
          <ListCard>
            {trips.map((trip, i) => {
              const meta = [
                trip.startDate && trip.endDate
                  ? `${dateRangeLabel(trip.startDate, trip.endDate)} · ${t('days', { n: dayCount(trip.startDate, trip.endDate) })}`
                  : monthLabel(trip.targetMonth),
                t('persons', { n: trip.travelersCount }),
                t('steps', { done: trip.progressDone }),
              ].join(' · ');
              return (
                <ListRow
                  key={trip.id}
                  leading={<Tile icon={CalendarCheck} tone={i === 0 ? 'info' : 'mut'} />}
                  title={trip.name}
                  meta={meta}
                  badges={
                    <>
                      <span className="hidden sm:inline-flex">
                        <AvatarStack names={trip.memberNames} size={20} />
                      </span>
                      {!trip.startDate && <Tag tone="mut">{t('noFlight')}</Tag>}
                      {!trip.isOwner && <Tag tone="vio">{t('member')}</Tag>}
                    </>
                  }
                  action={
                    <ButtonLink href={`/cesta/${trip.id}`} variant={i === 0 ? 'primary' : 'secondary'} size="sm">
                      {t('open')}
                    </ButtonLink>
                  }
                  href={`/${locale}/cesta/${trip.id}`}
                  selected={i === 0}
                />
              );
            })}
            {trips.length === 0 && <div className="text-ink-3 px-4 py-8 text-center text-sm">{t('empty')}</div>}
          </ListCard>
        </StepSection>

        <StepSection title={t('templates')} hint={t('templatesLead')}>
          <ChipRow>
            <Chip on>{t('filterMine')}</Chip>
            <Chip>{t('filterShared')}</Chip>
            <Chip>{t('filterPublic')}</Chip>
          </ChipRow>
          <Notice tone="mut">
            <Label className="mr-2">v1.1</Label>
            {t('templatesSoon')}
          </Notice>
        </StepSection>
      </div>
    </div>
  );
}
