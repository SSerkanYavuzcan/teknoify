# Dashboard Route Compatibility Map

## 1. Title and purpose

Phase 11B defines the Dashboard route compatibility requirements, static hosting path plan, and wrapper strategy that must exist before any protected Dashboard runtime route is moved. This document is intentionally non-runtime: it does not move Dashboard files, change public URLs, alter auth redirects, change Firebase/App Check behavior, or update role/access logic.

The purpose is to make the current `/dashboard/*.html` and nested Dashboard route contracts explicit so a future `apps/dashboard/` ownership migration can preserve direct links, role dashboard redirects, shared script initialization, and static hosting behavior.

## Phase 14A enterprise readiness note

Phase 14A makes dashboard route compatibility part of the enterprise readiness checker, so compatibility wrapper and static-hosting path risks are now included in the all-checkers migration gate.

## 2. Scope

In scope for Phase 11B:

- Current Dashboard HTML route files under `dashboard/`.
- Role dashboard constants for admin, premium, and member dashboards.
- Dashboard shared scripts, including `dashboard/shared/*` and Dashboard-linked page scripts.
- Auth guard usage and redirect compatibility expectations.
- Static hosting path expectations for existing `/dashboard/*` URLs.
- Future `apps/dashboard/` ownership boundaries.

Out of scope for Phase 11B:

- Moving Dashboard files.
- Changing route URLs.
- Changing auth redirects.
- Changing Firebase/App Check behavior.
- Changing role/access logic.
- Changing public pages.
- Changing package scripts.

## 3. Current route map

