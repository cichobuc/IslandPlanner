import { Notice } from '@/components/ui';
import type { TripAccess } from '../access';
import { canEdit } from '../access';
import { loadItinerary } from '../itinerary-data';
import { dateRangeLabel } from '../progress';
import { Step05Client } from './step05-client';

/** Krok 04 · Itinerár – dni → zastávky z generátora (matica trás), vstupné podľa veku, mapa. */
export async function Step05({ access }: { access: TripAccess }) {
  const { trip, role } = access;
  if (!trip.startDate) return <Notice tone="info">Dni vzniknú po výbere letu v kroku 02.</Notice>;
  if (trip.transportMode === 'no_car')
    return <Notice tone="info">Vetva „Bez auta“ (výlety z Reykjavíku) príde vo verzii 1.1.</Notice>;
  const data = await loadItinerary(trip.id);
  return (
    <Step05Client
      tripId={trip.id}
      days={data.days}
      catalog={data.catalog}
      totals={data.totals}
      pax={data.pax}
      dates={trip.endDate ? dateRangeLabel(trip.startDate, trip.endDate) : null}
      pace={trip.pace}
      presetKey={trip.routePreset}
      attractionBudget={(trip.attractionBudget as 'free' | 'budget' | 'balanced' | 'unlimited') ?? 'balanced'}
      canEdit={canEdit(role)}
    />
  );
}
