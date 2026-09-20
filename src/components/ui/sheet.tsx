'use client';

import { X, type LucideIcon } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Button } from './button';
import { Label } from './card';
import { Tile } from './tile';
import type { Tone } from './tone';

/**
 * Sheet – detail riadku / nastavenia. Na telefóne a tablete zdola (radius 14 hore, jediný tieň v systéme),
 * na širokých obrazovkách (≥ 1024) ako pravý panel 420 px. Zhora: dlaždica · názov · meta · zatvoriť; dole: akcie.
 */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  icon,
  tone = 'info',
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:justify-end" role="presentation">
      <button type="button" aria-label="Zavrieť" onClick={onClose} className="absolute inset-0 bg-[#0B1220]/20" />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'bg-card border-card-line relative flex max-h-[92dvh] w-full flex-col border',
          'rounded-t-[14px] border-b-0 shadow-[var(--shadow-sheet)]',
          'lg:h-dvh lg:max-h-none lg:w-[420px] lg:rounded-none lg:border-t-0 lg:border-r-0 lg:border-b-0 lg:shadow-[var(--shadow-sheet-side)]',
          className,
        )}
      >
        <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-[#DDE3EA] lg:hidden" aria-hidden />
        <div className="border-line flex items-center gap-3.5 border-b px-5 pt-3 pb-3 lg:pt-4">
          {icon && <Tile icon={icon} size={40} tone={tone} />}
          <div className="flex min-w-0 flex-col gap-[3px]">
            <span className="font-display truncate text-xl font-semibold">{title}</span>
            {subtitle && <span className="text-ink-2 flex items-center gap-2 text-[12px]">{subtitle}</span>}
          </div>
          <div className="grow" />
          <Button variant="ghost" size="sm" icon aria-label="Zavrieť" onClick={onClose}>
            <X size={18} strokeWidth={1.75} className="text-ink-2" />
          </Button>
        </div>
        <div className="flex grow flex-col overflow-y-auto px-5">{children}</div>
        {footer && <div className="border-line flex flex-wrap items-center gap-1.5 border-t px-5 pt-3 pb-5 lg:pb-4">{footer}</div>}
      </div>
    </div>
  );
}

/** Riadok sheetu „POPISOK – hodnota" (110 px popisok, 14 px text). */
export function SheetRow({ label, children, last = false }: { label: string; children: ReactNode; last?: boolean }) {
  return (
    <div className={cn('grid grid-cols-[96px_minmax(0,1fr)] gap-4 py-2.5 text-sm sm:grid-cols-[110px_minmax(0,1fr)]', !last && 'border-line border-b')}>
      <Label className="pt-0.5">{label}</Label>
      <span>{children}</span>
    </div>
  );
}
