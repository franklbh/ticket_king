# VR Ticketing – React + Stripe Checkout

Run the UI and the Stripe Checkout server locally without extra config files.

## Environment
Copy `.env.example` to `.env.local` and fill real values:
```
STRIPE_SECRET_KEY=sk_live_xxx          # secret, server only
VITE_BASE_URL=https://yourdomain.com   # production site
VITE_API_BASE=http://localhost:4242    # dev API base
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-or-anon-key
```

Supabase Auth redirect URLs that must be allowed in the Supabase dashboard:
```
http://localhost:5173/auth/callback
http://localhost:5173/reset-password
https://yourdomain.com/auth/callback
https://yourdomain.com/reset-password
```

## Install
```
npm install
```

The UI uses `@supabase/supabase-js` for email/password signup, login, logout, email verification, and password reset.

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
