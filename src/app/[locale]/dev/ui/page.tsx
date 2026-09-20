import { notFound } from 'next/navigation';
import { UiDemo } from './ui-demo';

export const metadata = { title: 'UI kit v6' };

/** Katalóg komponentov v6 – len vo vývoji (kontrola Playwrightom, blok 2.1). */
export default function DevUiPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <UiDemo />;
}
