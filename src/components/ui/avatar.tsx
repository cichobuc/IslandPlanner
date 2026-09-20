import { cn } from '@/lib/cn';

const palette = ['bg-accent', 'bg-ok-fg', 'bg-vio-fg', 'bg-warn-fg', 'bg-bad-fg'];

export function Avatar({ name, index = 0, size = 26, className }: { name: string; index?: number; size?: number; className?: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <span
      title={name}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      className={cn(
        'font-display inline-flex shrink-0 items-center justify-center rounded-full border-2 border-white font-semibold text-white',
        palette[index % palette.length],
        className,
      )}
    >
      {initial}
    </span>
  );
}

/** Prekryté avatary členov (−7 px). */
export function AvatarStack({ names, size = 26, className }: { names: string[]; size?: number; className?: string }) {
  return (
    <span className={cn('inline-flex pl-[7px]', className)}>
      {names.map((n, i) => (
        <Avatar key={n + i} name={n} index={i} size={size} className="-ml-[7px]" />
      ))}
    </span>
  );
}
