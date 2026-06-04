# Web Scraping Domain

## Purpose

Future owner of web scraping service content, product rules, and domain-specific documentation.

## What belongs here

- Web scraping offering descriptions and ownership notes.
- Product rules for scraping-related services.
- Mapping notes for current public web scraping and dashboard scraping surfaces.

## What does not belong here yet

- Current `pages/webscraping.html` runtime content.
- Protected dashboard scraping pages.
- Scraping worker scripts, requirements, deploy scripts, or backend jobs.

## Current migration status

Phase 9A ownership documentation only; no runtime code moved here yet.

## Phase 12A public route ownership note

Phase 12A identifies `pages/webscraping.html` as the web scraping public service route and maps this folder as its future domain owner. The current runtime HTML page remains in `pages/`, and any future mirror or wrapper must preserve `/pages/webscraping.html` until smoke tests pass.

## Phase 12C corporate service page mirror note

The web scraping mirror at `page.html` exists for domain ownership preparation. It is not a live route; the public source remains `pages/webscraping.html`, and `node scripts/architecture/check-corporate-service-page-mirrors.js` must pass before any wrapper, route, or navigation changes.