| Current Route/File                                | Public URL                                         | Role/Access Expectation                                                        | Current Script Dependencies                                                                                                      | Future Owner             | Move Status  | Notes                                                                                               |
| ------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------------ | --------------------------------------------------------------------------------------------------- |
| `dashboard/admin.html`                            | `/dashboard/admin.html`                            | Admin-only protected Dashboard; current JS also verifies `session.isAdmin`.    | `../js/pages/admin.js`                                                                                                           | `apps/dashboard/routes/` | blocked      | Required role dashboard route; do not move first.                                                   |
| `dashboard/agents/product-discover/index.html`    | `/dashboard/agents/product-discover/index.html`    | needs-review                                                                   | `/dashboard/shared/sidebar.js`, `/dashboard/shared/profile-manager.js`, `/dashboard/agents/product-discover/product-discover.js` | `apps/dashboard/routes/` | needs-review | Uses absolute Dashboard/shared paths and app-specific assets.                                       |
| `dashboard/analysis.html`                         | `/dashboard/analysis.html`                         | needs-review                                                                   | none discovered                                                                                                                  | `apps/dashboard/routes/` | needs-review | HTML route exists, but current script dependencies need manual inspection before ownership changes. |
| `dashboard/bim-istekleri/index.html`              | `/dashboard/bim-istekleri/index.html`              | needs-review                                                                   | `config.js`, `../shared/auth.js`, `../shared/request-console.js`                                                                 | `apps/dashboard/routes/` | blocked      | Relative shared-script and style paths are move-risk items.                                         |
| `dashboard/demo/market-analysis/index.html`       | `/dashboard/demo/market-analysis/index.html`       | needs-review                                                                   | `../../../config.js`, `../../shared/auth.js`                                                                                     | `apps/dashboard/routes/` | blocked      | Relative config/shared paths need static hosting review before move.                                |
| `dashboard/geo-intelligence/index.html`           | `/dashboard/geo-intelligence/index.html`           | Protected Dashboard user via `requireAuth()`.                                  | inline module imports `../../js/lib/auth.js`                                                                                     | `apps/dashboard/routes/` | blocked      | Inline relative module import would change if moved.                                                |
| `dashboard/index.html`                            | `/dashboard/index.html`                            | Protected Dashboard router/fallback via `requireAuth()`.                       | inline module imports `/js/lib/auth.js`                                                                                          | `apps/dashboard/routes/` | blocked      | Redirects to current admin/member dashboard URLs; preserve during migration.                        |
| `dashboard/market-analysis-demo.html`             | `/dashboard/market-analysis-demo.html`             | needs-review                                                                   | `config.js`, `../shared/auth.js`                                                                                                 | `apps/dashboard/routes/` | blocked      | Relative shared auth/config paths are move-risk items.                                              |
| `dashboard/market-analysis.html`                  | `/dashboard/market-analysis.html`                  | needs-review                                                                   | `../js/session-manager.js`                                                                                                       | `apps/dashboard/routes/` | blocked      | Depends on current relative public JS path.                                                         |
| `dashboard/member.html`                           | `/dashboard/member.html`                           | Protected member/default Dashboard; current role helper falls back to member.  | `/dashboard/shared/sidebar.js`, `/js/pages/member.js`, `/dashboard/shared/profile-manager.js`                                    | `apps/dashboard/routes/` | blocked      | Required role dashboard route; do not move first.                                                   |
| `dashboard/member/finance/index.html`             | `/dashboard/member/finance/index.html`             | needs-review                                                                   | `/dashboard/shared/sidebar.js`, `/js/finance.js`                                                                                 | `apps/dashboard/routes/` | needs-review | Uses absolute shared/public JS paths; data access behavior must be smoke-tested before move.        |
| `dashboard/member/health/index.html`              | `/dashboard/member/health/index.html`              | needs-review                                                                   | `../../config.js`, `../../shared/auth.js`, `../../shared/sidebar.js`                                                             | `apps/dashboard/routes/` | blocked      | Relative paths must be preserved by wrapper/mirror strategy.                                        |
| `dashboard/member/productivity/index.html`        | `/dashboard/member/productivity/index.html`        | needs-review                                                                   | `../../config.js`, `../../shared/auth.js`, `../../shared/sidebar.js`                                                             | `apps/dashboard/routes/` | blocked      | Relative paths must be preserved by wrapper/mirror strategy.                                        |
| `dashboard/member/subscriptions/index.html`       | `/dashboard/member/subscriptions/index.html`       | needs-review                                                                   | `../../config.js`, `../../shared/auth.js`, `../../shared/sidebar.js`                                                             | `apps/dashboard/routes/` | blocked      | Relative paths must be preserved by wrapper/mirror strategy.                                        |
| `dashboard/premium.html`                          | `/dashboard/premium.html`                          | Admin or premium protected Dashboard via `allowedRoles: ["admin", "premium"]`. | inline module imports `../js/lib/auth.js`                                                                                        | `apps/dashboard/routes/` | blocked      | Required role dashboard route; do not move first.                                                   |
| `dashboard/web-scraping/clothes/index.html`       | `/dashboard/web-scraping/clothes/index.html`       | needs-review                                                                   | `config.js`, `../shared/engine.js`, `../shared/auth.js`                                                                          | `apps/dashboard/routes/` | blocked      | Corporate automation-style route with relative shared dependencies.                                 |
| `dashboard/web-scraping/food/index.html`          | `/dashboard/web-scraping/food/index.html`          | needs-review                                                                   | `config.js`, `../shared/engine.js`, `../shared/auth.js`                                                                          | `apps/dashboard/routes/` | blocked      | Corporate automation-style route with relative shared dependencies.                                 |
| `dashboard/web-scraping/quickcommerce/index.html` | `/dashboard/web-scraping/quickcommerce/index.html` | needs-review                                                                   | `config.js`, `/dashboard/shared/sidebar.js`                                                                                      | `apps/dashboard/routes/` | needs-review | Mixes relative local config with absolute shared sidebar path.                                      |

## 4. Route constants compatibility

- Current route constants for admin, premium, and member must remain unchanged until a dedicated route-change PR explicitly changes public route behavior.
- `DASHBOARD_ROUTES.admin` must remain `/dashboard/admin.html` during this migration gate.
- `DASHBOARD_ROUTES.premium` must remain `/dashboard/premium.html` during this migration gate.
- `DASHBOARD_ROUTES.member` must remain `/dashboard/member.html` during this migration gate.
- `getDashboardRouteForRole()` must continue to return the existing public URLs for admin, premium, and member roles.
- Current auth redirect behavior must remain compatible with existing `/dashboard/*.html` URLs.
- Future app-owned files under `apps/dashboard/` must not become public route paths unless static hosting support is documented, tested, and approved in a dedicated route-change PR.

## 5. Static hosting path strategy

Existing `/dashboard/*.html` and nested `/dashboard/**/index.html` URLs are public/protected route contracts. Moving source ownership to `apps/dashboard/` does not automatically mean changing public URLs, because static hosting, direct links, bookmarks, auth redirects, and route constants currently target `/dashboard/*` paths.

Future moves should use one of these strategies:

- Keep `/dashboard/*.html` and nested `/dashboard/**/index.html` files as thin compatibility wrappers that load app-owned implementation safely.
- Copy or mirror source ownership to `apps/dashboard/` while keeping public HTML route files in `/dashboard`.
- Introduce a documented build/deploy mapping only after the hosting platform, generated output paths, cache behavior, and rollback procedure support it.

