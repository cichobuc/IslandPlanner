'use client';

import { ChevronRight } from 'lucide-react';
import { useActionState, useMemo, useState } from 'react';
import {
  Button,
  ButtonLink,
  Chip,
  ChipRow,
  ListCard,
  ListRow,
  Notice,
  ResultsCard,
  Select,
  StepAmount,
  StepFooter,
  StepHead,
  StepSection,
  Tag,
} from '@/components/ui';
import { fmtEur } from '@/lib/format';
import type { ActionState } from '../actions';
import type { CatalogPoi, DayLite, StopLite } from '../itinerary-data';
import { addStopAction, removeStopAction } from '../step05-actions';
import { DRONE, PoiSheet, PoiThumb } from './poi-sheet';

const starStr = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);
const PRICE_TIER = (eur: number) =>
  eur <= 0 ? 'zadarmo' : eur < 20 ? 'do 20 €' : eur < 60 ? '20–60 €' : 'nad 60 €';
const valueTag = (v: number | null) =>
  v == null
    ? null
    : v >= 1.2
      ? { tone: 'ok' as const, label: `oplatí sa · ${v}★/10 €` }
      : v < 0.5
        ? { tone: 'warn' as const, label: `drahé · ${v}★/10 €` }
        : null;

const KINDS: Record<string, string> = {
  thermal: 'Termály',
  attraction: 'Príroda',
  museum: 'Múzeá',
  tour: 'Túry',
  viewpoint: 'Vyhliadky',
};

