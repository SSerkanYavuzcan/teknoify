# Auth and Configuration Centralization Plan

## 1. Title and purpose

This document is the **Phase 4A** design plan for centralizing Teknoify authentication, Firebase setup, App Check setup, role access, dashboard configuration, route constants, entitlement helpers, and shared app configuration.

Phase 4A is intentionally **design-only**. It documents the desired future architecture and migration sequence before any runtime JavaScript, HTML, data, or Firebase behavior is moved or refactored. This PR must not create active runtime modules, change imports, change routes, change Firebase configuration, alter App Check behavior, or modify dashboard access control.

The purpose of this plan is to give future PRs a safe, reviewable path from the current mixed legacy/global and modular implementation toward clearer package boundaries under `packages/`, `apps/web/`, and `apps/dashboard/`.

## 2. Current state summary

Teknoify currently has auth and configuration responsibilities spread across public-site scripts, dashboard shared scripts, Firebase helpers, per-page globals, and early static data sources. The current implementation works and must be preserved during migration, but the ownership boundaries are not yet centralized.

### `js/script.js`

`js/script.js` appears to act as a broad public-site runtime orchestrator. It currently includes or coordinates several unrelated responsibilities:

- legacy/global Firebase configuration and initialization through the browser `firebase` global;
- App Check initialization and local debug-token behavior;
- Auth modal behavior, login form handling, modal open/close state, and trigger binding;
- post-login redirect handling based on current user, custom claims, and Firestore fallback role checks;
- general UI orchestration, contact form behavior, effects, and page interactions.

This file is a high-risk extraction source because auth behavior is mixed with general UI behavior and because its login redirect outcomes are user-visible.

### `js/lib/firebase.js`

`js/lib/firebase.js` contains modular Firebase client exports. It is the likely current source for Firebase app, Auth, Firestore, Storage, Analytics, and related modular SDK wiring used by newer scripts.

This file is an important source candidate for a future `packages/auth/firebase-client.js`, but Phase 4A does not change it.

### `js/lib/auth.js`

`js/lib/auth.js` contains central-ish auth behavior already, including `requireAuth`, App Check initialization, session and role logic, impersonation support, and redirects. It is likely the strongest current source candidate for future package-level auth modules such as session, require-auth, redirects, impersonation, premium access, and App Check helpers.

Because this file already guards routes and controls redirects, future migrations must be incremental and behavior-preserving.

### `dashboard/shared/config.js`

`dashboard/shared/config.js` creates `window.PROJECT_CONFIG` from per-page globals such as `window.TK_PROJECT_ID` and `window.TK_SERVICE`. This keeps current dashboard project pages flexible, but it also means project-level configuration is assembled from page-local global variables rather than from a centralized typed or documented config API.

This file is a likely source candidate for future `packages/config/dashboard-config.js` and `packages/config/project-config.js` work.

### `dashboard/shared/auth.js`

`dashboard/shared/auth.js` is present and should be reviewed before future runtime changes. It may contain dashboard-specific access checks, session assumptions, route protection, logout behavior, or integration points with `window.USER_SESSION`. Any behavior here should be treated as part of the dashboard access contract until verified by tests or smoke checks.

### `dashboard/shared/sidebar.js`

`dashboard/shared/sidebar.js` is relevant because visible navigation can reflect user access, project access, agent access, admin state, or entitlement state. Sidebar behavior is user-visible and can expose or hide routes. Future access centralization must preserve sidebar visibility, active states, and route links while moving only one responsibility at a time.

### `data/projects.json`

`data/projects.json` is an early static project data source. It may describe project metadata that future dashboard config or data-access modules can read through a repository-style boundary, but this phase does not change the file or its consumers.

### `data/entitlements.json`

`data/entitlements.json` is an early static entitlement data source. It may inform future premium access, role mapping, or project entitlement helpers, but this phase does not change the file or its consumers.

## 3. Problems to solve

Future auth/config centralization should solve these problems without changing current behavior prematurely:

