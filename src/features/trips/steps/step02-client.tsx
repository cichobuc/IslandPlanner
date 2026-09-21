'use client';

import { ChevronRight, ExternalLink, RefreshCw, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  ButtonLink,
  Card,
  Chip,
  ChipRow,
  DiffToast,
  FieldRow,
  Input,
  Label,
  ListCard,
  ListRow,
  Notice,
  ResultsCard,
  Sheet,
  StepFooter,
  StepHead,
  StepSection,
  Tag,
  sourceTag,
} from '@/components/ui';
import type { Bags } from '@/engine/types';
import { cn } from '@/lib/cn';
import { fmtEur } from '@/lib/format';
import {
  clearFlightAction,
  selectFlightAction,
  selectManualFlightAction,
  setFlightExtraAction,
  setParkingOptionAction,
  type SelectState,
} from '../step02-actions';
import type { OptionLite, SearchMeta, SelectedFlight } from './step02-types';

const MONTHS = [
  'január',
  'február',
  'marec',
  'apríl',
  'máj',
  'jún',
  'júl',
  'august',
  'september',
  'október',
  'november',
  'december',
];
const DOW = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'];
const dm = (iso: string) => `${Number(iso.slice(8, 10))}. ${Number(iso.slice(5, 7))}.`;
const AIRLINE: Record<string, string> = {
  W6: 'Wizz',
  W4: 'Wizz Malta',
  FR: 'Ryanair',
  U2: 'easyJet',
  FI: 'Icelandair',
  PLAY: 'PLAY',
  OG: 'PLAY',
};
const airlineName = (c: string) => AIRLINE[c] ?? c;
const SOURCE_NAME: Record<string, string> = { wizz: 'Wizz Air', ryanair: 'Ryanair', 'tp-flights': 'Travelpayouts', seed: 'seed' };
/** Mená členov, ktorí nemôžu v niektorý deň medzi odletom a návratom (vrátane). */
function blockedBetween(blocked: Record<string, string[]> | undefined, from: string, to: string): string[] {
  if (!blocked) return [];
  const names = new Set<string>();
  for (const [d, who] of Object.entries(blocked)) if (d >= from && d <= to) who.forEach((n) => names.add(n));
  return [...names];
}
/** „2× 20 kg · 4× 10 kg príručná“ z kufrov cestujúcich (krok 01). */
function bagsSummary(bags: Bags[]): string | null {
  const n = (k: keyof Bags) => bags.reduce((a, b) => a + (Number(b?.[k]) || 0), 0);
  const parts = [
    n('checked32') ? `${n('checked32')}× 32 kg` : null,
    n('checked20') ? `${n('checked20')}× 20 kg` : null,
    n('cabin10') ? `${n('cabin10')}× 10 kg príručná` : null,
  ].filter(Boolean);
  return parts.length ? `${parts.join(' · ')} · zmeň v kroku 01 (kufre)` : null;
}

type Progress = { label: string; done: boolean }[];

