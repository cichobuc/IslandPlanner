import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'sm';

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-[#0c3f6b] disabled:bg-accent/50',
  secondary: 'bg-card text-ink border border-card-line hover:bg-mut-bg',
  ghost: 'bg-transparent text-accent hover:bg-accent-soft',
  danger: 'bg-bad-bg text-bad-fg border border-[#F3C4BF] hover:bg-[#fbdad6]',
};
const sizes: Record<Size, string> = { md: 'h-[42px] px-4 text-sm', sm: 'h-[34px] px-3 text-[13px]' };

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cn(
        'rounded-btn inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
