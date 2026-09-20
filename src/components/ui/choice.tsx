import { cn } from '@/lib/cn';

type Option<V extends string> = { value: V; label: string; hint?: string };

/**
 * Prepínač jednej voľby (radio) – chipy 32 px, aktívny svetlomodrý s okrajom (docs/06).
 * Čisto server-render (peer-checked), bez JS.
 */
export function Segmented<V extends string>({
  name,
  options,
  defaultValue,
  className,
}: {
  name: string;
  options: Option<V>[];
  defaultValue?: V | null;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)} role="radiogroup">
      {options.map((o) => (
        <label key={o.value} className="cursor-pointer">
          <input
            type="radio"
            name={name}
            value={o.value}
            defaultChecked={defaultValue === o.value}
            className="peer sr-only"
          />
          <span
            className={cn(
              'rounded-chip bg-mut-bg text-ink-2 inline-flex h-8 items-center gap-1 border border-transparent px-3 text-[13px] font-medium select-none',
              'peer-checked:border-accent-line peer-checked:bg-accent-soft peer-checked:text-accent',
              'peer-focus-visible:outline-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2',
            )}
          >
            {o.label}
            {o.hint && <span className="text-[11px] opacity-70">{o.hint}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}

/** Viac volieb naraz (checkbox chipy). */
export function ChipGroup<V extends string>({
  name,
  options,
  defaultValues = [],
  className,
}: {
  name: string;
  options: Option<V>[];
  defaultValues?: readonly V[] | null;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {options.map((o) => (
        <label key={o.value} className="cursor-pointer">
          <input
            type="checkbox"
            name={name}
            value={o.value}
            defaultChecked={defaultValues?.includes(o.value) ?? false}
            className="peer sr-only"
          />
          <span
            className={cn(
              'rounded-chip bg-mut-bg text-ink-2 inline-flex h-8 items-center border border-transparent px-3 text-[13px] font-medium select-none',
              'peer-checked:border-accent-line peer-checked:bg-accent-soft peer-checked:text-accent',
              'peer-focus-visible:outline-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2',
            )}
          >
            {o.label}
          </span>
        </label>
      ))}
    </div>
  );
}

/** Riadok formulára: popisok vľavo (na iPade), ovládanie vpravo; na mobile pod sebou. 58 px min. */
export function FieldRow({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn('flex min-h-[58px] flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4', className)}
    >
      <div className="sm:w-[200px] sm:shrink-0">
        <div className="text-ink text-sm font-medium">{label}</div>
        {hint && <div className="text-ink-3 text-[12px]">{hint}</div>}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function Section({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border-card-line bg-card border px-5 py-2">
      <div className="border-line border-b py-3">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {lead && <p className="text-ink-3 text-[12px]">{lead}</p>}
      </div>
      <div className="divide-line divide-y">{children}</div>
    </section>
  );
}
