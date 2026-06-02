# Current Repository Inventory

## Purpose

This document is the **Phase 1 inventory** for Teknoify's planned migration toward a cleaner domain-based architecture. It records the repository's current layout, identifies practical migration targets, and highlights risks that should be handled before moving runtime files.

**No production files were moved, renamed, deleted, or refactored in this phase.** Existing public routes, dashboard routes, package scripts, Firebase/auth behavior, and data extraction scripts remain unchanged.

This inventory should be used as a planning document for later pull requests that introduce a target folder skeleton, route-safe wrappers, shared modules, archive policy, and domain-oriented application boundaries.

## Current Repository Overview

Teknoify is currently a static multi-page application with several emerging product areas layered into the same repository. The current structure already separates some concerns, but public pages, dashboard pages, shared scripts, data assets, RAG documents, backend prototypes, and development tooling are still close together.

High-level folders and files:

- `.github/workflows/` contains GitHub Actions for currency-rate updates and stock document text extraction.
- `api/` contains chat-related JavaScript endpoints or serverless-style API handlers.
- `css/` contains global CSS, layered CSS architecture folders, page-specific styles, and dashboard/product-specific styles.
- `dashboard/` contains member/admin/premium dashboards, demos, product tools, shared dashboard scripts, product-specific backend prototypes, and geospatial/data demo assets.
- `data/` contains entitlement/project metadata, currency data, investment analytics datasets, and Turkish stock document catalogs, manifests, PDFs, extracted text, and schemas.
- `docs/` contains RAG and chatbot API/data contract documentation.
- `images/` contains project icon assets.
- `js/` contains global scripts, page-specific scripts, shared library modules, auth/config/storage helpers, utilities, and investment analytics logic.
- `pages/` contains public marketing, legal, auth, subscription, and investment-related HTML pages.
- `scripts/` contains data update, catalog generation, text extraction, and stock document search scripts.
- `tools/` contains local stylelint package shims/config packages used by npm scripts.
- Root files such as `index.html` and `reset-password.html` are public routes.
- Root configuration and documentation files include `package.json`, `package-lock.json`, `eslint.config.js`, `.prettierrc.json`, `.stylelintrc.json`, `.editorconfig`, `ARCHITECTURE.md`, `DEVELOPMENT.md`, and `CHANGELOG.md`.

## Current Architecture Observations

### What is already organized well

- The static MPA route model is clear: root pages, `pages/*`, and `dashboard/*` are directly publishable routes.
- CSS has already started moving toward a layered structure with settings, generic, elements, objects, components, and page-specific folders under `css/`.
- Shared JavaScript exists under `js/lib/`, `js/utils/`, `js/services/`, and `dashboard/shared/`, which provides natural migration candidates for future packages.
- Investment data is grouped under `data/stock/turkey/` and `data/investment-analytics/`, with manifests and schemas that can become data contracts.
- RAG/chatbot planning documents already exist in `docs/`, making future `docs/rag/`, `docs/api-contracts/`, and `docs/data-contracts/` subfolders straightforward.
- Automation scripts live in `scripts/`, while CI automation lives in `.github/workflows/`.

### What is mixed or duplicated

- Public marketing pages, product pages, dashboard pages, and backend prototypes currently live in the same repository layer instead of distinct app/domain/service layers.
- Auth and access code appears in several places: `js/lib/auth.js`, `dashboard/shared/auth.js`, `js/session-manager.js`, `js/premium-content-gate.js`, `js/pages/login.js`, `js/pages/member.js`, `js/pages/admin.js`, and `js/impersonate.js`. This creates duplicate-risk for Firebase/auth behavior.
- Styling is split between the newer layered CSS folders and older flat CSS files such as `css/style.css`, `css/dashboard.css`, `css/api.css`, and product-specific CSS files.
- Investment analytics is split across public HTML/CSS/JS, datasets, stock document catalogs, extracted text, scripts, and workflows without a single domain boundary.
- Dashboard product tools such as BIM requests, web scraping, product discovery, market analysis, and geo intelligence are mixed under `dashboard/` even though some represent future corporate automation or data-intelligence domains.
- Chatbot and RAG documents are in `docs/`, API stubs are in `api/`, RAG dependencies are in `requirements-rag.txt`, and stock extraction scripts are in `scripts/`, which makes the future RAG platform boundary implicit rather than explicit.

### Which areas are becoming too large

- `js/investment-analytics.js` is a large investment/product analytics script and should eventually be split by calculators, charts, data access, chatbot integration, and presentation orchestration.
- `dashboard/agents/product-discover/product-discover.js` and its CSS are large product-discovery application files and should eventually be modularized.
- `dashboard/bim-istekleri/index.html` and `dashboard/bim-istekleri/bim-istekleri.css` are large dashboard/product pages that should be split when that domain is migrated.
- `css/06-pages/investment-analytics/` is useful but already large enough to become a dedicated domain/page style bundle.
- `data/currency/usd_try_rates.json` is generated historical data and should be clearly marked or documented as generated.
- `data/entitlements.json` may become difficult to scale if it remains the only entitlement source for member, premium, admin, and product access.

### Public marketing pages

The root `index.html`, `reset-password.html`, and most files under `pages/` look like public web routes. These include marketing/service pages (`rpa`, `webscraping`, `api`, `ai-assistant`, training/consulting), investment landing pages, legal pages, login, subscription, and unauthorized routes.

### Dashboard and product app pages

The `dashboard/` folder contains dashboard shell pages, member/premium/admin pages, product demos, product-specific dashboards, web-scraping tools, BIM request tooling, geospatial intelligence, market analysis, and member tools. These are the strongest candidates for future `apps/dashboard/`, `apps/admin/`, and domain-specific app modules.

### Reusable shared code

Reusable candidates include `js/lib/*`, `js/utils/*`, `js/services/*`, `dashboard/shared/*`, layered component CSS under `css/05-components/`, layout primitives under `css/04-objects/`, and tokens/base CSS under `css/00-settings/` and `css/02-generic/`. These should eventually move into `packages/ui/`, `packages/auth/`, `packages/config/`, `packages/data-access/`, and `packages/utils/` after route-safe wrappers are designed.

### Data, RAG, and backend infrastructure

Data and infrastructure candidates include `data/stock/turkey/*`, `data/currency/*`, `data/projects.json`, `data/entitlements.json`, `data/investment-analytics/*`, `scripts/*`, `.github/workflows/*`, `api/*`, `requirements-rag.txt`, RAG docs under `docs/`, and backend prototypes under `dashboard/bim-istekleri/backend/` and `dashboard/web-scraping/backend/`.

