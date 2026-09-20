import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'ok' | 'info' | 'warn' | 'bad' | 'mut';
const tones: Record<Tone, string> = {
  ok: 'bg-ok-bg text-ok-fg',
  info: 'bg-info-bg text-info-fg',
  warn: 'bg-warn-bg text-warn-fg',
  bad: 'bg-bad-bg text-bad-fg',
  mut: 'bg-mut-bg text-mut-fg',
};

/** Stavový blok – svetlý podklad + tmavý text (štítky v docs/06). */
export function Notice({
  tone = 'info',
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('rounded-chip px-3 py-2.5 text-[13px]', tones[tone], className)}>{children}</div>;
}
