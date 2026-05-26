-- Normalize event rows so Admin uses Supabase as the source of truth.
--
-- Intended production shape:
--   terracotta-warriors -> Terracotta Warriors, 30 minutes
--   panda-vr            -> Panda's World, 30 minutes
--   dino-vr             -> Back to Jurassic, 30 minutes
--   game-a -> Hero
--   game-b -> HyperBeat Slash
--   game-c -> Gulu Gulu
--   all games are 15 minutes
--
-- The legacy combined event slug "games" is archived instead of deleted because
-- ticket_types, order_items, or slots may still reference it.

begin;

update public.events
set
  name = case slug
    when 'terracotta-warriors' then 'Terracotta Warriors'
    when 'panda-vr' then 'Panda''s World'
    when 'dino-vr' then 'Back to Jurassic'
    when 'game-a' then 'Hero'
    when 'game-b' then 'HyperBeat Slash'
    when 'game-c' then 'Gulu Gulu'
    else name
  end,
  status = 'active',
  duration_minutes = case
    when slug in ('terracotta-warriors', 'panda-vr', 'dino-vr') then 30
    when slug in ('game-a', 'game-b', 'game-c') then 15
    else duration_minutes
  end,
  updated_at = now()
where slug in ('terracotta-warriors', 'panda-vr', 'dino-vr', 'game-a', 'game-b', 'game-c');

update public.events
set
  status = 'archived',
  updated_at = now()
where slug = 'games';

with legacy_event as (
  select id
  from public.events
  where slug = 'games'
  limit 1
),
target_events as (
  select id
  from public.events
  where slug in ('game-a', 'game-b', 'game-c')
),
legacy_ticket_types as (
  select tt.*
  from public.ticket_types tt
  join legacy_event le on le.id = tt.event
  where tt.status <> 'archived'
)
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
  add_on,
  remarks,
  status,
  created_at,
  updated_at
)
select
  target.id,
  legacy.name,
  legacy.price_type,
  legacy.price,
  legacy.price_adj,
  legacy.weekdays,
  legacy.valid_from,
  legacy.valid_to,
  legacy.time_start,
  legacy.time_end,
  legacy.add_on,
  legacy.remarks,
  legacy.status,
  now(),
  now()
from legacy_ticket_types legacy
cross join target_events target
where not exists (
  select 1
  from public.ticket_types existing
  where existing.event = target.id
    and existing.name = legacy.name
    and coalesce(existing.remarks, '') = coalesce(legacy.remarks, '')
    and existing.weekdays = legacy.weekdays
    and existing.time_start is not distinct from legacy.time_start
    and existing.time_end is not distinct from legacy.time_end
);

update public.ticket_types tt
set
  status = 'archived',
  updated_at = now()
from public.events e
where tt.event = e.id
  and e.slug = 'games'
  and tt.status <> 'archived';

commit;
