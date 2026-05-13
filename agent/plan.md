# Ticket System Scope Plan

## 1. Project Overview

This project is a ticketing and operations system for an in-person VR experience business. The system must support both in-person sales and online transactions while giving internal staff full control over bookings, ticket issuance, check-in, admin operations, and reporting.

The product has two main surfaces:

- `Admin Panel`: used by internal staff to manage slots, orders, tickets, check-in, admins, and reporting.
- `Online Booking Flow`: used by customers to browse available slots, select tickets, complete payment, and receive tickets.

The system is centered around time-slot-based capacity. Every booking must respect slot limits and prevent overselling.

## 2. Product Goals

- Support both `walk-in / POS` sales and `online paid bookings`
- Prevent overselling of slots
- Issue one ticket per seat with unique secure verification
- Support fast check-in through QR scanning
- Provide a reliable audit trail for all important actions
- Give operations staff clear visibility into sales, usage, and exceptions
- Support multiple languages for staff-facing and customer-facing flows

## 3. Core Business Objects

### 3.1 Slot

A slot represents a scheduled experience session with fixed capacity.

Each slot includes:

- date and time
- capacity
- availability
- status
- pricing context if needed

### 3.2 Order

An order is the commercial purchase record for one customer and one slot.

Each order includes:

- order number
- sales channel
- customer info
- slot reference
- ticket quantities
- total amount
- coupon or discount usage
- payment state
- fulfillment state
- remarks

### 3.3 Ticket

Each ticket is one admission unit.

Each ticket includes:

- ticket type
- verification code
- QR code payload
- status
- slot reference
- order reference
- used timestamp if checked in

### 3.4 Customer

A customer is the purchaser or contact person tied to an order.

Stored details include:

- name
- email
- phone
- optional marketing preferences if later needed

### 3.5 Payment Transaction

A payment transaction records payment activity for online bookings and optionally recorded in-person payments.

It includes:

- payment provider or payment method
- amount
- currency
- provider reference
- transaction status
- timestamps
- metadata from provider

### 3.6 Reservation / Inventory Hold

For online checkout, the system must temporarily hold inventory before payment completes.

Each hold includes:

- slot reference
- order reference
- held quantity
- expiration time
- status

### 3.7 Admin User

An admin user is an internal operator who accesses the back office.

Each admin includes:

- username
- email
- role
- department
- position
- account status
- last login
- last login IP

### 3.8 Audit Log

Audit logs capture every important admin and system mutation.

Each audit log includes:

- actor
- action type
- target type
- target ID
- structured detail payload
- IP or request context
- timestamp

## 4. Supported Sales Channels

### 4.1 Walk-In / POS Channel

This is the internal flow where staff sell tickets at the venue. Payment happens outside the system at the physical POS, and the system records the payment result and creates tickets.

### 4.2 Online Booking Channel

This is the customer flow where a customer books a slot online, pays through an online payment provider, and receives tickets after payment is confirmed.

### 4.3 Admin-Created Order Channel

This covers manual creation of bookings by admins for phone bookings, partner bookings, corrections, or staff-assisted bookings.

## 5. Core Feature Scope

## 5.1 Authentication and Access Control

The system must support secure admin authentication and role-based access control.

Feature scope:

- admin login
- logout
- session handling
- current-user identity
- password reset or admin-invited password setup
- account disable / enable
- route-level permission protection
- action-level permission enforcement

Roles to support:

- `Super Admin`
- `SDirector`
- `Director`
- `Operator`

Permissions should cover:

- view dashboard
- manage orders
- manage tickets
- check in tickets
- undo check-in
- manage admins
- export data
- manage slots
- manage ticket types
- manage coupons
- view audit logs

## 5.2 Dashboard and Reporting Overview

The dashboard gives operations and management visibility into business performance.

Feature scope:

- KPI cards for today's revenue
- KPI cards for today's tickets
- KPI cards for pending orders
- KPI cards for active slots
- selectable reporting windows:
  - 7 days
  - 14 days
  - 30 days
  - 90 days
  - all-time
- sales trend chart
- ticket count trend chart
- ticket type distribution chart
- most popular slots chart

Management reporting should answer:

- how much revenue was generated
- how many tickets were sold
- which slots are most popular
- what percentage of tickets are checked in
- what orders remain unresolved

## 5.3 Slots Management

Slots are the inventory foundation of the product.

Feature scope:

- create slots
- edit slot date/time
- edit slot capacity
- disable or close a slot
- list upcoming slots
- filter slots by date range
- view booked vs available seats
- mark sold-out status

Rules:

- slot times must be stored consistently
- displayed times must reflect the business timezone or viewer locale where appropriate
- booking operations must not oversell capacity

## 5.4 Ticket Types and Pricing

Ticket types define what can be sold.

Feature scope:

- create ticket types
- edit ticket type names
- set base pricing
- activate / deactivate ticket types
- define display order
- optionally define bundle behavior

Ticket types include, at minimum:

- Regular
- Child
- Senior
- Family Bundle
- Group
- VIP

Key scope rule:

- pricing must be snapshotted into the order at time of purchase

## 5.5 Orders Management

