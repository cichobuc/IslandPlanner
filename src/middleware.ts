import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { refreshSession } from './lib/supabase/middleware';

const handleI18n = createIntlMiddleware(routing);

// Cesty bez prihlásenia (bez prefixu jazyka)
const PUBLIC = ['/', '/prihlasenie', '/ako-to-funguje'];
const isPublic = (path: string) => PUBLIC.includes(path) || path.startsWith('/zdielane/');

function splitLocale(pathname: string): { locale: string; path: string } {
  const m = pathname.match(/^\/(sk|cs)(\/.*)?$/);
  return m ? { locale: m[1], path: m[2] || '/' } : { locale: routing.defaultLocale, path: pathname };
}

export default async function middleware(request: NextRequest) {
  const response = handleI18n(request);
  // next-intl presmerovanie (napr. / → /sk) – cookies session pripneme aj naň
  const user = await refreshSession(request, response);
  if (response.headers.get('location')) return response;

  const { locale, path } = splitLocale(request.nextUrl.pathname);
  const to = (p: string) => {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${p}`;
    url.search = '';
    return NextResponse.redirect(url);
  };

  if (!user) {
    if (isPublic(path)) return response;
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/prihlasenie`;
    url.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(url);
  }

  // Vynútená zmena hesla po založení konta správcom (app_metadata zrkadlí profiles.must_change_password)
  const mustChange = user.app_metadata?.must_change_password === true;
  if (mustChange && path !== '/zmena-hesla') return to('/zmena-hesla');
  if (!mustChange && path === '/zmena-hesla' && !request.nextUrl.searchParams.has('volne')) return to('/');
  if (path === '/prihlasenie') return to('/');

  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
