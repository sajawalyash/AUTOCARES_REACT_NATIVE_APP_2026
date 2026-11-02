-- Mechanic-specific schema additions.
-- CNIC is stored separately because mechanic_profiles is publicly readable.
-- Run schema.sql first to create the shared AutoCares tables and helper functions.

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text;

alter table public.mechanic_profiles
  add column if not exists mechanic_type text
  check (mechanic_type in ('Car Mechanic', 'Bike Mechanic'));

alter table public.mechanic_profiles
  alter column verification_status set default 'pending';

create or replace function public.protect_mechanic_verification()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if not public.is_admin() then
      new.verification_status := 'pending';
    else
      new.verification_status := coalesce(new.verification_status, 'pending');
    end if;
    return new;
  end if;

  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'UPDATE'
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
