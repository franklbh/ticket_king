-- Normalize the ticket type matrix from the current pricing spreadsheet.
--
-- This keeps prices, periods, and ticket names in Supabase instead of hardcoding
-- them in the admin frontend.
--
-- Safe to re-run. For the six production events in this file, it:
--   1. archives extra/non-spreadsheet ticket rules,
--   2. updates existing spreadsheet rules to the correct price/status,
--   3. inserts missing spreadsheet rules,
--   4. archives duplicate matching rules.

do $$
begin
drop table if exists desired_excel_ticket_type_rules;

create temporary table desired_excel_ticket_type_rules as
with matrix(event_slug, ticket_name, lower_days, lower_start, lower_end, lower_price, higher_days, higher_start, higher_end, higher_price) as (
  values
    ('terracotta-warriors', 'Adult', array['Mon','Tue','Wed','Thu','Fri']::text[], time '10:00', time '20:00', 37.95, array['Sat','Sun']::text[], time '10:00', time '20:00', 45.95),
    ('terracotta-warriors', 'Child (7-15)', array['Mon','Tue','Wed','Thu','Fri']::text[], time '10:00', time '20:00', 27.95, array['Sat','Sun']::text[], time '10:00', time '20:00', 34.95),
    ('terracotta-warriors', 'Senior (65+)', array['Mon','Tue','Wed','Thu','Fri']::text[], time '10:00', time '20:00', 34.95, array['Sat','Sun']::text[], time '10:00', time '20:00', 41.95),
    ('terracotta-warriors', 'Group (6+ people)', array['Mon','Tue','Wed','Thu','Fri']::text[], time '10:00', time '20:00', 32.95, array['Sat','Sun']::text[], time '10:00', time '20:00', 40.95),
    ('terracotta-warriors', 'Family (2 adults + 1 child)', array['Mon','Tue','Wed','Thu','Fri']::text[], time '10:00', time '20:00', 31.95, array['Sat','Sun']::text[], time '10:00', time '20:00', 39.95),

    ('panda-vr', 'Adult', array['Mon','Tue','Wed','Thu','Fri']::text[], time '10:00', time '20:00', 25.95, array['Sat','Sun']::text[], time '10:00', time '20:00', 27.95),
    ('panda-vr', 'Senior (65+)', array['Mon','Tue','Wed','Thu','Fri']::text[], time '10:00', time '20:00', 24.95, array['Sat','Sun']::text[], time '10:00', time '20:00', 26.95),
    ('panda-vr', 'Child/Youth (7-15)', array['Mon','Tue','Wed','Thu','Fri']::text[], time '10:00', time '20:00', 21.95, array['Sat','Sun']::text[], time '10:00', time '20:00', 23.95),
    ('panda-vr', 'Group (6+ people)', array['Mon','Tue','Wed','Thu','Fri']::text[], time '10:00', time '20:00', 23.95, array['Sat','Sun']::text[], time '10:00', time '20:00', 25.95),
    ('panda-vr', 'Family (2 adults + 1 child)', array['Mon','Tue','Wed','Thu','Fri']::text[], time '10:00', time '20:00', 22.95, array['Sat','Sun']::text[], time '10:00', time '20:00', 24.95),

    ('dino-vr', 'Adult', array['Mon','Tue','Wed','Thu','Fri']::text[], time '10:00', time '20:00', 25.95, array['Sat','Sun']::text[], time '10:00', time '20:00', 27.95),
    ('dino-vr', 'Senior (65+)', array['Mon','Tue','Wed','Thu','Fri']::text[], time '10:00', time '20:00', 24.95, array['Sat','Sun']::text[], time '10:00', time '20:00', 26.95),
    ('dino-vr', 'Child/Youth (7-15)', array['Mon','Tue','Wed','Thu','Fri']::text[], time '10:00', time '20:00', 21.95, array['Sat','Sun']::text[], time '10:00', time '20:00', 23.95),
    ('dino-vr', 'Group (6+ people)', array['Mon','Tue','Wed','Thu','Fri']::text[], time '10:00', time '20:00', 23.95, array['Sat','Sun']::text[], time '10:00', time '20:00', 25.95),
    ('dino-vr', 'Family (2 adults + 1 child)', array['Mon','Tue','Wed','Thu','Fri']::text[], time '10:00', time '20:00', 22.95, array['Sat','Sun']::text[], time '10:00', time '20:00', 24.95),

    ('game-a', 'Adult', array['Mon','Tue','Wed','Thu','Fri']::text[], time '10:00', time '20:00', 15.95, array['Sat','Sun']::text[], time '10:00', time '20:00', 16.95),
    ('game-a', 'Child/Youth (7-15)', array['Mon','Tue','Wed','Thu','Fri']::text[], time '10:00', time '20:00', 12.95, array['Sat','Sun']::text[], time '10:00', time '20:00', 13.95),
    ('game-a', 'Group (6+ people)', array['Mon','Tue','Wed','Thu','Fri']::text[], time '10:00', time '20:00', 14.95, array['Sat','Sun']::text[], time '10:00', time '20:00', 15.95),
    ('game-a', 'Family (2 adults + 1 child)', array['Mon','Tue','Wed','Thu','Fri']::text[], time '10:00', time '20:00', 13.95, array['Sat','Sun']::text[], time '10:00', time '20:00', 14.95),

    ('game-b', 'Adult', array['Mon','Tue','Wed','Thu','Fri']::text[], time '10:00', time '20:00', 15.95, array['Sat','Sun']::text[], time '10:00', time '20:00', 16.95),
    ('game-b', 'Child/Youth (7-15)', array['Mon','Tue','Wed','Thu','Fri']::text[], time '10:00', time '20:00', 12.95, array['Sat','Sun']::text[], time '10:00', time '20:00', 13.95),
    ('game-b', 'Group (6+ people)', array['Mon','Tue','Wed','Thu','Fri']::text[], time '10:00', time '20:00', 14.95, array['Sat','Sun']::text[], time '10:00', time '20:00', 15.95),
    ('game-b', 'Family (2 adults + 1 child)', array['Mon','Tue','Wed','Thu','Fri']::text[], time '10:00', time '20:00', 13.95, array['Sat','Sun']::text[], time '10:00', time '20:00', 14.95),

    ('game-c', 'Adult', array['Mon','Tue','Wed','Thu','Fri']::text[], time '10:00', time '20:00', 15.95, array['Sat','Sun']::text[], time '10:00', time '20:00', 16.95),
    ('game-c', 'Child/Youth (7-15)', array['Mon','Tue','Wed','Thu','Fri']::text[], time '10:00', time '20:00', 12.95, array['Sat','Sun']::text[], time '10:00', time '20:00', 13.95),
    ('game-c', 'Group (6+ people)', array['Mon','Tue','Wed','Thu','Fri']::text[], time '10:00', time '20:00', 14.95, array['Sat','Sun']::text[], time '10:00', time '20:00', 15.95),
    ('game-c', 'Family (2 adults + 1 child)', array['Mon','Tue','Wed','Thu','Fri']::text[], time '10:00', time '20:00', 13.95, array['Sat','Sun']::text[], time '10:00', time '20:00', 14.95)
),
rules as (
  select event_slug, ticket_name, 'Weekday price' as tier, lower_days as weekdays, lower_start as time_start, lower_end as time_end, lower_price as price
  from matrix
  union all
  select event_slug, ticket_name, 'Weekend price' as tier, higher_days as weekdays, higher_start as time_start, higher_end as time_end, higher_price as price
  from matrix
)
select
  e.id as event_id,
  e.name as event_name,
  r.event_slug,
  r.ticket_name,
  r.tier,
  r.weekdays,
  r.time_start,
  r.time_end,
  r.price
