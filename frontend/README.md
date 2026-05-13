# VR Ticketing – React + Stripe Checkout

Run the UI and the Stripe Checkout server locally without extra config files.

## Environment
Copy `.env.example` to `.env.local` and fill real values:
```
STRIPE_SECRET_KEY=sk_live_xxx          # secret, server only
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
VITE_BASE_URL=https://yourdomain.com   # production site
VITE_API_BASE=http://localhost:4242    # dev API base
```

## Install
```
npm install
```

## Run (frontend + Stripe API)
Run both dev servers:
```
npm run dev:full
```
- UI: http://localhost:5173
- Stripe API: http://localhost:4242/api/checkout

You can also run separately:
```
npm run server   # starts Stripe Checkout API only
npm run dev      # starts React UI only
```

## Build
```
npm run build
npm run preview
```

## How checkout works
- In the payment step, “Credit Card” calls `/api/checkout` with show name/date/time.
- Backend (`server.js`) creates a Stripe Checkout Session (`mode: payment`, CAD, amount in cents) and returns `session.url`.
- Frontend redirects to `session.url`; Apple Pay, Link, and cards are handled by Stripe Checkout.
