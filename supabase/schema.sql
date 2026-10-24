-- AutoCares schema — safe to re-run in Supabase SQL Editor
-- Ensures tables/columns exist before creating policies.

create extension if not exists "pgcrypto";

-- Enums
do $$ begin
  create type public.user_role as enum ('customer', 'mechanic', 'admin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.verification_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.request_status as enum (
    'pending', 'accepted', 'rejected', 'en_route', 'in_progress', 'completed', 'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.problem_type as enum (
    'flat_tire', 'dead_battery', 'engine_issue', 'overheating', 'towing', 'sos', 'other'
  );
exception when duplicate_object then null;
end $$;

-- Helper: add a column only if missing
create or replace function public._autocares_add_column(
  p_table text,
  p_column text,
  p_definition text
) returns void
language plpgsql
as $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = p_table
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = p_table and column_name = p_column
  ) then
    execute format('alter table public.%I add column %s', p_table, p_definition);
  end if;
end;
$$;

-- =====================
-- profiles
-- =====================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role public.user_role not null default 'customer',
  phone text,
  avatar_url text,
  is_disabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

select public._autocares_add_column('profiles', 'full_name', 'full_name text');
select public._autocares_add_column('profiles', 'first_name', 'first_name text');
select public._autocares_add_column('profiles', 'last_name', 'last_name text');
select public._autocares_add_column('profiles', 'phone', 'phone text');
select public._autocares_add_column('profiles', 'avatar_url', 'avatar_url text');
select public._autocares_add_column('profiles', 'is_disabled', 'is_disabled boolean not null default false');
select public._autocares_add_column('profiles', 'created_at', 'created_at timestamptz not null default now()');
select public._autocares_add_column('profiles', 'updated_at', 'updated_at timestamptz not null default now()');

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'role'
  ) then
    alter table public.profiles
      add column role public.user_role not null default 'customer';
  end if;
end $$;

-- =====================
-- mechanic_profiles
-- =====================
create table if not exists public.mechanic_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  workshop_name text,
  mechanic_type text check (mechanic_type in ('Car Mechanic', 'Bike Mechanic')),
  specialties text[] not null default '{}',
  experience_years int not null default 0,
  service_radius_km numeric not null default 15,
  working_hours text default '09:00-18:00',
  is_available boolean not null default true,
  verification_status public.verification_status not null default 'pending',
  latitude double precision,
  longitude double precision,
  average_rating numeric not null default 0,
  rating_count int not null default 0,
  completed_jobs int not null default 0,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

select public._autocares_add_column(
  'mechanic_profiles',
  'mechanic_type',
  'mechanic_type text check (mechanic_type in (''Car Mechanic'', ''Bike Mechanic''))'
);

create table if not exists public.mechanic_private_details (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  cnic_number text not null check (cnic_number ~ '^[0-9]{13}$'),
  created_at timestamptz not null default now()
);

-- =====================
-- vehicles
-- =====================
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  vehicle_type text check (vehicle_type in ('Bike', 'Car', 'Scooter', 'Van')),
  make text not null,
  model text not null,
  year int,
  registration_number text,
  color text,
  notes text,
  created_at timestamptz not null default now()
);

-- Existing vehicles table without customer_id (common failure point)
do $$ begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'vehicles'
  ) then
    -- rename user_id -> customer_id if that was the old name
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'vehicles' and column_name = 'user_id'
    ) and not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'vehicles' and column_name = 'customer_id'
    ) then
      alter table public.vehicles rename column user_id to customer_id;
    end if;

    -- add customer_id if still missing (nullable first, then backfill is skipped)
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'vehicles' and column_name = 'customer_id'
    ) then
      alter table public.vehicles add column customer_id uuid references public.profiles (id) on delete cascade;
    end if;
  end if;
end $$;

