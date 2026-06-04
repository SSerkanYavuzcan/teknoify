# Target Folder Structure

## 1. Purpose

This document defines the Phase 2 target folder skeleton for Teknoify's domain-based architecture refactor. It gives future migration pull requests a shared destination map without moving any current runtime files.

Phase 2 is intentionally documentation-only. The new folders contain README files that describe future ownership, but existing HTML, CSS, JavaScript, Python, JSON data, workflow, Firebase/auth, dashboard, API/mock, package script, and data extraction paths remain unchanged.

## 2. Full target tree

```text
.
├── apps/
│   ├── web/
│   ├── dashboard/
│   └── admin/
├── domains/
│   ├── corporate-automation/
│   ├── personal-tools/
│   ├── investment-intelligence/
│   └── education/
├── packages/
│   ├── ui/
│   ├── auth/
│   ├── config/
│   ├── charts/
│   ├── data-access/
│   └── utils/
├── services/
│   ├── api/
│   ├── rag-workers/
│   ├── scraping-workers/
│   ├── scheduled-jobs/
│   └── document-processing/
├── data/
│   ├── investment/
│   ├── projects/
│   ├── entitlements/
│   ├── public-datasets/
│   └── mock/
├── docs/
│   ├── architecture/
│   ├── product/
│   ├── api-contracts/
│   ├── data-contracts/
│   ├── rag/
│   ├── security/
│   ├── deployment/
│   └── decisions/
├── scripts/
│   ├── migration/
│   ├── data/
│   ├── rag/
│   └── maintenance/
└── _archive/
```

Each folder in this tree should contain documentation before runtime migration begins so ownership and review scope are clear.

## 3. Responsibility of each top-level folder

### `apps/`

Contains user-facing application surfaces. Future apps include the public website, authenticated dashboard, and admin surfaces. App folders should own route composition and app-specific wiring only after route preservation is planned.

### `domains/`

Contains business and product domains. Domain folders should own product-specific business rules, models, feature documentation, and domain modules that can be reused by apps or services.

### `packages/`

Contains reusable shared modules. Packages should expose stable, cross-cutting APIs for UI, auth, config, charts, data access, and utilities without owning app routes or domain-specific product behavior.

### `services/`

Contains backend, API, and worker-style responsibilities. Services should own backend handlers, RAG workers, scraping workers, scheduled jobs, and document-processing infrastructure after dedicated migration PRs.

### `data/`

Contains organized datasets, data contracts, generated-data conventions, mocks, and future domain-aligned data locations. Existing path-sensitive data remains where it is until a dedicated migration updates all consumers safely.

### `docs/`

Contains architecture, product, API contract, data contract, RAG, security, deployment, and decision documentation. Documentation should move before runtime files whenever it reduces migration ambiguity.

### `scripts/`

Contains future organized script categories for migration, data, RAG, and maintenance scripts. Existing scripts must not move until package scripts, workflows, and path assumptions are updated in a reviewed migration PR.

### `_archive/`

Contains files intentionally retired from the active architecture. Archive folders must be grouped by date and reason, for example `_archive/2026-06-pre-domain-refactor/`, and each archive folder must include a README explaining why files were archived, when they were archived, and what replaced them.

## 4. Responsibility of each major subfolder

### Application subfolders

- `apps/web/`: future public marketing website and unauthenticated product pages.
- `apps/dashboard/`: future authenticated member dashboard and product dashboard surfaces.
- `apps/admin/`: future admin-only operational and management surfaces.

### Domain subfolders

- `domains/corporate-automation/`: future corporate automation products, workflow tools, and business process logic.
- `domains/personal-tools/`: future personal productivity tools, individual utilities, and related product logic.
- `domains/investment-intelligence/`: future investment datasets, analytics, indicators, calculators, and intelligence features.
- `domains/education/`: future education products, learning features, and education-specific product logic.

### Package subfolders

- `packages/ui/`: reusable components, design primitives, and presentation helpers.
- `packages/auth/`: shared authentication and authorization helpers once current behavior is protected by tests or migration checks.
- `packages/config/`: shared non-secret configuration conventions and constants.
- `packages/charts/`: reusable chart primitives and chart configuration helpers.
- `packages/data-access/`: shared data loading, contract adapters, and mock-safe access helpers.
- `packages/utils/`: small pure utilities that are not app-specific or domain-specific.

### Service subfolders

- `services/api/`: backend or serverless API implementations.
- `services/rag-workers/`: retrieval, indexing, embedding, and chatbot support workers.
- `services/scraping-workers/`: scraping and external data collection workers.
- `services/scheduled-jobs/`: recurring jobs and scheduled backend automation.
- `services/document-processing/`: document parsing, extraction, enrichment, and processing services.

