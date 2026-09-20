import 'server-only';
import { inArray } from 'drizzle-orm';
import { frankfurter, ryanair, tpFlights, wizz } from '@/connectors';
import { initConnectors } from '@/connectors/server';
import type { DayFare } from '@/connectors/tp-flights';
import { getDb, schema } from '@/db';
import {
  buildCombos,
  composeSelfTransfer,
  parkingFromRules,
  type Combo,
  type ComboFilters,
  type ComboResult,
  type Fare,
} from '@/engine/flightCombos';
import { round2 } from '@/engine/money';
import { airportAccessCost } from '@/engine/split';
import { BUS_PP, FUEL_EUR_PER_L, VIGNETTES } from '@/features/trips/airport-access';
import type { BagType, Bags, PriceRuleTier } from '@/engine/types';

export type SearchParams = {
  origins: string[];
  month: string; // YYYY-MM
  minDays: number;
  maxDays: number;
  pax: number;
  travelersBags: Bags[];
  parking: boolean;
  allowSelfTransfer: boolean;
  filters?: ComboFilters;
  limit?: number;
};

export type ProgressEvent =
  | { type: 'start'; origins: string[]; month: string }
  | {
      type: 'source';
      origin: string;
      source: string;
      ok: boolean;
      count: number;
      ms: number;
      reason?: string;
    }
  | { type: 'origin_done'; origin: string; outFares: number; retFares: number }
  | { type: 'done'; ms: number };

export type SearchResult = ComboResult & {
  month: string;
  pax: number;
  connectorStats: Record<string, { ok: boolean; count: number; ms: number; reason?: string }>;
  fx: Record<string, number>;
  warnings: string[];
};

const HUBS = ['STN', 'LTN', 'BER', 'DUB'] as const;
const WIZZ_DIRECT = new Set(['KTW', 'BUD']);
/** Druhý segment hub → KEF bez živého zdroja (tp-flights po tokene): seed odhad, € na osobu (easyJet/Icelandair, september). */
const SEED_HUB_KEF: Record<
  string,
  { price: number; airline: string; dep: string; arr: string; retDep: string; retArr: string }
> = {
  STN: { price: 95, airline: 'U2', dep: '13:05', arr: '16:00', retDep: '10:00', retArr: '14:40' },
  LTN: { price: 105, airline: 'U2', dep: '12:30', arr: '15:25', retDep: '09:30', retArr: '14:05' },
  BER: { price: 100, airline: 'U2', dep: '12:00', arr: '14:50', retDep: '10:30', retArr: '15:15' },
  DUB: { price: 150, airline: 'FI', dep: '14:00', arr: '16:40', retDep: '10:30', retArr: '13:00' },
};
const HUB_NIGHT_ROOM: Record<string, number> = {
  STN: 90,
  LTN: 85,
  LGW: 95,
  BER: 80,
  DUB: 100,
  CPH: 110,
  AMS: 110,
};
/** Diaľničné známky/mýto z Bratislavy (auto, € za cestu tam a späť) */

const daysIn = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};

