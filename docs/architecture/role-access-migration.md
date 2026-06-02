# Role and Access Migration Plan

## Purpose

Phase 4D prepares role and access centralization for the domain-based architecture refactor without changing runtime behavior. It adds future-facing constants and pure helper modules under `packages/auth/` so later PRs can migrate one consumer at a time instead of continuing to duplicate role strings across dashboard, auth, admin, and premium-gate code.

This document records the current inventory, preservation rules, and recommended migration order. It is intentionally non-invasive: existing runtime files, route guards, redirects, Firebase config, App Check behavior, and data files remain unchanged.

## Current role/access inventory summary

The current codebase uses a small set of repeated role and access concepts across several areas:

- Public login and redirect logic in `js/script.js` checks Firebase custom claims and Firestore role data to route users to admin, premium, or member dashboards.
- Shared dashboard auth logic in `js/lib/auth.js` builds a session with `role.type`, `role.status`, `isAdmin`, `allowedRoles`, and impersonation handling.
- Admin UI logic in `js/pages/admin.js` edits user `role.type`, `role.status`, project active state, and project minimum-role access fields.
- Dashboard page logic in `js/pages/dashboard.js` and `dashboard/index.html` checks admin state, member dashboard fallback, and project access maps.
- Member dashboard logic in `js/pages/member.js` and inline code in `dashboard/member.html` reads user project, subscription, and role data, including admin affordances.
- Premium dashboard access currently appears in `dashboard/premium.html` through `requireAuth({ allowedRoles: ["admin", "premium"] })`.
- Premium investment content is gated in `pages/investment-retail.html` through `js/premium-content-gate.js`, which treats `admin` and `premium` as premium-capable roles.
- Impersonation UI and helper flows appear in `pages/impersonate.html`, `js/impersonate.js`, and `js/lib/auth.js`; these flows must remain admin-only.
- Sidebar/project navigation in `dashboard/shared/sidebar.js` combines admin checks with `projectAccess`, `agentAccess`, and `discoverAccess` maps.
- Static data in `data/entitlements.json` uses `projectIds` and `projectStores`; `data/projects.json` uses project IDs and `status` values such as `active`.

## Current role concepts discovered

The existing role vocabulary to preserve is:

- `admin`: administrative access and admin dashboard capability. Admin users also count as premium-capable in existing premium gates.
- `premium`: premium dashboard and premium content capability.
- `member`: default member dashboard behavior and non-premium authenticated user behavior.

The existing status vocabulary to preserve is:

- `active`: default current status used when role data is absent.
- `inactive`: future-safe status value included for centralization.
- `suspended`: admin UI status option currently used for user records.

The existing role shapes to preserve are:

- String roles such as `"admin"`, `"premium"`, and `"member"`.
- Object roles such as `{ type: "member", status: "active" }`.
- Firestore profile/session data that exposes `role.type` and `role.status`.
- Firebase custom claims such as `admin` and `premium`, which remain outside the new pure helper modules until a dedicated auth migration.

## Future constants/helpers added in Phase 4D

Phase 4D adds these browser-compatible ES modules for future use:

- `packages/auth/roles.js`
    - `ROLE_TYPES`
    - `ROLE_STATUSES`
    - `DEFAULT_ROLE_TYPE`
    - `DEFAULT_ROLE_STATUS`
    - `DASHBOARD_ACCESS_ROLES`
    - `normalizeRoleType(roleType)`
    - `getRoleTypeFromRole(role)`
    - `isAdminRole(role)`
    - `isPremiumRole(role)`
    - `isMemberRole(role)`
    - `isRoleAllowed(role, allowedRoles)`
- `packages/auth/premium-access.js`
    - `ACCESS_LEVELS`
    - `DEFAULT_ACCESS_LEVEL`
    - `normalizeAccessLevel(accessLevel)`
    - `hasPremiumAccess(role)`
    - `hasAuthenticatedAccess(role)`
    - `requiresPremiumAccess(requiredAccessLevel)`
    - `hasAccessLevel(role, requiredAccessLevel)`

