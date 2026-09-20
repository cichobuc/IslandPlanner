import { Notice } from '@/components/ui';
import type { TripAccess } from '../access';
import { canEdit } from '../access';
import { loadItinerary } from '../itinerary-data';
import { Step06Client } from './step06-client';

/** Krok 06 · Atrakcie – čo je v pláne (z kroku 05) so vstupným podľa veku + katalóg zo seedu s „+ Deň N“. */
export async function Step06({ access }: { access: TripAccess }) {
  const { trip, role } = access;
  if (!trip.startDate)
    return <Notice tone="info">Atrakcie sa plánujú po výbere letu (krok 02) a trase (krok 05).</Notice>;
  const data = await loadItinerary(trip.id);
  return (
    <Step06Client
      tripId={trip.id}
      days={data.days}
      catalog={data.catalog}
      pax={data.pax}
      totals={data.totals}
      canEdit={canEdit(role)}
    />
  );
}
