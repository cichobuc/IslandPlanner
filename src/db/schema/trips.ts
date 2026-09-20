import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgPolicy,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { authUsers, authenticatedRole } from 'drizzle-orm/supabase';
import type { Bags, CustomFoodPrices, TravelDocs } from '@/engine/types';
import {
  accessModeEnum,
  bringDecisionEnum,
  createdAt,
  editorWrite,
  foodLevelEnum,
  id,
  manualCategoryEnum,
  memberRead,
  memberRoleEnum,
  money,
  paceEnum,
  revisionEntityEnum,
  revisionOpEnum,
  scenarioKeyEnum,
  snapshotSubjectEnum,
  splitEnum,
  transportModeEnum,
  tripScoped,
  tripStatusEnum,
  updatedAt,
} from './_shared';
import { airports, bringItems, parkingOptions } from './reference';

export const trips = pgTable(
  'trips',
  {
    id: id(),
    name: text('name').notNull(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => authUsers.id),
    targetMonth: date('target_month').notNull(),
    minDays: integer('min_days').notNull().default(8),
    maxDays: integer('max_days').notNull().default(12),
    startDate: date('start_date'),
    endDate: date('end_date'),
    homeLabel: text('home_label').notNull().default('Bratislava'),
    homeLat: numeric('home_lat', { precision: 9, scale: 6 }).notNull().default('48.148600'),
    homeLng: numeric('home_lng', { precision: 9, scale: 6 }).notNull().default('17.107700'),
    originAirports: text('origin_airports')
      .array()
      .notNull()
      .default(sql`'{BTS,VIE,BUD,PRG,KTW}'::text[]`),
    destAirport: text('dest_airport').notNull().default('KEF'),
    allowSelfTransfer: boolean('allow_self_transfer').notNull().default(true),
    pace: paceEnum('pace').notNull().default('normal'),
    interests: text('interests')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** Rozhodnutie z kroku 03 – určuje typ krokov 04/05. */
    transportMode: transportModeEnum('transport_mode'),
    budgetTargetPp: numeric('budget_target_pp', { precision: 12, scale: 2 }),
    baseCurrency: text('base_currency').notNull().default('EUR'),
    reservePct: numeric('reserve_pct', { precision: 5, scale: 2 }).notNull().default('10'),
    status: tripStatusEnum('status').notNull().default('draft'),
    routePreset: text('route_preset'), // ring | south | golden_circle | custom
    forkedFromTemplateId: uuid('forked_from_template_id'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('trips_owner_idx').on(t.ownerId),
    pgPolicy('trips_read', {
      for: 'select',
      to: authenticatedRole,
      using: sql`${t.ownerId} = auth.uid() or public.is_trip_member(${t.id})`,
    }),
    pgPolicy('trips_insert_own', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`${t.ownerId} = auth.uid()`,
    }),
    pgPolicy('trips_update_editor', {
      for: 'update',
      to: authenticatedRole,
      using: sql`public.is_trip_editor(${t.id})`,
      withCheck: sql`public.is_trip_editor(${t.id})`,
    }),
    pgPolicy('trips_delete_owner', {
      for: 'delete',
      to: authenticatedRole,
      using: sql`public.is_trip_owner(${t.id})`,
    }),
  ],
).enableRLS();