export async function searchFlights(
  params: SearchParams,
  onProgress?: (e: ProgressEvent) => void,
): Promise<SearchResult> {
  initConnectors();
  const t0 = Date.now();
  const warnings: string[] = [];
  const connectorStats: SearchResult['connectorStats'] = {};
  const emit = (e: ProgressEvent) => onProgress?.(e);
  emit({ type: 'start', origins: params.origins, month: params.month });

  const db = getDb();
  const [airports, parkingRows, bagRows] = await Promise.all([
    db.select().from(schema.airports).where(inArray(schema.airports.iata, params.origins)),
    db.select().from(schema.parkingOptions).where(inArray(schema.parkingOptions.iata, params.origins)),
    db.select().from(schema.baggageRules),
  ]);

  // kurzy: PLN/HUF → EUR
  const fx: Record<string, number> = { EUR: 1 };
  for (const q of ['PLN', 'HUF'] as const) {
    const r = await frankfurter.fetch({ base: 'EUR', quote: q });
    if (r.ok) fx[q] = r.data.rate;
    else warnings.push(`Kurz ${q} nedostupný (${r.reason}) – ceny v ${q} vynechané.`);
  }
  const toEur = (price: number, currency: string): number | null => {
    const c = currency.toUpperCase();
    if (c === 'EUR') return price;
    return fx[c] ? round2(price / fx[c]) : null;
  };

  // batožina: stred rozsahu per airline × typ; neznáma airline → priemer
  const bagMid = new Map<string, number>();
  for (const b of bagRows)
    bagMid.set(`${b.airline}:${b.bagType}`, (Number(b.priceLow) + Number(b.priceHigh)) / 2);
  const bagDefault: Record<BagType, number> = {
    cabin_small: 0,
    cabin_10: 25,
    checked_20: 45,
    checked_32: 70,
    priority: 25,
  };
  const bagPrice = (airline: string, type: BagType) => bagMid.get(`${airline}:${type}`) ?? bagDefault[type];

  const parkingByOrigin = new Map<string, PriceRuleTier[][]>();
  for (const p of parkingRows)
    (parkingByOrigin.get(p.iata) ?? parkingByOrigin.set(p.iata, []).get(p.iata)!).push(
      p.priceRules as PriceRuleTier[],
    );
  const parkingPrice = (origin: string, days: number) => {
    if (!params.parking) return null;
    const lists = parkingByOrigin.get(origin);
    if (!lists?.length) return null;
    return Math.min(...lists.map((rules) => parkingFromRules(rules, days)));
  };

  const checkedBags = params.travelersBags.reduce((a, b) => a + (b.checked20 ?? 0) + (b.checked32 ?? 0), 0);
  const accessCost = (origin: string) => {
    const a = airports.find((x) => x.iata === origin);
    const km = a?.driveKmFromHome ? Number(a.driveKmFromHome) : 100;
    return airportAccessCost({
      pax: params.pax,
      checkedBags,
      km,
      consumptionL100km: 6.5,
      fuelPriceEur: FUEL_EUR_PER_L,
      vignettes: VIGNETTES[origin] ?? 0,
      busTicketPp: BUS_PP[origin] ?? null,
    }).total;
  };
  const hubNightCost = (hub: string) => (HUB_NIGHT_ROOM[hub] ?? 90) * Math.ceil(params.pax / 2);

  const dim = daysIn(params.month);
  const from = `${params.month}-01`;
  const to = `${params.month}-${String(dim).padStart(2, '0')}`;
  const outFares: Fare[] = [];
  const retFares: Fare[] = [];

  const fromDayFare = (f: DayFare, connectorId: string, source: Fare['source']): Fare | null => {
    const price = toEur(f.price, f.currency);
    if (price == null) return null;
    return {
      origin: f.origin,
      destination: f.destination,
      date: f.departDate,
      price,
      airlines: [f.airline ?? '??'],
      transfers: f.transfers,
      departureAt: f.departureAt,
      arrivalAt: null,
      source,
      connectorId,
      deepLink: f.deepLink,
    };
  };
  const seedSecondLeg = (hub: string, dir: 'toKef' | 'fromKef'): Fare[] => {
    const s = SEED_HUB_KEF[hub];
    if (!s) return [];
    const out: Fare[] = [];
    for (let d = 1; d <= dim; d++) {
      const date = `${params.month}-${String(d).padStart(2, '0')}`;
      out.push(
        dir === 'toKef'
          ? {
              origin: hub,
              destination: 'KEF',
              date,
              price: s.price,
              airlines: [s.airline],
              transfers: 0,
              departureAt: `${date}T${s.dep}:00`,
              arrivalAt: `${date}T${s.arr}:00`,
              source: 'estimate',
              connectorId: 'seed',
            }
          : {
              origin: 'KEF',
              destination: hub,
              date,
              price: s.price,
              airlines: [s.airline],
              transfers: 0,
              departureAt: `${date}T${s.retDep}:00`,
              arrivalAt: `${date}T${s.retArr}:00`,
              source: 'estimate',
              connectorId: 'seed',
            },
      );
    }
    return out;
  };
  const stat = (origin: string, source: string, ok: boolean, count: number, ms: number, reason?: string) => {
    connectorStats[`${origin}:${source}`] = { ok, count, ms, reason };
    emit({ type: 'source', origin, source, ok, count, ms, reason });
  };

  await Promise.all(
    params.origins.map(async (origin) => {
      let outCount = 0;
      let retCount = 0;
      // 1) priame Wizz
      if (WIZZ_DIRECT.has(origin)) {
        const t = Date.now();
        const r = await wizz.fetch({ origin, destination: 'KEF', from, to });
        if (r.ok) {
          const o = r.data.outbound.map((f) => fromDayFare(f, 'wizz', 'api')).filter((x): x is Fare => !!x);
          const i = r.data.inbound.map((f) => fromDayFare(f, 'wizz', 'api')).filter((x): x is Fare => !!x);
          outFares.push(...o);
          retFares.push(...i);
          outCount += o.length;
          retCount += i.length;
          stat(origin, 'wizz', true, o.length + i.length, Date.now() - t);
        } else stat(origin, 'wizz', false, 0, Date.now() - t, r.reason);
      }
      // 2) tp-flights kalendár (priame aj s prestupom), tam aj späť
      {
        const t = Date.now();
        const [o, i] = await Promise.all([
          tpFlights.fetch({ kind: 'calendar', origin, destination: 'KEF', departDate: params.month }),
          tpFlights.fetch({ kind: 'calendar', origin: 'KEF', destination: origin, departDate: params.month }),
        ]);
        if (o.ok && i.ok) {
          const of = o.data.map((f) => fromDayFare(f, 'tp-flights', 'api')).filter((x): x is Fare => !!x);
          const rf = i.data.map((f) => fromDayFare(f, 'tp-flights', 'api')).filter((x): x is Fare => !!x);
          outFares.push(...of);
          retFares.push(...rf);
          outCount += of.length;
          retCount += rf.length;
          stat(origin, 'tp-flights', true, of.length + rf.length, Date.now() - t);
        } else
          stat(
            origin,
            'tp-flights',
            false,
            0,
            Date.now() - t,
            (o.ok ? i : o).ok ? undefined : ((o.ok ? i : o) as { reason: string }).reason,
          );
      }
      // 3) self-transfer: Ryanair do hubu + seed hub→KEF (a späť)
      if (params.allowSelfTransfer) {
        for (const hub of HUBS) {
          const t = Date.now();
          const [a, b] = await Promise.all([
            ryanair.fetch({ origin, destination: hub, month: params.month }),
            ryanair.fetch({ origin: hub, destination: origin, month: params.month }),
          ]);
          if (a.ok && a.data.length) {
            const first = a.data
              .map((f) => fromDayFare(f, 'ryanair', 'api'))
              .filter((x): x is Fare => !!x)
              .map((f) => ({ ...f, arrivalAt: f.departureAt ? addHours(f.departureAt, 2.5) : null }));
            const composed = composeSelfTransfer(first, seedSecondLeg(hub, 'toKef'));
            outFares.push(...composed);
            outCount += composed.length;
          }
          if (b.ok && b.data.length) {
            const second = b.data.map((f) => fromDayFare(f, 'ryanair', 'api')).filter((x): x is Fare => !!x);
            const composed = composeSelfTransfer(seedSecondLeg(hub, 'fromKef'), second).map((f) => ({
              ...f,
              deepLink: null,
            }));
            retFares.push(...composed);
            retCount += composed.length;
          }
          const ok = (a.ok && a.data.length > 0) || (b.ok && b.data.length > 0);
          stat(
            origin,
            `ryanair:${hub}`,
            ok,
            (a.ok ? a.data.length : 0) + (b.ok ? b.data.length : 0),
            Date.now() - t,
            ok ? undefined : a.ok ? 'bez letov' : a.reason,
          );
        }
      }
      emit({ type: 'origin_done', origin, outFares: outCount, retFares: retCount });
    }),
  );

  if (!fx.PLN || !fx.HUF) warnings.push('Ceny Wizz v PLN/HUF nebolo možné prepočítať.');
  if (!connectorStats[`${params.origins[0]}:tp-flights`]?.ok)
    warnings.push('tp-flights nedostupné – hub → KEF segment je odhad zo seedu (≈).');

  const result = buildCombos({
    ...params,
    outFares,
    retFares,
    bagPrice,
    parkingPrice,
    accessCost,
    hubNightCost,
    limit: params.limit ?? 50,
  });
  emit({ type: 'done', ms: Date.now() - t0 });
  return { ...result, month: params.month, pax: params.pax, connectorStats, fx, warnings };
}

