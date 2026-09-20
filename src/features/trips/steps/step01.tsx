import { and, asc, eq, inArray } from 'drizzle-orm';
import { ChevronRight, Home } from 'lucide-react';
import {
  ButtonLink,
  ListCard,
  ListRow,
  ResultsCard,
  StepFooter,
  StepHead,
  StepSection,
  Tag,
  Tile,
} from '@/components/ui';
import { getDb, schema } from '@/db';
import { ageOn } from '@/engine/ageRules';
import type { PriceRuleTier } from '@/engine/types';
import { fmtEur, fmtKm } from '@/lib/format';
import type { TripAccess } from '../access';
import { canEdit } from '../access';
import { airportFacts } from '../airport-access';
import { monthLabel } from '../progress';
import {
  AddTravelerButton,
  AirportToggle,
  SettingsForm,
  TravelerRowItem,
  type TravelerRow,
} from './step01-client';

const bagsLabel = (b: TravelerRow['bags']) =>
  [
    b.cabinSmall && `${b.cabinSmall}× malá`,
    b.cabin10 && `${b.cabin10}× 10 kg`,
    b.checked20 && `${b.checked20}× 20 kg`,
    b.checked32 && `${b.checked32}× 32 kg`,
  ]
    .filter(Boolean)
    .join(' · ');