## Full Inventory Table

| Current Path                                             | Type           | Current Role                                                          | Suggested Domain        | Suggested Target Path                                                       | Status         | Priority    | Notes                                                                 |
| -------------------------------------------------------- | -------------- | --------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------- | -------------- | ----------- | --------------------------------------------------------------------- |
| `index.html`                                             | page           | Root public landing page                                              | public-web              | `apps/web/index.html`                                                       | active         | P0-critical | Preserve `/` route; likely depends on global CSS/JS.                  |
| `reset-password.html`                                    | page           | Public auth password reset route                                      | auth-and-access         | `apps/web/reset-password.html` or `apps/web/auth/reset-password.html`       | active         | P0-critical | Preserve current route during migration.                              |
| `pages/ai-assistant.html`                                | page           | Public AI assistant service/product page                              | public-web              | `apps/web/pages/ai-assistant.html`                                          | active         | P1-high     | Also related to future RAG/chatbot product messaging.                 |
| `pages/api.html`                                         | page           | Public API services page                                              | corporate-automation    | `domains/corporate-automation/pages/api.html`                               | active         | P1-high     | Public URL should remain stable through wrapper/redirect.             |
| `pages/financial-indicators.html`                        | page           | Public financial indicators page                                      | investment-intelligence | `domains/investment-intelligence/pages/financial-indicators.html`           | active         | P1-high     | Likely shares investment data/chart logic.                            |
| `pages/gizlilik.html`                                    | page           | Privacy/legal page                                                    | public-web              | `apps/web/legal/gizlilik.html`                                              | active         | P1-high     | Preserve legal URL.                                                   |
| `pages/hizmet-sozlesmesi.html`                           | page           | Service agreement/legal page                                          | public-web              | `apps/web/legal/hizmet-sozlesmesi.html`                                     | active         | P1-high     | Preserve legal URL.                                                   |
| `pages/impersonate.html`                                 | page           | Impersonation/admin support page                                      | auth-and-access         | `apps/admin/impersonate.html`                                               | needs-review   | P0-critical | Sensitive route; migration should review access controls.             |
| `pages/investment-airlines.html`                         | page           | Public investment category page                                       | investment-intelligence | `domains/investment-intelligence/pages/airlines.html`                       | active         | P2-medium   | Domain naming can normalize category pages later.                     |
| `pages/investment-analytics.html`                        | page           | Investment analytics product page                                     | investment-intelligence | `domains/investment-intelligence/pages/analytics.html`                      | active         | P1-high     | Main route for analytics UI; large JS/CSS dependencies.               |
| `pages/investment-retail.html`                           | page           | Public investment retail category page                                | investment-intelligence | `domains/investment-intelligence/pages/retail.html`                         | active         | P2-medium   | Related to supermarket dataset and stock retail documents.            |
| `pages/kullanim-sartlari.html`                           | page           | Terms/legal page                                                      | public-web              | `apps/web/legal/kullanim-sartlari.html`                                     | active         | P1-high     | Preserve legal URL.                                                   |
| `pages/kvkk.html`                                        | page           | KVKK/legal page                                                       | public-web              | `apps/web/legal/kvkk.html`                                                  | active         | P1-high     | Preserve legal URL.                                                   |
| `pages/login.html`                                       | page           | Login page                                                            | auth-and-access         | `apps/web/auth/login.html`                                                  | active         | P0-critical | Do not change Firebase/auth behavior until auth centralization phase. |
| `pages/rpa.html`                                         | page           | Public RPA service page                                               | corporate-automation    | `domains/corporate-automation/pages/rpa.html`                               | active         | P1-high     | Corporate automation marketing route.                                 |
| `pages/subscription.html`                                | page           | Subscription/public pricing or plan route                             | auth-and-access         | `apps/web/subscription.html`                                                | active         | P1-high     | Tied to entitlements and premium access.                              |
| `pages/training-consulting.html`                         | page           | Public education/training consulting page                             | education               | `domains/education/pages/training-consulting.html`                          | active         | P2-medium   | Could become education domain.                                        |
| `pages/unauthorized.html`                                | page           | Unauthorized/access-denied route                                      | auth-and-access         | `apps/web/auth/unauthorized.html`                                           | active         | P0-critical | Keep stable for auth flows.                                           |
| `pages/webscraping.html`                                 | page           | Public web scraping service page                                      | corporate-automation    | `domains/corporate-automation/pages/web-scraping.html`                      | active         | P1-high     | Related to dashboard web-scraping product tools.                      |
| `dashboard/index.html`                                   | dashboard-page | Dashboard landing/shell                                               | dashboard               | `apps/dashboard/index.html`                                                 | active         | P0-critical | Preserve `/dashboard/` and `/dashboard/index.html`.                   |
| `dashboard/index.css`                                    | style          | Dashboard landing/shell styles                                        | dashboard               | `apps/dashboard/index.css`                                                  | active         | P1-high     | Could be merged with dashboard app styles later.                      |
| `dashboard/admin.html`                                   | dashboard-page | Admin dashboard page                                                  | admin                   | `apps/admin/index.html`                                                     | active         | P0-critical | Sensitive access route.                                               |
| `dashboard/analysis.html`                                | dashboard-page | Dashboard analysis page                                               | dashboard               | `apps/dashboard/analysis.html`                                              | active         | P1-high     | Legacy large page; likely needs component split in later phase.       |
| `dashboard/market-analysis.html`                         | dashboard-page | Market analysis dashboard route                                       | investment-intelligence | `domains/investment-intelligence/apps/market-analysis.html`                 | active         | P1-high     | Preserve route until wrappers are introduced.                         |
| `dashboard/market-analysis-demo.html`                    | dashboard-page | Market analysis demo route                                            | investment-intelligence | `domains/investment-intelligence/demos/market-analysis.html`                | experimental   | P2-medium   | May overlap with `dashboard/demo/market-analysis/`.                   |
| `dashboard/member.html`                                  | dashboard-page | Member dashboard page                                                 | dashboard               | `apps/dashboard/member.html`                                                | active         | P0-critical | Member route and access should remain stable.                         |
| `dashboard/premium.html`                                 | dashboard-page | Premium dashboard page                                                | dashboard               | `apps/dashboard/premium.html`                                               | active         | P0-critical | Tied to premium content gate and entitlements.                        |
| `dashboard/member/finance/index.html`                    | dashboard-page | Member finance personal tool                                          | personal-tools          | `domains/personal-tools/finance/index.html`                                 | active         | P1-high     | Also intersects investment-intelligence.                              |
| `dashboard/member/health/index.html`                     | dashboard-page | Member health personal tool placeholder/page                          | personal-tools          | `domains/personal-tools/health/index.html`                                  | active         | P2-medium   | Route preservation required.                                          |
| `dashboard/member/productivity/index.html`               | dashboard-page | Member productivity personal tool                                     | personal-tools          | `domains/personal-tools/productivity/index.html`                            | active         | P2-medium   | Route preservation required.                                          |
| `dashboard/member/subscriptions/index.html`              | dashboard-page | Member subscription management page                                   | auth-and-access         | `apps/dashboard/member/subscriptions/index.html`                            | active         | P1-high     | Related to entitlements and billing/member access.                    |
| `dashboard/shared/auth.js`                               | shared-script  | Dashboard auth helper                                                 | auth-and-access         | `packages/auth/dashboard-auth.js`                                           | duplicate-risk | P0-critical | Review against `js/lib/auth.js` before moving.                        |
| `dashboard/shared/config.js`                             | config         | Dashboard shared config                                               | shared-config           | `packages/config/dashboard-config.js`                                       | duplicate-risk | P0-critical | Avoid Firebase/config behavior changes during inventory.              |
| `dashboard/shared/profile-manager.js`                    | shared-script  | Dashboard profile/member state manager                                | auth-and-access         | `packages/auth/profile-manager.js`                                          | active         | P1-high     | Large shared dashboard module.                                        |
| `dashboard/shared/request-console.js`                    | shared-script  | Shared request/API console behavior                                   | dashboard               | `packages/ui/request-console.js`                                            | active         | P2-medium   | Could become reusable dashboard widget.                               |
| `dashboard/shared/sidebar.js`                            | shared-script  | Shared dashboard sidebar behavior                                     | shared-ui               | `packages/ui/dashboard-sidebar.js`                                          | active         | P1-high     | Route/path-sensitive due navigation links.                            |
| `dashboard/bim-istekleri/index.html`                     | dashboard-page | BIM requests dashboard/product page                                   | corporate-automation    | `domains/corporate-automation/bim-requests/index.html`                      | active         | P1-high     | Large page; do not move until route tests exist.                      |
| `dashboard/bim-istekleri/bim-istekleri.css`              | style          | BIM requests page styles                                              | corporate-automation    | `domains/corporate-automation/bim-requests/bim-requests.css`                | active         | P2-medium   | Rename only in later migration if wrappers are ready.                 |
| `dashboard/bim-istekleri/api-console.css`                | style          | BIM API console styles                                                | corporate-automation    | `domains/corporate-automation/bim-requests/api-console.css`                 | active         | P2-medium   | Could join request-console UI package.                                |
| `dashboard/bim-istekleri/config.js`                      | config         | BIM request app config                                                | corporate-automation    | `domains/corporate-automation/bim-requests/config.js`                       | active         | P1-high     | Check for secrets and endpoint coupling before moving.                |
| `dashboard/bim-istekleri/backend/main.py`                | backend        | Backend prototype for BIM requests                                    | corporate-automation    | `services/api/corporate-automation/bim-requests/main.py`                    | experimental   | P1-high     | Dashboard-local backend should move to services later.                |
| `dashboard/bim-istekleri/backend/requirements.txt`       | config         | Python backend dependencies                                           | corporate-automation    | `services/api/corporate-automation/bim-requests/requirements.txt`           | experimental   | P2-medium   | Keep paired with backend service.                                     |
| `dashboard/bim-istekleri/backend/.env.example`           | config         | Backend environment example                                           | corporate-automation    | `services/api/corporate-automation/bim-requests/.env.example`               | experimental   | P2-medium   | Review deployment/secrets convention.                                 |
| `dashboard/bim-istekleri/backend/deploy.sh`              | script         | Backend deployment script                                             | deployment              | `scripts/maintenance/deploy-bim-requests.sh`                                | experimental   | P2-medium   | Deployment scripts should be centralized later.                       |
| `dashboard/web-scraping/backend/main.py`                 | backend        | Backend prototype for web scraping product                            | corporate-automation    | `services/api/corporate-automation/web-scraping/main.py`                    | experimental   | P1-high     | Service boundary candidate.                                           |
| `dashboard/web-scraping/backend/requirements.txt`        | config         | Web scraping backend dependencies                                     | corporate-automation    | `services/api/corporate-automation/web-scraping/requirements.txt`           | experimental   | P2-medium   | Keep with backend service.                                            |
| `dashboard/web-scraping/backend/.env.example`            | config         | Web scraping backend env example                                      | corporate-automation    | `services/api/corporate-automation/web-scraping/.env.example`               | experimental   | P2-medium   | Review before service migration.                                      |
| `dashboard/web-scraping/backend/deploy.sh`               | script         | Web scraping backend deploy script                                    | deployment              | `scripts/maintenance/deploy-web-scraping.sh`                                | experimental   | P2-medium   | Deployment convention needed.                                         |
| `dashboard/web-scraping/clothes/index.html`              | dashboard-page | Clothes scraping dashboard page                                       | corporate-automation    | `domains/corporate-automation/web-scraping/clothes/index.html`              | active         | P1-high     | Route preservation required.                                          |
| `dashboard/web-scraping/clothes/config.js`               | config         | Clothes scraping app config                                           | corporate-automation    | `domains/corporate-automation/web-scraping/clothes/config.js`               | active         | P2-medium   | Domain-specific config.                                               |
| `dashboard/web-scraping/food/index.html`                 | dashboard-page | Food scraping dashboard page                                          | corporate-automation    | `domains/corporate-automation/web-scraping/food/index.html`                 | active         | P1-high     | Route preservation required.                                          |
| `dashboard/web-scraping/food/config.js`                  | config         | Food scraping app config                                              | corporate-automation    | `domains/corporate-automation/web-scraping/food/config.js`                  | active         | P2-medium   | Domain-specific config.                                               |
| `dashboard/web-scraping/quickcommerce/index.html`        | dashboard-page | Quickcommerce scraping dashboard page                                 | corporate-automation    | `domains/corporate-automation/web-scraping/quickcommerce/index.html`        | active         | P1-high     | Route preservation required.                                          |
| `dashboard/web-scraping/quickcommerce/config.js`         | config         | Quickcommerce scraping app config                                     | corporate-automation    | `domains/corporate-automation/web-scraping/quickcommerce/config.js`         | active         | P2-medium   | Domain-specific config.                                               |
| `dashboard/web-scraping/*/.gitkeep`                      | unknown        | Placeholder files for empty scrape categories                         | corporate-automation    | `domains/corporate-automation/web-scraping/*/.gitkeep`                      | needs-review   | P3-low      | Keep only if empty folder placeholders are still useful.              |
| `dashboard/agents/product-discover/index.html`           | dashboard-page | Product discovery agent dashboard                                     | corporate-automation    | `domains/corporate-automation/product-discover/index.html`                  | experimental   | P1-high     | Agent/product app route.                                              |
| `dashboard/agents/product-discover/product-discover.js`  | script         | Product discovery agent behavior                                      | corporate-automation    | `domains/corporate-automation/product-discover/product-discover.js`         | experimental   | P1-high     | Large script; split later by data, UI, state, API.                    |
| `dashboard/agents/product-discover/product-discover.css` | style          | Product discovery page styles                                         | corporate-automation    | `domains/corporate-automation/product-discover/product-discover.css`        | experimental   | P2-medium   | Large CSS; componentize later.                                        |
| `dashboard/agents/css/agent-main.css`                    | style          | Agent dashboard CSS entry                                             | shared-ui               | `packages/ui/agents/agent-main.css`                                         | active         | P2-medium   | Shared agent UI candidate.                                            |
| `dashboard/agents/css/04-objects/grid.css`               | style          | Agent grid layout primitive                                           | shared-ui               | `packages/ui/objects/grid.css`                                              | active         | P2-medium   | Could merge with UI package layout primitives.                        |
| `dashboard/agents/css/05-components/*.css`               | style          | Agent components such as chat widget, widgets, scorecards             | shared-ui               | `packages/ui/components/agents/`                                            | active         | P2-medium   | Grouped component inventory row.                                      |
| `dashboard/agents/css/06-pages/product-discover.css`     | style          | Product-discover page-specific agent style                            | corporate-automation    | `domains/corporate-automation/product-discover/styles.css`                  | active         | P2-medium   | Page-specific style.                                                  |
| `dashboard/demo/market-analysis/index.html`              | dashboard-page | Market analysis demo page                                             | investment-intelligence | `domains/investment-intelligence/demos/market-analysis/index.html`          | experimental   | P2-medium   | Demo may need archive criteria.                                       |
| `dashboard/demo/market-analysis/market-analysis.css`     | style          | Demo market analysis styles                                           | investment-intelligence | `domains/investment-intelligence/demos/market-analysis/market-analysis.css` | experimental   | P3-low      | Demo-specific style.                                                  |
| `dashboard/demo/market-analysis/fatih-markets.geojson`   | data           | Demo geospatial market data                                           | data-platform           | `data/public-datasets/geo/fatih-markets.geojson`                            | experimental   | P2-medium   | Could become public dataset or mock.                                  |
| `dashboard/geo-intelligence/index.html`                  | dashboard-page | Geo intelligence dashboard page                                       | investment-intelligence | `domains/investment-intelligence/geo-intelligence/index.html`               | experimental   | P2-medium   | Route and dataset coupling should be tested.                          |
| `dashboard/geo-intelligence/istanbul-ultimate.geojson`   | data           | Geo intelligence dataset                                              | data-platform           | `data/public-datasets/geo/istanbul-ultimate.geojson`                        | active         | P2-medium   | Large data asset candidate.                                           |
| `css/style.css`                                          | style          | Global CSS manifest/shared stylesheet                                 | shared-ui               | `packages/ui/style.css`                                                     | legacy-active  | P0-critical | Public pages likely depend on this path.                              |
| `css/00-settings/tokens.css`                             | style          | Design tokens                                                         | shared-ui               | `packages/ui/tokens.css`                                                    | active         | P1-high     | Good package candidate.                                               |
| `css/02-generic/base.css`                                | style          | Base/global CSS                                                       | shared-ui               | `packages/ui/base.css`                                                      | active         | P1-high     | Shared UI foundation.                                                 |
| `css/03-elements/forms-buttons.css`                      | style          | Element-level form/button styles                                      | shared-ui               | `packages/ui/elements/forms-buttons.css`                                    | active         | P2-medium   | Shared UI foundation.                                                 |
| `css/04-objects/layout.css`                              | style          | Layout primitives                                                     | shared-ui               | `packages/ui/objects/layout.css`                                            | active         | P2-medium   | Shared UI foundation.                                                 |
| `css/05-components/*.css`                                | style          | Shared components such as nav, footer, cards, buttons, tables, modals | shared-ui               | `packages/ui/components/`                                                   | active         | P1-high     | Grouped component row; path-sensitive CSS imports.                    |
| `css/06-pages/home.css`                                  | style          | Home page-specific styles                                             | public-web              | `apps/web/styles/home.css`                                                  | active         | P2-medium   | Keep route path stable until CSS migration planned.                   |
| `css/06-pages/dashboard-portal.css`                      | style          | Dashboard portal styles                                               | dashboard               | `apps/dashboard/styles/portal.css`                                          | active         | P2-medium   | Dashboard-specific style.                                             |
| `css/06-pages/dashboard/*.css`                           | style          | Dashboard page partial styles                                         | dashboard               | `apps/dashboard/styles/`                                                    | active         | P2-medium   | Already organized as page partials.                                   |
| `css/06-pages/analysis/*.css`                            | style          | Analysis page partial styles                                          | dashboard               | `apps/dashboard/analysis/styles/`                                           | active         | P2-medium   | Good future split candidate.                                          |
| `css/06-pages/investment-analytics/*.css`                | style          | Investment analytics partial styles                                   | investment-intelligence | `domains/investment-intelligence/analytics/styles/`                         | active         | P1-high     | Large page style bundle.                                              |
| `css/ai-assistant.css`                                   | style          | AI assistant page styles                                              | public-web              | `apps/web/styles/ai-assistant.css`                                          | active         | P2-medium   | May later move to RAG product domain.                                 |
| `css/analysis.css`                                       | style          | Analysis styles                                                       | dashboard               | `apps/dashboard/analysis.css`                                               | legacy-active  | P2-medium   | Check overlap with `css/06-pages/analysis/`.                          |
| `css/api.css`                                            | style          | API public page styles                                                | corporate-automation    | `domains/corporate-automation/pages/api.css`                                | active         | P2-medium   | Service page style.                                                   |
| `css/dashboard.css`                                      | style          | General dashboard styles                                              | dashboard               | `apps/dashboard/dashboard.css`                                              | legacy-active  | P1-high     | Check overlap with dashboard partials.                                |
| `css/financial-indicators.css`                           | style          | Financial indicators page styles                                      | investment-intelligence | `domains/investment-intelligence/financial-indicators/styles.css`           | active         | P2-medium   | Investment domain style.                                              |
| `css/investment-analytics.css`                           | style          | Investment analytics top-level stylesheet                             | investment-intelligence | `domains/investment-intelligence/analytics/index.css`                       | active         | P1-high     | May import partials or duplicate them; review before moving.          |
| `css/request-control.css`                                | style          | Request/control UI styles                                             | dashboard               | `packages/ui/request-control.css`                                           | active         | P2-medium   | Shared dashboard widget candidate.                                    |
| `css/rpa.css`                                            | style          | RPA page styles                                                       | corporate-automation    | `domains/corporate-automation/pages/rpa.css`                                | active         | P2-medium   | Public service page style.                                            |
| `css/training-consulting.css`                            | style          | Training/consulting page styles                                       | education               | `domains/education/pages/training-consulting.css`                           | active         | P2-medium   | Education/service page style.                                         |
| `css/webscraping.css`                                    | style          | Web scraping public page styles                                       | corporate-automation    | `domains/corporate-automation/pages/web-scraping.css`                       | active         | P2-medium   | Public service page style.                                            |
| `js/script.js`                                           | shared-script  | Global public page orchestrator                                       | public-web              | `apps/web/scripts/script.js`                                                | legacy-active  | P0-critical | Global behavior; moving can break many pages.                         |
| `js/cookies.js`                                          | shared-script  | Cookie/banner behavior                                                | shared-ui               | `packages/ui/cookies.js`                                                    | active         | P2-medium   | Shared public UI behavior.                                            |
| `js/session-manager.js`                                  | shared-script  | Session handling                                                      | auth-and-access         | `packages/auth/session-manager.js`                                          | duplicate-risk | P0-critical | Review with auth modules before changing.                             |
| `js/premium-content-gate.js`                             | shared-script  | Premium content gating                                                | auth-and-access         | `packages/auth/premium-content-gate.js`                                     | active         | P0-critical | Entitlement-sensitive.                                                |
| `js/impersonate.js`                                      | script         | Impersonation behavior                                                | admin                   | `apps/admin/impersonate.js`                                                 | needs-review   | P0-critical | Security-sensitive.                                                   |
| `js/finance.js`                                          | script         | Finance/member tool behavior                                          | personal-tools          | `domains/personal-tools/finance/finance.js`                                 | active         | P1-high     | Could share chart/data utilities later.                               |
| `js/investment-analytics.js`                             | script         | Investment analytics UI/calculator/chart/chatbot logic                | investment-intelligence | `domains/investment-intelligence/analytics/investment-analytics.js`         | active         | P1-high     | Large script; split later.                                            |
| `js/lib/auth.js`                                         | shared-script  | Public/shared auth helper                                             | auth-and-access         | `packages/auth/auth.js`                                                     | duplicate-risk | P0-critical | Compare to dashboard auth helper before centralization.               |
| `js/lib/data.js`                                         | shared-script  | Shared data helper                                                    | data-platform           | `packages/data-access/data.js`                                              | active         | P1-high     | Candidate for data-access package.                                    |
| `js/lib/firebase.js`                                     | config         | Firebase initialization/config helper                                 | shared-config           | `packages/config/firebase.js`                                               | duplicate-risk | P0-critical | Do not change Firebase config behavior in this phase.                 |
| `js/lib/nav.js`                                          | shared-script  | Shared navigation helper                                              | shared-ui               | `packages/ui/nav.js`                                                        | active         | P1-high     | Path/route-sensitive.                                                 |
| `js/lib/storage.js`                                      | shared-script  | Shared storage helper                                                 | shared-config           | `packages/utils/storage.js`                                                 | active         | P2-medium   | Utility package candidate.                                            |
| `js/pages/admin.js`                                      | script         | Admin page behavior                                                   | admin                   | `apps/admin/admin.js`                                                       | active         | P0-critical | Access-sensitive.                                                     |
| `js/pages/common.js`                                     | shared-script  | Shared page behavior                                                  | shared-ui               | `packages/ui/pages/common.js`                                               | active         | P1-high     | Shared page module.                                                   |
| `js/pages/dashboard.js`                                  | script         | Dashboard page behavior                                               | dashboard               | `apps/dashboard/dashboard.js`                                               | active         | P1-high     | Route/path-sensitive.                                                 |
| `js/pages/home.js`                                       | script         | Home page behavior                                                    | public-web              | `apps/web/scripts/home.js`                                                  | active         | P2-medium   | Public page script.                                                   |
| `js/pages/login.js`                                      | script         | Login page behavior                                                   | auth-and-access         | `apps/web/auth/login.js`                                                    | active         | P0-critical | Auth-sensitive.                                                       |
| `js/pages/member.js`                                     | script         | Member page behavior                                                  | dashboard               | `apps/dashboard/member.js`                                                  | active         | P0-critical | Access/entitlement-sensitive.                                         |
| `js/pages/unauthorized.js`                               | script         | Unauthorized page behavior                                            | auth-and-access         | `apps/web/auth/unauthorized.js`                                             | active         | P1-high     | Auth flow support.                                                    |
| `js/services/exchange-rate-service.js`                   | shared-script  | Exchange rate service client                                          | data-platform           | `packages/data-access/exchange-rate-service.js`                             | active         | P1-high     | Depends on currency data path.                                        |
| `js/utils/dom.js`                                        | shared-script  | DOM utility helpers                                                   | shared-ui               | `packages/utils/dom.js`                                                     | active         | P2-medium   | Utility package candidate.                                            |
| `js/utils/ids.js`                                        | shared-script  | ID utility helpers                                                    | shared-config           | `packages/utils/ids.js`                                                     | active         | P2-medium   | Utility package candidate.                                            |
| `api/chat.js`                                            | backend        | Chat API/serverless handler                                           | rag-platform            | `services/api/chat.js`                                                      | experimental   | P1-high     | Clarify production vs mock contract.                                  |
| `api/chat-log.js`                                        | backend        | Chat query logging API/serverless handler                             | rag-platform            | `services/api/chat-log.js`                                                  | experimental   | P1-high     | Logging/privacy review needed.                                        |
| `data/projects.json`                                     | data           | Project/product metadata                                              | data-platform           | `data/projects/projects.json`                                               | active         | P1-high     | Could become product/project catalog.                                 |
| `data/entitlements.json`                                 | data           | Access/plan entitlement metadata                                      | auth-and-access         | `data/entitlements/entitlements.json`                                       | active         | P0-critical | Scaling risk if kept as one JSON indefinitely.                        |
| `data/currency/usd_try_rates.json`                       | data           | USD/TRY exchange-rate history                                         | data-platform           | `data/investment/currency/usd-try-rates.json`                               | generated      | P1-high     | Generated output; needs clear generated marker/README.                |
| `data/investment-analytics/supermarket_dataset.json`     | data           | Investment analytics supermarket dataset                              | investment-intelligence | `data/investment/retail/supermarket-dataset.json`                           | active         | P1-high     | Domain dataset; check schema/versioning later.                        |
| `data/stock/turkey/README.md`                            | docs           | Turkish stock data README                                             | data-platform           | `docs/data-contracts/stock/turkey/readme.md`                                | active         | P2-medium   | Could remain near data if README documents dataset.                   |
| `data/stock/turkey/document-catalog.json`                | data           | Stock document catalog                                                | data-platform           | `data/investment/stock/turkey/document-catalog.json`                        | generated      | P1-high     | Generated by catalog script.                                          |
| `data/stock/turkey/text-extraction-catalog.json`         | data           | Extracted text catalog                                                | rag-platform            | `data/investment/stock/turkey/text-extraction-catalog.json`                 | generated      | P1-high     | Generated by text extraction workflow/script.                         |
| `data/stock/turkey/manifest.schema.json`                 | data           | Stock manifest schema                                                 | data-platform           | `docs/data-contracts/stock/turkey/manifest.schema.json`                     | active         | P1-high     | Schema can become data contract.                                      |
| `data/stock/turkey/*/manifest.json`                      | data           | Company stock document manifests                                      | data-platform           | `data/investment/stock/turkey/{ticker}/manifest.json`                       | active         | P1-high     | Keep path stable until scripts are updated.                           |
| `data/stock/turkey/*/README.md`                          | docs           | Company-specific stock data README files                              | data-platform           | `docs/data-contracts/stock/turkey/{ticker}.md`                              | active         | P3-low      | Could remain colocated with company data.                             |
| `data/stock/turkey/*/financial-statements/.gitkeep`      | unknown        | Empty financial statements placeholders                               | data-platform           | `data/investment/stock/turkey/{ticker}/financial-statements/.gitkeep`       | needs-review   | P3-low      | Placeholder-only folders.                                             |
| `data/stock/turkey/*/investor-presentations/.gitkeep`    | unknown        | Empty investor presentation placeholders                              | data-platform           | `data/investment/stock/turkey/{ticker}/investor-presentations/.gitkeep`     | needs-review   | P3-low      | Placeholder-only folders.                                             |
| `data/stock/turkey/*/reports/*.pdf`                      | asset          | Stock report PDFs                                                     | investment-intelligence | `data/investment/stock/turkey/{ticker}/reports/`                            | active         | P1-high     | Source documents for extraction/RAG.                                  |
| `data/stock/turkey/extracted-text/*.json`                | data           | Extracted text for stock report documents                             | rag-platform            | `data/investment/stock/turkey/extracted-text/`                              | generated      | P1-high     | Generated RAG/document-processing output.                             |
| `docs/api-contracts/chatbot-api-contract.md`             | docs           | Chatbot API contract                                                  | rag-platform            | `docs/api-contracts/chatbot-api-contract.md`                                | active         | P1-high     | Contract docs moved before runtime files.                             |
| `docs/api-contracts/chatbot-query-logging-contract.md`   | docs           | Chatbot query logging contract                                        | rag-platform            | `docs/api-contracts/chatbot-query-logging-contract.md`                      | active         | P1-high     | Important for privacy/logging expectations.                           |
| `docs/rag/rag-document-index-schema.md`                  | docs           | RAG document index schema                                             | rag-platform            | `docs/rag/rag-document-index-schema.md`                                     | active         | P1-high     | RAG documentation moved before runtime files.                         |
| `docs/rag/rag-local-retrieval.md`                        | docs           | RAG local retrieval design                                            | rag-platform            | `docs/rag/rag-local-retrieval.md`                                           | active         | P2-medium   | RAG implementation design.                                            |
| `docs/rag/rag-pipeline-design.md`                        | docs           | RAG pipeline design                                                   | rag-platform            | `docs/rag/rag-pipeline-design.md`                                           | active         | P1-high     | Future service/worker guidance.                                       |
| `docs/rag/rag-text-extraction.md`                        | docs           | RAG text extraction documentation                                     | rag-platform            | `docs/rag/rag-text-extraction.md`                                           | active         | P1-high     | Related to extraction scripts/workflows.                              |
| `docs/architecture/current-inventory.md`                 | docs           | Phase 1 repository inventory                                          | docs                    | `docs/architecture/current-inventory.md`                                    | active         | P1-high     | New document created in this phase.                                   |
| `ARCHITECTURE.md`                                        | docs           | Lightweight architecture entrypoint                                   | docs                    | `docs/architecture/current-inventory.md`                                    | active         | P1-high     | Static MPA notes are historical; current direction is domain-based.   |
| `DEVELOPMENT.md`                                         | docs           | Lightweight developer setup entrypoint                                | docs                    | `docs/deployment/local-development.md`                                      | active         | P1-high     | Detailed command reference moved to deployment docs.                  |
| `CHANGELOG.md`                                           | docs           | Project changelog                                                     | docs                    | `docs/product/changelog.md`                                                 | active         | P2-medium   | Could remain root depending release policy.                           |
| `scripts/update-usd-try-rates.mjs`                       | script         | Node currency data updater                                            | data-platform           | `scripts/data/update-usd-try-rates.mjs`                                     | active         | P1-high     | Do not change path until workflows/package scripts update.            |
| `scripts/update-usd-try-rates.py`                        | script         | Python currency data updater                                          | data-platform           | `scripts/data/update-usd-try-rates.py`                                      | active         | P2-medium   | Potential duplicate implementation with Node script.                  |
| `scripts/build-stock-document-catalog.mjs`               | script         | Builds stock document catalog                                         | data-platform           | `scripts/data/build-stock-document-catalog.mjs`                             | active         | P1-high     | Depends on old `data/stock/turkey` paths.                             |
| `scripts/extract-stock-document-text.py`                 | script         | Extracts text from stock report PDFs                                  | rag-platform            | `scripts/rag/extract-stock-document-text.py`                                | active         | P1-high     | Path-sensitive RAG/document-processing script.                        |
| `scripts/search-stock-document-text.mjs`                 | script         | Searches extracted stock document text                                | rag-platform            | `scripts/rag/search-stock-document-text.mjs`                                | active         | P2-medium   | RAG utility; may become developer tool or API support.                |
| `.github/workflows/update-usd-try-rates.yml`             | workflow       | Scheduled/manual currency update workflow                             | deployment              | `.github/workflows/update-usd-try-rates.yml`                                | active         | P1-high     | Update only after script/data path migration.                         |
| `.github/workflows/extract-stock-document-text.yml`      | workflow       | Stock document text extraction workflow                               | deployment              | `.github/workflows/extract-stock-document-text.yml`                         | active         | P1-high     | Update only after script/data path migration.                         |
| `package.json`                                           | config         | npm scripts, dependencies, package metadata                           | shared-config           | `package.json`                                                              | active         | P0-critical | Constraint: do not change package scripts in this task.               |
| `package-lock.json`                                      | config         | npm dependency lockfile                                               | shared-config           | `package-lock.json`                                                         | active         | P0-critical | Do not edit unless dependencies change in a future task.              |
| `eslint.config.js`                                       | config         | JavaScript lint config                                                | shared-config           | `packages/config/eslint.config.js` or root config                           | active         | P1-high     | Root config may remain for tooling.                                   |
| `.stylelintrc.json`                                      | config         | CSS lint config                                                       | shared-config           | `.stylelintrc.json`                                                         | active         | P1-high     | Root config may remain for tooling.                                   |
| `.prettierrc.json`                                       | config         | Prettier config                                                       | shared-config           | `.prettierrc.json`                                                          | active         | P1-high     | Root config may remain for tooling.                                   |
| `.prettierignore`                                        | config         | Prettier ignore rules                                                 | shared-config           | `.prettierignore`                                                           | active         | P1-high     | Root config may remain for tooling.                                   |
| `.editorconfig`                                          | config         | Editor formatting defaults                                            | shared-config           | `.editorconfig`                                                             | active         | P2-medium   | Root config may remain.                                               |
| `requirements-rag.txt`                                   | config         | Python RAG dependency list                                            | rag-platform            | `services/rag-workers/requirements.txt`                                     | active         | P1-high     | Move only when RAG worker structure exists.                           |
| `tools/stylelint/`                                       | tool           | Local stylelint package shim                                          | dev-tools               | `tools/stylelint/`                                                          | active         | P1-high     | Required by `package.json` file dependency.                           |
| `tools/stylelint-config-standard/`                       | tool           | Local stylelint config shim                                           | dev-tools               | `tools/stylelint-config-standard/`                                          | active         | P1-high     | Required by `package.json` file dependency.                           |
| `images/projects/*.png`                                  | asset          | Project icon assets                                                   | public-web              | `apps/web/assets/projects/`                                                 | active         | P2-medium   | Asset folders can be summarized; preserve relative references.        |
| `node_modules/`                                          | unknown        | Installed dependencies, untracked in current workspace                | dev-tools               | Not a repository target                                                     | generated      | P3-low      | Should not be inventoried as source or committed.                     |

