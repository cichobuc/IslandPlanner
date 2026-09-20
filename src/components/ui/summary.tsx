import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { fmtEur, fmtPerPerson, fmtRange } from '@/lib/format';
import { Card, Label } from './card';
import { Tag } from './tag';
import { sourceTag } from './tone';

export type SummaryColumn = {
  label: string;
  amount: number;
  approx?: boolean;
  source: keyof typeof sourceTag;
};

/**
 * Súhrn „Odhad cesty": suma 34, /os 18, rozsah, štítok „Krok N z 8"; pod tým 4 stĺpce (názov, suma, pôvod) v sivom ráme.
 * Na telefóne je súhrn v hlavičke (PhoneHeader), táto karta sa nezobrazuje.
 */
export function TripSummary({
  total,
  perPerson,
  pax,
  range,
  step,
  columns,
  className,
}: {
  total: number;
  perPerson: number;
  pax: number;
  range?: { min: number; max: number };
  step: number;
  columns: SummaryColumn[];
  className?: string;
}) {
  return (
    <Card className={cn('flex flex-col gap-3 px-5 py-4', className)}>
      <div className="flex items-start gap-[18px]">
        <div className="flex flex-col gap-0.5">
          <Label>
            Odhad cesty · {pax} {pax === 1 ? 'osoba' : pax < 5 ? 'osoby' : 'osôb'}
          </Label>
          <span className="font-display text-[34px] leading-[1.05] font-semibold tabular-nums">{fmtEur(total)}</span>
        </div>
        <div className="flex flex-col gap-0.5 pt-4">
          <span className="font-display text-lg font-semibold tabular-nums">
            {fmtEur(perPerson)} <span className="text-ink-2 font-sans text-[13px] font-medium">/ osoba</span>
          </span>
          {range && <span className="text-ink-3 text-[12px] tabular-nums">rozsah {fmtRange(range.min, range.max)}</span>}
        </div>
        <div className="grow" />
        <Tag tone="info" className="h-[26px] px-2.5 text-[12px]">
          Krok {step} z 8
        </Tag>
      </div>
      <div className="border-line grid grid-cols-2 overflow-hidden rounded-[8px] border bg-[#FAFBFC] sm:grid-cols-4">
        {columns.map((c, i) => (
          <div
            key={c.label}
            className={cn(
              'border-line flex min-w-0 flex-col gap-1 px-3.5 py-2.5',
              i % 2 === 1 && 'border-l',
              i > 0 && 'sm:border-l',
              i >= 2 && 'border-t sm:border-t-0',
            )}
          >
            <span className="text-ink-3 text-[12px]">{c.label}</span>
            <span className="font-display text-[15px] font-semibold whitespace-nowrap tabular-nums">
              {fmtEur(c.amount, { approx: c.approx })}
            </span>
            <span>
              <Tag tone={sourceTag[c.source].tone}>{sourceTag[c.source].label}</Tag>
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Suma kroku vpravo od hlavičky: 22 px + štítok pôvodu. */
export function StepAmount({ amount, source, approx }: { amount: number; source: keyof typeof sourceTag; approx?: boolean }) {
  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <span className="font-display text-[22px] font-semibold whitespace-nowrap tabular-nums">{fmtEur(amount, { approx })}</span>
      <Tag tone={sourceTag[source].tone}>{sourceTag[source].label}</Tag>
    </div>
  );
}

export function PerPerson({ amount, className }: { amount: number; className?: string }) {
  return <span className={cn('text-ink-3 text-[12px] tabular-nums', className)}>{fmtPerPerson(amount)}</span>;
}

export type { ReactNode };
