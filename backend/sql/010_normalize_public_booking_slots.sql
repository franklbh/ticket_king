-- Normalize public booking availability.
-- Run after 005_resource_cart_schema.sql and 008_seed_experience_daily_slots.sql.
--
-- This is intended for an existing database with old test availability.
-- It keeps Game A active, archives Game B/C and their active slots, archives
-- active public slots outside business hours, then creates/updates the correct
-- public booking slots:
--   - Sunday-Thursday: slots must end by 19:00
--   - Friday-Saturday: slots must end by 20:00
--   - Panda VR and Back to Jurassic run every 30 minutes.
--   - Game A runs every 15 minutes.

do $$
declare
  start_date date := date '2026-05-17';
  end_date date := date '2026-08-31';
  first_start time := time '10:00';
begin
  update public.events
  set
    event_type = 'vr_show',
    content_mode = 'vr',
    headset_brand = 'pico',
    vr_room_mode = 'pico',
    duration_minutes = 30,
    name = 'Back to Jurassic',
    status = 'active',
    updated_at = now()
  where slug = 'dino-vr';

  update public.events
  set
    duration_minutes = 30,
    updated_at = now()
  where slug = 'panda-vr';

  update public.events
  set
    event_type = 'game',
    content_mode = 'game',
    headset_brand = 'pico',
    vr_room_mode = 'none',
    duration_minutes = 15,
    status = 'active',
    updated_at = now()
  where slug = 'game-a';

  update public.events
  set
    duration_minutes = 15,
    status = 'archived',
    updated_at = now()
  where slug in ('game-b', 'game-c');

  update public.slots s
  set
    status = 'archived',
    updated_at = now()
  from public.events e
  where s.event_id = e.id
    and e.slug in ('game-b', 'game-c')
    and s.status = 'active';

  update public.slots s
  set
    status = 'archived',
    updated_at = now()
  from public.events e
  where s.event_id = e.id
    and e.slug in ('terracotta-warriors', 'panda-vr', 'dino-vr', 'game-a')
    and s.status = 'active'
    and (
      s.business_date < start_date
      or s.business_date > end_date
      or s.start_time < first_start
      or s.end_time > case
        when extract(isodow from s.business_date) in (5, 6) then time '20:00'
        else time '19:00'
      end
    );

  create temporary table desired_public_booking_slots on commit drop as
  select
    e.id as event_id,
    concat(
      e.slug,
      '-',
      to_char(d.day, 'YYYY-MM-DD'),
      '-',
      to_char(t.start_time, 'HH24MI')
    ) as slot_code,
    d.day::date as business_date,
    t.start_time,
    t.start_time + make_interval(mins => seed.slot_duration_minutes) as end_time,
    concat(
      to_char(t.start_time, 'HH24:MI'),
      '-',
      to_char(t.start_time + make_interval(mins => seed.slot_duration_minutes), 'HH24:MI')
    ) as slot_time_label,
    'America/Vancouver'::text as timezone,
    seed.capacity,
    'active'::text as status,
    seed.price as base_price
  from (
    values
      ('terracotta-warriors', 45, 20, 45.95::numeric),
      ('panda-vr', 30, 10, 34.95::numeric),
      ('dino-vr', 30, 10, 35.95::numeric),
      ('game-a', 15, 8, 35.95::numeric)
  ) as seed(slug, slot_duration_minutes, capacity, price)
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
      case when seed.slug = 'game-a' then 15 else 30 end
    ) as offsets(offset_minutes)
  ) as t;

  update public.slots s
  set
    event_id = d.event_id,
    business_date = d.business_date,
    start_time = d.start_time,
    end_time = d.end_time,
    slot_time_label = d.slot_time_label,
    timezone = d.timezone,
    capacity = d.capacity,
    status = d.status,
    base_price = d.base_price,
    updated_at = now()
  from desired_public_booking_slots d
  where s.slot_code = d.slot_code;

  update public.slots s
  set
    slot_code = d.slot_code,
    end_time = d.end_time,
    slot_time_label = d.slot_time_label,
    timezone = d.timezone,
    capacity = d.capacity,
    status = d.status,
    base_price = d.base_price,
    updated_at = now()
  from desired_public_booking_slots d
  where s.event_id = d.event_id
    and s.business_date = d.business_date
    and s.start_time = d.start_time
    and not exists (
      select 1
      from public.slots code_match
      where code_match.slot_code = d.slot_code
        and code_match.id <> s.id
    );

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
    d.event_id,
    d.slot_code,
    d.business_date,
    d.start_time,
    d.end_time,
    d.slot_time_label,
    d.timezone,
    d.capacity,
    d.status,
    d.base_price,
    now(),
    now()
  from desired_public_booking_slots d
  where not exists (
      select 1
      from public.slots code_match
      where code_match.slot_code = d.slot_code
    )
    and not exists (
      select 1
      from public.slots time_match
      where time_match.event_id = d.event_id
        and time_match.business_date = d.business_date
        and time_match.start_time = d.start_time
    );
end $$;
