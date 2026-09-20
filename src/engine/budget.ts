import { entryTotal } from './ageRules';
import { deriveFromFlight } from './cascade';
import { foodTotal, type FoodDayInput } from './food';
import { campingCardDecision, kitchenByNight, stayCost } from './lodging';
import { confidenceOf, mergeConfidence, rangeFor, round2, sum, toEur } from './money';
import { splitAmount } from './split';
import { daysBetween, inSeason } from './time';
import { transportCost } from './transport';
import type {
  BudgetCategory,
  BudgetLine,
  BudgetResult,
  CategoryTotals,
  Confidence,
  MoneySource,
  ScenarioTotals,
  TripSnapshot,
} from './types';

const CATEGORIES: BudgetCategory[] = [
  'flights',
  'lodging',
  'transport',
  'attractions',
  'food',
  'other',
  'reserve',
];

type LineDraft = Omit<BudgetLine, 'min' | 'max' | 'perTraveler' | 'confidence'> & {
  min?: number;
  max?: number;
  confidence?: Confidence;
  perPerson?: Record<string, number>;
  customShares?: Record<string, number> | null;
};

function finalize(d: LineDraft, memberIds: string[]): BudgetLine {
  const confidence = d.confidence ?? confidenceOf(d.source);
  const range = d.min != null && d.max != null ? { min: d.min, max: d.max } : rangeFor(d.amount, confidence);
  const perTraveler = splitAmount(d.amount, d.split, memberIds, {
    perPerson: d.perPerson,
    customShares: d.customShares,
  });
  return {
    ...d,
    amount: round2(d.amount),
    min: round2(range.min),
    max: round2(range.max),
    confidence,
    perTraveler,
  };
}

/** Dni stravy vetvy: kuchynka ráno/večer z nocí, prvý/posledný deň podľa časov letu (zdieľané s krokom 07). */
export function foodDaysFor(snapshot: TripSnapshot, key: 'car' | 'camper'): FoodDayInput[] {
  const { days } = tripDays(snapshot);
  const stays = snapshot.lodgingStays[key] ?? [];
  const kitchen = kitchenByNight(stays, key === 'camper');
  const derived = snapshot.flight ? deriveFromFlight(snapshot.flight, snapshot.trip.homeTz) : null;
  return Array.from({ length: days }, (_, i) => {
    const dayIndex = i + 1;
    const date = snapshot.itinerary.find((d) => d.dayIndex === dayIndex)?.date ?? `day-${dayIndex}`;
    const override = snapshot.food.dayOverrides?.[date];
    return {
      date,
      level: override,
      kitchenMorning: dayIndex === 1 ? false : (kitchen[dayIndex - 1] ?? false),
      kitchenEvening: dayIndex === days ? false : (kitchen[dayIndex] ?? false),
      part: dayIndex === 1 ? (derived?.firstDayPart ?? 'from_lunch') : dayIndex === days ? (derived?.lastDayPart ?? 'until_lunch') : 'full',
    };
  });
}

/** Počet 20/32 kg kufrov skupiny (pre vozidlá). */
export const checkedBagsCount = (snapshot: TripSnapshot) =>
  snapshot.travelers.reduce((a, t) => a + (t.bags?.checked20 ?? 0) + (t.bags?.checked32 ?? 0), 0);

export function tripDays(snapshot: TripSnapshot): { days: number; nights: number } {
  if (snapshot.flight) {
    const d = deriveFromFlight(snapshot.flight, snapshot.trip.homeTz);
    return { days: d.days, nights: d.nights };
  }
  if (snapshot.trip.startDate && snapshot.trip.endDate) {
    const days = daysBetween(snapshot.trip.startDate, snapshot.trip.endDate) + 1;
    return { days, nights: days - 1 };
  }
  const days = Math.max(snapshot.itinerary.length, 1);
  return { days, nights: days - 1 };
}

