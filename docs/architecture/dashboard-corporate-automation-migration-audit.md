# Dashboard + Corporate Automation Migration Audit

## 1. Title and purpose

This document is the Phase 9A Dashboard + Corporate Automation migration audit. It is a non-runtime planning artifact that maps protected dashboard assets, public service/product pages, shared auth/config/data-access helpers, automation-oriented dashboard tools, and future ownership targets before any physical file moves.

Phase 9A intentionally does not move dashboard files, public pages, JavaScript, CSS, data files, API files, workflows, or package scripts. Its purpose is to make ownership, route sensitivity, auth/access coupling, and migration risk visible before later phases create compatibility tests or copy/move files.

## 2. Scope

In scope for Phase 9A:

- Dashboard HTML/routes under `dashboard/`.
- Dashboard page JavaScript such as `js/pages/admin.js`, `js/pages/dashboard.js`, and related page controllers.
- Auth/config/data-access helpers such as `js/lib/auth.js`, `js/lib/firebase.js`, `packages/auth/`, `packages/config/`, and `packages/data-access/`.
- Public service/product pages under `pages/`, including corporate automation, RPA, web scraping, API automation, subscription, training, and consulting routes.
- Corporate automation, RPA, web scraping, service/product, API, worker, and documentation touchpoints.
- API/data touchpoints that dashboard or automation flows may rely on.
- Future `apps/`, `domains/`, `services/`, and `packages/` ownership boundaries.

Out of scope for Phase 9A:

- Moving dashboard files.
- Changing routes.
- Changing auth redirects.
- Changing Firebase/App Check behavior.
- Changing dashboard access control.
- Changing API behavior.
- Changing public page links.
- Changing package scripts.

## 3. Current asset inventory