## Domain Mapping Proposal

Future target architecture reference:

```text
apps/
  web/
  dashboard/
  admin/

domains/
  corporate-automation/
  personal-tools/
  investment-intelligence/
  education/

packages/
  ui/
  auth/
  config/
  charts/
  data-access/
  utils/

services/
  api/
  rag-workers/
  scraping-workers/
  scheduled-jobs/
  document-processing/

data/
  investment/
  projects/
  entitlements/
  public-datasets/
  mock/

docs/
  architecture/
  product/
  api-contracts/
  data-contracts/
  rag/
  security/
  deployment/
  decisions/

scripts/
  migration/
  data/
  rag/
  maintenance/

_archive/
  yyyy-mm-reason/
```

Recommended mapping from current areas:

- `index.html`, most `pages/*`, public legal pages, and public marketing assets should map to `apps/web/`.
- `dashboard/index.html`, `dashboard/member.html`, `dashboard/premium.html`, `dashboard/analysis.html`, and dashboard shell assets should map to `apps/dashboard/`.
- `dashboard/admin.html`, `pages/impersonate.html`, `js/pages/admin.js`, and `js/impersonate.js` should map to `apps/admin/` after access-control review.
- Corporate service pages and product dashboards such as RPA, API services, web scraping, BIM requests, and product discovery should map to `domains/corporate-automation/`.
- Member finance, health, productivity, and subscription tools should map to `domains/personal-tools/`, with subscription/access pieces also coordinated with `packages/auth/` and `data/entitlements/`.
- Investment analytics, market analysis, financial indicators, stock documents, extracted report text, geospatial market intelligence, and investment category pages should map to `domains/investment-intelligence/` and `data/investment/`.
- Training and consulting routes can map to `domains/education/` if education becomes a durable product domain.
- `css/00-settings/`, `css/02-generic/`, `css/03-elements/`, `css/04-objects/`, `css/05-components/`, `dashboard/agents/css/05-components/`, and reusable dashboard widgets should map to `packages/ui/`.
- `js/lib/auth.js`, `dashboard/shared/auth.js`, `js/session-manager.js`, `js/premium-content-gate.js`, login/member/admin auth logic, and entitlement helpers should map to `packages/auth/` after duplicate logic is reconciled.
- `js/lib/firebase.js`, `dashboard/shared/config.js`, `.prettierrc.json`, `.stylelintrc.json`, `eslint.config.js`, and shared ID/config conventions should map to root configuration or `packages/config/` depending on build/tooling decisions.
- `js/services/exchange-rate-service.js`, `js/lib/data.js`, stock catalogs, currency data, and project datasets should map to `packages/data-access/` and `data/*`.
- Chart/calculator-specific investment visualization code should eventually map to `packages/charts/` or domain-local chart modules depending reuse.
- `api/chat.js`, `api/chat-log.js`, `requirements-rag.txt`, stock text extraction scripts, RAG docs, and extracted document text should map to `services/api/`, `services/rag-workers/`, `services/document-processing/`, `docs/rag/`, and `data/investment/`.
- `.github/workflows/*` should remain in `.github/workflows/` but be documented under `docs/deployment/` and updated only when paths are migrated.
- `scripts/update-usd-try-rates.*`, `scripts/build-stock-document-catalog.mjs`, `scripts/extract-stock-document-text.py`, and `scripts/search-stock-document-text.mjs` should map to `scripts/data/` or `scripts/rag/` after package scripts and workflows are updated.
- Legacy demos, obsolete generated outputs, and unused placeholder folders should only move to `_archive/yyyy-mm-reason/` after an archive policy and route-safety checks exist.

