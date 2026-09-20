import { round2 } from './money';
import { addDays, daysBetween } from './time';
import type { BagType, Bags, MoneySource, PriceRuleTier } from './types';

/** Jednosmerná cena za deň v EUR (už prepočítaná zo zdrojovej meny). */
export type Fare = {
  origin: string;
  destination: string;
  date: string; // YYYY-MM-DD
  price: number; // EUR na osobu
  airlines: string[]; // segmenty, napr. ['FR','U2']
  transfers: number;
  hub?: string | null;
  /** prestup cez noc na hube (počíta sa nocľah) */
  hubNight?: boolean;
  departureAt?: string | null; // ISO lokálny čas odletu
  arrivalAt?: string | null;
  source: MoneySource;
  connectorId: string;
  deepLink?: string | null;
  legs?: {
    airline: string;
    from: string;
    to: string;
    date: string;
    dep?: string | null;
    arr?: string | null;
    price: number;
  }[];
};

export type ComboFilters = {
  directOnly?: boolean;
  maxTransfers?: number;
  airlines?: string[]; // whitelist
  departAfter?: string; // HH:MM lokálne
  returnBefore?: string; // HH:MM
};

export type ComboInput = {
  origins: string[];
  outFares: Fare[]; // origin → KEF
  retFares: Fare[]; // KEF → origin
  minDays: number;
  maxDays: number;
  pax: number;
  travelersBags: Bags[]; // per cestujúci
  /** cena batožiny za segment pre airline a typ (stred rozsahu), EUR */
  bagPrice: (airline: string, type: BagType) => number;
  /** parkovanie pri letisku podľa dní (null = bez parkovania) */
  parkingPrice: (origin: string, days: number) => number | null;
  /** cesta domov → letisko a späť (skupina), EUR */
  accessCost: (origin: string) => number;
  /** nocľah na hube za skupinu (ceil(pax/2) izieb) */
  hubNightCost: (hub: string) => number;
  filters?: ComboFilters;
  limit?: number;
};

export type Combo = {
  id: string;
  origin: string;
  outDate: string;
  retDate: string;
  days: number;
  nights: number;
  out: Fare;
  ret: Fare;
  farePp: number;
  fareGroup: number;
  bags: number;
  parking: number | null;
  parkingDays: number;
  access: number;
  hubNights: number;
  totalGroup: number;
  totalPp: number;
  source: MoneySource;
  transfers: number;
  /** pohodlie: 0 = najlepšie; malus za prestupy a odlet 05:00–07:00 */
  comfortPenalty: number;
};

export type ComboResult = {
  combos: Combo[];
  heatmap: Record<string, number>; // outDate → min totalGroup
  heatmapPp: Record<string, number>;
  stats: { candidates: number; kept: number; perOrigin: Record<string, number> };
};

const RANK: Record<MoneySource, number> = { manual: 0, api: 1, seed: 2, estimate: 3 };
const worst = (...s: MoneySource[]) => s.reduce((a, b) => (RANK[b] > RANK[a] ? b : a), 'manual');
const hhmm = (iso: string | null | undefined) => (iso ? iso.slice(11, 16) : null);

/** Cena batožiny pre celú skupinu: každý cestujúci × každý segment (cabin_small je v cene). */
export function bagsTotal(
  travelersBags: Bags[],
  out: Fare,
  ret: Fare,
  bagPrice: ComboInput['bagPrice'],
): number {
  const segments = [
    ...(out.legs?.map((l) => l.airline) ?? out.airlines),
    ...(ret.legs?.map((l) => l.airline) ?? ret.airlines),
  ];
  let total = 0;
  for (const bags of travelersBags) {
    for (const airline of segments) {
      total += (bags.cabin10 ?? 0) * bagPrice(airline, 'cabin_10');
      total += (bags.checked20 ?? 0) * bagPrice(airline, 'checked_20');
      total += (bags.checked32 ?? 0) * bagPrice(airline, 'checked_32');
    }
  }
  return round2(total);
}

