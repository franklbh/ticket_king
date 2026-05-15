# Ticket King Admin Backend

FastAPI backend for the admin portal. It reads and writes Supabase Postgres directly and exposes API endpoints for:

- dashboard KPIs and charts
- orders management
- tickets management
- walk-in order creation
- slot and ticket-type lookup for the create-order flow

This service does not create database migrations. Point it at the Supabase Postgres database/tables you want the admin portal to use.

## Run Locally

```sh
cd admin-backend
python -m venv .venv
.venv\Scripts\activate
pip install -e .
copy .env.example .env
uvicorn app.main:app --reload --port 8010
```

Open `http://localhost:8010/docs`.

## Database Connection

Use the same direct Supabase pooler style as the normal backend:

```env
user=...
password=...
host=...
port=5432
dbname=postgres
```

`DATABASE_URL` is also supported and overrides the separate fields.

## Expected Supabase Tables

By default the service reads:

- `orders`
- `tickets`
- `slots`
- `ticket_types`
- `audit_logs`

You can change these names in `.env`. A common production setup is to point these names to Supabase views such as `admin_orders_view` and `admin_tickets_view`, while writes still go into real tables.

The code accepts several common column names when reading, including the CSV-style fields converted to snake case:

- Orders: `order_id`, `customer_name`, `email`, `phone`, `slot_date`, `slot_time`, `ticket_details`, `ticket_amount`, `coupon_discount`, `total_amount`, `remarks`, `status`, `payment_method`, `created_at`
- Tickets: `ticket_id`, `verification_code`, `order_id`, `slot_date`, `slot_time`, `ticket_type`, `ticket_status`, `check_in_at`, `memo`, `payment_method`, `created_at`
- Slots: `id`, `event`, `slot_date`/`date`, `start_time`, `end_time`, `price`, `total_seats`, `website_seats`, `instore_seats`, `status`
- Ticket types: `id`, `name`, `price`, `price_type`, `price_adj`, `weekdays`, `status`

## Main Endpoints

- `GET /api/v1/dashboard`
- `GET /api/v1/orders`
- `GET /api/v1/orders/export`
- `POST /api/v1/orders/walk-in`
- `GET /api/v1/tickets`
- `GET /api/v1/tickets/export`
- `PATCH /api/v1/tickets/{ticket_id}/status`
- `GET /api/v1/slots`
- `GET /api/v1/ticket-types`
- `GET /api/v1/users/me`
- `GET /api/v1/users`
- `POST /api/v1/users/admins`
- `POST /api/v1/users/bootstrap-owner`
- `PATCH /api/v1/users/{user_id}/role`

## Roles

The existing `public.users.role` and `public.profiles.role` columns should use exactly these values:

- `owner`: can access the admin portal, manage tickets/orders, and create administrator accounts.
- `administrator`: can access the admin portal and modify operational tables such as tickets and walk-in orders.
- `customer`: can register and buy tickets from the customer-facing app only. Customers must only read their own orders and tickets and must not modify order or ticket records.

Admin endpoints currently use an `X-User-Id` header to identify the caller and check the caller role from `public.users`. This is a temporary API boundary until login/JWT middleware is added. Customer self-service endpoints should live in the normal user backend and must filter by the authenticated customer id/email before returning order or ticket history.

If the database has no owner yet, call `POST /api/v1/users/bootstrap-owner` once to create the first owner. Set `ADMIN_BOOTSTRAP_TOKEN` in `.env` and pass it as `X-Bootstrap-Token` to protect this endpoint in deployed environments.
