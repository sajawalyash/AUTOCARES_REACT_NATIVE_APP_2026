create table if not exists public.vehicle_assistant_rate_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0)
);

alter table public.vehicle_assistant_rate_limits enable row level security;
revoke all on public.vehicle_assistant_rate_limits from anon, authenticated;

create or replace function public.consume_vehicle_assistant_quota()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  current_count integer;
begin
  if caller_id is null then
    raise exception 'Authentication required';
  end if;

  insert into public.vehicle_assistant_rate_limits (user_id, window_started_at, request_count)
  values (caller_id, now(), 1)
  on conflict (user_id) do update
    set window_started_at = case
          when public.vehicle_assistant_rate_limits.window_started_at < now() - interval '1 hour'
            then now()
          else public.vehicle_assistant_rate_limits.window_started_at
        end,
        request_count = case
          when public.vehicle_assistant_rate_limits.window_started_at < now() - interval '1 hour'
            then 1
          else public.vehicle_assistant_rate_limits.request_count + 1
        end
  returning request_count into current_count;

  return current_count <= 12;
end;
$$;

revoke all on function public.consume_vehicle_assistant_quota() from public, anon;
grant execute on function public.consume_vehicle_assistant_quota() to authenticated;
