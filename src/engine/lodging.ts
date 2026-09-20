import { confidenceOf, mergeSource, round2, toEur, type Fx } from './money';
import {
  CAMPING_CARD_ADULTS,
  CAMPING_CARD_EUR,
  CAMPING_TAX_ISK,
  CAMPSITE_SEED,
  LODGING_RANGE,
} from './presets';
import type { Confidence, LodgingKind, LodgingStayInput, Money, MoneySource } from './types';

export type StayCost = {
  stayId: string;
  amount: number;
  min: number;
  max: number;
  source: MoneySource;
  confidence: Confidence;
  hasKitchen: boolean;
  campingCardApplied: boolean;
};

const isCamp = (k: LodgingKind) => k === 'campsite' || k === 'camper_site';

/** Odhad izby z rozpätia seedu (4 os./noc) škálovaný na pax (2 izby = 4 os.; +1 izba na každé 2 osoby). */
export function lodgingEstimate(
  regionId: string | null | undefined,
  kind: LodgingKind,
  pax: number,
): { min: number; max: number } | null {
  const r = LODGING_RANGE[regionId ?? 'south']?.[kind] ?? LODGING_RANGE.south[kind];
  if (!r) return null;
  const factor = Math.max(1, Math.ceil(pax / 2)) / 2; // 4 os. = 1×
  return { min: round2(r[0] * factor), max: round2(r[1] * factor) };
}

/** Kemp: pax × os./noc + elektrina + daň; Camping Card → 0 za osoby v sieti (daň ostáva). */
export function campsiteCost(
  stay: Pick<LodgingStayInput, 'regionId' | 'perPersonNight' | 'electricity' | 'inCampingCardNetwork'>,
  pax: number,
  fx: Fx,
  opts: { campingCard?: boolean; electricity?: boolean } = {},
): { amount: number; source: MoneySource; campingCardApplied: boolean } {
  const seed = CAMPSITE_SEED[stay.regionId ?? 'south'] ?? CAMPSITE_SEED.south;
  const perPerson = stay.perPersonNight ? toEur(stay.perPersonNight, fx) : seed.perPerson * fx.ISK_EUR;
  const electricity =
    opts.electricity === false
      ? 0
      : stay.electricity
        ? toEur(stay.electricity, fx)
        : seed.electricity * fx.ISK_EUR;
  const inNetwork = stay.inCampingCardNetwork ?? seed.campingCard;
  const cardApplied = Boolean(opts.campingCard && inNetwork);
  const tax = CAMPING_TAX_ISK * fx.ISK_EUR * pax;
  const people = cardApplied ? 0 : perPerson * pax;
  const source: MoneySource = stay.perPersonNight ? stay.perPersonNight.source : 'seed';
  return { amount: round2(people + electricity + tax), source, campingCardApplied: cardApplied };
}

/** Cena jednej noci (docs/05 §5). */
export function stayCost(
  stay: LodgingStayInput,
  pax: number,
  nightsTotal: number,
  fx: Fx,
  opts: { campingCard?: boolean } = {},
): StayCost {
  const base = {
    stayId: stay.id,
    hasKitchen: Boolean(stay.hasKitchen ?? isCamp(stay.kind)),
    campingCardApplied: false,
  };
  if (stay.priceOverride) {
    const a = toEur(stay.priceOverride, fx);
    return {
      ...base,
      amount: a,
      min: a,
      max: a,
      source: stay.priceOverride.source,
      confidence: confidenceOf(stay.priceOverride.source),
    };
  }
  if (isCamp(stay.kind)) {
    const c = campsiteCost(stay, pax, fx, opts);
    const conf = confidenceOf(c.source);
    const spread = conf === 'estimate' ? 0.1 : 0;
    return {
      ...base,
      amount: c.amount,
      min: round2(c.amount * (1 - spread)),
      max: round2(c.amount * (1 + spread)),
      source: c.source,
      confidence: conf,
      campingCardApplied: c.campingCardApplied,
    };
  }
  if (stay.pricePerNight) {
    const nightly = toEur(stay.pricePerNight, fx);
    const cleaning = stay.cleaningFee ? toEur(stay.cleaningFee, fx) / Math.max(1, nightsTotal) : 0;
    const service = stay.serviceFeePct ? (nightly * stay.serviceFeePct) / 100 : 0;
    const tax = stay.cityTaxPp ? toEur(stay.cityTaxPp, fx) * pax : 0;
    const a = round2(nightly + cleaning + service + tax);
    const src = mergeSource(stay.pricePerNight.source, stay.cleaningFee?.source, stay.cityTaxPp?.source);
    return { ...base, amount: a, min: a, max: a, source: src, confidence: confidenceOf(src) };
  }
  if (stay.priceRangeMin && stay.priceRangeMax) {
    const min = toEur(stay.priceRangeMin, fx);
    const max = toEur(stay.priceRangeMax, fx);
    return { ...base, amount: round2((min + max) / 2), min, max, source: 'seed', confidence: 'estimate' };
  }
  const est = lodgingEstimate(stay.regionId, stay.kind, pax);
  if (!est) return { ...base, amount: 0, min: 0, max: 0, source: 'estimate', confidence: 'estimate' };
  return {
    ...base,
    amount: round2((est.min + est.max) / 2),
    min: est.min,
    max: est.max,
    source: 'seed',
    confidence: 'estimate',
  };
}

