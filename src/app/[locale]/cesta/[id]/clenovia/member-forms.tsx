'use client';

import { useActionState } from 'react';
import { Button, Select } from '@/components/ui';
import {
  addMemberAction,
  removeMemberAction,
  updateMemberRoleAction,
  type ActionState,
} from '@/features/trips/actions';

export function AddMemberForm({
  tripId,
  options,
  labels,
}: {
  tripId: string;
  options: { value: string; label: string }[];
  labels: { pick: string; role: string; editor: string; viewer: string; add: string; adding: string };
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(addMemberAction, null);
  return (
    <form
      action={action}
      className="rounded-card border-card-line bg-card flex flex-col gap-3 border p-4 sm:flex-row sm:items-center"
    >
      <input type="hidden" name="tripId" value={tripId} />
      <Select name="userId" required defaultValue="" className="sm:flex-1">
        <option value="" disabled>
          {labels.pick}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      <Select name="role" defaultValue="editor" aria-label={labels.role} className="sm:w-[140px]">
        <option value="editor">{labels.editor}</option>
        <option value="viewer">{labels.viewer}</option>
      </Select>
      <Button type="submit" disabled={pending}>
        {pending ? labels.adding : labels.add}
      </Button>
      {state && !state.ok && <span className="text-bad-fg text-[12px]">{state.error}</span>}
    </form>
  );
}

/** Rola (select uloží hneď) + Odobrať – len pre vlastníka, nie pre riadok vlastníka. */
export function MemberActions({
  tripId,
  userId,
  role,
  labels,
}: {
  tripId: string;
  userId: string;
  role: 'editor' | 'viewer';
  labels: { editor: string; viewer: string; remove: string };
}) {
  const [, roleAction] = useActionState<ActionState, FormData>(updateMemberRoleAction, null);
  const [removeState, removeAct, removing] = useActionState<ActionState, FormData>(removeMemberAction, null);
  return (
    <span className="flex items-center gap-1.5">
      <form action={roleAction}>
        <input type="hidden" name="tripId" value={tripId} />
        <input type="hidden" name="userId" value={userId} />
        <Select
          name="role"
          defaultValue={role}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="h-[34px] w-[110px] text-[13px]"
        >
          <option value="editor">{labels.editor}</option>
          <option value="viewer">{labels.viewer}</option>
        </Select>
      </form>
      <form action={removeAct}>
        <input type="hidden" name="tripId" value={tripId} />
        <input type="hidden" name="userId" value={userId} />
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          disabled={removing}
          title={removeState && !removeState.ok ? removeState.error : undefined}
        >
          {labels.remove}
        </Button>
      </form>
    </span>
  );
}
