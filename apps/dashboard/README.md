# Dashboard App

## Purpose

Future owner of the protected dashboard app, including admin, member, premium, and dashboard-specific route shells after compatibility gates are complete.

## What belongs here

- Protected dashboard route documentation and future route shells.
- Dashboard-specific layout composition and access-gated page wiring.
- Dashboard app ownership notes for admin, member, premium, and shared dashboard areas.
- Future dashboard smoke-test and route/access compatibility notes.

## What does not belong here yet

- Existing `dashboard/` runtime files.
- Dashboard public hosting path changes.
- Auth redirects, role/access behavior changes, or Firebase/App Check initialization changes.
- Product-domain logic that should live under `domains/`.

## Current migration status

Phase 9A ownership documentation only; no runtime code moved here yet. Protected dashboard migration must preserve auth/access/Firebase behavior before any dashboard runtime route is copied, moved, or deleted.

## Phase 11A protected route smoke gate

Protected Dashboard runtime migration remains blocked until the Phase 11A route/access smoke testing passes. The smoke gate must cover admin, premium, member, logged-out, unauthorized, impersonation, Firebase/App Check, shared Dashboard script, and route constant behavior before any runtime route files are moved.