const addHours = (iso: string, h: number) => {
  const d = new Date(iso.length === 16 ? `${iso}:00` : iso);
  if (Number.isNaN(d.getTime())) return null;
  d.setTime(d.getTime() + h * 3_600_000);
  return d.toISOString().slice(0, 19);
};

/** Uloží vyhľadávanie a top kombinácie k ceste (flight_searches + flight_options). */
export async function persistSearch(
  tripId: string,
  params: SearchParams,
  result: SearchResult,
): Promise<string> {
  const db = getDb();
  const [search] = await db
    .insert(schema.flightSearches)
    .values({
      tripId,
      params: {
        origins: params.origins,
        month: params.month,
        minDays: params.minDays,
        maxDays: params.maxDays,
        pax: params.pax,
        bags: {},
        parking: params.parking,
        allowSelfTransfer: params.allowSelfTransfer,
      },
      status: 'done',
      startedAt: new Date(),
      finishedAt: new Date(),
      connectorStats: result.connectorStats,
    })
    .returning({ id: schema.flightSearches.id });
  if (result.combos.length) {
    await db.insert(schema.flightOptions).values(result.combos.map((c) => comboToRow(c, search.id, tripId)));
  }
  return search.id;
}

function comboToRow(c: Combo, searchId: string, tripId: string): typeof schema.flightOptions.$inferInsert {
  const money = (amount: number, source: Combo['source']) => ({ amount, currency: 'EUR', source });
  const legs = (f: Fare) =>
    (
      f.legs ?? [
        {
          airline: f.airlines[0],
          from: f.origin,
          to: f.destination,
          date: f.date,
          dep: f.departureAt,
          arr: f.arrivalAt,
          price: f.price,
        },
      ]
    ).map((l) => ({
      airline: l.airline,
      from: l.from,
      to: l.to,
      dep: l.dep ?? `${l.date}T00:00:00`,
      arr: l.arr ?? `${l.date}T00:00:00`,
    }));
  return {
    searchId,
    tripId,
    origin: c.origin,
    dest: 'KEF',
    outDepAt: new Date(c.out.departureAt ?? `${c.outDate}T09:00:00Z`),
    outArrAt: c.out.arrivalAt ? new Date(c.out.arrivalAt) : null,
    retDepAt: new Date(c.ret.departureAt ?? `${c.retDate}T12:00:00Z`),
    retArrAt: c.ret.arrivalAt ? new Date(c.ret.arrivalAt) : null,
    outLegs: legs(c.out),
    retLegs: legs(c.ret),
    selfTransfer: c.transfers > 0,
    transferHub: c.out.hub ?? c.ret.hub ?? null,
    farePp: money(c.farePp, c.source),
    bagsTotal: money(c.bags, 'seed'),
    parkingTotal: c.parking != null ? money(c.parking, 'seed') : null,
    airportAccessTotal: money(c.access, 'estimate'),
    totalGroup: money(c.totalGroup, c.source),
    totalPp: money(c.totalPp, c.source),
    totalGroupAmount: String(c.totalGroup),
    days: c.days,
    nights: c.nights,
    connectorId: `${c.out.connectorId}|${c.ret.connectorId}`,
    deepLink: c.out.deepLink ?? null,
    isEstimate: c.source === 'estimate',
  };
}