| Current Path                                            | Type                    | Current Role                                                       | Protected/Public                  | Suggested Future Owner                                                                   | Move Priority           | Risk   | Notes                                                                                                     |
| ------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------ | --------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------- | ------ | --------------------------------------------------------------------------------------------------------- |
| `dashboard/`                                            | Folder                  | Current protected dashboard route tree and dashboard-local assets. | Protected/mixed dashboard runtime | `apps/dashboard/`                                                                        | P0-do-not-move-yet      | High   | Root runtime folder; keep static hosting paths stable until route/access smoke tests exist.               |
| `dashboard/index.html`                                  | HTML route              | Dashboard landing/portal route.                                    | Protected expectation             | `apps/dashboard/routes/`                                                                 | P0-do-not-move-yet      | High   | Listed in route constants as `/dashboard/index.html`; do not move before protected-route validation.      |
| `dashboard/admin.html`                                  | HTML route              | Admin dashboard route.                                             | Protected admin                   | `apps/dashboard/routes/admin/`                                                           | P0-do-not-move-yet      | High   | Depends on admin role semantics and admin page JavaScript.                                                |
| `dashboard/member.html`                                 | HTML route              | Member dashboard route.                                            | Protected member                  | `apps/dashboard/routes/member/`                                                          | P0-do-not-move-yet      | High   | Must preserve member access and redirects.                                                                |
| `dashboard/premium.html`                                | HTML route              | Premium dashboard route.                                           | Protected premium                 | `apps/dashboard/routes/premium/`                                                         | P0-do-not-move-yet      | High   | Must preserve premium access behavior.                                                                    |
| `dashboard/analysis.html`                               | HTML route              | Dashboard analysis route.                                          | Protected dashboard               | `apps/dashboard/routes/`                                                                 | P0-do-not-move-yet      | High   | Runtime-sensitive dashboard route.                                                                        |
| `dashboard/market-analysis.html`                        | HTML route              | Dashboard market analysis route.                                   | Protected dashboard/product tool  | `apps/dashboard/routes/`                                                                 | P0-do-not-move-yet      | High   | Coupled to dashboard hosting path and dashboard assets.                                                   |
| `dashboard/market-analysis-demo.html`                   | HTML route              | Dashboard market analysis demo route.                              | Protected/dashboard demo          | `apps/dashboard/routes/`                                                                 | P0-do-not-move-yet      | High   | Keep current route until demo access expectations are documented.                                         |
| `dashboard/member/finance/index.html`                   | HTML route              | Member finance dashboard subroute.                                 | Protected member                  | `apps/dashboard/routes/member/`                                                          | P0-do-not-move-yet      | High   | Nested member route; smoke-test before moving.                                                            |
| `dashboard/member/health/index.html`                    | HTML route              | Member health dashboard subroute.                                  | Protected member                  | `apps/dashboard/routes/member/`                                                          | P0-do-not-move-yet      | High   | Nested member route; smoke-test before moving.                                                            |
| `dashboard/member/productivity/index.html`              | HTML route              | Member productivity dashboard subroute.                            | Protected member                  | `apps/dashboard/routes/member/`                                                          | P0-do-not-move-yet      | High   | Nested member route; smoke-test before moving.                                                            |
| `dashboard/member/subscriptions/index.html`             | HTML route              | Member subscriptions dashboard subroute.                           | Protected member/subscription     | `apps/dashboard/routes/member/`                                                          | P0-do-not-move-yet      | High   | Related to subscription access; do not move before access checks.                                         |
| `dashboard/agents/product-discover/index.html`          | HTML route              | Dashboard product discovery agent route.                           | Protected dashboard/product tool  | `apps/dashboard/routes/`                                                                 | P0-do-not-move-yet      | High   | Future domain ownership may involve `domains/products/`, but runtime route remains dashboard-owned first. |
| `dashboard/agents/product-discover/product-discover.js` | JS                      | Product discovery agent runtime.                                   | Protected dashboard               | `apps/dashboard/shared/`                                                                 | P0-do-not-move-yet      | High   | Runtime JS must wait for dashboard compatibility work.                                                    |
| `dashboard/bim-istekleri/index.html`                    | HTML route              | Dashboard request/API console style route.                         | Protected dashboard/tool          | `apps/dashboard/routes/`                                                                 | P0-do-not-move-yet      | High   | Contains dashboard-local CSS/config/backend-adjacent files.                                               |
| `dashboard/bim-istekleri/config.js`                     | JS config               | Dashboard tool config.                                             | Protected dashboard               | `packages/config/` or `apps/dashboard/shared/`                                           | needs-review            | High   | Config ownership depends on whether values are dashboard-local or shared app config.                      |
| `dashboard/bim-istekleri/backend/`                      | Backend-adjacent folder | Python/deploy files for dashboard tool backend.                    | Runtime/service                   | `services/automation-workers/integrations/`                                              | needs-review            | High   | Do not move until service deployment and API contracts are documented.                                    |
| `dashboard/web-scraping/quickcommerce/index.html`       | HTML route              | Dashboard quick-commerce scraping tool route.                      | Protected dashboard/automation    | `apps/dashboard/routes/` and `services/automation-workers/scraping/`                     | P0-do-not-move-yet      | High   | Route and worker ownership are separate; route must stay stable.                                          |
| `dashboard/web-scraping/food/index.html`                | HTML route              | Dashboard food scraping tool route.                                | Protected dashboard/automation    | `apps/dashboard/routes/` and `services/automation-workers/scraping/`                     | P0-do-not-move-yet      | High   | Protected route with automation domain relevance.                                                         |
| `dashboard/web-scraping/clothes/index.html`             | HTML route              | Dashboard clothing scraping tool route.                            | Protected dashboard/automation    | `apps/dashboard/routes/` and `services/automation-workers/scraping/`                     | P0-do-not-move-yet      | High   | Protected route with automation domain relevance.                                                         |
| `dashboard/web-scraping/*/config.js`                    | JS config               | Dashboard scraping tool configuration.                             | Protected dashboard/automation    | `packages/config/`, `apps/dashboard/shared/`, or `services/automation-workers/scraping/` | needs-review            | High   | Needs split between route config, UI config, and worker/service config.                                   |
| `dashboard/web-scraping/backend/`                       | Backend-adjacent folder | Python/deploy files for scraping backend.                          | Runtime/service                   | `services/automation-workers/scraping/`                                                  | needs-review            | High   | Service move should wait for deploy path and data/API contract review.                                    |
| `dashboard/geo-intelligence/index.html`                 | HTML route              | Dashboard geo intelligence route.                                  | Protected dashboard/data-heavy    | `apps/dashboard/routes/`                                                                 | P0-do-not-move-yet      | High   | Depends on large GeoJSON data path.                                                                       |
| `dashboard/geo-intelligence/istanbul-ultimate.geojson`  | Data                    | Geo intelligence data asset.                                       | Dashboard data                    | `packages/data-access/` or keep-current                                                  | needs-review            | High   | Large data asset; avoid moving until data access and static path strategy exists.                         |
| `dashboard/shared/auth.js`                              | JS helper               | Dashboard shared auth helper.                                      | Protected dashboard/auth          | `packages/auth/`                                                                         | P0-do-not-move-yet      | High   | Auth/access-sensitive; preserve current semantics.                                                        |
| `dashboard/shared/config.js`                            | JS helper               | Dashboard shared config helper.                                    | Protected dashboard/config        | `packages/config/`                                                                       | P0-do-not-move-yet      | High   | Config-sensitive; route constants and dashboard adapters should come first.                               |
| `dashboard/shared/profile-manager.js`                   | JS helper               | Dashboard shared profile helper.                                   | Protected dashboard/data-access   | `packages/data-access/` or `apps/dashboard/shared/`                                      | needs-review            | High   | Likely user profile and dashboard coupling.                                                               |
| `dashboard/shared/request-console.js`                   | JS helper               | Dashboard request console helper.                                  | Protected dashboard/API           | `apps/dashboard/shared/` or `services/automation-workers/integrations/`                  | needs-review            | High   | Could span UI and API/service concerns.                                                                   |
| `dashboard/shared/sidebar.js`                           | JS helper               | Dashboard navigation/sidebar helper.                               | Protected dashboard               | `apps/dashboard/shared/`                                                                 | P0-do-not-move-yet      | High   | Path and route coupling likely.                                                                           |
| `dashboard/index.css`                                   | CSS                     | Dashboard-local stylesheet.                                        | Protected dashboard styling       | `apps/dashboard/shared/`                                                                 | P0-do-not-move-yet      | Medium | Do not move CSS in Phase 9A.                                                                              |
| `dashboard/agents/css/`                                 | CSS folder              | Dashboard agent CSS.                                               | Protected dashboard styling       | `apps/dashboard/shared/`                                                                 | P0-do-not-move-yet      | Medium | Do not move CSS before route/style smoke tests.                                                           |
| `js/pages/admin.js`                                     | JS page controller      | Admin dashboard controller.                                        | Protected admin                   | `apps/dashboard/admin/`                                                                  | P0-do-not-move-yet      | High   | Imports auth/Firebase and handles impersonation/admin flows.                                              |
| `js/pages/dashboard.js`                                 | JS page controller      | Dashboard/member page controller.                                  | Protected dashboard               | `apps/dashboard/shared/`                                                                 | P0-do-not-move-yet      | High   | Auth/session/profile and dashboard UI coupling.                                                           |
| `js/pages/member.js`                                    | JS page controller      | Member dashboard/page controller.                                  | Protected/member or account       | `apps/dashboard/member/`                                                                 | P0-do-not-move-yet      | High   | Treat as dashboard-sensitive until route/access expectations are smoke-tested.                            |
| `js/pages/login.js`                                     | JS page controller      | Login page controller.                                             | Public auth route                 | `packages/auth/` and `apps/web/`                                                         | P0-do-not-move-yet      | High   | Public route but auth-sensitive.                                                                          |
| `js/pages/unauthorized.js`                              | JS page controller      | Unauthorized page behavior.                                        | Public auth error route           | `packages/auth/` and `apps/web/`                                                         | P0-do-not-move-yet      | Medium | Must preserve redirect/access UX.                                                                         |
| `js/lib/auth.js`                                        | JS helper               | Main auth/session/role route guard.                                | Shared protected/public auth      | `packages/auth/`                                                                         | P0-do-not-move-yet      | High   | Depends on Firebase, App Check, Firestore, route constants, and role helpers.                             |
| `js/lib/firebase.js`                                    | JS helper               | Firebase initialization.                                           | Shared runtime config             | `packages/auth/` or `packages/config/`                                                   | P0-do-not-move-yet      | High   | Firebase/App Check behavior must not change.                                                              |
| `js/impersonate.js`                                     | JS helper               | Impersonation-related behavior.                                    | Admin/auth-sensitive              | `packages/auth/`                                                                         | P0-do-not-move-yet      | High   | Admin impersonation semantics must be preserved.                                                          |
| `js/premium-content-gate.js`                            | JS helper               | Premium/member gating.                                             | Public/protected access-sensitive | `packages/auth/`                                                                         | P0-do-not-move-yet      | High   | Access behavior must be smoke-tested before moves.                                                        |
| `js/session-manager.js`                                 | JS helper               | Session lifecycle behavior.                                        | Auth-sensitive                    | `packages/auth/`                                                                         | P0-do-not-move-yet      | High   | Auth redirect/session semantics must remain unchanged.                                                    |
| `pages/rpa.html`                                        | Public HTML route       | Public RPA service page.                                           | Public                            | `domains/corporate-automation/rpa/` and `apps/web/public-pages/`                         | P2-copy-or-mirror-later | Medium | Safer than dashboard runtime, but keep public URL stable.                                                 |
| `pages/webscraping.html`                                | Public HTML route       | Public web scraping service page.                                  | Public                            | `domains/corporate-automation/web-scraping/` and `apps/web/public-pages/`                | P2-copy-or-mirror-later | Medium | Public route/link stability required.                                                                     |
| `pages/api.html`                                        | Public HTML route       | Public API automation/service page.                                | Public                            | `domains/corporate-automation/api-automation/` and `apps/web/public-pages/`              | P2-copy-or-mirror-later | Medium | Do not confuse with runtime `api/` endpoints.                                                             |
| `pages/training-consulting.html`                        | Public HTML route       | Public training/consulting service page.                           | Public                            | `domains/corporate-automation/training-consulting/` and `apps/web/public-pages/`         | P2-copy-or-mirror-later | Medium | Public URL and stylesheet dependencies must be preserved.                                                 |
| `pages/subscription.html`                               | Public HTML route       | Public subscription/product route.                                 | Public/account-adjacent           | `domains/products/` and `apps/web/public-pages/`                                         | P2-copy-or-mirror-later | Medium | Subscription route can affect purchase/account journeys.                                                  |
| `pages/ai-assistant.html`                               | Public HTML route       | Public AI assistant/product page.                                  | Public                            | `domains/products/` or `domains/services/`                                               | needs-review            | Medium | Discovered as related product/service route; ownership needs product taxonomy.                            |
| `pages/financial-indicators.html`                       | Public HTML route       | Public financial indicators/product page.                          | Public                            | `domains/products/` or investment domain                                                 | needs-review            | Medium | Could overlap investment intelligence; review before moving.                                              |
| `pages/login.html`                                      | Public HTML route       | Login route.                                                       | Public auth                       | `apps/web/` and `packages/auth/`                                                         | P0-do-not-move-yet      | High   | Auth redirect compatibility gate.                                                                         |
| `pages/unauthorized.html`                               | Public HTML route       | Unauthorized route.                                                | Public auth/access                | `apps/web/` and `packages/auth/`                                                         | P0-do-not-move-yet      | Medium | Access error route must remain stable.                                                                    |
| `css/rpa.css`                                           | CSS                     | Public RPA service stylesheet.                                     | Public styling                    | `domains/corporate-automation/rpa/` or `apps/web/shared/`                                | P2-copy-or-mirror-later | Medium | Do not move CSS in Phase 9A.                                                                              |
| `css/webscraping.css`                                   | CSS                     | Public web scraping stylesheet.                                    | Public styling                    | `domains/corporate-automation/web-scraping/` or `apps/web/shared/`                       | P2-copy-or-mirror-later | Medium | Do not move CSS in Phase 9A.                                                                              |
| `css/api.css`                                           | CSS                     | Public API service stylesheet.                                     | Public styling                    | `domains/corporate-automation/api-automation/` or `apps/web/shared/`                     | P2-copy-or-mirror-later | Medium | Public page style dependency.                                                                             |
| `css/training-consulting.css`                           | CSS                     | Public training/consulting stylesheet.                             | Public styling                    | `domains/corporate-automation/training-consulting/` or `apps/web/shared/`                | P2-copy-or-mirror-later | Medium | Public page style dependency.                                                                             |
| `css/dashboard.css`                                     | CSS                     | Public/dashboard portal styling candidate.                         | Mixed                             | `apps/dashboard/shared/` or `apps/web/shared/`                                           | needs-review            | Medium | Review consumers before moving.                                                                           |
| `css/06-pages/dashboard-portal.css`                     | CSS                     | Dashboard portal page stylesheet.                                  | Mixed/dashboard portal            | `apps/dashboard/shared/`                                                                 | P2-copy-or-mirror-later | Medium | Do not move CSS until style loading is tested.                                                            |
| `api/chat.js`                                           | API endpoint            | Chat/API runtime endpoint.                                         | Runtime API                       | keep-current                                                                             | P0-do-not-move-yet      | High   | API behavior out of scope.                                                                                |
| `api/chat-log.js`                                       | API endpoint            | Chat logging/API runtime endpoint.                                 | Runtime API                       | keep-current                                                                             | P0-do-not-move-yet      | High   | API behavior out of scope.                                                                                |
| `data/projects.json`                                    | Data                    | Project catalog used by public/dashboard surfaces.                 | Shared data                       | `packages/data-access/`                                                                  | P0-do-not-move-yet      | Medium | Preserve JSON shape until wrappers exist.                                                                 |
| `data/entitlements.json`                                | Data                    | Entitlement/premium access data.                                   | Access data                       | `packages/data-access/` and `packages/auth/`                                             | P0-do-not-move-yet      | High   | Access-sensitive data contract.                                                                           |
| `data/projects/README.md`                               | README                  | Project data ownership doc.                                        | Documentation                     | `packages/data-access/`                                                                  | P1-doc-only-owner-ready | Low    | Documentation can be linked without data moves.                                                           |
| `data/entitlements/README.md`                           | README                  | Entitlement data ownership doc.                                    | Documentation                     | `packages/data-access/`                                                                  | P1-doc-only-owner-ready | Low    | Documentation can be linked without data moves.                                                           |
| `apps/dashboard/README.md`                              | README                  | Future dashboard app owner.                                        | Documentation                     | `apps/dashboard/`                                                                        | P1-doc-only-owner-ready | Low    | Phase 9A updated ownership only.                                                                          |
| `apps/dashboard/shared/README.md`                       | README                  | Future dashboard shared owner.                                     | Documentation                     | `apps/dashboard/shared/`                                                                 | P1-doc-only-owner-ready | Low    | Phase 9A README-only skeleton.                                                                            |
| `apps/dashboard/routes/README.md`                       | README                  | Future dashboard routes owner.                                     | Documentation                     | `apps/dashboard/routes/`                                                                 | P1-doc-only-owner-ready | Low    | Phase 9A README-only skeleton.                                                                            |
| `apps/web/README.md`                                    | README                  | Future public web app owner.                                       | Documentation                     | `apps/web/`                                                                              | P1-doc-only-owner-ready | Low    | Phase 9A updated ownership only.                                                                          |
| `domains/corporate-automation/`                         | Folder                  | Future corporate automation domain owner.                          | Documentation/domain              | `domains/corporate-automation/`                                                          | P1-doc-only-owner-ready | Low    | README-only domain skeletons are safe first targets.                                                      |
| `domains/products/`                                     | Folder                  | Future product-domain owner.                                       | Documentation/domain              | `domains/products/`                                                                      | P1-doc-only-owner-ready | Low    | Create or update in a later products/services ownership phase if needed.                                  |
| `domains/services/`                                     | Folder                  | Future service-domain owner.                                       | Documentation/domain              | `domains/services/`                                                                      | P1-doc-only-owner-ready | Low    | Create or update in a later products/services ownership phase if needed.                                  |
| `services/automation-workers/`                          | Folder                  | Future automation worker owner.                                    | Documentation/service             | `services/automation-workers/`                                                           | P1-doc-only-owner-ready | Low    | Phase 9A README-only skeletons; no worker files moved.                                                    |
| `services/scraping-workers/README.md`                   | README                  | Existing scraping worker skeleton.                                 | Documentation/service             | `services/automation-workers/scraping/` or keep-current                                  | needs-review            | Low    | Needs reconciliation with new automation worker boundary.                                                 |
| `packages/auth/README.md`                               | README                  | Auth/role/session package owner.                                   | Documentation/package             | `packages/auth/`                                                                         | P1-doc-only-owner-ready | Low    | Phase 9A note added; runtime helpers remain in current paths.                                             |
| `packages/auth/roles.js`                                | JS package helper       | Role constants and pure helpers.                                   | Shared auth helper                | `packages/auth/`                                                                         | P3-runtime-move-later   | Medium | Already exists as future-facing helper; consumer migrations must be gated.                                |
| `packages/auth/premium-access.js`                       | JS package helper       | Premium/member access helpers.                                     | Shared auth helper                | `packages/auth/`                                                                         | P3-runtime-move-later   | Medium | Already exists as future-facing helper; preserve semantics.                                               |
| `packages/config/README.md`                             | README                  | Config/routes package owner.                                       | Documentation/package             | `packages/config/`                                                                       | P1-doc-only-owner-ready | Low    | Phase 9A note added.                                                                                      |
| `packages/config/routes.js`                             | JS package helper       | Central route constants.                                           | Shared route helper               | `packages/config/`                                                                       | P3-runtime-move-later   | Medium | Future route moves should consume constants and smoke tests.                                              |
| `packages/config/routes-global.js`                      | JS package helper       | Legacy route bridge.                                               | Shared route bridge               | `packages/config/`                                                                       | P3-runtime-move-later   | Medium | Loading and consumer migration must remain staged.                                                        |
| `packages/data-access/README.md`                        | README                  | Data-access package owner.                                         | Documentation/package             | `packages/data-access/`                                                                  | P1-doc-only-owner-ready | Low    | Phase 9A note added; source changes need wrappers first.                                                  |

