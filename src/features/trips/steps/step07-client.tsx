'use client';

import { CalendarCheck, ChevronRight, Coffee, CookingPot, Tent, Utensils } from 'lucide-react';
import { useActionState } from 'react';
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
  StepAmount,
  StepFooter,
  StepHead,
  StepSection,
  Tag,
  Tile,
} from '@/components/ui';
import type { FoodDayInput, FoodDayResult, FoodTotal } from '@/engine/food';
import type { FoodInput } from '@/engine/types';
import { fmtEur } from '@/lib/format';
import type { ActionState } from '../actions';
import { setFoodDayLevelAction, updateFoodProfileAction } from '../step0708-actions';

const LEVEL: Record<string, string> = { budget: 'úsporná', mid: 'stredná', comfort: 'komfortná' };
const PART: Record<string, string> = {
  full: 'celý deň',
  from_lunch: 'od obeda',
  from_dinner: 'od večere',
  until_lunch: 'do obeda',
  breakfast_only: 'len raňajky',
  none: 'bez jedla',
};
const DOW = ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So'];
const dm = (iso: string) =>
  iso.startsWith('day-')
    ? `Deň ${iso.slice(4)}`
    : `${DOW[new Date(iso).getUTCDay()]} ${Number(iso.slice(8, 10))}. ${Number(iso.slice(5, 7))}.`;

