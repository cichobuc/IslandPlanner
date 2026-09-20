import { dayPartForArrival, dayPartForDeparture } from './food';
import { round2 } from './money';
import { allocateNights, presetForDays, type Preset } from './presets';
import { TZ_KEF, addDays, daysBetween, hoursBetween, localParts } from './time';
import type { DayInput, FlightSelectionInput, LodgingStayInput, ScenarioKey, TripSnapshot } from './types';

export type Change = { path: string; before: unknown; after: unknown; labelSk: string; labelCs?: string };
export type Suggestion = { path: string; current: unknown; suggested: unknown; labelSk: string };

export type FlightDerived = {
  startDate: string;
  endDate: string;
  days: number;
  nights: number;
  parkingDays: number;
  vehicleDays: number;
  arrivalMinutesOfDay: number;
  departureMinutesOfDay: number;
  lateArrival: boolean;
  earlyDeparture: boolean;
  firstDayPart: ReturnType<typeof dayPartForArrival>;
  lastDayPart: ReturnType<typeof dayPartForDeparture>;
};

/** Odvodené hodnoty z letu (docs/05 §3). Časy v lokálnom čase KEF. */
export function deriveFromFlight(flight: FlightSelectionInput, homeTz = 'Europe/Bratislava'): FlightDerived {
  const arr = localParts(flight.outArrAt, TZ_KEF);
  const dep = localParts(flight.retDepAt, TZ_KEF);
  const homeDep = localParts(flight.outDepAt, homeTz);
  const homeArr = localParts(flight.retArrAt, homeTz);
  const startDate = arr.date;
  const endDate = dep.date;
  const days = daysBetween(startDate, endDate) + 1;
  // parkovanie: od odchodu z domu po návrat; +1 ak odlet < 07:00 (prespáva sa pri letisku)
  let parkingDays = daysBetween(homeDep.date, homeArr.date) + 1;
  if (homeDep.minutesOfDay < 7 * 60) parkingDays += 1;
  // prenájom: pickup po prílete, return 3 h pred odletom, 2 h buffer
  const rentalHours = hoursBetween(flight.outArrAt, flight.retDepAt) - 3 - 2;
  const vehicleDays = Math.max(1, Math.ceil(rentalHours / 24));
  return {
    startDate,
    endDate,
    days,
    nights: days - 1,
    parkingDays,
    vehicleDays,
    arrivalMinutesOfDay: arr.minutesOfDay,
    departureMinutesOfDay: dep.minutesOfDay,
    lateArrival: arr.minutesOfDay > 20 * 60,
    earlyDeparture: dep.minutesOfDay < 10 * 60,
    firstDayPart: dayPartForArrival(arr.minutesOfDay),
    lastDayPart: dayPartForDeparture(dep.minutesOfDay),
  };
}

export type ItineraryGenerator = (ctx: {
  days: number;
  startDate: string;
  preset: Preset;
  regionsByNight: string[];
  existing: DayInput[];
  snapshot: TripSnapshot;
}) => DayInput[];

/** Kostra dní z presetu: deň i prespáva v regionsByNight[i-1]; zamknuté dni ostávajú. */
export const skeletonItinerary: ItineraryGenerator = ({
  days,
  startDate,
  preset,
  regionsByNight,
  existing,
}) => {
  const kmPerNight = preset.totalKm / Math.max(1, days);
  const out: DayInput[] = [];
  for (let i = 1; i <= days; i++) {
    const prev = existing.find((d) => d.dayIndex === i);
    if (prev?.locked) {
      out.push({ ...prev, date: addDays(startDate, i - 1) });
      continue;
    }
    out.push({
      id: prev?.id ?? `day-${i}`,
      dayIndex: i,
      date: addDays(startDate, i - 1),
      overnightRegionId: i <= regionsByNight.length ? regionsByNight[i - 1] : null,
      driveKm: round2(kmPerNight),
      driveMin: Math.round((kmPerNight / 70) * 60),
      locked: false,
      stops: prev?.stops.filter((s) => s.isManual) ?? [],
    });
  }
  return out;
};

const SCENARIOS: ScenarioKey[] = ['car', 'camper'];

export type CascadeResult = {
  snapshot: TripSnapshot;
  derived: FlightDerived;
  changes: Change[];
  suggestions: Suggestion[];
};

/**
 * Kaskáda po výbere letu (docs/05 §3, K5/K6): mení len is_manual = false; ručné dostanú návrh.
 */