- **Firebase config and App Check logic appear in more than one place.** Future code should have one documented initialization path and one clear owner for App Check activation.
- **Legacy global Firebase usage and modular Firebase usage coexist.** Current code uses both the browser `firebase` global and modular Firebase imports/exports. Future migrations should converge gradually on modular usage without breaking existing pages.
- **Auth modal behavior is mixed with general UI behavior in `js/script.js`.** Login modal code should eventually live near public-web auth features, while non-auth UI effects remain separate.
- **Dashboard authorization and redirects need a single source of truth.** Access decisions should be centralized so admin, member, premium, unauthorized, and post-login redirect behavior stays consistent.
- **Role names and entitlement rules need central definitions.** Role strings, custom-claim names, Firestore fallback fields, premium rules, and entitlement mappings should not be redefined across files.
- **Project-level config is based on per-page globals.** `window.TK_PROJECT_ID`, `window.TK_SERVICE`, and `window.PROJECT_CONFIG` should be documented and eventually wrapped by a safer dashboard/project config module.
- **Moving auth too aggressively could break existing dashboard routes.** Dashboard pages depend on route guards, sidebar behavior, project config, and redirects. Future PRs must protect route behavior before extraction.
- **Current runtime behavior must be preserved during migration.** Centralization is valuable only if users see the same login, logout, redirect, access, impersonation, project, and premium behavior until a separate product decision changes it.

## 4. Target module structure

The following target structure describes the future ownership model only. **Do not create these runtime JavaScript modules in Phase 4A.** Package README files and non-runtime placeholders can be added in a later Phase 4B PR.

```text
packages/auth/
├── README.md
├── firebase-client.js
├── app-check.js
├── roles.js
├── session.js
├── require-auth.js
├── redirects.js
├── impersonation.js
└── premium-access.js

packages/config/
├── README.md
├── app-config.js
├── dashboard-config.js
├── project-config.js
├── routes.js
└── environment.js

packages/data-access/
├── README.md
├── projects-repository.js
├── entitlements-repository.js
└── users-repository.js

apps/web/features/auth/
├── login-modal.js
└── post-login-redirect.js

apps/dashboard/shared/
├── dashboard-boot.js
├── sidebar.js
└── access-guard.js
```

### Target ownership intent

- `packages/auth/` should own reusable authentication, authorization, role, session, Firebase auth integration, App Check integration, impersonation, redirect, and premium access helpers.
- `packages/config/` should own non-secret shared app configuration, route constants, dashboard config adapters, project config adapters, and environment helpers.
- `packages/data-access/` should own repository-style access to projects, entitlements, users, and future backend or Firestore-backed data sources.
- `apps/web/features/auth/` should own public-site login UI behavior and post-login public-web integration.
- `apps/dashboard/shared/` should own dashboard bootstrapping, dashboard-specific sidebar rendering, and dashboard route guards after shared primitives are stable.

## 5. Responsibility matrix

