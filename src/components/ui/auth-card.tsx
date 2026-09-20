import type { ReactNode } from 'react';

/** Úzka karta na celú výšku – prihlásenie, zmena hesla. */
export function AuthCard({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-center gap-5 px-4 py-10">
      <div className="flex items-center gap-3">
        <span className="border-accent-line bg-accent-soft font-display text-accent grid size-9 place-items-center rounded-[9px] border text-base font-semibold">
          ⛰
        </span>
        <span className="text-ink-3 text-[11px] font-medium tracking-[.08em] uppercase">Island Planner</span>
      </div>
      <div>
        <h1 className="font-display text-[26px] leading-tight font-semibold">{title}</h1>
        {lead && <p className="text-ink-2 mt-1.5 text-sm">{lead}</p>}
      </div>
      <div className="rounded-card border-card-line bg-card border p-5">{children}</div>
    </main>
  );
}