Orders are the main commercial record.

Feature scope:

- searchable orders table
- filter by order ID
- filter by customer name
- filter by phone
- filter by email
- filter by order date range
- filter by slot date range
- filter by sales channel
- filter by order status
- view order details
- update remarks
- cancel order if allowed
- refund order if supported
- resend confirmation email
- CSV export

Order statuses should support the full lifecycle, including:

- initiated
- payment_pending
- paid
- completed
- cancelled
- refunded
- expired
- payment_failed
- user_cancelled

The exact status list can be finalized later, but the scope must include both payment and fulfillment states.

## 5.6 Walk-In Order Creation Flow

This is a high-priority admin workflow for front-desk staff.

Feature scope:

1. select date
2. select slot
3. select ticket types and quantities
4. enter customer name, email, and phone
5. record payment method
6. optionally send ticket email
7. optionally mark tickets as used immediately
8. confirm order creation

Recorded in-person payment methods:

- Cash
- Credit Card
- WeChat Pay
- Alipay
- Other

Special behavior:

- `Mark as used immediately` creates a completed operational record for customers who purchase and enter immediately

## 5.7 Online Booking Flow

This is the customer-facing booking experience.

Feature scope:

- browse available slots
- view slot availability
- select tickets and quantities
- enter customer contact info
- optionally apply coupon
- review order summary
- begin online payment
- receive payment success or failure result
- receive confirmation email with tickets after payment success

Required business behavior:

- reserve inventory during payment window
- expire unpaid reservations
- finalize tickets only after successful payment confirmation

Optional customer-facing pages:

- booking page
- payment return page
- booking success page
- booking failed page

## 5.8 Payments

Online payments introduce a distinct payment scope.

Feature scope:

- create payment session
- record payment provider status
- store provider transaction references
- handle successful payments
- handle failed payments
- handle expired or abandoned payments
- process payment webhooks
- reconcile payment state with order state
- support refunds if required in later phases

Payment scope requirements:

- payment confirmation must be server-trusted
- webhook handling must be idempotent
- payment records must be queryable from admin order detail

## 5.9 Inventory Holds and Expiration

This is required for safe online booking.

Feature scope:

- create temporary inventory hold during checkout
- set hold expiration time
- release hold on payment failure
- release hold on timeout
- convert hold into sold inventory on payment success
- track hold status for operations visibility

This module protects against:

- double-selling during concurrent online checkout
- orphaned unpaid reservations blocking inventory

## 5.10 Tickets Management

Each order results in one ticket per seat.

Feature scope:

- generate secure verification code
- generate QR payload
- searchable tickets table
- search by verification code
- search by order ID
- search by ticket type
- search by slot date range
- search by ticket status
- search by verified date range
- view ticket detail
- resend ticket email
- manually mark ticket unused
- void ticket if order becomes invalid

Ticket statuses should support:

- unused
- used
- void

## 5.11 Scanner and Check-In Operations

This is the live operations module for verifying entry.

Feature scope:

- standalone scanner page
- device camera access
- QR code scanning
- successful check-in flow
- duplicate scan handling
- invalid code handling
- cancelled or voided ticket handling
- recent scans list for last 20 minutes
- manual lookup fallback by verification code

Operational requirements:

- scanner should be fast and simple
- result state must be visually obvious
- check-in must record who scanned and when

## 5.12 Email and Notifications

The system should deliver transactional ticket and booking emails.

Feature scope:

- order confirmation email
- online paid booking confirmation email
- ticket delivery email
- resend ticket email
- optionally send no email for immediate-used walk-ins

Email content should include:

- order reference
- slot date/time
- ticket summary
- QR code or link to ticket
- venue instructions if needed

## 5.13 Customer Data Management

Customer data is primarily operational and booking-related.

Feature scope:

- capture customer contact info during booking
- search orders by customer fields
- basic customer detail visibility
- tie one customer contact record to many orders if desired

Non-scope for initial phases:

- full customer portal
- loyalty program
- rich CRM automation

## 5.14 Admin Management

Internal user management is required for accountability and security.

Feature scope:

- create admin accounts
- edit admin details
- assign roles
- disable admin accounts
- list admins
- view last login time
- view last login IP
- filter active vs disabled admins

Optional later additions:

- invite flow by email
- forced password reset
- MFA

## 5.15 Activity Logs and Audit Trail

Audit logging is required from the beginning.

Feature scope:

- append-only action log
- log login events
- log order creation
- log order updates
- log exports
- log check-in
- log undo check-in
- log admin changes
- log slot changes
- log ticket type changes
- filter logs by admin
- filter logs by action type
- filter logs by target type
- filter logs by date
- view structured action details

The audit trail should cover both user-driven actions and system-driven important events where useful.

## 5.16 Data Export

Admin users need export capability for operational reporting.

Feature scope:

- export orders to CSV
- export tickets to CSV
- export activity logs to CSV if needed
- permission-protected export actions
- exported field consistency

## 5.17 Coupons and Promotions

This is lower priority, but should remain in scope for later phases.

Feature scope:

