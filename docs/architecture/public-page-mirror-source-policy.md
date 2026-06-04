# Public Page Mirror Source Policy

## 1. Title and purpose

Phase 13B formalizes the source-of-truth policy for public page mirrors. It defines how domain-owned `page.html` mirrors and live public `pages/*.html` routes must be treated until the repository has either a proven build/deploy copy mechanism or a safe static-hosting wrapper strategy.

This policy is non-runtime. It does not replace public pages with wrappers, does not change page content, and does not change public routes.

## 2. Core policy

- `pages/*.html` remains the live served public route.
- Domain `page.html` mirrors are ownership preparation files.
- No domain mirror is a live public route yet.
- Mirror parity must pass before any wrapper, static-hosting, route, or navigation change.
- Until build tooling exists, do not replace public pages with thin wrappers that rely on runtime HTML imports.
- Changes to mirrored pages should be synchronized intentionally so public pages and mirrors do not drift accidentally.

## 3. Source-of-truth model

| Mode            | Public Route Source                                                                | Domain Mirror Role                                            | When Used                                                                                 | Risk                                                                                                |
| --------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Current mode    | Public page is the served source of truth in `pages/*.html`.                       | Parity copy that prepares domain ownership.                   | Phase 13B default until a safe build/deploy copy mechanism or wrapper strategy is proven. | Lowest current migration risk because public URLs, static paths, and rollback stay stable.          |
| Transition mode | Public page remains the served route, but it is treated as a synced copy.          | Editing source that is intentionally copied back to `pages/`. | Only after a documented sync workflow exists and parity is enforced.                      | Medium risk because drift or incomplete copies could affect the live route.                         |
| Future mode     | Public page is generated or deployed from domain ownership.                        | Canonical domain-owned source for generated public pages.     | Only after build/deploy generation, static path handling, smoke tests, and rollback pass. | Controlled risk if generation and rollback are reliable; high risk if unproven.                     |
| Not recommended | Direct domain `page.html` is exposed as the public URL without static path review. | Live page by direct hosting rather than mirror/source file.   | Do not use in Phase 13B.                                                                  | High risk because relative paths, navigation, SEO routes, hosting behavior, and rollback may break. |

## 4. Current mirror inventory

| Area                | Public Page                      | Domain Mirror                                                | Current Mode                           | Parity Checker                                                      | Risk         | Notes                                                                                          |
| ------------------- | -------------------------------- | ------------------------------------------------------------ | -------------------------------------- | ------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------- |
| RPA                 | `pages/rpa.html`                 | `domains/corporate-automation/rpa/page.html`                 | Public page is served source of truth. | `node scripts/architecture/check-rpa-page-mirror-parity.js`         | Lower        | First wrapper candidate, but wrapper remains deferred until static-hosting strategy is proven. |
| Web scraping        | `pages/webscraping.html`         | `domains/corporate-automation/web-scraping/page.html`        | Public page is served source of truth. | `node scripts/architecture/check-corporate-service-page-mirrors.js` | Lower/medium | Corporate service mirror only; public URL stays stable.                                        |
| API automation      | `pages/api.html`                 | `domains/corporate-automation/api-automation/page.html`      | Public page is served source of truth. | `node scripts/architecture/check-corporate-service-page-mirrors.js` | Medium       | Defer wrapper work until lower-risk pages prove the pattern.                                   |
| Training/consulting | `pages/training-consulting.html` | `domains/corporate-automation/training-consulting/page.html` | Public page is served source of truth. | `node scripts/architecture/check-corporate-service-page-mirrors.js` | Lower/medium | Corporate service mirror only; contact and CTA smoke remains required before route changes.    |
| Subscription        | `pages/subscription.html`        | `domains/products/subscription/page.html`                    | Public page is served source of truth. | `node scripts/architecture/check-product-funnel-page-mirrors.js`    | High         | High-risk funnel page with auth, payment, subscription, premium, and conversion concerns.      |
| AI Assistant        | `pages/ai-assistant.html`        | `domains/products/ai-assistant/page.html`                    | Public page is served source of truth. | `node scripts/architecture/check-product-funnel-page-mirrors.js`    | High         | High-risk product/tool page with session and AI Assistant behavior concerns.                   |

## 5. Sync rules

- If editing a mirrored page, update both the public page and its domain mirror in the same PR until a sync tool exists.
- Run the relevant parity checker after edits.
- Do not edit only one side unless intentionally breaking parity for a planned migration and documenting the migration gate.
- Do not update navigation to domain mirrors.
- Keep public URLs stable.
- Avoid formatting only one mirror side because formatting-only drift still breaks parity and obscures real content changes.

## 6. Recommended sync workflow

1. Edit the public page and mirror together, or edit one side and copy to the other intentionally.
2. Run the relevant parity checker.
3. Run the wrapper readiness checker.
4. Run `npm run check`.
5. Document whether the live route changed. It should normally be `No`.
6. Keep the rollback path as the public `pages/*.html` file.

## 7. Future automation idea

A future read-only or controlled script/command could:

- Copy domain mirrors to public pages or public pages to mirrors.
- Validate parity after copying.
- Fail if drift is detected.
- Remain outside `npm run check` until stable.

Phase 13B does not implement a page-copy or sync script, and it does not modify page files.

## 8. Wrapper decision

Runtime wrappers are deferred until the static-hosting strategy is proven. RPA remains the first wrapper candidate because it is lower risk and has dedicated parity coverage, but the source-of-truth sync policy should come first.

High-risk pages, including Subscription and AI Assistant, remain blocked by page-specific smoke tests, auth/session checks, product behavior checks, and rollback gates.

## 9. Smoke and rollback gates

- Parity check is required but not sufficient.
- Visual smoke remains required before any wrapper, route, or static-hosting change.
- Rollback means restoring the public `pages/*.html` file as the served full page.
- Never delete public pages until a generated or wrapper route strategy is proven.

## 10. Relationship to existing docs

- [`public-page-wrapper-strategy.md`](public-page-wrapper-strategy.md)
- [`corporate-service-page-mirrors.md`](corporate-service-page-mirrors.md)
- [`product-funnel-page-mirrors.md`](product-funnel-page-mirrors.md)
- [`rpa-page-domain-mirror.md`](rpa-page-domain-mirror.md)
- [`public-service-route-compatibility-map.md`](public-service-route-compatibility-map.md)
- [`../../apps/web/README.md`](../../apps/web/README.md)
- [`../../domains/corporate-automation/README.md`](../../domains/corporate-automation/README.md)
- [`../../domains/products/README.md`](../../domains/products/README.md)
