-- Admin portal read-path indexes.
-- Run after 001_admin_schema.sql and 003_normalize_relations.sql.
-- Safe to re-run.

create index if not exists idx_admin_orders_created_at on public.orders (created_at desc);
create index if not exists idx_admin_orders_order_status on public.orders (order_status);
create index if not exists idx_admin_orders_slot_id on public.orders (slot_id);
create index if not exists idx_admin_orders_customer_id on public.orders (customer_id);
create index if not exists idx_admin_orders_coupon_code on public.orders (coupon_code);

create index if not exists idx_admin_tickets_order_id on public.tickets (order_id);
create index if not exists idx_admin_tickets_created_at on public.tickets (created_at desc);
create index if not exists idx_admin_tickets_ticket_status on public.tickets (ticket_status);
create index if not exists idx_admin_tickets_checked_in_at on public.tickets (checked_in_at desc);
create index if not exists idx_admin_tickets_verification_code on public.tickets (verification_code);
create index if not exists idx_admin_tickets_qr_payload on public.tickets (qr_payload);
create index if not exists idx_admin_tickets_ticket_type on public.tickets (ticket_type);

create index if not exists idx_admin_slots_business_date_start on public.slots (business_date, start_time);
create index if not exists idx_admin_slots_status on public.slots (status);

create index if not exists idx_admin_coupons_status_source on public.coupons (status, source);
create index if not exists idx_admin_coupons_code on public.coupons (code);

create index if not exists idx_admin_marketing_records_created_at on public.marketing_records (created_at desc);
create index if not exists idx_admin_marketing_records_status on public.marketing_records (status);

create index if not exists idx_admin_audit_logs_created_at on public.audit_logs (created_at desc);
create index if not exists idx_admin_audit_logs_admin_id on public.audit_logs (admin_id);
create index if not exists idx_admin_audit_logs_target on public.audit_logs (target_type, target_id);