## 4. Route and access preservation map

Current known protected dashboard routes include:

- `/dashboard/index.html`
- `/dashboard/member.html`
- `/dashboard/premium.html`
- `/dashboard/admin.html`
- `/dashboard/admin`
- `/dashboard/analysis.html`
- `/dashboard/market-analysis.html`
- `/dashboard/market-analysis-demo.html`
- `/dashboard/web-scraping/quickcommerce/index.html`
- `/dashboard/web-scraping/clothes/index.html`
- `/dashboard/web-scraping/food/index.html`
- `/dashboard/agents/product-discover/index.html`
- `/dashboard/bim-istekleri/index.html`
- `/dashboard/geo-intelligence/index.html`
- `/dashboard/demo/market-analysis/index.html`
- `/dashboard/member/finance/index.html`
- `/dashboard/member/health/index.html`
- `/dashboard/member/productivity/index.html`
- `/dashboard/member/subscriptions/index.html`

Current public service/product routes include:

- `/pages/api.html`
- `/pages/rpa.html`
- `/pages/webscraping.html`
- `/pages/ai-assistant.html`
- `/pages/financial-indicators.html`
- `/pages/training-consulting.html`
- `/pages/subscription.html`

Protected route expectations:

- Dashboard admin routes must remain admin-gated.
- Dashboard premium routes must preserve premium/admin access semantics.
- Dashboard member routes must preserve member/premium/admin access semantics.
- Dashboard web-scraping, product discovery, geo intelligence, and request-console tools must not become public by path changes.
- Impersonation flows must remain admin-only and must preserve existing storage keys and redirect behavior until explicitly migrated.

