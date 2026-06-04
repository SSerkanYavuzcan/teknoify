# Dashboard Routes

## Purpose

Future route ownership area for protected admin, member, premium, and dashboard utility pages.

## What belongs here

- Future route maps for admin/member/premium dashboard pages.
- Protected dashboard route compatibility documentation.
- Route smoke-test plans that prove auth redirects and role access before runtime moves.

## What does not belong here yet

- Existing `dashboard/*.html` files or nested dashboard route files.
- Route rewrites, redirects, or static hosting path changes.
- Runtime JavaScript imports for dashboard pages.

## Current migration status

Phase 9A ownership documentation only; no runtime code moved here yet. Dashboard routes remain protected in their current paths until route constants and smoke tests prove compatibility.

## Phase 11A route move gate

The Phase 11A readiness script and Dashboard route/access smoke-test document now define move gates for protected route work. Future route moves must run the readiness audit, complete manual smoke testing, preserve centralized route constants, and avoid moving admin, premium, and member runtime routes together in the first protected Dashboard move.
