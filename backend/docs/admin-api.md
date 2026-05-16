# Admin API Documentation

Base path: `/api/v1/admin`

Authentication: all admin endpoints require `Authorization: Bearer <supabase_access_token>` unless marked otherwise. Role checks are enforced in `app.services.admin.security`.

Status legend:

- `Complete`: route exists and is wired to SQLAlchemy-backed service logic.
- `Partial`: route exists, but workflow coverage or query efficiency still needs work.
- `Missing`: expected admin workflow has no backend endpoint yet.

## Health

| Status | Method | Path | Purpose | Notes |
| --- | --- | --- | --- | --- |
| Complete | `GET` | `/health` | Admin backend/database health | Does not require admin auth in current router. Returns DB configured flag and table mapping. |

Needed next:

- Add authenticated deep health if we want to verify admin role/session from the UI.

## Dashboard

| Status | Method | Path | Purpose | Query |
| --- | --- | --- | --- | --- |
| Complete | `GET` | `/dashboard` | Dashboard stats, summary, sales trend, ticket distribution, popular slots | `range=7d\|14d\|30d\|90d\|all` |

Response shape:

- `stats`: `todayRevenue`, `todayOrders`, `todayTickets`, `pendingOrders`, `activeSlots`
- `summary`: `totalRevenue`, `totalOrders`, `totalTickets`
- `salesTrend[]`: `date`, `revenue`, `orders`, `tickets`
- `ticketDistribution[]`: `name`, `value`, `percent`, `color`
- `popularSlots[]`: `slot`, `sold`, `total`

Needed next:

- Add explicit dashboard timing/logging for slow query diagnosis.
- Add endpoint for dashboard refresh metadata if the UI needs “last updated”.

## Orders

| Status | Method | Path | Purpose | Query / Body |
| --- | --- | --- | --- | --- |
| Complete | `GET` | `/orders` | Paginated order list | `page`, `pageSize`, `orderId`, `userInfo`, `orderDateFrom`, `orderDateTo`, `slotDateFrom`, `slotDateTo`, `status` |
| Complete | `GET` | `/orders/export` | CSV export | Same filters as `/orders` |
| Complete | `POST` | `/orders/walk-in` | Create in-store/walk-in order and tickets | `WalkInOrderCreate` |

Implemented request body for walk-in:

- `slot_id`, `slot_date`, `slot_start_time`, `slot_end_time`
- `tickets[]`: `ticket_type_id`, `ticket_type`, `quantity`, `unit_price`
- `customer`: `name`, `email`, `phone`, `remarks`
- `payment_method`, `mark_used_immediately`

Missing / partial:

- Missing `GET /orders/{order_id}` for detail view.
- Missing `PATCH /orders/{order_id}` for customer/remarks/admin edits.
- Missing `PATCH /orders/{order_id}/status` for refund/cancel/complete transitions.
- Missing `PATCH /orders/{order_id}/slot` for changing slot and updating linked tickets.
- Missing `POST /orders/{order_id}/resend-email`.
- Missing coupon application/removal endpoint.
- Partial: list/export currently enriches from multiple tables in service code; it works, but high-volume filtering should move more work into SQL.

## Tickets

| Status | Method | Path | Purpose | Query / Body |
| --- | --- | --- | --- | --- |
| Complete | `GET` | `/tickets` | Paginated ticket list | `page`, `pageSize`, `code`, `orderId`, `status`, `slotDateFrom`, `slotDateTo`, `verifiedFrom`, `verifiedTo`, `ticketType` |
| Complete | `GET` | `/tickets/export` | CSV export | Same filters as `/tickets` |
| Complete | `PATCH` | `/tickets/{ticket_id}/status` | Mark ticket `used`, `not_used`, or `voided` | `{ "status": string }` |

Missing / partial:

- Missing `GET /tickets/{ticket_id}`.
- Missing batch status update endpoint.
- Missing ticket regenerate/reissue endpoint.
- Missing QR payload refresh endpoint.
- Partial: check-in lookup currently scans selected ticket rows in service code; should use indexed SQL lookup by verification code/QR payload.

## Scanner

| Status | Method | Path | Purpose | Query / Body |
| --- | --- | --- | --- | --- |
| Complete | `POST` | `/scanner/check-in` | Validate and mark ticket used | `{ "code": string }` |
| Complete | `GET` | `/scanner/recent` | Recently checked-in tickets | `minutes` from `1` to `240` |

Missing / partial:

- Missing manual override/audit reason for forced check-in.
- Missing scanner station/session identifier if multiple entrances are used.
- Partial: recent scans returns ticket rows only; order/slot enrichment may be needed for richer scanner history.

## Catalog: Events, Slots, Ticket Types

### Events

| Status | Method | Path | Purpose |
| --- | --- | --- | --- |
| Complete | `GET` | `/events` | List events |

Missing:

- Missing `POST /events`.
- Missing `PATCH /events/{event_id}`.
- Missing `DELETE /events/{event_id}` or deactivate endpoint.

### Slots

| Status | Method | Path | Purpose | Query / Body |
| --- | --- | --- | --- | --- |
| Complete | `GET` | `/slots` | List slots by date range | `dateFrom`, `dateTo` |
| Complete | `POST` | `/slots` | Create slot | `SlotUpsert` |
| Complete | `PATCH` | `/slots/{slot_id}` | Update slot | `SlotUpsert` |

Missing / partial:

