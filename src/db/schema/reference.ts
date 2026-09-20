import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import type { PriceRuleTier } from '@/engine/types';
import {
  airlineKindEnum,
  bagTypeEnum,
  bestLightEnum,
  bringCategoryEnum,
  difficultyEnum,
  droneStatusEnum,
  droneZoneKindEnum,
  droneZoneStatusEnum,
  fuelEnum,
  id,
  money,
  parkingKindEnum,
  poiKindEnum,
  pricePerEnum,
  publicRead,
} from './_shared';

/** Seed: BTS, VIE, BUD, PRG, KTW, KEF + huby. */
export const airports = pgTable(
  'airports',
  {
    iata: text('iata').primaryKey(),
    name: text('name').notNull(),
    city: text('city').notNull(),
    country: text('country').notNull(),
    lat: numeric('lat', { precision: 9, scale: 6 }).notNull(),
    lng: numeric('lng', { precision: 9, scale: 6 }).notNull(),
    tz: text('tz').notNull().default('Europe/Vienna'),
    driveKmFromHome: numeric('drive_km_from_home', { precision: 7, scale: 1 }),
    driveMinFromHome: integer('drive_min_from_home'),
    isOrigin: boolean('is_origin').notNull().default(false),
    isHub: boolean('is_hub').notNull().default(false),
  },
  () => [publicRead('airports')],
).enableRLS();

export const airlines = pgTable(
  'airlines',
  {
    iata: text('iata').primaryKey(),
    name: text('name').notNull(),
    kind: airlineKindEnum('kind').notNull().default('lcc'),
    website: text('website'),
  },
  () => [publicRead('airlines')],
).enableRLS();

/** LCC batožina je dynamická – držíme rozsah, používame stred. */
export const baggageRules = pgTable(
  'baggage_rules',
  {
    id: id(),
    airline: text('airline')
      .notNull()
      .references(() => airlines.iata),
    bagType: bagTypeEnum('bag_type').notNull(),
    priceLow: numeric('price_low', { precision: 10, scale: 2 }).notNull(),
    priceHigh: numeric('price_high', { precision: 10, scale: 2 }).notNull(),
    currency: text('currency').notNull().default('EUR'),
    maxKg: integer('max_kg'),
    dims: text('dims'),
    verifiedAt: date('verified_at'),
    notes: text('notes'),
  },
  (t) => [index('baggage_rules_airline_idx').on(t.airline, t.bagType), publicRead('baggage_rules')],
).enableRLS();

export const parkingOptions = pgTable(
  'parking_options',
  {
    id: id(),
    iata: text('iata')
      .notNull()
      .references(() => airports.iata),
    name: text('name').notNull(),
    kind: parkingKindEnum('kind').notNull(),
    priceRules: jsonb('price_rules').$type<PriceRuleTier[]>().notNull(),
    currency: text('currency').notNull().default('EUR'),
    source: text('source'),
    url: text('url'),
    shuttleMin: integer('shuttle_min'),
    verifiedAt: date('verified_at'),
    notes: text('notes'),
  },
  (t) => [index('parking_options_iata_idx').on(t.iata), publicRead('parking_options')],
).enableRLS();

export const regions = pgTable(
  'regions',
  {
    id: text('id').primaryKey(), // slug: reykjavik, golden_circle, south, ...
    nameSk: text('name_sk').notNull(),
    nameCs: text('name_cs'),
    nameEn: text('name_en').notNull(),
    centroidLat: numeric('centroid_lat', { precision: 9, scale: 6 }).notNull(),
    centroidLng: numeric('centroid_lng', { precision: 9, scale: 6 }).notNull(),
    polygon: jsonb('polygon'),
    orderOnRing: integer('order_on_ring'),
  },
  () => [publicRead('regions')],
).enableRLS();

export const droneZones = pgTable(
  'drone_zones',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    kind: droneZoneKindEnum('kind').notNull(),
    status: droneZoneStatusEnum('status').notNull(),
    geometry: jsonb('geometry').notNull(),
    season: jsonb('season').$type<{ from: string; to: string }>(),
    rulesSk: text('rules_sk'),
    rulesCs: text('rules_cs'),
    authority: text('authority'),
    permitUrl: text('permit_url'),
    sourceUrl: text('source_url'),
    verifiedAt: date('verified_at'),
  },
  () => [publicRead('drone_zones')],
).enableRLS();

