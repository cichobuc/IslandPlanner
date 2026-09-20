'use client';

import {
  CalendarCheck,
  Car,
  ChevronDown,
  ChevronRight,
  Lock,
  LockOpen,
  Map as MapIcon,
  Plus,
  Settings2,
  Sparkles,
  Tent,
  Waypoints,
  X,
} from 'lucide-react';
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
  Sheet,
  StepAmount,
  StepFooter,
  StepHead,
  StepSection,
  Tag,
  Tile,
} from '@/components/ui';
import { fmtH } from '@/engine/itinerary';
import { fmtEur, fmtKm } from '@/lib/format';
import type { ActionState } from '../actions';
import type { CatalogPoi, DayLite, StopLite } from '../itinerary-data';
import { addStopAction, generateItineraryAction, lockDayAction, removeStopAction } from '../step05-actions';
import { DRONE, PoiSheet } from './poi-sheet';

const dm = (iso: string) => `${Number(iso.slice(8, 10))}. ${Number(iso.slice(5, 7))}.`;
const KIND_ICON: Record<string, typeof Sparkles> = {
  thermal: Sparkles,
  attraction: Sparkles,
  museum: Sparkles,
  tour: Sparkles,
  viewpoint: Sparkles,
};

export function Step05Client({
  tripId,
  days,
  catalog,
  totals,
  pax,
  dates,
  pace,
  presetKey,
  canEdit,
}: {
  tripId: string;
  days: DayLite[];
  catalog: CatalogPoi[];
  totals: { km: number; driveMinReal: number; stops: number; entryGroup: number; warnings: number };
  pax: number;
  dates: string | null;
  pace: string;
  presetKey: string | null;
  canEdit: boolean;
}) {
  const [open, setOpen] = useState<Set<string>>(new Set(days.slice(0, 1).map((d) => d.dayId)));
  const [detail, setDetail] = useState<{ stop: StopLite; dayIndex: number } | null>(null);
  const [addTo, setAddTo] = useState<DayLite | null>(null);
  const [gem, setGem] = useState(0.3);
  const [genState, genAct, genPending] = useActionState<ActionState, FormData>(generateItineraryAction, null);
  const [, removeAct, removing] = useActionState<ActionState, FormData>(removeStopAction, null);
  const [, lockAct] = useActionState<ActionState, FormData>(lockDayAction, null);
  const [addState, addAct, adding] = useActionState<ActionState, FormData>(async (p, fd) => {
    const r = await addStopAction(p, fd);
    if (r?.ok) setAddTo(null);
    return r;
  }, null);
  const empty = totals.stops === 0;
  const toggle = (id: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const catalogFor = useMemo(
    () =>
      addTo
        ? catalog
            .filter((p) => p.inPlanDay == null)
            .sort(
              (a, b) =>
                Number(b.regionId === addTo.regionId) - Number(a.regionId === addTo.regionId) ||
                b.popularity - a.popularity,
            )
        : [],
    [catalog, addTo],
  );

  return (
    <>
      <StepHead
        step={4}
        name="Itinerár"
        question="Kam ktorý deň?"
        lead="Dni idú z prenocovania do prenocovania (regióny z návrhu trasy podľa počtu dní; miesto noci upresníš v kroku 05). Generátor priradí každé miesto dňu s najmenšou obchádzkou, zoradí ich pozdĺž smeru jazdy a naplánuje časy tak, aby si skončil pred západom slnka (jazda × 1,25 + 10 min na zastávku). Pri ≥ 8 dňoch nechá jeden rezervný deň na počasie; „musí“ = najlepšie miesta dňa, „voliteľné“ sa dajú pri zlom počasí vynechať. Zamknutý deň sa už nemení."
        aside={<StepAmount amount={totals.entryGroup} source="seed" />}
      />

      <StepSection title="Z predchádzajúcich krokov">
        <ChipRow wrap={false} className="sm:flex-wrap">
          <Chip icon={CalendarCheck} iconClassName="text-accent">
            {days.length} dní{dates ? ` · ${dates}` : ''}
          </Chip>
          <Chip icon={Car} iconClassName="text-accent">
            tempo {pace === 'relaxed' ? 'pokojné' : pace === 'intense' ? 'intenzívne' : 'normálne'}
          </Chip>
          <Chip icon={Tent} iconClassName="text-ok-fg">
            noci:{' '}
            {days
              .filter((d) => d.overnight)
              .map((d) => d.overnight!.regionName.split(' ')[0])
              .join(' → ')}
          </Chip>
          <Chip icon={Waypoints} iconClassName="text-ink-3">
            preset {presetKey ?? '—'}
          </Chip>
        </ChipRow>
      </StepSection>

      <StepSection title="Generátor" hint="davy ↔ klenoty, potom Generovať">
        <form action={genAct} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="tripId" value={tripId} />
          <input type="hidden" name="gemShare" value={gem} />
          {(
            [
              [0, 'známe miesta'],
              [0.3, 'mix'],
              [0.6, 'viac klenotov'],
            ] as const
          ).map(([v, l]) => (
            <Chip key={v} on={gem === v} onClick={() => setGem(v)}>
              {l}
            </Chip>
          ))}
          <div className="grow" />
          <ButtonLink href={`/cesta/${tripId}/mapa`} variant="secondary" size="sm">
            <MapIcon size={14} /> Mapa
          </ButtonLink>
          {canEdit && (
            <Button type="submit" size="sm" variant={empty ? 'primary' : 'secondary'} disabled={genPending}>
              <Settings2 size={14} />{' '}
              {genPending ? 'Generujem…' : empty ? 'Generovať' : 'Pregenerovať nezamknuté'}
            </Button>
          )}
        </form>
        {genState && !genState.ok && <Notice tone="bad">{genState.error}</Notice>}
        {empty && (
          <Notice tone="info">
            Zatiaľ bez zastávok – klikni Generovať. Seed má 25 POI (juh, Golden Circle, Reykjavík,
            juhovýchod); sever a východ sa doplnia v 1.1.
          </Notice>
        )}
      </StepSection>

      <StepSection
        title={`Dni · ${days.length}`}
        hint={`${fmtKm(totals.km)} · ${fmtH(totals.driveMinReal)} jazdy · ${totals.stops} zastávok${totals.warnings ? ` · ${totals.warnings} ⚠` : ''}`}
      >
        <ListCard>
          {days.map((d) => {
            const isOpen = open.has(d.dayId);
            return (
              <div key={d.dayId}>
                <ListRow
                  leading={
                    <span
                      className={`font-display grid size-9 place-items-center rounded-[9px] text-[12px] font-semibold ${isOpen ? 'bg-accent-soft text-accent' : 'bg-mut-bg text-ink-2'}`}
                    >
                      {String(d.dayIndex).padStart(2, '0')}
                    </span>
                  }
                  title={`Deň ${d.dayIndex} · ${d.dow} ${dm(d.date)} · ${d.regionName}`}
                  meta={[
                    `${fmtKm(d.driveKm)} · ${fmtH(d.driveMinReal)}`,
                    `${d.stops.length} zast.`,
                    `☀ do ${d.sunset}`,
                    d.overnight
                      ? `noc ${d.overnight.lodgingName ?? d.overnight.regionName}`
                      : 'návrat na KEF',
                  ].join(' · ')}
                  badges={
                    <>
                      {d.locked && <Tag tone="info">zamknutý</Tag>}
                      {d.reserve && <Tag tone="vio">rezerva na počasie</Tag>}
                      {d.warnings.map((w, i) => (
                        <Tag key={i} tone="warn">
                          {w}
                        </Tag>
                      ))}
                    </>
                  }
                  amount={d.entryGroup ? fmtEur(d.entryGroup) : '0 €'}
                  amountSub="vstupné"
                  action={
                    <span className="flex items-center gap-1">
                      {canEdit && (
                        <form action={lockAct}>
                          <input type="hidden" name="tripId" value={tripId} />
                          <input type="hidden" name="dayId" value={d.dayId} />
                          <input type="hidden" name="locked" value={d.locked ? '0' : '1'} />
                          <Button
                            type="submit"
                            size="sm"
                            variant="ghost"
                            icon
                            aria-label={d.locked ? 'Odomknúť deň' : 'Zamknúť deň'}
                            title={d.locked ? 'Odomknúť' : 'Zamknúť deň'}
                          >
                            {d.locked ? <Lock size={14} /> : <LockOpen size={14} />}
                          </Button>
                        </form>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        icon
                        aria-label="Rozbaliť"
                        onClick={() => toggle(d.dayId)}
                      >
                        <ChevronDown
                          size={14}
                          className={isOpen ? 'rotate-180 transition-transform' : 'transition-transform'}
                        />
                      </Button>
                    </span>
                  }
                  selected={isOpen}
                  onOpen={() => toggle(d.dayId)}
                />
                {isOpen && (
                  <>
                    {d.stops.map((s) => {
                      const dr = DRONE[s.droneStatus] ?? DRONE.unknown;
                      return (
                        <div key={s.stopId}>
                          <div className="text-ink-3 flex items-center gap-2 bg-[#FAFBFC] py-0.5 pl-[104px] text-[11px]">
                            {s.driveKmFromPrev > 0
                              ? `${fmtKm(s.driveKmFromPrev)} · ${Math.round(s.driveMinFromPrev * 1.25)} min`
                              : 'štart'}
                          </div>
                          <ListRow
                            nested
                            leading={
                              <span className="font-display text-ink-3 text-[12px] font-semibold">
                                {String(s.order + 1).padStart(2, '0')}
                              </span>
                            }
                            title={`${s.name}${s.hiddenGem ? ' 💎' : ''}`}
                            meta={[
                              s.arrive ? `${s.arrive} · ${s.stayMin} min` : `${s.stayMin} min`,
                              s.parkingEur ? `park. ${fmtEur(s.parkingEur)}` : null,
                              s.bookingRequired ? 'rezervácia' : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                            badges={
                              <>
                                <Tag tone={dr.tone}>{dr.label}</Tag>
                                {s.must ? <Tag tone="info">musí</Tag> : <Tag tone="mut">voliteľné</Tag>}
                                {s.isManual && <Tag tone="ok">ručne</Tag>}
                              </>
                            }
                            amount={s.entryGroup ? fmtEur(s.entryGroup) : '0 €'}
                            action={
                              canEdit ? (
                                <form action={removeAct}>
                                  <input type="hidden" name="tripId" value={tripId} />
                                  <input type="hidden" name="stopId" value={s.stopId} />
                                  <Button
                                    type="submit"
                                    size="sm"
                                    variant="ghost"
                                    icon
                                    aria-label="Odstrániť zastávku"
                                    disabled={removing}
                                  >
                                    <X size={14} />
                                  </Button>
                                </form>
                              ) : undefined
                            }
                            onOpen={() => setDetail({ stop: s, dayIndex: d.dayIndex })}
                          />
                        </div>
                      );
                    })}
                    <div className="text-ink-2 flex flex-wrap items-center gap-2 bg-[#FAFBFC] py-2 pl-[52px] text-[12px] sm:pl-[66px]">
                      <Tile icon={d.overnight ? Tent : Car} tone={d.overnight ? 'ok' : 'info'} size={26} />
                      {d.overnight
                        ? `Noc ${d.dayIndex} · ${d.overnight.regionName}${d.overnight.lodgingName ? ` · ${d.overnight.lodgingName}` : ' · región noci, ubytovanie vyberieš v 05'}`
                        : 'Odovzdanie auta a odlet z KEF'}
                      <span className="grow" />
                      {canEdit && (
                        <Button size="sm" variant="ghost" onClick={() => setAddTo(d)} className="mr-2">
                          <Plus size={14} /> Zastávka
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </ListCard>
      </StepSection>

      <StepSection title="Čo z toho vyplýva" hint="prepočíta sa samo">
        <ResultsCard
          cells={[
            { label: 'Km → palivo (03)', value: fmtKm(totals.km) },
            { label: 'Jazda realisticky', value: fmtH(totals.driveMinReal) },
            { label: 'Zastávky → 06', value: String(totals.stops) },
            { label: `Vstupné · ${pax} os.`, value: fmtEur(totals.entryGroup) },
          ]}
        />
      </StepSection>

      <StepFooter
        className="hidden sm:flex"
        primary={
          <ButtonLink href={`/cesta/${tripId}?krok=5`}>
            Pokračovať na 05 Kde spať <ChevronRight size={16} strokeWidth={1.75} />
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

      {addTo && (
        <Sheet
          open
          onClose={() => setAddTo(null)}
          icon={Sparkles}
          title={`Pridať do dňa ${String(addTo.dayIndex).padStart(2, '0')}`}
          subtitle={`${addTo.regionName} · miesta v regióne prvé`}
        >
          <div className="divide-line -mx-5 divide-y py-2">
            {catalogFor.map((p) => {
              const Icon = KIND_ICON[p.kind] ?? Sparkles;
              return (
                <div key={p.slug} className="flex items-center gap-3 px-5 py-2.5">
                  <Tile icon={Icon} tone={p.regionId === addTo.regionId ? 'info' : 'mut'} size={32} />
                  <div className="flex min-w-0 grow flex-col gap-0.5">
                    <span className="truncate text-sm font-semibold">
                      {p.name}
                      {p.hiddenGem ? ' 💎' : ''}
                    </span>
                    <span className="text-ink-2 truncate text-[12px]">
                      {p.regionName} · {p.visitMin} min · {p.entryGroup ? fmtEur(p.entryGroup) : 'zadarmo'}
                    </span>
                  </div>
                  <form action={addAct}>
                    <input type="hidden" name="tripId" value={tripId} />
                    <input type="hidden" name="dayId" value={addTo.dayId} />
                    <input type="hidden" name="poiSlug" value={p.slug} />
                    <Button type="submit" size="sm" variant="secondary" disabled={adding}>
                      + Pridať
                    </Button>
                  </form>
                </div>
              );
            })}
            {catalogFor.length === 0 && (
              <div className="text-ink-3 px-5 py-6 text-center text-sm">
                Všetky miesta zo seedu sú už v pláne.
              </div>
            )}
          </div>
          {addState && !addState.ok && <span className="text-bad-fg py-2 text-[12px]">{addState.error}</span>}
        </Sheet>
      )}
    </>
  );
}
