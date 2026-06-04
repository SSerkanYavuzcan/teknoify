# Dashboard Route/Access Smoke Test Plan

## 1. Title and purpose

Phase 11A defines the manual smoke-test gate for protected Dashboard routes before any protected Dashboard runtime files are moved. This document records the current route inventory, access expectations, preservation requirements, and decision gates needed before a later PR relocates or rewires Dashboard runtime files.

This is a non-runtime planning artifact. It does not move Dashboard files, change route paths, change auth behavior, change Firebase/App Check initialization, or change public pages.

## Phase 14A enterprise readiness note

Phase 14A makes dashboard route readiness part of the enterprise readiness checker, but this document's manual route/access smoke remains required before protected dashboard runtime moves.

## 2. Scope

In scope for Phase 11A review:

- Current Dashboard protected routes and Dashboard HTML files under `dashboard/`.
- Admin Dashboard route: `/dashboard/admin.html`.
- Premium Dashboard route: `/dashboard/premium.html`.
- Member Dashboard route: `/dashboard/member.html` and member subroutes.
- Auth login/logout behavior, including logged-out redirects and logout destination.
- Role-based access behavior for admin, premium, member, unknown/defaulted roles, inactive roles, and suspended roles where currently supported.
- Unauthorized redirect behavior when `allowedRoles` rejects a role.
- Impersonation behavior where present in Dashboard auth/sidebar/admin flows.
- Firebase/App Check initialization assumptions from existing auth modules.
- Shared Dashboard JavaScript behavior, including legacy `dashboard/shared/*` scripts and module Dashboard page controllers.

Out of scope for Phase 11A:

- Moving Dashboard files.
- Changing Dashboard routes.
- Changing auth redirects.
- Changing Firebase config.
- Changing App Check behavior.
- Changing role/access helpers.
- Changing public pages.
- Changing API behavior.

## 3. Current protected route inventory

