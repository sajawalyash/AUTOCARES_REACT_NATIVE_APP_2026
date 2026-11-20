-- Migration: 20261120_mechanic_request_notifications.sql
-- Description: Push token storage and notification enhancements for AutoCares mechanics & customers

-- 1. Create user_push_tokens table
create table if not exists public.user_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  push_token text not null,
  platform text not null default 'android',
  device_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_push_tokens_user_token_unique unique (user_id, push_token)
);

create index if not exists idx_user_push_tokens_user_id on public.user_push_tokens(user_id);

-- 2. Add 'data' payload column to notifications if not present
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notifications' and column_name = 'data'
  ) then
    alter table public.notifications add column data jsonb default '{}'::jsonb;
  end if;
end $$;

-- 3. Enable Row-Level Security
alter table public.user_push_tokens enable row level security;

-- 4. RLS Policies for user_push_tokens
drop policy if exists "Users can view their own push tokens" on public.user_push_tokens;
create policy "Users can view their own push tokens"
  on public.user_push_tokens
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own push tokens" on public.user_push_tokens;
create policy "Users can insert their own push tokens"
  on public.user_push_tokens
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own push tokens" on public.user_push_tokens;
create policy "Users can update their own push tokens"
  on public.user_push_tokens
  for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own push tokens" on public.user_push_tokens;
create policy "Users can delete their own push tokens"
  on public.user_push_tokens
  for delete
  using (auth.uid() = user_id);

-- Optional helper RPC to upsert a push token safely
create or replace function public.upsert_user_push_token(
  p_push_token text,
  p_platform text default 'android',
  p_device_name text default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.user_push_tokens (user_id, push_token, platform, device_name, updated_at)
  values (v_user_id, p_push_token, p_platform, p_device_name, now())
  on conflict (user_id, push_token)
  do update set
    platform = excluded.platform,
    device_name = excluded.device_name,
    updated_at = now();
end;
$$;