select public._autocares_add_column('vehicles', 'make', 'make text');
select public._autocares_add_column('vehicles', 'model', 'model text');
select public._autocares_add_column(
  'vehicles',
  'vehicle_type',
  'vehicle_type text check (vehicle_type in (''Bike'', ''Car'', ''Scooter'', ''Van''))'
);
select public._autocares_add_column('vehicles', 'year', 'year int');
select public._autocares_add_column('vehicles', 'registration_number', 'registration_number text');
select public._autocares_add_column('vehicles', 'color', 'color text');
select public._autocares_add_column('vehicles', 'notes', 'notes text');
select public._autocares_add_column('vehicles', 'created_at', 'created_at timestamptz not null default now()');

-- =====================
-- vehicle_diagnostics
-- =====================
create table if not exists public.vehicle_diagnostics (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  code text,
  description text not null,
  recorded_at timestamptz not null default now()
);

-- =====================
-- service_requests
-- =====================
create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  mechanic_id uuid references public.profiles (id) on delete set null,
  vehicle_id uuid references public.vehicles (id) on delete set null,
  problem_type public.problem_type not null,
  description text,
  status public.request_status not null default 'pending',
  customer_lat double precision,
  customer_lng double precision,
  estimated_arrival_minutes int,
  diagnosis text,
  work_performed text,
  final_cost numeric,
  dispute_flag boolean not null default false,
  is_sos boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

do $$ begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'service_requests'
  ) then
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'service_requests' and column_name = 'user_id'
    ) and not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'service_requests' and column_name = 'customer_id'
    ) then
      alter table public.service_requests rename column user_id to customer_id;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'service_requests' and column_name = 'customer_id'
    ) then
      alter table public.service_requests
        add column customer_id uuid references public.profiles (id) on delete cascade;
    end if;
  end if;
end $$;

select public._autocares_add_column('service_requests', 'mechanic_id', 'mechanic_id uuid references public.profiles (id) on delete set null');
select public._autocares_add_column('service_requests', 'vehicle_id', 'vehicle_id uuid references public.vehicles (id) on delete set null');
select public._autocares_add_column('service_requests', 'problem_type', 'problem_type public.problem_type');
select public._autocares_add_column('service_requests', 'description', 'description text');
select public._autocares_add_column('service_requests', 'status', 'status public.request_status not null default ''pending''');
select public._autocares_add_column('service_requests', 'customer_lat', 'customer_lat double precision');
select public._autocares_add_column('service_requests', 'customer_lng', 'customer_lng double precision');
select public._autocares_add_column('service_requests', 'estimated_arrival_minutes', 'estimated_arrival_minutes int');
select public._autocares_add_column('service_requests', 'diagnosis', 'diagnosis text');
select public._autocares_add_column('service_requests', 'work_performed', 'work_performed text');
select public._autocares_add_column('service_requests', 'final_cost', 'final_cost numeric');
select public._autocares_add_column('service_requests', 'diagnosis_fee', 'diagnosis_fee numeric');
select public._autocares_add_column('service_requests', 'diagnosis_payment_status', 'diagnosis_payment_status text not null default ''pending'' check (diagnosis_payment_status in (''pending'', ''paid'', ''failed''))');
select public._autocares_add_column('service_requests', 'diagnosis_paid_at', 'diagnosis_paid_at timestamptz');
select public._autocares_add_column('service_requests', 'repair_charges', 'repair_charges numeric');
select public._autocares_add_column('service_requests', 'repair_payment_status', 'repair_payment_status text not null default ''pending'' check (repair_payment_status in (''pending'', ''paid'', ''failed''))');
select public._autocares_add_column('service_requests', 'repair_paid_at', 'repair_paid_at timestamptz');
select public._autocares_add_column('service_requests', 'dispute_flag', 'dispute_flag boolean not null default false');
select public._autocares_add_column('service_requests', 'is_sos', 'is_sos boolean not null default false');
select public._autocares_add_column('service_requests', 'created_at', 'created_at timestamptz not null default now()');
select public._autocares_add_column('service_requests', 'updated_at', 'updated_at timestamptz not null default now()');
select public._autocares_add_column('service_requests', 'completed_at', 'completed_at timestamptz');

