import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  jsonb,
  numeric,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { authUsers, authenticatedRole } from 'drizzle-orm/supabase';
import type { Availability, DriverLicence, DroneProfile, InterestScores, TravelDocs } from '@/engine/types';
import {
  bagsPrefEnum,
  comfortEnum,
  connectorStatusEnum,
  createdAt,
  foodLevelEnum,
  id,
  notificationKindEnum,
  paceEnum,
  updatedAt,
} from './_shared';

/** 1 : 1 s auth.users – osobný profil; zakladá správca s dočasným heslom (docs/obrazovky/00a). */
export const profiles = pgTable(
  'profiles',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    displayName: text('display_name').notNull(),
    email: text('email').notNull(),
    isAdmin: boolean('is_admin').notNull().default(false),
    mustChangePassword: boolean('must_change_password').notNull().default(true),
    createdBy: uuid('created_by'),
    birthDate: date('birth_date'),
    homeLabel: text('home_label').default('Bratislava'),
    homeLat: numeric('home_lat', { precision: 9, scale: 6 }).default('48.148600'),
    homeLng: numeric('home_lng', { precision: 9, scale: 6 }).default('17.107700'),
    driverLicence: jsonb('driver_licence').$type<DriverLicence>(),
    drone: jsonb('drone').$type<DroneProfile>(),
    interests: jsonb('interests').$type<InterestScores>(),
    pace: paceEnum('pace').default('normal'),
    comfort: comfortEnum('comfort').default('guesthouse'),
    foodLevel: foodLevelEnum('food_level').default('budget'),
    budgetTarget: numeric('budget_target', { precision: 12, scale: 2 }),
    availability: jsonb('availability').$type<Availability>(),
    airports: text('airports')
      .array()
      .default(sql`'{}'::text[]`),
    bagsPref: bagsPrefEnum('bags_pref').default('light'),
    docs: jsonb('docs').$type<TravelDocs>(),
    hasCreditCard: boolean('has_credit_card').default(false),
    locale: text('locale').notNull().default('sk'),
    theme: text('theme').default('light'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('profiles_email_idx').on(t.email),
    pgPolicy('profiles_read', {
      for: 'select',
      to: authenticatedRole,
      using: sql`${t.userId} = auth.uid() or public.is_admin() or public.shares_trip_with(${t.userId})`,
    }),
    pgPolicy('profiles_update_own', {
      for: 'update',
      to: authenticatedRole,
      using: sql`${t.userId} = auth.uid()`,
      withCheck: sql`${t.userId} = auth.uid()`,
    }),
  ],
).enableRLS();

/** Globálne (user_id null) alebo per používateľ. API tokeny sú v env, nie tu. */
export const settings = pgTable(
  'settings',
  {
    id: id(),
    userId: uuid('user_id').references(() => authUsers.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    value: jsonb('value').notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('settings_user_key_idx').on(t.userId, t.key),
    pgPolicy('settings_read', {
      for: 'select',
      to: authenticatedRole,
      using: sql`${t.userId} is null or ${t.userId} = auth.uid()`,
    }),
    pgPolicy('settings_write_own', {
      for: 'all',
      to: authenticatedRole,
      using: sql`${t.userId} = auth.uid()`,
      withCheck: sql`${t.userId} = auth.uid()`,
    }),
  ],
).enableRLS();

/** Evidencia e-mailov (max 1 / cesta / deň). */
export const notifications = pgTable(
  'notifications',
  {
    id: id(),
    tripId: uuid('trip_id').notNull(),
    userId: uuid('user_id').references(() => authUsers.id, { onDelete: 'cascade' }),
    kind: notificationKindEnum('kind').notNull(),
    subjectId: text('subject_id'),
    payload: jsonb('payload'),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('notifications_trip_idx').on(t.tripId, t.sentAt),
    pgPolicy('notifications_read_own', {
      for: 'select',
      to: authenticatedRole,
      using: sql`${t.userId} = auth.uid()`,
    }),
  ],
).enableRLS();

/** Tabuľka „Stav zdrojov" – píše server (service role). */
export const connectorHealth = pgTable(
  'connector_health',
  {
    connectorId: text('connector_id').primaryKey(),
    status: connectorStatusEnum('status').notNull().default('unknown'),
    lastOkAt: timestamp('last_ok_at', { withTimezone: true }),
    lastError: text('last_error'),
    latencyMs: numeric('latency_ms'),
    checkedAt: timestamp('checked_at', { withTimezone: true }),
  },
  () => [pgPolicy('connector_health_read', { for: 'select', to: authenticatedRole, using: sql`true` })],
).enableRLS();

/** Cache odpovedí konektorov (TTL) – len server. */
export const providerCache = pgTable(
  'provider_cache',
  {
    key: text('key').primaryKey(),
    connectorId: text('connector_id').notNull(),
    payload: jsonb('payload').notNull(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('provider_cache_expires_idx').on(t.expiresAt)],
).enableRLS();

/** Routing výsledky pre vlastné miesta / domov → letisko (navždy). */
export const routeCache = pgTable(
  'route_cache',
  {
    fromKey: text('from_key').notNull(),
    toKey: text('to_key').notNull(),
    km: numeric('km', { precision: 8, scale: 1 }).notNull(),
    min: numeric('min', { precision: 8, scale: 1 }).notNull(),
    geometry: jsonb('geometry'),
    provider: text('provider'),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('route_cache_pk_idx').on(t.fromKey, t.toKey),
    pgPolicy('route_cache_read', { for: 'select', to: authenticatedRole, using: sql`true` }),
  ],
).enableRLS();
