import { and, asc, desc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { deriveFromFlight } from '@/engine/cascade';
import { TZ_KEF, TZ_HOME } from '@/engine/time';
import type { Money } from '@/engine/types';
import type { TripAccess } from '../access';
import { canEdit } from '../access';
import { loadFlightBreakdown } from '../snapshot';
import { Step02Client } from './step02-client';
import type { OptionLite, SearchMeta, SelectedFlight } from './step02-types';

const fmtTime = (d: Date | null, tz: string) =>
  d
    ? new Intl.DateTimeFormat('sk-SK', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: tz,
      }).format(d)
    : '–';
const fmtDateIso = (d: Date, tz: string) => {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
  return p; // YYYY-MM-DD
};
const dm = (iso: string) => `${Number(iso.slice(8, 10))}. ${Number(iso.slice(5, 7))}.`;
const amt = (m: unknown) =>
  m && typeof m === 'object' && 'amount' in (m as object) ? Number((m as Money).amount) : null;

const STALE_MS = 24 * 3600 * 1000;

/** Krok 02 · Letenky – posledné vyhľadávanie pre cestu → kalendár + kombinácie (klient), vybraný let, ručný let. */
export async function Step02({ access }: { access: TripAccess }) {
  const { trip, role } = access;
  const db = getDb();
  const [search] = await db
    .select()
    .from(schema.flightSearches)
    .where(eq(schema.flightSearches.tripId, trip.id))
    .orderBy(desc(schema.flightSearches.createdAt))
    .limit(1);
  const [options, travelers, selection] = await Promise.all([
    search
      ? db
          .select()
          .from(schema.flightOptions)
          .where(and(eq(schema.flightOptions.searchId, search.id)))
          .orderBy(asc(schema.flightOptions.totalGroupAmount))
          .limit(600)
      : Promise.resolve([]),
    db
      .select()
      .from(schema.travelers)
      .where(eq(schema.travelers.tripId, trip.id))
      .orderBy(asc(schema.travelers.sortOrder)),
    db.select().from(schema.flightSelection).where(eq(schema.flightSelection.tripId, trip.id)).limit(1),
  ]);
  const pax = travelers.length || 1;

  const lite: OptionLite[] = options.map((o) => ({
    id: o.id,
    origin: o.origin,
    outDate: fmtDateIso(o.outDepAt, TZ_HOME),
    outDep: fmtTime(o.outDepAt, TZ_HOME),
    outArr: fmtTime(o.outArrAt, TZ_KEF),
    retDate: fmtDateIso(o.retDepAt, TZ_KEF),
    retDep: fmtTime(o.retDepAt, TZ_KEF),
    retArr: fmtTime(o.retArrAt, TZ_HOME),
    days: o.days,
    nights: o.nights,
    airlines: [...new Set([...o.outLegs, ...o.retLegs].map((l) => l.airline))],
    selfTransfer: o.selfTransfer,
    hub: o.transferHub,
    farePp: Number(o.farePp.amount),
    bags: amt(o.bagsTotal) ?? 0,
    parking: amt(o.parkingTotal),
    access: amt(o.airportAccessTotal) ?? 0,
    totalGroup: Number(o.totalGroupAmount),
    totalPp: Number(o.totalPp.amount),
    source: o.totalGroup.source,
    isEstimate: o.isEstimate,
    deepLink: o.deepLink,
  }));

  let selected: SelectedFlight | null = null;
  const sel = selection[0];
  if (sel) {
    const bd = await loadFlightBreakdown(trip.id);
    if (bd) {
      const input = bd.input;
      const derived = deriveFromFlight(input);
      const opt = sel.flightOptionId ? lite.find((o) => o.id === sel.flightOptionId) : null;
      const out = new Date(input.outDepAt);
      const outA = new Date(input.outArrAt);
      const ret = new Date(input.retDepAt);
      const retA = new Date(input.retArrAt);
      const total = bd.totalGroup;
      selected = {
        optionId: sel.flightOptionId,
        manual: sel.isManual,
        origin: input.origin,
        outLabel: `${input.origin} → KEF · ${dm(fmtDateIso(out, TZ_HOME))} ${fmtTime(out, TZ_HOME)} → ${fmtTime(outA, TZ_KEF)}`,
        retLabel: `KEF → ${input.origin} · ${dm(fmtDateIso(ret, TZ_KEF))} ${fmtTime(ret, TZ_KEF)} → ${fmtTime(retA, TZ_HOME)}`,
        days: derived.days,
        nights: derived.nights,
        totalGroup: total,
        totalPp: Math.round((total / pax) * 100) / 100,
        source: sel.isManual ? 'manual' : (opt?.source ?? 'api'),
        deepLink: opt?.deepLink ?? sel.manual?.url ?? null,
        airline: sel.manual?.airline ?? opt?.airlines.join(' + ') ?? null,
        lines: bd.lines.map((l) => ({ ...l, source: l.source as 'api' | 'seed' | 'manual' | 'estimate' })),
        parkingChoices: bd.parkingChoices,
        parkingOptionId: bd.parkingOptionId,
        parkingDays: bd.parkingDays,
      };
    }
  }

  const meta: SearchMeta | null = search
    ? {
        id: search.id,
        createdAt: search.createdAt.toISOString(),
        stale: Date.now() - search.createdAt.getTime() > STALE_MS,
        count: options.length,
        connectorStats: search.connectorStats,
      }
    : null;

  return (
    <Step02Client
      tripId={trip.id}
      month={trip.targetMonth.slice(0, 7)}
      origins={trip.originAirports}
      minDays={trip.minDays}
      maxDays={trip.maxDays}
      pax={pax}
      travelersBags={travelers.map((t) => t.bags)}
      allowSelfTransfer={trip.allowSelfTransfer}
      options={lite}
      selected={selected}
      search={meta}
      canEdit={canEdit(role)}
    />
  );
}
