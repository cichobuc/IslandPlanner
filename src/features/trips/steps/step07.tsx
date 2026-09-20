import { Notice } from '@/components/ui';
import type { TripAccess } from '../access';
import { canEdit } from '../access';
import { foodBreakdown, loadBudget } from '../budget-data';
import { dateRangeLabel } from '../progress';
import { Step07Client } from './step07-client';

/** Krok 07 · Strava – úroveň + dni s kuchynkou z nocí (05) a časťami dňa z letu (02). */
export async function Step07({ access }: { access: TripAccess }) {
  const { trip, role } = access;
  if (!trip.startDate) return <Notice tone="info">Strava sa počíta po výbere letu (krok 02).</Notice>;
  const budget = await loadBudget(trip.id);
  const { days, total, pax } = foodBreakdown(budget.snapshot, budget.active);
  const other = budget.active === 'car' ? 'camper' : 'car';
  const otherTotal = foodBreakdown(budget.snapshot, other).total.total;
  return (
    <Step07Client
      tripId={trip.id}
      pax={pax}
      food={budget.snapshot.food}
      days={days.map((d, i) => ({ ...d, result: total.days[i] }))}
      total={total}
      otherBranch={{ key: other, total: otherTotal }}
      active={budget.active}
      dates={trip.endDate ? dateRangeLabel(trip.startDate, trip.endDate) : null}
      canEdit={canEdit(role)}
    />
  );
}