| Route / File                                                                                           | Role Expectation                                                                                                                                   | Current Entry / Script                                                                                    | Protected?                                                 | Existing Owner                      | Future Owner                       | Smoke Priority | Notes                                                                                        |
| ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------- | ---------------------------------- | -------------- | -------------------------------------------------------------------------------------------- |
| `/dashboard/admin.html` / `dashboard/admin.html`                                                       | admin; needs-review because `js/pages/admin.js` currently calls `requireAuth()` and then blocks non-admins in-page instead of using `allowedRoles` | `../js/pages/admin.js`                                                                                    | Yes, auth required; admin enforcement needs manual review  | `dashboard/` + `js/pages/admin.js`  | `apps/dashboard/routes/` candidate | Critical       | Admin exposure risk is the highest-priority smoke case.                                      |
| `/dashboard/premium.html` / `dashboard/premium.html`                                                   | admin or premium                                                                                                                                   | Inline module imports `../js/lib/auth.js` and calls `requireAuth({ allowedRoles: ["admin", "premium"] })` | Yes                                                        | `dashboard/`                        | `apps/dashboard/routes/` candidate | Critical       | Unauthorized roles currently redirect through `getDashboardRouteForRole`.                    |
| `/dashboard/member.html` / `dashboard/member.html`                                                     | authenticated member/premium/admin; exact card entitlement behavior needs-review                                                                   | `/js/pages/member.js?v=999`, `/dashboard/shared/sidebar.js`, `/dashboard/shared/profile-manager.js`       | Yes                                                        | `dashboard/` + `js/pages/member.js` | `apps/dashboard/routes/` candidate | Critical       | `js/pages/member.js` calls `requireAuth()` with default allowed roles.                       |
| `/dashboard/index.html` / `dashboard/index.html`                                                       | authenticated user routing gateway; admin routes to admin, others route to member                                                                  | Inline module imports `/js/lib/auth.js`                                                                   | Yes                                                        | `dashboard/`                        | `apps/dashboard/routes/` candidate | High           | Current fallback in catch block points to `/login.html`; preserve until separately reviewed. |
| `/dashboard/analysis.html` / `dashboard/analysis.html`                                                 | needs-review                                                                                                                                       | Inline/classic scripts in the HTML file                                                                   | needs-review                                               | `dashboard/`                        | `apps/dashboard/routes/` candidate | Medium         | Dashboard HTML discovered; role guard was not confirmed by the readiness scan.               |
| `/dashboard/market-analysis.html` / `dashboard/market-analysis.html`                                   | needs-review                                                                                                                                       | `../js/session-manager.js` plus inline script                                                             | needs-review                                               | `dashboard/`                        | `apps/dashboard/routes/` candidate | Medium         | Uses legacy Firebase compat scripts and session manager; preserve behavior.                  |
| `/dashboard/market-analysis-demo.html` / `dashboard/market-analysis-demo.html`                         | needs-review / premium demo                                                                                                                        | `config.js`, `../shared/auth.js?v=20260228`                                                               | needs-review                                               | `dashboard/`                        | `apps/dashboard/routes/` candidate | Medium         | Shared auth path is legacy relative script usage.                                            |
| `/dashboard/geo-intelligence/index.html` / `dashboard/geo-intelligence/index.html`                     | authenticated; exact role needs-review                                                                                                             | Inline module imports `../../js/lib/auth.js` and calls `requireAuth()`                                    | Yes                                                        | `dashboard/`                        | `apps/dashboard/routes/` candidate | High           | Route is guarded but role specificity requires manual testing.                               |
| `/dashboard/agents/product-discover/index.html` / `dashboard/agents/product-discover/index.html`       | admin; needs-review                                                                                                                                | `product-discover.js`                                                                                     | Yes, based on script inspection; needs manual confirmation | `dashboard/agents/`                 | `apps/dashboard/routes/` candidate | High           | Script references admin/member logic and redirects non-admins to member.                     |
| `/dashboard/bim-istekleri/index.html` / `dashboard/bim-istekleri/index.html`                           | needs-review                                                                                                                                       | `config.js` plus inline/static page behavior                                                              | needs-review                                               | `dashboard/bim-istekleri/`          | `apps/dashboard/routes/` candidate | Medium         | Corporate automation route discovered; backend/API behavior is out of scope.                 |
| `/dashboard/demo/market-analysis/index.html` / `dashboard/demo/market-analysis/index.html`             | demo/member navigation; needs-review                                                                                                               | Inline/static page behavior                                                                               | needs-review                                               | `dashboard/demo/`                   | `apps/dashboard/routes/` candidate | Low            | Demo page links back to member Dashboard.                                                    |
| `/dashboard/web-scraping/quickcommerce/index.html` / `dashboard/web-scraping/quickcommerce/index.html` | needs-review                                                                                                                                       | `config.js?v=20260502`, `/dashboard/shared/sidebar.js`, inline module                                     | needs-review                                               | `dashboard/web-scraping/`           | `apps/dashboard/routes/` candidate | Medium         | Static hosting and shared-sidebar path should be smoke-tested before moves.                  |
| `/dashboard/web-scraping/clothes/index.html` / `dashboard/web-scraping/clothes/index.html`             | needs-review                                                                                                                                       | `config.js`, `../shared/engine.js?v=20260221`, `../shared/auth.js?v=20260221`                             | needs-review                                               | `dashboard/web-scraping/`           | `apps/dashboard/routes/` candidate | Medium         | References a legacy shared engine path that must not drift during route moves.               |
| `/dashboard/web-scraping/food/index.html` / `dashboard/web-scraping/food/index.html`                   | needs-review                                                                                                                                       | `config.js`, `../shared/engine.js?v=20260221`, `../shared/auth.js?v=20260221`                             | needs-review                                               | `dashboard/web-scraping/`           | `apps/dashboard/routes/` candidate | Medium         | Same compatibility risk as clothes scraping route.                                           |
| `/dashboard/member/finance/index.html` / `dashboard/member/finance/index.html`                         | member; needs-review for premium/admin entitlement behavior                                                                                        | `/js/finance.js`, `/dashboard/shared/sidebar.js`                                                          | needs-review                                               | `dashboard/member/`                 | `apps/dashboard/routes/` candidate | Medium         | Member subroute discovered; guard behavior should be confirmed manually.                     |
| `/dashboard/member/health/index.html` / `dashboard/member/health/index.html`                           | member; needs-review                                                                                                                               | `../../shared/auth.js?v=999`, `../../shared/sidebar.js?v=999`                                             | needs-review                                               | `dashboard/member/`                 | `apps/dashboard/routes/` candidate | Medium         | Legacy shared auth path must be preserved.                                                   |
| `/dashboard/member/productivity/index.html` / `dashboard/member/productivity/index.html`               | member; needs-review                                                                                                                               | `../../shared/auth.js?v=999`, `../../shared/sidebar.js?v=999`                                             | needs-review                                               | `dashboard/member/`                 | `apps/dashboard/routes/` candidate | Medium         | Legacy shared auth path must be preserved.                                                   |
| `/dashboard/member/subscriptions/index.html` / `dashboard/member/subscriptions/index.html`             | member; needs-review                                                                                                                               | `../../shared/auth.js?v=999`, `../../shared/sidebar.js?v=999`                                             | needs-review                                               | `dashboard/member/`                 | `apps/dashboard/routes/` candidate | Medium         | Legacy shared auth path must be preserved.                                                   |
| `dashboard/shared/auth.js`                                                                             | shared auth/bootstrap behavior; impersonation present                                                                                              | Legacy shared script loaded by several Dashboard routes                                                   | Yes where consumers load it; needs-review per route        | `dashboard/shared/`                 | `apps/dashboard/shared/` candidate | Critical       | Do not change Firebase, auth, or impersonation semantics before route moves.                 |
| `dashboard/shared/sidebar.js`                                                                          | authenticated Dashboard navigation/sidebar; impersonation links present                                                                            | Module/shared script loaded by member and automation routes                                               | needs-review                                               | `dashboard/shared/`                 | `apps/dashboard/shared/` candidate | High           | Sidebar active-route and admin/member links are sensitive to route drift.                    |
| `dashboard/shared/config.js`                                                                           | shared Dashboard config                                                                                                                            | Legacy shared config script                                                                               | Not directly an auth guard                                 | `dashboard/shared/`                 | `apps/dashboard/shared/` candidate | Medium         | Preserve `basePath`, project config globals, and consumer load order.                        |
| `dashboard/shared/profile-manager.js`                                                                  | member profile UI behavior                                                                                                                         | Module loaded by `dashboard/member.html`                                                                  | needs-review                                               | `dashboard/shared/`                 | `apps/dashboard/shared/` candidate | Medium         | Shared member runtime behavior is out of scope for this PR.                                  |
| `dashboard/shared/request-console.js`                                                                  | shared request console behavior                                                                                                                    | Shared script discovered under `dashboard/shared/`                                                        | needs-review                                               | `dashboard/shared/`                 | `apps/dashboard/shared/` candidate | Low            | Discovered shared script; route ownership requires later review.                             |

