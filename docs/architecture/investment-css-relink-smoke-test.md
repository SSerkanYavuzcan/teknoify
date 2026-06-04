# Investment CSS Relink Smoke Test and Rollback Plan

## 1. Title and purpose

This Phase 6F document records the controlled Investment Analytics CSS relink from the public manifest to the domain-owned manifest for investment pages, with Phase 6G adding the final subscription consumer closure. It consolidates relink status, parity requirements, visual smoke-test expectations, rollback steps, and decision gates for the runtime stylesheet link change.

Phase 6F completes the controlled relink for investment pages that use the Investment Analytics manifest while preserving the public manifest as the rollback source. It does not move CSS partials, edit selectors or rules, change JavaScript, or change data/RAG/dashboard behavior.

## 2. Scope

In scope:

- `pages/investment-analytics.html`
- `pages/investment-retail.html`
- `pages/investment-airlines.html`
- `pages/subscription.html`
- `domains/investment-intelligence/analytics/styles/index.css`
- `css/investment-analytics.css`
- `scripts/architecture/check-investment-css-manifest-parity.js`

Out of scope:

- `pages/financial-indicators.html`
- Moving CSS partials.
- Editing CSS selectors or rules.
- Deleting `css/investment-analytics.css`.
- JavaScript changes.
- Data/RAG changes.
- Dashboard migration.

## 3. Relink status table

| Page                              | Previous Manifest                 | Current Manifest                                              | Status                                                      | Rollback                                       |
| --------------------------------- | --------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------- |
| `pages/investment-analytics.html` | `../css/investment-analytics.css` | `/domains/investment-intelligence/analytics/styles/index.css` | Relinked to the domain-owned manifest.                      | Restore `../css/investment-analytics.css`.     |
| `pages/investment-retail.html`    | `../css/investment-analytics.css` | `/domains/investment-intelligence/analytics/styles/index.css` | Relinked to the domain-owned manifest in Phase 6F.          | Restore `../css/investment-analytics.css`.     |
| `pages/investment-airlines.html`  | `../css/investment-analytics.css` | `/domains/investment-intelligence/analytics/styles/index.css` | Relinked to the domain-owned manifest in Phase 6F.          | Restore `../css/investment-analytics.css`.     |
| `pages/subscription.html`         | `../css/investment-analytics.css` | `/domains/investment-intelligence/analytics/styles/index.css` | Relinked to the domain-owned manifest in Phase 6G.          | Restore `../css/investment-analytics.css`.     |
| `pages/financial-indicators.html` | `../css/financial-indicators.css` | `../css/financial-indicators.css`                             | Intentionally unchanged; uses its separate page stylesheet. | Keep `../css/financial-indicators.css` linked. |

## 4. Manifest parity requirement

`node scripts/architecture/check-investment-css-manifest-parity.js` must pass before this relink is considered safe to visually smoke test.

Passing parity means the public `css/investment-analytics.css` manifest and the domain-owned `domains/investment-intelligence/analytics/styles/index.css` manifest target the same CSS partials in the same order. This protects the cascade/import boundary while the runtime pages are moved to the domain manifest.

Passing parity does not replace visual smoke testing. Layout, responsive behavior, charts, calculators, overlays, chatbot placement, premium UI, and browser rendering still need manual visual confirmation.

## 5. Visual smoke checklist

| Page                              | Desktop Layout | Mobile Layout | Header/Hero | Cards/Panels | Charts  | Calculators | Chatbot/Premium UI | Result  | Notes                                  |
| --------------------------------- | -------------- | ------------- | ----------- | ------------ | ------- | ----------- | ------------------ | ------- | -------------------------------------- |
| `pages/investment-analytics.html` | Not run        | Not run       | Not run     | Not run      | Not run | Not run     | Not run            | Not run | Not run                                |
| `pages/investment-retail.html`    | Not run        | Not run       | Not run     | Not run      | Not run | Not run     | Not run            | Not run | Not run                                |
| `pages/investment-airlines.html`  | Not run        | Not run       | Not run     | Not run      | Not run | Not run     | Not run            | Not run | Not run                                |
| `pages/subscription.html`         | Not run        | Not run       | Not run     | Not run      | N/A     | N/A         | Not run            | Not run | Phase 6G relink requires visual smoke. |

## 6. Rollback plan

If visual regressions occur on any relinked investment page, restore `../css/investment-analytics.css` in the affected page's Investment Analytics page-specific stylesheet link.

Keep `css/investment-analytics.css` available until domain manifest loading is proven across the relinked investment pages. Do not delete old CSS partials or the public manifest in this phase.

## 7. Decision gate

- Do not delete `css/investment-analytics.css` yet.
- Do not move CSS partials yet.
- Do not relink `pages/financial-indicators.html` because it uses a separate stylesheet.
- Do not start CSS partial moves until the relinked investment pages pass visual smoke testing.

## Phase 6G note

Phase 6G relinked `pages/subscription.html` to the domain-owned Investment Analytics manifest after the final consumer audit found it was the remaining HTML page using `../css/investment-analytics.css`. No HTML page should now link the public Investment Analytics manifest; `css/investment-analytics.css` remains available for rollback and legacy support.

## 8. Relationship to existing docs

Related documents:

- [`investment-css-split-strategy.md`](investment-css-split-strategy.md)
- [`investment-css-visual-smoke-test.md`](investment-css-visual-smoke-test.md)
- [`investment-css-manifest-parity-audit.md`](investment-css-manifest-parity-audit.md)
- [`investment-frontend-split-plan.md`](investment-frontend-split-plan.md)
- [`../../domains/investment-intelligence/analytics/styles/README.md`](../../domains/investment-intelligence/analytics/styles/README.md)
