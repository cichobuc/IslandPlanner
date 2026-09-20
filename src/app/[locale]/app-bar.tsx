import { HelpCircle, LogOut, Users } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Avatar, ButtonLink, IslandMark } from '@/components/ui';
import { Link } from '@/i18n/navigation';

/** Hlavička obrazovky Cesty: znak + názov · Ako to funguje · (správca: Používatelia) · avatar → profil · odhlásiť. */
export async function AppBar({ me, locale }: { me: { name: string; isAdmin: boolean }; locale: string }) {
  const t = await getTranslations('trips');
  return (
    <header className="border-card-line bg-card flex h-14 items-center gap-3 border-b px-4 sm:px-6">
      <span className="flex items-center gap-2">
        <IslandMark size={20} className="text-accent" />
        <span className="font-display text-[15px] font-semibold">Island Planner</span>
      </span>
      <div className="grow" />
      <ButtonLink href="/ako-to-funguje" variant="ghost" size="sm" className="text-ink-2">
        <HelpCircle size={16} strokeWidth={1.8} /> <span className="hidden sm:inline">Ako to funguje</span>
      </ButtonLink>
      {me.isAdmin && (
        <ButtonLink href="/sprava/pouzivatelia" variant="ghost" size="sm" className="text-ink-2">
          <Users size={16} strokeWidth={1.8} /> <span className="hidden sm:inline">{t('users')}</span>
        </ButtonLink>
      )}
      <Link href="/profil" title={t('profile')} className="ml-1 flex items-center gap-2">
        <Avatar name={me.name} size={28} />
      </Link>
      <form action={`/api/auth/signout?locale=${locale}`} method="post">
        <button
          type="submit"
          title={t('signOut')}
          aria-label={t('signOut')}
          className="text-ink-3 hover:text-ink flex size-[34px] items-center justify-center"
        >
          <LogOut size={16} strokeWidth={1.8} />
        </button>
      </form>
    </header>
  );
}