| Future Module                                     | Responsibility                                                                                                                         | Current Source Candidates                                                                              | Migration Risk | Notes                                                                                           |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------- | ----------------------------------------------------------------------------------------------- |
| `packages/auth/README.md`                         | Document auth package ownership, public API expectations, migration rules, and behavior-preservation requirements.                     | `docs/architecture/folder-structure.md`, this plan, `js/lib/auth.js`                                   | Low            | Phase 4B can add this as documentation only.                                                    |
| `packages/auth/firebase-client.js`                | Central Firebase client access for auth-related modules using modular SDK patterns.                                                    | `js/lib/firebase.js`, `js/script.js`                                                                   | High           | Must not change Firebase project config or SDK initialization order until consumers are mapped. |
| `packages/auth/app-check.js`                      | Single owner for App Check activation, site key usage, token auto-refresh, and local debug behavior.                                   | `js/script.js`, `js/lib/auth.js`                                                                       | High           | App Check should initialize once and keep the existing site key and debug behavior.             |
| `packages/auth/roles.js`                          | Central role names, custom-claim names, role normalization, admin/member/premium constants, and helper predicates.                     | `js/script.js`, `js/lib/auth.js`, `dashboard/shared/auth.js`, `data/entitlements.json`                 | Medium         | Start with constants and pure helpers before changing route guards.                             |
| `packages/auth/session.js`                        | User session normalization, current-user state, custom claims, Firestore fallback shape, and `window.USER_SESSION` compatibility plan. | `js/lib/auth.js`, `dashboard/shared/auth.js`, `dashboard/shared/sidebar.js`                            | High           | Session shape affects dashboard boot, sidebar, redirects, and impersonation.                    |
| `packages/auth/require-auth.js`                   | Shared route protection and authorization entry point for protected pages.                                                             | `js/lib/auth.js`, `dashboard/shared/auth.js`, protected HTML scripts                                   | High           | Extract only after route constants and role helpers are stable.                                 |
| `packages/auth/redirects.js`                      | Login, post-login, unauthorized, dashboard default, admin, member, premium, and safe redirect helpers.                                 | `js/script.js`, `js/lib/auth.js`, `pages/login.html`, `js/pages/login.js`                              | High           | Login redirect outcomes must not change.                                                        |
| `packages/auth/impersonation.js`                  | Admin-only impersonation checks, session handling, entry/exit behavior, and route integration.                                         | `js/lib/auth.js`, `js/impersonate.js`, `pages/impersonate.html`                                        | High           | Impersonation must remain admin-only and backward compatible.                                   |
| `packages/auth/premium-access.js`                 | Premium access predicates, entitlement checks, investment gate helpers, and feature access decisions.                                  | `js/lib/auth.js`, `js/premium-content-gate.js`, `js/investment-analytics.js`, `data/entitlements.json` | High           | Must preserve current premium page and investment gate behavior.                                |
| `packages/config/README.md`                       | Document config package ownership, non-secret config rules, and migration boundaries.                                                  | `docs/architecture/folder-structure.md`, this plan                                                     | Low            | Phase 4B can add this as documentation only.                                                    |
| `packages/config/app-config.js`                   | Shared app-level non-secret constants and Firebase-independent app settings.                                                           | `js/script.js`, `js/lib/firebase.js`, page globals                                                     | Medium         | Avoid mixing public config with secrets; no behavior change during extraction.                  |
| `packages/config/dashboard-config.js`             | Dashboard-wide config defaults, dashboard app settings, and dashboard boot configuration.                                              | `dashboard/shared/config.js`, dashboard HTML globals                                                   | Medium         | Must preserve `window.PROJECT_CONFIG` compatibility during migration.                           |
| `packages/config/project-config.js`               | Project page config adapter for project IDs, services, titles, API base paths, and per-project metadata.                               | `dashboard/shared/config.js`, `dashboard/*/config.js`, `data/projects.json`                            | Medium         | Should wrap per-page globals before replacing them.                                             |
| `packages/config/routes.js`                       | Central route constants for public, login, dashboard, admin, premium, unauthorized, subscription, investment, and impersonation pages. | `js/script.js`, `js/lib/auth.js`, HTML links, `dashboard/shared/sidebar.js`                            | Medium         | Phase 4C should extract constants without changing URLs.                                        |
| `packages/config/environment.js`                  | Environment detection for localhost/debug behavior, production flags, and hosting assumptions.                                         | `js/script.js`, `js/lib/auth.js`, dashboard scripts                                                    | Medium         | Local App Check debug behavior is sensitive and must be preserved.                              |
| `packages/data-access/README.md`                  | Document data-access package ownership and repository boundaries.                                                                      | `data/README.md`, `data/projects/README.md`, `data/entitlements/README.md`, this plan                  | Low            | Phase 4B can add this as documentation only.                                                    |
| `packages/data-access/projects-repository.js`     | Future project metadata access from static JSON, Firestore, or backend service through one adapter.                                    | `data/projects.json`, `dashboard/shared/sidebar.js`, `dashboard/shared/config.js`                      | Medium         | Do not change `data/projects.json` in auth refactor PRs.                                        |
| `packages/data-access/entitlements-repository.js` | Future entitlement access from static JSON, Firestore, or backend service through one adapter.                                         | `data/entitlements.json`, `js/premium-content-gate.js`, `js/investment-analytics.js`                   | Medium         | Entitlement semantics should be documented before data shape changes.                           |
| `packages/data-access/users-repository.js`        | User profile, role fallback, project access, agent access, and Firestore `users` collection reads.                                     | `js/script.js`, `js/lib/auth.js`, `dashboard/shared/sidebar.js`                                        | High           | Firestore collection names and field compatibility must be preserved.                           |
| `apps/web/features/auth/login-modal.js`           | Public-site login modal UI, form submission behavior, modal triggers, close behavior, and body scroll handling.                        | `js/script.js`, `pages/login.html`, `js/pages/login.js`                                                | High           | Extract only after redirects and Firebase access are stable.                                    |
| `apps/web/features/auth/post-login-redirect.js`   | Public-web integration for consuming and applying stored post-login redirects.                                                         | `js/script.js`, `js/lib/auth.js`, `pages/login.html`                                                   | High           | Must preserve safe redirect behavior and storage key handling.                                  |
| `apps/dashboard/shared/dashboard-boot.js`         | Dashboard startup sequence, session loading, config loading, guard execution, and shared initialization order.                         | `dashboard/shared/auth.js`, `dashboard/shared/config.js`, dashboard HTML pages                         | High           | Boot order is route-sensitive and should migrate one dashboard page at a time.                  |
| `apps/dashboard/shared/sidebar.js`                | Dashboard-specific sidebar rendering, active link state, navigation visibility, and project/agent/discover sections.                   | `dashboard/shared/sidebar.js`                                                                          | High           | Visible navigation must match existing access behavior.                                         |
| `apps/dashboard/shared/access-guard.js`           | Dashboard route guard wrapper using package auth/config primitives.                                                                    | `js/lib/auth.js`, `dashboard/shared/auth.js`, dashboard protected pages                                | High           | Should be introduced gradually with before/after route smoke tests.                             |

