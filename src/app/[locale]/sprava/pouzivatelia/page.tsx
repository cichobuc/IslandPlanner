import { desc } from 'drizzle-orm';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getDb, schema } from '@/db';
import { requireAdmin } from '@/lib/auth/session';
import { CreateUserForm } from './create-user-form';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin');
  return { title: t('users') };
}

export default async function UsersAdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await requireAdmin();
  if (!me) notFound();
  const t = await getTranslations('admin');
  const users = await getDb().select().from(schema.profiles).orderBy(desc(schema.profiles.createdAt));

  return (
    <main className="mx-auto flex w-full max-w-[720px] flex-col gap-5 px-4 py-8">
      <div>
        <span className="text-ink-3 text-[11px] font-medium tracking-[.08em] uppercase">{t('admin')}</span>
        <h1 className="font-display text-[26px] leading-tight font-semibold">{t('users')}</h1>
        <p className="text-ink-2 mt-1.5 text-sm">{t('usersLead')}</p>
      </div>
      <section className="rounded-card border-card-line bg-card border p-5">
        <h2 className="mb-4 text-[15px] font-semibold">{t('newUser')}</h2>
        <CreateUserForm />
      </section>
      <section className="rounded-card border-card-line bg-card border">
        <ul className="divide-line divide-y">
          {users.map((u) => (
            <li key={u.userId} className="flex min-h-[58px] items-center gap-3 px-4 py-2.5">
              <span className="bg-vio-bg text-vio-fg grid size-9 shrink-0 place-items-center rounded-[9px] text-[13px] font-semibold">
                {u.displayName.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{u.displayName}</div>
                <div className="text-ink-3 truncate text-[13px]">{u.email}</div>
              </div>
              <div className="flex gap-1.5">
                {u.isAdmin && (
                  <span className="rounded-tag bg-info-bg text-info-fg px-2 py-0.5 text-[12px] font-medium">
                    {t('roleAdmin')}
                  </span>
                )}
                {u.mustChangePassword && (
                  <span className="rounded-tag bg-warn-bg text-warn-fg px-2 py-0.5 text-[12px] font-medium">
                    {t('tempPasswordTag')}
                  </span>
                )}
                {u.completedAt && (
                  <span className="rounded-tag bg-ok-bg text-ok-fg px-2 py-0.5 text-[12px] font-medium">
                    {t('profileDone')}
                  </span>
                )}
              </div>
            </li>
          ))}
          {users.length === 0 && <li className="text-ink-3 px-4 py-6 text-center text-sm">{t('noUsers')}</li>}
        </ul>
      </section>
    </main>
  );
}
