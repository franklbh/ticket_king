# Ticket King Admin Backend

This standalone service has been migrated into `../backend`. Use the main backend on `http://localhost:8000` and the admin route prefix `/api/v1/admin`.

The bootstrap owner endpoint is now:

```http
POST http://localhost:8000/api/v1/admin/users/bootstrap-owner
```

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

Supabase Auth is the source of truth for email/password login. The app-level `public.users.role` column is used only for authorization inside Ticket King.

The existing `public.users.role` column should allow these values:

- `owner`: can access the admin portal, manage tickets/orders, and create administrator accounts.
- `administrator`: can access the admin portal and modify operational tables such as tickets and walk-in orders.
- `customer`: can register and buy tickets from the customer-facing app only. Customers must only read their own orders and tickets and must not modify order or ticket records.

Admin endpoints currently use an `X-User-Id` header to identify the caller and check the caller role from `public.users`. This is a temporary API boundary until login/JWT middleware is added. Customer self-service endpoints should live in the normal user backend and must filter by the authenticated customer id/email before returning order or ticket history.

The admin backend expects `public.users` to have the current app user shape:

- `id` (`uuid`)
- `email` (`text`)
- `name` (`text`)
- `role` (`text`)
- `created_at` (`timestamptz`)
- `updated_at` (`timestamptz`)

If your `users_role_check` constraint only allows `customer`, update it before bootstrapping:

```sql
alter table public.users
drop constraint if exists users_role_check;

alter table public.users
add constraint users_role_check
check (role in ('customer', 'owner', 'administrator'));
```

## Supabase Auth Email Flow

Email/password authentication should be handled through Supabase Auth, not by the admin backend.

### Sign Up

Use Supabase Auth to create the user. Supabase creates the row in `auth.users`; your database trigger or signup flow can also create/update the matching `public.users` row with the same `id`, the user's `email`, `name`, and default role `customer`. If that `public.users` row does not exist yet, the admin bootstrap endpoint can create it from the existing `auth.users` row.

```js
const { data, error } = await supabase.auth.signUp({
  email: 'valid.email@example.com',
  password: 'example-password',
  options: {
    data: {
      name: 'Customer Name',
    },
    emailRedirectTo: 'http://localhost:5173/welcome',
  },
})

if (error) throw error
```

For hosted Supabase projects, configure the redirect URL in the Supabase dashboard under Auth redirect URLs.

### Sign In

```js
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'valid.email@example.com',
  password: 'example-password',
})

if (error) throw error
```

### Reset Password

Request the reset email:

```js
const { error } = await supabase.auth.resetPasswordForEmail(
  'valid.email@example.com',
  {
    redirectTo: 'http://localhost:5173/account/update-password',
  },
)

if (error) throw error
```

On the authenticated password update page:

```js
const { error } = await supabase.auth.updateUser({
  password: 'new-password',
})

if (error) throw error
```

## Bootstrap First Owner

First, sign up the owner account through Supabase Auth. Then call `POST /api/v1/users/bootstrap-owner` once. The endpoint looks up `auth.users` by email, uses that auth UUID as `public.users.id`, and either creates or promotes the matching `public.users` row to `owner`. Set `ADMIN_BOOTSTRAP_TOKEN` in `.env` and pass it as `X-Bootstrap-Token` to protect this endpoint in deployed environments.

```json
{
  "name": "Owner",
  "email": "owner@example.com"
}
```

PowerShell example:

```powershell
$body = @{
  name = "Owner"
  email = "owner@example.com"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:8010/api/v1/users/bootstrap-owner" `
  -ContentType "application/json" `
  -Body $body
```

With a bootstrap token:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:8010/api/v1/users/bootstrap-owner" `
  -Headers @{ "X-Bootstrap-Token" = "your-token-here" } `
  -ContentType "application/json" `
  -Body $body
```

After bootstrap succeeds, use that owner's `public.users.id` as the temporary `X-User-Id` header for protected admin API calls until JWT middleware is added.