- Missing batch create/edit slots.
- Missing dedicated enable/disable endpoint.
- Missing capacity adjustment/restock endpoint with audit reason.
- Missing `GET /slots/{slot_id}`.

### Ticket Types

| Status | Method | Path | Purpose | Query / Body |
| --- | --- | --- | --- | --- |
| Complete | `GET` | `/ticket-types` | List ticket types | `enabledOnly=true\|false` |
| Complete | `POST` | `/ticket-types` | Create ticket type/rule | `TicketTypeUpsert` |
| Complete | `PATCH` | `/ticket-types/{type_id}` | Update ticket type/rule | `TicketTypeUpsert` |

Missing / partial:

- Missing dedicated enable/disable endpoint.
- Missing delete/archive endpoint.
- Missing bulk price update endpoint for the matrix UI.
- Missing rule validation endpoint for overlapping time/date/tier rules.

## Coupons

| Status | Method | Path | Purpose | Query / Body |
| --- | --- | --- | --- | --- |
| Complete | `GET` | `/coupons` | List coupons | `status`, `source` |
| Complete | `POST` | `/coupons` | Create coupon | `CouponUpsert` |
| Complete | `PATCH` | `/coupons/{coupon_id}` | Update coupon | `CouponUpsert` |

Missing / partial:

- Missing search filter by coupon code, although frontend currently has client-side search.
- Missing coupon usage/order list endpoint.
- Missing coupon QR generation endpoint.
- Missing delete/archive endpoint.
- Missing validation endpoint for checkout/admin order creation.

## Marketing

| Status | Method | Path | Purpose | Query / Body |
| --- | --- | --- | --- | --- |
| Complete | `GET` | `/marketing/settings` | Read marketing settings | None |
| Complete | `PUT` | `/marketing/settings` | Update marketing settings | `MarketingSettingsUpdate` |
| Complete | `GET` | `/marketing/records` | Paginated marketing send records | `page`, `pageSize`, `status` |

Missing / partial:

- Missing create/schedule marketing record endpoint.
- Missing cancel marketing record endpoint.
- Missing retry failed send endpoint.
- Missing email preview/test-send endpoint.
- Missing coupon generation integration for marketing records.
- Partial: current service only stores settings and lists records; actual email dispatch workflow is not implemented here.

## Users / Admins

| Status | Method | Path | Purpose | Auth |
| --- | --- | --- | --- | --- |
| Complete | `GET` | `/users/me` | Current admin profile | Any admin |
| Complete | `GET` | `/users` | List users/admins | Any admin, optional `role` |
| Complete | `POST` | `/users/admins` | Create admin account | Owner only |
| Complete | `POST` | `/users/bootstrap-owner` | Bootstrap initial owner | Bootstrap token if configured |
| Complete | `PATCH` | `/users/{user_id}/role` | Change user app role | Owner only |
| Complete | `PATCH` | `/users/{user_id}/staff-profile` | Update staff role/profile/status | Any admin currently |

Missing / partial:

- Missing password reset/change endpoint.
- Missing deactivate/delete admin endpoint with owner-only guard.
- Missing user detail endpoint.
- Missing login history endpoint.
- Partial: admin creation depends on Supabase auth API configuration; if service role is unavailable it falls back to signup and may require project settings to allow that.
- Security note: `staff-profile` can change `status`; decide whether status changes should require owner role.

## Activity Logs

| Status | Method | Path | Purpose | Query |
| --- | --- | --- | --- | --- |
| Complete | `GET` | `/logs` | Paginated audit/activity logs | `page`, `pageSize`, `admin`, `actionType`, `targetType`, `targetId`, `dateFrom`, `dateTo` |

Missing / partial:

- Missing log detail endpoint.
- Missing export logs endpoint.
- Missing free-text search endpoint.
- Partial: many actions write audit logs, but not every admin mutation has complete before/after details.

## Frontend API Client Coverage

Current `admin-frontend/src/api/adminApi.js` expects these backend functions:

- Dashboard: `GET /dashboard`
- Orders: `GET /orders`, `GET /orders/export`, `POST /orders/walk-in`
- Tickets: `GET /tickets`, `GET /tickets/export`, `PATCH /tickets/{ticket_id}/status`
- Catalog: `GET /events`, `GET /slots`, `POST /slots`, `PATCH /slots/{slot_id}`, `GET /ticket-types`, `POST /ticket-types`, `PATCH /ticket-types/{type_id}`
- Coupons: `GET /coupons`, `POST /coupons`, `PATCH /coupons/{coupon_id}`
- Marketing: `GET /marketing/settings`, `PUT /marketing/settings`, `GET /marketing/records`
- Scanner: `POST /scanner/check-in`, `GET /scanner/recent`
- Logs: `GET /logs`
- Users: `GET /users`, `GET /users/me`, `POST /users/admins`, `PATCH /users/{user_id}/staff-profile`

Every function currently exported by `admin-frontend/src/api/adminApi.js` has a matching backend route. The backend also exposes `POST /users/bootstrap-owner` and `PATCH /users/{user_id}/role`; those are not currently exported by the frontend client.

## Recommended Build Order

1. Finish high-frequency admin workflows: order detail/update/status/change-slot/resend-email, ticket batch update, slot batch edit.
2. Move remaining list filters into SQL where possible for orders, tickets, logs, coupons, and scanner lookup.
3. Complete marketing dispatch endpoints after email provider behavior is decided.
4. Harden admin/user permissions around staff status, role changes, deactivation, and password reset.
5. Add OpenAPI examples or contract tests for each module once the endpoint set stabilizes.
