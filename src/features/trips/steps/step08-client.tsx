'use client';

import {
  BedDouble,
  Car,
  ChevronDown,
  ChevronRight,
  Download,
  Plane,
  Plus,
  Sparkles,
  Utensils,
  Wallet,
  X,
  Printer,
} from 'lucide-react';
import { useActionState, useState } from 'react';
import {
  Button,
  ButtonLink,
  Chip,
  ChipRow,
  FieldRow,
  Input,
  ListCard,
  ListRow,
  Notice,
  ResultsCard,
  Segmented,
  Select,
  Sheet,
  StepAmount,
  StepFooter,
  StepHead,
  StepSection,
  Tag,
  Tile,
  sourceTag,
} from '@/components/ui';
import type { BudgetCategory, BudgetLine, BudgetResult } from '@/engine/types';
import { fmtEur, fmtRange } from '@/lib/format';
import type { ActionState } from '../actions';
import { addManualItemAction, removeManualItemAction, updateBudgetSettingsAction } from '../step0708-actions';

const CAT: Record<
  BudgetCategory,
  { label: string; icon: typeof Plane; tone: 'info' | 'ok' | 'vio' | 'warn' | 'mut' }
> = {
  flights: { label: 'Letenky & cesta', icon: Plane, tone: 'info' },
  transport: { label: 'Doprava na Islande', icon: Car, tone: 'info' },
  lodging: { label: 'Kde spať', icon: BedDouble, tone: 'ok' },
  attractions: { label: 'Atrakcie', icon: Sparkles, tone: 'vio' },
  food: { label: 'Strava', icon: Utensils, tone: 'warn' },
  other: { label: 'Ostatné', icon: Wallet, tone: 'mut' },
  reserve: { label: 'Rezerva', icon: Wallet, tone: 'mut' },
};
const ORDER: BudgetCategory[] = [
  'flights',
  'transport',
  'lodging',
  'attractions',
  'food',
  'other',
  'reserve',
];
type Tab = 'summary' | 'scenarios' | 'perPerson';

