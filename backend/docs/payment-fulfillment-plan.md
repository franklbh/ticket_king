# Payment Fulfillment Plan

This document records the current online payment workflow, what is still missing, and the recommended implementation plan before real customer payments are launched.

## Current Workflow

### 1. User clicks `Continue to Payment`

- Backend creates a row in `orders`.
- Backend creates rows in `order_items`.
- `orders.payment_status = Pending`.
- `orders.order_status = Pending`.
- This acts as the 5-minute seat hold.

### 2. Backend creates a Stripe or Alphapay payment

- Stripe creates a `payment_intent_id`.
- `orders.provider_reference` stores either:
  - the Stripe PaymentIntent ID, or
  - the Alphapay payment request ID.
- This connects the payment provider transaction to our local order.

### 3. User pays successfully

- The frontend may show success.
- The real database confirmation depends on the payment webhook.

### 4. Webhook arrives

- Stripe webhook: `/api/v1/stripe/webhook`
- Alphapay webhook: `/api/v1/alphapay/webhook`
- Backend finds the order by `provider_reference`.
- Backend currently updates:
  - `order_status = Paid`
  - `payment_status = Paid`
  - `fulfillment_status = Pending`

## What Is Missing

The backend does not currently create actual ticket rows in the `tickets` table after online payment succeeds.

| Thing | Current Status |
| --- | --- |
| Pending order created | Yes |
| Order items created | Yes |
| Seats held during payment | Yes |
| Payment reference saved | Yes |
| Order marked paid after webhook | Yes, if webhook reaches backend |
| Tickets created after payment | No |
| QR ticket records created | No |
| Email ticket delivery | No |

Important local development warning: if you pay with Stripe locally but do not have Stripe webhook forwarding set up, the frontend can say payment succeeded while the database order may still say `Pending`.

## Required Fulfillment Step

After a payment webhook confirms payment, the backend should run a real fulfillment step:

```text
payment webhook received
-> find order by provider_reference
-> mark order paid
-> create tickets from order_items
-> mark fulfillment_status = Fulfilled
-> make this idempotent so duplicate webhooks do not create duplicate tickets
```

Right now the payment/order part exists. The final "issue real tickets" part is still incomplete.

## Launch Warning

Do not launch real customer payments yet.

Right now the system can take a payment, but it does not fully finish the booking because it does not create real ticket records after payment.

## Current Situation In Simple Terms

Think of the system like a restaurant reservation:

1. Customer chooses tickets.
2. Backend creates a temporary reservation.
3. Customer pays.
4. Payment provider tells us "payment succeeded."
5. Backend should turn the reservation into real tickets.

Right now steps 1-4 mostly exist. Step 5 is incomplete.

## Goal

After payment succeeds, the database should end up like this:

```text
orders
- payment_status = Paid
- order_status = Paid
- fulfillment_status = Fulfilled

order_items
- still store what the customer bought

tickets
- one ticket row per actual ticket
- each ticket has a unique ticket_number
- each ticket has a unique verification_code
- each ticket has a qr_payload
```

## Implementation Plan

### Step 1: Keep the current reservation flow

Do not redesign the checkout lock again right now.

We already have:

```text
orders = the checkout/reservation
order_items = what the customer is buying
reservation_expires_at = when the hold expires
```

That is good enough for now.

### Step 2: Add a fulfillment function

Add one backend function:

```text
fulfill_paid_order(order_id)
```

Its job:

1. Find the paid order.
2. Find its `order_items`.
3. Create ticket rows.
4. Mark the order fulfilled.

Plain English:

> This customer paid. Now generate their real tickets.

### Step 3: Prevent duplicate tickets

Payment providers can send the same webhook more than once.

Before creating tickets, backend must check:

```text
Are there already tickets for this order_id?
```

If yes, do not create more.

This is very important. Otherwise one payment could accidentally create duplicate tickets.

### Step 4: Create ticket rows

For each `order_item`, if quantity is 16, create 16 rows in `tickets`.

Each ticket should get:

- `ticket_number`: unique human-readable ticket number
- `order_id`: the paid order ID
- `ticket_type`: Adult, Child, etc.
- `ticket_status`: Valid
- `verification_code`: unique random code
- `qr_payload`: value used inside the QR code
- `net_ticket_amount`
- `original_ticket_amount`
- `ticket_type_id`
- `created_at`
- `updated_at`

Simple example:

```text
Order: TK202605171234
Customer bought 16 adult Terracotta tickets

Backend creates:
Ticket 1
Ticket 2
Ticket 3
...
Ticket 16
```

### Step 5: Update Stripe webhook

Stripe payment success currently does this:

```text
mark order paid
```

It should do this instead:

```text
mark order paid
create tickets
mark order fulfilled
```

This code path:

```text
payment_intent.succeeded
```

should call:

```text
mark_paid_by_provider_reference(...)
fulfill_paid_order(...)
```

### Step 6: Update Alphapay webhook

Same idea for Alphapay.

When Alphapay says payment succeeded:

```text
find order by provider_reference
mark paid
create tickets
mark fulfilled
```

Alphapay webhook verification is still weaker than Stripe. For production, we should also verify Alphapay authenticity before trusting the webhook.

### Step 7: Test locally

Use fake or sandbox payments.

Test cases:

1. Buy 1 ticket.
   - Order becomes paid.
   - 1 ticket is created.
2. Buy 16 tickets.
   - Order becomes paid.
   - 16 tickets are created.
3. Send the same webhook twice.
   - Still only the correct number of tickets exists.
   - No duplicates are created.
4. Payment expires.
   - Order becomes expired.
   - No tickets are created.
   - Seats become available again.
5. Payment succeeds after expiration.
   - Backend should reject it unless it is within the 30-second grace period.

### Step 8: Add customer ticket display

After tickets are created, the frontend should show real tickets, not a fake success screen.

After payment success, frontend should fetch:

```text
GET /api/v1/orders/{order_id}/tickets
```

Then show:

- ticket number
- QR code
- event name
- date
- time
- ticket type

### Step 9: Add email later

Do not do email first.

Correct order:

1. Create tickets in database.
2. Show tickets on frontend.
3. Then email tickets.

Email is useless if the ticket records are not reliable yet.

## Recommended Next Task

Implement:

```text
Create ticket fulfillment after successful Stripe/Alphapay payment.
```

More specifically:

1. Add backend service function: `fulfill_paid_order(order_id)`.
2. Make it idempotent so duplicate webhooks do not create duplicate tickets.
3. Call it from Stripe webhook.
4. Call it from Alphapay webhook.
5. Test ticket creation in Supabase.

That is the real missing piece between "customer paid" and "customer actually has usable tickets."
