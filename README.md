# ticket_king

Ticketing and operations system for an in-person VR experience business.

## Repository Layout

- `frontend/` - Next.js app for customer booking and admin UI
- `backend/` - FastAPI app for business logic and API endpoints
- `agent/` - planning and architecture notes

Frontend styling uses Tailwind CSS.

## Frontend

```sh
cd frontend
npm install
npm run dev
```

The Next.js app runs on `http://localhost:3000` by default.

## Backend

```sh
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install .
uvicorn app.main:app --reload
```

The FastAPI app runs on `http://localhost:8000` by default.

## Local Configuration

Copy the example env files before running the apps locally:

```sh
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
```