/** Cena parkovania podľa cenníka (tiers po dňoch + extraDayPrice, alebo perDay). */
export function parkingFromRules(rules: PriceRuleTier[], days: number): number {
  const perDay = rules.find((r): r is { perDay: number } => 'perDay' in r);
  if (perDay) return round2(perDay.perDay * days);
  const tiers = rules
    .filter((r): r is { days: number; price: number } => 'days' in r)
    .sort((a, b) => a.days - b.days);
  const extra = rules.find((r): r is { extraDayPrice: number } => 'extraDayPrice' in r)?.extraDayPrice ?? 0;
  if (!tiers.length) return 0;
  const exact = tiers.find((t) => t.days >= days);
  if (exact) {
    // najlacnejšia z tierov ≥ days alebo najbližší nižší tier + extra dni
    const lower = [...tiers].reverse().find((t) => t.days <= days);
    const viaLower = lower ? lower.price + (days - lower.days) * extra : Infinity;
    return round2(Math.min(exact.price, viaLower));
  }
  const top = tiers[tiers.length - 1];
  return round2(top.price + (days - top.days) * extra);
}

function passes(f: Fare, filters: ComboFilters | undefined, dir: 'out' | 'ret'): boolean {
  if (!filters) return true;
  if (filters.directOnly && f.transfers > 0) return false;
  if (filters.maxTransfers != null && f.transfers > filters.maxTransfers) return false;
  if (filters.airlines?.length && !f.airlines.every((a) => filters.airlines!.includes(a))) return false;
  if (dir === 'out' && filters.departAfter) {
    const t = hhmm(f.departureAt);
    if (t && t < filters.departAfter) return false;
  }
  if (dir === 'ret' && filters.returnBefore) {
    const t = hhmm(f.arrivalAt);
    if (t && t > filters.returnBefore) return false;
  }
  return true;
}

function comfortPenalty(out: Fare, ret: Fare): number {
  let p = (out.transfers + ret.transfers) * 2 + (out.hubNight ? 3 : 0) + (ret.hubNight ? 3 : 0);
  const t = hhmm(out.departureAt);
  if (t && t >= '05:00' && t < '07:00') p += 1;
  if (t && t < '05:00') p += 2;
  return p;
}

/** Všetky (out, ret) kombinácie s dĺžkou pobytu v [minDays, maxDays], zoradené podľa celkovej ceny skupiny (docs/05 §2). */
export function buildCombos(input: ComboInput): ComboResult {
  const byOriginOut = new Map<string, Fare[]>();
  const byOriginRet = new Map<string, Map<string, Fare[]>>();
  for (const f of input.outFares) {
    if (!input.origins.includes(f.origin) || !passes(f, input.filters, 'out')) continue;
    (byOriginOut.get(f.origin) ?? byOriginOut.set(f.origin, []).get(f.origin)!).push(f);
  }
  for (const f of input.retFares) {
    if (!input.origins.includes(f.destination) || !passes(f, input.filters, 'ret')) continue;
    const m = byOriginRet.get(f.destination) ?? byOriginRet.set(f.destination, new Map()).get(f.destination)!;
    (m.get(f.date) ?? m.set(f.date, []).get(f.date)!).push(f);
  }

  const combos: Combo[] = [];
  const perOrigin: Record<string, number> = {};
  let candidates = 0;
  for (const origin of input.origins) {
    perOrigin[origin] = 0;
    const outs = byOriginOut.get(origin) ?? [];
    const rets = byOriginRet.get(origin);
    if (!rets) continue;
    const access = input.accessCost(origin);
    for (const out of outs) {
      for (let len = input.minDays - 1; len <= input.maxDays - 1; len++) {
        const retDate = addDays(out.date, len);
        for (const ret of rets.get(retDate) ?? []) {
          candidates++;
          const days = daysBetween(out.date, retDate) + 1;
          const farePp = round2(out.price + ret.price);
          const bags = bagsTotal(input.travelersBags, out, ret, input.bagPrice);
          // parkovanie: od odchodu z domu po návrat (+1 deň pri odlete pred 07:00 = prespanie pri letisku)
          const early = (hhmm(out.departureAt) ?? '09:00') < '07:00';
          const parkingDays = days + (early ? 1 : 0) + (ret.hubNight ? 1 : 0);
          const parking = input.parkingPrice(origin, parkingDays);
          const hubNights =
            (out.hubNight && out.hub ? input.hubNightCost(out.hub) : 0) +
            (ret.hubNight && ret.hub ? input.hubNightCost(ret.hub) : 0);
          const totalGroup = round2(farePp * input.pax + bags + (parking ?? 0) + access + hubNights);
          combos.push({
            id: `${origin}-${out.date}-${retDate}-${out.connectorId}-${ret.connectorId}`,
            origin,
            outDate: out.date,
            retDate,
            days,
            nights: days - 1,
            out,
            ret,
            farePp,
            fareGroup: round2(farePp * input.pax),
            bags,
            parking,
            parkingDays,
            access,
            hubNights: round2(hubNights),
            totalGroup,
            totalPp: round2(totalGroup / input.pax),
            source: worst(out.source, ret.source),
            transfers: out.transfers + ret.transfers,
            comfortPenalty: comfortPenalty(out, ret),
          });
          perOrigin[origin]++;
        }
      }
    }
  }
  combos.sort((a, b) => a.totalGroup - b.totalGroup || a.comfortPenalty - b.comfortPenalty);
  const heatmap: Record<string, number> = {};
  const heatmapPp: Record<string, number> = {};
  for (const c of combos) {
    if (heatmap[c.outDate] == null || c.totalGroup < heatmap[c.outDate]) {
      heatmap[c.outDate] = c.totalGroup;
      heatmapPp[c.outDate] = c.totalPp;
    }
  }
  const limit = input.limit ?? 50;
  return {
    combos: combos.slice(0, limit),
    heatmap,
    heatmapPp,
    stats: { candidates, kept: combos.length, perOrigin },
  };
}