- create coupon codes
- percentage or fixed discount
- minimum purchase rule
- validity period
- usage cap
- active / inactive state
- apply coupon during booking
- manual or QR-based coupon generation

This module can be phased after the core booking and check-in system is stable.

## 5.18 Marketing and Campaigns

This is an optional future module.

Feature scope:

- promotional email campaigns
- discount campaign flows
- segmented communication

This is explicitly not needed for the first working release.

## 6. Major User Flows

### 6.1 Walk-In Sale Flow

1. Admin logs in
2. Admin selects slot
3. Admin selects ticket quantities
4. Admin enters customer info
5. Admin records physical payment method
6. System creates order
7. System consumes slot capacity
8. System creates tickets
9. System optionally emails customer
10. System logs the action

### 6.2 Walk-In Immediate Check-In Flow

1. Admin creates walk-in order
2. Admin enables `mark as used immediately`
3. System creates completed order
4. System marks tickets used
5. System skips ticket email if configured
6. System logs the action

### 6.3 Online Booking Flow

1. Customer browses slots
2. Customer selects slot and ticket quantities
3. System validates availability
4. System creates pending order
5. System creates temporary inventory hold
6. Customer proceeds to payment
7. Payment provider returns webhook
8. System confirms payment
9. System converts hold to sold seats
10. System creates tickets
11. System emails customer
12. System logs relevant events

### 6.4 Check-In Flow

1. Admin opens scanner
2. Admin scans QR code
3. System validates ticket
4. If valid and unused, ticket becomes used
5. System stores check-in log
6. System stores audit log
7. Admin sees clear success or error state

### 6.5 Manual Correction Flow

1. Admin locates order or ticket
2. Admin updates allowed fields or undoes check-in
3. System validates permissions
4. System stores mutation
5. System stores audit trail

## 7. Cross-Cutting Functional Requirements

## 7.1 Internationalization

Required languages:

- English
- Simplified Chinese
- Traditional Chinese

Scope includes:

- admin labels
- public booking labels
- status labels
- emails if supported in scope

## 7.2 Timezone Handling

Scope requirements:

- store system timestamps consistently
- store or normalize slot times consistently
- display times in local business context
- ensure dashboard "today" metrics follow a clearly defined timezone

## 7.3 Role-Based Access Control

Scope requirements:

- enforce permissions in backend
- hide or disable unauthorized frontend actions
- prevent unauthorized exports, admin edits, and operational overrides

## 7.4 Capacity Protection

Scope requirements:

- no slot overselling
- safe handling of concurrent bookings
- safe handling of concurrent checkouts
- safe release of expired inventory holds

## 7.5 QR and Verification Security

Scope requirements:

- verification tokens must be unguessable
- QR data must not expose sensitive customer information
- ticket validation must happen server-side

## 7.6 Auditability

Scope requirements:

- every important mutation must be traceable
- key operational actions must preserve actor, target, and timestamp

## 7.7 Reliability of Payment State

Scope requirements:

- online payment success must be confirmed by trusted backend state
- duplicate webhooks must not create duplicate tickets
- failed or expired payments must release inventory

## 8. Operational and Exception Handling Scope

The system must also define support for edge cases and exceptions.

Feature scope:

- sold-out slot handling
- duplicate scan handling
- invalid QR handling
- expired payment handling
- abandoned checkout handling
- cancelled order handling
- refunded order handling
- ticket voiding where applicable
- mistaken check-in correction
- email send failure visibility

## 9. Release Phasing

## 9.1 Phase 1: First Beta Scope

The first beta should focus on the smallest usable end-to-end operational system.

Included:

- admin authentication
- role-based access control
- slots listing and availability
- walk-in order creation
- online booking checkout
- payment session handling
- inventory hold and expiration
- ticket generation
- orders management
- tickets management
- scanner and check-in
- resend ticket email
- audit logging
- basic dashboard

Limited or minimal in beta:

- admin management basic CRUD
- basic slot management
- basic ticket type management

Excluded from first beta:

- marketing campaigns
- advanced coupons if time is limited
- advanced refund workflows
- complex customer self-service area
- advanced analytics

## 9.2 Phase 2: Operational Expansion

Potential additions:

- richer slot CRUD
- richer ticket type controls
- coupons
- improved reporting
- customer lookup history
- refund workflows
- more advanced admin controls

## 9.3 Phase 3: Commercial Growth Features

Potential additions:

- marketing tools
- campaign management
- more advanced promotions
- customer portal
- partner / group sales tools

## 10. Out of Scope for Initial Planning

These items should not be treated as first-release requirements unless business needs change:

- microservices architecture
- public marketplace integrations
- loyalty system
- full CRM
- AI forecasting
- queueing system unless proven necessary
- Redis unless a real bottleneck appears

## 11. Success Criteria

The project should be considered functionally successful when staff can:

- manage slots and availability
- create walk-in bookings
- accept online bookings
- prevent overselling
- issue secure tickets
- scan and check in customers reliably
- find and manage orders and tickets
- track admin activity through audit logs
- monitor core sales and usage metrics

The system should also allow customers to:

- view available slots
- complete online payment
- receive valid tickets
- arrive and check in with a QR code

