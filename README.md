# ticket_king

Ticketing and operations system for an in-person VR experience business.

## Repository Layout

- `frontend/` - customer booking frontend, built with Vite + React
- `admin-frontend/` - admin operations frontend, built with Vite + React
- `backend/` - single FastAPI app for customer and admin API endpoints
- `agent/` - planning and architecture notes
- `backend/sql/` - SQL migrations and seed scripts for Supabase/Postgres

Frontend styling uses Tailwind CSS where configured.

## Local Configuration

Copy the example env files before running the apps locally:

```sh
cp frontend/.env.example frontend/.env
cp admin-frontend/.env.example admin-frontend/.env
cp backend/.env.example backend/.env
```

Do not commit real `.env` files. They contain database and payment credentials.

The customer frontend `.env` needs:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-or-anon-key
VITE_BACKEND_BASE=http://localhost:8000
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

The admin frontend `.env` needs:

```env
VITE_BACKEND_BASE=http://localhost:8000
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-or-anon-key
```

The backend `.env` must include the Supabase/Postgres connection settings and any payment credentials used locally.

Important backend settings include:

- `DATABASE_URL` or `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME`
- `BACKEND_CORS_ORIGINS`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET` when testing Stripe webhooks
- `ALPHAPAY_PARTNER_CODE`
- `ALPHAPAY_PRIVATE_KEY_PATH` or `ALPHAPAY_PRIVATE_KEY_PEM`
- `WEBHOOK_BASE_URL`

For local Stripe testing, use test keys:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Frontend

```sh
cd frontend
npm install
npm run dev
```

The customer frontend runs on `http://localhost:5173` by default.

Build check:

```sh
cd frontend
npm run build
```

## Admin Frontend

```sh
cd admin-frontend
npm install
npm run dev
```

The admin frontend runs on `http://localhost:5175` by default.

Build check:

```sh
cd admin-frontend
npm run build
```

## Backend

```sh
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

The FastAPI app runs on `http://localhost:8000` by default.

Customer API endpoints are served under `http://localhost:8000/api/v1`.

Admin API endpoints are served by the same backend under `http://localhost:8000/api/v1/admin`.

Useful local checks:

```sh
curl http://127.0.0.1:8000/test-db
curl "http://127.0.0.1:8000/api/v1/events/terracotta-warriors/slots?date=2026-05-20"
```

Use `python -m uvicorn ...` from the activated virtual environment so the backend uses the packages installed in `backend/.venv`.

## Database Setup

This project uses Supabase/Postgres. Run SQL files from `backend/sql/` in order in the Supabase SQL editor when setting up or updating a database.

Current migration order:

```text
001_admin_schema.sql
002_admin_seed_catalog.sql
003_normalize_relations.sql
004_users_role_admin.sql
005_resource_cart_schema.sql
006_seed_terracotta_daily_slots.sql
007_order_reservations.sql
```

`005_resource_cart_schema.sql` adds event-based slots, resource capacity rules, and multi-item cart support.

`006_seed_terracotta_daily_slots.sql` seeds bookable Terracotta Army VR slots for the customer booking API.

`007_order_reservations.sql` adds the timed reservation columns used to hold seats during checkout.

## Checkout Reservations

The customer checkout uses timed reservations so seats are not oversold.

Current flow:

1. Customer selects tickets and continues to payment.
2. Backend creates an `orders` row and `order_items` rows.
3. The order acts as a 5-minute hold using `reservation_expires_at`.
4. Availability is calculated as:

```text
available seats = slot capacity - active unpaid holds - confirmed tickets
```

An active unpaid hold is an order that is still pending and has not expired. Expired holds should stop counting toward availability.

Important behavior:

- If payment succeeds in time, the order becomes paid and tickets are created.
- If payment expires or is cancelled, seats become available again.
- The browser may try to release a hold when the user leaves the payment page, but the expiration timestamp is the reliable source of truth.

## Stripe Local Webhook Testing

Install the Stripe CLI first if `stripe listen` is not available:

```sh
brew install stripe/stripe-cli/stripe
stripe login
```

Then forward Stripe webhooks to the local backend:

```sh
stripe listen --forward-to localhost:8000/api/v1/stripe/webhook
```

Stripe prints a webhook secret that starts with `whsec_`. Put that value in `backend/.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

Restart the backend after changing `.env`.

Useful local payment checks:

1. Buy 1 test ticket with Stripe test card `4242 4242 4242 4242`.
2. Confirm the latest order becomes paid.
3. Confirm the correct number of rows appears in `tickets`.
4. Send or receive the same webhook more than once and confirm duplicate tickets are not created.

Example SQL for the latest order:

```sql
select
  id,
  order_number,
  order_status,
  payment_status,
  fulfillment_status,
  payment_provider,
  provider_reference,
  ticket_quantity,
  total_amount,
  created_at
from public.orders
order by created_at desc
limit 1;
```

Example SQL for tickets on an order:

```sql
select
  id,
  ticket_number,
  order_id,
  order_item_id,
  ticket_type,
  ticket_status,
  created_at
from public.tickets
where order_id = 'PASTE_ORDER_ID_HERE'
order by created_at, id;
```

## Common Local Issues

If `npm install` fails with root-owned cache files, fix the local npm cache ownership:

```sh
sudo chown -R "$(id -u):$(id -g)" "$HOME/.npm"
```

If Supabase login shows `Invalid Refresh Token: Refresh Token Not Found`, the browser likely has an old saved auth session. Clear the localhost Supabase auth key from browser local storage, refresh, and log in again.

If Chrome logs Stripe `ERR_NETWORK_CHANGED` or `ERR_NAME_NOT_RESOLVED` for `https://r.stripe.com/b`, it is usually Stripe telemetry failing because of local network/DNS changes. It is only a payment issue if the actual payment confirmation fails.
