# Investment Analytics CSS Manifest Parity Audit

## 1. Title and purpose

This Phase 6D audit documents and automates parity checks between the current public Investment Analytics CSS manifest and the new domain-owned manifest. Its purpose is to verify that the domain manifest resolves to the same effective imported partials as the public manifest before any future stylesheet relink or CSS migration work.

## 2. Scope

In scope:

- `css/investment-analytics.css`
- `domains/investment-intelligence/analytics/styles/index.css`
- `scripts/architecture/check-investment-css-manifest-parity.js`

Out of scope:

- HTML stylesheet relinks.
- Moving CSS partials.
- Editing existing CSS partials.
- Changing public route behavior.
- Completing visual smoke testing.

## 3. What parity means

For Phase 6D, manifest parity means:

- The public manifest and domain manifest have the same imported partial count.
- Both manifests resolve to the same effective target files.
- Both manifests import those target files in the same order.
- All imported files exist.
- No additional CSS rules are introduced in the domain manifest.

## 4. Current expected import order

The current expected Investment Analytics partial order is:

1. `css/06-pages/investment-analytics/base.css`
2. `css/06-pages/investment-analytics/hero.css`
3. `css/06-pages/investment-analytics/orbit-visual.css`
4. `css/06-pages/investment-analytics/calculators.css`
5. `css/06-pages/investment-analytics/sections.css`
6. `css/06-pages/investment-analytics/charts.css`
7. `css/06-pages/investment-analytics/chart-modal.css`
8. `css/06-pages/investment-analytics/chart-tooltip.css`
9. `css/06-pages/investment-analytics/chatbot.css`
10. `css/06-pages/investment-analytics/responsive.css`

## 5. How to run the check

Run the Phase 6D parity checker from the repository root:

```bash
node scripts/architecture/check-investment-css-manifest-parity.js
```

## 6. What failure means

A parity failure means the domain manifest is not ready to replace or mirror the current public manifest in runtime page loading:

- An import mismatch blocks relinking.
- A missing imported file blocks relinking.
- A changed import order requires explicit review because cascade order and specificity can affect layout even when selectors are unchanged.
- The domain manifest should not be loaded by HTML until parity passes.

## 7. Relationship to visual smoke testing

Automated manifest parity is necessary but not sufficient. The checker verifies manifest-level import compatibility, but it does not inspect rendered layout, responsive behavior, browser differences, hover/focus states, chart overlays, calculator states, or chatbot placement.

Visual smoke testing from [`investment-css-visual-smoke-test.md`](investment-css-visual-smoke-test.md) is still required before relinking.

## 8. Future decision gate

Future CSS work should use this audit as a gate before any runtime loading change:

- Do not update page `<link>` tags until the parity check passes and visual smoke testing is prepared.
- Do not remove the old public manifest until the domain manifest has been loaded and verified.
- If the parity check passes, a future Phase 6E may create a controlled relink plan or continue with one low-risk partial migration plan.

## 9. Relationship to existing docs

Related documents:

- [`investment-css-split-strategy.md`](investment-css-split-strategy.md)
- [`investment-css-visual-smoke-test.md`](investment-css-visual-smoke-test.md)
- [`investment-frontend-split-plan.md`](investment-frontend-split-plan.md)
- [`../../domains/investment-intelligence/analytics/styles/README.md`](../../domains/investment-intelligence/analytics/styles/README.md)
