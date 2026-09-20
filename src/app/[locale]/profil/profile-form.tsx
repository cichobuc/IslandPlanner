'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { ChipGroup, FieldRow, Section, Segmented } from '@/components/ui/choice';
import { Input } from '@/components/ui/field';
import { Notice } from '@/components/ui/notice';
import { Select } from '@/components/ui/select';
import { INTEREST_KEYS, ORIGIN_AIRPORTS, type InterestKey } from '@/engine/types';
import type { schema } from '@/db';
import { saveProfileAction, type ProfileState } from './actions';

type Profile = typeof schema.profiles.$inferSelect;
const yn = (v: boolean | null | undefined) => (v ? 'yes' : 'no');

export function ProfileForm({ profile, email }: { profile: Profile; email: string }) {
  const t = useTranslations('profile');
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveProfileAction, null);
  const scoreOptions = [0, 1, 2, 3].map((n) => ({ value: String(n), label: t(`score.${n}`) }));

  return (
    <form action={action} className="flex flex-col gap-4">
      <Section title={t('aboutMe')} lead={t('aboutMeLead')}>
        <FieldRow label={t('displayName')}>
          <Input name="displayName" defaultValue={profile.displayName} required maxLength={80} />
        </FieldRow>
        <FieldRow label={t('email')}>
          <div className="text-ink-2 text-sm">{email}</div>
        </FieldRow>
        <FieldRow label={t('birthDate')} hint={t('birthDateHint')}>
          <Input
            name="birthDate"
            type="date"
            defaultValue={profile.birthDate ?? ''}
            className="sm:max-w-[220px]"
          />
        </FieldRow>
        <FieldRow label={t('home')} hint={t('homeHint')}>
          <Input
            name="homeLabel"
            defaultValue={profile.homeLabel ?? 'Bratislava'}
            className="sm:max-w-[320px]"
          />
        </FieldRow>
        <FieldRow label={t('language')}>
          <Segmented
            name="locale"
            defaultValue={profile.locale === 'cs' ? 'cs' : 'sk'}
            options={[
              { value: 'sk', label: 'Slovenčina' },
              { value: 'cs', label: 'Čeština' },
            ]}
          />
        </FieldRow>
      </Section>

      <Section title={t('driver')} lead={t('driverLead')}>
        <FieldRow label={t('driverHas')}>
          <Segmented
            name="driverHas"
            defaultValue={yn(profile.driverLicence?.has)}
            options={[
              { value: 'yes', label: t('yes') },
              { value: 'no', label: t('no') },
            ]}
          />
        </FieldRow>
        <FieldRow label={t('driverSince')} hint={t('driverSinceHint')}>
          <Input
            name="driverSinceYear"
            type="number"
            inputMode="numeric"
            min={1950}
            max={2030}
            placeholder="2015"
            defaultValue={profile.driverLicence?.sinceYear ?? ''}
            className="sm:max-w-[140px]"
          />
        </FieldRow>
        <FieldRow label={t('driverCategories')}>
          <ChipGroup
            name="driverCategories[]"
            defaultValues={profile.driverLicence?.categories ?? ['B']}
            options={[
              { value: 'B', label: 'B' },
              { value: 'BE', label: 'BE' },
              { value: 'C', label: 'C' },
            ]}
          />
        </FieldRow>
        <FieldRow label={t('willingToDrive')} hint={t('willingToDriveHint')}>
          <Segmented
            name="willingToDrive"
            defaultValue={profile.driverLicence?.willingToDrive ?? 'yes'}
            options={[
              { value: 'yes', label: t('yes') },
              { value: 'emergency', label: t('emergency') },
              { value: 'no', label: t('no') },
            ]}
          />
        </FieldRow>
        <FieldRow label={t('creditCard')} hint={t('creditCardHint')}>
          <Segmented
            name="hasCreditCard"
            defaultValue={yn(profile.hasCreditCard)}
            options={[
              { value: 'yes', label: t('yes') },
              { value: 'no', label: t('no') },
            ]}
          />
        </FieldRow>
      </Section>

      <Section title={t('drone')} lead={t('droneLead')}>
        <FieldRow label={t('droneHas')}>
          <Segmented
            name="droneHas"
            defaultValue={yn(profile.drone?.has)}
            options={[
              { value: 'yes', label: t('yes') },
              { value: 'no', label: t('no') },
            ]}
          />
        </FieldRow>
        <FieldRow label={t('droneModel')}>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input name="droneModel" placeholder="DJI Mini 4 Pro" defaultValue={profile.drone?.model ?? ''} />
            <Input
              name="droneWeightG"
              type="number"
              inputMode="numeric"
              min={0}
              max={25000}
              placeholder={t('droneWeightPlaceholder')}
              defaultValue={profile.drone?.weightG ?? ''}
              className="sm:max-w-[160px]"
            />
          </div>
        </FieldRow>
        <FieldRow label={t('droneOperator')} hint={t('droneOperatorHint')}>
          <Input
            name="droneOperatorId"
            placeholder="SVKxxxxxxxxxxxx"
            defaultValue={profile.drone?.operatorId ?? ''}
            className="sm:max-w-[320px]"
          />
        </FieldRow>
        <FieldRow label={t('droneInsurance')}>
          <Segmented
            name="droneInsurance"
            defaultValue={yn(profile.drone?.insurance)}
            options={[
              { value: 'yes', label: t('yes') },
              { value: 'no', label: t('no') },
            ]}
          />
        </FieldRow>
      </Section>

      <Section title={t('interests')} lead={t('interestsLead')}>
        {INTEREST_KEYS.map((k: InterestKey) => (
          <FieldRow key={k} label={t(`interest.${k}`)}>
            <Segmented
              name={`interests.${k}`}
              defaultValue={String(profile.interests?.[k] ?? 0)}
              options={scoreOptions}
            />
          </FieldRow>
        ))}
      </Section>

      <Section title={t('travelStyle')} lead={t('travelStyleLead')}>
        <FieldRow label={t('pace')}>
          <Segmented
            name="pace"
            defaultValue={profile.pace ?? 'normal'}
            options={[
              { value: 'relaxed', label: t('paceRelaxed') },
              { value: 'normal', label: t('paceNormal') },
              { value: 'intense', label: t('paceIntense') },
            ]}
          />
        </FieldRow>
        <FieldRow label={t('comfort')} hint={t('comfortHint')}>
          <Segmented
            name="comfort"
            defaultValue={profile.comfort ?? 'guesthouse'}
            options={[
              { value: 'camp', label: t('comfortCamp') },
              { value: 'hostel', label: t('comfortHostel') },
              { value: 'guesthouse', label: t('comfortGuesthouse') },
              { value: 'hotel', label: t('comfortHotel') },
            ]}
          />
        </FieldRow>
        <FieldRow label={t('food')}>
          <Segmented
            name="foodLevel"
            defaultValue={profile.foodLevel ?? 'budget'}
            options={[
              { value: 'budget', label: t('foodBudget') },
              { value: 'mid', label: t('foodMid') },
              { value: 'comfort', label: t('foodComfort') },
            ]}
          />
        </FieldRow>
        <FieldRow label={t('bags')}>
          <Segmented
            name="bagsPref"
            defaultValue={profile.bagsPref ?? 'light'}
            options={[
              { value: 'light', label: t('bagsLight') },
              { value: 'checked', label: t('bagsChecked') },
            ]}
          />
        </FieldRow>
        <FieldRow label={t('budgetTarget')} hint={t('budgetTargetHint')}>
          <div className="flex items-center gap-2">
            <Input
              name="budgetTarget"
              type="number"
              inputMode="numeric"
              min={0}
              step={50}
              placeholder="1200"
              defaultValue={profile.budgetTarget ? Math.round(Number(profile.budgetTarget)) : ''}
              className="sm:max-w-[160px]"
            />
            <span className="text-ink-3 text-sm">€ / os.</span>
          </div>
        </FieldRow>
      </Section>

      <Section title={t('airports')} lead={t('airportsLead')}>
        <FieldRow label={t('airportsPreferred')}>
          <ChipGroup
            name="airports[]"
            defaultValues={(profile.airports as string[] | null) ?? []}
            options={ORIGIN_AIRPORTS.map((a) => ({ value: a, label: `${a} · ${t(`airport.${a}`)}` }))}
          />
        </FieldRow>
      </Section>

      <Section title={t('docs')} lead={t('docsLead')}>
        <FieldRow label={t('idValidUntil')}>
          <Input
            name="idValidUntil"
            type="date"
            defaultValue={profile.docs?.idValidUntil ?? ''}
            className="sm:max-w-[220px]"
          />
        </FieldRow>
        <FieldRow label={t('ehic')} hint={t('ehicHint')}>
          <Segmented
            name="ehic"
            defaultValue={yn(profile.docs?.ehic)}
            options={[
              { value: 'yes', label: t('yes') },
              { value: 'no', label: t('no') },
            ]}
          />
        </FieldRow>
        <FieldRow label={t('insurance')} hint={t('insuranceHint')}>
          <Segmented
            name="insurance"
            defaultValue={yn(profile.docs?.insurance)}
            options={[
              { value: 'yes', label: t('yes') },
              { value: 'no', label: t('no') },
            ]}
          />
        </FieldRow>
      </Section>

      {state && !state.ok && <Notice tone="bad">{state.error}</Notice>}
      {state?.ok && <Notice tone="ok">{t('saved')}</Notice>}

      <div className="border-card-line bg-bg/95 sticky bottom-0 -mx-4 flex items-center justify-end gap-2 border-t px-4 py-3 backdrop-blur-sm sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0">
        {profile.completedAt && <span className="text-ink-3 mr-auto text-[12px]">{t('completedTag')}</span>}
        <Button type="submit" name="intent" value="save" variant="secondary" disabled={pending}>
          {t('save')}
        </Button>
        <Button type="submit" name="intent" value="done" disabled={pending}>
          {pending ? t('saving') : t('done')}
        </Button>
      </div>
    </form>
  );
}