/** Camping Card: 2 dospelí/karta → pri 4 dospelých 2 karty; oplatí sa, ak ušetrí viac než stojí. */
export function campingCardDecision(
  stays: LodgingStayInput[],
  pax: number,
  fx: Fx,
): { cards: number; cost: number; saving: number; worthIt: boolean } {
  const cards = Math.ceil(pax / CAMPING_CARD_ADULTS);
  const cost = cards * CAMPING_CARD_EUR;
  let saving = 0;
  for (const s of stays) {
    if (!isCamp(s.kind) || s.priceOverride) continue;
    const without = campsiteCost(s, pax, fx, { campingCard: false }).amount;
    const withCard = campsiteCost(s, pax, fx, { campingCard: true }).amount;
    saving += without - withCard;
  }
  saving = round2(saving);
  return { cards, cost, saving, worthIt: saving > cost };
}

export type LodgingWarning = {
  nightIndex: number;
  code: 'late_arrival_region' | 'early_departure_far' | 'closed' | 'check_in_late';
  message: string;
};

/** Pravidlá pred hľadaním (docs/05 §5). */
export function lodgingWarnings(
  stays: LodgingStayInput[],
  ctx: {
    arrivalMinutesOfDay?: number;
    departureMinutesOfDay?: number;
    plannedArrivalByNight?: Record<number, string>;
  },
): LodgingWarning[] {
  const out: LodgingWarning[] = [];
  const sorted = [...stays].sort((a, b) => a.nightIndex - b.nightIndex);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (
    first &&
    ctx.arrivalMinutesOfDay != null &&
    ctx.arrivalMinutesOfDay > 20 * 60 &&
    first.regionId !== 'reykjanes'
  )
    out.push({
      nightIndex: first.nightIndex,
      code: 'late_arrival_region',
      message: 'Prílet po 20:00 – prvú noc spi pri KEF (Reykjanes).',
    });
  if (
    last &&
    ctx.departureMinutesOfDay != null &&
    ctx.departureMinutesOfDay < 10 * 60 &&
    (last.minutesToKef ?? (last.regionId === 'reykjanes' ? 15 : 60)) > 45
  )
    out.push({
      nightIndex: last.nightIndex,
      code: 'early_departure_far',
      message: 'Odlet pred 10:00 – posledná noc max. 45 min od KEF.',
    });
  for (const s of sorted) {
    if (s.openUntil && s.openUntil < s.nightDate)
      out.push({
        nightIndex: s.nightIndex,
        code: 'closed',
        message: `Noc ${s.nightIndex}: kemp/ubytovanie je po ${s.openUntil} zatvorené.`,
      });
    const planned = ctx.plannedArrivalByNight?.[s.nightIndex];
    if (s.checkInUntil && planned && planned > s.checkInUntil)
      out.push({
        nightIndex: s.nightIndex,
        code: 'check_in_late',
        message: `Noc ${s.nightIndex}: príchod ${planned} po konci check-inu ${s.checkInUntil} – over self check-in.`,
      });
  }
  return out;
}

export const kitchenByNight = (stays: LodgingStayInput[], camper: boolean): Record<number, boolean> =>
  Object.fromEntries(stays.map((s) => [s.nightIndex, camper || Boolean(s.hasKitchen ?? isCamp(s.kind))]));
