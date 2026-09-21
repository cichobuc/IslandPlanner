import { and, asc, eq, isNull, or } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { ageOn } from '@/engine/ageRules';
import { deriveFromFlight } from '@/engine/cascade';
import { TZ_KEF } from '@/engine/time';
import { PRESETS, resolvePreset } from '@/engine/presets';
import { transportCost, vehicleChecks } from '@/engine/transport';
import { estimateBranch } from '@/engine/transportMode';
import type { Money, TransportMode, VehicleInput } from '@/engine/types';
import type { TripAccess } from '../access';
import { canEdit } from '../access';
import { dateRangeLabel } from '../progress';
import { getRates } from '../rates';
import { computeBudget } from '@/engine/budget';
import { loadFlightInput, loadSnapshot } from '../snapshot';
import { Step03Client } from './step03-client';
import type { BranchCard, Step03Data, VehicleLite, VehicleSel } from './step03-types';

const fmtTime = (iso: string, tz: string) =>
  new Intl.DateTimeFormat('sk-SK', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: tz,
  }).format(new Date(iso));
const amt = (m: unknown) =>
  m && typeof m === 'object' && 'amount' in (m as object) ? Number((m as Money).amount) : 0;

/** Krok 03 · Doprava – rozhodnutie Auto/Karavan (Bez auta v1.1), vozidlá zo seedu + ručné, poistenia, požiadavky, palivo. */
export async function Step03({ access }: { access: TripAccess }) {
  const { trip, role } = access;
  const db = getDb();
  const [travelers, options, selections, days, flight, rates] = await Promise.all([
    db
      .select()
      .from(schema.travelers)
      .where(eq(schema.travelers.tripId, trip.id))
      .orderBy(asc(schema.travelers.sortOrder)),
    db
      .select()
      .from(schema.vehicleOptions)
      .where(or(isNull(schema.vehicleOptions.tripId), eq(schema.vehicleOptions.tripId, trip.id)))
      .orderBy(asc(schema.vehicleOptions.kind), asc(schema.vehicleOptions.class)),
    db.select().from(schema.vehicleSelection).where(eq(schema.vehicleSelection.tripId, trip.id)),
    db
      .select()
      .from(schema.itineraryDays)
      .where(and(eq(schema.itineraryDays.tripId, trip.id), eq(schema.itineraryDays.scenarioKey, 'drive'))),
    loadFlightInput(trip.id),
    getRates(),
  ]);
  const pax = travelers.length || 1;
  const derived = flight ? deriveFromFlight(flight) : null;
  const rentalDays = derived?.vehicleDays ?? trip.minDays;
  const tripDays = derived?.days ?? trip.minDays;
  const presetKey = resolvePreset(trip.routePreset, tripDays, { interests: trip.interests, pace: trip.pace }).key;
  const kmItin = days.reduce((a, d) => a + Number(d.driveKm ?? 0), 0);
  const km = kmItin > 0 ? Math.round(kmItin) : PRESETS[presetKey].totalKm;
  const viaVadlaheidi = presetKey.startsWith('ring');
  const tripDate = trip.startDate ?? `${trip.targetMonth.slice(0, 7)}-15`;
  const drivers = travelers
    .filter((t) => t.isDriver)
    .map((t) => ({
      name: t.name,
      age: ageOn(t, tripDate),
      years: t.driverSince
        ? Math.max(0, Number(tripDate.slice(0, 4)) - Number(t.driverSince.slice(0, 4)))
        : 1,
      hasCreditCard: t.hasCreditCard,
    }));
  const checkedBags = travelers.reduce((a, t) => a + t.bags.checked20 + t.bags.checked32, 0);
  const fx = { ISK_EUR: rates.fx.ISK_EUR };
  const fuelIsk = { petrol: rates.fuel.petrol, diesel: rates.fuel.diesel };

  const selection: Step03Data['selection'] = {};
  for (const s of selections) {
    if (s.scenarioKey !== 'car' && s.scenarioKey !== 'camper') continue;
    selection[s.scenarioKey] = {
      vehicleOptionId: s.vehicleOptionId,
      days: s.days ?? rentalDays,
      insuranceChosen: s.insuranceChosen ?? [],
      extrasChosen: s.extrasChosen ?? {},
      consumptionOverride: s.consumptionOverride ? Number(s.consumptionOverride) : null,
      fuelPriceOverride: s.fuelPriceOverride ? Number(s.fuelPriceOverride) : null,
    } satisfies VehicleSel;
  }

  const vehicles: VehicleLite[] = options.map((o) => {
    const sel = selection[o.kind]?.vehicleOptionId === o.id ? selection[o.kind] : null;
    const insurance = o.insurance ?? {};
    const insuranceChosen =
      sel?.insuranceChosen ??
      Object.keys(insurance).filter((k) => !insurance[k].included && (k === 'scdw' || k === 'gp'));
    const extrasChosen =
      sel?.extrasChosen ?? (drivers.length > 1 && o.extras?.second_driver ? { second_driver: 1 } : {});
    const v: VehicleInput = {
      scenarioKey: o.kind,
      kind: o.kind,
      class: o.class,
      name: o.name,
      days: sel?.days ?? rentalDays,
      pricePerDay: o.pricePerDay,
      consumptionL100km: Number(o.consumptionL100km),
      fuel: o.fuel,
      insurance,
      insuranceChosen,
      extras: o.extras ?? {},
      extrasChosen,
      deposit: o.deposit ?? null,
      seats: o.seats,
      sleeps: o.sleeps ?? 0,
      luggageCapacity: o.luggageCapacity ?? 2,
      consumptionOverride: sel?.consumptionOverride ?? null,
      fuelPriceOverride: sel?.fuelPriceOverride ?? null,
    };
    const cost = transportCost(v, { totalKm: km, fuelIskPerL: fuelIsk, fx, viaVadlaheidi });
    return {
      id: o.id,
      kind: o.kind,
      class: o.class,
      provider: o.provider,
      name: o.name,
      seats: o.seats,
      sleeps: o.sleeps ?? 0,
      fuel: o.fuel,
      consumption: Number(o.consumptionL100km),
      pricePerDay: amt(o.pricePerDay),
      source: o.pricePerDay.source,
      insurance,
      extras: o.extras ?? {},
      deposit: amt(o.deposit),
      driverMinAge: o.driverMinAge,
      driverMinYears: o.driverMinYears,
      kmLimitPerDay: o.kmLimitPerDay,
      heater: Boolean(o.heater),
      luggageCapacity: o.luggageCapacity ?? 2,
      fRoadsAllowed: Boolean(o.fRoadsAllowed),
      url: o.url,
      notes: o.notes,
      verifiedAt: o.verifiedAt,
      cost: {
        rental: cost.rental,
        insurance: cost.insurance,
        extras: cost.extras,
        fuel: cost.fuel,
        tolls: cost.tolls,
        total: cost.total,
        liters: cost.liters,
        deposit: cost.deposit,
      },
      checks: vehicleChecks(v, {
        pax,
        checkedBags,
        drivers,
        driverMinAge: o.driverMinAge,
        driverMinYears: o.driverMinYears,
      }),
    };
  });

  const flightTotal = flight
    ? amt(flight.farePp) * pax +
      amt(flight.bagsTotal) +
      amt(flight.parkingTotal) +
      amt(flight.airportAccessTotal)
    : 0;
  // Auto / Karavan: tá istá suma ako v hlavičke a kroku 08 (computeBudget nad snapshotom – noci, vozidlo/odhad, strava,
  // atrakcie, rezerva); Bez auta ostáva odhad zo seedu. Bez letu ešte nie sú dni → odhad pre všetky.
  const budget = flight ? computeBudget(await loadSnapshot(trip.id)) : null;
  const branches: BranchCard[] = (['car', 'camper', 'no_car'] as TransportMode[]).map((mode) => {
    const sc = mode !== 'no_car' ? budget?.scenarios[mode] : null;
    if (sc) {
      const tr = sc.byCategory.transport.lines;
      const sumIds = (ids: string[]) => tr.filter((l) => ids.includes(l.id)).reduce((a, l) => a + l.amount, 0);
      return {
        mode,
        total: Math.round(sc.group),
        min: Math.round(sc.min),
        max: Math.round(sc.max),
        perPerson: Math.round(sc.perPerson),
        vehicle: Math.round(sumIds(['rental', 'insurance', 'extras', 'oneway'])),
        fuel: Math.round(sumIds(['fuel', 'tolls'])),
        lodging: Math.round(sc.byCategory.lodging.amount),
        food: Math.round(sc.byCategory.food.amount),
        tours: 0,
      };
    }
    const e = estimateBranch(mode, {
      days: tripDays,
      pax,
      pace: trip.pace,
      interests: trip.interests,
      routePreset: trip.routePreset,
      startDate: trip.startDate ?? `${trip.targetMonth.slice(0, 7)}-15`,
      fx,
      fuelIskPerL: fuelIsk,
      food: { level: 'budget' },
    });
    return {
      mode,
      total: Math.round(e.total.mid + flightTotal),
      min: Math.round(e.total.min + flightTotal),
      max: Math.round(e.total.max + flightTotal),
      perPerson: Math.round((e.total.mid + flightTotal) / pax),
      vehicle: Math.round(e.vehicle),
      fuel: Math.round(e.fuel),
      lodging: Math.round(e.lodging.mid),
      food: Math.round(e.food),
      tours: Math.round(e.tours),
    };
  });

  const data: Step03Data = {
    tripId: trip.id,
    mode: trip.transportMode,
    pax,
    days: rentalDays,
    km,
    kmSource: kmItin > 0 ? 'itinerary' : 'preset',
    presetKey,
    flightTotal,
    pickup: flight ? fmtTime(flight.outArrAt, TZ_KEF) : null,
    ret: flight
      ? fmtTime(new Date(Date.parse(flight.retDepAt) - 3 * 3600 * 1000).toISOString(), TZ_KEF)
      : null,
    dates: trip.startDate && trip.endDate ? dateRangeLabel(trip.startDate, trip.endDate) : null,
    drivers,
    branches,
    vehicles,
    selection,
    rates: {
      fx: rates.fx.ISK_EUR,
      fxSource: rates.fx.source,
      petrol: rates.fuel.petrol,
      diesel: rates.fuel.diesel,
      fuelSource: rates.fuel.source,
    },
    viaVadlaheidi,
    canEdit: canEdit(role),
  };
  return <Step03Client data={data} />;
}
