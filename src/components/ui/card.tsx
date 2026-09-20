import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/** Biela karta 1 px `#E4E8EE`, radius 12. Žiadne tiene. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-card border-card-line bg-card border', className)} {...props} />;
}

/** Popisok 11 px uppercase, tracking .08em. */
export function Label({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn('text-[11px] font-semibold tracking-[.08em] text-[#6B7684] uppercase', className)} {...props} />
  );
}

/** Hlavička sekcie kroku: popisok + voliteľná poznámka vpravo („tu rozhoduješ", „prepočíta sa samo"). */
export function SectionHead({ title, hint, className }: { title: string; hint?: string; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <Label>{title}</Label>
      {hint && <span className="text-ink-3 text-[12px]">{hint}</span>}
    </div>
  );
}

/** Sekcia kroku (Z predchádzajúcich krokov · Tvoja voľba · Čo z toho vyplýva): hlavička + obsah. */
export function StepSection({ title, hint, children, className }: { title: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('flex flex-col gap-2.5', className)}>
      <SectionHead title={title} hint={hint} />
      {children}
    </section>
  );
}