## 4. Access behavior checklist

| Scenario                                      | Expected Behavior                                                                            | Admin        | Premium      | Member       | Logged Out   | Notes                                                                                      |
| --------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------ | ------------ | ------------ | ------------ | ------------------------------------------------------------------------------------------ |
| Logged out user visits admin Dashboard        | Redirect to current login/home destination without exposing admin data                       | Not run      | Not run      | Not run      | Not run      | Preserve `js/lib/auth.js` logged-out redirect behavior.                                    |
| Logged out user visits premium Dashboard      | Redirect to current login/home destination without showing premium content                   | Not run      | Not run      | Not run      | Not run      | Premium page currently uses `allowedRoles`.                                                |
| Logged out user visits member Dashboard       | Redirect to current login/home destination without showing member content                    | Not run      | Not run      | Not run      | Not run      | Member entry currently depends on `js/pages/member.js`.                                    |
| Admin visits admin Dashboard                  | Admin page loads and admin management controls remain available                              | Not run      | Not run      | Not run      | Not run      | `js/pages/admin.js` admin check needs manual confirmation.                                 |
| Admin visits premium Dashboard                | Premium page loads because admin is allowed                                                  | Not run      | Not run      | Not run      | Not run      | Verify `allowedRoles: ["admin", "premium"]`.                                               |
| Admin visits member Dashboard                 | Member Dashboard loads; admin shortcut behavior remains unchanged                            | Not run      | Not run      | Not run      | Not run      | Member page may show admin button.                                                         |
| Premium visits admin Dashboard                | Admin data must not be exposed; current in-page block/redirect behavior needs-review         | Not run      | Not run      | Not run      | Not run      | Highest-priority manual admin smoke case.                                                  |
| Premium visits premium Dashboard              | Premium page loads                                                                           | Not run      | Not run      | Not run      | Not run      | Verify no redirect regression.                                                             |
| Premium visits member Dashboard               | Member Dashboard loads or preserves current fallback behavior                                | Not run      | Not run      | Not run      | Not run      | Verify member route behavior for premium users.                                            |
| Member visits admin Dashboard                 | Admin data must not be exposed; current in-page block/redirect behavior needs-review         | Not run      | Not run      | Not run      | Not run      | Confirm whether URL remains on admin with error or redirects.                              |
| Member visits premium Dashboard               | Redirect to current role Dashboard route                                                     | Not run      | Not run      | Not run      | Not run      | Expected redirect should remain `/dashboard/member.html` based on current helper defaults. |
| Member visits member Dashboard                | Member Dashboard loads                                                                       | Not run      | Not run      | Not run      | Not run      | Baseline member smoke.                                                                     |
| Unknown role behavior                         | Unknown/default role continues to normalize to member behavior                               | needs-review | needs-review | needs-review | needs-review | Verify defaulting through role helpers before any move.                                    |
| Suspended/inactive role behavior if supported | Preserve current status handling exactly                                                     | needs-review | needs-review | needs-review | needs-review | Role statuses exist; Dashboard enforcement requires manual review.                         |
| Impersonated role behavior if supported       | Admin impersonation remains visible, scoped, and reversible                                  | needs-review | needs-review | needs-review | needs-review | Impersonation keys and banners are present in current auth/sidebar/admin flows.            |
| Logout flow                                   | Clears current impersonation key, signs out, and redirects to current login/home destination | Not run      | Not run      | Not run      | Not run      | Preserve `logout()` behavior and route destination.                                        |

