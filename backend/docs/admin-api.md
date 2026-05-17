# Admin API Documentation

Base path: `/api/v1/admin`

Authentication: admin endpoints require `Authorization: Bearer <supabase_access_token>` unless noted. The backend validates the Supabase token, loads the matching row from the admin users table, normalizes role aliases, rejects inactive users, and then checks route permissions.

RBAC model:

- The frontend never sends role or permission claims to authorize backend work.
- `GET /users/me` returns the authenticated profile and effective `permissions[]` for UI gating.
- Stored role values are `owner`, `administrator`, and `customer`.
- `admin` is accepted only as an alias for stored/canonical `administrator`.
- `owner` has full access.
- `administrator` has operational access to dashboard, orders, tickets, scanner, catalog, coupons, and marketing reads.
- Marketing writes, users/admin management, and audit logs are owner-only by default.

Permission map:

| Permission | Owner | Administrator | Used by |
| --- | --- | --- | --- |
| `dashboard:read` | Yes | Yes | Dashboard |
| `orders:read` | Yes | Yes | Order list/detail |
| `orders:write` | Yes | Yes | Walk-in orders and order mutations |
| `orders:export` | Yes | Yes | Order CSV export |
| `tickets:read` | Yes | Yes | Ticket list/detail |
| `tickets:write` | Yes | Yes | Ticket status, batch update, QR regeneration |
| `tickets:export` | Yes | Yes | Ticket CSV export |
| `scanner:use` | Yes | Yes | Check-in, override check-in, recent scans |
| `catalog:read` | Yes | Yes | Events, slots, ticket types reads |
| `catalog:write` | Yes | Yes | Events, slots, ticket types mutations |
| `coupons:read` | Yes | Yes | Coupon reads and validation |
| `coupons:write` | Yes | Yes | Coupon mutations |
| `marketing:read` | Yes | Yes | Marketing settings/records reads |
| `marketing:write` | Yes | No | Marketing settings and record actions |
| `users:read` | Yes | No | User/admin management |
| `users:write` | Yes | No | Admin creation, role/profile/status changes |
| `logs:read` | Yes | No | Audit logs |
| `health:read` | Yes | Yes | Admin health |

## Health

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | `health:read` | Backend/database health and configured table names |

## Dashboard

| Method | Path | Permission | Query | Purpose |
| --- | --- | --- | --- | --- |
| `GET` | `/dashboard` | `dashboard:read` | `range=7d\|14d\|30d\|90d\|all`, default `all` | Stats, trend, distribution, popular slots |

## Orders

| Method | Path | Permission | Query / Body | Purpose |
| --- | --- | --- | --- | --- |
| `GET` | `/orders` | `orders:read` | `page`, `pageSize`, `orderId`, `userInfo`, `couponCode`, `orderDateFrom`, `orderDateTo`, `slotDateFrom`, `slotDateTo`, `slotStart`, `status` | SQL-filtered paginated orders |
| `GET` | `/orders/export` | `orders:export` | Same filters as `/orders` | CSV export with audit log |
| `POST` | `/orders/walk-in` | `orders:write` | `WalkInOrderCreate` | Create walk-in order and tickets |
| `GET` | `/orders/{order_id}` | `orders:read` | Path `order_id` | Read one order |
| `PATCH` | `/orders/{order_id}/status` | `orders:write` | `{ "status": string }` | Update order status |
| `PATCH` | `/orders/{order_id}/customer` | `orders:write` | `{ "name": string, "email": string, "phone": string }` | Update order guest/customer fields |
| `PATCH` | `/orders/{order_id}/slot` | `orders:write` | `{ "slotId": string }` | Move order to another slot |
| `POST` | `/orders/{order_id}/coupon` | `orders:write` | `{ "couponCode": string, "couponDiscount": number }` | Apply coupon fields to order |
| `DELETE` | `/orders/{order_id}/coupon` | `orders:write` | None | Remove coupon fields from order |
| `POST` | `/orders/{order_id}/resend-email` | `orders:write` | `{ "reason": string }` | Audit resend request; email provider is not wired yet |

Partial: customer updates currently change order guest fields, not the linked registered user profile.

