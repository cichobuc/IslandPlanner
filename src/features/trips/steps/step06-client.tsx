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
import { addStopAction, removeStopAction, swapStopAction } from '../step05-actions';
import { AttractionBudgetPanel, type AttractionBudgetState } from './attraction-budget';
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
  budget,
  canEdit,
}: {
  tripId: string;
  days: DayLite[];
  catalog: CatalogPoi[];
  pax: number;
  totals: { entryGroup: number; stops: number };
  budget: AttractionBudgetState;
  canEdit: boolean;
}) {
  const [kind, setKind] = useState<string | null>(null);
  const [tier, setTier] = useState<string | null>(null);
  const [gemsOnly, setGemsOnly] = useState(false);
  const [detail, setDetail] = useState<{ stop: StopLite; dayIndex: number } | null>(null);
  const [dayFor, setDayFor] = useState<Record<string, string>>({});
  const [addState, addAct, adding] = useActionState<ActionState, FormData>(addStopAction, null);
  const [, removeAct, removing] = useActionState<ActionState, FormData>(removeStopAction, null);
  const [swapState, swapAct, swapping] = useActionState<ActionState, FormData>(swapStopAction, null);
  const inPlan = useMemo(
    () => days.flatMap((d) => d.stops.filter((s) => !s.skip).map((s) => ({ s, d }))),
    [days],
  );
  // krok 06 = peniaze: len platené miesta (vstupné na osobu); parkovné a zadarmo zastávky sú zhrnuté jedným riadkom
  const paid = useMemo(() => inPlan.filter(({ s }) => s.entryPpEur > 0), [inPlan]);
  const parkingOnly = useMemo(() => inPlan.filter(({ s }) => s.entryPpEur <= 0 && s.parkingEur > 0), [inPlan]);
  const free = inPlan.length - paid.length - parkingOnly.length;
  const parkingSum = parkingOnly.reduce((a, { s }) => a + s.parkingEur, 0);
  const inPlanSlugs = useMemo(() => new Set(inPlan.map(({ s }) => s.slug)), [inPlan]);
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
        question="Koľko dáme na vstupné a za čo?"
        lead="Tu sú len platené miesta z trasy (vstupné podľa veku) a čo za ne dostaneš; drahé sa dá vymeniť za lacnejšie alebo vyradiť. Zoznam všetkých zastávok s časmi je v kroku 04. Nižšie katalóg miest, ktoré v trase nie sú."
        aside={<StepAmount amount={totals.entryGroup} source="seed" />}
      />

      <StepSection title="Koľko míňať" hint="limit na osobu za celú cestu · platí pri Generovať v 04">
        <AttractionBudgetPanel
          tripId={tripId}
          budget={budget}
          days={days.length}
          pax={pax}
          spentGroup={totals.entryGroup}
          canEdit={canEdit}
          hint="Nad limitom? Vymeň drahé miesto za lacnejšiu alternatívu, vyraď ho, alebo v kroku 04 pregeneruj s novým limitom."
        />
      </StepSection>

      <StepSection
        title={`Platené v pláne · ${paid.length}`}
        hint={`${pax} os. · ${bookings} s rezerváciou · ${free} zadarmo${parkingOnly.length ? ` · ${parkingOnly.length} len parkovné` : ''}`}
      >
        <ListCard>
          {paid.map(({ s, d }) => {
            const swapTo = s.cheaper && !inPlanSlugs.has(s.cheaper.slug) ? s.cheaper : null;
            return (
              <ListRow
                key={s.stopId}
                leading={<PoiThumb src={s.photoUrl} alt={s.name} tone="info" />}
                title={`${s.name}${s.hiddenGem ? ' 💎' : ''}`}
                meta={[
                  starStr(s.stars),
                  `${fmtEur(s.entryPpEur)}/os`,
                  `deň ${String(d.dayIndex).padStart(2, '0')}`,
                  s.regionName,
                  s.parkingEur ? `park. ${fmtEur(s.parkingEur)}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                badges={
                  <>
                    {valueTag(s.valuePer10Eur) && (
                      <Tag tone={valueTag(s.valuePer10Eur)!.tone}>{valueTag(s.valuePer10Eur)!.label}</Tag>
                    )}
                    {s.bookingRequired && <Tag tone="vio">rezervácia</Tag>}
                    {swapTo && (
                      <Tag tone="mut">
                        lacnejšie: {swapTo.name} ({swapTo.entryPpEur ? `${fmtEur(swapTo.entryPpEur)}/os` : 'zadarmo'})
                      </Tag>
                    )}
                  </>
                }
                amount={fmtEur(s.entryGroup)}
                amountSub={`${fmtEur(s.entryGroup / pax)}/os`}
                action={
                  <span className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setDetail({ stop: s, dayIndex: d.dayIndex })}
                    >
                      Detail
                    </Button>
                    {canEdit && swapTo && (
                      <form action={swapAct}>
                        <input type="hidden" name="tripId" value={tripId} />
                        <input type="hidden" name="stopId" value={s.stopId} />
                        <input type="hidden" name="poiSlug" value={swapTo.slug} />
                        <Button type="submit" size="sm" variant="secondary" disabled={swapping}>
                          Vymeniť
                        </Button>
                      </form>
                    )}
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
          {parkingOnly.length > 0 && (
            <ListRow
              title={`Parkovné · ${parkingOnly.length} miest`}
              meta={parkingOnly.map(({ s }) => s.name).join(' · ')}
              amount={fmtEur(Math.round(parkingSum))}
              amountSub="za auto"
            />
          )}
          {free > 0 && (
            <ListRow
              title={`Zadarmo · ${free} zastávok`}
              meta="vodopády, pláže, vyhliadky – zoznam a časy v kroku 04"
              amount="0 €"
              action={
                <ButtonLink href={`/cesta/${tripId}?krok=4`} size="sm" variant="ghost">
                  Krok 04
                </ButtonLink>
              }
            />
          )}
          {inPlan.length === 0 && (
            <div className="text-ink-3 px-4 py-6 text-center text-sm">
              Zatiaľ nič – vygeneruj trasu v kroku 04 alebo pridaj z katalógu.
            </div>
          )}
        </ListCard>
        {swapState && !swapState.ok && <Notice tone="bad">{swapState.error}</Notice>}
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
            { label: 'Platených miest', value: `${paid.length} z ${inPlan.length}` },
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