export function Step06Client({
  tripId,
  days,
  catalog,
  pax,
  totals,
  canEdit,
}: {
  tripId: string;
  days: DayLite[];
  catalog: CatalogPoi[];
  pax: number;
  totals: { entryGroup: number; stops: number };
  canEdit: boolean;
}) {
  const [kind, setKind] = useState<string | null>(null);
  const [tier, setTier] = useState<string | null>(null);
  const [gemsOnly, setGemsOnly] = useState(false);
  const [detail, setDetail] = useState<{ stop: StopLite; dayIndex: number } | null>(null);
  const [dayFor, setDayFor] = useState<Record<string, string>>({});
  const [addState, addAct, adding] = useActionState<ActionState, FormData>(addStopAction, null);
  const [, removeAct, removing] = useActionState<ActionState, FormData>(removeStopAction, null);
  const inPlan = useMemo(
    () => days.flatMap((d) => d.stops.filter((s) => !s.skip).map((s) => ({ s, d }))),
    [days],
  );
  const rest = useMemo(
    () =>
      catalog.filter(
        (p) =>
          p.inPlanDay == null &&
          (!kind || p.kind === kind) &&
          (!gemsOnly || p.hiddenGem) &&
          (!tier || PRICE_TIER(p.entryPpEur) === tier),
      ),
    [catalog, kind, gemsOnly, tier],
  );
  const kinds = useMemo(() => [...new Set(catalog.map((p) => p.kind))], [catalog]);
  const bookings = inPlan.filter(({ s }) => s.bookingRequired).length;
  const nearestDay = (p: CatalogPoi) =>
    days.find((d) => d.regionId === p.regionId)?.dayId ?? days[0]?.dayId ?? '';

  return (
    <>
      <StepHead
        step={6}
        name="Atrakcie"
        question="Čo je v pláne a čo ešte pridať?"
        lead="Vstupné je spočítané pre každého podľa veku v deň návštevy (z profilov). Katalóg sú miesta zo seedu, ktoré ešte nie sú v trase – pridaj ich do dňa a krok 04 prepočíta km a časy."
        aside={<StepAmount amount={totals.entryGroup} source="seed" />}
      />

      <StepSection title={`V pláne · ${inPlan.length}`} hint={`${pax} os. · ${bookings} s rezerváciou`}>
        <ListCard>
          {inPlan.map(({ s, d }) => {
            const dr = DRONE[s.droneStatus] ?? DRONE.unknown;
            return (
              <ListRow
                key={s.stopId}
                leading={<PoiThumb src={s.photoUrl} alt={s.name} tone="info" />}
                title={`${s.name}${s.hiddenGem ? ' 💎' : ''}`}
                meta={[
                  starStr(s.stars),
                  `${s.stayMin} min`,
                  s.entryPpEur ? `${fmtEur(s.entryPpEur)}/os` : 'zadarmo',
                  `deň ${String(d.dayIndex).padStart(2, '0')}`,
                  s.regionName,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                badges={
                  <>
                    {valueTag(s.valuePer10Eur) && (
                      <Tag tone={valueTag(s.valuePer10Eur)!.tone}>{valueTag(s.valuePer10Eur)!.label}</Tag>
                    )}
                    <Tag tone={dr.tone}>{dr.label}</Tag>
                    {s.bookingRequired && <Tag tone="vio">rezervácia</Tag>}
                  </>
                }
                amount={s.entryGroup ? fmtEur(s.entryGroup) : '0 €'}
                amountSub={s.entryGroup ? `${fmtEur(s.entryGroup / pax)}/os` : 'zadarmo'}
                action={
                  <span className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setDetail({ stop: s, dayIndex: d.dayIndex })}
                    >
                      Detail
                    </Button>
                    {canEdit && (
                      <form action={removeAct}>
                        <input type="hidden" name="tripId" value={tripId} />
                        <input type="hidden" name="stopId" value={s.stopId} />
                        <Button type="submit" size="sm" variant="ghost" disabled={removing}>
                          Vyradiť
                        </Button>
                      </form>
                    )}
                  </span>
                }
                onOpen={() => setDetail({ stop: s, dayIndex: d.dayIndex })}
              />
            );
          })}
          {inPlan.length === 0 && (
            <div className="text-ink-3 px-4 py-6 text-center text-sm">
              Zatiaľ nič – vygeneruj trasu v kroku 04 alebo pridaj z katalógu.
            </div>
          )}
        </ListCard>
      </StepSection>

      <StepSection title="Katalóg · odporúčané" hint={`${rest.length} miest mimo plánu`}>
        <ChipRow>
          <Chip on={kind === null} onClick={() => setKind(null)}>
            všetko
          </Chip>
          {kinds.map((k) => (
            <Chip key={k} on={kind === k} onClick={() => setKind(k)}>
              {KINDS[k] ?? k}
            </Chip>
          ))}
          <Chip on={gemsOnly} onClick={() => setGemsOnly((v) => !v)}>
            💎 klenoty
          </Chip>
          <span className="text-ink-3 mx-1 text-[12px]">cena:</span>
          {['zadarmo', 'do 20 €', '20–60 €', 'nad 60 €'].map((t) => (
            <Chip key={t} on={tier === t} onClick={() => setTier(tier === t ? null : t)}>
              {t}
            </Chip>
          ))}
        </ChipRow>
        <ListCard>
          {rest.map((p) => {
            const dr = DRONE[p.droneStatus] ?? DRONE.unknown;
            const dayId = dayFor[p.slug] ?? nearestDay(p);
            return (
              <ListRow
                key={p.slug}
                leading={<PoiThumb src={p.photoUrl} alt={p.name} tone={p.hiddenGem ? 'vio' : 'mut'} />}
                title={`${p.name}${p.hiddenGem ? ' 💎' : ''}`}
                meta={[
                  starStr(p.stars),
                  p.regionName,
                  `${p.visitMin} min`,
                  p.entryPpEur ? `${fmtEur(p.entryPpEur)}/os` : 'zadarmo',
                  p.cheaper
                    ? `lacnejšie: ${p.cheaper.name} (${p.cheaper.entryPpEur ? fmtEur(p.cheaper.entryPpEur) : '0 €'})`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                badges={
                  <>
                    {valueTag(p.valuePer10Eur) && (
                      <Tag tone={valueTag(p.valuePer10Eur)!.tone}>{valueTag(p.valuePer10Eur)!.label}</Tag>
                    )}
                    <Tag tone={dr.tone}>{dr.label}</Tag>
                  </>
                }
                amount={p.entryGroup ? fmtEur(p.entryGroup) : '0 €'}
                amountSub={p.entryGroup ? `${fmtEur(p.entryGroup / pax)}/os` : 'zadarmo'}
                action={
                  canEdit ? (
                    <form action={addAct} className="flex items-center gap-1">
                      <input type="hidden" name="tripId" value={tripId} />
                      <input type="hidden" name="poiSlug" value={p.slug} />
                      <Select
                        name="dayId"
                        value={dayId}
                        onChange={(e) => setDayFor((m) => ({ ...m, [p.slug]: e.target.value }))}
                        className="h-[34px] w-[96px] px-2 text-[13px]"
                      >
                        {days.map((d) => (
                          <option key={d.dayId} value={d.dayId}>
                            Deň {String(d.dayIndex).padStart(2, '0')}
                          </option>
                        ))}
                      </Select>
                      <Button type="submit" size="sm" variant="secondary" disabled={adding}>
                        + Pridať
                      </Button>
                    </form>
                  ) : undefined
                }
              />
            );
          })}
          {rest.length === 0 && (
            <div className="text-ink-3 px-4 py-6 text-center text-sm">Nič pre tento filter.</div>
          )}
        </ListCard>
        {addState && !addState.ok && <Notice tone="bad">{addState.error}</Notice>}
      </StepSection>

      <StepSection title="Čo z toho vyplýva" hint="ide do 08">
        <ResultsCard
          cells={[
            { label: `Vstupné · ${pax} os.`, value: fmtEur(totals.entryGroup) },
            { label: 'Na osobu', value: fmtEur(totals.entryGroup / pax) },
            { label: 'Rezervovať vopred', value: String(bookings) },
            { label: 'Zastávok', value: String(inPlan.length) },
          ]}
        />
      </StepSection>

      <StepFooter
        className="hidden sm:flex"
        primary={
          <ButtonLink href={`/cesta/${tripId}?krok=7`}>
            Pokračovať na 07 Strava <ChevronRight size={16} strokeWidth={1.75} />
          </ButtonLink>
        }
      />
      {detail && (
        <PoiSheet
          stop={detail.stop}
          dayIndex={detail.dayIndex}
          tripId={tripId}
          onClose={() => setDetail(null)}
        />
      )}
    </>
  );
}
