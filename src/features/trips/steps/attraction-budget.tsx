'use client';

import { useActionState, useState } from 'react';
import { Button, Card, Chip, Input, Notice, Tag } from '@/components/ui';
import { ATTRACTION_BUDGET, type AttractionBudgetLevel } from '@/engine/itinerary';
import { cn } from '@/lib/cn';
import { fmtEur } from '@/lib/format';
import type { ActionState } from '../actions';
import { setAttractionBudgetAction } from '../step05-actions';

export type AttractionBudgetState = {
  level: AttractionBudgetLevel;
  /** vlastný limit € na osobu za cestu (má prednosť pred úrovňou) */
  ppEur: number | null;
  splurge: boolean;
};

/** Účinný limit na osobu za cestu: vlastné číslo, inak úroveň × dni (bez limitu = null). */
export function attractionLimitPp(b: AttractionBudgetState, days: number): number | null {
  if (b.ppEur != null) return b.ppEur;
  const l = ATTRACTION_BUDGET[b.level].ppPerDayEur;
  return l == null ? null : l * Math.max(1, days);
}

/**
 * Atrakcie – koľko míňať (ADR-015/016): chipy = predvoľby, pole = vlastný mešec € na osobu za celú cestu,
 * prepínač 5★ zážitku a priebeh „v pláne vs. limit“. Rovnaký panel v kroku 04 (pred generovaním) aj 06.
 */
export function AttractionBudgetPanel({
  tripId,
  budget,
  days,
  pax,
  spentGroup,
  canEdit,
  hint,
  compact = false,
}: {
  tripId: string;
  budget: AttractionBudgetState;
  days: number;
  pax: number;
  /** vstupné + parkovné v pláne, skupina */
  spentGroup: number;
  canEdit: boolean;
  hint?: string;
  /** zbalený riadok (krok 04): úroveň · v pláne vs. limit · Upraviť */
  compact?: boolean;
}) {
  const [state, act, pending] = useActionState<ActionState, FormData>(setAttractionBudgetAction, null);
  const [open, setOpen] = useState(!compact);
  const [draft, setDraft] = useState(budget.ppEur != null ? String(budget.ppEur) : '');
  const limit = attractionLimitPp(budget, days);
  const spentPp = spentGroup / Math.max(1, pax);
  const ratio = limit == null ? 0 : limit === 0 ? (spentPp > 0 ? 1 : 0) : Math.min(1, spentPp / limit);
  const over = limit != null && spentPp > limit + 0.5;
  const nDays = Math.max(1, days);

  const levelLabel =
    budget.ppEur != null ? `vlastný limit ${fmtEur(budget.ppEur)}/os` : ATTRACTION_BUDGET[budget.level].labelSk;
  if (!open)
    return (
      <Card className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5">
        <span className="text-ink-3 text-[12px]">Atrakcie</span>
        <span className="text-[13px] font-medium">{levelLabel}</span>
        <span className="text-ink-2 text-[13px]">
          v pláne {fmtEur(Math.round(spentPp))}/os{limit != null ? ` z ${fmtEur(limit)}` : ''}
        </span>
        {limit != null && (
          <span className="bg-line h-1.5 w-[120px] overflow-hidden rounded-[3px]">
            <span className={cn('block h-full rounded-[3px]', over ? 'bg-warn-fg' : 'bg-accent')} style={{ width: `${Math.round(ratio * 100)}%` }} />
          </span>
        )}
        {over && <Tag tone="warn">nad limit</Tag>}
        <span className="grow" />
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(true)}>
          Upraviť limit
        </Button>
      </Card>
    );

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(ATTRACTION_BUDGET) as AttractionBudgetLevel[]).map((k) => (
          <form key={k} action={act} className="contents">
            <input type="hidden" name="tripId" value={tripId} />
            <input type="hidden" name="level" value={k} />
            <Chip on={budget.ppEur == null && budget.level === k} type="submit" disabled={!canEdit || pending}>
              {ATTRACTION_BUDGET[k].labelSk}
            </Chip>
          </form>
        ))}
        <span className="text-ink-3 text-[12px]">alebo</span>
        <form action={act} className="flex items-center gap-1.5">
          <input type="hidden" name="tripId" value={tripId} />
          <span className="inline-block w-[88px] shrink-0">
            <Input
              name="ppEur"
              inputMode="numeric"
              placeholder="napr. 250"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={!canEdit}
              aria-label="Vlastný limit € na osobu za cestu"
              className={cn('h-8 px-2 text-[13px]', budget.ppEur != null && 'border-accent-line bg-accent-soft')}
            />
          </span>
          <span className="text-ink-2 text-[13px] whitespace-nowrap">€/os na celú cestu</span>
          {draft && (
            <span className="text-ink-3 text-[12px] whitespace-nowrap">
              ≈ {Math.round(Number(draft.replace(',', '.')) / nDays)} €/os/deň
            </span>
          )}
          {canEdit && (
            <Button type="submit" size="sm" variant="secondary" disabled={pending}>
              Uložiť
            </Button>
          )}
        </form>
        <form action={act} className="ml-auto">
          <input type="hidden" name="tripId" value={tripId} />
          <input type="hidden" name="splurge" value={budget.splurge ? 'off' : 'on'} />
          <Chip on={budget.splurge} type="submit" disabled={!canEdit || pending || limit === 0}>
            jeden 5★ zážitok smie limit prekročiť
          </Chip>
        </form>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[13px]">
          <span className="text-ink font-medium">
            V pláne {fmtEur(Math.round(spentPp))}/os · {fmtEur(Math.round(spentGroup))} spolu
          </span>
          {limit == null ? (
            <span className="text-ink-3">bez limitu</span>
          ) : (
            <span className="text-ink-3">
              limit {fmtEur(limit)}/os · {fmtEur(limit * pax)} spolu
            </span>
          )}
          {limit != null &&
            (over ? (
              <Tag tone="warn">o {fmtEur(Math.round(spentPp - limit))}/os nad limit</Tag>
            ) : (
              <Tag tone="ok">v limite · zostáva {fmtEur(Math.round(limit - spentPp))}/os</Tag>
            ))}
        </div>
        {limit != null && (
          <div className="bg-line h-1.5 w-full overflow-hidden rounded-[3px]" role="progressbar" aria-valuenow={Math.round(ratio * 100)}>
            <div
              className={cn('h-full rounded-[3px]', over ? 'bg-warn-fg' : 'bg-accent')}
              style={{ width: `${Math.round(ratio * 100)}%` }}
            />
          </div>
        )}
        <div className="text-ink-3 text-[12px]">
          {hint ??
            'Mešec = limit × osoby; generátor si ho rozloží na celú cestu (drahé miesto musí byť o toľko lepšie, o koľko je drahšie). Zmena limitu platí pri ďalšom Generovať; v kroku 06 sa dá vymeniť za lacnejšie alebo vyradiť.'}
        </div>
      </div>
      {state && !state.ok && <Notice tone="bad">{state.error}</Notice>}
      {compact && (
        <div className="flex justify-end">
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Zbaliť
          </Button>
        </div>
      )}
    </Card>
  );
}
