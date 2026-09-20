import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { stepNo } from '@/lib/format';
import { Label } from './card';

/** Hlavička kroku: `KROK 03 · DOPRAVA`, otázka ako H1 (26 / 22 na telefóne), 1–2 vety, vpravo suma kroku. */
export function StepHead({
  step,
  name,
  question,
  lead,
  aside,
  className,
}: {
  step: number;
  name: string;
  question: string;
  lead?: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start gap-4', className)}>
      <div className="flex min-w-0 grow flex-col gap-1.5">
        <Label className="text-accent hidden sm:inline">
          Krok {stepNo(step)} · {name}
        </Label>
        <h1 className="font-display m-0 text-[22px] leading-[1.15] font-semibold sm:text-[26px]">{question}</h1>
        {lead && <p className="text-ink-2 m-0 max-w-[520px] text-sm leading-[1.5]">{lead}</p>}
      </div>
      {aside && <div className="hidden pt-[22px] sm:block">{aside}</div>}
    </div>
  );
}

/** Päta kroku: sekundárne vľavo (ghost), jedno primárne vpravo. Na telefóne ju nahrádza sticky lišta. */
export function StepFooter({ secondary, primary, className }: { secondary?: ReactNode; primary: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center gap-1.5 pt-1.5', className)}>
      {secondary}
      <div className="grow" />
      {primary}
    </div>
  );
}
