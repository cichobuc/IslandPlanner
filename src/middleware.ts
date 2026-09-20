import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Blok 1.3 doplní Supabase session refresh + presmerovanie na /zmena-hesla a /profil.
export default createMiddleware(routing);

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
