import type { SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'rounded-chip border-card-line bg-card text-ink focus:border-accent h-[42px] w-full border px-3 text-[15px] focus:outline-none',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
