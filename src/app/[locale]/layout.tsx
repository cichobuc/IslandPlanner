import type { Metadata, Viewport } from 'next';
import { Sora, Instrument_Sans } from 'next/font/google';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import '../globals.css';

const sora = Sora({ subsets: ['latin', 'latin-ext'], weight: ['500', '600'], variable: '--font-sora' });
const instrument = Instrument_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600'],
  variable: '--font-instrument',
});

export const viewport: Viewport = {
  themeColor: '#F4F6F9',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'app' });
  return { title: { default: t('name'), template: `%s · ${t('name')}` }, description: t('tagline') };
}

// Všetky stránky čítajú session (cookies) → dynamické, bez generateStaticParams
export const dynamic = 'force-dynamic';

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} className={`${sora.variable} ${instrument.variable}`}>
      <body className="bg-bg text-ink font-sans antialiased">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
