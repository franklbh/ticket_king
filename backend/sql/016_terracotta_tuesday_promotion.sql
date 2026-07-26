-- Automatic 50% promotion for Tuesday Terracotta Warriors sessions.
-- Eligibility is enforced by the backend from the authoritative event and slot date.
alter table public.orders
  add column if not exists coupon_details jsonb not null default '{}'::jsonb;

insert into public.coupons (
  code,
  source,
  discount_type,
  discount_value,
  min_purchase,
  max_uses,
  used_count,
  total_amount,
  valid_from,
  valid_to,
  status,
  remarks,
  created_at,
  updated_at
)
values (
  'terracotta_tuesday_50',
  'automatic',
  'percent',
  50,
  0,
  null,
  0,
  0,
  current_date,
  '2099-12-31',
  'active',
  'Automatically applied to Terracotta Warriors tickets for Tuesday sessions',
  now(),
  now()
)
on conflict (code) do update
set
  source = excluded.source,
  discount_type = excluded.discount_type,
  discount_value = excluded.discount_value,
  min_purchase = excluded.min_purchase,
  max_uses = excluded.max_uses,
  valid_to = excluded.valid_to,
  status = excluded.status,
  remarks = excluded.remarks,
  updated_at = now();
