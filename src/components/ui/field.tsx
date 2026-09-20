import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Popisok 11 px uppercase + vstup 42 px (docs/06). */
export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-ink-3 text-[11px] font-medium tracking-[.08em] uppercase">{label}</span>
      {children}
      {error ? (
        <span className="text-bad-fg text-[12px]">{error}</span>
      ) : hint ? (
        <span className="text-ink-3 text-[12px]">{hint}</span>
      ) : null}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'rounded-chip border-card-line bg-card text-ink placeholder:text-ink-3 focus:border-accent h-[42px] w-full border px-3 text-[15px] focus:outline-none',
        className,
      )}
      {...props}
    />
  );
}
