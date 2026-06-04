# API Automation Domain

## Purpose

Future owner of API and integration automation service content, product rules, and domain-specific documentation.

## What belongs here

- API automation and integration offering descriptions.
- Business rules for external integrations and API automation products.
- Mapping notes for current public API service pages and future integration domains.

## What does not belong here yet

- Current `pages/api.html` runtime content.
- API runtime endpoints from `api/`.
- Integration worker scripts or backend jobs.

## Current migration status

Phase 9A ownership documentation only; no runtime code moved here yet.

## Phase 12A public route ownership note

Phase 12A identifies `pages/api.html` as the API/integration automation public service route and maps this folder as its future domain owner. The current runtime HTML page remains in `pages/`, and any future mirror or wrapper must preserve `/pages/api.html` until smoke tests pass.

## Phase 12C corporate service page mirror note

The API automation mirror at `page.html` exists for domain ownership preparation. It is not a live route; the public source remains `pages/api.html`, and `node scripts/architecture/check-corporate-service-page-mirrors.js` must pass before any wrapper, route, or navigation changes.
