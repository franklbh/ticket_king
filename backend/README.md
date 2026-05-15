# Ticket King Backend

FastAPI application for Ticket King business logic and API endpoints.

## Run Locally

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install .
uvicorn app.main:app --reload
```

Open `http://localhost:8000/docs` for the API docs.

The admin API now lives in this same backend under `/api/v1/admin`. The old standalone `admin-backend` service is no longer needed for normal development.

## Supabase Auth

Protected API routes should use `Depends(get_current_user)` from `app.core.supabase_auth`.
Clients must send the Supabase session access token:

```http
Authorization: Bearer <supabase_access_token>
```

Required backend env:

```sh
SUPABASE_URL=https://your-project-ref.supabase.co
```

## Admin API

Admin routes are mounted under:

```http
/api/v1/admin
```

Important endpoints:

- `GET /api/v1/admin/dashboard`
- `GET /api/v1/admin/orders`
- `POST /api/v1/admin/orders/walk-in`
- `GET /api/v1/admin/tickets`
- `PATCH /api/v1/admin/tickets/{ticket_id}/status`
- `GET /api/v1/admin/slots`
- `GET /api/v1/admin/ticket-types`
- `GET /api/v1/admin/users`
- `POST /api/v1/admin/users/bootstrap-owner`

Admin routes accept either:

- `Authorization: Bearer <supabase_access_token>`
- temporary `X-User-Id: <public.users.id>` while the admin frontend is being wired to Supabase sessions

### Bootstrap First Owner

Create the owner account through Supabase Auth first. Then promote the matching `public.users` row:

```powershell
$body = @{
  name = "Owner"
  email = "owner@example.com"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:8000/api/v1/admin/users/bootstrap-owner" `
  -ContentType "application/json" `
  -Body $body
```

The endpoint looks up the email in `auth.users`, uses that Auth UUID as `public.users.id`, and creates or promotes the app user row to `owner`.
