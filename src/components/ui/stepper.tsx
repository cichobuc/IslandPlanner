import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Card, Label } from './card';

export type StepState = 'done' | 'active' | 'pending' | 'problem';
export type StepItem = { n: number; name: string; summary: string; state: StepState; href?: string };

/**
 * Postup (ľavý stĺpec, 232 px): 8 riadkov s číslom/fajkou, názvom a 1-riadkovým zhrnutím.
 * hotové = zelená fajka · aktívne = modré pozadie · čakajúce = 55 % opacity · problém = červený okraj čísla.
 */
export function Stepper({ steps, onSelect, className }: { steps: StepItem[]; onSelect?: (n: number) => void; className?: string }) {
  return (
    <Card className={cn('flex flex-col gap-0.5 p-2', className)}>
      <Label className="px-3 pt-1.5 pb-1">Postup</Label>
      {steps.map((s) => {
        const inner = (
          <>
            <span
              className={cn(
                'font-display box-border flex size-[26px] items-center justify-center rounded-full border-[1.5px] text-[12px] font-semibold',
                s.state === 'done' && 'border-ok-fg bg-ok-fg text-white',
                s.state === 'active' && 'border-accent bg-accent text-white',
                s.state === 'pending' && 'border-[#C9D2DD] bg-white text-[#6B7684]',
                s.state === 'problem' && 'border-bad-fg bg-white text-bad-fg',
              )}
            >
              {s.state === 'done' ? <Check size={13} strokeWidth={2} aria-hidden /> : s.n}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[13px] font-semibold">{s.name}</span>
              <span className="text-ink-3 truncate text-[12px]">{s.summary}</span>
            </span>
          </>
        );
        const cls = cn(
          'grid w-full grid-cols-[26px_minmax(0,1fr)] items-start gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-ink',
          s.state === 'active' && 'bg-accent-soft',
          s.state === 'pending' && 'opacity-55',
          (onSelect || s.href) && 'cursor-pointer hover:bg-mut-bg',
        );
        return s.href ? (
          <a key={s.n} href={s.href} aria-current={s.state === 'active' ? 'step' : undefined} className={cls}>
            {inner}
          </a>
        ) : (
          <button
            key={s.n}
            type="button"
            aria-current={s.state === 'active' ? 'step' : undefined}
            onClick={onSelect ? () => onSelect(s.n) : undefined}
            className={cls}
          >
            {inner}
          </button>
        );
      })}
    </Card>
  );
}

/** iPhone: 8-dielny progres pásik (hotové zelené, aktívny modrý, ostatné sivé). */
export function ProgressBar({ steps, className }: { steps: Pick<StepItem, 'state'>[]; className?: string }) {
  return (
    <div className={cn('flex gap-1.5', className)} role="progressbar" aria-valuemin={1} aria-valuemax={steps.length}>
      {steps.map((s, i) => (
        <span
          key={i}
          className={cn(
            'h-1 grow rounded-[2px]',
            s.state === 'done' ? 'bg-ok-fg' : s.state === 'active' ? 'bg-accent' : 'bg-[#DDE3EA]',
          )}
        />
      ))}
    </div>
  );
}
