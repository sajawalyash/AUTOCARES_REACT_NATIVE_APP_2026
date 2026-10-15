-- Migration: 20261015_diagnosis_and_repair_payments.sql
-- 1) Fixed Diagnosis Fee of Rs. 300 PKR for all new service requests (server-side enforced).
-- 2) Diagnosis payment tracking (status, paid_at).
-- 3) Mechanic Repair Charges submission & tracking (repair_charges, repair_payment_status, repair_paid_at).
-- 4) Dedicated public.payments table for consistent persistent payment history with duplicate prevention.
-- 5) Secure Supabase triggers, RLS policies, and confirm_service_payment function.

-- 1. Helper function for safe column addition
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

-- 2. Add columns to public.service_requests
-- Existing requests will have NULL diagnosis_fee (do not charge existing requests retroactively)
select public._autocares_add_column('service_requests', 'diagnosis_fee', 'diagnosis_fee numeric');
select public._autocares_add_column('service_requests', 'diagnosis_payment_status', 'diagnosis_payment_status text not null default ''pending'' check (diagnosis_payment_status in (''pending'', ''paid'', ''failed''))');
select public._autocares_add_column('service_requests', 'diagnosis_paid_at', 'diagnosis_paid_at timestamptz');
select public._autocares_add_column('service_requests', 'repair_charges', 'repair_charges numeric');
select public._autocares_add_column('service_requests', 'repair_payment_status', 'repair_payment_status text not null default ''pending'' check (repair_payment_status in (''pending'', ''paid'', ''failed''))');
select public._autocares_add_column('service_requests', 'repair_paid_at', 'repair_paid_at timestamptz');

-- 3. Create payments table for persistent payment history
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

-- 4. Server-Side Enforcement Trigger:
-- Always apply Rs. 300 to every new service request for cars, bikes, and all supported vehicles.
create or replace function public.enforce_new_service_request_diagnosis_fee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Always enforce 300 PKR on new service requests; never trust frontend amounts
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

-- 5. Protection Trigger: Prevent unauthorized tampering with charges & fees
-- Only the assigned mechanic or admin can submit/update repair charges.
-- Customers cannot modify charges or diagnosis fee.
create or replace function public.protect_service_request_charges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Diagnosis fee cannot be altered after insertion
  if new.diagnosis_fee is distinct from old.diagnosis_fee and not public.is_admin() then
    raise exception 'The fixed diagnosis fee (Rs. 300 PKR) cannot be modified.';
  end if;

  -- Only assigned mechanic or admin can submit or update repair_charges (or final_cost)
  if (new.repair_charges is distinct from old.repair_charges or new.final_cost is distinct from old.final_cost) then
    if not (auth.uid() = old.mechanic_id or auth.uid() = new.mechanic_id or public.is_admin()) then
      raise exception 'Only the assigned mechanic can submit or update repair charges.';
    end if;

    -- Validate repair charge amount
    if new.repair_charges is not null and new.repair_charges < 0 then
      raise exception 'Repair charges cannot be negative.';
    end if;

    -- Keep final_cost and repair_charges synchronized for backward compatibility
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

-- 6. Trigger to keep public.payments synced with service_requests automatically
create or replace function public.sync_service_request_payments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 1) Diagnosis fee payment record (created if diagnosis_fee is present)
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

  -- 2) Repair charge payment record (created/updated when repair_charges is entered)
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

-- 7. Payment Confirmation Secure Function:
-- Authorized users: assigned mechanic, customer, or admin
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

  -- Authorized users: assigned mechanic, customer of the request, or admin
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

-- 8. Row Level Security for public.payments
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
