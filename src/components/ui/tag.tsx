import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { toneBg, type Tone } from './tone';

/** Štítok 22 px, radius 6 – pôvod ceny, stav riadku. */
export function Tag({ tone = 'mut', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'rounded-tag inline-flex h-[22px] items-center px-2 text-[11px] font-semibold tracking-[.02em] whitespace-nowrap',
        toneBg[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
