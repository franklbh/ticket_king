# Admin API Documentation

Base path: `/api/v1/admin`

Authentication: all admin endpoints require `Authorization: Bearer <supabase_access_token>` unless marked otherwise. The backend validates the Supabase bearer token, loads the current user from the admin users table by authenticated user id, then enforces permissions from `app.services.admin.security`.

RBAC model:

- The frontend never sends a role or permission claim to authorize a request.
- `/users/me` returns the authenticated admin profile plus effective `permissions[]` for UI gating.
- Backend routes use permission dependencies such as `require_permission("orders:write")`.
- Current roles:
  - `owner`: full admin access, including users/admins, logs, and marketing settings writes.
  - `admin`: operational access to dashboard, orders, tickets, scanner, catalog, coupons, and marketing reads.
- Compatibility note: existing stored `administrator` role values are normalized to canonical `admin` during auth. Migrate stored rows to `admin` and then remove that compatibility alias.
- Inactive admin accounts are rejected before permission checks.

Permission map:

| Permission | Owner | Admin | Used by |
| --- | --- | --- | --- |
| `dashboard:read` | Yes | Yes | Dashboard |
| `orders:read` | Yes | Yes | Order list/detail |
| `orders:write` | Yes | Yes | Walk-in orders and order mutations |
| `orders:export` | Yes | Yes | Order CSV export |
| `tickets:read` | Yes | Yes | Ticket list/detail |
| `tickets:write` | Yes | Yes | Ticket status updates |
| `tickets:export` | Yes | Yes | Ticket CSV export |
| `scanner:use` | Yes | Yes | Scanner check-in and recent scans |
| `catalog:read` | Yes | Yes | Events, slots, ticket types reads |
| `catalog:write` | Yes | Yes | Events, slots, ticket types mutations |
| `coupons:read` | Yes | Yes | Coupon list |
| `coupons:write` | Yes | Yes | Coupon mutations |
| `marketing:read` | Yes | Yes | Marketing settings/records reads |
| `marketing:write` | Yes | No | Marketing settings updates |
| `users:read` | Yes | No | Admin/user management page |
| `users:write` | Yes | No | Admin creation, role/profile/status changes |
| `logs:read` | Yes | No | Activity logs |
| `health:read` | Yes | Yes | Admin health |

Status legend:

- `Complete`: route exists and is wired to SQLAlchemy-backed service logic.
- `Partial`: route exists, but workflow coverage or query efficiency still needs work.
- `Missing`: expected admin workflow has no backend endpoint yet.

## Health

| Status | Method | Path | Purpose | Notes |
| --- | --- | --- | --- | --- |
| Complete | `GET` | `/health` | Admin backend/database health | Requires `health:read`. Returns DB configured flag and table mapping. |

Needed next:

- Add dependency checks for downstream services if we want more than DB/table mapping.

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

| Status | Method | Path | Permission | Purpose | Query / Body |
| --- | --- | --- | --- | --- | --- |
| Complete | `GET` | `/orders` | `orders:read` | SQL-filtered paginated order list | `page`, `pageSize`, `orderId`, `userInfo`, `couponCode`, `orderDateFrom`, `orderDateTo`, `slotDateFrom`, `slotDateTo`, `slotStart`, `status` |
| Complete | `GET` | `/orders/export` | `orders:export` | CSV export | Same filters as `/orders` |
| Complete | `POST` | `/orders/walk-in` | `orders:write` | Create in-store/walk-in order and tickets | `WalkInOrderCreate` |
| Complete | `GET` | `/orders/{order_id}` | `orders:read` | Read one order | Path `order_id` |
| Complete | `PATCH` | `/orders/{order_id}/status` | `orders:write` | Update order status | `{ "status": string }` |
| Complete | `PATCH` | `/orders/{order_id}/customer` | `orders:write` | Update guest/customer fields on an order | `{ "name": string, "email": string, "phone": string }` |
| Complete | `PATCH` | `/orders/{order_id}/slot` | `orders:write` | Move order to another slot | `{ "slotId": string }` |

Implemented request body for walk-in:

- `slot_id`, `slot_date`, `slot_start_time`, `slot_end_time`
- `tickets[]`: `ticket_type_id`, `ticket_type`, `quantity`, `unit_price`
- `customer`: `name`, `email`, `phone`, `remarks`
- `payment_method`, `mark_used_immediately`

