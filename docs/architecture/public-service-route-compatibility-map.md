# Public Service Route Compatibility Map

## 1. Title and purpose

This Phase 12A document maps public service, product funnel, and Corporate Automation routes before any runtime page move. It establishes current public URLs, shared CSS/JS dependencies, future ownership candidates, static hosting constraints, and migration readiness checks so public pages can move toward domain ownership without changing production routes first.

Phase 12A is non-runtime. It does not move public pages, alter links, relink CSS, rewrite scripts, change subscription/auth/payment behavior, or change build/deployment behavior.

## 2. Scope

In scope:

- Public service pages currently served from `pages/*.html`.
- Corporate Automation pages for RPA, web scraping, API/integration automation, and training/consulting.
- `pages/subscription.html` as part of the product/service funnel and access/pricing path.
- Current public URLs and direct-link compatibility expectations.
- Shared CSS dependencies and shared JavaScript dependencies that must remain stable during any future ownership work.
- Future domain ownership under `domains/corporate-automation/`, `domains/products/`, `domains/services/`, and the public shell owner `apps/web/`.
- Static hosting path strategy for keeping public HTML routes stable while ownership is documented or mirrored.

Out of scope:

- Moving public pages.
- Changing URLs.
- Changing navigation links.
- Changing CSS links.
- Changing shared scripts.
- Changing subscription, auth, access, or payment behavior.
- Changing deployment or build configuration.

## 3. Current public service route inventory

The inventory below was built by inspecting `pages/` and the public service/product navigation surface. Routes are listed by current source file and current static URL, not by future ownership path.