export function Step08Client({
  tripId,
  tripName,
  active,
  result,
  travelers,
  manualItems,
  reservePct,
  budgetTargetPp,
  fx,
  canEdit,
}: {
  tripId: string;
  tripName: string;
  active: 'car' | 'camper';
  result: BudgetResult;
  travelers: { id: string; name: string }[];
  manualItems: { id: string; label: string }[];
  reservePct: number;
  budgetTargetPp: number | null;
  fx: { ISK_EUR: number; date: string };
  canEdit: boolean;
}) {
  const [tab, setTab] = useState<Tab>('summary');
  const [scenario, setScenario] = useState<'car' | 'camper'>(active);
  const [open, setOpen] = useState<Set<string>>(new Set(['flights']));
  const [addOpen, setAddOpen] = useState(false);
  const t = result.scenarios[scenario];
  const [settingsState, settingsAct, settingsPending] = useActionState<ActionState, FormData>(
    updateBudgetSettingsAction,
    null,
  );
  const [addState, addAct, addPending] = useActionState<ActionState, FormData>(async (p, fd) => {
    const r = await addManualItemAction(p, fd);
    if (r?.ok) setAddOpen(false);
    return r;
  }, null);
  const [, removeAct, removing] = useActionState<ActionState, FormData>(removeManualItemAction, null);
  if (!t) return <Notice tone="info">Rozpočet zatiaľ nejde spočítať.</Notice>;
  const toggle = (k: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  const estimateShare = ORDER.reduce(
    (a, k) =>
      a + t.byCategory[k].lines.filter((l) => l.confidence === 'estimate').reduce((x, l) => x + l.amount, 0),
    0,
  );
  const nameOf = (id: string) => travelers.find((x) => x.id === id)?.name ?? id;
  const manualId = (line: BudgetLine) => (line.id.startsWith('manual-') ? line.id.slice(7) : null);

  return (
    <>
      <StepHead
        step={8}
        name="Rozpočet"
        question="Koľko to stojí – celkom a na osobu?"
        lead={`Všetko z krokov 01–07 pre vetvu ${scenario === 'camper' ? 'Karavan' : 'Auto'}: skupinové položky rovným dielom, osobné (letenka, vstupné podľa veku, strava) presne. Odhady majú rozsah; rezerva ${reservePct} %. Kurz 1 ISK = ${fx.ISK_EUR.toFixed(4)} € (${fx.date}).`}
        aside={
          <StepAmount
            amount={t.group}
            source={t.confidence === 'estimate' ? 'estimate' : 'seed'}
            approx={t.confidence === 'estimate'}
          />
        }
      />

      <StepSection title="Zobrazenie">
        <ChipRow>
          {(
            [
              ['summary', 'Súhrn'],
              ['scenarios', 'Scenáre'],
              ['perPerson', 'Na osobu'],
            ] as const
          ).map(([k, l]) => (
            <Chip key={k} on={tab === k} onClick={() => setTab(k)}>
              {l}
            </Chip>
          ))}
          <span className="grow" />
          <Chip on={scenario === 'car'} onClick={() => setScenario('car')} icon={Car}>
            Auto {result.scenarios.car ? fmtEur(result.scenarios.car.group) : ''}
          </Chip>
          <Chip on={scenario === 'camper'} onClick={() => setScenario('camper')} icon={Car}>
            Karavan {result.scenarios.camper ? fmtEur(result.scenarios.camper.group) : ''}
          </Chip>
        </ChipRow>
        {scenario !== active && (
          <Notice tone="info">
            Pozeráš druhú vetvu – aktívna je {active === 'camper' ? 'Karavan' : 'Auto'} (krok 03).
          </Notice>
        )}
      </StepSection>

      {tab === 'summary' && (
        <StepSection
          title={`Súhrn · ${fmtEur(t.group)}`}
          hint={
            t.min !== t.max
              ? `rozsah ${fmtRange(t.min, t.max)} · odhady ${fmtEur(estimateShare)}`
              : 'bez odhadov'
          }
        >
          <ListCard>
            {ORDER.map((k) => {
              const c = t.byCategory[k];
              if (c.lines.length === 0) return null;
              const isOpen = open.has(k);
              const m = CAT[k];
              return (
                <div key={k}>
                  <ListRow
                    leading={<Tile icon={m.icon} tone={m.tone} />}
                    title={m.label}
                    meta={`${c.lines.length} ${c.lines.length === 1 ? 'položka' : c.lines.length < 5 ? 'položky' : 'položiek'}${c.min !== c.max ? ` · rozsah ${fmtRange(c.min, c.max)}` : ''}`}
                    badges={
                      <Tag
                        tone={
                          c.confidence === 'estimate' ? 'warn' : c.confidence === 'cached' ? 'info' : 'ok'
                        }
                      >
                        {c.confidence === 'estimate' ? 'odhad' : c.confidence === 'cached' ? 'API' : 'presné'}
                      </Tag>
                    }
                    amount={fmtEur(c.amount)}
                    amountSub={`${fmtEur(c.amount / result.pax)}/os`}
                    action={
                      <Button
                        size="sm"
                        variant="secondary"
                        icon
                        aria-label="Rozbaliť"
                        onClick={() => toggle(k)}
                      >
                        <ChevronDown
                          size={14}
                          className={isOpen ? 'rotate-180 transition-transform' : 'transition-transform'}
                        />
                      </Button>
                    }
                    selected={isOpen}
                    onOpen={() => toggle(k)}
                  />
                  {isOpen &&
                    c.lines.map((l) => {
                      const mid = manualId(l);
                      return (
                        <ListRow
                          key={l.id}
                          nested
                          leading={
                            <span className="text-ink-3 text-[11px] font-semibold">
                              {String(l.step).padStart(2, '0')}
                            </span>
                          }
                          title={l.label}
                          meta={[
                            l.split === 'person'
                              ? 'na osobu'
                              : l.split === 'vehicle'
                                ? 'per auto'
                                : 'skupina',
                            l.note,
                            l.min !== l.max ? fmtRange(l.min, l.max) : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                          badges={<Tag tone={sourceTag[l.source].tone}>{sourceTag[l.source].label}</Tag>}
                          amount={fmtEur(l.amount)}
                          href={`/cesta/${tripId}?krok=${l.step}`}
                          action={
                            canEdit && mid ? (
                              <form action={removeAct}>
                                <input type="hidden" name="tripId" value={tripId} />
                                <input type="hidden" name="itemId" value={mid} />
                                <Button
                                  type="submit"
                                  size="sm"
                                  variant="ghost"
                                  icon
                                  aria-label="Odstrániť"
                                  disabled={removing}
                                >
                                  <X size={14} />
                                </Button>
                              </form>
                            ) : undefined
                          }
                        />
                      );
                    })}
                </div>
              );
            })}
          </ListCard>
          {t.warnings.length > 0 && (
            <Notice tone="warn">
              {t.warnings.map((w, i) => (
                <div key={i}>⚠ {w}</div>
              ))}
            </Notice>
          )}
        </StepSection>
      )}

      {tab === 'scenarios' && (
        <StepSection title="Auto vs. Karavan" hint="víťaz per kategória tučne">
          <ListCard>
            {ORDER.map((k) => {
              const a = result.scenarios.car?.byCategory[k].amount ?? 0;
              const b = result.scenarios.camper?.byCategory[k].amount ?? 0;
              if (!a && !b) return null;
              return (
                <ListRow
                  key={k}
                  leading={<Tile icon={CAT[k].icon} tone={CAT[k].tone} />}
                  title={CAT[k].label}
                  meta={
                    a === b
                      ? 'rovnaké'
                      : a < b
                        ? `auto lacnejšie o ${fmtEur(b - a)}`
                        : `karavan lacnejší o ${fmtEur(a - b)}`
                  }
                  amount={
                    <span className="flex gap-4">
                      <span className={a <= b ? '' : 'text-ink-3 font-normal'}>{fmtEur(a)}</span>
                      <span className={b <= a ? '' : 'text-ink-3 font-normal'}>{fmtEur(b)}</span>
                    </span>
                  }
                  amountSub="auto · karavan"
                />
              );
            })}
            <ListRow
              leading={<Tile icon={Wallet} tone="info" />}
              title="Celkom"
              meta={
                result.recommended === 'car'
                  ? `auto lacnejšie o ${fmtEur((result.scenarios.camper?.group ?? 0) - (result.scenarios.car?.group ?? 0))}`
                  : `karavan lacnejší o ${fmtEur((result.scenarios.car?.group ?? 0) - (result.scenarios.camper?.group ?? 0))}`
              }
              amount={
                <span className="flex gap-4">
                  <span>{fmtEur(result.scenarios.car?.group ?? 0)}</span>
                  <span>{fmtEur(result.scenarios.camper?.group ?? 0)}</span>
                </span>
              }
              amountSub={`${fmtEur(result.scenarios.car?.perPerson ?? 0)} · ${fmtEur(result.scenarios.camper?.perPerson ?? 0)} /os`}
              badges={<Tag tone="ok">odporúčané: {result.recommended === 'car' ? 'auto' : 'karavan'}</Tag>}
            />
          </ListCard>
          <Notice tone="mut">
            Neceňové: auto = teplo a flexibilné noci, karavan = sloboda a kuchynka vždy, ale noci 3–8 °C a
            kempy len otvorené (mnohé zatvárajú 15.–30. 9.).
          </Notice>
        </StepSection>
      )}

      {tab === 'perPerson' && (
        <StepSection title={`Na osobu · ${result.pax}`} hint="skupinové rovným dielom, osobné presne">
          <ListCard>
            {Object.entries(t.perTraveler).map(([id, amount], i) => {
              const personal = ORDER.flatMap((k) => t.byCategory[k].lines)
                .filter((l) => l.split === 'person')
                .reduce((a, l) => a + (l.perTraveler[id] ?? 0), 0);
              return (
                <ListRow
                  key={id}
                  leading={
                    <span className="font-display bg-vio-bg text-vio-fg grid size-9 place-items-center rounded-[9px] text-[12px] font-semibold">
                      {nameOf(id).slice(0, 1)}
                    </span>
                  }
                  title={nameOf(id)}
                  meta={`osobné ${fmtEur(personal)} · podiel skupinových ${fmtEur(amount - personal)}`}
                  amount={fmtEur(amount)}
                  amountSub={i === 0 ? 'celkom' : undefined}
                />
              );
            })}
          </ListCard>
          <Notice tone="mut">Kto zaplatil čo a vyrovnanie („Ja vs. Skupina“) príde vo verzii 1.1.</Notice>
        </StepSection>
      )}

      <StepSection title="Nastavenia" hint="rezerva a cieľ">
        <form
          action={settingsAct}
          className="rounded-card border-card-line bg-card divide-line flex flex-col divide-y border px-4"
        >
          <input type="hidden" name="tripId" value={tripId} />
          <fieldset disabled={!canEdit} className="contents">
            <FieldRow label="Rezerva %" hint="na nečakané (počasie, ceny)">
              <Input
                name="reservePct"
                type="number"
                min={0}
                max={50}
                step={1}
                defaultValue={reservePct}
                className="max-w-[100px]"
              />
            </FieldRow>
            <FieldRow
              label="Cieľ / os. (€)"
              hint={
                t.vsTargetPp != null
                  ? t.vsTargetPp > 0
                    ? `prekročené o ${fmtEur(t.vsTargetPp)}`
                    : `zostáva ${fmtEur(-t.vsTargetPp)}`
                  : 'voliteľné'
              }
            >
              <Input
                name="budgetTargetPp"
                type="number"
                min={0}
                step={10}
                defaultValue={budgetTargetPp ?? ''}
                placeholder="1 200"
                className="max-w-[140px]"
              />
            </FieldRow>
          </fieldset>
          {canEdit && (
            <div className="flex items-center gap-3 py-3">
              {settingsState?.ok && <span className="text-ok-fg text-[12px]">Uložené.</span>}
              {settingsState && !settingsState.ok && (
                <span className="text-bad-fg text-[12px]">{settingsState.error}</span>
              )}
              <div className="grow" />
              <Button type="submit" variant="secondary" size="sm" disabled={settingsPending}>
                Uložiť
              </Button>
            </div>
          )}
        </form>
      </StepSection>

      <StepSection title="Čo z toho vyplýva">
        <ResultsCard
          cells={[
            { label: 'Celkom skupina', value: fmtEur(t.group) },
            { label: 'Na osobu', value: fmtEur(t.perPerson) },
            { label: 'Rozsah', value: t.min !== t.max ? fmtRange(t.min, t.max) : 'presné' },
            {
              label: 'Cieľ / os.',
              value: budgetTargetPp
                ? `${fmtEur(budgetTargetPp)} · ${t.vsTargetPp != null && t.vsTargetPp > 0 ? `+${fmtEur(t.vsTargetPp)}` : 'ok'}`
                : '—',
            },
          ]}
        />
      </StepSection>

      <StepFooter
        className="hidden sm:flex"
        secondary={
          <>
            {canEdit && (
              <Button variant="ghost" size="sm" onClick={() => setAddOpen(true)}>
                <Plus size={14} /> Položka{manualItems.length ? ` (${manualItems.length})` : ''}
              </Button>
            )}
            <ButtonLink href={`/api/trips/${tripId}/export?format=json`} variant="ghost" size="sm">
              <Download size={14} /> JSON
            </ButtonLink>
            <ButtonLink href={`/api/trips/${tripId}/export?format=csv`} variant="ghost" size="sm">
              <Download size={14} /> CSV
            </ButtonLink>
            <ButtonLink href={`/cesta/${tripId}/tlac`} variant="ghost" size="sm">
              <Printer size={14} /> Tlač / PDF
            </ButtonLink>
          </>
        }
        primary={
          <ButtonLink href="/">
            Hotovo – späť na Cesty <ChevronRight size={16} strokeWidth={1.75} />
          </ButtonLink>
        }
      />
      <div className="flex flex-wrap gap-2 sm:hidden">
        {canEdit && (
          <Button variant="ghost" size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={14} /> Položka
          </Button>
        )}
        <ButtonLink href={`/api/trips/${tripId}/export?format=json`} variant="ghost" size="sm">
          <Download size={14} /> JSON
        </ButtonLink>
      </div>

      <Sheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Ručná položka"
        subtitle={`${tripName} · napr. cestovné poistenie, SIM, suveníry`}
        footer={
          <>
            <div className="grow" />
            <Button type="submit" form="manual-item" disabled={addPending}>
              {addPending ? 'Ukladám…' : 'Pridať'}
            </Button>
          </>
        }
      >
        <form id="manual-item" action={addAct} className="divide-line flex flex-col divide-y py-2">
          <input type="hidden" name="tripId" value={tripId} />
          <FieldRow label="Názov">
            <Input name="label" placeholder="Cestovné poistenie s ľadovcami" required maxLength={80} />
          </FieldRow>
          <FieldRow label="Suma">
            <div className="flex gap-2">
              <Input name="amount" type="number" min={0} step={1} required className="max-w-[130px]" />
              <Select name="currency" defaultValue="EUR" className="max-w-[90px]">
                <option value="EUR">€</option>
                <option value="ISK">ISK</option>
              </Select>
            </div>
          </FieldRow>
          <FieldRow label="Delenie" hint="na osobu = suma × počet osôb">
            <Segmented
              name="split"
              defaultValue="group"
              options={[
                { value: 'group', label: 'Skupina' },
                { value: 'person', label: 'Na osobu' },
              ]}
            />
          </FieldRow>
          <FieldRow label="Kategória">
            <Select name="category" defaultValue="other">
              <option value="insurance">poistenie</option>
              <option value="sim">SIM / dáta</option>
              <option value="souvenir">suveníry</option>
              <option value="other">iné</option>
            </Select>
          </FieldRow>
          <FieldRow label="Vetva">
            <Segmented
              name="scenario"
              defaultValue="both"
              options={[
                { value: 'both', label: 'Obe' },
                { value: 'car', label: 'Auto' },
                { value: 'camper', label: 'Karavan' },
              ]}
            />
          </FieldRow>
          {addState && !addState.ok && <span className="text-bad-fg py-2 text-[12px]">{addState.error}</span>}
        </form>
      </Sheet>
    </>
  );
}
