'use client';

import { Minus, Plus, UserPlus } from 'lucide-react';
import { useActionState, useState, type ReactNode } from 'react';
import {
  Avatar,
  Button,
  ChipGroup,
  FieldRow,
  Input,
  ListRow,
  Segmented,
  Select,
  Sheet,
  Tag,
} from '@/components/ui';
import type { Bags, InterestKey } from '@/engine/types';
import { INTEREST_KEYS } from '@/engine/types';
import type { ActionState } from '../actions';
import {
  removeTravelerAction,
  toggleAirportAction,
  updateTripSettingsAction,
  upsertTravelerAction,
} from '../step01-actions';

export type TravelerRow = {
  id: string;
  name: string;
  birthDate: string | null;
  ageFallback: number | null;
  userId: string | null;
  isDriver: boolean;
  driverSince: string | null;
  hasCreditCard: boolean;
  bags: Bags;
  sharesBagsWith: string | null;
  dietNote: string | null;
};

const yn = (b: boolean | null | undefined) => (b ? 'yes' : 'no') as 'yes' | 'no';

/** Stepper 0–4 pre batožinu (skrytý input pre FormData). */
function NumberStepper({
  name,
  label,
  defaultValue = 0,
  max = 4,
}: {
  name: string;
  label: string;
  defaultValue?: number;
  max?: number;
}) {
  const [v, setV] = useState(defaultValue);
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm">{label}</span>
      <span className="flex items-center gap-1">
        <input type="hidden" name={name} value={v} />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          icon
          aria-label={`${label} −`}
          onClick={() => setV((x) => Math.max(0, x - 1))}
        >
          <Minus size={14} />
        </Button>
        <span className="font-display w-6 text-center text-sm font-semibold tabular-nums">{v}</span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          icon
          aria-label={`${label} +`}
          onClick={() => setV((x) => Math.min(max, x + 1))}
        >
          <Plus size={14} />
        </Button>
      </span>
    </div>
  );
}

/** Sheet Cestujúci – nový alebo úprava; `trigger` je prvok, ktorý ho otvorí. */
export function TravelerSheet({
  tripId,
  traveler,
  others,
  trigger,
  canEdit,
}: {
  tripId: string;
  traveler?: TravelerRow;
  others: { id: string; name: string }[];
  trigger: (open: () => void) => ReactNode;
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const r = await upsertTravelerAction(prev, fd);
    if (r?.ok) setOpen(false);
    return r;
  }, null);
  const [removeState, removeAct, removing] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const r = await removeTravelerAction(prev, fd);
    if (r?.ok) setOpen(false);
    return r;
  }, null);
  const isNew = !traveler;
  const sinceYear = traveler?.driverSince ? Number(traveler.driverSince.slice(0, 4)) : '';
  const formId = `traveler-${traveler?.id ?? 'new'}`;

  return (
    <>
      {trigger(() => setOpen(true))}
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={isNew ? 'Nový cestujúci' : traveler.name}
        subtitle={
          traveler?.userId ? <Tag tone="info">člen cesty · z profilu</Tag> : <Tag tone="mut">ručne</Tag>
        }
        footer={
          canEdit ? (
            <>
              {!isNew && !traveler.userId && (
                <form action={removeAct}>
                  <input type="hidden" name="tripId" value={tripId} />
                  <input type="hidden" name="travelerId" value={traveler.id} />
                  <Button type="submit" variant="ghost" size="sm" disabled={removing}>
                    Odobrať
                  </Button>
                </form>
              )}
              <div className="grow" />
              <Button type="submit" form={formId} disabled={pending}>
                {pending ? 'Ukladám…' : 'Uložiť'}
              </Button>
            </>
          ) : undefined
        }
      >
        <form id={formId} action={action} className="divide-line flex flex-col divide-y py-2">
          <input type="hidden" name="tripId" value={tripId} />
          {traveler && <input type="hidden" name="travelerId" value={traveler.id} />}
          <fieldset disabled={!canEdit} className="contents">
            <FieldRow label="Meno">
              <Input name="name" defaultValue={traveler?.name ?? ''} required maxLength={60} />
            </FieldRow>
            <FieldRow label="Dátum narodenia" hint="vek na vstupné a letenky; ak nevieš, zadaj vek">
              <div className="flex gap-2">
                <Input
                  name="birthDate"
                  type="date"
                  defaultValue={traveler?.birthDate ?? ''}
                  className="max-w-[190px]"
                />
                <Input
                  name="ageFallback"
                  type="number"
                  min={0}
                  max={110}
                  placeholder="vek"
                  defaultValue={traveler?.ageFallback ?? ''}
                  className="max-w-[90px]"
                />
              </div>
            </FieldRow>
            <FieldRow label="Vodič" hint="≥ 20 r. auto, ≥ 23 r. 4×4/karavan, prax ≥ 1 rok">
              <div className="flex flex-wrap items-center gap-2">
                <Segmented
                  name="isDriver"
                  defaultValue={yn(traveler?.isDriver)}
                  options={[
                    { value: 'yes', label: 'Áno' },
                    { value: 'no', label: 'Nie' },
                  ]}
                />
                <Input
                  name="driverSinceYear"
                  type="number"
                  min={1950}
                  max={2030}
                  placeholder="vodičák od (rok)"
                  defaultValue={sinceYear}
                  className="max-w-[170px]"
                />
              </div>
            </FieldRow>
            <FieldRow label="Kreditná karta" hint="na depozit požičovne (nie debetná)">
              <Segmented
                name="hasCreditCard"
                defaultValue={yn(traveler?.hasCreditCard)}
                options={[
                  { value: 'yes', label: 'Mám' },
                  { value: 'no', label: 'Nemám' },
                ]}
              />
            </FieldRow>
            <div className="py-3">
              <div className="text-sm font-medium">Batožina</div>
              <div className="text-ink-3 mb-1 text-[12px]">podaný kufor sa dá zdieľať vo dvojici</div>
              <NumberStepper
                name="cabinSmall"
                label="Malá príručná (pod sedadlo)"
                defaultValue={traveler?.bags.cabinSmall ?? 1}
              />
              <NumberStepper
                name="cabin10"
                label="Príručná 10 kg"
                defaultValue={traveler?.bags.cabin10 ?? 0}
              />
              <NumberStepper
                name="checked20"
                label="Podaná 20 kg"
                defaultValue={traveler?.bags.checked20 ?? 0}
              />
              <NumberStepper
                name="checked32"
                label="Podaná 32 kg"
                defaultValue={traveler?.bags.checked32 ?? 0}
              />
            </div>
            <FieldRow label="Kufor zdieľa s" hint="dvojica na podanú batožinu">
              <Select name="sharesBagsWith" defaultValue={traveler?.sharesBagsWith ?? ''}>
                <option value="">nikto</option>
                {others.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </Select>
            </FieldRow>
            <FieldRow label="Poznámka" hint="strava, zdravie, dron…">
              <Input name="dietNote" defaultValue={traveler?.dietNote ?? ''} maxLength={200} />
            </FieldRow>
          </fieldset>
          {state && !state.ok && <span className="text-bad-fg py-2 text-[12px]">{state.error}</span>}
          {removeState && !removeState.ok && (
            <span className="text-bad-fg py-2 text-[12px]">{removeState.error}</span>
          )}
        </form>
      </Sheet>
    </>
  );
}

