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

The backend `.env` must include the Supabase/Postgres connection settings and any payment credentials used locally.

Important backend settings include:

- `DATABASE_URL` or `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME`
- `BACKEND_CORS_ORIGINS`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET` when testing Stripe webhooks
- `ALPHAPAY_PARTNER_CODE`
- `ALPHAPAY_PRIVATE_KEY_PATH` or `ALPHAPAY_PRIVATE_KEY_PEM`
- `WEBHOOK_BASE_URL`

## Frontend

```sh
cd frontend
npm install
npm run dev
```

The customer frontend runs on `http://localhost:5173` by default.

## Admin Frontend

```sh
cd admin-frontend
npm install
npm run dev
```

The admin frontend runs on `http://localhost:5175` by default.

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
