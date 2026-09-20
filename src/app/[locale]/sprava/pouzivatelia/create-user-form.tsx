'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { Notice } from '@/components/ui/notice';
import { createUserAction, type CreateState } from './actions';

export function CreateUserForm() {
  const t = useTranslations('admin');
  const [state, action, pending] = useActionState<CreateState, FormData>(createUserAction, null);
  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="flex flex-col gap-4">
        <Field label={t('displayName')}>
          <Input name="displayName" required autoComplete="off" />
        </Field>
        <Field label={t('email')}>
          <Input name="email" type="email" required autoComplete="off" inputMode="email" />
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? t('creating') : t('create')}
        </Button>
      </form>
      {state && !state.ok && <Notice tone="bad">{state.error}</Notice>}
      {state?.ok && (
        <Notice tone={state.existed ? 'warn' : 'ok'}>
          <div className="font-semibold">{state.existed ? t('resetDone') : t('created')}</div>
          <div className="mt-1">
            {state.email} · {t('tempPassword')}:{' '}
            <code className="rounded-tag font-display bg-white px-1.5 py-0.5 text-[15px] font-semibold tracking-wide select-all">
              {state.tempPassword}
            </code>
          </div>
          <div className="mt-1 text-[12px] opacity-80">
            {state.emailSent ? t('emailSent') : t('emailNotSent')}
          </div>
        </Notice>
      )}
    </div>
  );
}