These helpers are pure and side-effect free. They do not read `window`, `document`, `localStorage`, or `sessionStorage`; they do not initialize Firebase, Firestore, App Check, or dashboard modules; and they do not redirect.

## Behavior preservation rules

Future migrations must preserve existing behavior unless a separate product or security change explicitly approves otherwise:

- Do not change existing role string values.
- Do not change dashboard redirect destinations while replacing role checks.
- Do not change `requireAuth` semantics and `allowedRoles` behavior in the same PR that introduces helper imports.
- Do not change Firebase config, App Check setup, or Firestore collection names.
- Do not change admin, premium, or member dashboard access behavior.
- Do not change impersonation behavior or expose impersonation to non-admin users.
- Do not change public routes, package scripts, data files, file names, or file locations as part of role/access helper adoption.
- Migrate one consumer at a time and run manual smoke tests after each consumer migration.

## Role/defaulting rules

The central role helpers intentionally default unknown, missing, or unsupported role input to member-level behavior:

- `"admin"` remains `admin`.
- `"premium"` remains `premium`.
- `"member"`, unknown strings, missing values, and unsupported object shapes normalize to `member`.
- Role objects use `role.type` for type normalization.
- `DEFAULT_ROLE_TYPE` is `member`.
- `DEFAULT_ROLE_STATUS` is `active`.

This mirrors the defensive shape already present in current code, where missing role documents generally fall back to `{ type: "member", status: "active" }` or member dashboard behavior.

## Access level rules

The future access-level vocabulary is:

- `public`: no premium requirement.
- `authenticated`: member, premium, and admin role levels count as authenticated role levels.
- `premium`: premium and admin count as premium-capable.
- `admin`: admin only.

Unknown access levels normalize to `public` so future helper usage does not invent stricter behavior by accident. Future route guards can choose stricter handling in a dedicated migration if product/security requirements change.

## Premium/admin/member behavior expectations

- Admin users should retain admin dashboard access and count as premium-capable for premium content gates.
- Premium users should retain premium dashboard and premium content access, but should not gain admin-only behavior.
- Member users should retain authenticated member dashboard behavior and should not gain premium-only or admin-only behavior.
- Unknown role values should behave like member role values.
- Frontend checks are UX and route-gating helpers only; server-side authorization must protect future sensitive data, premium content, admin actions, and impersonation APIs.

## Impersonation safety notes

Impersonation currently depends on admin-only checks and local impersonation state. Future migrations must keep these safety expectations intact:

- Only real admin sessions may initiate impersonation.
- Effective impersonated sessions should not keep admin capabilities unless explicitly preserved for a narrow admin-only control.
- Logout and failed target lookup should continue clearing impersonation state.
- Impersonation helpers should not be introduced into public pages before admin checks are centralized and reviewed.
- Frontend impersonation UI must never be the only authorization boundary for backend or Firestore access.

## Entitlement/project access notes

Role constants do not replace entitlement or project-access modeling. Current data and dashboard code include related but separate concepts:

- `data/entitlements.json` maps users to `projectIds` and optional `projectStores`.
- `data/projects.json` defines project IDs, demos, and `status` values such as `active`.
- Dashboard and sidebar code also use Firestore-style `projectAccess`, `agentAccess`, and `discoverAccess` maps.
- Admin project editing includes an `access.minimumRole` field.

Future entitlement work should happen in a later data-access PR, likely under `packages/data-access/`, after role helper migration stabilizes. Do not conflate premium role checks with project ownership, store scoping, agent access, or discover access.

## Future consumer migration order

1. Add constants/helpers only — this PR.
2. Replace role string checks in `js/lib/auth.js` carefully.
3. Replace dashboard redirect role checks only after route constants are stable.
4. Replace premium gate checks in investment pages.
5. Replace admin page checks.
6. Add project entitlement helper wrappers in a later data-access PR.
7. Add manual smoke tests after each consumer migration.
8. Remove duplicated role string logic only after all consumers are migrated.
9. Update `docs/architecture/README.md` after the migration documentation changes.
