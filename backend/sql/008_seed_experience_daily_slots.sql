-- Seed public bookable slots for Panda VR, Back to Jurassic, and Game A.
-- Run after 005_resource_cart_schema.sql.
--
-- Frontend mapping:
--   Panda VR          -> events.slug = 'panda-vr'
--   Back to Jurassic  -> events.slug = 'dino-vr'
--   Game A            -> events.slug = 'game-a'
--
-- Slot cadence:
--   Panda VR and Back to Jurassic: 30-minute slots every 30 minutes.
--   Game A: 15-minute slots every 15 minutes.
--
-- Business hours:
--   Sunday-Thursday: slots must end by 19:00.
--   Friday-Saturday: slots must end by 20:00.
--
-- Safe to re-run. Existing event/date/start-time rows are updated, not duplicated.

do $$
declare
  start_date date := date '2026-05-17';
  end_date date := date '2026-08-31';
  first_start time := time '10:00';
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
      ('panda-vr', 30, 30, 10, 34.95::numeric),
      ('dino-vr', 30, 30, 10, 35.95::numeric),
      ('game-a', 15, 15, 8, 35.95::numeric)
  ) as seed(slug, slot_duration_minutes, slot_step_minutes, capacity, price)
  join public.events e on e.slug = seed.slug
  cross join generate_series(start_date, end_date, interval '1 day') as d(day)
  cross join lateral (
    select first_start + make_interval(mins => offset_minutes) as start_time
    from generate_series(
      0,
      (
        extract(epoch from (
          (case when extract(isodow from d.day) in (5, 6) then time '20:00' else time '19:00' end)
          - first_start
        )) / 60
      )::integer - seed.slot_duration_minutes,
      seed.slot_step_minutes
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