export function Step07Client({
  tripId,
  pax,
  food,
  days,
  total,
  otherBranch,
  active,
  dates,
  canEdit,
}: {
  tripId: string;
  pax: number;
  food: FoodInput;
  days: (FoodDayInput & { result: FoodDayResult })[];
  total: FoodTotal;
  otherBranch: { key: 'car' | 'camper'; total: number };
  active: 'car' | 'camper';
  dates: string | null;
  canEdit: boolean;
}) {
  const [state, act, pending] = useActionState<ActionState, FormData>(updateFoodProfileAction, null);
  const [, dayAct] = useActionState<ActionState, FormData>(setFoodDayLevelAction, null);
  const kitchenDays = days.filter((d) => d.kitchenMorning || d.kitchenEvening).length;
  const perDay = days.length ? (total.perPerson - total.firstShopPp) / days.length : 0;

  return (
    <>
      <StepHead
        step={7}
        name="Strava"
        question="Ako budeme jesť?"
        lead="Úsporná = varíme si, kde je kuchynka; stredná = občas reštaurácia; komfortná = jeme vonku. Dni s kuchynkou sa berú z nocí, prvý a posledný deň podľa letu."
        aside={<StepAmount amount={total.total} source={food.customPrices ? 'manual' : 'seed'} />}
      />

      <StepSection title="Z predchádzajúcich krokov">
        <ChipRow wrap={false} className="sm:flex-wrap">
          <Chip icon={CalendarCheck} iconClassName="text-accent">
            {days.length} dní{dates ? ` · ${dates}` : ''}
          </Chip>
          <Chip icon={CookingPot} iconClassName="text-ok-fg">
            kuchynka {kitchenDays} z {days.length} dní
          </Chip>
          <Chip icon={Tent} iconClassName="text-ink-3">
            vetva {active === 'camper' ? 'karavan' : 'auto'} (03)
          </Chip>
        </ChipRow>
      </StepSection>

      <StepSection title="Tvoja voľba" hint="uloží sa tlačidlom">
        <form
          action={act}
          className="rounded-card border-card-line bg-card divide-line flex flex-col divide-y border px-4"
        >
          <input type="hidden" name="tripId" value={tripId} />
          <fieldset disabled={!canEdit} className="contents">
            <FieldRow label="Úroveň" hint="úsporná ≈ 18 €/os/deň · stredná ≈ 35 · komfortná ≈ 70">
              <Segmented
                name="level"
                defaultValue={food.level}
                options={[
                  { value: 'budget', label: 'Úsporná' },
                  { value: 'mid', label: 'Stredná' },
                  { value: 'comfort', label: 'Komfortná' },
                ]}
              />
            </FieldRow>
            <FieldRow label="Káva / deň" hint="~ 3 € (600 ISK)">
              <Select
                name="coffeePerDay"
                defaultValue={String(food.coffeePerDay ?? 1)}
                className="max-w-[100px]"
              >
                {[0, 1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </FieldRow>
            <FieldRow label="Alkohol" hint="Vínbúðin ~ 10 €/os/deň; duty free na KEF lacnejšie">
              <Segmented
                name="alcohol"
                defaultValue={food.alcohol ? 'yes' : 'no'}
                options={[
                  { value: 'yes', label: 'Áno' },
                  { value: 'no', label: 'Nie' },
                ]}
              />
            </FieldRow>
            <FieldRow label="Prvý nákup / os. (€)" hint="Bónus/Krónan po prílete; predvolene 22 €">
              <Input
                name="firstShopPp"
                type="number"
                min={0}
                step={1}
                defaultValue={food.firstShopPp ?? ''}
                placeholder="22"
                className="max-w-[120px]"
              />
            </FieldRow>
          </fieldset>
          {canEdit && (
            <div className="flex items-center gap-3 py-3">
              {state?.ok && <span className="text-ok-fg text-[12px]">Uložené.</span>}
              {state && !state.ok && <span className="text-bad-fg text-[12px]">{state.error}</span>}
              <div className="grow" />
              <Button type="submit" variant="secondary" size="sm" disabled={pending}>
                {pending ? 'Ukladám…' : 'Uložiť'}
              </Button>
            </div>
          )}
        </form>
      </StepSection>

      <StepSection title={`Dni · ${days.length}`} hint={`${fmtEur(perDay)}/os/deň priemer`}>
        <ListCard>
          {days.map((d, i) => {
            const r = d.result;
            const override = food.dayOverrides?.[d.date];
            return (
              <ListRow
                key={d.date}
                leading={
                  <span className="font-display bg-mut-bg text-ink-2 grid size-9 place-items-center rounded-[9px] text-[12px] font-semibold">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                }
                title={`Deň ${i + 1} · ${dm(d.date)}`}
                meta={[
                  d.kitchenMorning || d.kitchenEvening
                    ? `kuchynka ${d.kitchenMorning && d.kitchenEvening ? '✓' : d.kitchenMorning ? 'ráno' : 'večer'}`
                    : 'bez kuchynky',
                  `Ra ${r.breakfast} · Ob ${r.lunch} · Ve ${r.dinner} · extra ${r.extras}`,
                  PART[d.part] !== 'celý deň' ? PART[d.part] : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                badges={
                  <>
                    <Tag tone={override ? 'vio' : 'mut'}>{LEVEL[r.level]}</Tag>
                    {!d.kitchenMorning && !d.kitchenEvening && d.part === 'full' && (
                      <Tag tone="warn">bez kuchynky</Tag>
                    )}
                  </>
                }
                amount={fmtEur(r.perPerson * pax)}
                amountSub={`${fmtEur(r.perPerson)}/os`}
                action={
                  canEdit ? (
                    <form action={dayAct}>
                      <input type="hidden" name="tripId" value={tripId} />
                      <input type="hidden" name="date" value={d.date} />
                      <Select
                        name="level"
                        defaultValue={override ?? 'default'}
                        onChange={(e) => e.currentTarget.form?.requestSubmit()}
                        className="h-[34px] w-[120px] px-2 text-[13px]"
                        aria-label="Úroveň dňa"
                      >
                        <option value="default">ako cesta</option>
                        <option value="budget">úsporná</option>
                        <option value="mid">stredná</option>
                        <option value="comfort">reštaurácia</option>
                      </Select>
                    </form>
                  ) : undefined
                }
              />
            );
          })}
          <ListRow
            leading={<Tile icon={Utensils} tone="warn" />}
            title="Prvý nákup"
            meta={`${pax} os. × ${fmtEur(total.firstShopPp)} · Bónus/Krónan po prílete`}
            amount={fmtEur(total.firstShopPp * pax)}
          />
          <ListRow
            leading={<Tile icon={Coffee} tone="warn" />}
            title={`Káva ${food.coffeePerDay ?? 1}×/deň${food.alcohol ? ' · alkohol' : ''}`}
            meta="započítané v extra každého dňa"
            amount=""
          />
        </ListCard>
      </StepSection>

      <StepSection title="Čo z toho vyplýva" hint="ide do 08">
        <ResultsCard
          cells={[
            { label: `Strava · ${pax} os.`, value: fmtEur(total.total) },
            { label: 'Na osobu', value: fmtEur(total.perPerson) },
            { label: 'Na osobu a deň', value: fmtEur(perDay) },
            {
              label: `${otherBranch.key === 'camper' ? 'Karavan' : 'Auto'} by stál`,
              value:
                Math.abs(otherBranch.total - total.total) < 1
                  ? 'rovnako'
                  : `${otherBranch.total > total.total ? '+' : '−'}${fmtEur(Math.abs(otherBranch.total - total.total))}`,
            },
          ]}
        />
      </StepSection>
      {kitchenDays < days.length / 2 && active === 'car' && (
        <Notice tone="info">
          Menej ako polovica nocí má kuchynku – v kroku 05 skús penzióny/Airbnb s kuchynkou, strava klesne o ~
          15 €/os/deň.
        </Notice>
      )}

      <StepFooter
        className="hidden sm:flex"
        primary={
          <ButtonLink href={`/cesta/${tripId}?krok=8`}>
            Pokračovať na 08 Rozpočet <ChevronRight size={16} strokeWidth={1.75} />
          </ButtonLink>
        }
      />
    </>
  );
}