| Current Page                      | Public URL                         | Current Role                                                   | Current CSS Dependencies                                                                            | Current JS Dependencies                                                                                                                                              | Future Owner                                        | Move Priority           | Risk   | Notes                                                                                       |
| --------------------------------- | ---------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------- | ------ | ------------------------------------------------------------------------------------------- |
| `pages/rpa.html`                  | `/pages/rpa.html`                  | RPA marketing/service page                                     | Font Awesome CDN; `../css/style.css`; `../css/rpa.css`                                              | Firebase app/auth compat CDN; `../js/session-manager.js`; `/packages/config/routes-global.js`; `../js/script.js`                                                     | `domains/corporate-automation/rpa/`                 | P1-doc-owner-ready      | Medium | Candidate for first mirror/copy because it is a public service page with domain skeleton.   |
| `pages/webscraping.html`          | `/pages/webscraping.html`          | Web scraping and data mining marketing/service page            | Font Awesome CDN; `../css/style.css`; `../css/webscraping.css`                                      | Firebase app/auth compat CDN; `../js/session-manager.js`; `/packages/config/routes-global.js`; `../js/script.js`                                                     | `domains/corporate-automation/web-scraping/`        | P2-copy-or-mirror-later | Medium | Similar dependency shape to RPA; keep public route stable.                                  |
| `pages/api.html`                  | `/pages/api.html`                  | API/integration automation marketing/service page              | Font Awesome CDN; `../css/style.css`; `../css/api.css`                                              | Firebase app/auth compat CDN; `../js/session-manager.js`; `/packages/config/routes-global.js`; `../js/script.js`                                                     | `domains/corporate-automation/api-automation/`      | P2-copy-or-mirror-later | Medium | Has internal service-case anchor; do not change anchors or CTA links in Phase 12A.          |
| `pages/training-consulting.html`  | `/pages/training-consulting.html`  | Training and consulting marketing/service page                 | Font Awesome CDN; `../css/style.css`; `../css/training-consulting.css`                              | Firebase app/auth compat CDN; `../js/session-manager.js`; `/packages/config/routes-global.js`; `../js/script.js`                                                     | `domains/corporate-automation/training-consulting/` | P2-copy-or-mirror-later | Medium | Domain owner exists; preserve form/contact behavior and shared scripts.                     |
| `pages/subscription.html`         | `/pages/subscription.html`         | Subscription/pricing/product access funnel                     | Font Awesome CDN; `../css/style.css`; `/domains/investment-intelligence/analytics/styles/index.css` | Firebase app/auth/firestore compat CDN; `../js/session-manager.js`; `/packages/config/routes-global.js`; `../js/script.js`                                           | `domains/products/`                                 | P0-do-not-move-yet      | High   | Avoid as first candidate because it has subscription/access and Firestore coupling signals. |
| `pages/ai-assistant.html`         | `/pages/ai-assistant.html`         | AI assistant/chatbot product or service marketing page         | Font Awesome CDN; `../css/style.css`; `../css/ai-assistant.css`                                     | Firebase app/auth compat CDN; `../js/session-manager.js`; `/packages/config/routes-global.js`; `../js/script.js`                                                     | `domains/products/` or `domains/services/`          | needs-review            | Medium | Product/service ownership needs review because no dedicated skeleton exists yet.            |
| `pages/financial-indicators.html` | `/pages/financial-indicators.html` | Public financial indicators product/tool page                  | Font Awesome CDN; `../css/style.css`; `../css/financial-indicators.css`                             | Firebase app/auth compat CDN; `../js/session-manager.js`; `/packages/config/routes-global.js`; `../js/script.js`                                                     | `domains/investment-intelligence/`                  | needs-review            | Medium | Related public product surface, but outside Corporate Automation ownership.                 |
| `pages/investment-analytics.html` | `/pages/investment-analytics.html` | Investment analytics product/tool page                         | Font Awesome CDN; `../css/style.css`; `/domains/investment-intelligence/analytics/styles/index.css` | Firebase app/auth/firestore compat CDN; route bridge; Investment Analytics domain calculator/formatter bridges; `../js/script.js`; `../js/investment-analytics.js`   | `domains/investment-intelligence/`                  | P0-do-not-move-yet      | High   | Existing Investment Intelligence migration stream owns this; not a Phase 12A move target.   |
| `pages/investment-retail.html`    | `/pages/investment-retail.html`    | Premium retail investment product/tool page                    | Font Awesome CDN; `../css/style.css`; `/domains/investment-intelligence/analytics/styles/index.css` | Firebase app/auth/firestore compat CDN; `../js/session-manager.js`; `/packages/config/routes-global.js`; `../js/script.js`; `../js/premium-content-gate.js`          | `domains/investment-intelligence/`                  | P0-do-not-move-yet      | High   | Premium/content-gate dependency makes this unsuitable for Corporate Automation migration.   |
| `pages/investment-airlines.html`  | `/pages/investment-airlines.html`  | Investment product/tool page                                   | Font Awesome CDN; `../css/style.css`; `/domains/investment-intelligence/analytics/styles/index.css` | Firebase app/auth/firestore compat CDN; `../js/session-manager.js`; `/packages/config/routes-global.js`; `../js/script.js`                                           | `domains/investment-intelligence/`                  | P0-do-not-move-yet      | High   | Related public product page, but higher risk and not Corporate Automation-owned.            |
| `index.html`                      | `/`                                | General public website shell and service navigation entrypoint | Font Awesome CDN; `css/style.css`                                                                   | Firebase app/auth/firestore/app-check/functions compat CDN; reCAPTCHA; `js/session-manager.js`; `/packages/config/routes-global.js`; `js/script.js`; `js/cookies.js` | `apps/web/`                                         | P0-do-not-move-yet      | High   | Public shell should not move until all route wrappers and navigation smoke tests are ready. |

## 4. Public route compatibility requirements

- Current public URLs must remain stable throughout ownership migration.
- Direct links and bookmarks to `index.html` and `pages/*.html` must continue working.
- Page navigation must remain unchanged during ownership migration.
- Moving source ownership to `domains/corporate-automation/` does not automatically change public route URLs.
- Public HTML routes may need compatibility wrappers, static mirrors, or ownership-only documentation before physical moves.
- Any future mirror must preserve relative asset assumptions such as `../css/*`, `../js/*`, and root-absolute `/packages/config/routes-global.js` until an explicit relink plan exists.

