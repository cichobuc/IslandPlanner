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
  text,
  time,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { authenticatedRole } from 'drizzle-orm/supabase';
import {
  difficultyEnum,
  fuelEnum,
  id,
  lodgingKindEnum,
  money,
  pickupModeEnum,
  scenarioKeyEnum,
  tripScoped,
  updatedAt,
  vehicleClassEnum,
  vehicleKindEnum,
} from './_shared';
import { pois, regions } from './reference';
import { trips } from './trips';

/** K4: scenario_key 'drive' (Auto + Karavan spoločne) | 'no_car'. */
export const itineraryDays = pgTable(
  'itinerary_days',
  {
    id: id(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    scenarioKey: scenarioKeyEnum('scenario_key').notNull().default('drive'),
    dayIndex: integer('day_index').notNull(),
    date: date('date'),
    title: text('title'),
    overnightRegionId: text('overnight_region_id').references(() => regions.id),
    overnightPoiId: uuid('overnight_poi_id').references(() => pois.id),
    driveKm: numeric('drive_km', { precision: 7, scale: 1 }).default('0'),
    driveMin: integer('drive_min').default(0),
    driveMinReal: integer('drive_min_real'),
    locked: boolean('locked').notNull().default(false),
    notes: text('notes'),
    sunrise: time('sunrise'),
    sunset: time('sunset'),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('itinerary_days_trip_idx').on(t.tripId, t.scenarioKey, t.dayIndex),
    ...tripScoped(t.tripId, 'itinerary_days'),
  ],
).enableRLS();

const stopTrip = (dayId: unknown) => sql`(select d.trip_id from itinerary_days d where d.id = ${dayId})`;

export const itineraryStops = pgTable(
  'itinerary_stops',
  {
    id: id(),
    dayId: uuid('day_id')
      .notNull()
      .references(() => itineraryDays.id, { onDelete: 'cascade' }),
    order: integer('order').notNull().default(0),
    poiId: uuid('poi_id').references(() => pois.id),
    customLabel: text('custom_label'),
    customLat: numeric('custom_lat', { precision: 9, scale: 6 }),
    customLng: numeric('custom_lng', { precision: 9, scale: 6 }),
    arriveAt: timestamp('arrive_at', { withTimezone: true }),
    stayMin: integer('stay_min').default(60),
    driveKmFromPrev: numeric('drive_km_from_prev', { precision: 7, scale: 1 }),
    driveMinFromPrev: integer('drive_min_from_prev'),
    entryTotal: money('entry_total'),
    entryOverride: money('entry_override'),
    variant: text('variant'),
    skip: boolean('skip').notNull().default(false),
    must: boolean('must').notNull().default(false),
    /** K6: kaskáda mení len is_manual = false. */
    isManual: boolean('is_manual').notNull().default(false),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('itinerary_stops_day_idx').on(t.dayId, t.order),
    pgPolicy('itinerary_stops_member_read', {
      for: 'select',
      to: authenticatedRole,
      using: sql`public.is_trip_member(${stopTrip(t.dayId)})`,
    }),
    pgPolicy('itinerary_stops_editor_write', {
      for: 'all',
      to: authenticatedRole,
      using: sql`public.is_trip_editor(${stopTrip(t.dayId)})`,
      withCheck: sql`public.is_trip_editor(${stopTrip(t.dayId)})`,
    }),
  ],
).enableRLS();

/** Nájdené alebo ručne pridané ubytovanie / kemp. */
export const lodgingOptions = pgTable(
  'lodging_options',
  {
    id: id(),
    tripId: uuid('trip_id').references(() => trips.id, { onDelete: 'cascade' }),
    regionId: text('region_id').references(() => regions.id),
    poiId: uuid('poi_id').references(() => pois.id),
    kind: lodgingKindEnum('kind').notNull(),
    name: text('name').notNull(),
    url: text('url'),
    connectorId: text('connector_id').notNull().default('lodging-manual'),
    lat: numeric('lat', { precision: 9, scale: 6 }),
    lng: numeric('lng', { precision: 9, scale: 6 }),
    pricePerNight: money('price_per_night'),
    pricePerPerson: money('price_per_person'),
    cleaningFee: money('cleaning_fee'),
    serviceFeePct: numeric('service_fee_pct', { precision: 5, scale: 2 }),
    cityTaxPp: money('city_tax_pp'),
    capacity: integer('capacity'),
    bedrooms: integer('bedrooms'),
    hasKitchen: boolean('has_kitchen').default(false),
    hasParking: boolean('has_parking').default(true),
    hasWifi: boolean('has_wifi').default(true),
    privateBath: boolean('private_bath').default(false),
    freeCancel: boolean('free_cancel').default(false),
    rating: numeric('rating', { precision: 3, scale: 1 }),
    reviewsCount: integer('reviews_count'),
    checkInFrom: time('check_in_from'),
    checkInUntil: time('check_in_until'),
    openUntil: date('open_until'),
    sleepingBag: boolean('sleeping_bag').default(false),
    laundry: boolean('laundry').default(false),
    darkSky: boolean('dark_sky').default(false),
    electricity: boolean('electricity').default(false),
    showers: boolean('showers').default(true),
    distanceFromRouteKm: numeric('distance_from_route_km', { precision: 6, scale: 1 }),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('lodging_options_trip_idx').on(t.tripId),
    index('lodging_options_region_idx').on(t.regionId, t.kind),
    pgPolicy('lodging_options_read', {
      for: 'select',
      to: authenticatedRole,
      using: sql`${t.tripId} is null or public.is_trip_member(${t.tripId})`,
    }),
    pgPolicy('lodging_options_write', {
      for: 'all',
      to: authenticatedRole,
      using: sql`${t.tripId} is not null and public.is_trip_editor(${t.tripId})`,
      withCheck: sql`${t.tripId} is not null and public.is_trip_editor(${t.tripId})`,
    }),
  ],
).enableRLS();

/** Ktorá noc kde – per vetva (car | camper | no_car). */
export const lodgingStays = pgTable(
  'lodging_stays',
  {
    id: id(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    scenarioKey: scenarioKeyEnum('scenario_key').notNull(),
    nightDate: date('night_date').notNull(),
    nightIndex: integer('night_index').notNull(),
    dayId: uuid('day_id').references(() => itineraryDays.id, { onDelete: 'set null' }),
    regionId: text('region_id').references(() => regions.id),
    lodgingOptionId: uuid('lodging_option_id').references(() => lodgingOptions.id, { onDelete: 'set null' }),
    kindOverride: lodgingKindEnum('kind_override'),
    priceOverride: money('price_override'),
    priceRangeMin: money('price_range_min'),
    priceRangeMax: money('price_range_max'),
    hasKitchen: boolean('has_kitchen'),
    isManual: boolean('is_manual').notNull().default(false),
    notes: text('notes'),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('lodging_stays_trip_idx').on(t.tripId, t.scenarioKey, t.nightIndex),
    ...tripScoped(t.tripId, 'lodging_stays'),
  ],
).enableRLS();

/** Seed (trip_id null) alebo per trip. */
export const vehicleOptions = pgTable(
  'vehicle_options',
  {
    id: id(),
    tripId: uuid('trip_id').references(() => trips.id, { onDelete: 'cascade' }),
    kind: vehicleKindEnum('kind').notNull(),
    class: vehicleClassEnum('class').notNull(),
    provider: text('provider').notNull(),
    name: text('name').notNull(),
    seats: integer('seats').notNull().default(5),
    sleeps: integer('sleeps').default(0),
    fuel: fuelEnum('fuel').notNull().default('petrol'),
    consumptionL100km: numeric('consumption_l_100km', { precision: 4, scale: 1 }).notNull(),
    pricePerDay: money('price_per_day').notNull(),
    priceHighSeasonPerDay: money('price_high_season_per_day'),
    insurance:
      jsonb('insurance').$type<Record<string, { perDay: number; included?: boolean; note?: string }>>(),
    extras: jsonb('extras').$type<Record<string, { perDay?: number; flat?: number; note?: string }>>(),
    deposit: money('deposit'),
    driverMinAge: integer('driver_min_age').notNull().default(20),
    driverMinYears: integer('driver_min_years').notNull().default(1),
    kmLimitPerDay: integer('km_limit_per_day'),
    fuelPolicy: text('fuel_policy').default('full_to_full'),
    pickupMode: pickupModeEnum('pickup_mode').notNull().default('shuttle'),
    heater: boolean('heater').default(false),
    luggageCapacity: integer('luggage_capacity').default(2),
    fRoadsAllowed: boolean('f_roads_allowed').default(false),
    gravelDifficulty: difficultyEnum('gravel_difficulty'),
    url: text('url'),
    notes: text('notes'),
    verifiedAt: date('verified_at'),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('vehicle_options_kind_idx').on(t.kind, t.class),
    pgPolicy('vehicle_options_read', {
      for: 'select',
      to: authenticatedRole,
      using: sql`${t.tripId} is null or public.is_trip_member(${t.tripId})`,
    }),
    pgPolicy('vehicle_options_write', {
      for: 'all',
      to: authenticatedRole,
      using: sql`${t.tripId} is not null and public.is_trip_editor(${t.tripId})`,
      withCheck: sql`${t.tripId} is not null and public.is_trip_editor(${t.tripId})`,
    }),
  ],
).enableRLS();

export const vehicleSelection = pgTable(
  'vehicle_selection',
  {
    id: id(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    scenarioKey: scenarioKeyEnum('scenario_key').notNull(),
    vehicleOptionId: uuid('vehicle_option_id').references(() => vehicleOptions.id, { onDelete: 'set null' }),
    days: integer('days'),
    insuranceChosen: text('insurance_chosen')
      .array()
      .default(sql`'{}'::text[]`),
    extrasChosen: jsonb('extras_chosen').$type<Record<string, number>>(),
    campingCard: boolean('camping_card').default(false),
    consumptionOverride: numeric('consumption_override', { precision: 4, scale: 1 }),
    fuelPriceOverride: numeric('fuel_price_override', { precision: 8, scale: 2 }),
    priceOverride: money('price_override'),
    isManual: boolean('is_manual').notNull().default(false),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('vehicle_selection_trip_idx').on(t.tripId, t.scenarioKey),
    ...tripScoped(t.tripId, 'vehicle_selection'),
  ],
).enableRLS();
