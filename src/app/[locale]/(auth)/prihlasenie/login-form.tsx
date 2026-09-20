'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { Notice } from '@/components/ui/notice';
import { loginAction, type LoginState } from './actions';

export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations('auth');
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      {next && <input type="hidden" name="next" value={next} />}
      <Field label={t('email')}>
        <Input
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          required
          autoFocus
          defaultValue={state?.email ?? ''}
        />
      </Field>
      <Field label={t('password')} hint={t('tempPasswordHint')}>
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>
      {state?.error && <Notice tone="bad">{state.error}</Notice>}
      <Button type="submit" disabled={pending}>
        {pending ? t('signingIn') : t('signIn')}
      </Button>
    </form>
  );
}
