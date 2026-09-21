import { sql } from 'drizzle-orm';
import { jsonb, pgEnum, pgPolicy, timestamp, uuid } from 'drizzle-orm/pg-core';
import { authenticatedRole } from 'drizzle-orm/supabase';
import type { Money } from '@/engine/types';

// ---- enumy (docs/03) ----
export const memberRoleEnum = pgEnum('member_role', ['owner', 'editor', 'viewer']);
export const paceEnum = pgEnum('pace', ['relaxed', 'normal', 'intense']);
export const comfortEnum = pgEnum('comfort', ['camp', 'hostel', 'guesthouse', 'hotel']);
export const foodLevelEnum = pgEnum('food_level', ['budget', 'mid', 'comfort']);
export const bagsPrefEnum = pgEnum('bags_pref', ['light', 'checked']);
export const transportModeEnum = pgEnum('transport_mode', ['car', 'camper', 'no_car']);
export const tripStatusEnum = pgEnum('trip_status', ['draft', 'planned', 'booked', 'done']);
// 'drive' = spoločný itinerár pre Auto + Karavan (K4); car/camper pre noci a vozidlo; no_car samostatne
export const scenarioKeyEnum = pgEnum('scenario_key', ['car', 'camper', 'no_car', 'drive']);
export const moneySourceEnum = pgEnum('money_source', ['api', 'seed', 'manual', 'estimate']);
export const accessModeEnum = pgEnum('access_mode', ['car', 'bus', 'train']);
export const parkingKindEnum = pgEnum('parking_kind', ['official', 'external_shuttle']);
export const airlineKindEnum = pgEnum('airline_kind', ['lcc', 'full']);
export const bagTypeEnum = pgEnum('bag_type', [
  'cabin_small',
  'cabin_10',
  'checked_20',
  'checked_32',
  'priority',
]);
export const searchStatusEnum = pgEnum('search_status', ['pending', 'running', 'done', 'failed']);
export const poiKindEnum = pgEnum('poi_kind', [
  'attraction',
  'thermal',
  'tour',
  'museum',
  'campsite',
  'fuel',
  'grocery',
  'viewpoint',
]);
export const difficultyEnum = pgEnum('difficulty', ['easy', 'moderate', 'hard']);
export const bestLightEnum = pgEnum('best_light', ['morning', 'evening', 'any']);
export const droneStatusEnum = pgEnum('drone_status', [
  'allowed',
  'restricted',
  'permit',
  'banned',
  'unknown',
]);
export const droneZoneKindEnum = pgEnum('drone_zone_kind', [
  'national_park',
  'nature_reserve',
  'airport_ctr',
  'urban',
  'bird_sanctuary',
  'private_ban',
  'seasonal',
]);
export const droneZoneStatusEnum = pgEnum('drone_zone_status', ['banned', 'permit', 'restricted']);
export const pricePerEnum = pgEnum('price_per', ['person', 'vehicle', 'group']);
export const lodgingKindEnum = pgEnum('lodging_kind', [
  'airbnb',
  'hotel',
  'guesthouse',
  'hostel',
  'campsite',
  'camper_site',
]);
export const vehicleKindEnum = pgEnum('vehicle_kind', ['car', 'camper']);
export const vehicleClassEnum = pgEnum('vehicle_class', [
  'economy',
  'estate',
  'suv2wd',
  '4x4',
  'camper2',
  'camper4',
  'camper4x4',
  'motorhome',
]);
export const fuelEnum = pgEnum('fuel', ['petrol', 'diesel']);
export const pickupModeEnum = pgEnum('pickup_mode', ['desk', 'shuttle']);
export const splitEnum = pgEnum('split', ['group', 'vehicle', 'person', 'custom']);
export const manualCategoryEnum = pgEnum('manual_category', ['insurance', 'sim', 'souvenir', 'other']);
export const bringCategoryEnum = pgEnum('bring_category', [
  'food',
  'drink',
  'hygiene',
  'meds',
  'gear',
  'other',
]);
export const bringDecisionEnum = pgEnum('bring_decision', ['take', 'buy_there', 'skip']);
export const snapshotSubjectEnum = pgEnum('snapshot_subject', ['flight', 'tour', 'vehicle', 'fx', 'fuel']);
export const notificationKindEnum = pgEnum('notification_kind', [
  'price_change',
  'booking_deadline',
  'connector_down',
  'weekly',
]);
export const templateKindEnum = pgEnum('template_kind', ['route', 'config', 'trip', 'food', 'vehicle']);
export const visibilityEnum = pgEnum('visibility', ['private', 'link', 'shared', 'public']);
export const revisionEntityEnum = pgEnum('revision_entity', [
  'itinerary_stop',
  'itinerary_day',
  'lodging_stay',
  'vehicle_selection',
  'food_profile',
  'flight_selection',
  'trip',
]);
export const revisionOpEnum = pgEnum('revision_op', ['create', 'update', 'delete', 'reorder']);
export const connectorStatusEnum = pgEnum('connector_status', ['ok', 'degraded', 'down', 'unknown']);

// ---- pomocné stĺpce ----
export const id = () => uuid('id').primaryKey().defaultRandom();
export const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
/** Optimistic concurrency (K5): každý zápis nesie pôvodný updated_at, server odmietne starší. */
export const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow();
/** Cena s pôvodom (docs/02 zásada 3) – jsonb, súčty robí engine. */
export const money = (name: string) => jsonb(name).$type<Money>();

// ---- RLS pomocníci (funkcie sú v src/db/sql/functions.sql, security definer) ----
export const memberRead = (tripCol: unknown, name: string) =>
  pgPolicy(`${name}_member_read`, {
    for: 'select',
    to: authenticatedRole,
    using: sql`public.is_trip_member(${tripCol})`,
  });
export const editorWrite = (tripCol: unknown, name: string) => [
  pgPolicy(`${name}_editor_insert`, {
    for: 'insert',
    to: authenticatedRole,
    withCheck: sql`public.is_trip_editor(${tripCol})`,
  }),
  pgPolicy(`${name}_editor_update`, {
    for: 'update',
    to: authenticatedRole,
    using: sql`public.is_trip_editor(${tripCol})`,
    withCheck: sql`public.is_trip_editor(${tripCol})`,
  }),
  pgPolicy(`${name}_editor_delete`, {
    for: 'delete',
    to: authenticatedRole,
    using: sql`public.is_trip_editor(${tripCol})`,
  }),
];
/** Štandard pre detské tabuľky cesty: člen číta, editor píše. */
export const tripScoped = (tripCol: unknown, name: string) => [
  memberRead(tripCol, name),
  ...editorWrite(tripCol, name),
];
/** Verejné referenčné tabuľky (seed/cron píše service role, ktorá RLS obchádza). */
export const publicRead = (name: string) =>
  pgPolicy(`${name}_public_read`, { for: 'select', to: 'public', using: sql`true` });
