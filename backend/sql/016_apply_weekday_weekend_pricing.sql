-- Apply weekday/weekend pricing labels and operating-hour slot policy.
--
-- Pricing:
--   Weekday price: Monday-Friday, 10:00-20:00
--   Weekend price: Saturday-Sunday, 10:00-20:00
--
-- Operating latest start:
--   Sunday-Thursday: 19:00
--   Friday-Saturday: 20:00
--
-- Run after 012_seed_excel_ticket_type_matrix.sql if you want the spreadsheet
-- price matrix to be authoritative. This script is safe to re-run.

do $$
declare
  start_date date := date '2026-05-17';
  end_date date := date '2026-12-31';
  first_start time := time '10:00';
  archived_count integer := 0;
  activated_count integer := 0;
  inserted_count integer := 0;
begin
  update public.ticket_types
  set
    weekdays = array['Mon','Tue','Wed','Thu','Fri']::text[],
    time_start = time '10:00',
    time_end = time '20:00',
    remarks = regexp_replace(coalesce(remarks, ''), '^(Lower price|Weekday price|Off-peak|Peak|Higher price|Weekend price)', 'Weekday price', 'i'),
    updated_at = now()
  where status = 'enabled'
    and (
      lower(coalesce(remarks, '')) like 'lower price%'
      or lower(coalesce(remarks, '')) like 'weekday price%'
      or lower(coalesce(remarks, '')) like 'off-peak%'
    );

  update public.ticket_types
  set
    weekdays = array['Sat','Sun']::text[],
    time_start = time '10:00',
    time_end = time '20:00',
    remarks = regexp_replace(coalesce(remarks, ''), '^(Higher price|Weekend price|Peak|Lower price|Weekday price|Off-peak)', 'Weekend price', 'i'),
    updated_at = now()
  where status = 'enabled'
    and (
      lower(coalesce(remarks, '')) like 'higher price%'
      or lower(coalesce(remarks, '')) like 'weekend price%'
      or (
        lower(coalesce(remarks, '')) like 'peak%'
        and lower(coalesce(remarks, '')) not like 'off-peak%'
      )
    );

  drop table if exists desired_weekday_weekend_slots;

  create temporary table desired_weekday_weekend_slots on commit drop as
  with price_windows as (
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
      tt.time_start,
      tt.time_end,
      tt.price
    from public.ticket_types tt
    join public.events e on e.id = tt.event
    where e.status = 'active'
      and tt.status = 'enabled'
      and tt.time_start is not null
      and tt.time_end is not null
      and cardinality(tt.weekdays) > 0
  ),
  dated_event_windows as (
    select
      w.event_id,
      w.slug,
      w.content_mode,
      w.vr_room_mode,
      w.duration_minutes,
      w.step_minutes,
      d.day::date as business_date,
      greatest(min(w.time_start), first_start) as time_start,
      case
        when extract(isodow from d.day) in (5, 6) then time '20:00'
        else time '19:00'
      end as latest_start,
      case extract(isodow from d.day)::int
        when 1 then 'Mon'
        when 2 then 'Tue'
        when 3 then 'Wed'
        when 4 then 'Thu'
        when 5 then 'Fri'
        when 6 then 'Sat'
        when 7 then 'Sun'
      end as weekday
    from price_windows w
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
    group by
      w.event_id,
      w.slug,
      w.content_mode,
      w.vr_room_mode,
      w.duration_minutes,
      w.step_minutes,
      d.day
    having greatest(min(w.time_start), first_start) <= case
      when extract(isodow from d.day) in (5, 6) then time '20:00'
      else time '19:00'
    end
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
      price_match.base_price
    from dated_event_windows w
    cross join lateral (
      select w.time_start + make_interval(mins => offset_minutes) as start_time
      from generate_series(
        0,
        greatest(0, (extract(epoch from (w.latest_start - w.time_start)) / 60)::integer),
        w.step_minutes
      ) as offsets(offset_minutes)
    ) as t
    cross join lateral (
      select min(pw.price) filter (where pw.price is not null) as base_price
      from price_windows pw
      where pw.event_id = w.event_id
        and w.weekday = any(pw.weekdays)
        and pw.time_start <= t.start_time
        and t.start_time <= pw.time_end
    ) as price_match
    where price_match.base_price is not null
  )
  select
    g.event_id,
    concat(g.slug, '-', to_char(g.business_date, 'YYYY-MM-DD'), '-', to_char(g.start_time, 'HH24MI')) as slot_code,
    g.business_date,
    g.start_time,
    g.end_time,
    concat(to_char(g.start_time, 'HH24:MI'), '-', to_char(g.end_time, 'HH24:MI')) as slot_time_label,
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
  where s.event_id in (select distinct event_id from desired_weekday_weekend_slots)
    and s.business_date between start_date and end_date
    and s.status = 'active'
    and not exists (
      select 1
      from desired_weekday_weekend_slots desired
      where desired.event_id = s.event_id
        and desired.business_date = s.business_date
        and desired.start_time = s.start_time
    );

  get diagnostics archived_count = row_count;

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
  from desired_weekday_weekend_slots desired
  where s.event_id = desired.event_id
    and s.business_date = desired.business_date
    and s.start_time = desired.start_time;

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
  from desired_weekday_weekend_slots desired
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

  raise notice 'Archived % slots, updated/activated % slots, inserted % slots.',
    archived_count,
    activated_count,
    inserted_count;
end $$;
