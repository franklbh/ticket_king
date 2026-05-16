insert into public.events (id, name, slug, status)
values (1, 'Terracotta Warriors: Secrets of the First Emperor''s Mausoleum', 'terracotta-warriors', 'active')
on conflict (id) do update
set name = excluded.name,
    slug = excluded.slug,
    status = excluded.status,
    updated_at = now();

select setval(pg_get_serial_sequence('public.events', 'id'), greatest((select max(id) from public.events), 1), true);

insert into public.ticket_types
  (id, event, name, price_type, price, weekdays, valid_from, valid_to, time_start, time_end, add_on, remarks, status)
values
  (1, 1, 'Adult', 'fixed', 37.95, array['Mon','Tue','Wed','Thu'], null, null, '10:00', '19:30', null, 'Off-peak', 'enabled'),
  (2, 1, 'Adult', 'fixed', 37.95, array['Fri'], null, null, '10:00', '14:00', null, 'Off-peak (Fri)', 'enabled'),
  (3, 1, 'Adult', 'fixed', 45.95, array['Fri'], null, null, '14:00', '20:30', null, 'Peak (Fri)', 'enabled'),
  (4, 1, 'Adult', 'fixed', 45.95, array['Sat','Sun'], null, null, '10:00', '20:30', null, 'Peak (Weekend)', 'enabled'),
  (5, 1, 'Child (7-15)', 'fixed', 27.95, array['Mon','Tue','Wed','Thu'], null, null, '10:00', '19:30', null, 'Off-peak', 'enabled'),
  (6, 1, 'Child (7-15)', 'fixed', 27.95, array['Fri'], null, null, '10:00', '14:00', null, 'Off-peak (Fri)', 'enabled'),
  (7, 1, 'Child (7-15)', 'fixed', 34.95, array['Fri'], null, null, '14:00', '20:30', null, 'Peak (Fri)', 'enabled'),
  (8, 1, 'Child (7-15)', 'fixed', 34.95, array['Sat','Sun'], null, null, '10:00', '20:30', null, 'Peak (Weekend)', 'enabled'),
  (9, 1, 'Senior (65+)', 'fixed', 34.95, array['Mon','Tue','Wed','Thu'], null, null, '10:00', '19:30', null, 'Off-peak', 'enabled'),
  (10, 1, 'Senior (65+)', 'fixed', 34.95, array['Fri'], null, null, '10:00', '14:00', null, 'Off-peak (Fri)', 'enabled'),
  (11, 1, 'Senior (65+)', 'fixed', 41.95, array['Fri'], null, null, '14:00', '20:30', null, 'Peak (Fri)', 'enabled'),
  (12, 1, 'Senior (65+)', 'fixed', 41.95, array['Sat','Sun'], null, null, '10:00', '20:30', null, 'Peak (Weekend)', 'enabled'),
  (13, 1, 'Group (6+ people)', 'fixed', 32.95, array['Mon','Tue','Wed','Thu'], null, null, '10:00', '19:30', null, 'Off-peak', 'enabled'),
  (14, 1, 'Group (6+ people)', 'fixed', 32.95, array['Fri'], null, null, '10:00', '14:00', null, 'Off-peak (Fri)', 'enabled'),
  (15, 1, 'Group (6+ people)', 'fixed', 40.95, array['Fri'], null, null, '14:00', '20:30', null, 'Peak (Fri)', 'enabled'),
  (16, 1, 'Group (6+ people)', 'fixed', 40.95, array['Sat','Sun'], null, null, '10:00', '20:30', null, 'Peak (Weekend)', 'enabled'),
  (17, 1, 'Family (2 adults + 1 child)', 'fixed', 31.95, array['Mon','Tue','Wed','Thu'], null, null, '10:00', '19:30', null, 'Off-peak', 'enabled'),
  (18, 1, 'Family (2 adults + 1 child)', 'fixed', 31.95, array['Fri'], null, null, '10:00', '14:00', null, 'Off-peak (Fri)', 'enabled'),
  (19, 1, 'Family (2 adults + 1 child)', 'fixed', 39.95, array['Fri'], null, null, '14:00', '20:30', null, 'Peak (Fri)', 'enabled'),
  (20, 1, 'Family (2 adults + 1 child)', 'fixed', 39.95, array['Sat','Sun'], null, null, '10:00', '20:30', null, 'Peak (Weekend)', 'enabled'),
  (21, 1, 'Early Bird', 'fixed', 24.95, array['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], '2025-11-17', '2025-12-19', null, null, null, 'Early bird - Nov 17 to Dec 19', 'disabled'),
  (22, 1, 'Early Bird', 'fixed', 24.95, array['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], '2026-01-02', '2026-02-28', null, null, null, 'Early bird - Jan 2 to Feb 28', 'disabled'),
  (23, 1, 'VIP', 'fixed', 79.95, array['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], null, null, null, null, 'VIP Lounge', 'VIP experience', 'enabled')
on conflict (id) do update
set event = excluded.event,
    name = excluded.name,
    price_type = excluded.price_type,
    price = excluded.price,
    weekdays = excluded.weekdays,
    valid_from = excluded.valid_from,
    valid_to = excluded.valid_to,
    time_start = excluded.time_start,
    time_end = excluded.time_end,
    add_on = excluded.add_on,
    remarks = excluded.remarks,
    status = excluded.status,
    updated_at = now();

select setval(pg_get_serial_sequence('public.ticket_types', 'id'), greatest((select max(id) from public.ticket_types), 1), true);

insert into public.marketing_settings (id)
values (true)
on conflict (id) do nothing;