Public route expectations:

- Public service/product URLs must remain reachable at their current `/pages/*.html` paths until a static hosting compatibility layer is documented.
- Public service pages may depend on shared public CSS/JS and should be copied/mirrored before deletion in later phases.
- Public subscription/account-adjacent routes are more sensitive than ordinary marketing pages because they can affect purchase or entitlement flows.

Routes that depend on `js/lib/auth.js` or related auth helpers include the protected dashboard pages and any page scripts importing `requireAuth`, `logout`, route helpers, role helpers, or Firebase session state. The known high-sensitivity files are `js/lib/auth.js`, `js/lib/firebase.js`, `js/pages/admin.js`, `js/pages/dashboard.js`, `js/pages/member.js`, `js/pages/login.js`, `js/impersonate.js`, `js/premium-content-gate.js`, and `js/session-manager.js`.

Routes that depend on role/access helpers include admin, premium, member, subscription/member-subscription, unauthorized, and impersonation surfaces. Existing route constants in `packages/config/routes.js` should be treated as compatibility contracts; future route moves should first prove that constants and legacy route bridges preserve the same strings and redirects.

What must not change during migration:

- Public route URLs.
- Dashboard route URLs.
- Login/logout redirect outcomes.
- Unauthorized route behavior.
- Role names, role status values, allowed role decisions, premium access decisions, and impersonation behavior.
- Firebase project initialization and App Check behavior.
- Firestore collection/document names and API/data contracts.
- Script/style loading order for pages that still use legacy paths.

