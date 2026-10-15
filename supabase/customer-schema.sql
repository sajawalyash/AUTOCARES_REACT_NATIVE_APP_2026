-- Customer-specific schema additions.
-- Run schema.sql first to create the shared AutoCares tables and helper functions.

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text;

alter table public.vehicles
  add column if not exists vehicle_type text
  check (vehicle_type in ('Bike', 'Car', 'Scooter', 'Van'));
