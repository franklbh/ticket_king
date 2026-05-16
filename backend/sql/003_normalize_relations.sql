-- Normalize redundant columns (run after 001_admin_schema.sql on Supabase).
-- Safe to re-run where noted.
--
-- Design:
--   orders.slot_id        → slot date/time from public.slots
--   orders.customer_id    → name/email from public.users (registered checkout)
--   orders.guest_*        → walk-in / guest checkout only (when customer_id is null)
--   orders.created_by     → staff admin who created the order (not the customer)
--   tickets               → slot via order; no duplicate slot columns
--   audit_logs.admin_id   → admin identity from public.users
--
-- Trade-off: if a slot row is edited or deleted, historical orders reflect current slot data.
-- Keep a snapshot column only if you need immutable booking history later.

-- orders: customer link + guest fields
alter table public.orders
  add column if not exists customer_id uuid references public.users (id) on delete set null;

alter table public.orders
  add column if not exists guest_name text,
  add column if not exists guest_email text,
  add column if not exists guest_phone text;

update public.orders
set
  guest_name = coalesce(guest_name, customer_name),
  guest_email = coalesce(guest_email, customer_email),
  guest_phone = coalesce(guest_phone, customer_phone)
where customer_id is null;

alter table public.orders
  drop column if exists customer_name,
  drop column if exists customer_email,
  drop column if exists customer_phone,
  drop column if exists slot_date,
  drop column if exists slot_time;

-- tickets: optional catalog link; slot comes from order
alter table public.tickets
  add column if not exists ticket_type_id bigint references public.ticket_types (id) on delete set null;

alter table public.tickets
  drop column if exists slot_id,
  drop column if exists slot_date,
  drop column if exists slot_time;

-- audit_logs: admin profile from users
alter table public.audit_logs
  drop column if exists admin_email,
  drop column if exists admin_name;
