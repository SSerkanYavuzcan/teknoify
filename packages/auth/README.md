# Auth Package

## Purpose

`packages/auth` will become the single shared home for authentication, authorization helpers, Firebase client bootstrapping, App Check initialization, role access helpers, premium access helpers, session handling, redirects, and impersonation utilities.

This package is documentation-only during Phase 4B. Future PRs may add runtime modules here, but this PR must not create auth JavaScript modules, update imports, or change any runtime behavior.

## Current source candidates

Future extraction PRs may pull responsibilities from the current auth and dashboard implementation, including:

- `js/script.js`
- `js/lib/firebase.js`
- `js/lib/auth.js`
- `dashboard/shared/auth.js` if present
- `dashboard/shared/config.js` only where it touches access or configuration assumptions
- Dashboard pages that call `requireAuth` or perform role checks

These files remain in place until each consumer is migrated safely.

## Future module map

The following modules describe the intended future boundaries only. Do not create these files until a dedicated runtime migration PR is approved.

- `firebase-client.js`: Own Firebase client bootstrapping, exported Firebase app/service access, and compatibility with the current Firebase project configuration.
- `app-check.js`: Initialize and expose App Check behavior while preserving the current site key and runtime expectations.
- `roles.js`: Define role constants and pure role-check helpers for member, premium, admin, and other access decisions.
- `session.js`: Normalize current-user/session state, compatibility globals, and session lifecycle helpers.
- `require-auth.js`: Provide route guard helpers that preserve existing dashboard authentication requirements.
- `redirects.js`: Centralize login, logout, dashboard, and safe redirect helpers without changing redirect outcomes.
- `impersonation.js`: Wrap current impersonation utilities and preserve existing behavior during admin workflows.
- `premium-access.js`: Centralize premium/member entitlement helpers without changing dashboard access behavior.

## Behavior preservation rules

Future auth migration PRs must preserve existing behavior unless a separate product or security change explicitly approves otherwise:

- Do not change login redirect outcomes.
- Do not change member, premium, or admin dashboard access behavior.
- Do not change Firebase project config.
- Do not change App Check site key.
- Do not change Firestore collection names.
- Do not change impersonation behavior.
- Do not remove legacy auth code until consumers are migrated.
- Frontend role checks are not sufficient for future backend/API security.

## Migration sequence

Use a small, reversible migration sequence so behavior remains easy to review:

1. Document only.
2. Add constants.
3. Add wrappers without consumers.
4. Migrate one consumer at a time.
5. Run smoke checks after every migration.
6. Remove legacy duplication last.

## Migration status

Phase 4B expands package-level documentation only. No runtime auth files have been moved or created here yet.
