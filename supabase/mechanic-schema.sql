-- Mechanic-specific schema additions.
-- CNIC is stored separately because mechanic_profiles is publicly readable.
-- Run schema.sql first to create the shared AutoCares tables and helper functions.

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text;

alter table public.mechanic_profiles
  add column if not exists mechanic_type text
  check (mechanic_type in ('Car Mechanic', 'Bike Mechanic'));

create table if not exists public.mechanic_private_details (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  cnic_number text not null check (cnic_number ~ '^[0-9]{13}$'),
  created_at timestamptz not null default now()
);

alter table public.mechanic_private_details enable row level security;

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
