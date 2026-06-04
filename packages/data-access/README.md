# Data Access Package

## Purpose

`packages/data-access` will eventually centralize read/write access for project metadata, entitlements, user profiles, and future backend, Firestore, or API data sources.

This package is documentation-only during Phase 4B. Future PRs may add repository modules here, but this PR must not create data-access JavaScript modules, update imports, or change data files.

## Current source candidates

Future extraction PRs may pull data-access responsibilities from current and planned sources, including:

- `data/projects.json`
- `data/entitlements.json`
- Firestore reads in auth, admin, and dashboard code
- Future backend/API endpoints

These sources remain stable until a dedicated data modeling or repository migration updates consumers safely.

## Future module map

The following modules describe the intended future boundaries only. Do not create these files until a dedicated runtime migration PR is approved.

- `projects-repository.js`: Read and normalize project metadata from static JSON, Firestore, or future backend/API sources behind one repository API.
- `entitlements-repository.js`: Read and normalize entitlement data while hiding whether the source is static JSON, Firestore, or a backend service.
- `users-repository.js`: Centralize user profile reads/writes and future user-related backend or Firestore access patterns.

## Data source rules

Future data-access migration PRs must preserve existing data contracts until a dedicated data modeling change explicitly approves otherwise:

- Do not change the shape of `data/projects.json` or `data/entitlements.json` during auth/config refactors.
- Treat current JSON files as early static data sources.
- Do not expose sensitive user or entitlement data in public static files as the platform grows.
- Future server-side authorization must not rely only on frontend entitlement checks.
- Repository functions should return normalized data and hide source-specific details.

## Migration sequence

Use a compatibility-first migration sequence so data consumers can move safely:

1. Read-only wrappers first.
2. Keep old JSON paths stable.
3. Add tests or manual verification.
4. Move to Firestore/backend API only in a dedicated data modeling PR.
5. Keep backward compatibility until consumers are migrated.

## Migration status

Phase 4B expands package-level documentation only. No runtime data-access files have been moved or created here yet.

## Phase 9A dashboard/corporate automation data note

Phase 9A identifies dashboard, corporate automation, project, entitlement, API, and data touchpoints as future migration candidates only. Dashboard and corporate automation data moves require data-access wrappers before source paths, JSON shapes, Firestore access patterns, or API contracts change.