## 5. Static hosting strategy

Current `pages/*.html` files are static-hosted public routes. The existing deployment path treats those files as public URLs, while domain folders are source ownership folders and are not automatically equivalent to public routes.

Future migration options:

1. Keep `pages/*.html` files as compatibility wrappers while source ownership or content ownership is documented under domain folders.
2. Mirror page content into domain ownership while public HTML remains in `pages/`, then compare parity before any route-level change.
3. Introduce build/deploy mapping only after explicit support exists for publishing domain-owned content back to the same public URLs.

Do not break existing relative links or assets. A physical source move from `pages/rpa.html` to `domains/corporate-automation/rpa/` would change relative CSS/JS assumptions unless a wrapper or build mapping preserves the current public route and asset graph.

## 6. Future target ownership map

| Business Area                       | Current Page(s)                                                                                                                        | Future Domain Owner                                 | Future App Owner | Service Worker Owner                  | Notes                                                                                  |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ---------------- | ------------------------------------- | -------------------------------------------------------------------------------------- |
| RPA                                 | `pages/rpa.html`                                                                                                                       | `domains/corporate-automation/rpa/`                 | `apps/web/`      | `services/automation-workers/`        | Lowest-risk public service candidate after smoke tests and wrapper/mirror plan.        |
| Web scraping                        | `pages/webscraping.html`                                                                                                               | `domains/corporate-automation/web-scraping/`        | `apps/web/`      | `services/scraping-workers/`          | Public page and scraping worker ownership should remain separate until runtime gates.  |
| API/integration automation          | `pages/api.html`                                                                                                                       | `domains/corporate-automation/api-automation/`      | `apps/web/`      | `services/api/`                       | Public marketing route is distinct from runtime `api/` endpoints.                      |
| Training/consulting                 | `pages/training-consulting.html`                                                                                                       | `domains/corporate-automation/training-consulting/` | `apps/web/`      | `services/automation-workers/`        | Preserve contact/form and shared script behavior during any mirror.                    |
| Subscription/pricing/product access | `pages/subscription.html`; subscription CTAs from product pages                                                                        | `domains/products/`                                 | `apps/web/`      | needs-review                          | Do not move first because auth/access/payment/subscription behavior must be isolated.  |
| AI assistant/product tools          | `pages/ai-assistant.html`                                                                                                              | `domains/products/` or `domains/services/`          | `apps/web/`      | needs-review                          | Dedicated product/service ownership skeleton should be decided before runtime changes. |
| Investment product pages            | `pages/financial-indicators.html`; `pages/investment-analytics.html`; `pages/investment-retail.html`; `pages/investment-airlines.html` | `domains/investment-intelligence/`                  | `apps/web/`      | `services/rag-workers/` as applicable | Related public product routes, but outside Corporate Automation Phase 12A ownership.   |
| General public website shell        | `index.html`; public nav shared by service pages                                                                                       | shared public content ownership                     | `apps/web/`      | none                                  | Move only after service route wrappers and navigation smoke tests are proven.          |

## 7. Recommended migration approach

1. Do not physically move public pages first.
2. Create domain ownership docs, route maps, and audit tooling first.
3. Copy or mirror one low-risk public service page into domain ownership while keeping the public route stable.
4. Later create a page wrapper strategy that keeps the `pages/*.html` URL active and explicit.
5. Only after parity checks and manual smoke tests pass should public HTML be moved, generated from a domain owner, or reduced to a compatibility wrapper.
6. Keep subscription, investment, auth-sensitive, and payment/access-related pages out of the first runtime migration pass.

## 8. First runtime candidate recommendation

Recommended first runtime candidate after Phase 12A: `pages/rpa.html`.