/** Rozpočet (docs/05 §8): scenáre car/camper, kategórie, skupina, na osobu, per cestujúci. */
export function computeBudget(snapshot: TripSnapshot): BudgetResult {
  const members = snapshot.travelers.map((t) => t.id);
  const pax = Math.max(1, members.length);
  const { days, nights } = tripDays(snapshot);
  const fx = snapshot.fx;
  const scenarios: BudgetResult['scenarios'] = {};

  // --- spoločné (nezávislé od scenára) ---
  const flightLines: LineDraft[] = [];
  const f = snapshot.flight;
  if (f) {
    const farePp = toEur(f.farePp, fx);
    const src: MoneySource = f.isEstimate ? 'estimate' : f.farePp.source;
    flightLines.push({
      id: 'fare',
      category: 'flights',
      label: `Letenky ${f.origin} ⇄ ${f.dest ?? 'KEF'}`,
      amount: round2(farePp * pax),
      source: src,
      split: 'person',
      perPerson: Object.fromEntries(members.map((m) => [m, farePp])),
      step: 2,
    });
    if (f.bagsPerTraveler && Object.keys(f.bagsPerTraveler).length) {
      const pp = Object.fromEntries(members.map((m) => [m, toEur(f.bagsPerTraveler?.[m], fx)]));
      flightLines.push({
        id: 'bags',
        category: 'flights',
        label: 'Batožina',
        amount: sum(Object.values(pp)),
        source: 'seed',
        split: 'person',
        perPerson: pp,
        step: 2,
      });
    } else if (f.bagsTotal)
      flightLines.push({
        id: 'bags',
        category: 'flights',
        label: 'Batožina',
        amount: toEur(f.bagsTotal, fx),
        source: f.bagsTotal.source,
        split: 'group',
        step: 2,
      });
    if (f.parkingTotal)
      flightLines.push({
        id: 'parking',
        category: 'flights',
        label: `Parkovanie ${f.origin}`,
        amount: toEur(f.parkingTotal, fx),
        source: f.parkingTotal.source,
        split: 'group',
        step: 2,
      });
    if (f.airportAccessTotal)
      flightLines.push({
        id: 'access',
        category: 'flights',
        label: 'Cesta na letisko a späť',
        amount: toEur(f.airportAccessTotal, fx),
        source: f.airportAccessTotal.source,
        split: 'group',
        step: 2,
      });
    if (f.hubNightTotal)
      flightLines.push({
        id: 'hub_night',
        category: 'flights',
        label: 'Nocľah na hube',
        amount: toEur(f.hubNightTotal, fx),
        source: f.hubNightTotal.source,
        split: 'group',
        step: 2,
      });
  }

  // atrakcie z itinerára (vstupné podľa veku v deň návštevy)
  const attractionLines: LineDraft[] = [];
  const warningsCommon: string[] = [];
  for (const day of snapshot.itinerary) {
    for (const stop of day.stops) {
      if (stop.skip || !stop.poi) continue;
      if (!inSeason(day.date, stop.poi.season))
        warningsCommon.push(`${stop.poi.name}: mimo sezóny (${day.date}).`);
      if (stop.entryOverride) {
        attractionLines.push({
          id: `entry-${stop.id}`,
          category: 'attractions',
          label: stop.poi.name,
          amount: toEur(stop.entryOverride, fx),
          source: stop.entryOverride.source,
          split: 'group',
          step: 6,
        });
        continue;
      }
      const e = entryTotal(stop.poi, snapshot.travelers, day.date, fx, { variant: stop.variant });
      if (e.total === 0) continue;
      const people = sum(Object.values(e.perTraveler));
      if (people > 0)
        attractionLines.push({
          id: `entry-${stop.id}`,
          category: 'attractions',
          label: `${stop.poi.name} · vstupné`,
          amount: people,
          source: e.source,
          split: 'person',
          perPerson: e.perTraveler,
          step: 6,
        });
      if (e.vehicle + e.group > 0)
        attractionLines.push({
          id: `park-${stop.id}`,
          category: 'attractions',
          label: `${stop.poi.name} · parkovné`,
          amount: round2(e.vehicle + e.group),
          source: e.source,
          split: 'vehicle',
          step: 6,
        });
    }
  }

  const totalKm = round2(snapshot.itinerary.reduce((a, d) => a + (d.driveKm ?? 0), 0));

  for (const key of ['car', 'camper'] as const) {
    const lines: BudgetLine[] = [];
    const warnings = [...warningsCommon];
    const stays = snapshot.lodgingStays[key] ?? [];
    const vehicle = snapshot.vehicle[key] ?? null;

    // noci
    const campingCard =
      key === 'camper' ? (vehicle?.campingCard ?? campingCardDecision(stays, pax, fx).worthIt) : false;
    for (const s of stays) {
      const c = stayCost(s, pax, Math.max(1, nights), fx, { campingCard });
      lines.push(
        finalize(
          {
            id: `stay-${s.id}`,
            category: 'lodging',
            label: `Noc ${s.nightIndex} · ${s.regionId ?? '?'} · ${s.kind}`,
            amount: c.amount,
            min: c.min,
            max: c.max,
            confidence: c.confidence,
            source: c.source,
            split: 'group',
            step: 4,
            scenarioKey: key,
            note: c.campingCardApplied ? 'Camping Card' : undefined,
          },
          members,
        ),
      );
    }
    if (campingCard) {
      const cc = campingCardDecision(stays, pax, fx);
      lines.push(
        finalize(
          {
            id: 'camping-card',
            category: 'other',
            label: `Camping Card × ${cc.cards}`,
            amount: cc.cost,
            source: 'seed',
            split: 'group',
            step: 4,
            scenarioKey: key,
          },
          members,
        ),
      );
    }

    // doprava
    if (vehicle) {
      const tc = transportCost(vehicle, {
        totalKm,
        fuelIskPerL: snapshot.fuel,
        fx,
        tollCrossings: snapshot.tollsIsk != null ? 0 : undefined,
      });
      lines.push(
        finalize(
          {
            id: 'rental',
            category: 'transport',
            label: `Prenájom ${vehicle.name ?? vehicle.class} × ${vehicle.days} dní`,
            amount: tc.rental,
            source: vehicle.pricePerDay.source,
            confidence: tc.confidence,
            split: 'group',
            step: 3,
            scenarioKey: key,
          },
          members,
        ),
      );
      if (tc.insurance)
        lines.push(
          finalize(
            {
              id: 'insurance',
              category: 'transport',
              label: 'Poistenie vozidla',
              amount: tc.insurance,
              source: vehicle.pricePerDay.source,
              split: 'group',
              step: 3,
              scenarioKey: key,
            },
            members,
          ),
        );
      if (tc.extras)
        lines.push(
          finalize(
            {
              id: 'extras',
              category: 'transport',
              label: 'Doplnky',
              amount: tc.extras,
              source: vehicle.pricePerDay.source,
              split: 'group',
              step: 3,
              scenarioKey: key,
            },
            members,
          ),
        );
      if (tc.oneWay)
        lines.push(
          finalize(
            {
              id: 'oneway',
              category: 'transport',
              label: 'One-way poplatok',
              amount: tc.oneWay,
              source: 'seed',
              split: 'group',
              step: 3,
              scenarioKey: key,
            },
            members,
          ),
        );
      lines.push(
        finalize(
          {
            id: 'fuel',
            category: 'transport',
            label: `Palivo ${totalKm} km · ${tc.liters} l`,
            amount: tc.fuel,
            source: totalKm > 0 ? 'seed' : 'estimate',
            split: 'group',
            step: 3,
            scenarioKey: key,
          },
          members,
        ),
      );
      if (snapshot.tollsIsk)
        lines.push(
          finalize(
            {
              id: 'tolls',
              category: 'transport',
              label: 'Tunel Vaðlaheiði',
              amount: round2(snapshot.tollsIsk * fx.ISK_EUR),
              source: 'seed',
              split: 'group',
              step: 3,
              scenarioKey: key,
            },
            members,
          ),
        );
      const seats = vehicle.seats ?? (vehicle.kind === 'camper' ? 4 : 5);
      if (seats < pax) warnings.push(`Vozidlo (${key}) má ${seats} miest pre ${pax} osôb.`);
      if (vehicle.luggageCapacity != null && vehicle.luggageCapacity < checkedBagsCount(snapshot))
        warnings.push(
          `Batožina sa nezmestí (${checkedBagsCount(snapshot)} kufrov, kapacita ${vehicle.luggageCapacity}).`,
        );
    }

    // strava – kuchynka podľa nocí vetvy
    const foodDays = foodDaysFor(snapshot, key);
    const ft = foodTotal(foodDays, snapshot.food, pax);
    const foodPp = round2(ft.perPerson - ft.firstShopPp);
    lines.push(
      finalize(
        {
          id: 'food',
          category: 'food',
          label: `Strava ${days} dní · ${snapshot.food.level}`,
          amount: round2(foodPp * pax),
          source: snapshot.food.customPrices ? 'manual' : 'seed',
          split: 'person',
          perPerson: Object.fromEntries(members.map((m) => [m, foodPp])),
          step: 7,
          scenarioKey: key,
        },
        members,
      ),
    );
    lines.push(
      finalize(
        {
          id: 'first-shop',
          category: 'food',
          label: 'Prvý nákup',
          amount: round2(ft.firstShopPp * pax),
          source: 'seed',
          split: 'person',
          perPerson: Object.fromEntries(members.map((m) => [m, ft.firstShopPp])),
          step: 7,
          scenarioKey: key,
        },
        members,
      ),
    );

    // spoločné
    for (const d of flightLines) lines.push(finalize(d, members));
    for (const d of attractionLines) lines.push(finalize(d, members));
    for (const m of snapshot.manualItems) {
      if (m.scenarioKey && m.scenarioKey !== key && m.scenarioKey !== 'drive') continue;
      const amt = toEur(m.amount, fx);
      // split person = suma je na osobu (poistenie, SIM); group/vehicle/custom = suma je celkom
      const perPerson = m.split === 'person' ? Object.fromEntries(members.map((id) => [id, amt])) : undefined;
      lines.push(
        finalize(
          {
            id: `manual-${m.id}`,
            category: 'other',
            label: m.label,
            amount: m.split === 'person' ? round2(amt * pax) : amt,
            source: m.amount.source,
            split: m.split,
            perPerson,
            customShares: m.customShares,
            step: 8,
          },
          members,
        ),
      );
    }

    // rezerva
    const subtotal = sum(lines.map((l) => l.amount));
    const reserve = round2((subtotal * snapshot.trip.reservePct) / 100);
    if (reserve > 0)
      lines.push(
        finalize(
          {
            id: 'reserve',
            category: 'reserve',
            label: `Rezerva ${snapshot.trip.reservePct} %`,
            amount: reserve,
            source: 'estimate',
            confidence: 'exact',
            split: 'group',
            step: 8,
          },
          members,
        ),
      );

    scenarios[key] = totals(key, lines, members, pax, snapshot.trip.budgetTargetPp ?? null, warnings);
  }

  const car = scenarios.car?.group ?? Infinity;
  const camper = scenarios.camper?.group ?? Infinity;
  return { pax, days, nights, scenarios, recommended: car <= camper ? 'car' : 'camper' };
}