/** Základ RLS – rola určuje oprávnenia. */
export const tripMembers = pgTable(
  'trip_members',
  {
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    role: memberRoleEnum('role').notNull().default('editor'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  },
  (t) => [
    primaryKey({ columns: [t.tripId, t.userId] }),
    index('trip_members_user_idx').on(t.userId),
    pgPolicy('trip_members_read', {
      for: 'select',
      to: authenticatedRole,
      using: sql`${t.userId} = auth.uid() or public.is_trip_member(${t.tripId})`,
    }),
    pgPolicy('trip_members_owner_write', {
      for: 'all',
      to: authenticatedRole,
      using: sql`public.is_trip_owner(${t.tripId})`,
      withCheck: sql`public.is_trip_owner(${t.tripId})`,
    }),
  ],
).enableRLS();

export const travelers = pgTable(
  'travelers',
  {
    id: id(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    birthDate: date('birth_date'),
    ageFallback: integer('age_fallback'),
    userId: uuid('user_id').references(() => authUsers.id, { onDelete: 'set null' }),
    isDriver: boolean('is_driver').notNull().default(false),
    driverSince: date('driver_since'),
    hasCreditCard: boolean('has_credit_card').notNull().default(false),
    docs: jsonb('docs').$type<TravelDocs>(),
    bags: jsonb('bags')
      .$type<Bags>()
      .notNull()
      .default({ cabinSmall: 1, cabin10: 0, checked20: 0, checked32: 0 }),
    /** Batožina zdieľaná na dvojice (krok 01) – id druhého cestujúceho. */
    sharesBagsWith: uuid('shares_bags_with'),
    dietNote: text('diet_note'),
    sortOrder: integer('sort_order').notNull().default(0),
    updatedAt: updatedAt(),
  },
  (t) => [index('travelers_trip_idx').on(t.tripId), ...tripScoped(t.tripId, 'travelers')],
).enableRLS();

/** Cesta domov → letisko, per trip × letisko (cache routingu). */
export const tripAirportAccess = pgTable(
  'trip_airport_access',
  {
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    iata: text('iata')
      .notNull()
      .references(() => airports.iata),
    mode: accessModeEnum('mode').notNull().default('car'),
    distanceKm: numeric('distance_km', { precision: 7, scale: 1 }),
    durationMin: integer('duration_min'),
    costOneWay: money('cost_one_way'),
    vignetteNeeded: boolean('vignette_needed').default(false),
    notes: text('notes'),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.tripId, t.iata] }), ...tripScoped(t.tripId, 'trip_airport_access')],
).enableRLS();

/** Cesta na letisko – skupinovo (1 auto pre ≤ 4 os.). */
export const airportTransfer = pgTable(
  'airport_transfer',
  {
    tripId: uuid('trip_id')
      .primaryKey()
      .references(() => trips.id, { onDelete: 'cascade' }),
    iata: text('iata').references(() => airports.iata),
    vehicles: integer('vehicles').notNull().default(1),
    mode: accessModeEnum('mode').notNull().default('car'),
    km: numeric('km', { precision: 7, scale: 1 }),
    consumptionL100km: numeric('consumption_l_100km', { precision: 4, scale: 1 }).default('6.5'),
    fuelPriceSk: numeric('fuel_price_sk', { precision: 5, scale: 3 }),
    vignettes: jsonb('vignettes').$type<{ country: string; price: number; days?: number }[]>(),
    parkingOptionId: uuid('parking_option_id').references(() => parkingOptions.id),
    costTotal: money('cost_total'),
    isManual: boolean('is_manual').notNull().default(false),
    updatedAt: updatedAt(),
  },
  (t) => [...tripScoped(t.tripId, 'airport_transfer')],
).enableRLS();

/** 1 : 1 s trips (krok 07). */
export const foodProfile = pgTable(
  'food_profile',
  {
    tripId: uuid('trip_id')
      .primaryKey()
      .references(() => trips.id, { onDelete: 'cascade' }),
    level: foodLevelEnum('level').notNull().default('budget'),
    customPrices: jsonb('custom_prices').$type<CustomFoodPrices>(),
    coffeePerDay: integer('coffee_per_day').notNull().default(1),
    alcohol: boolean('alcohol').notNull().default(false),
    firstShop: money('first_shop'),
    dayOverrides: jsonb('day_overrides').$type<Record<string, 'budget' | 'mid' | 'comfort'>>(),
    updatedAt: updatedAt(),
  },
  (t) => [...tripScoped(t.tripId, 'food_profile')],
).enableRLS();

