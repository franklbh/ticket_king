# Architecture

## Purpose

This document records the current intended technical architecture for
`ticket_king`.

It is not the full product specification. Business scope and workflow rules
live in `agent/plan.md`. This file exists to capture implementation direction
for frontend, backend, database, environments, and system boundaries.

## Current Stack

The current selected stack is:

- Frontend: `Next.js`
- Frontend styling: `Tailwind CSS`
- Backend: `FastAPI`
- Database: `Supabase Postgres`

These choices should be treated as the default implementation baseline unless
they are explicitly changed.

## Environment Plan

The intended environments are:

- `dev`
- `prod`

Both environments are planned and pending creation.

Until infrastructure is provisioned, environment-specific values should be
documented as configuration decisions rather than assumed to exist.

## System Shape

The system should be organized as a simple three-part application:

1. `Frontend`
   A `Next.js` application for the public booking flow and internal admin UI.
2. `Backend`
   A `FastAPI` application that owns business logic, validation, permissions,
   payments, ticket issuance, check-in rules, and audit behavior.
3. `Database`
   A `Supabase Postgres` database that stores the operational data model.

## Responsibility Boundaries

### Frontend Responsibilities

The `Next.js` frontend should handle:

- admin interface screens
- customer booking screens
- form submission and UI validation
- authentication UI flows
- scanner UI if web-based
- data presentation for reporting and operations

Tailwind CSS is the default styling approach for frontend implementation.
Material UI is not part of the baseline stack and should be added only if the
admin panel later needs a heavier component system.

The frontend should not own critical business rules that must be trusted by the
system.

### Backend Responsibilities

The `FastAPI` backend should be the trusted application boundary and handle:

- authentication/session validation
- role-based access control
- slot availability checks
- inventory hold creation and expiration logic
- order lifecycle management
- payment state handling
- ticket generation and validation
- QR verification logic
- check-in operations
- audit logging
- export endpoints
- email-triggering workflows

Business invariants should be enforced here even if the frontend also performs
basic UI validation.

### Database Responsibilities

`Supabase Postgres` should store the core operational records, including:

- slots
- orders
- tickets
- customers
- payment transactions
- inventory holds
- admin users
- audit logs
- supporting configuration tables

The database schema should be designed around data integrity first, especially
for capacity protection and lifecycle tracking.

## Architectural Principles

Implementation should follow these principles:

- keep the system monolithic in the first release
- keep business logic centralized in `FastAPI`
- keep the frontend as a consumer of backend APIs
- design the database around explicit lifecycle states
- optimize for operational reliability before advanced feature breadth
- avoid speculative infrastructure

## Non-Goals For Early Architecture

The initial system should not assume:

- microservices
- event-driven distributed architecture
- Redis by default
- queue infrastructure by default
- marketplace integrations
- full CRM scope

These can be revisited only when real operational pressure justifies them.

## Initial Integration Model

The intended interaction model is:

1. User interacts with the `Next.js` frontend.
2. Frontend calls `FastAPI` endpoints.
3. `FastAPI` applies permissions and business rules.
4. `FastAPI` reads and writes `Supabase Postgres`.
5. `FastAPI` triggers side effects such as email or payment handling.

This keeps the system easier to reason about and makes future auditing simpler.

## Data and Integrity Notes

The architecture must preserve these core integrity constraints:

- no slot overselling
- secure one-ticket-per-seat issuance
- server-trusted payment confirmation
- idempotent payment event handling
- auditable admin and system mutations
- consistent timezone handling

These rules are product-critical and should influence schema design and API
boundaries from the start.

## Suggested Next Technical Decisions

As implementation begins, the next architecture decisions to document are:

- repository structure for frontend and backend code
- API versioning approach
- authentication model
- migration strategy
- background job strategy for hold expiration and email retries
- file/storage needs, if any
- observability and error tracking

## Status

This architecture is an initial agreed direction, not a fully provisioned
deployment setup.

Current status:

- stack chosen
- environments named
- infrastructure not yet created
