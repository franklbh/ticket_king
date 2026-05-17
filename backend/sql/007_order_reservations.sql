-- Timed checkout reservations.
-- Run after 005_resource_cart_schema.sql.
-- Safe to re-run.

alter table public.orders
  add column if not exists reserved_at timestamptz,
  add column if not exists reservation_expires_at timestamptz,
  add column if not exists payment_intent_id text;

create index if not exists idx_orders_reservation_expires_at
  on public.orders (reservation_expires_at);
