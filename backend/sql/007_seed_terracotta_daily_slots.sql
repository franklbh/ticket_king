-- Seed public bookable Terracotta Army VR slots.
-- Run after 005_resource_cart_schema.sql.
--
-- Adjust these values before running in Supabase if the production schedule changes:
--   start_date / end_date: which dates to create
--   first_start / last_start: first and last sellable start time
--   step_minutes: spacing between start times
--   duration_minutes: event length shown to customers
--   price: customer-facing base price
--
-- Safe to re-run. Existing event/date/start-time rows are updated, not duplicated.

do $$
declare
  start_date date := date '2026-05-17';
  end_date date := date '2026-8-31';
  first_start time := time '10:00';
  last_start time := time '21:00';
  step_minutes integer := 30;
  duration_minutes integer := 45;
  price numeric := 45.95;
begin
  insert into public.slots (
    id,
    event_id,
    slot_code,
    business_date,
    start_time,
    end_time,
    slot_time_label,
    timezone,
    capacity,
    status,
    base_price,
    created_at,
    updated_at
  )
  select
    gen_random_uuid(),
    e.id,
    concat(
      e.slug,
      '-',
      to_char(d.day, 'YYYY-MM-DD'),
      '-',
      to_char(t.start_time, 'HH24MI')
    ),
    d.day,
    t.start_time,
    t.start_time + make_interval(mins => duration_minutes),
    concat(
      to_char(t.start_time, 'HH24:MI'),
      '-',
      to_char(t.start_time + make_interval(mins => duration_minutes), 'HH24:MI')
    ),
    'America/Vancouver',
    20,
    'active',
    price,
    now(),
    now()
  from public.events e
  cross join generate_series(start_date, end_date, interval '1 day') as d(day)
  cross join lateral (
    select first_start + make_interval(mins => offset_minutes) as start_time
    from generate_series(
      0,
      (extract(epoch from (last_start - first_start)) / 60)::integer,
      step_minutes
    ) as offsets(offset_minutes)
  ) as t
  where e.slug = 'terracotta-warriors'
  on conflict (event_id, business_date, start_time)
  where event_id is not null
  do update set
    end_time = excluded.end_time,
    slot_time_label = excluded.slot_time_label,
    timezone = excluded.timezone,
    capacity = excluded.capacity,
    status = excluded.status,
    base_price = excluded.base_price,
    updated_at = now();
end $$;
