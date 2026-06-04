# Auth Package

## Purpose

`packages/auth` will become the single shared home for authentication, authorization helpers, Firebase client bootstrapping, App Check initialization, role access helpers, premium access helpers, session handling, redirects, and impersonation utilities.

Phase 4D adds the first future-facing role/access helper modules in a non-invasive way. Existing runtime consumers have not been migrated yet, imports remain unchanged, and current auth, redirect, dashboard access, Firebase, and App Check behavior is preserved.

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

The following modules describe the intended future boundaries. Phase 4D creates only the role/access constants and pure premium-access helpers listed below; other files remain future candidates until a dedicated runtime migration PR is approved.

- `firebase-client.js`: Own Firebase client bootstrapping, exported Firebase app/service access, and compatibility with the current Firebase project configuration.
- `app-check.js`: Initialize and expose App Check behavior while preserving the current site key and runtime expectations.
- `roles.js`: Defines role constants and pure role-check helpers for member, premium, admin, and other access decisions. Added in Phase 4D as `packages/auth/roles.js`.
- `session.js`: Normalize current-user/session state, compatibility globals, and session lifecycle helpers.
- `require-auth.js`: Provide route guard helpers that preserve existing dashboard authentication requirements.
- `redirects.js`: Centralize login, logout, dashboard, and safe redirect helpers without changing redirect outcomes.
- `impersonation.js`: Wrap current impersonation utilities and preserve existing behavior during admin workflows.
- `premium-access.js`: Centralizes premium/member access-level helpers without changing dashboard access behavior. Added in Phase 4D as `packages/auth/premium-access.js`.

## Phase 4D role/access helpers

Phase 4D introduces two browser-compatible ES modules for future migrations:

- `packages/auth/roles.js` mirrors the current role strings: `admin`, `premium`, and `member`. It also defines the current role status strings: `active`, `inactive`, and `suspended`.
- `packages/auth/premium-access.js` defines pure access-level helpers for `public`, `authenticated`, `premium`, and `admin` access checks. Admin and premium roles count as premium-level access; member and unknown roles default to member-level behavior.

These modules are dependency-free or only depend on `roles.js`, read no browser globals, perform no redirects, and do not initialize Firebase, Firestore, App Check, or dashboard code. They are intended as stable constants and pure helpers for future PRs.

Existing consumers have not been migrated yet. Future PRs should migrate one consumer at a time and verify behavior after each migration. Frontend helpers improve consistency for UX and route gating, but they do not replace server-side authorization for protected data, premium content, admin actions, or impersonation.

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

Phase 4D adds `packages/auth/roles.js` and `packages/auth/premium-access.js` as pure, side-effect-free future helpers. No existing runtime consumers have been migrated, and no auth files have been moved.

## Phase 9A dashboard preservation note

Phase 9A documents Dashboard + Corporate Automation ownership only. Protected dashboard migration must preserve existing auth, role, premium/member/admin access, redirect, impersonation, Firebase, and App Check semantics before any dashboard runtime route or page controller moves.
