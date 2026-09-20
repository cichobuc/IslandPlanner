-- RLS pomocné funkcie (security definer, aby sa trip_members nerekurzovalo).
-- Aplikuje src/db/apply-sql.ts po `drizzle-kit push`. Idempotentné.

create or replace function public.is_trip_member(tid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from trip_members m where m.trip_id = tid and m.user_id = auth.uid());
$$;

create or replace function public.trip_role(tid uuid)
returns text language sql stable security definer set search_path = public as $$
  select m.role::text from trip_members m where m.trip_id = tid and m.user_id = auth.uid() limit 1;
$$;

create or replace function public.is_trip_editor(tid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from trip_members m where m.trip_id = tid and m.user_id = auth.uid() and m.role in ('owner', 'editor')
  );
$$;

create or replace function public.is_trip_owner(tid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from trips t where t.id = tid and t.owner_id = auth.uid())
      or exists (select 1 from trip_members m where m.trip_id = tid and m.user_id = auth.uid() and m.role = 'owner');
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select p.is_admin from profiles p where p.user_id = auth.uid()), false);
$$;

-- Členovia tej istej cesty vidia navzájom profily (mená, avatary).
create or replace function public.shares_trip_with(other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from trip_members a join trip_members b on a.trip_id = b.trip_id
    where a.user_id = auth.uid() and b.user_id = other
  );
$$;

-- Pri založení cesty sa vlastník automaticky stane členom s rolou owner.
create or replace function public.trips_add_owner_member()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into trip_members (trip_id, user_id, role) values (new.id, new.owner_id, 'owner')
  on conflict (trip_id, user_id) do update set role = 'owner';
  return new;
end;
$$;
drop trigger if exists trips_add_owner_member on trips;
create trigger trips_add_owner_member after insert on trips
  for each row execute function public.trips_add_owner_member();

-- updated_at sa nastaví pri každom update (optimistic concurrency, K5).
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  for t in
    select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'updated_at'
  loop
    execute format('drop trigger if exists set_updated_at on %I', t);
    execute format('create trigger set_updated_at before update on %I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

grant execute on function public.is_trip_member(uuid), public.trip_role(uuid), public.is_trip_editor(uuid),
  public.is_trip_owner(uuid), public.is_admin(), public.shares_trip_with(uuid) to authenticated, anon, service_role;
