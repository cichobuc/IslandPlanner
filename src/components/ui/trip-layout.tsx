'use client';

import { ChevronDown, ChevronLeft } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { fmtEur, fmtPerPerson, stepNo } from '@/lib/format';
import { Label } from './card';
import { Sheet } from './sheet';
import { ProgressBar, Stepper, type StepItem } from './stepper';

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

/**
 * iPhone hlavička kroku: progres pásik + „Krok 03 · Doprava ▾ · 3 z 8" + suma. Zobrazuje sa len < sm.
 * Klik na názov kroku otvorí Postup ako sheet (docs/obrazovky/00-vzor: „postup ako sheet z hlavičky").
 */
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
  const [open, setOpen] = useState(false);
  return (
    <div className={cn('border-card-line bg-card flex flex-col gap-2.5 border-b px-4 pt-2.5 pb-2.5 sm:hidden', className)}>
      <ProgressBar steps={steps} />
      <div className="flex items-center gap-2.5">
        <button type="button" onClick={() => setOpen(true)} className="flex cursor-pointer items-center gap-1" aria-haspopup="dialog" aria-label="Otvoriť postup">
          <Label className="text-accent">
            Krok {stepNo(step)} · {name}
          </Label>
          <ChevronDown size={14} strokeWidth={2} className="text-accent" aria-hidden />
        </button>
        <span className="text-ink-3 text-[12px]">
          {step} z {steps.length}
        </span>
        <div className="grow" />
        {total > 0 && (
          <>
            <span className="font-display text-base font-semibold tabular-nums">{fmtEur(total)}</span>
            <span className="text-ink-3 text-[12px] tabular-nums">{fmtPerPerson(perPerson)}</span>
          </>
        )}
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} title="Postup" subtitle={`${steps.filter((s) => s.state === 'done').length} z ${steps.length} hotových`}>
        <div className="-mx-5 py-2" onClick={() => setOpen(false)}>
          <Stepper steps={steps} className="rounded-none border-0 [&>span:first-child]:hidden" />
        </div>
      </Sheet>
    </div>
  );
}

/** iPhone sticky spodná lišta: [‹ späť][Mapa][Pokračovať]. Skrytá ≥ sm (tam je StepFooter). */
export function StickyBar({ backHref, children, className }: { backHref?: string; children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'border-card-line bg-card fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:hidden',
        className,
      )}
    >
      {backHref && (
        <Link href={backHref} aria-label="Predchádzajúci krok" className="rounded-btn border-card-line bg-card text-ink inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center border">
          <ChevronLeft size={18} strokeWidth={1.75} />
        </Link>
      )}
      {children}
    </div>
  );
}