from rules r
join public.events e on e.slug = r.event_slug;

update public.ticket_types tt
set
  status = 'archived',
  updated_at = now()
where tt.event in (select distinct event_id from desired_excel_ticket_type_rules)
  and tt.status <> 'archived'
  and not exists (
    select 1
    from desired_excel_ticket_type_rules desired
    where tt.event = desired.event_id
      and tt.name = desired.ticket_name
      and tt.weekdays = desired.weekdays
      and tt.time_start is not distinct from desired.time_start
      and tt.time_end is not distinct from desired.time_end
      and lower(coalesce(tt.remarks, '')) like lower(desired.tier) || '%'
  );

update public.ticket_types tt
set
  price_type = 'fixed',
  price = desired.price,
  price_adj = 0,
  valid_from = null,
  valid_to = null,
  remarks = desired.tier || ' · ' || desired.event_name,
  status = 'enabled',
  updated_at = now()
from desired_excel_ticket_type_rules desired
where tt.event = desired.event_id
  and tt.name = desired.ticket_name
  and tt.weekdays = desired.weekdays
  and tt.time_start is not distinct from desired.time_start
  and tt.time_end is not distinct from desired.time_end
  and lower(coalesce(tt.remarks, '')) like lower(desired.tier) || '%';

insert into public.ticket_types (
  event,
  name,
  price_type,
  price,
  price_adj,
  weekdays,
  valid_from,
  valid_to,
  time_start,
  time_end,
  remarks,
  status,
  created_at,
  updated_at
)
select
  desired.event_id,
  desired.ticket_name,
  'fixed',
  desired.price,
  0,
  desired.weekdays,
  null,
  null,
  desired.time_start,
  desired.time_end,
  desired.tier || ' · ' || desired.event_name,
  'enabled',
  now(),
  now()
from desired_excel_ticket_type_rules desired
where not exists (
  select 1
  from public.ticket_types existing
  where existing.event = desired.event_id
    and existing.name = desired.ticket_name
    and existing.weekdays = desired.weekdays
    and existing.time_start is not distinct from desired.time_start
    and existing.time_end is not distinct from desired.time_end
    and lower(coalesce(existing.remarks, '')) like lower(desired.tier) || '%'
);

with ranked_duplicates as (
  select
    tt.id,
    row_number() over (
      partition by
        tt.event,
        tt.name,
        tt.weekdays,
        tt.time_start,
        tt.time_end,
        desired.tier
      order by tt.id
    ) as duplicate_rank
  from public.ticket_types tt
  join desired_excel_ticket_type_rules desired
    on tt.event = desired.event_id
   and tt.name = desired.ticket_name
   and tt.weekdays = desired.weekdays
   and tt.time_start is not distinct from desired.time_start
   and tt.time_end is not distinct from desired.time_end
   and lower(coalesce(tt.remarks, '')) like lower(desired.tier) || '%'
  where tt.status <> 'archived'
)
update public.ticket_types tt
set
  status = 'archived',
  updated_at = now()
from ranked_duplicates duplicates
where tt.id = duplicates.id
  and duplicates.duplicate_rank > 1;

drop table if exists desired_excel_ticket_type_rules;
end $$;
