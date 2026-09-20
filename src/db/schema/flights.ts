import { boolean, index, integer, jsonb, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import type { FlightLeg } from '@/engine/types';
import { accessModeEnum, createdAt, id, money, searchStatusEnum, tripScoped, updatedAt } from './_shared';
import { parkingOptions } from './reference';
import { trips } from './trips';

export type FlightSearchParams = {
  origins: string[];
  month: string; // YYYY-MM
  minDays: number;
  maxDays: number;
  pax: number;
  bags: Record<string, number>;
  parking: boolean;
  allowSelfTransfer: boolean;
};

export const flightSearches = pgTable(
  'flight_searches',
  {
    id: id(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    params: jsonb('params').$type<FlightSearchParams>().notNull(),
    status: searchStatusEnum('status').notNull().default('pending'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    connectorStats:
      jsonb('connector_stats').$type<
        Record<string, { ok: boolean; count: number; ms: number; reason?: string }>
      >(),
    createdAt: createdAt(),
  },
  (t) => [
    index('flight_searches_trip_idx').on(t.tripId, t.createdAt),
    ...tripScoped(t.tripId, 'flight_searches'),
  ],
).enableRLS();

/** Kombinácia (out, ret) – radíme podľa total_group (letenka + batožina + parkovanie + cesta na letisko). */
export const flightOptions = pgTable(
  'flight_options',
  {
    id: id(),
    searchId: uuid('search_id')
      .notNull()
      .references(() => flightSearches.id, { onDelete: 'cascade' }),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    origin: text('origin').notNull(),
    dest: text('dest').notNull().default('KEF'),
    outDepAt: timestamp('out_dep_at', { withTimezone: true }).notNull(),
    outArrAt: timestamp('out_arr_at', { withTimezone: true }),
    retDepAt: timestamp('ret_dep_at', { withTimezone: true }).notNull(),
    retArrAt: timestamp('ret_arr_at', { withTimezone: true }),
    outLegs: jsonb('out_legs').$type<FlightLeg[]>().notNull(),
    retLegs: jsonb('ret_legs').$type<FlightLeg[]>().notNull(),
    selfTransfer: boolean('self_transfer').notNull().default(false),
    transferHub: text('transfer_hub'),
    transferMin: integer('transfer_min'),
    farePp: money('fare_pp').notNull(),
    bagsTotal: money('bags_total'),
    parkingTotal: money('parking_total'),
    airportAccessTotal: money('airport_access_total'),
    totalGroup: money('total_group').notNull(),
    totalPp: money('total_pp').notNull(),
    totalGroupAmount: numeric('total_group_amount', { precision: 12, scale: 2 }).notNull(),
    days: integer('days').notNull(),
    nights: integer('nights').notNull(),
    connectorId: text('connector_id').notNull(),
    deepLink: text('deep_link'),
    isEstimate: boolean('is_estimate').notNull().default(false),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('flight_options_search_idx').on(t.searchId, t.totalGroupAmount),
    index('flight_options_trip_dates_idx').on(t.tripId, t.outDepAt),
    ...tripScoped(t.tripId, 'flight_options'),
  ],
).enableRLS();

/** 1 : 1 s trips – vybraný let spúšťa kaskádu. */
export const flightSelection = pgTable(
  'flight_selection',
  {
    tripId: uuid('trip_id')
      .primaryKey()
      .references(() => trips.id, { onDelete: 'cascade' }),
    flightOptionId: uuid('flight_option_id').references(() => flightOptions.id, { onDelete: 'set null' }),
    /** Ručne zadaný let (bez search) – kópia dôležitých polí. */
    manual: jsonb('manual').$type<{
      origin: string;
      outDepAt: string;
      outArrAt?: string;
      retDepAt: string;
      retArrAt?: string;
      airline?: string;
      url?: string;
    }>(),
    parkingOptionId: uuid('parking_option_id').references(() => parkingOptions.id),
    airportAccessMode: accessModeEnum('airport_access_mode').notNull().default('car'),
    lockedPrice: money('locked_price'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    verifiedPrice: money('verified_price'),
    isManual: boolean('is_manual').notNull().default(false),
    notes: text('notes'),
    updatedAt: updatedAt(),
  },
  (t) => [...tripScoped(t.tripId, 'flight_selection')],
).enableRLS();
