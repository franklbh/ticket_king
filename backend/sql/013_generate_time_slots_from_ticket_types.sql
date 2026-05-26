-- Generate public time slots from the enabled ticket type windows.
--
-- Run after:
--   011_normalize_individual_game_events.sql
--   012_seed_excel_ticket_type_matrix.sql
--
-- This keeps Admin/Create Order synced with Supabase:
--   - events.duration_minutes controls slot length
--   - ticket_types.weekdays/time_start/time_end controls available windows
--   - Terracotta Warriors also gets a final 14:30-15:00 slot
--   - active slots outside these windows are archived
--
-- Current event durations:
--   Terracotta Warriors, Panda's World, Back to Jurassic: 30 minutes
--   Hero, HyperBeat Slash, Gulu Gulu: 15 minutes

do $$
declare
  start_date date := date '2026-05-17';
  end_date date := date '2026-12-31';
begin
  drop table if exists desired_ticket_king_slots;

  create temporary table desired_ticket_king_slots as
  with slot_windows as (
    select
      e.id as event_id,
      e.slug,
      e.content_mode,
      e.vr_room_mode,
      coalesce(e.duration_minutes, 30) as duration_minutes,
      tt.weekdays,
      tt.time_start,
      case
        when e.slug = 'terracotta-warriors' and tt.time_end = time '14:30' then time '15:00'
        else tt.time_end
      end as time_end,
      min(tt.price) filter (where tt.price is not null) as base_price
    from public.ticket_types tt
    join public.events e on e.id = tt.event
    where e.status = 'active'
      and tt.status = 'enabled'
      and tt.time_start is not null
      and tt.time_end is not null
      and cardinality(tt.weekdays) > 0
    group by
      e.id,
      e.slug,
      e.content_mode,
      e.vr_room_mode,
      e.duration_minutes,
      tt.weekdays,
      tt.time_start,
      case
        when e.slug = 'terracotta-warriors' and tt.time_end = time '14:30' then time '15:00'
        else tt.time_end
      end
  ),
  dated_windows as (
    select
      w.*,
      d.day::date as business_date
    from slot_windows w
    cross join generate_series(start_date, end_date, interval '1 day') as d(day)
    where case extract(isodow from d.day)::int
      when 1 then 'Mon'
      when 2 then 'Tue'
      when 3 then 'Wed'
      when 4 then 'Thu'
      when 5 then 'Fri'
      when 6 then 'Sat'
      when 7 then 'Sun'
    end = any(w.weekdays)
  )
  select
    w.event_id,
    concat(
      w.slug,
      '-',
      to_char(w.business_date, 'YYYY-MM-DD'),
      '-',
      to_char(t.start_time, 'HH24MI')
    ) as slot_code,
    w.business_date,
    t.start_time,
    t.start_time + make_interval(mins => w.duration_minutes) as end_time,
    concat(
      to_char(t.start_time, 'HH24:MI'),
      '-',
      to_char(t.start_time + make_interval(mins => w.duration_minutes), 'HH24:MI')
    ) as slot_time_label,
    'America/Vancouver'::text as timezone,
    case
      when w.content_mode = 'game' then 8
      when w.vr_room_mode = 'htc' then 20
      else 10
    end as capacity,
    'active'::text as status,
    coalesce(w.base_price, 0)::numeric as base_price
  from dated_windows w
  cross join lateral (
    select w.time_start + make_interval(mins => offset_minutes) as start_time
    from generate_series(
      0,
      greatest(
        0,
        (extract(epoch from (w.time_end - w.time_start)) / 60)::integer - w.duration_minutes
      ),
      w.duration_minutes
    ) as offsets(offset_minutes)
  ) as t;

  update public.slots s
  set
    status = 'archived',
    updated_at = now()
  where s.event_id in (select distinct event_id from desired_ticket_king_slots)
    and s.business_date between start_date and end_date
    and s.status = 'active'
    and not exists (
      select 1
      from desired_ticket_king_slots desired
      where desired.event_id = s.event_id
        and desired.business_date = s.business_date
        and desired.start_time = s.start_time
        and desired.end_time = s.end_time
    );

  update public.slots s
  set
    slot_code = desired.slot_code,
    end_time = desired.end_time,
    slot_time_label = desired.slot_time_label,
    timezone = desired.timezone,
    capacity = desired.capacity,
    status = desired.status,
    base_price = desired.base_price,
    updated_at = now()
  from desired_ticket_king_slots desired
  where s.event_id = desired.event_id
    and s.business_date = desired.business_date
    and s.start_time = desired.start_time;

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
    desired.event_id,
    desired.slot_code,
    desired.business_date,
    desired.start_time,
    desired.end_time,
    desired.slot_time_label,
    desired.timezone,
    desired.capacity,
    desired.status,
    desired.base_price,
    now(),
    now()
  from desired_ticket_king_slots desired
  where not exists (
    select 1
    from public.slots existing
    where existing.event_id = desired.event_id
      and existing.business_date = desired.business_date
      and existing.start_time = desired.start_time
  );

  drop table if exists desired_ticket_king_slots;
end $$;
