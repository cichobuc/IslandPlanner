'use client';

import { X } from 'lucide-react';
import { useEffect } from 'react';
import { cn } from '@/lib/cn';

/** DiffToast – čo kaskáda zmenila (docs/05): karta dole, zoznam zmien, zatvorí sa sama po 10 s. „Vrátiť" príde s históriou (v1.1). */
export function DiffToast({
  title,
  lines,
  suggestions = [],
  onClose,
  className,
}: {
  title: string;
  lines: string[];
  suggestions?: string[];
  onClose: () => void;
  className?: string;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 10_000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div role="status" className={cn('fixed inset-x-4 bottom-20 z-50 mx-auto max-w-[560px] sm:bottom-6', className)}>
      <div className="rounded-card border-card-line bg-card flex gap-3 border p-4 shadow-[var(--shadow-sheet)]">
        <div className="flex min-w-0 grow flex-col gap-1.5">
          <span className="text-sm font-semibold">{title}</span>
          <ul className="text-ink-2 flex flex-col gap-0.5 text-[13px]">
            {lines.map((l, i) => (
              <li key={i}>· {l}</li>
            ))}
          </ul>
          {suggestions.length > 0 && (
            <ul className="text-warn-fg flex flex-col gap-0.5 text-[13px]">
              {suggestions.map((l, i) => (
                <li key={i}>? {l}</li>
              ))}
            </ul>
          )}
        </div>
        <button type="button" aria-label="Zavrieť" onClick={onClose} className="text-ink-3 hover:text-ink flex h-6 shrink-0 cursor-pointer">
          <X size={16} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