-- =====================
-- remaining tables
-- =====================
create table if not exists public.mechanic_locations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests (id) on delete cascade,
  mechanic_id uuid not null references public.profiles (id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  recorded_at timestamptz not null default now()
);

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.service_requests (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  mechanic_id uuid not null references public.profiles (id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

do $$ begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'ratings'
  ) then
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'ratings' and column_name = 'user_id'
    ) and not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'ratings' and column_name = 'customer_id'
    ) then
      alter table public.ratings rename column user_id to customer_id;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'ratings' and column_name = 'customer_id'
    ) then
      alter table public.ratings
        add column customer_id uuid references public.profiles (id) on delete cascade;
    end if;
  end if;
end $$;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null,
  message text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.service_categories (
  id text primary key,
  label text not null,
  description text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.service_categories (id, label, description)
values
  ('flat_tire', 'Flat tire', 'Flat or damaged tire assistance'),
  ('dead_battery', 'Dead battery', 'Jump-start and battery assistance'),
  ('engine_issue', 'Engine issue', 'Engine troubleshooting and repair'),
  ('overheating', 'Overheating', 'Vehicle overheating assistance'),
  ('towing', 'Towing', 'Vehicle towing service'),
  ('sos', 'Emergency SOS', 'Urgent roadside emergency'),
  ('other', 'Other', 'Other roadside assistance')
on conflict (id) do nothing;

create table if not exists public.admin_activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  mechanic_id uuid references public.profiles (id) on delete set null,
  payment_type text not null check (payment_type in ('diagnosis_fee', 'repair_charge')),
  amount numeric not null check (amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  payment_method text not null default 'cash',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_request_payment_type unique (request_id, payment_type)
);

create index if not exists idx_payments_customer on public.payments (customer_id, created_at desc);
create index if not exists idx_payments_mechanic on public.payments (mechanic_id, created_at desc);
create index if not exists idx_payments_request on public.payments (request_id);

-- =====================
-- functions / triggers
-- =====================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen_role public.user_role;
begin
  chosen_role := coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'customer');
  if chosen_role = 'admin' then
    chosen_role := 'customer';
  end if;

  insert into public.profiles (id, full_name, first_name, last_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'phone',
    chosen_role
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        phone = excluded.phone,
        role = excluded.role,
        updated_at = now();

  if chosen_role = 'mechanic' then
    insert into public.mechanic_profiles as existing_mechanic (
      user_id,
      workshop_name,
      mechanic_type,
      specialties,
      experience_years
    )
    values (
      new.id,
      new.raw_user_meta_data->>'business_name',
      case
        when new.raw_user_meta_data->>'mechanic_type' in ('Car Mechanic', 'Bike Mechanic')
        then new.raw_user_meta_data->>'mechanic_type'
        else null
      end,
      case
        when new.raw_user_meta_data->>'mechanic_type' in ('Car Mechanic', 'Bike Mechanic')
        then array[new.raw_user_meta_data->>'mechanic_type']
        else '{}'::text[]
      end,
      case
        when new.raw_user_meta_data->>'years_experience' ~ '^[0-9]{1,10}$'
        then case
          when (new.raw_user_meta_data->>'years_experience')::numeric <= 2147483647
          then (new.raw_user_meta_data->>'years_experience')::int
          else 0
        end
        else 0
      end
    )
    on conflict (user_id) do update
      set
        workshop_name = coalesce(excluded.workshop_name, existing_mechanic.workshop_name),
        mechanic_type = coalesce(excluded.mechanic_type, existing_mechanic.mechanic_type),
        specialties = case
          when cardinality(excluded.specialties) > 0 then excluded.specialties
          else existing_mechanic.specialties
        end,
        experience_years = excluded.experience_years,
        updated_at = now();

    if new.raw_user_meta_data->>'cnic_number' ~ '^[0-9]{13}$' then
      insert into public.mechanic_private_details (user_id, cnic_number)
      values (new.id, new.raw_user_meta_data->>'cnic_number')
      on conflict (user_id) do update
        set cnic_number = excluded.cnic_number;
    end if;
  elsif chosen_role = 'customer'
    and new.raw_user_meta_data->>'vehicle_type' in ('Bike', 'Car', 'Scooter', 'Van') then
    insert into public.vehicles (customer_id, vehicle_type, make, model)
    values (
      new.id,
      new.raw_user_meta_data->>'vehicle_type',
      'Not specified',
      'Not specified'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.refresh_mechanic_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_mechanic_id uuid;
begin
  if tg_op = 'DELETE' then
    affected_mechanic_id := old.mechanic_id;
  else
    affected_mechanic_id := new.mechanic_id;
  end if;
  update public.mechanic_profiles mp
  set
    average_rating = coalesce((select avg(stars)::numeric from public.ratings r where r.mechanic_id = affected_mechanic_id), 0),
    rating_count = (select count(*)::int from public.ratings r where r.mechanic_id = affected_mechanic_id),
    updated_at = now()
  where mp.user_id = affected_mechanic_id;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists on_rating_created on public.ratings;
drop trigger if exists on_rating_deleted on public.ratings;
create trigger on_rating_created
  after insert on public.ratings
  for each row execute function public.refresh_mechanic_rating();
create trigger on_rating_deleted
  after delete on public.ratings
  for each row execute function public.refresh_mechanic_rating();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role::text = 'admin' and coalesce(p.is_disabled, false) = false
  );
$$;

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null
    and not public.is_admin()
    and (
      new.role is distinct from old.role
      or new.is_disabled is distinct from old.is_disabled
    ) then
    raise exception 'Only an administrator can change account roles or disabled status.';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_privileges on public.profiles;
create trigger protect_profile_privileges
  before update on public.profiles
  for each row execute function public.protect_profile_privileges();

create or replace function public.protect_mechanic_verification()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'INSERT' and new.verification_status <> 'pending' then
      raise exception 'Only an administrator can approve a mechanic account.';
    elsif tg_op = 'UPDATE'
      and new.verification_status is distinct from old.verification_status then
      raise exception 'Only an administrator can change mechanic verification status.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_mechanic_verification on public.mechanic_profiles;
create trigger protect_mechanic_verification
  before insert or update on public.mechanic_profiles
  for each row execute function public.protect_mechanic_verification();

-- =====================
-- RLS + policies
-- =====================
alter table public.profiles enable row level security;
alter table public.mechanic_profiles enable row level security;
alter table public.mechanic_private_details enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicle_diagnostics enable row level security;
alter table public.service_requests enable row level security;
alter table public.mechanic_locations enable row level security;
alter table public.ratings enable row level security;
alter table public.notifications enable row level security;
alter table public.support_tickets enable row level security;
alter table public.service_categories enable row level security;
alter table public.admin_activity_logs enable row level security;

drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select" on public.profiles for select using (
  auth.uid() = id or public.is_admin() or role::text = 'mechanic'
);
create policy "profiles_update_own" on public.profiles for update using (
  auth.uid() = id or public.is_admin()
);

