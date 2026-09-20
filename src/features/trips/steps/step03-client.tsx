'use client';

import {
  Bus,
  CalendarCheck,
  Car,
  Check,
  ChevronRight,
  Fuel,
  Plane,
  ShieldCheck,
  Tent,
  Users,
  Waypoints,
} from 'lucide-react';
import { useActionState, useMemo, useState } from 'react';
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
  OptionCard,
  OptionGrid,
  ResultsCard,
  Select,
  Sheet,
  StepAmount,
  StepFooter,
  StepHead,
  StepSection,
  Tag,
  Tile,
} from '@/components/ui';
import type { VehicleClass } from '@/engine/types';
import { fmtEur, fmtKm } from '@/lib/format';
import type { ActionState } from '../actions';
import {
  addManualVehicleAction,
  selectVehicleAction,
  setTransportModeAction,
  updateVehicleOptionsAction,
} from '../step03-actions';
import type { Step03Data, VehicleLite } from './step03-types';

const CLASS_LABEL: Record<VehicleClass, string> = {
  economy: 'Economy',
  estate: 'Kombi',
  suv2wd: 'SUV',
  '4x4': '4×4',
  camper2: '2 os.',
  camper4: '3–4 os.',
  camper4x4: '4×4 camper',
};
const INS_LABEL: Record<string, string> = {
  cdw: 'CDW',
  scdw: 'SCDW',
  gp: 'Gravel',
  saap: 'Sand & ash',
  theft: 'Theft',
  zero: 'Zero excess',
};
const INS_NOTE: Record<string, string> = {
  gp: 'na Ring Road prakticky nutné',
  saap: 'juh pri vetre; september nižšie riziko',
};
const EXTRA_LABEL: Record<string, string> = {
  second_driver: '2. vodič',
  wifi: 'Wi-Fi',
  child_seat: 'detská sedačka',
  chains: 'reťaze',
  roof_box: 'strešný box',
  gps: 'GPS',
  bedding: 'bielizeň',
  camping_kit: 'kempingová súprava',
};
const fuelLabel = (f: 'petrol' | 'diesel') => (f === 'petrol' ? 'benzín' : 'diesel');