## 5. Future target ownership

```text
apps/
├── dashboard/
│   ├── README.md
│   ├── admin/
│   ├── premium/
│   ├── member/
│   ├── shared/
│   └── routes/
└── web/
    ├── README.md
    ├── public-pages/
    └── shared/

domains/
├── corporate-automation/
│   ├── README.md
│   ├── rpa/
│   ├── web-scraping/
│   ├── api-automation/
│   ├── training-consulting/
│   └── case-studies/
├── products/
└── services/

services/
└── automation-workers/
    ├── README.md
    ├── rpa/
    ├── scraping/
    └── integrations/

packages/
├── auth/
├── config/
└── data-access/
```

Proposed ownership principles:

- `apps/dashboard/` owns protected dashboard route composition, dashboard-local shared UI, and dashboard route documentation.
- `apps/web/` owns public website shells and public route composition.
- `domains/corporate-automation/` owns product/service domain meaning for RPA, web scraping, API automation, and training/consulting.
- `domains/products/` owns subscription/product taxonomy once product ownership is expanded.
- `domains/services/` owns cross-domain service taxonomy once service ownership is expanded.
- `services/automation-workers/` owns backend worker/job implementation after service contracts and deployment paths are documented.
- `packages/auth/` owns auth, role, premium access, session, redirect, Firebase/App Check auth boundary, and impersonation helpers.
- `packages/config/` owns route constants, route bridges, dashboard config adapters, and shared non-secret configuration.
- `packages/data-access/` owns wrappers around static JSON, Firestore, and future backend data sources.

