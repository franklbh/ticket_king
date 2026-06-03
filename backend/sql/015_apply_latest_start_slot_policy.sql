-- Apply latest-start slot policy without touching ticket types, orders, or tickets.
--
-- Safe to re-run.
--
-- Policy:
--   Sunday-Thursday: active slots may start from 10:00 through 19:00.
--   Friday-Saturday: active slots may start from 10:00 through 20:00.
--
-- ticket_types.time_end is treated as the latest allowed slot start for that
-- ticket type window. For example, a 19:00 time_end allows a 19:00-19:45 slot.

do $$
declare
  start_date date := date '2026-05-17';
  end_date date := date '2026-12-31';
  first_start time := time '10:00';
  archived_count integer := 0;
  activated_count integer := 0;
  inserted_count integer := 0;
begin
  drop table if exists desired_latest_start_slots;

  create temporary table desired_latest_start_slots on commit drop as
  with slot_windows as (
    select
      e.id as event_id,
      e.slug,
      e.content_mode,
      e.vr_room_mode,
      coalesce(
        nullif(e.duration_minutes, 0),
        case when e.content_mode = 'game' then 15 else 30 end
      ) as duration_minutes,
      case when e.content_mode = 'game' then 15 else 30 end as step_minutes,
      tt.weekdays,
      greatest(tt.time_start, first_start) as time_start,
      tt.time_end,
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
      case when e.content_mode = 'game' then 15 else 30 end,
      tt.weekdays,
      tt.time_start,
      tt.time_end
  ),
  dated_windows as (
    select
      w.*,
      d.day::date as business_date,
      case
        when extract(isodow from d.day) in (5, 6) then time '20:00'
        else time '19:00'
      end as policy_latest_start
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
  ),
  bounded_windows as (
    select
      w.*,
      least(w.time_end, w.policy_latest_start) as latest_start
    from dated_windows w
    where w.time_start <= least(w.time_end, w.policy_latest_start)
  ),
  generated_slots as (
    select
      w.event_id,
      w.slug,
      w.business_date,
      t.start_time,
      t.start_time + make_interval(mins => w.duration_minutes) as end_time,
      w.content_mode,
      w.vr_room_mode,
      w.base_price
    from bounded_windows w
    cross join lateral (
      select w.time_start + make_interval(mins => offset_minutes) as start_time
      from generate_series(
        0,
        greatest(0, (extract(epoch from (w.latest_start - w.time_start)) / 60)::integer),
        w.step_minutes
      ) as offsets(offset_minutes)
    ) as t
  )
  select
    g.event_id,
    concat(
      g.slug,
      '-',
      to_char(g.business_date, 'YYYY-MM-DD'),
      '-',
      to_char(g.start_time, 'HH24MI')
    ) as slot_code,
    g.business_date,
    g.start_time,
    g.end_time,
    concat(
      to_char(g.start_time, 'HH24:MI'),
      '-',
      to_char(g.end_time, 'HH24:MI')
    ) as slot_time_label,
    'America/Vancouver'::text as timezone,
    case
      when g.content_mode = 'game' then 8
      when g.vr_room_mode = 'htc' then 20
      else 10
    end as capacity,
    'active'::text as status,
    coalesce(min(g.base_price), 0)::numeric as base_price
  from generated_slots g
  group by
    g.event_id,
    g.slug,
    g.business_date,
    g.start_time,
    g.end_time,
    g.content_mode,
    g.vr_room_mode;

  update public.slots s
  set
    status = 'archived',
    updated_at = now()
  where s.event_id in (select distinct event_id from desired_latest_start_slots)
    and s.business_date between start_date and end_date
    and s.status = 'active'
    and not exists (
      select 1
      from desired_latest_start_slots desired
      where desired.event_id = s.event_id
        and desired.business_date = s.business_date
        and desired.start_time = s.start_time
    );

  get diagnostics archived_count = row_count;

  update public.slots s
  set
    status = 'active',
    updated_at = now()
  from desired_latest_start_slots desired
  where s.event_id = desired.event_id
    and s.business_date = desired.business_date
    and s.start_time = desired.start_time
    and lower(coalesce(s.status, '')) <> 'active';

  get diagnostics activated_count = row_count;

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
  from desired_latest_start_slots desired
  where not exists (
      select 1
      from public.slots existing
      where existing.event_id = desired.event_id
        and existing.business_date = desired.business_date
        and existing.start_time = desired.start_time
    )
    and not exists (
      select 1
      from public.slots code_match
      where code_match.slot_code = desired.slot_code
    );

  get diagnostics inserted_count = row_count;

  raise notice 'Archived % slots, activated % slots, inserted % slots.',
    archived_count,
    activated_count,
    inserted_count;
end $$;