/**
 * Self-transfer: spojí segment origin→hub so segmentom hub→KEF (min. 3 h prestup, inak ďalší deň s nocľahom).
 * Bez časov sa predpokladá rovnaký deň (odhad).
 */
export function composeSelfTransfer(first: Fare[], second: Fare[], minTransferMin = 180): Fare[] {
  const secondByDate = new Map<string, Fare[]>();
  for (const s of second) (secondByDate.get(s.date) ?? secondByDate.set(s.date, []).get(s.date)!).push(s);
  const out: Fare[] = [];
  for (const a of first) {
    const arr = a.arrivalAt ? Date.parse(a.arrivalAt) : null;
    const candidates: { b: Fare; hubNight: boolean }[] = [];
    for (const b of secondByDate.get(a.date) ?? []) {
      const dep = b.departureAt ? Date.parse(b.departureAt) : null;
      if (arr != null && dep != null) {
        if (dep - arr < minTransferMin * 60_000) continue; // < 3 h → vylúčené
        candidates.push({ b, hubNight: false });
      } else candidates.push({ b, hubNight: false });
    }
    for (const b of secondByDate.get(addDays(a.date, 1)) ?? []) candidates.push({ b, hubNight: true });
    if (!candidates.length) continue;
    // najlacnejšia kombinácia (nocľah zohľadní combo cez hubNight)
    candidates.sort((x, y) => x.b.price - y.b.price || Number(x.hubNight) - Number(y.hubNight));
    const { b, hubNight } = candidates[0];
    out.push({
      origin: a.origin,
      destination: b.destination,
      date: a.date,
      price: round2(a.price + b.price),
      airlines: [...a.airlines, ...b.airlines],
      transfers: 1 + a.transfers + b.transfers,
      hub: a.destination,
      hubNight,
      departureAt: a.departureAt ?? null,
      arrivalAt: b.arrivalAt ?? null,
      source: worst(a.source, b.source),
      connectorId: `${a.connectorId}+${b.connectorId}`,
      deepLink: a.deepLink ?? null,
      legs: [
        ...(a.legs ?? [
          {
            airline: a.airlines[0],
            from: a.origin,
            to: a.destination,
            date: a.date,
            dep: a.departureAt,
            arr: a.arrivalAt,
            price: a.price,
          },
        ]),
        ...(b.legs ?? [
          {
            airline: b.airlines[0],
            from: b.origin,
            to: b.destination,
            date: b.date,
            dep: b.departureAt,
            arr: b.arrivalAt,
            price: b.price,
          },
        ]),
      ],
    });
  }
  return out;
}
