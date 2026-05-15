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