/** Krok 01 · Cestujúci & kedy – cestujúci z profilov členov, domov a letiská (1 auto z BA), mesiac, dni, tempo, záujmy. */
export async function Step01({ access }: { access: TripAccess }) {
  const { trip, role } = access;
  const editable = canEdit(role);
  const db = getDb();
  const [travelers, airports, parking] = await Promise.all([
    db
      .select()
      .from(schema.travelers)
      .where(eq(schema.travelers.tripId, trip.id))
      .orderBy(asc(schema.travelers.sortOrder), asc(schema.travelers.updatedAt)),
    db
      .select()
      .from(schema.airports)
      .where(and(eq(schema.airports.isOrigin, true)))
      .orderBy(asc(schema.airports.driveKmFromHome)),
    db
      .select()
      .from(schema.parkingOptions)
      .where(inArray(schema.parkingOptions.iata, ['BTS', 'VIE', 'BUD', 'PRG', 'KTW'])),
  ]);
  const rows: TravelerRow[] = travelers.map((t) => ({
    id: t.id,
    name: t.name,
    birthDate: t.birthDate,
    ageFallback: t.ageFallback,
    userId: t.userId,
    isDriver: t.isDriver,
    driverSince: t.driverSince,
    hasCreditCard: t.hasCreditCard,
    bags: t.bags,
    sharesBagsWith: t.sharesBagsWith,
    dietNote: t.dietNote,
  }));
  const pax = rows.length;
  const tripDate = trip.startDate ?? `${trip.targetMonth.slice(0, 7)}-15`;
  const checkedBags = rows.reduce((a, t) => a + t.bags.checked20 + t.bags.checked32, 0);
  const typicalDays = Math.round((trip.minDays + trip.maxDays) / 2);
  const drivers = rows.filter((t) => t.isDriver);
  const missingBirth = rows.filter((t) => !t.birthDate).length;
  const enabled = new Set(trip.originAirports);
  const facts = airports.map((a) =>
    airportFacts({
      iata: a.iata,
      km: a.driveKmFromHome ? Number(a.driveKmFromHome) : null,
      min: a.driveMinFromHome,
      pax,
      checkedBags,
      days: typicalDays,
      parkingLists: parking.filter((p) => p.iata === a.iata).map((p) => p.priceRules as PriceRuleTier[]),
    }),
  );

  return (
    <>
      <StepHead
        step={1}
        name="Cestujúci & kedy"
        question="Kto ide, odkiaľ a kedy?"
        lead="Cestujúci sa berú z profilov členov (vek, vodičák, kreditka, batožina). Zapnuté letiská určujú, kde sa v kroku 02 hľadajú letenky – cesta na letisko je 1 autom pre 4 zo skupinovej kasy."
      />

      <StepSection
        title={`Cestujúci · ${pax}`}
        hint={missingBirth ? `${missingBirth}× chýba dátum narodenia` : 'vek k dátumu cesty'}
      >
        <ListCard>
          {rows.map((t, i) => {
            const age = ageOn(t, tripDate);
            const partner = t.sharesBagsWith ? rows.find((o) => o.id === t.sharesBagsWith)?.name : null;
            const meta = [
              `${age} r.${t.birthDate ? '' : ' (odhad)'}`,
              t.isDriver ? `vodič${t.driverSince ? ` od ${t.driverSince.slice(0, 4)}` : ''}` : null,
              bagsLabel(t.bags),
              partner ? `kufor s ${partner}` : null,
              t.hasCreditCard ? 'kreditka ✓' : null,
            ]
              .filter(Boolean)
              .join(' · ');
            return (
              <TravelerRowItem
                key={t.id}
                tripId={trip.id}
                traveler={t}
                others={rows.filter((o) => o.id !== t.id).map((o) => ({ id: o.id, name: o.name }))}
                canEdit={editable}
                index={i}
                meta={meta}
                flags={{ youngDriver: t.isDriver && age < 20, noCard: t.isDriver && !t.hasCreditCard }}
              />
            );
          })}
          {pax === 0 && (
            <div className="text-ink-3 px-4 py-6 text-center text-sm">
              Žiadny cestujúci – pridaj člena alebo cestujúceho ručne.
            </div>
          )}
        </ListCard>
        {editable && (
          <div className="flex gap-2">
            <AddTravelerButton tripId={trip.id} others={rows.map((o) => ({ id: o.id, name: o.name }))} />
            <ButtonLink href={`/cesta/${trip.id}/clenovia`} variant="ghost" size="sm">
              Členovia ›
            </ButtonLink>
          </div>
        )}
      </StepSection>

      <StepSection title="Domov a letiská" hint="zapnuté = hľadajú sa letenky">
        <ListCard>
          <ListRow
            leading={<Tile icon={Home} tone="mut" />}
            title={trip.homeLabel}
            meta="vlastné auto · 6,5 l/100 km · 1,60 €/l · 1 auto pre ≤ 4 os. a ≤ 4 kufre"
          />
          {facts.map((f) => {
            const a = airports.find((x) => x.iata === f.iata)!;
            const on = enabled.has(f.iata);
            const meta = [
              `${fmtKm(f.km)} · ${Math.floor(f.min / 60)} h ${String(f.min % 60).padStart(2, '0')}`,
              f.mode === 'bus' ? 'bus' : `${f.vehicles} auto`,
              f.parking != null
                ? `park. od ${fmtEur(f.parking)}/${f.parkingDays} d`
                : f.mode === 'car'
                  ? 'bez parkovania'
                  : null,
              f.vignette ? `známka ${f.vignette}` : null,
            ]
              .filter(Boolean)
              .join(' · ');
            return (
              <ListRow
                key={f.iata}
                leading={
                  <span
                    className={`font-display grid size-9 place-items-center rounded-[9px] text-[12px] font-semibold ${on ? 'bg-accent-soft text-accent' : 'bg-mut-bg text-ink-2'}`}
                  >
                    {f.iata}
                  </span>
                }
                title={`${a.city} · ${a.name}`}
                meta={meta}
                badges={f.direct ? <Tag tone="ok">{f.direct}</Tag> : <Tag tone="mut">do KEF cez hub</Tag>}
                amount={fmtEur(f.total)}
                amountSub={`${fmtEur(f.perPerson)}/os · seed`}
                action={<AirportToggle tripId={trip.id} iata={f.iata} on={on} disabled={!editable} />}
                selected={on}
              />
            );
          })}
        </ListCard>
      </StepSection>

      <StepSection title="Kedy a ako" hint="mesiac, dĺžka, prestupy, tempo, záujmy">
        <SettingsForm
          tripId={trip.id}
          targetMonth={trip.targetMonth.slice(0, 7)}
          minDays={trip.minDays}
          maxDays={trip.maxDays}
          allowSelfTransfer={trip.allowSelfTransfer}
          pace={trip.pace}
          interests={trip.interests}
          budgetTargetPp={trip.budgetTargetPp ? Number(trip.budgetTargetPp) : null}
          canEdit={editable}
        />
      </StepSection>

      <StepSection title="Čo z toho vyplýva" hint="ide do kroku 02">
        <ResultsCard
          cells={[
            { label: 'Osôb · vodičov', value: `${pax} · ${drivers.length}` },
            { label: 'Letiská', value: trip.originAirports.join(' ') || '—' },
            { label: 'Mesiac', value: monthLabel(trip.targetMonth) },
            { label: 'Dĺžka', value: `${trip.minDays}–${trip.maxDays} dní` },
          ]}
        />
      </StepSection>

      <StepFooter
        className="hidden sm:flex"
        primary={
          <ButtonLink href={`/cesta/${trip.id}?krok=2`}>
            Pokračovať na 02 Letenky <ChevronRight size={16} strokeWidth={1.75} />
          </ButtonLink>
        }
      />
    </>
  );
}

export const step01Summary = (pax: number, airports: string[], targetMonth: string) =>
  `${pax} os. · ${airports.join(' ')} · ${monthLabel(targetMonth)}`;