export function Step03Client({ data }: { data: Step03Data }) {
  const { tripId, mode, pax, days, km, vehicles, selection, canEdit, branches } = data;
  const scenario: 'car' | 'camper' = mode === 'camper' ? 'camper' : 'car';
  const sel = selection[scenario];
  const list = useMemo(() => vehicles.filter((v) => v.kind === scenario), [vehicles, scenario]);
  const classes = useMemo(() => [...new Set(list.map((v) => v.class))], [list]);
  const [cls, setCls] = useState<VehicleClass | null>(null);
  const shown = useMemo(() => {
    const arr = list.filter((v) => !cls || v.class === cls);
    arr.sort((a, b) =>
      a.id === sel?.vehicleOptionId ? -1 : b.id === sel?.vehicleOptionId ? 1 : a.cost.total - b.cost.total,
    );
    return arr;
  }, [list, cls, sel]);
  const chosen = list.find((v) => v.id === sel?.vehicleOptionId) ?? null;
  const [manualOpen, setManualOpen] = useState(false);

  const [modeState, modeAct, modePending] = useActionState<ActionState, FormData>(
    setTransportModeAction,
    null,
  );
  const [selState, selAct, selPending] = useActionState<ActionState, FormData>(selectVehicleAction, null);
  const [optState, optAct, optPending] = useActionState<ActionState, FormData>(
    updateVehicleOptionsAction,
    null,
  );
  const [manState, manAct, manPending] = useActionState<ActionState, FormData>(async (p, fd) => {
    const r = await addManualVehicleAction(p, fd);
    if (r?.ok) setManualOpen(false);
    return r;
  }, null);

  const step5 = mode === 'camper' ? 'Kempy' : mode === 'no_car' ? 'Základňa' : 'Ubytovanie';
  const stepAmount = chosen
    ? chosen.cost.total
    : mode
      ? (branches.find((b) => b.mode === mode)?.vehicle ?? 0) +
        (branches.find((b) => b.mode === mode)?.fuel ?? 0)
      : 0;
  const branchIcon = { car: Car, camper: Tent, no_car: Bus } as const;
  const branchDesc = {
    car: 'izby po trase · flexibilné · teplo',
    camper: 'kempy · kuchynka vždy · noci 3–8 °C',
    no_car: 'hotel v Reykjavíku · výlety z mesta',
  } as const;
  const branchName = { car: 'Auto', camper: 'Karavan', no_car: 'Bez auta' } as const;

  return (
    <>
      <StepHead
        step={3}
        name="Doprava"
        question="Auto, karavan alebo bez auta?"
        lead="Tri možnosti s odhadom celej cesty (letenky + vozidlo + palivo + noci + strava). Voľba určí, či noci v kroku 05 budú izby (Ubytovanie), kempy, alebo hotel v Reykjavíku s výletmi. Dá sa kedykoľvek zmeniť – dáta druhej vetvy ostávajú."
        aside={
          mode ? (
            <StepAmount amount={stepAmount} source={chosen ? chosen.source : 'estimate'} approx={!chosen} />
          ) : undefined
        }
      />

      <StepSection title="Z predchádzajúcich krokov">
        <ChipRow wrap={false} className="sm:flex-wrap">
          <Chip icon={CalendarCheck} iconClassName="text-accent">
            {days} dní prenájmu{data.dates ? ` · ${data.dates}` : ' · bez letu (min. dní)'}
          </Chip>
          {data.pickup && (
            <Chip icon={Plane} iconClassName="text-accent">
              pickup KEF ~{data.pickup} · return ~{data.ret}
            </Chip>
          )}
          <Chip icon={Users} iconClassName="text-vio-fg">
            {data.drivers.length
              ? `${data.drivers.length} ${data.drivers.length === 1 ? 'vodič' : 'vodiči'} · ${data.drivers.map((d) => `${d.age} r.`).join(', ')}`
              : 'žiadny vodič!'}
          </Chip>
          <Chip
            icon={ShieldCheck}
            iconClassName={data.drivers.some((d) => d.hasCreditCard) ? 'text-ok-fg' : 'text-bad-fg'}
          >
            kreditná karta {data.drivers.some((d) => d.hasCreditCard) ? '✓' : '✗'}
          </Chip>
          <Chip icon={Waypoints} iconClassName="text-ink-3">
            {fmtKm(km)} · {data.kmSource === 'itinerary' ? 'z itinerára' : `preset ${data.presetKey}`}
          </Chip>
        </ChipRow>
      </StepSection>

      <StepSection title="Tvoja voľba" hint="odhad celej cesty pri každej vetve">
        <OptionGrid>
          {branches.map((b) => (
            <form key={b.mode} action={modeAct} className="contents">
              <input type="hidden" name="tripId" value={tripId} />
              <input type="hidden" name="mode" value={b.mode} />
              <OptionCard
                icon={branchIcon[b.mode]}
                title={b.mode === 'no_car' ? `${branchName[b.mode]} · v1.1` : branchName[b.mode]}
                amount={fmtEur(b.total, { approx: true })}
                description={`${branchDesc[b.mode]} · ${fmtEur(b.perPerson)}/os`}
                selected={mode === b.mode}
                disabled={!canEdit || modePending || b.mode === 'no_car'}
                submit
              />
            </form>
          ))}
        </OptionGrid>
        {modeState && !modeState.ok && <Notice tone="bad">{modeState.error}</Notice>}
        {!mode && (
          <Notice tone="info">Klikni na Auto alebo Karavan – potom sa objavia vozidlá tej vetvy.</Notice>
        )}
      </StepSection>

      {mode && (
        <StepSection title={scenario === 'camper' ? 'Karavan' : 'Vozidlo'} hint="tu rozhoduješ">
          <ChipRow wrap={false} className="items-center sm:flex-wrap">
            <Chip on={cls === null} onClick={() => setCls(null)}>
              všetky
            </Chip>
            {classes.map((c) => (
              <Chip key={c} on={cls === c} onClick={() => setCls(c)}>
                {CLASS_LABEL[c]}
              </Chip>
            ))}
            <span className="text-ink-3 ml-auto hidden text-[12px] sm:inline">
              seed cenníky 09/2026 · palivo {data.rates.petrol} / {data.rates.diesel} ISK/l (
              {data.rates.fuelSource}) · kurz {data.rates.fxSource}
            </span>
          </ChipRow>
          <ListCard>
            {shown.map((v) => (
              <VehicleRows
                key={v.id}
                v={v}
                isChosen={v.id === chosen?.id}
                data={data}
                scenario={scenario}
                selAct={selAct}
                selPending={selPending}
                optAct={optAct}
                optPending={optPending}
              />
            ))}
            {shown.length === 0 && (
              <div className="text-ink-3 px-4 py-6 text-center text-sm">Žiadne vozidlo v tejto triede.</div>
            )}
          </ListCard>
          {selState && !selState.ok && <Notice tone="bad">{selState.error}</Notice>}
          {optState && !optState.ok && <Notice tone="bad">{optState.error}</Notice>}
          {scenario === 'camper' && (
            <Notice tone="warn">
              September: noci 3–8 °C → kúrenie (Webasto) nutné. Divoké kempovanie je zakázané – noci musia byť
              v kempoch (krok 05). 4 dospelí v jednom camperi = tesné; alternatíva 2× 2-os.
            </Notice>
          )}
        </StepSection>
      )}

      <StepSection title="Čo z toho vyplýva" hint="prepočíta sa samo">
        <ResultsCard
          cells={[
            { label: 'Palivo → krok 03', value: chosen ? fmtEur(chosen.cost.fuel) : '—' },
            { label: 'Krok 05 bude', value: mode ? step5 : '—' },
            {
              label: 'Strava v aute',
              value: mode === 'camper' ? 'kuchynka vždy' : mode === 'car' ? 'podľa ubytovania' : '—',
            },
            { label: 'Na osobu', value: chosen ? fmtEur(chosen.cost.total / pax, { sign: true }) : '—' },
          ]}
        />
      </StepSection>

      <StepFooter
        className="hidden sm:flex"
        secondary={
          canEdit && mode ? (
            <Button variant="ghost" size="sm" onClick={() => setManualOpen(true)}>
              + Vozidlo ručne
            </Button>
          ) : undefined
        }
        primary={
          <ButtonLink
            href={`/cesta/${tripId}?krok=4`}
            className={mode && chosen ? '' : 'pointer-events-none opacity-50'}
            aria-disabled={!(mode && chosen)}
          >
            Pokračovať na 04 Itinerár <ChevronRight size={16} strokeWidth={1.75} />
          </ButtonLink>
        }
      />
      {canEdit && mode && (
        <div className="sm:hidden">
          <Button variant="ghost" size="sm" onClick={() => setManualOpen(true)}>
            + Vozidlo ručne
          </Button>
        </div>
      )}

      <Sheet
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        title="Vozidlo zadané ručne"
        subtitle="ponuka z požičovne, ktorú si našiel sám – hneď sa zvolí"
        footer={
          <>
            <div className="grow" />
            <Button type="submit" form="manual-vehicle" disabled={manPending}>
              {manPending ? 'Ukladám…' : 'Uložiť a zvoliť'}
            </Button>
          </>
        }
      >
        <form id="manual-vehicle" action={manAct} className="divide-line flex flex-col divide-y py-2">
          <input type="hidden" name="tripId" value={tripId} />
          <input type="hidden" name="scenario" value={scenario} />
          <FieldRow label="Model">
            <Input name="name" placeholder="Dacia Jogger" required maxLength={80} />
          </FieldRow>
          <FieldRow label="Požičovňa">
            <Input name="provider" placeholder="Blue Car Rental" required maxLength={60} />
          </FieldRow>
          <FieldRow label="Trieda">
            <Select name="class" defaultValue={scenario === 'camper' ? 'camper4' : 'estate'}>
              {(Object.keys(CLASS_LABEL) as VehicleClass[])
                .filter((c) => (scenario === 'camper') === c.startsWith('camper'))
                .map((c) => (
                  <option key={c} value={c}>
                    {CLASS_LABEL[c]}
                  </option>
                ))}
            </Select>
          </FieldRow>
          <FieldRow label="Cena / deň (€)">
            <Input name="pricePerDay" type="number" min={1} step={1} required className="max-w-[140px]" />
          </FieldRow>
          <FieldRow label="Spotreba l/100 km · palivo">
            <div className="flex gap-2">
              <Input
                name="consumption"
                type="number"
                min={2}
                max={25}
                step={0.1}
                defaultValue={scenario === 'camper' ? 9 : 6.5}
                className="max-w-[110px]"
              />
              <Select
                name="fuel"
                defaultValue={scenario === 'camper' ? 'diesel' : 'petrol'}
                className="max-w-[140px]"
              >
                <option value="petrol">benzín</option>
                <option value="diesel">diesel</option>
              </Select>
            </div>
          </FieldRow>
          <FieldRow label="Miesta">
            <Input
              name="seats"
              type="number"
              min={1}
              max={9}
              defaultValue={scenario === 'camper' ? 4 : 5}
              className="max-w-[90px]"
            />
          </FieldRow>
          <FieldRow label="Odkaz">
            <Input name="url" type="url" placeholder="https://" />
          </FieldRow>
          {manState && !manState.ok && <span className="text-bad-fg py-2 text-[12px]">{manState.error}</span>}
        </form>
      </Sheet>
    </>
  );
}

