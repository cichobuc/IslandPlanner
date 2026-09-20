import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Avatar, ButtonLink, ListCard, ListRow, Notice, StepSection, Tag, TopBar } from '@/components/ui';
import { getTripAccess } from '@/features/trips/access';
import { listAddableProfiles, listTripMembers } from '@/features/trips/queries';
import { AddMemberForm, MemberActions } from './member-forms';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('trip');
  return { title: t('members') };
}

/** Členovia cesty: zoznam (rola, stav profilu), pridanie existujúceho konta, zmena roly, odobratie – len vlastník. */
export default async function MembersPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const access = await getTripAccess(id);
  if (!access) notFound();
  const t = await getTranslations('trip');
  const isOwner = access.role === 'owner';
  const [members, addable] = await Promise.all([listTripMembers(id), isOwner ? listAddableProfiles(id) : []]);
  const roleLabel = { owner: t('roleOwner'), editor: t('roleEditor'), viewer: t('roleViewer') };

  return (
    <div className="bg-bg min-h-dvh">
      <TopBar
        backHref={`/cesta/${id}`}
        backLabel={access.trip.name}
        title={t('members')}
        actions={<span />}
      />
      <main className="mx-auto flex w-full max-w-[760px] flex-col gap-[18px] px-4 py-5 sm:px-6">
        <p className="text-ink-2 text-sm">{t('membersLead')}</p>
        <StepSection title={`${t('members')} · ${members.length}`}>
          <ListCard>
            {members.map((m, i) => (
              <ListRow
                key={m.userId}
                leading={<Avatar name={m.displayName} index={i} size={36} />}
                title={m.displayName}
                meta={m.email}
                badges={
                  <>
                    <Tag tone={m.role === 'owner' ? 'info' : 'mut'}>{roleLabel[m.role]}</Tag>
                    {m.profileCompleted ? (
                      <Tag tone="ok">{t('profileDone')}</Tag>
                    ) : (
                      <Tag tone="warn">{t('profileMissing')}</Tag>
                    )}
                    {m.mustChangePassword && <Tag tone="warn">{t('tempPassword')}</Tag>}
                  </>
                }
                action={
                  isOwner && m.role !== 'owner' ? (
                    <MemberActions
                      tripId={id}
                      userId={m.userId}
                      role={m.role}
                      labels={{ editor: t('roleEditor'), viewer: t('roleViewer'), remove: t('remove') }}
                    />
                  ) : undefined
                }
              />
            ))}
          </ListCard>
        </StepSection>
        {isOwner ? (
          <StepSection title={t('addMember')}>
            {addable.length > 0 ? (
              <AddMemberForm
                tripId={id}
                options={addable.map((p) => ({ value: p.userId, label: `${p.displayName} · ${p.email}` }))}
                labels={{
                  pick: t('pick'),
                  role: t('role'),
                  editor: t('roleEditor'),
                  viewer: t('roleViewer'),
                  add: t('add'),
                  adding: t('adding'),
                }}
              />
            ) : (
              <Notice tone="mut">{t('noAddable')}</Notice>
            )}
            {access.me.profile?.isAdmin && (
              <div>
                <ButtonLink href="/sprava/pouzivatelia" variant="ghost" size="sm">
                  {t('createAccount')} ›
                </ButtonLink>
              </div>
            )}
          </StepSection>
        ) : (
          <Notice tone="mut">{t('onlyOwner')}</Notice>
        )}
      </main>
    </div>
  );
}