export function AddTravelerButton(props: { tripId: string; others: { id: string; name: string }[] }) {
  return (
    <TravelerSheet
      {...props}
      canEdit
      trigger={(open) => (
        <Button variant="ghost" size="sm" onClick={open}>
          <UserPlus size={15} strokeWidth={1.8} /> Cestujúci
        </Button>
      )}
    />
  );
}

/** Prepínač letiska v riadku. */
export function AirportToggle({
  tripId,
  iata,
  on,
  disabled,
}: {
  tripId: string;
  iata: string;
  on: boolean;
  disabled?: boolean;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(toggleAirportAction, null);
  return (
    <form action={action} title={state && !state.ok ? state.error : undefined}>
      <input type="hidden" name="tripId" value={tripId} />
      <input type="hidden" name="iata" value={iata} />
      <input type="hidden" name="on" value={on ? '0' : '1'} />
      <Button
        type="submit"
        variant="secondary"
        size="sm"
        disabled={disabled || pending}
        aria-pressed={on}
        className={on ? 'border-accent-line bg-accent-soft text-accent' : ''}
      >
        {on ? '✓ Zapnuté' : 'Vypnuté'}
      </Button>
    </form>
  );
}

const INTEREST_LABELS: Record<InterestKey, string> = {
  thermal: 'Termály',
  glacier: 'Ľadovce',
  puffin: 'Puffiny',
  whale: 'Veľryby',
  aurora: 'Polárna žiara',
  hike: 'Túry',
  lava: 'Láva',
  culture: 'Kultúra',
  photo: 'Foto',
  drone: 'Dron',
};

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

/** Sekcia „Kedy a ako" – jeden formulár, uloží sa tlačidlom. */
export function SettingsForm({
  tripId,
  targetMonth,
  minDays,
  maxDays,
  allowSelfTransfer,
  pace,
  interests,
  budgetTargetPp,
  canEdit,
}: {
  tripId: string;
  targetMonth: string; // YYYY-MM
  minDays: number;
  maxDays: number;
  allowSelfTransfer: boolean;
  pace: 'relaxed' | 'normal' | 'intense';
  interests: string[];
  budgetTargetPp: number | null;
  canEdit: boolean;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateTripSettingsAction, null);
  const [ym, setYm] = useState(targetMonth);
  const [y, m] = ym.split('-').map(Number);
  const shift = (d: number) => {
    const t = new Date(Date.UTC(y, m - 1 + d, 1));
    setYm(`${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}`);
  };
  return (
    <form
      action={action}
      className="rounded-card border-card-line bg-card divide-line flex flex-col divide-y border px-4"
    >
      <input type="hidden" name="tripId" value={tripId} />
      <fieldset disabled={!canEdit} className="contents">
        <FieldRow label="Mesiac" hint="návrh ideálneho mesiaca príde v 1.1">
          <div className="flex items-center gap-2">
            <input type="hidden" name="targetMonth" value={ym} />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon
              aria-label="Predchádzajúci mesiac"
              onClick={() => shift(-1)}
            >
              ‹
            </Button>
            <span className="font-display min-w-[150px] text-center text-sm font-semibold">
              {MONTHS[m - 1]} {y}
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon
              aria-label="Ďalší mesiac"
              onClick={() => shift(1)}
            >
              ›
            </Button>
          </div>
        </FieldRow>
        <FieldRow label="Dĺžka pobytu" hint="dni vrátane letov, 3–21">
          <div className="flex items-center gap-2">
            <Input
              name="minDays"
              type="number"
              min={3}
              max={21}
              defaultValue={minDays}
              className="max-w-[80px]"
            />
            <span className="text-ink-3">–</span>
            <Input
              name="maxDays"
              type="number"
              min={3}
              max={21}
              defaultValue={maxDays}
              className="max-w-[80px]"
            />
            <span className="text-ink-3 text-[12px]">dní</span>
          </div>
        </FieldRow>
        <FieldRow
          label="Prestupy"
          hint="self-transfer cez hub (STN, LTN, BER, DUB) s vlastnou zodpovednosťou"
        >
          <Segmented
            name="allowSelfTransfer"
            defaultValue={allowSelfTransfer ? 'yes' : 'no'}
            options={[
              { value: 'yes', label: 'Priame aj s prestupom' },
              { value: 'no', label: 'Len priame' },
            ]}
          />
        </FieldRow>
        <FieldRow label="Tempo" hint="koľko km a zastávok za deň">
          <Segmented
            name="pace"
            defaultValue={pace}
            options={[
              { value: 'relaxed', label: 'Pokojné' },
              { value: 'normal', label: 'Normálne' },
              { value: 'intense', label: 'Intenzívne' },
            ]}
          />
        </FieldRow>
        <FieldRow label="Záujmy" hint="váhy pri výbere zastávok">
          <ChipGroup
            name="interests"
            defaultValues={interests as InterestKey[]}
            options={INTEREST_KEYS.map((k) => ({ value: k, label: INTEREST_LABELS[k] }))}
          />
        </FieldRow>
        <FieldRow label="Cieľový rozpočet / os." hint="voliteľné; krok 08 ukáže odchýlku">
          <Input
            name="budgetTargetPp"
            type="number"
            min={0}
            step={10}
            placeholder="1 200"
            defaultValue={budgetTargetPp ?? ''}
            className="max-w-[140px]"
          />
        </FieldRow>
      </fieldset>
      {canEdit && (
        <div className="flex items-center gap-3 py-3">
          {state?.ok && <span className="text-ok-fg text-[12px]">Uložené.</span>}
          {state && !state.ok && <span className="text-bad-fg text-[12px]">{state.error}</span>}
          <div className="grow" />
          <Button type="submit" variant="secondary" size="sm" disabled={pending}>
            {pending ? 'Ukladám…' : 'Uložiť nastavenia'}
          </Button>
        </div>
      )}
    </form>
  );
}

/** Riadok cestujúceho (klient): ListRow + sheet; props sú serializovateľné (server → klient). */
export function TravelerRowItem({
  tripId,
  traveler,
  others,
  canEdit,
  index,
  meta,
  flags,
}: {
  tripId: string;
  traveler: TravelerRow;
  others: { id: string; name: string }[];
  canEdit: boolean;
  index: number;
  meta: string;
  flags: { youngDriver: boolean; noCard: boolean };
}) {
  return (
    <TravelerSheet
      tripId={tripId}
      traveler={traveler}
      others={others}
      canEdit={canEdit}
      trigger={(open) => (
        <ListRow
          leading={<Avatar name={traveler.name} index={index} size={36} />}
          title={traveler.name}
          meta={meta}
          badges={
            <>
              {traveler.userId ? <Tag tone="info">člen</Tag> : <Tag tone="mut">ručne</Tag>}
              {flags.youngDriver && <Tag tone="bad">vodič &lt; 20 r.</Tag>}
              {flags.noCard && <Tag tone="warn">bez kreditky</Tag>}
            </>
          }
          onOpen={open}
        />
      )}
    />
  );
}