function VehicleRows({
  v,
  isChosen,
  data,
  scenario,
  selAct,
  selPending,
  optAct,
  optPending,
}: {
  v: VehicleLite;
  isChosen: boolean;
  data: Step03Data;
  scenario: 'car' | 'camper';
  selAct: (fd: FormData) => void;
  selPending: boolean;
  optAct: (fd: FormData) => void;
  optPending: boolean;
}) {
  const { tripId, canEdit, pax, km } = data;
  const sel = data.selection[scenario];
  const insKeys = Object.keys(v.insurance);
  const extraKeys = Object.keys(v.extras);
  const hardChecks = v.checks.filter((c) => c.code !== 'credit_card');
  const meta = [
    `${fmtEur(v.pricePerDay)}/deň`,
    `${v.consumption} l ${fuelLabel(v.fuel)}`,
    v.kind === 'camper' ? `spí ${v.sleeps}` : `${v.seats} miest`,
    v.provider,
    v.kmLimitPerDay ? `limit ${v.kmLimitPerDay} km/d` : 'km bez limitu',
  ].join(' · ');
  return (
    <>
      <ListRow
        leading={<Tile icon={v.kind === 'camper' ? Tent : Car} tone={isChosen ? 'info' : 'mut'} />}
        title={`${v.name} · ${CLASS_LABEL[v.class]}`}
        meta={meta}
        badges={
          <>
            <Tag tone={v.source === 'manual' ? 'ok' : 'mut'}>
              {v.source === 'manual'
                ? 'ručne'
                : `seed${v.verifiedAt ? ` ${v.verifiedAt.slice(5, 7)}/${v.verifiedAt.slice(2, 4)}` : ''}`}
            </Tag>
            {v.fRoadsAllowed && <Tag tone="info">F-cesty</Tag>}
            {v.kind === 'camper' &&
              (v.heater ? <Tag tone="ok">kúrenie</Tag> : <Tag tone="bad">bez kúrenia</Tag>)}
            {hardChecks.length > 0 && <Tag tone="bad">{hardChecks[0].message}</Tag>}
          </>
        }
        amount={fmtEur(v.cost.total)}
        amountSub={`${sel?.days ?? data.days} dní · ${fmtEur(v.cost.total / pax)}/os`}
        selected={isChosen}
        href={v.url ?? undefined}
        action={
          canEdit ? (
            isChosen ? (
              <Button size="sm" variant="secondary" disabled>
                <Check size={14} /> Zvolené
              </Button>
            ) : (
              <form action={selAct}>
                <input type="hidden" name="tripId" value={tripId} />
                <input type="hidden" name="scenario" value={scenario} />
                <input type="hidden" name="vehicleOptionId" value={v.id} />
                <Button type="submit" size="sm" variant="secondary" disabled={selPending}>
                  Zvoliť
                </Button>
              </form>
            )
          ) : undefined
        }
      />
      {isChosen && (
        <>
          <form action={optAct} className="contents">
            <input type="hidden" name="tripId" value={tripId} />
            <input type="hidden" name="scenario" value={scenario} />
            <ListRow
              nested
              leading={<ShieldCheck size={14} strokeWidth={1.8} className="text-ok-fg" />}
              title="Poistenie"
              meta={
                <span className="flex flex-wrap items-center gap-1.5">
                  {insKeys.length === 0 && <span>bez údajov – doplň v ponuke</span>}
                  {insKeys.map((k) => {
                    const ins = v.insurance[k];
                    const checked = ins.included || (sel?.insuranceChosen ?? []).includes(k);
                    return (
                      <label
                        key={k}
                        className={`rounded-tag inline-flex h-[22px] cursor-pointer items-center gap-1 px-2 text-[11px] font-semibold ${checked ? 'bg-ok-bg text-ok-fg' : 'bg-mut-bg text-mut-fg'}`}
                        title={INS_NOTE[k] ?? ins.note ?? ''}
                      >
                        <input
                          type="checkbox"
                          name="insurance"
                          value={k}
                          defaultChecked={checked}
                          disabled={ins.included || !canEdit}
                          onChange={(e) => e.currentTarget.form?.requestSubmit()}
                          className="sr-only"
                        />
                        {INS_LABEL[k] ?? k} {ins.included ? 'v cene' : `${ins.perDay} €/d`}
                      </label>
                    );
                  })}
                  <span className="text-ink-3">· dvere vs. vietor nekryje nič ⚠</span>
                </span>
              }
              amount={fmtEur(v.cost.insurance)}
            />
            {extraKeys.length > 0 && (
              <ListRow
                nested
                leading={<Users size={14} strokeWidth={1.8} className="text-vio-fg" />}
                title="Extras"
                meta={
                  <span className="flex flex-wrap items-center gap-1.5">
                    {extraKeys.map((k) => {
                      const e = v.extras[k];
                      const n = sel?.extrasChosen?.[k] ?? 0;
                      return (
                        <label
                          key={k}
                          className={`rounded-tag inline-flex h-[22px] cursor-pointer items-center gap-1 px-2 text-[11px] font-semibold ${n > 0 ? 'bg-vio-bg text-vio-fg' : 'bg-mut-bg text-mut-fg'}`}
                        >
                          <input
                            type="checkbox"
                            name={`extra.${k}`}
                            value="1"
                            defaultChecked={n > 0}
                            disabled={!canEdit}
                            onChange={(ev) => ev.currentTarget.form?.requestSubmit()}
                            className="sr-only"
                          />
                          {EXTRA_LABEL[k] ?? k} {e.perDay ? `${e.perDay} €/d` : e.flat ? `${e.flat} €` : ''}
                        </label>
                      );
                    })}
                  </span>
                }
                amount={fmtEur(v.cost.extras)}
              />
            )}
            <button type="submit" className="hidden" disabled={optPending} aria-hidden />
          </form>
          <ListRow
            nested
            leading={
              <Check size={14} strokeWidth={1.8} className={v.checks.length ? 'text-bad-fg' : 'text-ok-fg'} />
            }
            title="Požiadavky"
            meta={
              v.checks.length
                ? v.checks.map((c) => c.message).join(' · ')
                : `vodič ≥ ${v.driverMinAge} r. ✓ · prax ≥ ${v.driverMinYears} r. ✓ · ${v.deposit ? `kreditka na depozit ${fmtEur(v.deposit)} ✓` : 'bez depozitu'} · ${v.kmLimitPerDay ? `limit ${v.kmLimitPerDay} km/deň ⚠` : 'km bez limitu ✓'}`
            }
            badges={v.checks.length ? <Tag tone="bad">skontroluj</Tag> : <Tag tone="ok">ok</Tag>}
          />
          <ListRow
            leading={<Tile icon={Fuel} tone="warn" />}
            title="Palivo"
            meta={`${fmtKm(km)} ${data.kmSource === 'itinerary' ? 'z itinerára' : 'z presetu'} × ${sel?.consumptionOverride ?? v.consumption} l/100 km × ${sel?.fuelPriceOverride ?? (v.fuel === 'petrol' ? data.rates.petrol : data.rates.diesel)} ISK/l · +5 % rezerva · ${Math.round(v.cost.liters)} l`}
            badges={<Tag tone="warn">odhad</Tag>}
            amount={fmtEur(v.cost.fuel)}
          />
          {v.cost.tolls > 0 && (
            <ListRow
              leading={<Tile icon={Waypoints} tone="mut" />}
              title="Tunel Vaðlaheiði"
              meta="Ring Road pri Akureyri · platba online do 24 h"
              amount={fmtEur(v.cost.tolls)}
            />
          )}
        </>
      )}
    </>
  );
}