export const manualItems = pgTable(
  'manual_items',
  {
    id: id(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    category: manualCategoryEnum('category').notNull().default('other'),
    label: text('label').notNull(),
    amount: money('amount').notNull(),
    split: splitEnum('split').notNull().default('group'),
    customShares: jsonb('custom_shares').$type<Record<string, number>>(),
    paidBy: uuid('paid_by'),
    scenarioKey: scenarioKeyEnum('scenario_key'),
    isManual: boolean('is_manual').notNull().default(true),
    updatedAt: updatedAt(),
  },
  (t) => [index('manual_items_trip_idx').on(t.tripId), ...tripScoped(t.tripId, 'manual_items')],
).enableRLS();

export const tripBring = pgTable(
  'trip_bring',
  {
    id: id(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    itemId: uuid('item_id').references(() => bringItems.id),
    customName: text('custom_name'),
    qty: numeric('qty', { precision: 6, scale: 2 }).notNull().default('1'),
    forUserId: uuid('for_user_id'),
    decided: bringDecisionEnum('decided').notNull().default('take'),
    updatedAt: updatedAt(),
  },
  (t) => [index('trip_bring_trip_idx').on(t.tripId), ...tripScoped(t.tripId, 'trip_bring')],
).enableRLS();

/** Snapshoty konfigurácie (Auto vs. Karavan vedľa seba). */
export const scenarios = pgTable(
  'scenarios',
  {
    id: id(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    key: scenarioKeyEnum('key').notNull(),
    snapshot: jsonb('snapshot').notNull(),
    result: jsonb('result'),
    createdAt: createdAt(),
  },
  (t) => [index('scenarios_trip_idx').on(t.tripId), ...tripScoped(t.tripId, 'scenarios')],
).enableRLS();

/** História cien pre graf a e-mail diff (ubytovanie sa nesleduje). */
export const priceSnapshots = pgTable(
  'price_snapshots',
  {
    id: id(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    subject: snapshotSubjectEnum('subject').notNull(),
    subjectId: text('subject_id'),
    total: money('total').notNull(),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
    connectorId: text('connector_id'),
    capturedAt: timestamp('captured_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('price_snapshots_trip_idx').on(t.tripId, t.subject, t.capturedAt),
    memberRead(t.tripId, 'price_snapshots'),
  ],
).enableRLS();

/** Návrhy „najlepšia cesta pre všetkých" (Ja / Skupina, v1.1). */
export const groupProposals = pgTable(
  'group_proposals',
  {
    id: id(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    inputs: jsonb('inputs').notNull(),
    result: jsonb('result').notNull(),
    compromises: jsonb('compromises'),
    createdAt: createdAt(),
  },
  (t) => [index('group_proposals_trip_idx').on(t.tripId), ...tripScoped(t.tripId, 'group_proposals')],
).enableRLS();

/** Návrh ideálneho mesiaca (v1.1). */
export const monthScores = pgTable(
  'month_scores',
  {
    id: id(),
    tripId: uuid('trip_id').references(() => trips.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => authUsers.id, { onDelete: 'cascade' }),
    month: integer('month').notNull(),
    score: numeric('score', { precision: 6, scale: 2 }).notNull(),
    reasons: jsonb('reasons'),
    priceIndex: numeric('price_index', { precision: 6, scale: 2 }),
    createdAt: createdAt(),
  },
  (t) => [
    index('month_scores_trip_idx').on(t.tripId),
    pgPolicy('month_scores_read', {
      for: 'select',
      to: authenticatedRole,
      using: sql`${t.userId} = auth.uid() or (${t.tripId} is not null and public.is_trip_member(${t.tripId}))`,
    }),
    pgPolicy('month_scores_write', {
      for: 'all',
      to: authenticatedRole,
      using: sql`${t.userId} = auth.uid() or (${t.tripId} is not null and public.is_trip_editor(${t.tripId}))`,
      withCheck: sql`${t.userId} = auth.uid() or (${t.tripId} is not null and public.is_trip_editor(${t.tripId}))`,
    }),
  ],
).enableRLS();

/** Read-only link; snapshot číta route handler so service role. */
export const shareTokens = pgTable(
  'share_tokens',
  {
    token: text('token').primaryKey(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    createdBy: uuid('created_by'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    pgPolicy('share_tokens_owner', {
      for: 'all',
      to: authenticatedRole,
      using: sql`public.is_trip_owner(${t.tripId})`,
      withCheck: sql`public.is_trip_owner(${t.tripId})`,
    }),
  ],
).enableRLS();

export const tripInvites = pgTable(
  'trip_invites',
  {
    token: text('token').primaryKey(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: memberRoleEnum('role').notNull().default('editor'),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    pgPolicy('trip_invites_owner', {
      for: 'all',
      to: authenticatedRole,
      using: sql`public.is_trip_owner(${t.tripId})`,
      withCheck: sql`public.is_trip_owner(${t.tripId})`,
    }),
  ],
).enableRLS();

/** História + undo (K5). Starnú po 90 dňoch, okrem posledných 50 na cestu. */
export const tripRevisions = pgTable(
  'trip_revisions',
  {
    id: id(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    userId: uuid('user_id'),
    entity: revisionEntityEnum('entity').notNull(),
    entityId: text('entity_id'),
    op: revisionOpEnum('op').notNull(),
    before: jsonb('before'),
    after: jsonb('after'),
    createdAt: createdAt(),
  },
  (t) => [
    index('trip_revisions_trip_idx').on(t.tripId, t.createdAt),
    memberRead(t.tripId, 'trip_revisions'),
    editorWrite(t.tripId, 'trip_revisions')[0],
  ],
).enableRLS();
