import { sql } from 'drizzle-orm';
import { boolean, index, integer, jsonb, pgPolicy, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { authUsers, authenticatedRole } from 'drizzle-orm/supabase';
import { createdAt, id, templateKindEnum, updatedAt, visibilityEnum } from './_shared';

/** Čokoľvek uložené ako šablóna – fork do vlastnej cesty (v1.1). */
export const templates = pgTable(
  'templates',
  {
    id: id(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    kind: templateKindEnum('kind').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    visibility: visibilityEnum('visibility').notNull().default('private'),
    payload: jsonb('payload').notNull(),
    days: integer('days'),
    baseRegionOrder: text('base_region_order').array(),
    sourceTripId: uuid('source_trip_id'),
    forksCount: integer('forks_count').notNull().default(0),
    version: integer('version').notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('templates_owner_idx').on(t.ownerId),
    index('templates_visibility_idx').on(t.visibility, t.kind),
    pgPolicy('templates_read', {
      for: 'select',
      to: authenticatedRole,
      using: sql`${t.ownerId} = auth.uid() or ${t.visibility} in ('public', 'link') or exists (select 1 from template_shares s where s.template_id = ${t.id} and s.user_id = auth.uid())`,
    }),
    pgPolicy('templates_owner_write', {
      for: 'all',
      to: authenticatedRole,
      using: sql`${t.ownerId} = auth.uid()`,
      withCheck: sql`${t.ownerId} = auth.uid()`,
    }),
  ],
).enableRLS();

export const templateShares = pgTable(
  'template_shares',
  {
    id: id(),
    templateId: uuid('template_id')
      .notNull()
      .references(() => templates.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => authUsers.id, { onDelete: 'cascade' }),
    email: text('email'),
    canEdit: boolean('can_edit').notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    index('template_shares_template_idx').on(t.templateId),
    pgPolicy('template_shares_read', {
      for: 'select',
      to: authenticatedRole,
      using: sql`${t.userId} = auth.uid() or exists (select 1 from templates tp where tp.id = ${t.templateId} and tp.owner_id = auth.uid())`,
    }),
    pgPolicy('template_shares_owner_write', {
      for: 'all',
      to: authenticatedRole,
      using: sql`exists (select 1 from templates tp where tp.id = ${t.templateId} and tp.owner_id = auth.uid())`,
      withCheck: sql`exists (select 1 from templates tp where tp.id = ${t.templateId} and tp.owner_id = auth.uid())`,
    }),
  ],
).enableRLS();