drop policy if exists "mechanic_profiles_select" on public.mechanic_profiles;
drop policy if exists "mechanic_profiles_update_own" on public.mechanic_profiles;
drop policy if exists "mechanic_profiles_insert_own" on public.mechanic_profiles;
create policy "mechanic_profiles_select" on public.mechanic_profiles for select using (true);
create policy "mechanic_profiles_update_own" on public.mechanic_profiles for update using (
  auth.uid() = user_id or public.is_admin()
);
create policy "mechanic_profiles_insert_own" on public.mechanic_profiles for insert with check (
  auth.uid() = user_id or public.is_admin()
);

drop policy if exists "mechanic_private_details_select_own" on public.mechanic_private_details;
drop policy if exists "mechanic_private_details_insert_own" on public.mechanic_private_details;
drop policy if exists "mechanic_private_details_update_own" on public.mechanic_private_details;
create policy "mechanic_private_details_select_own" on public.mechanic_private_details for select using (
  auth.uid() = user_id or public.is_admin()
);
create policy "mechanic_private_details_insert_own" on public.mechanic_private_details for insert with check (
  auth.uid() = user_id or public.is_admin()
);
create policy "mechanic_private_details_update_own" on public.mechanic_private_details for update using (
  auth.uid() = user_id or public.is_admin()
) with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "vehicles_own" on public.vehicles;
create policy "vehicles_own" on public.vehicles for all using (
  auth.uid() = customer_id or public.is_admin()
) with check (auth.uid() = customer_id or public.is_admin());

