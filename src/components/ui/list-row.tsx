import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * ListRow – jediný riadok pre všetko (docs/obrazovky/00-vzor):
 * [leading] názov + meta (+ štítky) · suma + podtext · [akcia] · ›
 * 58 px, vybraný = svetlomodrý podklad + 3 px ľavý pruh, vnorený = odsadený, svetlosivý podklad.
 */
export function ListRow({
  leading,
  title,
  meta,
  badges,
  amount,
  amountSub,
  action,
  selected = false,
  nested = false,
  onOpen,
  href,
  className,
}: {
  leading?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  badges?: ReactNode;
  amount?: ReactNode;
  amountSub?: ReactNode;
  action?: ReactNode;
  selected?: boolean;
  nested?: boolean;
  /** Klik na názov / › otvorí detail (sheet). */
  onOpen?: () => void;
  href?: string;
  className?: string;
}) {
  const hasDetail = Boolean(onOpen || href);
  const titleCls = 'truncate text-left text-sm font-semibold';
  return (
    <div
      className={cn(
        'border-line grid min-h-[58px] items-center gap-2.5 border-t px-3 py-2 first:border-t-0 sm:gap-3.5 sm:px-4',
        'grid-cols-[36px_minmax(0,1fr)_auto_18px] sm:grid-cols-[36px_minmax(0,1fr)_auto_auto_18px]',
        selected && 'bg-[#F5F9FE] shadow-[inset_3px_0_0_#0F4C81]',
        nested &&
          'min-h-[46px] grid-cols-[24px_minmax(0,1fr)_auto_18px] bg-[#FAFBFC] pl-[52px] sm:grid-cols-[24px_minmax(0,1fr)_auto_auto_18px] sm:pl-[66px]',
        className,
      )}
    >
      <span className="flex items-center justify-center">{leading}</span>
      <div className="flex min-w-0 flex-col gap-[3px]">
        {href ? (
          <a href={href} className={titleCls}>
            {title}
          </a>
        ) : onOpen ? (
          <button type="button" onClick={onOpen} className={cn(titleCls, 'cursor-pointer')}>
            {title}
          </button>
        ) : (
          <span className={titleCls}>{title}</span>
        )}
        {(meta || badges) && (
          <span className="text-ink-2 flex items-center gap-2 overflow-hidden text-[12px] whitespace-nowrap">
            {meta && <span className="truncate">{meta}</span>}
            {badges}
          </span>
        )}
        {action && <span className="mt-1.5 flex sm:hidden">{action}</span>}
      </div>
      <div className="flex min-w-0 flex-col items-end sm:min-w-[64px]">
        {amount && <span className="font-display text-[15px] font-semibold tabular-nums">{amount}</span>}
        {amountSub && <span className="text-ink-3 text-[11px] tabular-nums">{amountSub}</span>}
      </div>
      <span className="hidden justify-end sm:flex">{action}</span>
      <span className="flex text-[#B8C0CB]">
        {hasDetail && (
          <button type="button" onClick={onOpen} aria-label="Detail" className="flex cursor-pointer">
            <ChevronRight size={16} strokeWidth={1.75} />
          </button>
        )}
      </span>
    </div>
  );
}

/** Kontajner riadkov – karta s orezaním. */
export function ListCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-card border-card-line bg-card overflow-hidden border', className)}>{children}</div>;
}
