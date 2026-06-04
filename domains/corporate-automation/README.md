# Corporate Automation Domain

## Purpose

Future owner of corporate automation domain knowledge, service/product content, and business rules for RPA, web scraping, API automation, and related consulting offerings.

## What belongs here

- Corporate automation product and service ownership documentation.
- Domain-specific content models, service descriptions, and future product logic.
- RPA, web scraping, API/integration automation, training, consulting, and case-study domain boundaries.

## What does not belong here yet

- Existing public runtime pages from `pages/`.
- Existing protected dashboard runtime files.
- Backend worker scripts or deploy files, which should move only later under `services/automation-workers/` after compatibility planning.

## Current migration status

Phase 9A ownership documentation only; no runtime code moved here yet. Corporate automation pages and dashboard automation tools remain in their current paths.

## Phase 12A public route ownership note

Phase 12A maps public service route ownership for Corporate Automation pages before runtime migration. Current public pages remain in `pages/`; no public runtime page, URL, link, stylesheet, script, or deployment behavior has moved yet.

## Phase 12B RPA page mirror note

RPA is the first mirrored public service page under the Corporate Automation domain. The mirror prepares source ownership only; the public route remains in `pages/rpa.html` until a later wrapper/static-hosting strategy is proven.

## Phase 12C corporate service page mirror note

Phase 12C adds domain-owned mirrors for lower-risk Corporate Automation public service pages where applicable: RPA, web scraping, API automation, and training/consulting. These mirrors are not live routes; the public sources remain in `pages/`, and `node scripts/architecture/check-corporate-service-page-mirrors.js` must pass before any wrapper, route, or navigation changes.

## Phase 13A public wrapper strategy note

Corporate service mirrors are candidates for the public wrapper strategy, with RPA remaining the first recommended candidate. They are not live routes in Phase 13A; public sources remain in `pages/` until static-hosting strategy, smoke tests, and rollback gates are proven.

## Phase 13B source policy note

Corporate automation mirrors follow the public page mirror source policy. The mirrors remain non-live parity ownership preparation files, and current public routes stay in `pages/` until build/deploy sync or wrapper strategy is proven.