drop policy if exists "diagnostics_via_vehicle" on public.vehicle_diagnostics;
create policy "diagnostics_via_vehicle" on public.vehicle_diagnostics for all using (
  exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and (v.customer_id = auth.uid() or public.is_admin())
  )
) with check (
  exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and (v.customer_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "requests_select" on public.service_requests;
drop policy if exists "requests_insert_customer" on public.service_requests;
drop policy if exists "requests_update" on public.service_requests;
create policy "requests_select" on public.service_requests for select using (
  auth.uid() = customer_id
  or auth.uid() = mechanic_id
  or public.is_admin()
  or (
    status::text = 'pending'
    and exists (
      select 1 from public.mechanic_profiles mp
      where mp.user_id = auth.uid()
        and mp.verification_status::text = 'approved'
        and mp.is_available = true
    )
  )
);
create policy "requests_insert_customer" on public.service_requests for insert with check (
  auth.uid() = customer_id
  and (
    mechanic_id is null
    or exists (
      select 1 from public.mechanic_profiles mp
      where mp.user_id = mechanic_id
        and mp.verification_status::text = 'approved'
        and mp.is_available = true
    )
  )
);
create policy "requests_update" on public.service_requests for update using (
  auth.uid() = customer_id
  or auth.uid() = mechanic_id
  or public.is_admin()
  or (
    status::text = 'pending'
    and exists (
      select 1 from public.mechanic_profiles mp
      where mp.user_id = auth.uid() and mp.verification_status::text = 'approved'
    )
  )
);

drop policy if exists "locations_select" on public.mechanic_locations;
drop policy if exists "locations_insert_mechanic" on public.mechanic_locations;
create policy "locations_select" on public.mechanic_locations for select using (
  exists (
    select 1 from public.service_requests sr
    where sr.id = request_id
      and (sr.customer_id = auth.uid() or sr.mechanic_id = auth.uid() or public.is_admin())
  )
);
create policy "locations_insert_mechanic" on public.mechanic_locations for insert with check (
  auth.uid() = mechanic_id
);

drop policy if exists "ratings_select" on public.ratings;
drop policy if exists "ratings_insert_customer" on public.ratings;
create policy "ratings_select" on public.ratings for select using (true);
create policy "ratings_insert_customer" on public.ratings for insert with check (
  auth.uid() = customer_id
);

drop policy if exists "notifications_own" on public.notifications;
create policy "notifications_own" on public.notifications for all using (
  auth.uid() = user_id or public.is_admin()
) with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "support_own" on public.support_tickets;
create policy "support_own" on public.support_tickets for all using (
  auth.uid() = user_id or public.is_admin()
) with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "service_categories_read_active" on public.service_categories;
drop policy if exists "service_categories_admin_manage" on public.service_categories;
create policy "service_categories_read_active" on public.service_categories for select using (
  is_active or public.is_admin()
);
create policy "service_categories_admin_manage" on public.service_categories for all using (
  public.is_admin()
) with check (public.is_admin());

drop policy if exists "admin_activity_logs_admin_read" on public.admin_activity_logs;
drop policy if exists "admin_activity_logs_admin_insert" on public.admin_activity_logs;
create policy "admin_activity_logs_admin_read" on public.admin_activity_logs for select using (
  public.is_admin()
);
create policy "admin_activity_logs_admin_insert" on public.admin_activity_logs for insert with check (
  public.is_admin() and actor_id = auth.uid()
);

drop policy if exists "ratings_admin_delete" on public.ratings;
create policy "ratings_admin_delete" on public.ratings for delete using (public.is_admin());

-- =====================
-- Diagnosis & Repair Payment triggers + functions
-- =====================
create or replace function public.enforce_new_service_request_diagnosis_fee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.diagnosis_fee := 300;
  if new.diagnosis_payment_status is null then
    new.diagnosis_payment_status := 'pending';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_service_request_diagnosis_fee on public.service_requests;
create trigger trg_enforce_service_request_diagnosis_fee
  before insert on public.service_requests
  for each row
  execute function public.enforce_new_service_request_diagnosis_fee();

create or replace function public.protect_service_request_charges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.diagnosis_fee is distinct from old.diagnosis_fee and not public.is_admin() then
    raise exception 'The fixed diagnosis fee (Rs. 300 PKR) cannot be modified.';
  end if;

  if (new.repair_charges is distinct from old.repair_charges or new.final_cost is distinct from old.final_cost) then
    if not (auth.uid() = old.mechanic_id or auth.uid() = new.mechanic_id or public.is_admin()) then
      raise exception 'Only the assigned mechanic can submit or update repair charges.';
    end if;

    if new.repair_charges is not null and new.repair_charges < 0 then
      raise exception 'Repair charges cannot be negative.';
    end if;

    if new.repair_charges is not null and new.final_cost is null then
      new.final_cost := new.repair_charges;
    elsif new.final_cost is not null and new.repair_charges is null then
      new.repair_charges := new.final_cost;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_service_request_charges on public.service_requests;
create trigger trg_protect_service_request_charges
  before update on public.service_requests
  for each row
  execute function public.protect_service_request_charges();

create or replace function public.sync_service_request_payments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.diagnosis_fee is not null then
    insert into public.payments (
      request_id,
      customer_id,
      mechanic_id,
      payment_type,
      amount,
      status,
      payment_method,
      paid_at
    )
    values (
      new.id,
      new.customer_id,
      new.mechanic_id,
      'diagnosis_fee',
      new.diagnosis_fee,
      coalesce(new.diagnosis_payment_status, 'pending'),
      'cash',
      new.diagnosis_paid_at
    )
    on conflict (request_id, payment_type) do update
      set mechanic_id = coalesce(excluded.mechanic_id, payments.mechanic_id),
          status = excluded.status,
          paid_at = case
            when excluded.status = 'paid' and payments.paid_at is null then coalesce(excluded.paid_at, now())
            when excluded.status = 'paid' then payments.paid_at
            else null
          end,
          updated_at = now();
  end if;

  if new.repair_charges is not null and new.repair_charges >= 0 then
    insert into public.payments (
      request_id,
      customer_id,
      mechanic_id,
      payment_type,
      amount,
      status,
      payment_method,
      paid_at
    )
    values (
      new.id,
      new.customer_id,
      new.mechanic_id,
      'repair_charge',
      new.repair_charges,
      coalesce(new.repair_payment_status, 'pending'),
      'cash',
      new.repair_paid_at
    )
    on conflict (request_id, payment_type) do update
      set amount = excluded.amount,
          mechanic_id = coalesce(excluded.mechanic_id, payments.mechanic_id),
          status = excluded.status,
          paid_at = case
            when excluded.status = 'paid' and payments.paid_at is null then coalesce(excluded.paid_at, now())
            when excluded.status = 'paid' then payments.paid_at
            else null
          end,
          updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_service_request_payments on public.service_requests;
create trigger trg_sync_service_request_payments
  after insert or update on public.service_requests
  for each row
  execute function public.sync_service_request_payments();

create or replace function public.confirm_service_payment(
  p_request_id uuid,
  p_payment_type text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.service_requests%rowtype;
  v_caller uuid := auth.uid();
  v_is_authorized boolean := false;
  v_now timestamptz := now();
begin
  select * into v_req from public.service_requests where id = p_request_id;
  if not found then
    raise exception 'Service request not found.';
  end if;

  if v_caller = v_req.mechanic_id or v_caller = v_req.customer_id or public.is_admin() then
    v_is_authorized := true;
  end if;

  if not v_is_authorized then
    raise exception 'Unauthorized to confirm payment for this request.';
  end if;

  if p_payment_type = 'diagnosis_fee' then
    if v_req.diagnosis_payment_status = 'paid' then
      return jsonb_build_object('success', true, 'message', 'Diagnosis fee is already marked as paid.', 'status', 'paid');
    end if;

    update public.service_requests
    set diagnosis_payment_status = 'paid',
        diagnosis_paid_at = coalesce(diagnosis_paid_at, v_now),
        updated_at = v_now
    where id = p_request_id;

    update public.payments
    set status = 'paid',
        paid_at = coalesce(paid_at, v_now),
        updated_at = v_now
    where request_id = p_request_id and payment_type = 'diagnosis_fee';

    return jsonb_build_object('success', true, 'message', 'Diagnosis fee payment confirmed.', 'status', 'paid');

  elsif p_payment_type = 'repair_charge' then
    if v_req.repair_payment_status = 'paid' then
      return jsonb_build_object('success', true, 'message', 'Repair charge is already marked as paid.', 'status', 'paid');
    end if;

    update public.service_requests
    set repair_payment_status = 'paid',
        repair_paid_at = coalesce(repair_paid_at, v_now),
        updated_at = v_now
    where id = p_request_id;

    update public.payments
    set status = 'paid',
        paid_at = coalesce(paid_at, v_now),
        updated_at = v_now
    where request_id = p_request_id and payment_type = 'repair_charge';

    return jsonb_build_object('success', true, 'message', 'Repair charge payment confirmed.', 'status', 'paid');

  else
    raise exception 'Invalid payment type: %', p_payment_type;
  end if;
end;
$$;

alter table public.payments enable row level security;

drop policy if exists "payments_select_participants" on public.payments;
create policy "payments_select_participants" on public.payments
  for select using (
    auth.uid() = customer_id
    or auth.uid() = mechanic_id
    or public.is_admin()
  );

drop policy if exists "payments_update_authorized" on public.payments;
create policy "payments_update_authorized" on public.payments
  for update using (
    auth.uid() = mechanic_id
    or auth.uid() = customer_id
    or public.is_admin()
  ) with check (
    auth.uid() = mechanic_id
    or auth.uid() = customer_id
    or public.is_admin()
  );

drop policy if exists "payments_insert_system" on public.payments;
create policy "payments_insert_system" on public.payments
  for insert with check (
    auth.uid() = customer_id
    or auth.uid() = mechanic_id
    or public.is_admin()
  );

-- cleanup helper
drop function if exists public._autocares_add_column(text, text, text);

-- Enable Supabase Realtime
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'service_requests'
  ) then
    alter publication supabase_realtime add table public.service_requests;
  end if;
end;
$$;

-- After registering users:
-- update mechanic_profiles set verification_status = 'approved', latitude = 24.8607, longitude = 67.0011, specialties = array['battery','tires','towing'], is_available = true where user_id = '<id>';
-- update profiles set role = 'admin' where id = '<id>';
