# RPA Domain

## Purpose

Future owner of RPA service content, product rules, and domain-specific documentation.

## What belongs here

- RPA offering descriptions and product ownership notes.
- RPA business rules and future domain models.
- Mapping notes for current RPA-related public and dashboard surfaces.

## What does not belong here yet

- Current `pages/rpa.html` runtime content.
- Dashboard automation runtime files.
- RPA worker scripts, deploy scripts, or backend jobs.

## Current migration status

Phase 9A ownership documentation only; no runtime code moved here yet.

## Phase 12A public route ownership note

Phase 12A identifies `pages/rpa.html` as the RPA public service route and maps this folder as its future domain owner. The current runtime HTML page remains in `pages/`, and any future mirror or wrapper must preserve `/pages/rpa.html` until smoke tests pass.

## Phase 12B RPA page mirror note

`page.html` mirrors `pages/rpa.html` for domain ownership preparation. It is not a live route yet, and `pages/rpa.html` remains the current public source of truth.

Run `node scripts/architecture/check-rpa-page-mirror-parity.js` and require it to pass before any future wrapper, route, or static-hosting changes.

## Phase 12C corporate service page mirror note

The RPA mirror at `page.html` remains a domain-owned ownership mirror and is now included in the combined corporate service parity checker. It is not a live route; the public source remains `pages/rpa.html`, and `node scripts/architecture/check-corporate-service-page-mirrors.js` must pass before any wrapper, route, or navigation changes.