## 6. Migration principles

- Preserve public routes.
- Preserve dashboard protected routes.
- Preserve auth redirects.
- Preserve role-based access behavior.
- Preserve Firebase/App Check behavior.
- Prefer copy/mirror before delete.
- Use route constants before moving routes.
- Use data-access wrappers before changing data sources.
- Do not move dashboard runtime files until route/access smoke tests exist.

## 7. Proposed staged migration order

- Phase 9A: audit script + migration audit docs.
- Phase 9B: create/update ownership README skeletons for dashboard, corporate automation, products/services, automation workers.
- Phase 9C: create dashboard route/access smoke test doc.
- Phase 9D: create compatibility route map or page mapping doc.
- Phase 9E: move/copy one low-risk public service page owner doc or static asset only.
- Phase 9F: plan dashboard runtime move only after protected route smoke tests.
- Later: move dashboard/admin JS only after auth/access compatibility is proven.

## 8. Recommended first migration target

Recommended first target: README-only ownership docs plus dashboard smoke-test docs.

The safest next step is not to move protected dashboard runtime files. Based on the current inventory, the lowest-risk work is to continue documenting ownership boundaries and then create a protected dashboard route/access smoke-test document that covers admin, premium, member, unauthorized, login redirect, impersonation, Firebase/App Check, and subscription/member-subscription expectations.