## 6. Migration strategy

Future work should proceed in small PRs that preserve behavior and make only one category of runtime change at a time.

### Phase 4A: design doc only

- Add this technical design document.
- Optionally link it from `docs/architecture/README.md`.
- Do not add runtime modules.
- Do not change imports, Firebase config, App Check behavior, auth redirects, dashboard guards, data files, package scripts, or public routes.

### Phase 4B: create package README files and non-runtime placeholders only

- Add README files for `packages/auth/`, `packages/config/`, and `packages/data-access/` if they do not already exist or need updates.
- Keep placeholders documentation-only.
- Do not export runtime JavaScript yet.

### Phase 4C: extract route constants without behavior changes

- Create route constants in a non-invasive way.
- Keep route string values identical to current URLs.
- Update no consumers at first, or update a very small, low-risk consumer with exact before/after checks.
- Preserve public route availability and dashboard URL compatibility.
- Phase 4C introduces `packages/config/routes.js` without migrating existing consumers yet.

### Phase 4D: extract role constants and access helpers without behavior changes

- Define role constants and pure helper predicates for admin, member, premium, and entitlement checks.
- Keep existing custom claim names, Firestore fallback fields, and role-string semantics.
- Add helpers alongside current code before replacing existing logic.

### Phase 4E: centralize Firebase modular client usage

- Identify all global Firebase and modular Firebase consumers.
- Prefer modular client exports for new code.
- Migrate consumers gradually while preserving initialization order and Firebase config values.
- Keep legacy global Firebase code until all consumers are verified.

### Phase 4F: centralize App Check initialization

- Move App Check activation behind one initialization owner only after duplicate initialization paths are mapped.
- Preserve the existing App Check site key, auto-refresh behavior, and localhost/debug behavior.
- Verify public pages and protected dashboard pages before removing duplicate setup.

### Phase 4G: split login modal behavior from `js/script.js`

