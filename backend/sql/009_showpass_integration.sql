-- Maps Showpass event IDs to our internal event UUIDs.
-- Set this up once per Showpass event via POST /api/v1/admin/showpass/mappings.
CREATE TABLE IF NOT EXISTS public.showpass_event_mapping (
    id             SERIAL PRIMARY KEY,
    showpass_event_id TEXT NOT NULL UNIQUE,
    our_event_id   BIGINT NOT NULL REFERENCES public.events(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Records every ticket transaction received from Showpass webhooks.
CREATE TABLE IF NOT EXISTS public.showpass_tickets (
    id                  SERIAL PRIMARY KEY,
    showpass_order_id   TEXT NOT NULL,
    showpass_event_id   TEXT NOT NULL,
    our_slot_id         UUID REFERENCES public.slots(id),
    quantity            INTEGER NOT NULL DEFAULT 1,
    status              TEXT NOT NULL DEFAULT 'active',  -- active | refunded | voided
    event_date          DATE,
    event_start_time    TIME,
    raw_payload         JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One row per (order, event) pair — idempotent on re-delivery.
CREATE UNIQUE INDEX IF NOT EXISTS showpass_tickets_order_event_idx
    ON public.showpass_tickets(showpass_order_id, showpass_event_id);