## Migration Risks

- **Broken relative paths after moving HTML/CSS/JS:** Current pages likely reference `../css/...`, `../js/...`, dashboard-local files, and root-relative routes. Moves should be preceded by an import/reference map and followed by link checks.
- **Duplicate Firebase/auth logic:** Auth code appears in root JS libraries, dashboard shared modules, page modules, and premium/member gates. Centralization can accidentally alter sign-in, reset-password, unauthorized, impersonation, member, premium, or admin behavior.
- **Dashboard routes breaking:** Existing `dashboard/*` URLs are likely bookmarked or linked from navigation. Route wrappers or redirects should be tested before moving dashboard pages.
- **Data scripts depending on old `data/stock/turkey` paths:** Catalog generation, extraction, search, and workflows likely assume current data paths. Update scripts and workflows together in a path migration PR.
- **Public pages depending on global CSS/JS:** Public pages likely depend on `css/style.css` and `js/script.js`; moving either can break navigation, modals, cookies, forms, or page effects.
- **Generated files accidentally edited manually:** Currency rates, stock document catalogs, extracted text catalogs, and extracted text JSON need generated-file markers or README notes so future contributors do not edit them manually.
- **Mock API contracts being mistaken for production APIs:** Chatbot/RAG API contracts and `api/*` handlers should clearly distinguish production, experimental, mock, and local-only behavior.
- **Large investment analytics scripts becoming hard to maintain:** `js/investment-analytics.js` should be split into calculators, chart adapters, data access, chatbot/RAG integration, state management, and UI rendering in later phases.
- **Product entitlement data becoming hard to scale if kept in one JSON forever:** `data/entitlements.json` may work now, but member, premium, admin, products, subscriptions, and enterprise entitlements will need schema/versioning and possibly server-side enforcement.
- **Backend prototypes remaining under dashboard folders:** Dashboard-local Python services can blur frontend/backend ownership and deployment boundaries.
- **Archive decisions causing accidental data loss:** Demo pages, placeholder folders, and generated outputs should not be archived until ownership, retention, and regeneration paths are documented.