Missing / partial:

- Missing `POST /orders/{order_id}/resend-email`.
- Missing coupon application/removal endpoint.
- Partial: slot changes update the order slot reference; if tickets later store denormalized slot data, add a linked ticket update step.
- Partial: customer update targets order guest fields. If an order belongs to a registered `users` row, decide whether admin edits should also update the user profile.

## Tickets

| Status | Method | Path | Permission | Purpose | Query / Body |
| --- | --- | --- | --- | --- | --- |
| Complete | `GET` | `/tickets` | `tickets:read` | Paginated ticket list | `page`, `pageSize`, `code`, `orderId`, `status`, `slotDateFrom`, `slotDateTo`, `verifiedFrom`, `verifiedTo`, `ticketType` |
| Complete | `GET` | `/tickets/export` | `tickets:export` | CSV export | Same filters as `/tickets` |
| Complete | `GET` | `/tickets/{ticket_id}` | `tickets:read` | Read one ticket | Path `ticket_id` |
| Complete | `PATCH` | `/tickets/{ticket_id}/status` | `tickets:write` | Mark ticket `used`, `not_used`, or `voided` | `{ "status": string }` |

Missing / partial:

- Missing batch status update endpoint.
- Missing ticket regenerate/reissue endpoint.
- Missing QR payload refresh endpoint.
- Partial: check-in lookup currently scans selected ticket rows in service code; should use indexed SQL lookup by verification code/QR payload.

## Scanner

| Status | Method | Path | Permission | Purpose | Query / Body |
| --- | --- | --- | --- | --- | --- |
| Complete | `POST` | `/scanner/check-in` | `scanner:use` | Validate and mark ticket used | `{ "code": string }` |
| Complete | `GET` | `/scanner/recent` | `scanner:use` | Recently checked-in tickets | `minutes` from `1` to `240` |

Missing / partial:

- Missing manual override/audit reason for forced check-in.
- Missing scanner station/session identifier if multiple entrances are used.
- Partial: recent scans returns ticket rows only; order/slot enrichment may be needed for richer scanner history.

## Catalog: Events, Slots, Ticket Types

### Events

| Status | Method | Path | Purpose |
| --- | --- | --- | --- |
| Complete | `GET` | `/events` | List events |
| Complete | `POST` | `/events` | Create event |
| Complete | `PATCH` | `/events/{event_id}` | Update event |

Missing:

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

| Status | Method | Path | Permission / Auth | Purpose |
| --- | --- | --- | --- | --- |
| Complete | `GET` | `/users/me` | Any active admin | Current admin profile with `permissions[]` |
| Complete | `GET` | `/users` | `users:read` | List users/admins, optional `role` |
| Complete | `POST` | `/users/admins` | `users:write` | Create admin account |
| Complete | `POST` | `/users/bootstrap-owner` | Bootstrap token if configured | Bootstrap initial owner |
| Complete | `PATCH` | `/users/{user_id}/role` | `users:write` | Change user app role |
| Complete | `PATCH` | `/users/{user_id}/staff-profile` | `users:write` | Update staff role/profile/status |

Missing / partial:

- Missing password reset/change endpoint.
- Missing deactivate/delete admin endpoint with owner-only guard.
- Missing user detail endpoint.
- Missing login history endpoint.
- Partial: admin creation depends on Supabase auth API configuration; if service role is unavailable it falls back to signup and may require project settings to allow that.

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
- Health: `GET /health`
- Orders: `GET /orders`, `GET /orders/{order_id}`, `GET /orders/export`, `POST /orders/walk-in`, `PATCH /orders/{order_id}/status`, `PATCH /orders/{order_id}/customer`, `PATCH /orders/{order_id}/slot`
- Tickets: `GET /tickets`, `GET /tickets/{ticket_id}`, `GET /tickets/export`, `PATCH /tickets/{ticket_id}/status`
- Catalog: `GET /events`, `POST /events`, `PATCH /events/{event_id}`, `GET /slots`, `POST /slots`, `PATCH /slots/{slot_id}`, `GET /ticket-types`, `POST /ticket-types`, `PATCH /ticket-types/{type_id}`
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