## Tickets

| Method | Path | Permission | Query / Body | Purpose |
| --- | --- | --- | --- | --- |
| `GET` | `/tickets` | `tickets:read` | `page`, `pageSize`, `code`, `orderId`, `status`, `slotDateFrom`, `slotDateTo`, `verifiedFrom`, `verifiedTo`, `ticketType` | SQL-filtered paginated tickets |
| `GET` | `/tickets/export` | `tickets:export` | Same filters as `/tickets` | CSV export with audit log |
| `GET` | `/tickets/{ticket_id}` | `tickets:read` | Path `ticket_id` | Read one ticket |
| `PATCH` | `/tickets/{ticket_id}/status` | `tickets:write` | `{ "status": string }` | Mark ticket `used`, `not_used`, or `voided` |
| `PATCH` | `/tickets/batch/status` | `tickets:write` | `{ "ticketIds": string[], "status": string }` | Batch status update |
| `POST` | `/tickets/{ticket_id}/regenerate-qr` | `tickets:write` | `{ "reason": string }` | Generate new verification code and QR payload |

## Scanner

| Method | Path | Permission | Query / Body | Purpose |
| --- | --- | --- | --- | --- |
| `POST` | `/scanner/check-in` | `scanner:use` | `{ "code": string }` | Validate and mark ticket used |
| `POST` | `/scanner/override-check-in` | `scanner:use` | `{ "code": string, "reason": string }` | Forced check-in with audit reason |
| `GET` | `/scanner/recent` | `scanner:use` | `minutes=1..240` | Recent checked-in tickets |

## Catalog

### Events

| Method | Path | Permission | Body | Purpose |
| --- | --- | --- | --- | --- |
| `GET` | `/events` | `catalog:read` | None | List events |
| `POST` | `/events` | `catalog:write` | `EventUpsert` | Create event |
| `PATCH` | `/events/{event_id}` | `catalog:write` | `EventUpsert` | Update event |

Missing: event archive/deactivate endpoint.

### Slots

| Method | Path | Permission | Query / Body | Purpose |
| --- | --- | --- | --- | --- |
| `GET` | `/slots` | `catalog:read` | Optional `dateFrom`, `dateTo` | SQL-filtered slot list. No date defaults are applied. |
| `POST` | `/slots` | `catalog:write` | `SlotUpsert` | Create slot |
| `POST` | `/slots/batch` | `catalog:write` | `{ "slots": SlotUpsert[] }` | Batch create slots |
| `GET` | `/slots/{slot_id}` | `catalog:read` | Path `slot_id` | Read one slot |
| `PATCH` | `/slots/{slot_id}` | `catalog:write` | `SlotUpsert` | Update slot |
| `PATCH` | `/slots/{slot_id}/status` | `catalog:write` | `{ "status": string }` | Enable/disable/update slot status |
| `PATCH` | `/slots/{slot_id}/capacity` | `catalog:write` | `{ "totalSeats": number, "reason": string }` | Capacity/restock update |

### Ticket Types

| Method | Path | Permission | Query / Body | Purpose |
| --- | --- | --- | --- | --- |
| `GET` | `/ticket-types` | `catalog:read` | `enabledOnly=true\|false` | List ticket types |
| `POST` | `/ticket-types` | `catalog:write` | `TicketTypeUpsert` | Create ticket type/rule |
| `POST` | `/ticket-types/validate` | `catalog:read` | `TicketTypeUpsert` | Validate rule conflicts |
| `PATCH` | `/ticket-types/bulk-price` | `catalog:write` | `{ "ids": [], "price": number, "priceAdj": number, "remarks": string }` | Bulk price update |
| `PATCH` | `/ticket-types/{type_id}` | `catalog:write` | `TicketTypeUpsert` | Update ticket type/rule |
| `PATCH` | `/ticket-types/{type_id}/status` | `catalog:write` | `{ "status": string }` | Update status |
| `DELETE` | `/ticket-types/{type_id}` | `catalog:write` | None | Archive ticket type |

## Coupons