### Data subfolders

- `data/investment/`: future investment datasets, stock intelligence assets, schemas, manifests, and generated investment artifacts.
- `data/projects/`: future project metadata, product catalogs, and project schemas.
- `data/entitlements/`: future entitlement, access, and subscription data contracts.
- `data/public-datasets/`: future public, downloadable, or externally documented datasets.
- `data/mock/`: future fixture and mock data for demos, tests, and contract examples.

### Documentation subfolders

- `docs/architecture/`: architecture inventories, target structure docs, and migration architecture plans.
- `docs/product/`: product requirements, roadmap context, and feature documentation.
- `docs/api-contracts/`: API contracts, request/response examples, logging expectations, and versioning notes.
- `docs/data-contracts/`: schemas, dataset contracts, generated-data expectations, and validation notes.
- `docs/rag/`: RAG pipeline, retrieval, chatbot, indexing, and text-extraction design notes.
- `docs/security/`: security, privacy, access-control, and threat-model documentation.
- `docs/deployment/`: deployment, hosting, CI/CD, environment, and operations documentation.
- `docs/decisions/`: architecture decision records.

### Script subfolders

- `scripts/migration/`: one-time migration helpers with dry-run guidance.
- `scripts/data/`: data update, catalog, validation, and dataset maintenance scripts.
- `scripts/rag/`: RAG indexing, retrieval, search, and extraction scripts.
- `scripts/maintenance/`: repository maintenance and operational helper scripts.

## 5. Rules for future migrations

1. Keep migration PRs small and scoped to one route group, domain, package, service, data family, or script family.
2. Move documentation first when the target ownership is unclear.
3. Preserve public routes, dashboard routes, imports, links, and data paths unless the PR explicitly includes compatibility wrappers or route redirects.
4. Update tests, checks, contracts, and operational documentation in the same PR that moves runtime files.
5. Do not combine structural moves with unrelated formatting, style fixes, feature work, Firebase/auth changes, package script changes, or data extraction behavior changes.
6. Document every archived file in a dated `_archive/<date>-<reason>/README.md` file that explains why it was archived and what replaced it.
7. Keep generated data and source data clearly labeled so future migrations do not accidentally edit generated outputs by hand.

## 6. Route preservation policy

Teknoify currently exposes static public routes from root files, `pages/`, and `dashboard/`. Future migrations must preserve existing URLs unless a product decision explicitly approves a route change.

A migration PR that touches routes must describe:

- the old URL and new implementation location;
- whether the old URL still resolves directly;
- any redirect, wrapper, or hosting configuration required;
- how dashboard access control remains unchanged; and
- what manual or automated checks verified route behavior.

No Phase 2 folders are active route owners yet.

## 7. Do not move runtime files without a migration PR

**Warning: do not move runtime files without a dedicated migration PR.**

Do not move, rename, delete, or refactor existing HTML, CSS, JavaScript, Python, JSON data, workflow files, Firebase config, dashboard access-control code, API/mock contracts, package scripts, data extraction scripts, or current `data/stock/turkey` paths as part of folder-skeleton work.

This Phase 2 skeleton creates destinations only. Runtime behavior must remain unchanged until later PRs migrate one area at a time.

## 8. Relationship with `docs/architecture/current-inventory.md`

`docs/architecture/current-inventory.md` is the Phase 1 source inventory. It records the current repository layout, identifies migration candidates, and notes path-sensitive risks.

This document is the Phase 2 target map. Future migration PRs should use both documents together:

- use `current-inventory.md` to understand where files live today and what risks were identified;
- use this document to choose the intended destination and ownership boundary; and
- update both migration documentation and folder READMEs when a future PR changes the target architecture.

## Phase 9A dashboard/corporate automation ownership note

Phase 9A adds a non-runtime Dashboard + Corporate Automation ownership audit and README-only skeletons for future dashboard routes/shared areas, corporate automation domains, and automation workers. No dashboard runtime files, public pages, JavaScript, CSS, API files, data files, workflows, package scripts, or static hosting routes were moved or changed in this phase. Future moves remain gated by route, auth/access, Firebase/App Check, and static hosting compatibility checks.

## Phase 10A enterprise readiness note

Phase 10A adds the final enterprise migration readiness checker plus closure and archive candidate documentation. No runtime files, public pages, JavaScript, CSS behavior, data/API files, workflows, package scripts, or static hosting routes were moved or changed in this phase.