## Recommended Migration Order

1. **Phase 1: Inventory only**
    - Create this inventory document.
    - Do not move, rename, delete, or refactor runtime files.
    - Capture route, data, auth, and tooling risks.
2. **Phase 2: Create empty target folder skeleton**
    - Add empty or README-backed target folders for `apps/`, `domains/`, `packages/`, `services/`, expanded `docs/`, `scripts/`, and `_archive/`.
    - Keep all runtime files in place.
3. **Phase 3: Move documentation into docs subfolders**
    - Move only documentation first because it has the lowest runtime risk.
    - Add redirects/links from root docs if needed.
4. **Phase 4: Centralize auth/config modules**
    - Inventory duplicated auth/config behavior in detail.
    - Create `packages/auth/` and `packages/config/` modules behind compatibility wrappers.
    - Preserve Firebase configuration and login/member/admin behavior.
5. **Phase 5: Create investment-intelligence domain structure**
    - Create domain folders for analytics, financial indicators, market analysis, stock documents, RAG support, and datasets.
    - Update data scripts only when package scripts and workflows are updated in the same PR.
6. **Phase 6: Create corporate-automation domain structure**
    - Create domain folders for RPA, API services, web scraping, BIM requests, and product discovery.
    - Separate backend prototypes into `services/api/` or `services/scraping-workers/` with deployment notes.