A later public service/product page documentation ownership pass can map `pages/rpa.html`, `pages/webscraping.html`, `pages/api.html`, and `pages/training-consulting.html` to domain ownership without changing the public route paths. Protected dashboard runtime files should remain in place until smoke tests and route compatibility are complete.

## 9. Validation command

```bash
node scripts/architecture/check-dashboard-automation-map.js
```

## 10. Risk matrix

| Risk                                                   | Impact                                                                                      | Likelihood | Mitigation                                                                                                            |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------- |
| Broken dashboard protected route                       | Users cannot reach dashboard pages or protected tools.                                      | High       | Keep current paths until route constants, static hosting support, and protected route smoke tests pass.               |
| Broken auth redirect                                   | Users land on wrong pages after login/logout or unauthorized access.                        | High       | Preserve `js/lib/auth.js` behavior and verify login/logout/unauthorized redirects before moving consumers.            |
| Broken role access                                     | Admin, premium, or member users get incorrect access.                                       | High       | Preserve role strings, role status values, allowed-role checks, premium access semantics, and impersonation behavior. |
| Broken Firebase/App Check initialization               | Auth, Firestore, or protected requests fail.                                                | Medium     | Do not change Firebase/App Check initialization in dashboard migration phases; isolate future package wrappers.       |
| Broken public service page                             | Marketing/service URLs break or lose assets.                                                | Medium     | Keep `/pages/*.html` routes stable; copy/mirror before delete; smoke-test public CSS/JS loading.                      |
| Broken subscription route                              | Subscription, entitlement, or account-adjacent flows break.                                 | Medium     | Treat subscription pages and member subscriptions as access-sensitive; verify route and entitlement behavior.         |
| Broken API/data contract                               | Dashboard tools, chat, projects, entitlements, or automation flows receive unexpected data. | Medium     | Add data-access wrappers before changing data sources; do not change API endpoints in route migration PRs.            |
| Duplicate boot/init logic                              | Multiple Firebase/App Check/auth initializers conflict.                                     | Medium     | Centralize only after compatibility wrappers are documented and loaded once.                                          |
| Stale route constants                                  | Constants drift from actual public/dashboard routes.                                        | Medium     | Keep route inventory and smoke-test docs synchronized with `packages/config/routes.js`.                               |
| Moving files before static hosting path support        | Static hosting cannot serve new paths or legacy links.                                      | High       | Prove hosting route support and bridge mappings before moving HTML assets.                                            |
| Hidden coupling between public pages and shared JS/CSS | Public pages render incorrectly after page or style moves.                                  | High       | Inventory script/style dependencies; move styles/scripts only after visual and route smoke tests.                     |

