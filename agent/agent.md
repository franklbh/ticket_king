# Agent Reference

## Purpose

This file is the working agent brief for `ticket_king`.

It exists to give future human or AI agents a stable summary of what this
repository is building, what the current source-of-truth documents are, and
which constraints should guide implementation decisions.

## Canonical Sources

Use these documents in this order when working in the repository:

1. `agent/plan.md`
2. `agent/architecture.md`
3. `README.md`
4. Code and migrations, once they exist

If implementation ever conflicts with this file, prefer the more specific
source plan and then update this file to match.

## Project Identity

- Repository: `ticket_king`
- Current product type: ticketing and operations system
- Business context: in-person VR experience business

The system must support both customer booking and internal venue operations.

## Technical Stack

The current chosen stack is:

- Frontend: `Next.js`
- Frontend styling: `Tailwind CSS`
- Backend: `FastAPI`
- Database: `Supabase Postgres`

Until changed explicitly, agents should assume this is the default
application architecture for implementation planning. The detailed system
layout lives in `agent/architecture.md`.

## Environments

The intended environments are:

- `dev`
- `prod`

These environments are planned but currently pending creation. Until they
exist, agents should treat environment-specific configuration as a design
decision to document, not an already-provisioned system.

## Product Surfaces

There are two primary product surfaces:

1. `Admin Panel`
   Used by staff to manage slots, orders, tickets, check-in, admins, exports,
   and reporting.
2. `Online Booking Flow`
   Used by customers to browse slots, choose tickets, pay online, and receive
   tickets.

## Core Product Goal

Build a reliable slot-based ticketing system that:

- supports walk-in/POS sales and online paid bookings
- prevents overselling
- issues one secure ticket per seat
- enables fast QR-based check-in
- preserves a trustworthy audit trail
- gives staff visibility into sales and operations
- supports English, Simplified Chinese, and Traditional Chinese

## Core Domain Objects

The current business model centers on these objects:

- `Slot`
  Scheduled experience session with fixed capacity and availability.
- `Order`
  Commercial purchase record for one customer and one slot.
- `Ticket`
  One admission unit per seat with secure verification and QR payload.
- `Customer`
  Purchaser or booking contact.
- `Payment Transaction`
  Record of online payment activity and references.
- `Reservation / Inventory Hold`
  Temporary inventory lock during online checkout.
- `Admin User`
  Internal operator with role-based access.
- `Audit Log`
  Append-only record of important actions and system events.

## High-Priority Workflows

Any implementation should preserve these end-to-end flows:

1. `Walk-In Sale`
   Staff selects slot and ticket quantities, records customer info and payment
   method, creates order, consumes capacity, issues tickets, and optionally
   emails the customer.
2. `Walk-In Immediate Check-In`
   Staff can create a walk-in order and mark tickets used immediately for
   customers entering right away.
3. `Online Booking`
   Customer selects a slot, the system validates inventory, creates a pending
   order and temporary hold, confirms payment via trusted backend state,
   converts hold to sold capacity, creates tickets, and sends confirmation.
4. `Scanner Check-In`
   Staff scans a QR code, the system validates ticket state server-side, marks
   valid unused tickets as used, and stores operational plus audit logs.
5. `Manual Correction`
   Staff can locate orders or tickets, perform allowed updates or undo
   check-in, and leave an audit trail.

## Non-Negotiable System Rules

These rules should be treated as core invariants:

- Slot capacity must never be oversold.
- Online checkout must use temporary inventory holds with expiration.
- Successful online payment must be confirmed by trusted backend state.
- Payment webhooks must be idempotent.
- Tickets are created only after payment success for online bookings.
- One ticket should exist per seat/admission unit.
- Verification tokens must be unguessable.
- QR payloads must not expose sensitive customer data.
- Ticket validation must happen server-side.
- Important admin and system mutations must be audit logged.
- Role-based permissions must be enforced in the backend, not only the UI.
- Time handling must be consistent across storage, slots, and reporting.

## Roles and Permissions

Current roles in scope:

- `Super Admin`
- `SDirector`
- `Director`
- `Operator`

Permission areas in scope include:

- dashboard access
- order management
- ticket management
- check-in and undo check-in
- admin management
- exports
- slot management
- ticket type management
- coupon management
- audit log access

## Functional Scope Summary

Core functional areas currently planned:

- admin authentication and session handling
- dashboard and reporting
- slot management
- ticket type and pricing management
- orders management
- walk-in order creation
- online booking flow
- payments
- inventory hold and expiration
- tickets management
- scanner and check-in operations
- email notifications
- customer data capture and lookup
- admin management
- audit logging
- CSV exports
- coupons and promotions as a later-phase feature

## Beta Scope Priority

The first beta should optimize for the smallest complete operational system.

Included in beta:

- admin authentication
- role-based access control
- slots listing and availability
- walk-in order creation
- online booking checkout
- payment session handling
- inventory holds and expiration
- ticket generation
- orders management
- tickets management
- scanner and check-in
- resend ticket email
- audit logging
- basic dashboard

Lower-depth in beta:

- admin management basic CRUD
- basic slot management
- basic ticket type management

Excluded from first beta:

- marketing campaigns
- advanced coupons if time is limited
- advanced refund workflows
- complex customer self-service
- advanced analytics

## Engineering Guidance

Until the codebase grows, implementation decisions should favor:

- monolithic simplicity over speculative architecture
- clear data models around slots, orders, tickets, holds, payments, and audits
- explicit status modeling for order, ticket, payment, and hold lifecycles
- strong transactional integrity around capacity and payment transitions
- operational clarity for staff over premature feature breadth

Items explicitly not required in initial planning:

- microservices
- marketplace integrations
- loyalty systems
- full CRM
- AI forecasting
- queueing systems unless proven necessary
- Redis unless a real bottleneck appears

## Working Expectations For Agents

Before making implementation changes:

1. Read `agent/plan.md`.
2. Read `agent/architecture.md` if the change affects system structure or
   technical boundaries.
3. Identify which user flow or invariant the change affects.
4. Preserve auditability, permission checks, and capacity protection.
5. Prefer small, traceable changes over broad rewrites.
6. Update this file when project understanding materially changes.

## Current Status

Current repository maturity appears to be early planning / scaffold stage.

At this stage, this file should be treated as a compact reference, not the full
specification. The full scope remains in `agent/plan.md`.
