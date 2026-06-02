# ADR-0001: Adopt a Domain-Based Repository Structure

## Status

Accepted

## Date

2026-06-02

## Context

Teknoify has grown from a static site-oriented repository into a platform with multiple emerging product areas. The repository now needs clearer boundaries for current and future work, including:

- public marketing website;
- dashboard and admin surfaces;
- corporate automation products;
- personal tools;
- investment datasets, analytics, indicators, and calculators; and
- future RAG/chatbot and backend worker infrastructure.

The Phase 1 inventory in `docs/architecture/current-inventory.md` documented the current structure and recommended future domain-based boundaries. It also identified sensitive areas that should not be moved casually, including public routes, dashboard access control, Firebase/auth behavior, API/mock contracts, package scripts, data extraction scripts, workflows, and existing `data/stock/turkey` paths.

## Decision

Teknoify will move toward a scalable domain-based platform structure with these top-level ownership areas:

- `apps/` for user-facing applications such as the public website, dashboard, and admin surfaces;
- `domains/` for business and product domains such as corporate automation, personal tools, investment intelligence, and education;
- `packages/` for reusable shared modules such as UI, auth, config, charts, data access, and utilities;
- `services/` for backend/API/worker-style responsibilities such as RAG workers, scraping workers, scheduled jobs, and document processing;
- `data/` for organized datasets, generated-data conventions, mocks, and future data contracts;
- `docs/` for architecture, product, API, data, RAG, security, deployment, and decision documentation;
- `scripts/` for future categorized migration, data, RAG, and maintenance scripts; and
- `_archive/` for files intentionally retired from the active architecture after reviewed migration PRs.

Phase 2 creates only the target folder skeleton and documentation. It does not activate these folders as runtime owners.

## Consequences

- Future migration PRs have clear target destinations and ownership boundaries.
- Reviewers can distinguish app, domain, package, service, data, documentation, script, and archive changes more easily.
- Runtime files remain in their current locations until route-safe, contract-safe, and workflow-safe migration PRs are reviewed.
- Some directories will temporarily contain only README files because Git does not track empty folders.
- The repository will carry both the current static site-oriented layout and the future target skeleton during the transition.

## Alternatives considered

### Keep the current static site-oriented structure

This would minimize short-term structural change, but it would keep public pages, dashboard pages, shared scripts, product logic, data assets, backend prototypes, and RAG planning close together as the platform grows.

### Organize only by technical layer

A purely technical layout such as `frontend/`, `backend/`, and `shared/` would separate implementation concerns, but it would not clearly represent Teknoify's product domains or make investment intelligence, corporate automation, personal tools, and education ownership explicit.

### Move runtime files immediately

Moving active files during this phase would make the PR harder to review and could accidentally change routes, imports, package scripts, Firebase/auth behavior, dashboard access control, API/mock contracts, data extraction behavior, or existing data paths. This was rejected for Phase 2.

## Migration notes

- Do not move any existing HTML, CSS, JavaScript, Python, JSON data, workflow, Firebase config, dashboard access-control, API/mock contract, package script, data extraction, or `data/stock/turkey` files in skeleton-only PRs.
- Do not update imports or links as part of skeleton creation.
- Do not change `package.json` scripts.
- Do not fix unrelated Prettier issues in migration PRs.
- Do not modify Firebase config.
- Do not alter dashboard access control.
- Do not alter current API/mock contracts.
- Do not change existing `data/stock/turkey` paths.
- Keep migration PRs small, route-safe, contract-safe, and easy to review.
- Use `docs/architecture/folder-structure.md` as the target map for future migrations.