export function applyFlightSelection(
  snapshot: TripSnapshot,
  flight: FlightSelectionInput,
  opts: { generateItinerary?: ItineraryGenerator } = {},
): CascadeResult {
  const derived = deriveFromFlight(flight, snapshot.trip.homeTz);
  const changes: Change[] = [];
  const suggestions: Suggestion[] = [];
  const gen = opts.generateItinerary ?? skeletonItinerary;

  const prevDays =
    snapshot.trip.startDate && snapshot.trip.endDate
      ? daysBetween(snapshot.trip.startDate, snapshot.trip.endDate) + 1
      : null;
  if (snapshot.trip.startDate !== derived.startDate || snapshot.trip.endDate !== derived.endDate) {
    changes.push({
      path: 'trip.dates',
      before: [snapshot.trip.startDate, snapshot.trip.endDate],
      after: [derived.startDate, derived.endDate],
      labelSk: `Termín ${derived.startDate} – ${derived.endDate}`,
    });
  }
  if (prevDays !== derived.days)
    changes.push({
      path: 'trip.days',
      before: prevDays,
      after: derived.days,
      labelSk: `Dni ${prevDays ?? '–'} → ${derived.days}, noci ${derived.nights}`,
    });

  const preset = presetForDays(derived.days, {
    interests: snapshot.trip.interests,
    pace: snapshot.trip.pace,
  });
  const regionsByNight = allocateNights(preset, derived.nights, {
    lateArrival: derived.lateArrival,
    earlyDeparture: derived.earlyDeparture,
  });

  const itinerary = gen({
    days: derived.days,
    startDate: derived.startDate,
    preset,
    regionsByNight,
    existing: snapshot.itinerary,
    snapshot,
  });
  const lockedKept = snapshot.itinerary.filter((d) => d.locked && d.dayIndex <= derived.days).length;
  const regenerated = itinerary.length - lockedKept;
  if (regenerated > 0 || itinerary.length !== snapshot.itinerary.length)
    changes.push({
      path: 'itinerary',
      before: snapshot.itinerary.length,
      after: itinerary.length,
      labelSk: `Itinerár pregenerovaný (${preset.key}, ${derived.days} dní${lockedKept ? `, ${lockedKept} zamknuté zachované` : ''})`,
    });

  // vozidlo per scenár
  const vehicle = { ...snapshot.vehicle };
  for (const key of SCENARIOS) {
    const v = vehicle[key];
    if (!v) continue;
    if (v.days === derived.vehicleDays) continue;
    if (v.isManual)
      suggestions.push({
        path: `vehicle.${key}.days`,
        current: v.days,
        suggested: derived.vehicleDays,
        labelSk: `Dni prenájmu (${key}) ${v.days} → ${derived.vehicleDays}?`,
      });
    else {
      vehicle[key] = { ...v, days: derived.vehicleDays };
      changes.push({
        path: `vehicle.${key}.days`,
        before: v.days,
        after: derived.vehicleDays,
        labelSk: `Prenájom (${key === 'car' ? 'auto' : 'karavan'}) ${v.days} → ${derived.vehicleDays} dní`,
      });
    }
  }

  // noci per scenár: existujúca noc (index) ostáva ak je ručná; inak sa nastaví región z itinerára
  const lodgingStays: Partial<Record<ScenarioKey, LodgingStayInput[]>> = { ...snapshot.lodgingStays };
  for (const key of SCENARIOS) {
    const existing = snapshot.lodgingStays[key] ?? [];
    const next: LodgingStayInput[] = [];
    for (let n = 1; n <= derived.nights; n++) {
      const region =
        itinerary.find((d) => d.dayIndex === n)?.overnightRegionId ?? regionsByNight[n - 1] ?? null;
      const prev = existing.find((s) => s.nightIndex === n);
      const nightDate = addDays(derived.startDate, n - 1);
      if (prev?.isManual) {
        next.push({ ...prev, nightDate });
        if (prev.regionId !== region)
          suggestions.push({
            path: `lodging.${key}.${n}.region`,
            current: prev.regionId,
            suggested: region,
            labelSk: `Noc ${n} (${key}): región ${prev.regionId} → ${region}?`,
          });
        continue;
      }
      next.push(
        prev
          ? {
              ...prev,
              nightDate,
              regionId: region,
              pricePerNight: prev.regionId === region ? prev.pricePerNight : null,
              priceRangeMin: null,
              priceRangeMax: null,
            }
          : {
              id: `${key}-night-${n}`,
              scenarioKey: key,
              nightIndex: n,
              nightDate,
              regionId: region,
              kind: key === 'camper' ? 'camper_site' : 'guesthouse',
              isManual: false,
            },
      );
    }
    const dropped = existing.filter((s) => s.nightIndex > derived.nights);
    if (dropped.some((s) => s.isManual))
      suggestions.push({
        path: `lodging.${key}.dropped`,
        current: dropped.length,
        suggested: 0,
        labelSk: `${dropped.filter((s) => s.isManual).length} ručne priradených nocí (${key}) je mimo nového termínu.`,
      });
    if (existing.length !== next.length)
      changes.push({
        path: `lodging.${key}.nights`,
        before: existing.length,
        after: next.length,
        labelSk: `Noci (${key === 'car' ? 'auto' : 'karavan'}) ${existing.length} → ${next.length}`,
      });
    lodgingStays[key] = next;
  }

  const next: TripSnapshot = {
    ...snapshot,
    trip: { ...snapshot.trip, startDate: derived.startDate, endDate: derived.endDate },
    flight,
    itinerary,
    vehicle,
    lodgingStays,
  };
  return { snapshot: next, derived, changes, suggestions };
}
