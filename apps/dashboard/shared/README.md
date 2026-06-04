# Dashboard Shared

## Purpose

Future owner of dashboard-local shared components, configuration adapters, and helper documentation used by protected dashboard surfaces.

## What belongs here

- Dashboard-only shared UI/component ownership notes.
- Future dashboard-local config adapter documentation.
- Future dashboard helper modules after route/auth compatibility is proven.

## What does not belong here yet

- Existing `dashboard/shared/` runtime files.
- Shared auth, Firebase, App Check, or role helpers that should belong to `packages/auth` or `packages/config`.
- Public website shared components.

## Current migration status

Phase 9A ownership documentation only; no runtime code moved here yet. Shared dashboard helpers remain in their current runtime locations until protected route and access smoke tests exist.