## 5. Auth/config preservation requirements

Before any protected Dashboard route move:

- `js/lib/auth.js` behavior must remain unchanged.
- Firebase/App Check initialization must remain unchanged.
- Session shape must remain unchanged, including `uid`, `email`, `name`, `role`, `isAdmin`, `impersonating`, and related impersonation fields where present.
- Role normalization/defaults must remain unchanged.
- Dashboard route constants must preserve current route values for admin, premium, member, and other Dashboard routes.
- Unauthorized redirects must remain unchanged.
- `allowedRoles` behavior must remain unchanged, including the current empty-array/default behavior.

## 6. Route move decision gate

- Do not move Dashboard runtime files until this smoke test exists and is manually completed.
- Do not change Dashboard route paths until route constants and redirects are verified.
- Do not move admin, premium, and member route files together in the first runtime move.
- Prefer one protected route move at a time after smoke testing.
- Treat admin route behavior as a critical gate because the current admin page relies on an authenticated session plus a separate in-page admin check.

## 7. Recommended first runtime Dashboard move

Recommendation: **no runtime move yet; complete manual smoke tests first**.

The readiness scan discovered protected route files, mixed module and legacy shared-script auth patterns, impersonation behavior, centralized route constants, and several `needs-review` route expectations. The first runtime PR should not move the admin protected runtime first. After this smoke gate is manually completed, prefer either a compatibility route map before moving HTML or one low-risk shared Dashboard documentation/README-only change before any protected HTML relocation.

## 8. Manual result table

| Date | Tester | Environment                  | Browser | Route Group      | Result  | Notes                           |
| ---- | ------ | ---------------------------- | ------- | ---------------- | ------- | ------------------------------- |
| TBD  | TBD    | Local / staging / production | TBD     | Dashboard routes | Not run | Fill after manual smoke testing |

## 9. Risk matrix

| Risk                             | Impact | Likelihood | Mitigation                                                                                                      |
| -------------------------------- | ------ | ---------- | --------------------------------------------------------------------------------------------------------------- |
| Admin route exposed incorrectly  | High   | Medium     | Smoke-test logged-out, member, premium, admin, and impersonated access before moving admin files.               |
| Premium/member access regression | High   | Medium     | Verify `allowedRoles`, member defaults, and premium/member redirects across all primary roles.                  |
| Logged-out redirect regression   | High   | Medium     | Preserve `getLoginPath()` and test direct visits while signed out.                                              |
| Firebase/App Check regression    | High   | Medium     | Do not alter Firebase imports, App Check provider setup, debug token behavior, or load order in route-move PRs. |
| Role defaulting regression       | Medium | Medium     | Preserve role normalization/defaults and manually test unknown/missing role data.                               |
| Impersonation regression         | High   | Medium     | Verify impersonation key handling, banners, effective session shape, and exit behavior.                         |
| Route constant drift             | High   | Medium     | Compare Dashboard route constants against current static paths before and after each move.                      |
| Broken Dashboard shared script   | High   | Medium     | Inventory shared script consumers and smoke-test sidebar/auth/profile behavior per route.                       |
| Static hosting path issue        | High   | Medium     | Preserve absolute/relative script URLs or add compatibility route maps before moving HTML.                      |
| Duplicate initialization         | Medium | Medium     | Avoid loading both old and new Firebase/auth/App Check initializers on the same route.                          |

## 10. Relationship to existing docs

- [Dashboard + Corporate Automation migration audit](dashboard-corporate-automation-migration-audit.md)
- [Enterprise migration closure audit](enterprise-migration-closure-audit.md)
- [Auth/config centralization plan](auth-config-centralization-plan.md)
- [Route constants migration](route-constants-migration.md)
- [Role access migration](role-access-migration.md)
- [First auth consumer migration checklist](first-auth-consumer-migration-checklist.md)
- [Dashboard app README](../../apps/dashboard/README.md)
- [Dashboard routes README](../../apps/dashboard/routes/README.md)
- [Dashboard shared README](../../apps/dashboard/shared/README.md)
- [Auth package README](../../packages/auth/README.md)
- [Config package README](../../packages/config/README.md)

## Phase 11B route compatibility and static hosting note

Phase 11B adds the Dashboard route compatibility map and static hosting path strategy before any protected Dashboard runtime route move. The route/access smoke tests in this document remain required before route moves, and the compatibility map now clarifies that public `/dashboard/*.html` URLs must remain stable unless a dedicated route-change PR proves wrapper or hosting support.