## 11. Relationship to existing docs

- [`folder-structure.md`](folder-structure.md)
- [`auth-config-centralization-plan.md`](auth-config-centralization-plan.md)
- [`route-constants-migration.md`](route-constants-migration.md)
- [`role-access-migration.md`](role-access-migration.md)
- [`first-auth-consumer-migration-checklist.md`](first-auth-consumer-migration-checklist.md)
- [`script-loading-compatibility-audit.md`](script-loading-compatibility-audit.md)
- [`../../apps/dashboard/README.md`](../../apps/dashboard/README.md)
- [`../../apps/web/README.md`](../../apps/web/README.md)
- [`../../packages/auth/README.md`](../../packages/auth/README.md)
- [`../../packages/config/README.md`](../../packages/config/README.md)
- [`../../packages/data-access/README.md`](../../packages/data-access/README.md)

## Phase 10A enterprise readiness note

Phase 10A adds the final enterprise migration readiness gate and runs this Dashboard + Corporate Automation map audit from `node scripts/architecture/check-enterprise-migration-readiness.js`. The Phase 9A audit remains the source of truth; no dashboard or corporate automation runtime files were moved or rewritten.

## Phase 11A dashboard route/access smoke gate note

Phase 11A creates the Dashboard route/access smoke-test gate and `scripts/architecture/check-dashboard-route-readiness.js` readiness script before any protected Dashboard runtime move. No Dashboard runtime files were moved, no Dashboard routes changed, and no auth, Firebase, App Check, public page, API, CSS, or package behavior changed in Phase 11A.

## Phase 11B protected route compatibility note

Phase 11B adds a Dashboard route compatibility map that blocks direct protected route moves until compatibility wrappers or static hosting strategy are verified. Dashboard and Corporate Automation ownership work should continue to preserve existing `/dashboard/*` public URLs, shared script paths, auth behavior, and rollback paths until the wrapper/static-hosting gate is complete.

## Phase 12A public service route compatibility note

Phase 12A adds the Public Service + Corporate Automation route compatibility map and the `scripts/architecture/check-public-service-route-map.js` audit script. Public service page runtime moves remain blocked until the route map, wrapper or mirror strategy, and page-level smoke tests prove current public URLs, links, styles, shared scripts, and contact/subscription behavior remain stable.
