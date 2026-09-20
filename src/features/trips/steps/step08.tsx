import { Notice } from '@/components/ui';
import type { TripAccess } from '../access';
import { canEdit } from '../access';
import { loadBudget } from '../budget-data';
import { Step08Client } from './step08-client';

/** Krok 08 · Rozpočet – kategórie → položky, scenáre Auto/Karavan, na osobu, ručné položky, rezerva, export. */
export async function Step08({ access }: { access: TripAccess }) {
  const { trip, role } = access;
  if (!trip.startDate)
    return <Notice tone="info">Rozpočet sa začne skladať po výbere letu (krok 02).</Notice>;
  const b = await loadBudget(trip.id);
  return (
    <Step08Client
      tripId={trip.id}
      tripName={trip.name}
      active={b.active}
      result={b.result}
      travelers={b.snapshot.travelers.map((t) => ({ id: t.id, name: t.name }))}
      manualItems={b.snapshot.manualItems.map((m) => ({ id: m.id, label: m.label }))}
      reservePct={b.snapshot.trip.reservePct}
      budgetTargetPp={b.snapshot.trip.budgetTargetPp ?? null}
      fx={b.snapshot.fx}
      canEdit={canEdit(role)}
    />
  );
}
