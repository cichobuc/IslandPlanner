'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { Notice } from '@/components/ui/notice';
import { changePasswordAction, type ChangeState } from './actions';

export function ChangePasswordForm({ min }: { min: number }) {
  const t = useTranslations('auth');
  const [state, action, pending] = useActionState<ChangeState, FormData>(changePasswordAction, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label={t('newPassword')} hint={t('passwordRule', { min })}>
        <Input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={min}
          required
          autoFocus
        />
      </Field>
      <Field label={t('confirmPassword')}>
        <Input name="confirm" type="password" autoComplete="new-password" minLength={min} required />
      </Field>
      {state?.error && <Notice tone="bad">{state.error}</Notice>}
      <Button type="submit" disabled={pending}>
        {pending ? t('saving') : t('savePassword')}
      </Button>
    </form>
  );
}
