import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Tile } from './tile';

/**
 * Karta voľby (Auto / Karavan / Bez auta): radio vpravo hore, ikonová dlaždica, názov, ≈ suma modrou, 1 riadok popisu.
 * Zvolená = 2 px modrý okraj. Na telefóne (< sm) kompaktne: bez dlaždice a popisu.
 */
export function OptionCard({
  icon,
  title,
  amount,
  description,
  selected = false,
  disabled = false,
  onSelect,
  submit = false,
  className,
}: {
  icon: LucideIcon;
  title: ReactNode;
  amount?: ReactNode;
  description?: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
  /** true = odošle obklopujúci formulár (server action) namiesto onSelect */
  submit?: boolean;
  className?: string;
}) {
  return (
    <button
      type={submit ? 'submit' : 'button'}
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'rounded-option bg-card text-ink relative flex cursor-pointer flex-col gap-1 text-left transition-colors sm:gap-2',
        // 1 px kompenzácia okraja, aby sa karty pri výbere nehýbali
        selected ? 'border-accent border-2 px-2.5 py-3 sm:p-3.5' : 'border-card-line border px-[11px] py-[13px] hover:border-[#C9D2DD] sm:p-[15px]',
        disabled && 'cursor-not-allowed opacity-55',
        className,
      )}
    >
      <span className="hidden items-center justify-between gap-2 sm:flex">
        <Tile icon={icon} size={32} tone={selected ? 'info' : 'mut'} />
        <Radio checked={selected} />
      </span>
      <span className="font-display text-sm font-semibold sm:text-base">{title}</span>
      {amount && <span className="font-display text-accent text-[13px] font-semibold tabular-nums sm:text-[15px]">{amount}</span>}
      {description && <span className="text-ink-2 hidden text-[12px] leading-[1.4] sm:inline">{description}</span>}
    </button>
  );
}

export function Radio({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'box-border inline-block size-[18px] rounded-full bg-white',
        checked ? 'border-accent border-[5px]' : 'border-[1.5px] border-[#C9D2DD]',
      )}
    />
  );
}

/** Mriežka kariet volieb (3 v rade na tablete aj telefóne). */
export function OptionGrid({ children, cols = 3, className }: { children: ReactNode; cols?: 2 | 3 | 4; className?: string }) {
  const grid = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-2 sm:grid-cols-4' }[cols];
  return (
    <div role="radiogroup" className={cn('grid gap-2.5', grid, className)}>
      {children}
    </div>
  );
}