function totals(
  key: 'car' | 'camper',
  lines: BudgetLine[],
  members: string[],
  pax: number,
  targetPp: number | null,
  warnings: string[],
): ScenarioTotals {
  const byCategory = Object.fromEntries(
    CATEGORIES.map((c) => {
      const ls = lines.filter((l) => l.category === c);
      const t: CategoryTotals = {
        amount: sum(ls.map((l) => l.amount)),
        min: sum(ls.map((l) => l.min)),
        max: sum(ls.map((l) => l.max)),
        confidence: ls.length ? mergeConfidence(...ls.map((l) => l.confidence)) : 'exact',
        lines: ls,
      };
      return [c, t];
    }),
  ) as Record<BudgetCategory, CategoryTotals>;
  const group = sum(lines.map((l) => l.amount));
  const perTraveler: Record<string, number> = {};
  for (const m of members) perTraveler[m] = sum(lines.map((l) => l.perTraveler[m] ?? 0));
  const perPerson = round2(group / pax);
  return {
    key,
    byCategory,
    group,
    min: sum(lines.map((l) => l.min)),
    max: sum(lines.map((l) => l.max)),
    perPerson,
    perTraveler,
    confidence: lines.length ? mergeConfidence(...lines.map((l) => l.confidence)) : 'exact',
    vsTargetPp: targetPp != null ? round2(perPerson - targetPp) : null,
    warnings,
  };
}
