# Investment Analytics CSS Consumer Audit

## 1. Title and purpose

This Phase 6G audit documents the final consumers of the Investment Analytics CSS manifest after the controlled Phase 6E, Phase 6F, and Phase 6G relinks. Its purpose is to close the stylesheet consumer review, identify which public HTML pages now load the domain-owned manifest, and preserve the rollback state for the legacy public manifest.

## 2. Scope

This audit covers the runtime pages, manifests, and checker involved in the Investment Analytics CSS migration closure:

- `pages/investment-analytics.html`
- `pages/investment-retail.html`
- `pages/investment-airlines.html`
- `pages/subscription.html`
- `pages/financial-indicators.html`
- `css/investment-analytics.css`
- `domains/investment-intelligence/analytics/styles/index.css`
- `scripts/architecture/check-investment-css-manifest-parity.js`

The audit searched root `index.html` and all HTML files under `pages/` for these stylesheet references:

- `../css/investment-analytics.css`
- `/css/investment-analytics.css`
- `css/investment-analytics.css`
- `/domains/investment-intelligence/analytics/styles/index.css`
- `../css/financial-indicators.css`
- `../css/style.css`

## 3. Consumer audit table

| File                              | Previous Investment Stylesheet    | Current Stylesheet                                            | Changed In Phase | Status                                                         | Notes                                                                                                               |
| --------------------------------- | --------------------------------- | ------------------------------------------------------------- | ---------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `pages/investment-analytics.html` | `../css/investment-analytics.css` | `/domains/investment-intelligence/analytics/styles/index.css` | Phase 6E         | Relinked to the domain-owned Investment Analytics manifest.    | Keeps `../css/style.css` before the domain manifest; visual smoke remains required.                                 |
| `pages/investment-retail.html`    | `../css/investment-analytics.css` | `/domains/investment-intelligence/analytics/styles/index.css` | Phase 6F         | Relinked to the domain-owned Investment Analytics manifest.    | Keeps `../css/style.css` before the domain manifest; visual smoke remains required.                                 |
| `pages/investment-airlines.html`  | `../css/investment-analytics.css` | `/domains/investment-intelligence/analytics/styles/index.css` | Phase 6F         | Relinked to the domain-owned Investment Analytics manifest.    | Keeps `../css/style.css` before the domain manifest; visual smoke remains required.                                 |
| `pages/subscription.html`         | `../css/investment-analytics.css` | `/domains/investment-intelligence/analytics/styles/index.css` | Phase 6G         | Relinked to close the remaining public manifest HTML consumer. | The page used the same Investment Analytics page-specific manifest and no compatibility reason required keeping it. |
| `pages/financial-indicators.html` | `../css/financial-indicators.css` | `../css/financial-indicators.css`                             | Unchanged        | Separate financial indicators stylesheet remains unchanged.    | This page is outside Investment Analytics manifest parity and should be evaluated by its own stylesheet behavior.   |

The broader static stylesheet search also confirmed that other HTML pages under `pages/` may load the shared `../css/style.css`, but they do not load the Investment Analytics manifest, the domain-owned Investment Analytics manifest, or the financial indicators page stylesheet.

## 4. Remaining legacy public manifest consumers

No HTML page currently links the public Investment Analytics manifest.

`css/investment-analytics.css` remains available as rollback and legacy manifest only. It should not be deleted while the domain-owned manifest rollout is still pending visual smoke review and future deprecation planning.

## 5. Parity and rollback

- `node scripts/architecture/check-investment-css-manifest-parity.js` must pass before the Phase 6G relink is considered safe to review.
- Rollback for any relinked page is restoring the previous `../css/investment-analytics.css` stylesheet link on that page.
- Do not delete `css/investment-analytics.css` yet.
- Do not move existing CSS partials yet.

The parity checker verifies that `css/investment-analytics.css` and `domains/investment-intelligence/analytics/styles/index.css` resolve the same imported CSS partials in the same order. It does not replace rendered visual review.

## 6. Visual smoke requirement

Visual smoke testing is still required for all relinked pages. The visual smoke scope now includes:

- `pages/investment-analytics.html`
- `pages/investment-retail.html`
- `pages/investment-airlines.html`
- `pages/subscription.html`

`pages/financial-indicators.html` remains separate on `../css/financial-indicators.css` and should not be judged by Investment Analytics manifest parity.

## 7. Decision gate

- Do not delete the public `css/investment-analytics.css` manifest yet.
- Do not move CSS partials yet.
- Do not change stylesheet links further until this audit is reviewed.
- If no legacy consumers remain and visual smoke testing passes, future work may start moving one low-risk partial or planning public manifest deprecation.

## 8. Relationship to existing docs

Related documentation:

- [`investment-css-split-strategy.md`](investment-css-split-strategy.md)
- [`investment-css-visual-smoke-test.md`](investment-css-visual-smoke-test.md)
- [`investment-css-manifest-parity-audit.md`](investment-css-manifest-parity-audit.md)
- [`investment-css-relink-smoke-test.md`](investment-css-relink-smoke-test.md)
- [`investment-frontend-split-plan.md`](investment-frontend-split-plan.md)
- [`../../domains/investment-intelligence/analytics/styles/README.md`](../../domains/investment-intelligence/analytics/styles/README.md)

## Phase 10A enterprise readiness note

Phase 10A adds `node scripts/architecture/check-enterprise-migration-readiness.js`, which validates that root `index.html` and `pages/*.html` no longer contain legacy Investment Analytics CSS HTML consumers for `../css/investment-analytics.css`, `/css/investment-analytics.css`, or `css/investment-analytics.css`.
