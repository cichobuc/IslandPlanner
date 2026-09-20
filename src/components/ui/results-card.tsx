import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type ResultCell = { label: ReactNode; value: ReactNode };

/** „Čo z toho vyplýva" – karta so stĺpcami (popisok + hodnota) oddelenými linkami; na telefóne 2 v rade. */
export function ResultsCard({ cells, className }: { cells: ResultCell[]; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-card border-card-line bg-card grid overflow-hidden border',
        cells.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4',
        className,
      )}
    >
      {cells.map((c, i) => (
        <div
          key={i}
          className={cn(
            'border-line flex min-w-0 flex-col gap-[3px] px-4 py-3',
            i > 0 && 'sm:border-l',
            i % 2 === 1 && 'border-l sm:border-l',
            i >= 2 && 'border-t sm:border-t-0',
          )}
        >
          <span className="text-ink-3 text-[12px]">{c.label}</span>
          <span className="font-display truncate text-base font-semibold tabular-nums">{c.value}</span>
        </div>
      ))}
    </div>
  );
}
