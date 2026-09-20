import type { LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

const base =
  'rounded-chip inline-flex h-8 shrink-0 items-center gap-1.5 border px-[11px] text-[13px] font-medium whitespace-nowrap transition-colors';
const off = 'bg-mut-bg text-ink border-transparent';
const on = 'bg-accent-soft text-accent border-accent-line font-semibold';

/** Chip vstupu (statický) alebo filtra (klikateľný, `on`). Ikona 14 px vľavo, farba ikony podľa kroku pôvodu. */
export function Chip({
  icon: Icon,
  iconClassName,
  on: active = false,
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: LucideIcon;
  iconClassName?: string;
  on?: boolean;
  children: ReactNode;
}) {
  const inner = (
    <>
      {Icon && <Icon size={14} strokeWidth={1.8} className={cn('shrink-0', iconClassName)} aria-hidden />}
      {children}
    </>
  );
  if (props.onClick || props.type) {
    return (
      <button
        type="button"
        aria-pressed={active}
        className={cn(base, active ? on : off, 'cursor-pointer', className)}
        {...props}
      >
        {inner}
      </button>
    );
  }
  return <span className={cn(base, active ? on : off, className)}>{inner}</span>;
}

/** Riadok chipov s horizontálnym scrollom na mobile. */
export function ChipRow({ children, className, wrap = true }: { children: ReactNode; className?: string; wrap?: boolean }) {
  return (
    <div className={cn('flex gap-2', wrap ? 'flex-wrap' : 'overflow-x-auto [scrollbar-width:none]', className)}>
      {children}
    </div>
  );
}
