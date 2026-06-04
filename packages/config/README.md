# Config Package

## Purpose

`packages/config` centralizes shared application configuration, route constants, dashboard config, project config, and environment helpers.

Phase 4C introduces `packages/config/routes.js` as a non-invasive, dependency-free route constants module. Phase 4I adds `packages/config/routes-global.js` as a browser ES module bridge for legacy plain scripts. Existing runtime consumers have **not** been migrated yet, so this package now contains future-facing modules without changing current route, auth, dashboard, Firebase, or App Check behavior.

## Current source candidates

Future extraction PRs may pull configuration responsibilities from current files and patterns, including:

- `dashboard/shared/config.js`
- `js/script.js` redirect paths
- `js/lib/auth.js` dashboard/login path helpers
- Hardcoded dashboard routes across dashboard and page scripts
- `data/projects.json` and `data/entitlements.json` only as static config/data inputs, not files to change during route constant introduction

These sources remain stable until a dedicated migration updates consumers safely.

## Current route constants

`routes.js` mirrors current public, product/service, investment, legal/account, and dashboard route strings that were discovered during Phase 4C route inventory work. It does not import Firebase/auth modules, does not initialize application state, and does not replace any existing hardcoded strings yet.

Existing public route behavior must remain unchanged. Future PRs should replace hardcoded strings gradually and verify each consumer before removing duplicate route literals.

## Legacy route global bridge

Phase 4I added `packages/config/routes-global.js` to expose centralized route constants through `window.TEKNOIFY_ROUTES` for legacy plain scripts that cannot safely use direct ES module imports yet.

The bridge imports only from `/packages/config/routes.js`, freezes a route bridge object, and defines a read-only `window.TEKNOIFY_ROUTES` property when it is not already present. Existing consumers have not been migrated to this global yet.

No HTML pages load `routes-global.js` in Phase 4I, and no script tags were changed. Future PRs may load this bridge before `/js/script.js` on pages that need legacy access to centralized route constants, then update legacy redirect code to read from the global with route-string fallbacks during the first migration.

## Future module map

The following modules describe the intended future boundaries only. Do not create additional files until a dedicated runtime migration PR is approved.

- `app-config.js`: Own shared non-secret application-level constants and compatibility contracts used across public pages and dashboards.
- `dashboard-config.js`: Centralize dashboard defaults, dashboard app settings, and adapters for existing dashboard configuration globals.
- `project-config.js`: Normalize project-level configuration currently assembled from page globals and static data inputs.
- `routes.js`: Define route constants for public, page, dashboard, login, and redirect paths while initially mirroring existing strings exactly. Phase 4C added this module without migrating consumers.
- `routes-global.js`: Expose a frozen `window.TEKNOIFY_ROUTES` compatibility bridge for legacy plain scripts. Phase 4I added this module without loading it in HTML or migrating consumers.
- `environment.js`: Provide environment detection and non-secret environment helpers without introducing new runtime assumptions.

## Route preservation rules

Future config migration PRs must preserve existing route behavior unless a dedicated route migration PR explicitly approves otherwise:

- Existing public routes must not break.
- `/`, `/pages/*`, and `/dashboard/*` should remain stable unless a dedicated route migration PR is created.
- Route constants should first mirror existing string values exactly.
- Any future redirect/wrapper should be tested manually.

## Migration sequence

Use a gradual migration sequence so configuration behavior remains observable and reversible:

1. Add route constants without changing consumers.
2. Replace hardcoded route strings gradually.
3. Add dashboard config adapter.
4. Keep `window.PROJECT_CONFIG` compatibility until all dashboard pages are migrated.
5. Remove globals only after all consumers are verified.

## Migration status

Phase 4C adds the initial route constants module and supporting documentation. Phase 4I adds the route global bridge module and bridge documentation. Runtime consumers still use their existing route strings, and no HTML page loads the bridge yet, so public routes, dashboard routing, auth redirects, Firebase configuration, and App Check behavior are unchanged.

## Phase 9A route ownership note

Phase 9A maps future Dashboard + Corporate Automation route ownership without moving routes. Future dashboard/public route moves should use centralized route constants, keep current route strings compatible, and pass route smoke tests before static hosting paths or runtime files change.

## Phase 11A Dashboard route constants note

Phase 11A requires protected Dashboard route moves to continue using centralized route constants and to preserve current admin, premium, member, and shared Dashboard route values. Route constants and redirect behavior must be verified by the Dashboard route/access smoke gate before any protected Dashboard HTML or runtime script path changes.

## Phase 11B Dashboard route compatibility note

Phase 11B requires route constants to continue representing public route URLs during Dashboard migration. Admin, premium, and member dashboard constants must keep returning `/dashboard/admin.html`, `/dashboard/premium.html`, and `/dashboard/member.html` through `getDashboardRouteForRole()` until a dedicated route-change PR updates static hosting and compatibility wrappers.