- Extract login modal UI behavior after route constants, redirect helpers, and Firebase access are stable.
- Keep modal triggers, form handling, close behavior, body scroll behavior, and error display unchanged.
- Verify `/`, `/pages/login.html`, and dashboard redirects before and after extraction.

### Phase 4H: migrate dashboard access guard gradually

- Introduce a dashboard access guard wrapper that delegates to stable auth/session/role helpers.
- Migrate one dashboard route or route family at a time.
- Preserve `window.USER_SESSION`, sidebar assumptions, project access, admin access, premium access, and unauthorized redirects.

### Phase 4I: add smoke tests/manual route checklist

- Add a documented manual route checklist and, where feasible, lightweight automated checks.
- Cover anonymous, member, premium, admin, unauthorized, redirect, and sidebar behavior.
- Require before/after verification for every future auth/config runtime migration PR.

### Phase 4J: remove legacy duplication only after all pages are verified

- Remove duplicate Firebase, App Check, role, redirect, or access logic only after all known consumers have migrated.
- Confirm every route in the route and access checklist.
- Keep removals in focused PRs with clear rollback paths.

## 7. Behavior preservation rules

Future auth/config PRs must follow these rules unless the PR is explicitly approved as a behavior-changing product/security change:

- Do not change login redirect outcomes.
- Do not change admin, member, or premium dashboard access behavior.
- Do not change impersonation behavior.
- Do not change Firebase project config.
- Do not change App Check site key.
- Do not change Firestore collection names.
- Do not change public routes.
- Do not change `data/projects.json` or `data/entitlements.json` in auth refactor PRs unless the PR is specifically about data modeling.
- Do not remove legacy code until all consumers are migrated.
- Do not change post-login redirect storage keys or safe-redirect validation without a dedicated migration note.
- Do not change sidebar visibility or navigation links as a side effect of auth extraction.
- Do not change unauthorized route destinations without a dedicated route/access decision.

## 8. Route and access checklist

Every future auth/config runtime PR should manually smoke-test the following routes before and after the change. If a route is absent in a deployment environment, record that explicitly instead of silently skipping it.

For each route, verify:

- anonymous behavior;
- logged-in member behavior;
- premium behavior;
- admin behavior;
- unauthorized access behavior;
- redirect behavior; and
- visible navigation/sidebar behavior.

### Required public and account routes

- [ ] `/`
- [ ] `/pages/login.html` if present
- [ ] `/pages/subscription.html`
- [ ] `/pages/impersonate.html` if present

### Required dashboard routes

- [ ] `/dashboard/index.html`
- [ ] `/dashboard/member.html`
- [ ] `/dashboard/premium.html`
- [ ] `/dashboard/admin.html`

### Required investment and premium-gated routes

- [ ] `/pages/investment-analytics.html`
- [ ] `/pages/investment-retail.html`

### Dashboard project pages discovered in this repository

- [ ] `/dashboard/agents/product-discover/index.html`
- [ ] `/dashboard/analysis.html`
- [ ] `/dashboard/bim-istekleri/index.html`
- [ ] `/dashboard/demo/market-analysis/index.html`
- [ ] `/dashboard/geo-intelligence/index.html`
- [ ] `/dashboard/market-analysis-demo.html`
- [ ] `/dashboard/market-analysis.html`
- [ ] `/dashboard/member/finance/index.html`
- [ ] `/dashboard/member/health/index.html`
- [ ] `/dashboard/member/productivity/index.html`
- [ ] `/dashboard/member/subscriptions/index.html`
- [ ] `/dashboard/web-scraping/clothes/index.html`
- [ ] `/dashboard/web-scraping/food/index.html`
- [ ] `/dashboard/web-scraping/quickcommerce/index.html`

### Per-route verification notes to capture

For each route above, future migration PRs should record:

