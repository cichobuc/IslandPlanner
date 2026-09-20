import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { fmtEur, fmtPerPerson, stepNo } from '@/lib/format';
import { Label } from './card';
import { ProgressBar, type StepItem } from './stepper';

/**
 * Rozloženie obrazovky Cesta (v6): pod hlavičkou vľavo Postup (232 px, len ≥ sm), vpravo obsah kroku.
 * Na telefóne je Postup skrytý (otvára sa ako sheet z PhoneHeader) a obsah ide na celú šírku.
 */
export function TripLayout({ aside, children, className }: { aside: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto flex w-full max-w-[1180px] gap-5 px-4 py-4 sm:px-6 sm:py-5', className)}>
      <aside className="hidden w-[232px] shrink-0 flex-col gap-3.5 sm:flex">{aside}</aside>
      <main className="flex min-w-0 grow flex-col gap-[18px]">{children}</main>
    </div>
  );
}

/** iPhone hlavička kroku: progres pásik + „Krok 03 · Doprava · 3 z 8" + suma. Zobrazuje sa len < sm. */
export function PhoneHeader({
  steps,
  step,
  name,
  total,
  perPerson,
  className,
}: {
  steps: StepItem[];
  step: number;
  name: string;
  total: number;
  perPerson: number;
  className?: string;
}) {
  return (
    <div className={cn('border-card-line bg-card flex flex-col gap-2.5 border-b px-4 pt-2.5 pb-2.5 sm:hidden', className)}>
      <ProgressBar steps={steps} />
      <div className="flex items-center gap-2.5">
        <Label className="text-accent">
          Krok {stepNo(step)} · {name}
        </Label>
        <span className="text-ink-3 text-[12px]">
          {step} z {steps.length}
        </span>
        <div className="grow" />
        <span className="font-display text-base font-semibold tabular-nums">{fmtEur(total)}</span>
        <span className="text-ink-3 text-[12px] tabular-nums">{fmtPerPerson(perPerson)}</span>
      </div>
    </div>
  );
}

/** iPhone sticky spodná lišta [Mapa][Pokračovať]. Skrytá ≥ sm (tam je StepFooter). */
export function StickyBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'border-card-line bg-card fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:hidden',
        className,
      )}
    >
      {children}
    </div>
  );
}
