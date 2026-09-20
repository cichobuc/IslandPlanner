import { addDays } from './time';
import type { TripSnapshot } from './types';
import { computeBudget } from './budget';

export type PaymentEvent = {
  date: string;
  label: string;
  amount: number;
  kind: 'pay' | 'hold' | 'deadline';
  step: number;
};

/** Časová os platieb (docs/05 §8b) – zatiaľ len základné udalosti (stub pre v1.1 „Kedy platiť"). */
export function paymentTimeline(
  snapshot: TripSnapshot,
  today: string,
  scenario: 'car' | 'camper' = 'car',
): PaymentEvent[] {
  const start = snapshot.trip.startDate;
  if (!start) return [];
  const budget = computeBudget(snapshot).scenarios[scenario];
  if (!budget) return [];
  const out: PaymentEvent[] = [];
  const cat = budget.byCategory;
  if (cat.flights.amount)
    out.push({
      date: today,
      label: 'Letenky a batožina',
      amount: cat.flights.lines
        .filter((l) => l.id === 'fare' || l.id === 'bags')
        .reduce((a, l) => a + l.amount, 0),
      kind: 'pay',
      step: 2,
    });
  if (cat.transport.amount) {
    out.push({
      date: addDays(start, -120),
      label: 'Rezervácia vozidla (odporúčané)',
      amount: cat.transport.lines.find((l) => l.id === 'rental')?.amount ?? 0,
      kind: 'pay',
      step: 3,
    });
    const dep = snapshot.vehicle[scenario]?.deposit;
    if (dep)
      out.push({
        date: start,
        label: 'Depozit vozidla (blokácia)',
        amount: dep.amount,
        kind: 'hold',
        step: 3,
      });
  }
  if (cat.lodging.amount)
    out.push({
      date: addDays(start, -30),
      label: 'Ubytovanie – storno termíny',
      amount: cat.lodging.amount,
      kind: 'deadline',
      step: 4,
    });
  for (const day of snapshot.itinerary)
    for (const s of day.stops)
      if (s.poi?.bookAheadDays)
        out.push({
          date: addDays(day.date, -s.poi.bookAheadDays),
          label: `Rezervácia: ${s.poi.name}`,
          amount: 0,
          kind: 'deadline',
          step: 6,
        });
  if (cat.flights.lines.some((l) => l.id === 'parking'))
    out.push({
      date: addDays(start, -14),
      label: 'Parkovanie',
      amount: cat.flights.lines.find((l) => l.id === 'parking')?.amount ?? 0,
      kind: 'pay',
      step: 2,
    });
  out.push({
    date: addDays(start, -21),
    label: 'Poistenie, eSIM',
    amount: cat.other.amount,
    kind: 'pay',
    step: 8,
  });
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
