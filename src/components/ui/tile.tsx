import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { toneBg, type Tone } from './tone';

const sizes = { 26: 'size-[26px] rounded-[7px]', 32: 'size-8 rounded-[8px]', 36: 'size-9 rounded-[9px]', 40: 'size-10 rounded-[10px]' };
const iconSizes = { 26: 13, 32: 15, 36: 17, 40: 19 };

/** Tónovaná ikonová dlaždica – v riadkoch, kartách volieb, sheete. Farba = kategória, nie stav. */
export function Tile({
  icon: Icon,
  tone = 'mut',
  size = 36,
  className,
}: {
  icon: LucideIcon;
  tone?: Tone;
  size?: 26 | 32 | 36 | 40;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center', sizes[size], toneBg[tone], className)}>
      <Icon size={iconSizes[size]} strokeWidth={1.8} aria-hidden />
    </span>
  );
}
