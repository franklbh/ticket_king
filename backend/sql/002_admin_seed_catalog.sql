-- Seed admin catalog data. Run after 001_admin_schema.sql.
-- Idempotent: safe to re-run in Supabase SQL Editor.

do $$
begin
  if to_regclass('public.events') is null or to_regclass('public.ticket_types') is null then
    raise exception 'Run 001_admin_schema.sql before this seed script.';
  end if;
end $$;

-- events
insert into public.events (id, name, slug, status, created_at, updated_at)
values (
  1,
  'Terracotta Warriors: Secrets of the First Emperor''s Mausoleum',
  'terracotta-warriors',
  'active',
  now(),
  now()
)
on conflict (id) do update
set
  name = excluded.name,
  slug = excluded.slug,
  status = excluded.status,
  updated_at = now();

do $$
declare
  seq_name text;
  next_id bigint;
begin
  next_id := greatest(coalesce((select max(id) from public.events), 0), 1);
  seq_name := pg_get_serial_sequence('public.events', 'id');
  if seq_name is not null then
    perform setval(seq_name::regclass, next_id, true);
  elsif to_regclass('public.events_id_seq') is not null then
    perform setval('public.events_id_seq', next_id, true);
  end if;
end $$;

-- ticket_types (requires event id = 1 above)
insert into public.ticket_types (
  id,
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
values
  (1, 1, 'Adult', 'fixed', 37.95, 0, array['Mon','Tue','Wed','Thu'], null, null, time '10:00', time '19:30', null, 'Off-peak', 'enabled', now(), now()),
  (2, 1, 'Adult', 'fixed', 37.95, 0, array['Fri'], null, null, time '10:00', time '14:00', null, 'Off-peak (Fri)', 'enabled', now(), now()),
  (3, 1, 'Adult', 'fixed', 45.95, 0, array['Fri'], null, null, time '14:00', time '20:30', null, 'Peak (Fri)', 'enabled', now(), now()),
  (4, 1, 'Adult', 'fixed', 45.95, 0, array['Sat','Sun'], null, null, time '10:00', time '20:30', null, 'Peak (Weekend)', 'enabled', now(), now()),
  (5, 1, 'Child (7-15)', 'fixed', 27.95, 0, array['Mon','Tue','Wed','Thu'], null, null, time '10:00', time '19:30', null, 'Off-peak', 'enabled', now(), now()),
  (6, 1, 'Child (7-15)', 'fixed', 27.95, 0, array['Fri'], null, null, time '10:00', time '14:00', null, 'Off-peak (Fri)', 'enabled', now(), now()),
  (7, 1, 'Child (7-15)', 'fixed', 34.95, 0, array['Fri'], null, null, time '14:00', time '20:30', null, 'Peak (Fri)', 'enabled', now(), now()),
  (8, 1, 'Child (7-15)', 'fixed', 34.95, 0, array['Sat','Sun'], null, null, time '10:00', time '20:30', null, 'Peak (Weekend)', 'enabled', now(), now()),
  (9, 1, 'Senior (65+)', 'fixed', 34.95, 0, array['Mon','Tue','Wed','Thu'], null, null, time '10:00', time '19:30', null, 'Off-peak', 'enabled', now(), now()),
  (10, 1, 'Senior (65+)', 'fixed', 34.95, 0, array['Fri'], null, null, time '10:00', time '14:00', null, 'Off-peak (Fri)', 'enabled', now(), now()),
  (11, 1, 'Senior (65+)', 'fixed', 41.95, 0, array['Fri'], null, null, time '14:00', time '20:30', null, 'Peak (Fri)', 'enabled', now(), now()),
  (12, 1, 'Senior (65+)', 'fixed', 41.95, 0, array['Sat','Sun'], null, null, time '10:00', time '20:30', null, 'Peak (Weekend)', 'enabled', now(), now()),
  (13, 1, 'Group (6+ people)', 'fixed', 32.95, 0, array['Mon','Tue','Wed','Thu'], null, null, time '10:00', time '19:30', null, 'Off-peak', 'enabled', now(), now()),
  (14, 1, 'Group (6+ people)', 'fixed', 32.95, 0, array['Fri'], null, null, time '10:00', time '14:00', null, 'Off-peak (Fri)', 'enabled', now(), now()),
  (15, 1, 'Group (6+ people)', 'fixed', 40.95, 0, array['Fri'], null, null, time '14:00', time '20:30', null, 'Peak (Fri)', 'enabled', now(), now()),
  (16, 1, 'Group (6+ people)', 'fixed', 40.95, 0, array['Sat','Sun'], null, null, time '10:00', time '20:30', null, 'Peak (Weekend)', 'enabled', now(), now()),
  (17, 1, 'Family (2 adults + 1 child)', 'fixed', 31.95, 0, array['Mon','Tue','Wed','Thu'], null, null, time '10:00', time '19:30', null, 'Off-peak', 'enabled', now(), now()),
  (18, 1, 'Family (2 adults + 1 child)', 'fixed', 31.95, 0, array['Fri'], null, null, time '10:00', time '14:00', null, 'Off-peak (Fri)', 'enabled', now(), now()),
  (19, 1, 'Family (2 adults + 1 child)', 'fixed', 39.95, 0, array['Fri'], null, null, time '14:00', time '20:30', null, 'Peak (Fri)', 'enabled', now(), now()),
  (20, 1, 'Family (2 adults + 1 child)', 'fixed', 39.95, 0, array['Sat','Sun'], null, null, time '10:00', time '20:30', null, 'Peak (Weekend)', 'enabled', now(), now()),
  (21, 1, 'Early Bird', 'fixed', 24.95, 0, array['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], date '2025-11-17', date '2025-12-19', null, null, null, 'Early bird - Nov 17 to Dec 19', 'disabled', now(), now()),
  (22, 1, 'Early Bird', 'fixed', 24.95, 0, array['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], date '2026-01-02', date '2026-02-28', null, null, null, 'Early bird - Jan 2 to Feb 28', 'disabled', now(), now()),
  (23, 1, 'VIP', 'fixed', 79.95, 0, array['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], null, null, null, null, 'VIP Lounge', 'VIP experience', 'enabled', now(), now())
on conflict (id) do update
set
  event = excluded.event,
  name = excluded.name,
  price_type = excluded.price_type,
  price = excluded.price,
  price_adj = excluded.price_adj,
  weekdays = excluded.weekdays,
  valid_from = excluded.valid_from,
  valid_to = excluded.valid_to,
  time_start = excluded.time_start,
  time_end = excluded.time_end,
  add_on = excluded.add_on,
  remarks = excluded.remarks,
  status = excluded.status,
  updated_at = now();

do $$
declare
  seq_name text;
  next_id bigint;
begin
  next_id := greatest(coalesce((select max(id) from public.ticket_types), 0), 1);
  seq_name := pg_get_serial_sequence('public.ticket_types', 'id');
  if seq_name is not null then
    perform setval(seq_name::regclass, next_id, true);
  elsif to_regclass('public.ticket_types_id_seq') is not null then
    perform setval('public.ticket_types_id_seq', next_id, true);
  end if;
end $$;

-- marketing_settings (singleton row, id must be true)
insert into public.marketing_settings (
  id,
  enabled,
  send_delay_minutes,
  coupon_validity_days,
  discount_type,
  discount_value,
  min_purchase,
  max_uses,
  referral_enabled,
  referral_reward,
  updated_at
)
values (true, false, 45, 30, 'percent', 5, 0, 9999, false, 5, now())
on conflict (id) do update
set
  enabled = excluded.enabled,
  send_delay_minutes = excluded.send_delay_minutes,
  coupon_validity_days = excluded.coupon_validity_days,
  discount_type = excluded.discount_type,
  discount_value = excluded.discount_value,
  min_purchase = excluded.min_purchase,
  max_uses = excluded.max_uses,
  referral_enabled = excluded.referral_enabled,
  referral_reward = excluded.referral_reward,
  updated_at = now();
