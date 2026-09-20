import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getTripAccess } from '@/features/trips/access';
import { loadItinerary } from '@/features/trips/itinerary-data';
import { MapView } from './map-view';

export const metadata: Metadata = { title: 'Mapa' };

/** Mapa cez celú obrazovku (docs/obrazovky/03-mapa): trasa dní z OSRM, zastávky, noci, katalóg; `?den=N&poi=slug`. */
export default async function MapPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ den?: string; poi?: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const access = await getTripAccess(id);
  if (!access) notFound();
  const sp = await searchParams;
  const data = await loadItinerary(id, { geometry: true });
  return (
    <MapView
      tripId={id}
      tripName={access.trip.name}
      days={data.days}
      catalog={data.catalog}
      initialDay={sp.den ? Number(sp.den) : null}
      initialPoi={sp.poi ?? null}
      totals={data.totals}
    />
  );
}
