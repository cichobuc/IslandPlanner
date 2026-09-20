import { defineRouting } from 'next-intl/routing';

export const locales = ['sk', 'cs'] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: 'sk',
  localePrefix: 'always',
});