export function Step02Client(props: {
  tripId: string;
  month: string;
  origins: string[];
  minDays: number;
  maxDays: number;
  pax: number;
  travelersBags: Bags[];
  allowSelfTransfer: boolean;
  options: OptionLite[];
  selected: SelectedFlight | null;
  search: SearchMeta | null;
  /** dni v mesiaci, keď niekto zo skupiny nemôže (z profilov „Kedy môžem“): ISO → mená */
  blockedDays?: Record<string, string[]>;
  canEdit: boolean;
}) {
  const { tripId, month, pax, options, selected, search, canEdit } = props;
  const router = useRouter();
  const [origins, setOrigins] = useState<Set<string>>(new Set(props.origins));
  const [directOnly, setDirectOnly] = useState(false);
  const [perPerson, setPerPerson] = useState(true);
  const [sort, setSort] = useState<'total' | 'fare' | 'days'>('total');
  const [day, setDay] = useState<string | null>(null);
  const [toast, setToast] = useState<{ title: string; lines: string[]; suggestions: string[] } | null>(null);
  const [manualOpen, setManualOpen] = useState(false);

  // ── vyhľadávanie (SSE) ──
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<Progress>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const started = useRef(false);
  const runSearch = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setSearchError(null);
    setProgress(props.origins.map((o) => ({ label: o, done: false })));
    try {
      const res = await fetch('/api/flights/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId,
          origins: props.origins,
          month,
          minDays: props.minDays,
          maxDays: props.maxDays,
          pax,
          travelersBags: props.travelersBags,
          parking: true,
          allowSelfTransfer: props.allowSelfTransfer,
          limit: 200,
          stream: true,
        }),
      });
      if (!res.ok || !res.body) throw new Error(`Vyhľadávanie zlyhalo (${res.status}).`);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      let gotResult = false;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop() ?? '';
        for (const part of parts) {
          const ev = /^event: (.+)$/m.exec(part)?.[1];
          const data = /^data: (.+)$/m.exec(part)?.[1];
          if (!ev || !data) continue;
          const payload = JSON.parse(data);
          if (ev === 'progress' && payload.type === 'origin_done')
            setProgress((p) => p.map((x) => (x.label === payload.origin ? { ...x, done: true } : x)));
          if (ev === 'error') throw new Error(payload.message);
          if (ev === 'result') gotResult = true;
        }
      }
      if (!gotResult) throw new Error('Vyhľadávanie sa skončilo bez výsledku.');
      router.refresh();
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }, [
    running,
    tripId,
    props.origins,
    month,
    props.minDays,
    props.maxDays,
    pax,
    props.travelersBags,
    props.allowSelfTransfer,
    router,
  ]);

  useEffect(() => {
    if (started.current || !canEdit) return;
    if (!search || search.count === 0) {
      started.current = true;
      void runSearch();
    }
  }, [search, canEdit, runSearch]);

  // ── filtre + heatmapa (lokálne, < 100 ms) ──
  const filtered = useMemo(
    () => options.filter((o) => origins.has(o.origin) && (!directOnly || !o.selfTransfer)),
    [options, origins, directOnly],
  );
  const heat = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of filtered) {
      const v = perPerson ? o.totalPp : o.totalGroup;
      const cur = m.get(o.outDate);
      if (cur == null || v < cur) m.set(o.outDate, v);
    }
    const values = [...m.values()].sort((a, b) => a - b);
    const q = (p: number) => values[Math.min(values.length - 1, Math.floor(p * values.length))] ?? 0;
    return { min: m, bounds: values.length ? [q(0.25), q(0.5), q(0.75)] : null, best: values[0] ?? null };
  }, [filtered, perPerson]);
  const listed = useMemo(() => {
    const arr = filtered.filter((o) => !day || o.outDate === day);
    arr.sort((a, b) =>
      sort === 'total'
        ? a.totalGroup - b.totalGroup
        : sort === 'fare'
          ? a.farePp - b.farePp
          : a.days - b.days || a.totalGroup - b.totalGroup,
    );
    return arr.slice(0, 40);
  }, [filtered, day, sort]);

  const [y, mo] = month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const firstDow = (new Date(Date.UTC(y, mo - 1, 1)).getUTCDay() + 6) % 7;
  const band = (v: number | undefined) => {
    if (v == null || !heat.bounds) return 'text-[#B8C0CB]';
    const [a, b, c] = heat.bounds;
    return v <= a ? 'text-ink' : v <= b ? 'text-[#2A3A4C]' : v <= c ? 'text-ink-2' : 'text-ink-3';
  };

  // ── výber ──
  const [selState, selectAct, selecting] = useActionState<SelectState, FormData>(async (prev, fd) => {
    const r = await selectFlightAction(prev, fd);
    if (r?.ok) setToast({ title: 'Let vybraný – prepočítané', lines: r.changes, suggestions: r.suggestions });
    return r;
  }, null);
  const [, clearAct, clearing] = useActionState<SelectState, FormData>(async (prev, fd) => {
    const r = await clearFlightAction(prev, fd);
    if (r?.ok) setToast({ title: 'Výber zrušený', lines: r.changes, suggestions: [] });
    return r;
  }, null);
  const [extraState, extraAct, extraPending] = useActionState<SelectState, FormData>(setFlightExtraAction, null);
  const [, parkingAct, parkingPending] = useActionState<SelectState, FormData>(setParkingOptionAction, null);
  const [manualState, manualAct, manualPending] = useActionState<SelectState, FormData>(async (prev, fd) => {
    const r = await selectManualFlightAction(prev, fd);
    if (r?.ok) {
      setManualOpen(false);
      setToast({ title: 'Ručný let uložený – prepočítané', lines: r.changes, suggestions: r.suggestions });
    }
    return r;
  }, null);

  const bestOption = listed[0];
  // zlyhané zdroje zoskupené podľa konektora: „tp-flights: chýba TRAVELPAYOUTS_TOKEN (BUD, KTW)"
  const okSources = useMemo(
    () =>
      [
        ...new Set(
          Object.entries(search?.connectorStats ?? {})
            .filter(([, c]) => c.ok && c.count > 0)
            .map(([k]) => (k.includes(':') ? k.split(':')[1] : k)),
        ),
      ].map((c) => SOURCE_NAME[c] ?? c),
    [search],
  );
  const failedSources = useMemo(() => {
    const by = new Map<string, Set<string>>();
    for (const [key, c] of Object.entries(search?.connectorStats ?? {})) {
      if (c.ok) continue;
      const [origin, connector] = key.includes(':') ? key.split(':') : ['', key];
      const k = `${connector}${c.reason ? `: ${c.reason}` : ''}`;
      (by.get(k) ?? by.set(k, new Set()).get(k)!).add(origin);
    }
    return [...by.entries()].map(
      ([k, origins]) => `${k}${origins.size && [...origins][0] ? ` (${[...origins].join(', ')})` : ''}`,
    );
  }, [search]);

  return (
    <>
      <StepHead
        step={2}
        name="Letenky"
        question="Kedy letíme a odkiaľ?"
        lead="V kalendári je pri každom dni najlacnejšia cena za celú cestu na letisko a späť (letenka + batožina + parkovanie + cesta autom). Klikni na deň, vyber kombináciu – termín cesty a všetko ďalšie sa prepočíta."
        aside={
          selected ? (
            <div className="flex flex-col items-end gap-1">
              <span className="font-display text-[22px] font-semibold tabular-nums">
                {fmtEur(selected.totalGroup)}
              </span>
              <Tag tone={sourceTag[selected.source].tone}>{sourceTag[selected.source].label}</Tag>
            </div>
          ) : undefined
        }
      />

      <StepSection title="Z predchádzajúcich krokov">
        <ChipRow wrap={false} className="sm:flex-wrap">
          <Chip>{pax} os.</Chip>
          <Chip>{props.origins.join(' · ')}</Chip>
          <Chip>
            {MONTHS[mo - 1]} {y}
          </Chip>
          <Chip>
            {props.minDays}–{props.maxDays} dní
          </Chip>
          <Chip>{props.allowSelfTransfer ? 'aj self-transfer' : 'len priame'}</Chip>
        </ChipRow>
      </StepSection>

      {selected && (
        <StepSection title="Vybraný let" hint={selected.manual ? 'zadaný ručne' : 'z vyhľadávania'}>
          <Card className="border-ok-fg flex flex-col gap-3 border-2 p-4">
            <div className="flex flex-wrap items-start gap-3">
              <div className="flex min-w-0 grow flex-col gap-1">
                <span className="text-sm font-semibold">{selected.outLabel}</span>
                <span className="text-sm font-semibold">{selected.retLabel}</span>
                <span className="text-ink-2 text-[12px]">
                  {selected.days} dní · {selected.nights} nocí · {pax} os.
                  {selected.airline ? ` · ${selected.airline}` : ''}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-display text-[22px] font-semibold tabular-nums">
                  {fmtEur(selected.totalGroup)}
                </span>
                <span className="text-ink-3 text-[12px] tabular-nums">{fmtEur(selected.totalPp)}/os</span>
              </div>
            </div>
            {/* rozpis: čo je v cene a čo sa dá dať preč */}
            <ul className="divide-line border-line flex flex-col divide-y rounded-[10px] border">
              {selected.lines.map((l) => {
                const bagsHint =
                  l.id === 'bags'
                    ? bagsSummary(props.travelersBags) || l.hint
                    : l.hint;
                return (
                  <li key={l.id} className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2', l.excluded && 'opacity-60')}>
                    <div className="flex min-w-0 grow flex-col">
                      <span className={cn('text-[13px] font-medium', l.excluded && 'line-through')}>{l.label}</span>
                      {bagsHint && <span className="text-ink-3 text-[12px]">{bagsHint}</span>}
                      {l.id === 'parking' && !l.excluded && selected.parkingChoices.length > 1 && canEdit && (
                        <form action={parkingAct} className="mt-1 flex flex-wrap items-center gap-1.5">
                          <input type="hidden" name="tripId" value={tripId} />
                          {selected.parkingChoices.map((c) => (
                            <button
                              key={c.id}
                              type="submit"
                              name="parkingOptionId"
                              value={c.id}
                              disabled={parkingPending}
                              className={cn(
                                'rounded-chip inline-flex h-7 items-center gap-1 border px-2 text-[12px]',
                                (selected.parkingOptionId ?? selected.parkingChoices[0]?.id) === c.id
                                  ? 'border-accent-line bg-accent-soft text-accent font-semibold'
                                  : 'bg-mut-bg text-ink border-transparent',
                              )}
                            >
                              {c.name.replace(/\s*\(.*\)$/, '')} · {fmtEur(c.price)}
                              {c.shuttleMin ? ` · shuttle ${c.shuttleMin} min` : ''}
                            </button>
                          ))}
                        </form>
                      )}
                    </div>
                    <span className={cn('text-[13px] font-semibold tabular-nums', l.excluded && 'line-through')}>
                      {fmtEur(l.amount)}
                    </span>
                    <Tag tone={sourceTag[l.source].tone}>{sourceTag[l.source].label}</Tag>
                    {l.id !== 'fare' && canEdit && (
                      <form action={extraAct}>
                        <input type="hidden" name="tripId" value={tripId} />
                        <input type="hidden" name="item" value={l.id} />
                        <input type="hidden" name="on" value={l.excluded ? '1' : '0'} />
                        <Button type="submit" size="sm" variant="ghost" disabled={extraPending}>
                          {l.excluded ? 'Vrátiť' : 'Dať preč'}
                        </Button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
            {extraState && !extraState.ok && <Notice tone="bad">{extraState.error}</Notice>}
            <div className="flex flex-wrap items-center gap-1.5">
              {selected.deepLink && (
                <a
                  href={selected.deepLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent inline-flex h-[34px] items-center gap-1.5 px-2 text-[13px] font-semibold"
                >
                  <ExternalLink size={14} /> Overiť cenu u predajcu
                </a>
              )}
              <div className="grow" />
              {canEdit && (
                <form action={clearAct}>
                  <input type="hidden" name="tripId" value={tripId} />
                  <Button type="submit" variant="ghost" size="sm" disabled={clearing}>
                    Zrušiť výber
                  </Button>
                </form>
              )}
            </div>
          </Card>
        </StepSection>
      )}

      <StepSection
        title={`Kalendár · ${MONTHS[mo - 1]} ${y}`}
        hint={
          search
            ? `${search.count} kombinácií · ${search.stale ? 'staršie než 24 h' : 'aktuálne'}`
            : 'zatiaľ bez cien'
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          {props.origins.map((o) => (
            <Chip
              key={o}
              on={origins.has(o)}
              onClick={() =>
                setOrigins((s) => {
                  const n = new Set(s);
                  if (n.has(o)) n.delete(o);
                  else n.add(o);
                  return n;
                })
              }
            >
              {o}
            </Chip>
          ))}
          <Chip on={directOnly} onClick={() => setDirectOnly((v) => !v)}>
            len priame
          </Chip>
          <span className="grow" />
          <div className="bg-mut-bg rounded-chip flex gap-0.5 p-[3px]">
            {(
              [
                ['pp', '/os'],
                ['group', 'skupina'],
              ] as const
            ).map(([k, l]) => (
              <button
                key={k}
                type="button"
                onClick={() => setPerPerson(k === 'pp')}
                className={cn(
                  'rounded-chip h-7 px-2.5 text-[13px] font-medium',
                  (k === 'pp') === perPerson
                    ? 'bg-accent-soft text-accent border-accent-line border font-semibold'
                    : 'text-ink',
                )}
              >
                {l}
              </button>
            ))}
          </div>
          {canEdit && (
            <Button variant="secondary" size="sm" onClick={() => void runSearch()} disabled={running}>
              <RefreshCw size={14} className={running ? 'animate-spin' : ''} />{' '}
              {running ? 'Hľadám…' : 'Obnoviť ceny'}
            </Button>
          )}
        </div>
        {running && (
          <Notice tone="info">
            Hľadám lety: {progress.map((p) => `${p.label} ${p.done ? '✓' : '…'}`).join(' · ')}
          </Notice>
        )}
        {searchError && <Notice tone="bad">{searchError}</Notice>}
        {failedSources.length > 0 && (
          // pre ľudí: bez technických dôvodov (tokeny, verzie) – tie sú v /api/health
          <Notice tone="mut">
            Ceny sú z dostupných zdrojov ({okSources.join(', ') || 'seed'}); {failedSources.length === 1 ? 'zdroj' : 'zdroje'}{' '}
            {[...new Set(failedSources.map((f) => SOURCE_NAME[f.split(':')[0].split(' ')[0]] ?? f.split(':')[0]))].join(', ')} teraz {failedSources.length === 1 ? 'nedáva' : 'nedávajú'}{' '}
            lety – niektoré kombinácie môžu chýbať.
          </Notice>
        )}
        <Card className="p-3">
          <div className="text-ink-3 mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold tracking-[.06em] uppercase">
            {DOW.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDow }).map((_, i) => (
              <span key={`e${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const iso = `${month}-${String(i + 1).padStart(2, '0')}`;
              const v = heat.min.get(iso);
              const sel = day === iso;
              const best = v != null && v === heat.best;
              const blocked = props.blockedDays?.[iso];
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setDay(sel ? null : iso)}
                  disabled={v == null}
                  title={blocked ? `Nemôže: ${blocked.join(', ')}` : undefined}
                  className={cn(
                    'rounded-chip relative flex h-[46px] flex-col items-start justify-between border px-1.5 py-1 text-left disabled:cursor-default',
                    sel
                      ? 'border-accent bg-accent text-white'
                      : blocked
                        ? 'border-bad-bg bg-bad-bg/40 hover:border-bad-fg'
                        : 'border-card-line bg-card hover:border-accent-line',
                  )}
                >
                  {blocked && !sel && (
                    <span
                      className="bg-bad-fg absolute top-1 right-1 size-1.5 rounded-full"
                      aria-label={`nemôže: ${blocked.join(', ')}`}
                    />
                  )}
                  <span className={cn('text-[11px] leading-none', sel ? 'text-white/80' : 'text-ink-3')}>
                    {i + 1}
                  </span>
                  <span
                    className={cn(
                      'font-display text-[13px] leading-none font-semibold tabular-nums sm:text-[15px]',
                      sel ? 'text-white' : band(v),
                    )}
                  >
                    {v != null ? Math.round(v) : '–'}
                  </span>
                  {best && !sel && (
                    <Zap
                      size={11}
                      className="text-accent absolute top-1 right-1"
                      aria-label="najlacnejší deň"
                    />
                  )}
                </button>
              );
            })}
          </div>
          {heat.bounds && (
            <p className="text-ink-3 mt-2 text-[12px]">
              Číslo = najlacnejšia kombinácia s odletom v ten deň ({perPerson ? 'na osobu' : 'skupina'}).
              Tmavšie = lacnejšie: ≤ {Math.round(heat.bounds[0])} · ≤ {Math.round(heat.bounds[1])} · ≤{' '}
              {Math.round(heat.bounds[2])} · viac. ⚡ = najlacnejší deň. Klik filtruje zoznam.
              {props.blockedDays && Object.keys(props.blockedDays).length > 0 && (
                <>
                  {' '}
                  <span className="bg-bad-fg inline-block size-1.5 rounded-full align-middle" /> = niekto nemôže
                  (profil „Kedy môžem“).
                </>
              )}
            </p>
          )}
          {!heat.bounds && !running && (
            <p className="text-ink-3 mt-2 text-[12px]">Žiadne ceny pre zvolené filtre.</p>
          )}
        </Card>
      </StepSection>

      <StepSection
        title={day ? `Kombinácie · odlet ${dm(day)}` : 'Kombinácie'}
        hint={`${listed.length} z ${filtered.length}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Label>Radiť</Label>
          {(
            [
              ['total', 'celkom'],
              ['fare', 'letenka'],
              ['days', 'dĺžka'],
            ] as const
          ).map(([k, l]) => (
            <Chip key={k} on={sort === k} onClick={() => setSort(k)}>
              {l}
            </Chip>
          ))}
          {day && <Chip onClick={() => setDay(null)}>× zrušiť deň</Chip>}
        </div>
        <ListCard>
          {listed.map((o, i) => {
            const isSel = selected?.optionId === o.id;
            const conflict = blockedBetween(props.blockedDays, o.outDate, o.retDate);
            return (
              <ListRow
                key={o.id}
                leading={
                  <span
                    className={cn(
                      'font-display grid size-9 place-items-center rounded-[9px] text-[12px] font-semibold',
                      isSel
                        ? 'bg-ok-bg text-ok-fg'
                        : i === 0
                          ? 'bg-accent-soft text-accent'
                          : 'bg-mut-bg text-ink-2',
                    )}
                  >
                    {o.origin}
                  </span>
                }
                title={`${o.origin} ⇄ KEF · ${dm(o.outDate).replace(/\.$/, '')}–${dm(o.retDate)} · ${o.outDep} / ${o.retDep}`}
                meta={[
                  o.airlines.map(airlineName).join(' + '),
                  o.selfTransfer ? `cez ${o.hub ?? 'hub'}` : 'priamy',
                  `${o.days} dní`,
                  `letenky ${fmtEur(o.farePp * pax)}`,
                  o.bags ? `batož. ${fmtEur(o.bags)}` : null,
                  o.parking != null ? `park. ${fmtEur(o.parking)}` : null,
                  `cesta ${fmtEur(o.access)}`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                badges={
                  <>
                    <Tag tone={sourceTag[o.source].tone}>
                      {o.isEstimate ? 'odhad' : sourceTag[o.source].label}
                    </Tag>
                    {o.selfTransfer && <Tag tone="warn">self-transfer</Tag>}
                    {conflict.length > 0 && <Tag tone="bad">nemôže {conflict.join(', ')}</Tag>}
                    {isSel && <Tag tone="ok">vybrané ✓</Tag>}
                  </>
                }
                amount={fmtEur(o.totalGroup)}
                amountSub={`${fmtEur(o.totalPp)}/os`}
                selected={isSel}
                action={
                  canEdit && !isSel ? (
                    <form action={selectAct}>
                      <input type="hidden" name="tripId" value={tripId} />
                      <input type="hidden" name="optionId" value={o.id} />
                      <Button
                        type="submit"
                        size="sm"
                        variant={i === 0 ? 'primary' : 'secondary'}
                        disabled={selecting}
                      >
                        Vybrať
                      </Button>
                    </form>
                  ) : undefined
                }
                href={o.deepLink ?? undefined}
              />
            );
          })}
          {listed.length === 0 && (
            <div className="text-ink-3 px-4 py-8 text-center text-sm">
              {running
                ? 'Hľadám…'
                : options.length === 0
                  ? 'Žiadne kombinácie – spusti „Obnoviť ceny“ alebo zadaj let ručne.'
                  : 'Nič pre tieto filtre – skús iný deň alebo zapni ďalšie letisko.'}
            </div>
          )}
        </ListCard>
        {selState && !selState.ok && <Notice tone="bad">{selState.error}</Notice>}
      </StepSection>

      <StepSection title="Čo z toho vyplýva" hint="prepočíta sa po výbere">
        <ResultsCard
          cells={[
            {
              label: 'Termín',
              value: selected
                ? `${selected.outLabel.split('· ')[1]?.split(' ')[0] ?? ''}–${selected.retLabel.split('· ')[1]?.split(' ')[0] ?? ''}`
                : '—',
            },
            {
              label: 'Dni · noci',
              value: selected
                ? `${selected.days} · ${selected.nights}`
                : bestOption
                  ? `≈ ${bestOption.days} · ${bestOption.nights}`
                  : '—',
            },
            { label: 'Krok 03', value: selected ? `prenájom ${selected.days} d` : 'po výbere' },
            {
              label: 'Na osobu',
              value: selected
                ? fmtEur(selected.totalPp)
                : bestOption
                  ? fmtEur(bestOption.totalPp, { approx: true })
                  : '—',
            },
          ]}
        />
      </StepSection>

      <StepFooter
        className="hidden sm:flex"
        secondary={
          canEdit ? (
            <Button variant="ghost" size="sm" onClick={() => setManualOpen(true)}>
              + Zadať let ručne
            </Button>
          ) : undefined
        }
        primary={
          <ButtonLink
            href={`/cesta/${tripId}?krok=3`}
            className={selected ? '' : 'pointer-events-none opacity-50'}
            aria-disabled={!selected}
          >
            Pokračovať na 03 Doprava <ChevronRight size={16} strokeWidth={1.75} />
          </ButtonLink>
        }
      />
      {canEdit && (
        <div className="sm:hidden">
          <Button variant="ghost" size="sm" onClick={() => setManualOpen(true)}>
            + Zadať let ručne
          </Button>
        </div>
      )}

      <Sheet
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        title="Let zadaný ručne"
        subtitle="časy odletu v čase letiska odletu; prílet/odlet z KEF v islandskom čase"
        footer={
          <>
            <div className="grow" />
            <Button type="submit" form="manual-flight" disabled={manualPending}>
              {manualPending ? 'Ukladám…' : 'Uložiť a prepočítať'}
            </Button>
          </>
        }
      >
        <form id="manual-flight" action={manualAct} className="divide-line flex flex-col divide-y py-2">
          <input type="hidden" name="tripId" value={tripId} />
          <FieldRow label="Letisko odletu">
            <Input
              name="origin"
              defaultValue={props.origins[0] ?? 'KTW'}
              maxLength={3}
              className="max-w-[100px] uppercase"
              required
            />
          </FieldRow>
          <FieldRow label="Odlet z domu → prílet KEF">
            <div className="flex flex-wrap gap-2">
              <Input
                name="outDepAt"
                type="datetime-local"
                defaultValue={`${month}-12T06:40`}
                required
                className="max-w-[220px]"
              />
              <Input
                name="outArrAt"
                type="datetime-local"
                defaultValue={`${month}-12T09:15`}
                required
                className="max-w-[220px]"
              />
            </div>
          </FieldRow>
          <FieldRow label="Odlet KEF → prílet domov">
            <div className="flex flex-wrap gap-2">
              <Input
                name="retDepAt"
                type="datetime-local"
                defaultValue={`${month}-21T12:00`}
                required
                className="max-w-[220px]"
              />
              <Input
                name="retArrAt"
                type="datetime-local"
                defaultValue={`${month}-21T18:30`}
                required
                className="max-w-[220px]"
              />
            </div>
          </FieldRow>
          <FieldRow label="Airline">
            <Input name="airline" placeholder="Wizz Air" maxLength={40} className="max-w-[220px]" />
          </FieldRow>
          <FieldRow label="Letenky skupina (€)" hint="za všetkých, bez batožiny">
            <Input name="priceGroup" type="number" min={0} step={1} required className="max-w-[140px]" />
          </FieldRow>
          <FieldRow label="Batožina spolu (€)" hint="voliteľné – kufre za všetkých">
            <Input name="bagsTotal" type="number" min={0} step={1} className="max-w-[140px]" />
          </FieldRow>
          <FieldRow label="Parkovanie (€)" hint="voliteľné – inak najlacnejšie zo seedu, dá sa dať preč">
            <Input name="parkingTotal" type="number" min={0} step={1} className="max-w-[140px]" />
          </FieldRow>
          <FieldRow label="Odkaz na rezerváciu">
            <Input name="url" type="url" placeholder="https://" />
          </FieldRow>
          {manualState && !manualState.ok && (
            <span className="text-bad-fg py-2 text-[12px]">{manualState.error}</span>
          )}
        </form>
      </Sheet>

      {toast && (
        <DiffToast
          title={toast.title}
          lines={toast.lines}
          suggestions={toast.suggestions}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
