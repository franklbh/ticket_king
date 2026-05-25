-- Seed public bookable slots for Panda's World and Game A / Cyber Arena.
-- Run after 005_resource_cart_schema.sql.
--
-- Frontend mapping:
--   Panda's World -> events.slug = 'panda-vr'
--   Cyber Arena  -> events.slug = 'game-a'
--
-- Safe to re-run. Existing event/date/start-time rows are updated, not duplicated.

do $$
declare
  start_date date := date '2026-05-17';
  end_date date := date '2026-08-31';
  first_start time := time '10:00';
  last_start time := time '21:00';
  step_minutes integer := 30;
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
    t.start_time + make_interval(mins => seed.slot_duration_minutes),
    concat(
      to_char(t.start_time, 'HH24:MI'),
      '-',
      to_char(t.start_time + make_interval(mins => seed.slot_duration_minutes), 'HH24:MI')
    ),
    'America/Vancouver',
    seed.capacity,
    'active',
    seed.price,
    now(),
    now()
  from (
    values
      ('panda-vr', 25, 10, 34.95::numeric),
      ('game-a', 10, 8, 35.95::numeric)
  ) as seed(slug, slot_duration_minutes, capacity, price)
  join public.events e on e.slug = seed.slug
  cross join generate_series(start_date, end_date, interval '1 day') as d(day)
  cross join lateral (
    select first_start + make_interval(mins => offset_minutes) as start_time
    from generate_series(
      0,
      (extract(epoch from (last_start - first_start)) / 60)::integer,
      step_minutes
    ) as offsets(offset_minutes)
  ) as t
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
