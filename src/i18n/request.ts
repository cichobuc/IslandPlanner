import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

// cs má zatiaľ prázdne správy → next-intl padne na sk (fallback nižšie)
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const fallback = (await import('./messages/sk.json')).default;
  const messages =
    locale === 'sk' ? fallback : { ...fallback, ...(await import(`./messages/${locale}.json`)).default };
  return { locale, messages, timeZone: 'Europe/Bratislava' };
});