/** Atrakcie, kempy, čerpacie stanice… (docs/07). */
export const pois = pgTable(
  'pois',
  {
    id: id(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    nameSk: text('name_sk'),
    nameCs: text('name_cs'),
    kind: poiKindEnum('kind').notNull(),
    categoryTags: text('category_tags')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    regionId: text('region_id').references(() => regions.id),
    lat: numeric('lat', { precision: 9, scale: 6 }).notNull(),
    lng: numeric('lng', { precision: 9, scale: 6 }).notNull(),
    descriptionSk: text('description_sk'),
    descriptionCs: text('description_cs'),
    tipsSk: text('tips_sk'),
    tipsCs: text('tips_cs'),
    visitMin: integer('visit_min'),
    visitMinMin: integer('visit_min_min'),
    visitMinMax: integer('visit_min_max'),
    walkKm: numeric('walk_km', { precision: 5, scale: 1 }),
    difficulty: difficultyEnum('difficulty'),
    entryNoteSk: text('entry_note_sk'),
    entryNoteCs: text('entry_note_cs'),
    parkingFee: money('parking_fee'),
    photoUrl: text('photo_url'), // Wikimedia Commons náhľad 800 px (scripts/fetch-poi-photos.ts)
    photoCredit: text('photo_credit'), // autor · licencia · Wikimedia Commons
    websiteUrl: text('website_url'),
    wikiUrl: text('wiki_url'), // článok na en.wikipedia.org
    mapsUrl: text('maps_url'),
    facilities: text('facilities')
      .array()
      .default(sql`'{}'::text[]`),
    bookAheadDays: integer('book_ahead_days'),
    cancelPolicySk: text('cancel_policy_sk'),
    cancelPolicyCs: text('cancel_policy_cs'),
    bring: text('bring')
      .array()
      .default(sql`'{}'::text[]`),
    openHours: jsonb('open_hours'),
    openHoursSeason: jsonb('open_hours_season'),
    bestLight: bestLightEnum('best_light').default('any'),
    cheaperAlternativePoiId: uuid('cheaper_alternative_poi_id'),
    rainyDayOk: boolean('rainy_day_ok').default(false),
    popularity: integer('popularity').default(3),
    hiddenGem: boolean('hidden_gem').default(false),
    bestMonths: integer('best_months').array(),
    monthRating: jsonb('month_rating').$type<Record<string, number>>(),
    seasonNoteSk: text('season_note_sk'),
    seasonNoteCs: text('season_note_cs'),
    droneStatus: droneStatusEnum('drone_status').default('unknown'),
    droneNoteSk: text('drone_note_sk'),
    droneNoteCs: text('drone_note_cs'),
    droneZoneId: text('drone_zone_id').references(() => droneZones.id),
    bookingRequired: boolean('booking_required').default(false),
    bookingUrl: text('booking_url'),
    provider: text('provider'),
    viatorProductCode: text('viator_product_code'),
    season: jsonb('season').$type<{ from: string; to: string }>(),
    requires4x4: boolean('requires_4x4').default(false),
    interestWeight: jsonb('interest_weight').$type<Record<string, number>>(),
    onRing: boolean('on_ring').default(true),
    verifiedAt: date('verified_at'),
    sourceUrl: text('source_url'),
  },
  (t) => [index('pois_region_idx').on(t.regionId), index('pois_kind_idx').on(t.kind), publicRead('pois')],
).enableRLS();

/** Vstupné podľa veku – vyhodnocuje sa v deň návštevy. Bez pravidiel = zadarmo. */
export const poiPriceRules = pgTable(
  'poi_price_rules',
  {
    id: id(),
    poiId: uuid('poi_id')
      .notNull()
      .references(() => pois.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    minAge: integer('min_age'),
    maxAge: integer('max_age'),
    price: money('price').notNull(),
    per: pricePerEnum('per').notNull().default('person'),
    variant: text('variant').default('basic'),
    isDefault: boolean('is_default').default(true),
    notes: text('notes'),
  },
  (t) => [index('poi_price_rules_poi_idx').on(t.poiId), publicRead('poi_price_rules')],
).enableRLS();

/** K1: predpočítaná matica (ORS Matrix) pre seed POI + letiská; itinerár bez sieťových volaní. */
export const routeMatrix = pgTable(
  'route_matrix',
  {
    fromSlug: text('from_slug').notNull(),
    toSlug: text('to_slug').notNull(),
    km: numeric('km', { precision: 8, scale: 1 }).notNull(),
    min: numeric('min', { precision: 8, scale: 1 }).notNull(),
    surface: text('surface').default('paved'),
  },
  (t) => [primaryKey({ columns: [t.fromSlug, t.toSlug] }), publicRead('route_matrix')],
).enableRLS();

export const fxRates = pgTable(
  'fx_rates',
  {
    date: date('date').notNull(),
    base: text('base').notNull(),
    quote: text('quote').notNull(),
    rate: numeric('rate', { precision: 14, scale: 6 }).notNull(),
    source: text('source').notNull().default('frankfurter'),
  },
  (t) => [primaryKey({ columns: [t.date, t.base, t.quote] }), publicRead('fx_rates')],
).enableRLS();

export const fuelPrices = pgTable(
  'fuel_prices',
  {
    date: date('date').notNull(),
    fuel: fuelEnum('fuel').notNull(),
    priceIskPerL: numeric('price_isk_per_l', { precision: 8, scale: 2 }).notNull(),
    station: text('station'),
    source: text('source').notNull().default('gasvaktin'),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.date, t.fuel] }), publicRead('fuel_prices')],
).enableRLS();

/** „Vziať z Bratislavy" – seed položky (ADR-012). */
export const bringItems = pgTable(
  'bring_items',
  {
    id: id(),
    category: bringCategoryEnum('category').notNull(),
    nameSk: text('name_sk').notNull(),
    nameCs: text('name_cs'),
    priceIs: money('price_is'),
    priceSk: money('price_sk'),
    weightG: integer('weight_g'),
    volumeL: numeric('volume_l', { precision: 5, scale: 2 }),
    customsNote: text('customs_note'),
    airlineNote: text('airline_note'),
    defaultQtyPerPerson: numeric('default_qty_per_person', { precision: 5, scale: 2 }).default('1'),
    seasonal: boolean('seasonal').default(false),
  },
  () => [publicRead('bring_items')],
).enableRLS();
