# Config Package

## Purpose

`packages/config` centralizes shared application configuration, route constants, dashboard config, project config, and environment helpers.

Phase 4C introduces `packages/config/routes.js` as a non-invasive, dependency-free route constants module. Existing runtime consumers have **not** been migrated yet, so this package now contains a future-facing module without changing current route, auth, dashboard, Firebase, or App Check behavior.

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

## Future module map

The following modules describe the intended future boundaries only. Do not create additional files until a dedicated runtime migration PR is approved.

- `app-config.js`: Own shared non-secret application-level constants and compatibility contracts used across public pages and dashboards.
- `dashboard-config.js`: Centralize dashboard defaults, dashboard app settings, and adapters for existing dashboard configuration globals.
- `project-config.js`: Normalize project-level configuration currently assembled from page globals and static data inputs.
- `routes.js`: Define route constants for public, page, dashboard, login, and redirect paths while initially mirroring existing strings exactly. Phase 4C added this module without migrating consumers.
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

Phase 4C adds the initial route constants module and supporting documentation. Runtime consumers still use their existing route strings, so public routes, dashboard routing, auth redirects, Firebase configuration, and App Check behavior are unchanged.
