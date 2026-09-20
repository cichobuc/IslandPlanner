import { ChevronLeft, MoreHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { AvatarStack } from './avatar';
import { Button } from './button';
import { IslandMark } from './island-mark';

/**
 * Hlavička 56 px (tablet/desktop): ‹ späť · znak Islandu + názov · [Ja | Skupina] · avatary · ⋯
 */
export function TopBar({
  backHref = '/',
  backLabel = 'Cesty',
  title,
  mode,
  onModeChange,
  members = [],
  actions,
  className,
}: {
  backHref?: string;
  backLabel?: string;
  title: string;
  mode?: 'me' | 'group';
  onModeChange?: (m: 'me' | 'group') => void;
  members?: string[];
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn('border-card-line bg-card flex h-14 shrink-0 items-center gap-3.5 border-b px-4 sm:px-6', className)}
    >
      <Link href={backHref} className="text-ink-2 hover:text-accent flex items-center gap-1 text-[13px] font-semibold">
        <ChevronLeft size={16} strokeWidth={1.75} aria-hidden />
        <span className="hidden sm:inline">{backLabel}</span>
      </Link>
      <span className="flex min-w-0 items-center gap-2">
        <IslandMark size={20} className="text-accent" />
        <span className="font-display truncate text-[15px] font-semibold">{title}</span>
      </span>
      <div className="grow" />
      {mode && (
        <>
          <ModeToggle mode={mode} onChange={onModeChange} className="hidden sm:flex" />
          <button
            type="button"
            onClick={onModeChange ? () => onModeChange(mode === 'me' ? 'group' : 'me') : undefined}
            className="rounded-chip bg-accent-soft text-accent border-accent-line inline-flex h-7 items-center border px-[11px] text-[13px] font-semibold sm:hidden"
          >
            {mode === 'me' ? 'Ja' : 'Skupina'}
          </button>
        </>
      )}
      {members.length > 0 && (
        <span className="hidden sm:inline-flex">
          <AvatarStack names={members} className="ml-1.5" />
        </span>
      )}
      {actions ?? (
        <Button variant="ghost" size="sm" icon aria-label="Menu">
          <MoreHorizontal size={18} strokeWidth={1.75} className="text-ink-2" />
        </Button>
      )}
    </header>
  );
}

/** Prepínač Ja / Skupina – sivá kapsa s 28 px chipmi. */
export function ModeToggle({ mode, onChange, className }: { mode: 'me' | 'group'; onChange?: (m: 'me' | 'group') => void; className?: string }) {
  const item = (m: 'me' | 'group', label: string) => (
    <button
      type="button"
      aria-pressed={mode === m}
      onClick={onChange ? () => onChange(m) : undefined}
      className={cn(
        'rounded-chip inline-flex h-7 items-center border px-[11px] text-[13px] font-medium',
        mode === m ? 'bg-accent-soft text-accent border-accent-line font-semibold' : 'text-ink border-transparent bg-transparent',
      )}
    >
      {label}
    </button>
  );
  return (
    <div className={cn('bg-mut-bg rounded-chip flex gap-0.5 p-[3px]', className)} role="group" aria-label="Režim">
      {item('me', 'Ja')}
      {item('group', 'Skupina')}
    </div>
  );
}