- whether anonymous users can view the route, see a login prompt, or get redirected;
- where logged-in member users land and which navigation items are visible;
- whether premium users can access premium-only content and premium dashboard routes;
- whether admin users can access admin routes and admin-only navigation;
- what happens when a user without permission opens a protected route directly;
- whether post-login redirects return the user to the intended route when applicable;
- whether sidebar active states, project links, agent links, discover links, and logout controls match the current behavior; and
- whether console errors, Firebase initialization errors, or App Check errors appear.

## 9. Data and entitlement considerations

`data/projects.json` and `data/entitlements.json` are early static data sources. They provide useful structure for project and entitlement concepts, but they should not become hidden coupling points during auth/config centralization.

Future work may move access to these files behind `packages/data-access/projects-repository.js` and `packages/data-access/entitlements-repository.js`, or may replace static JSON access with Firestore or backend API access. That decision should happen in a dedicated data modeling or backend integration PR.

For Phase 4A and future auth-only refactor PRs:

- do not change `data/projects.json`;
- do not change `data/entitlements.json`;
- do not reinterpret entitlement names or project IDs;
- document any runtime dependency on static data before replacing it; and
- preserve compatibility with current dashboard and premium-gate behavior.

## 10. Security considerations

- The Firebase API key is not a server secret, but Firebase configuration should still be centralized to prevent drift, accidental project changes, or inconsistent initialization.
- App Check initialization should happen once. Duplicate initialization can create hard-to-debug page behavior and should be removed only after all consumers are mapped.
- Frontend role checks are useful for UX and route gating, but they should not be treated as the only real security boundary.
- Backend/API endpoints must enforce authorization separately in future work, especially for user, project, subscription, premium, admin, and impersonation capabilities.
- Impersonation must remain admin-only. Future code should make admin verification explicit and should avoid exposing impersonation controls or flows to non-admin users.
- Avoid leaking sensitive user, project, entitlement, or operational data into public static files as the platform grows.
- Firestore collection names and field shapes should be treated as compatibility contracts until a dedicated data/API migration updates them.
- Safe redirect validation should continue rejecting untrusted redirect targets.

## 11. Open questions

- Will auth remain Firebase-only, or will Teknoify add a backend session service later?
- Will entitlements move from static JSON to Firestore or a backend API?
- Should the admin dashboard become a separate app under `apps/admin/`?
- Which routes should stay public, and which should become protected?
- What is the production hosting model for public pages, dashboard pages, APIs, and future apps?
- How should premium access be validated server-side later?
- Should project access, agent access, and discover access share one entitlement model?
- Should `window.USER_SESSION` remain a compatibility bridge, or should it be replaced by an explicit session module API?
- How should App Check behavior differ between local development, preview deployments, and production?

## 12. Proposed next PRs

After this design PR, suggested follow-up PRs are:

Phase 4B expands the package README files for `packages/auth`, `packages/config`, and `packages/data-access` before any runtime modules are created. This documentation step clarifies module boundaries before future auth, config, or data-access code is moved.

Phase 4D introduces role/access constants and pure helper modules in `packages/auth` without migrating existing consumers yet.

1. Add package-level README files for `packages/auth`, `packages/config`, and `packages/data-access`.
2. Add route constants in a non-invasive way with no URL changes.
3. Add role constants and pure access helpers in a non-invasive way.
4. Add a manual smoke test checklist that future auth/config PRs can copy into PR descriptions.
5. Extract login modal behavior only after route, role, redirect, and Firebase access constants are stable.
6. Plan one dashboard access-guard migration PR for a single route family before migrating all dashboard pages.

## 13. Relationship to existing architecture docs

This plan should be read with the existing architecture and decision documents:

- [Current repository inventory](current-inventory.md)
- [Target folder structure](folder-structure.md)
- [ADR-0001: Adopt a Domain-Based Repository Structure](../decisions/ADR-0001-domain-based-structure.md)

The inventory explains where the repository stands today. The folder-structure document defines the target domain-based ownership model. ADR-0001 records the accepted decision to move toward that model. This Phase 4A plan narrows the next step to auth/config centralization and makes clear that runtime behavior is not changing in this PR.
