'use client';

import { Pencil } from 'lucide-react';
import { useActionState, useState } from 'react';
import { Button, Input, Sheet } from '@/components/ui';
import { renameTripAction, type ActionState } from '@/features/trips/actions';

/** Premenovanie cesty – sheet s jedným poľom (klik na názov, docs/obrazovky/02-cesta). */
export function RenameTrip({ tripId, name }: { tripId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const r = await renameTripAction(prev, fd);
    if (r?.ok) setOpen(false);
    return r;
  }, null);
  return (
    <>
      <Button variant="ghost" size="sm" icon aria-label="Premenovať" title="Premenovať" onClick={() => setOpen(true)} className="text-ink-2">
        <Pencil size={16} strokeWidth={1.8} />
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Názov cesty">
        <form action={action} className="flex flex-col gap-3 py-4">
          <input type="hidden" name="tripId" value={tripId} />
          <Input name="name" defaultValue={name} maxLength={80} autoFocus required />
          {state && !state.ok && <span className="text-bad-fg text-[12px]">{state.error}</span>}
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              Uložiť
            </Button>
          </div>
        </form>
      </Sheet>
    </>
  );
}
