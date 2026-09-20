import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'sm';

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-[#0c3f6b] disabled:bg-accent/50',
  secondary: 'bg-card text-ink border border-[#D5DBE3] hover:bg-mut-bg',
  ghost: 'bg-transparent text-accent hover:bg-accent-soft',
  danger: 'bg-bad-bg text-bad-fg border border-[#F3C4BF] hover:bg-[#fbdad6]',
};
// padding a šírka sa vylučujú (ikonové tlačidlo je štvorec) – nikdy neposielať px-* dvakrát, poradie tried v CSS ho nepremaže
const sizes: Record<Size, string> = { md: 'h-[42px] text-sm', sm: 'h-[34px] text-[13px] rounded-chip' };
const padded: Record<Size, string> = { md: 'px-[18px]', sm: 'px-3' };
const iconOnly: Record<Size, string> = { md: 'w-[42px]', sm: 'w-[34px]' };

export const buttonClass = (variant: Variant = 'primary', size: Size = 'md', icon = false, className?: string) =>
  cn(
    'rounded-btn inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed',
    variants[variant],
    sizes[size],
    icon ? iconOnly[size] : padded[size],
    className,
  );

export function Button({
  variant = 'primary',
  size = 'md',
  icon = false,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; icon?: boolean }) {
  return <button className={buttonClass(variant, size, icon, className)} {...props} />;
}

/** Odkaz vo vzhľade tlačidla (next-intl Link). */
export function ButtonLink({
  variant = 'primary',
  size = 'md',
  icon = false,
  className,
  href,
  children,
  ...props
}: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string;
  variant?: Variant;
  size?: Size;
  icon?: boolean;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size, icon, className)} {...props}>
      {children}
    </Link>
  );
}
