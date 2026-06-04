# Public Web App

## Purpose

Future owner of the public website shell, marketing pages, and unauthenticated product/service pages after public route preservation is proven.

## What belongs here

- Public website shell ownership documentation.
- Future public page route shells and shared public-page composition.
- Public service/product page mapping notes after static route compatibility is documented.

## What does not belong here yet

- Current root or `pages/` runtime files.
- Public route/link changes, SEO URL changes, or script/style loading changes.
- Protected dashboard files or auth-gated route logic.

## Current migration status

Phase 9A ownership documentation only; no runtime code moved here yet. No public page has moved, and current public links must remain stable.

## Phase 12A public route compatibility note

Phase 12A keeps the public page shell in its current root and `pages/` routes while mapping future public service ownership. Future app-shell ownership work must preserve current public URLs, navigation links, CSS links, shared script loading, and static hosting behavior until wrapper/mirror parity and smoke tests pass.

## Phase 12B RPA page mirror note

The RPA public route remains in `pages/rpa.html`. The domain mirror at `domains/corporate-automation/rpa/page.html` is ownership preparation only and does not change public routing, navigation, CSS, shared JavaScript, or deployment behavior.

## Phase 12C corporate service page mirror note

Corporate Automation public service mirrors now exist where applicable for RPA, web scraping, API automation, and training/consulting. These mirrors are not live routes; the public sources remain in `pages/`, and `node scripts/architecture/check-corporate-service-page-mirrors.js` must pass before any public wrapper, route, navigation, CSS/JS path, or hosting change.

## Phase 12D product/funnel page mirror note

Product/funnel public routes for Subscription and AI Assistant remain under `pages/`. The domain mirrors in `domains/products/subscription/page.html` and `domains/products/ai-assistant/page.html` are ownership preparation only; they do not change live routes, navigation, CSS/JS loading, auth/payment/subscription/premium behavior, or AI Assistant product tool behavior.

## Phase 13A public wrapper strategy note

Public page wrappers remain future work in Phase 13A. Current live public routes remain in `pages/`, and no app-shell route, navigation, CSS/JS loading, deployment, auth, payment, subscription, premium, or product behavior changes.