Reasoning:

- It is a public Corporate Automation service page with an existing future owner at `domains/corporate-automation/rpa/`.
- It does not show Firestore or premium gate dependencies in the current static dependency scan.
- It is less coupled than `pages/subscription.html` and the Investment Intelligence pages.
- It is representative of the shared public service page pattern, so a wrapper/mirror approach tested here can inform later web scraping, API automation, and training/consulting migrations.

This recommendation does not authorize a runtime move in Phase 12A. It identifies the first candidate for a later mirror/wrapper PR after smoke tests and parity checks exist.

## 9. Public service smoke checklist

Initial values are `Not run` because Phase 12A does not execute visual or browser runtime migration testing.

| Page                              | Desktop Layout | Mobile Layout | Navigation | CTA Buttons | Forms/Contact | Shared JS | CSS     | Result  | Notes                                   |
| --------------------------------- | -------------- | ------------- | ---------- | ----------- | ------------- | --------- | ------- | ------- | --------------------------------------- |
| `pages/rpa.html`                  | Not run        | Not run       | Not run    | Not run     | Not run       | Not run   | Not run | Not run | Required before any RPA mirror/wrapper. |
| `pages/webscraping.html`          | Not run        | Not run       | Not run    | Not run     | Not run       | Not run   | Not run | Not run | Required before web scraping migration. |
| `pages/api.html`                  | Not run        | Not run       | Not run    | Not run     | Not run       | Not run   | Not run | Not run | Include internal anchor/CTA checks.     |
| `pages/training-consulting.html`  | Not run        | Not run       | Not run    | Not run     | Not run       | Not run   | Not run | Not run | Include contact/form behavior.          |
| `pages/subscription.html`         | Not run        | Not run       | Not run    | Not run     | Not run       | Not run   | Not run | Not run | Include auth/access/payment review.     |
| `pages/ai-assistant.html`         | Not run        | Not run       | Not run    | Not run     | Not run       | Not run   | Not run | Not run | Ownership needs review first.           |
| `pages/financial-indicators.html` | Not run        | Not run       | Not run    | Not run     | Not run       | Not run   | Not run | Not run | Related public product page.            |
| `index.html`                      | Not run        | Not run       | Not run    | Not run     | Not run       | Not run   | Not run | Not run | Public shell and service nav smoke.     |

## 10. Rollback plan

- Restore the original `pages/*.html` file if a future wrapper, generated page, or mirrored source fails.
- Keep public route paths unchanged during rollback.
- Do not delete the original public page until static hosting behavior and manual smoke tests are verified.
- Do not change navigation links until route mapping is proven.
- Keep CSS/JS relinks out of route-ownership PRs unless an explicit compatibility plan and rollback path are present.

## 11. Relationship to existing docs

- [`dashboard-corporate-automation-migration-audit.md`](dashboard-corporate-automation-migration-audit.md)
- [`dashboard-route-compatibility-map.md`](dashboard-route-compatibility-map.md)
- [`enterprise-migration-closure-audit.md`](enterprise-migration-closure-audit.md)
- [`folder-structure.md`](folder-structure.md)
- [`../../domains/corporate-automation/README.md`](../../domains/corporate-automation/README.md)
- [`../../domains/corporate-automation/rpa/README.md`](../../domains/corporate-automation/rpa/README.md)
- [`../../domains/corporate-automation/web-scraping/README.md`](../../domains/corporate-automation/web-scraping/README.md)
- [`../../domains/corporate-automation/api-automation/README.md`](../../domains/corporate-automation/api-automation/README.md)
- [`../../domains/corporate-automation/training-consulting/README.md`](../../domains/corporate-automation/training-consulting/README.md)
- [`../../apps/web/README.md`](../../apps/web/README.md)

## Phase 12A audit command

Run the route map audit directly when preparing a future public service migration PR:

```bash
node scripts/architecture/check-public-service-route-map.js
```