| Method | Path | Permission | Query / Body | Purpose |
| --- | --- | --- | --- | --- |
| `GET` | `/coupons` | `coupons:read` | `status`, `source`, `search` | SQL-filtered coupon list |
| `POST` | `/coupons/validate` | `coupons:read` | `{ "code": string, "amount": number }` | Validate coupon and compute discount |
| `POST` | `/coupons` | `coupons:write` | `CouponUpsert` | Create coupon |
| `PATCH` | `/coupons/{coupon_id}` | `coupons:write` | `CouponUpsert` | Update coupon |
| `DELETE` | `/coupons/{coupon_id}` | `coupons:write` | None | Archive coupon |
| `GET` | `/coupons/{coupon_id}/qr` | `coupons:read` | Path `coupon_id` | Coupon QR payload |
| `GET` | `/coupons/{coupon_id}/orders` | `coupons:read` | `page`, `pageSize` | Orders using coupon |

## Marketing

| Method | Path | Permission | Query / Body | Purpose |
| --- | --- | --- | --- | --- |
| `GET` | `/marketing/settings` | `marketing:read` | None | Read marketing settings |
| `PUT` | `/marketing/settings` | `marketing:write` | `MarketingSettingsUpdate` | Update settings |
| `GET` | `/marketing/records` | `marketing:read` | `page`, `pageSize`, `status` | SQL-filtered paginated marketing records |
| `POST` | `/marketing/records` | `marketing:write` | `MarketingRecordCreate` | Create queued marketing record |
| `POST` | `/marketing/records/{record_id}/cancel` | `marketing:write` | `{ "reason": string }` | Cancel record |
| `POST` | `/marketing/records/{record_id}/retry` | `marketing:write` | `{ "reason": string }` | Requeue record |
| `POST` | `/marketing/test-send` | `marketing:write` | `MarketingTestSendRequest` | Audit test send request |

Partial: email dispatch provider and delivery tracking are not implemented yet.

## Users / Admins

| Method | Path | Permission / Auth | Body | Purpose |
| --- | --- | --- | --- | --- |
| `GET` | `/users/me` | Active admin | None | Current profile with permissions |
| `POST` | `/users/me/login-event` | Active admin | None | Record login event after successful password login |
| `GET` | `/users` | `users:read` | Optional `role` query | SQL-filtered user/admin list |
| `POST` | `/users/admins` | `users:write` | `AdminAccountCreate` | Create administrator account |
| `POST` | `/users/bootstrap-owner` | Bootstrap token if configured | `OwnerBootstrapCreate` | Bootstrap initial owner |
| `PATCH` | `/users/{user_id}/role` | `users:write` | `{ "role": "owner\|administrator\|admin\|customer" }` | Change role |
| `PATCH` | `/users/{user_id}/staff-profile` | `users:write` | `StaffProfileUpdate` | Update staff profile/status |

Missing: password reset/change endpoint, user detail endpoint, and login-history endpoint.

## Activity Logs

| Method | Path | Permission | Query | Purpose |
| --- | --- | --- | --- | --- |
| `GET` | `/logs` | `logs:read` | `page`, `pageSize`, `admin`, `actionType`, `targetType`, `targetId`, `dateFrom`, `dateTo`, `search` | SQL-filtered paginated audit logs |
| `GET` | `/logs/export` | `logs:read` | Same filters as `/logs` | CSV export |
| `GET` | `/logs/{log_id}` | `logs:read` | Path `log_id` | Log detail |

Audit details now include structured `changes` for the high-frequency order, coupon, and marketing mutations. Some catalog/ticket mutations still record action-specific details rather than a full before/after object.

## Frontend API Client Coverage

`admin-frontend/src/api/adminApi.js` exports client functions for every backend route listed above, including routes that are not yet exposed in page UI.

## Database Setup

Run the SQL files in order:

1. `backend/sql/001_admin_schema.sql`
2. `backend/sql/002_admin_seed_catalog.sql`
3. `backend/sql/003_normalize_relations.sql`
4. `backend/sql/004_users_role_admin.sql`
5. `backend/sql/006_admin_performance_indexes.sql`

The performance indexes are important for dashboard, orders, tickets, slots, scanner, coupons, marketing records, and audit log pages.