7. **Phase 7: Move dashboard shared code**
    - Move sidebar, profile manager, request console, dashboard widgets, and shared dashboard CSS through compatibility wrappers.
    - Run route and access checks after every movement batch.
8. **Phase 8: Add archive policy**
    - Define archive criteria, naming convention, retention rules, and generated-output handling.
    - Move only confirmed obsolete demos/placeholders to `_archive/yyyy-mm-reason/`.
9. **Phase 9: Add tests/checks for route and path safety**
    - Add link/path checks for HTML, CSS imports, JS modules, workflow script paths, generated data paths, and dashboard navigation.
    - Include auth smoke checks for login, unauthorized, member, premium, admin, reset-password, and impersonation flows.

## Route Preservation Notes

Public URLs should not break during the migration. Existing routes such as `/`, `/reset-password.html`, `pages/*`, and `dashboard/*` should remain stable unless a later PR introduces carefully tested thin wrappers or redirects.

Recommended route-safety rules:

- Keep current HTML files in place until replacement routes are verified.
- If a page moves to `apps/` or `domains/`, leave a compatibility wrapper at the old path that loads or redirects to the new route only after testing.
- Do not change navigation URLs and auth redirects in the same PR as a large file move unless route tests cover them.
- Treat dashboard, member, premium, admin, unauthorized, reset-password, and impersonation routes as P0-critical.
- Verify CSS, JS, image, GeoJSON, JSON, PDF, and module import paths after every migration batch.
- Coordinate workflow and package-script path changes with script/data moves in the same PR.

## File Naming and Folder Naming Conventions

Recommended conventions for future migration PRs:

- Folders: `kebab-case`.
- HTML files: `kebab-case.html`.
- JS files: `kebab-case.js`.
- CSS files: `kebab-case.css`.
- JSON ids: `snake_case`.
- Docs: `kebab-case.md`.
- Generated outputs must include a comment when the format supports comments, or a colocated `README.md` explaining that the files are generated, how to regenerate them, and which scripts/workflows own them.
- Domain names should be stable business capabilities, not temporary feature names.
- Keep compatibility wrappers small and clearly marked when old public routes are preserved.

## Next Action Checklist

For the next PR:

- [ ] Create empty target folders.
- [ ] Add `docs/architecture/folder-structure.md`.
- [ ] Add `docs/decisions/ADR-0001-domain-based-structure.md`.
- [ ] Do not move runtime files yet.
- [ ] Prepare path migration map.