Do not break direct links or bookmarks. Any future static hosting path change must prove that existing URLs still resolve, still initialize the expected scripts/styles, and still preserve protected-route behavior.

## 6. Compatibility wrapper strategy

- The first runtime migration should prefer compatibility wrappers or mirrored ownership instead of a direct protected-route move.
- Dashboard HTML route files should remain in place until replacement behavior is proven by the Phase 11A smoke tests and a focused wrapper proof-of-concept.
- Shared scripts should not be duplicated without initialization safeguards, because duplicate sidebar/profile/auth bootstraps can cause repeated event listeners, conflicting globals, or double Firebase/auth work.
- Route constants should point to public route URLs, not internal source ownership paths such as `apps/dashboard/...`.
- Compatibility wrappers must be reversible: if a wrapper fails, the original public route file/link/script behavior must be restorable without changing role constants.

## 7. Move readiness table

| Area                              | Can Move Now?  | Required Gate                                                                                      | Suggested First Step                                                                        | Risk                                                          |
| --------------------------------- | -------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Admin route                       | No             | Complete admin/premium/member/manual smoke tests and wrapper proof first.                          | Keep `/dashboard/admin.html` in place; document exact admin access behavior.                | High: admin data exposure or lockout.                         |
| Premium route                     | No             | Complete premium/member/admin access and redirect smoke tests.                                     | Keep `/dashboard/premium.html`; verify `allowedRoles` behavior before any wrapper.          | High: paid access regression.                                 |
| Member route                      | No             | Complete default/member/premium/admin smoke tests and data-card checks.                            | Keep `/dashboard/member.html`; verify `js/pages/member.js` and shared sidebar/profile boot. | High: default role redirect regression.                       |
| Shared dashboard scripts          | No             | Initialization and idempotency review for `dashboard/shared/*`.                                    | Inventory consumers and identify duplicate-boot safeguards before mirroring.                | High: duplicate listeners, globals, or profile/sidebar state. |
| Dashboard styles if present       | No             | Visual/static path smoke tests for `/css/dashboard.css`, `/css/analysis.css`, and route-local CSS. | Keep styles at current public paths; map relative versus absolute consumers.                | Medium: broken layout or missing assets.                      |
| Dashboard data access             | No             | Data/API/Firestore access smoke tests for protected pages.                                         | Keep runtime data access unchanged; document page-level data dependencies.                  | High: missing or overexposed user/project data.               |
| Dashboard auth guard usage        | No             | Phase 11A route/access smoke-test completion and redirect verification.                            | Keep `js/lib/auth.js` unchanged; verify role helper and login/home redirects.               | High: auth redirect/access regression.                        |
| `apps/dashboard` README ownership | Yes, docs only | Documentation-only ownership remains non-runtime.                                                  | Continue adding route ownership notes without changing public routes.                       | Low: docs drift if not linked to static hosting gates.        |

## 8. Recommended next runtime-safe action

1. Complete the manual Dashboard route/access smoke tests first.
2. Then create a compatibility wrapper proof-of-concept for a non-critical Dashboard page, if any route is confirmed non-critical and has low auth/data risk.
3. If no non-critical Dashboard page exists, create a route-move implementation plan only and do not move runtime files yet.
4. Do not move admin, premium, or member protected routes first.

## 9. Rollback plan

- Restore original `/dashboard/*.html` and nested `/dashboard/**/index.html` file/link/script behavior.
- Keep route constants unchanged so admin, premium, and member continue to resolve to current public URLs.
- Keep auth redirect behavior unchanged.
- If a compatibility wrapper fails, public route files must still work by reverting the wrapper to the original HTML and current script/style references.
- Rollback should not require Firebase/App Check, role/access, package script, public page, CSS, API, data, or workflow changes.

## 10. Relationship to existing docs

- [`dashboard-route-access-smoke-test.md`](dashboard-route-access-smoke-test.md)
- [`dashboard-corporate-automation-migration-audit.md`](dashboard-corporate-automation-migration-audit.md)
- [`enterprise-migration-closure-audit.md`](enterprise-migration-closure-audit.md)
- [`route-constants-migration.md`](route-constants-migration.md)
- [`auth-config-centralization-plan.md`](auth-config-centralization-plan.md)
- [`../../apps/dashboard/README.md`](../../apps/dashboard/README.md)
- [`../../apps/dashboard/routes/README.md`](../../apps/dashboard/routes/README.md)
- [`../../packages/config/README.md`](../../packages/config/README.md)
