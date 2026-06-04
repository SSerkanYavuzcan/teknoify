# Investment Analytics JS Orchestrator Cleanup Plan

## 1. Title and purpose

This document is the **Phase 7A Investment Analytics JS orchestrator cleanup plan** for Teknoify.
Phase 7A is non-runtime: it creates a cleanup plan, script/runtime map audit, and domain script ownership documentation before any larger runtime sections move out of `js/investment-analytics.js`.

The goal is to plan a safe cleanup path for `js/investment-analytics.js` after bridge-based helper extraction for formatters, chart math, compound interest, CAGR, and retirement helpers. This plan intentionally does not refactor `js/investment-analytics.js`, change page script tags, move CSS, or change package/workflow configuration.

## 2. Current state summary

- `js/investment-analytics.js` remains a classic deferred script.
- `pages/investment-analytics.html` is expected to be the only direct consumer of `js/investment-analytics.js`.
- Bridge modules exist for:
    - Formatters.
    - Chart math.
    - Compound interest.
    - CAGR.
    - Retirement.
- CSS domain manifest migration has been completed for investment pages, but CSS partials remain in their current paths.
- `css/investment-analytics.css` remains available as the rollback/legacy public manifest and should not be deleted until rollback gates close.
- The current bridge modules are compatibility stepping stones for the classic orchestrator, not final boot ownership.

## 3. Current responsibility groups inside `js/investment-analytics.js`

| Responsibility Group              | Examples / Functions                                                                                                                                                                                                                | Already Bridged?                                  | DOM Coupling  | Suggested Future Target                                                                | Extraction Priority                         | Risk           | Notes                                                                                            |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------- | ------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------ |
| Boot/init orchestration           | Top-level IIFE, `ensureSupermarketDatasetLoaded`, `initSectorSelector`, `initInvestmentSmoothScroll`, calculator/chatbot initializers                                                                                               | No                                                | High          | `domains/investment-intelligence/analytics/scripts/boot.js`                            | P2-do-not-extract-yet                       | High           | Keep classic until boot ownership and duplicate-init guards are designed.                        |
| Formatters                        | `formatNumber`, `formatUsdCompact`, `formatTlMillion`, `formatPercent`, `formatDurationYears`, `formatUsdCurrency`, `formatCalculatorPeriod`                                                                                        | Partially: formatter bridge for selected helpers  | Low to Medium | `domains/investment-intelligence/analytics/scripts/utils/`                             | P0-next for pure leftovers only             | Low to Medium  | Extract only pure formatters with bridge-first/local-fallback and smoke tests.                   |
| Chart math/path helpers           | `getPoint`, `getLineChartConfig`, `getCompoundChartPoint`, `buildChartPath`, `shouldShowChartValueLabel`                                                                                                                            | Partially: chart math bridge for selected helpers | Low to Medium | `domains/investment-intelligence/analytics/scripts/charts/` or `utils/`                | P1-later                                    | Medium         | Existing bridge covers pure math; SVG path helpers should wait for chart smoke coverage.         |
| SVG helpers                       | `createSvgElement`, `appendSvgTitle`, `appendChartPointMarker`, `appendChartValueLabel`                                                                                                                                             | No                                                | High          | `domains/investment-intelligence/analytics/scripts/charts/svg-helpers.js`              | P2-do-not-extract-yet                       | High           | These create live DOM/SVG nodes and preserve accessibility/class contracts.                      |
| Chart renderers                   | `renderLegend`, `renderLineGrid`, `renderLineXAxis`, `renderLineSeries`, `renderLineChart`, `renderMetricChart`, `renderGrowthChart`, `renderCagrGrowthChart`, `renderRetirementGrowthChart`                                        | No                                                | High          | `domains/investment-intelligence/analytics/scripts/charts/chart-renderers.js`          | P2-do-not-extract-yet                       | High           | Move only after visual/chart smoke testing and stable renderer contracts.                        |
| Sector/industry panels            | `renderRetailSectorPanel`, `renderPlaceholderSectorPanel`, `renderSectorPanel`                                                                                                                                                      | No                                                | High          | `domains/investment-intelligence/analytics/scripts/sectors/sector-panels.js`           | P2-do-not-extract-yet                       | High           | Panel renderers depend on current markup, CSS classes, and links.                                |
| Sector selectors                  | `updateSectorSelectorState`, `initSectorSelector`                                                                                                                                                                                   | No                                                | High          | `domains/investment-intelligence/analytics/scripts/sectors/`                           | P2-do-not-extract-yet                       | High           | Requires boot strategy and ARIA/button state smoke tests.                                        |
| Compound calculator               | `parseCalculatorInputs`, `calculateCompoundInterest`, `buildBreakdownRows`, `buildGrowthSeries`, `renderCompoundCalculatorPanel`, `updateCompoundCalculator`, `initCompoundInterestCalculator`                                      | Partially: compound helper bridge                 | High          | `domains/investment-intelligence/analytics/scripts/calculators/`                       | P1-later for pure helpers, P2 for renderers | Medium to High | Keep renderer and form binding in classic for now.                                               |
| CAGR calculator                   | `getCagrFieldNumber`, `calculateCagr`, `calculateCagrEndingValue`, `calculateCagrRequiredDuration`, `buildCagrGrowthSeries`, `renderCagrCalculatorPanel`, `updateCagrCalculator`, `initCagrCalculator`                              | Partially: CAGR helper bridge                     | High          | `domains/investment-intelligence/analytics/scripts/calculators/`                       | P1-later for pure helpers, P2 for renderers | Medium to High | Existing bridge protects selected math with local fallback.                                      |
| Retirement calculator             | `parseRetirementInputs`, `validateRetirementInputs`, `simulateRetirementAccumulation`, `simulateRetirementDrawdown`, `calculateRetirementPlan`, `renderRetirementResults`, `updateRetirementCalculator`, `initRetirementCalculator` | Partially: retirement helper bridge               | High          | `domains/investment-intelligence/analytics/scripts/calculators/`                       | P1-later for pure helpers, P2 for renderers | High           | Larger lifecycle model; extract only after calculator smoke tests.                               |
| Calculator selector               | `updateCalculatorSelectorState`, `renderCalculatorPanel`, `initCalculatorSelector`                                                                                                                                                  | No                                                | High          | `domains/investment-intelligence/analytics/scripts/calculators/`                       | P2-do-not-extract-yet                       | High           | Selector controls dynamic panel rendering and event rebinding.                                   |
| Chatbot/mock assistant            | `waitForMockDelay`, `normalizeMessageText`, `buildChatLogEvent`, `sendChatLogEvent`, `trackChatMessageSent`, `normalizeAssistantResponse`, `renderResponseMeta`, `renderSources`, `initInvestmentChatbot`                           | No                                                | High          | `domains/investment-intelligence/analytics/scripts/chatbot/`                           | needs-review                                | High           | Review data/API contracts before extraction; preserve logging best-effort behavior.              |
| Premium/access gate UI            | Premium/access coordination implied by page markup and shared gate behavior                                                                                                                                                         | No                                                | High          | `domains/investment-intelligence/analytics/scripts/premium/`                           | needs-review                                | High           | Coordinate with auth/access documentation and `js/premium-content-gate.js`; do not move blindly. |
| Data fetching/static data mapping | `supermarketDatasetUrl`, `usdTryRatesUrl`, `ensureSupermarketDatasetLoaded`, `getCompanies`, `getPeriods`, `normalizeMetricPoint`, `normalizeMetricPoints`, `getValidUsdTryRates`, `parseQuarterPeriod`, `getQuarterDateBounds`     | No                                                | Low to Medium | `domains/investment-intelligence/analytics/scripts/sectors/sector-data.js` or `utils/` | P0-next for pure mappers only               | Medium         | Pure normalizers may be the safest next candidates if fixtures are easy to verify.               |
| Event binding                     | Tooltip events, sector button events, calculator form events, chatbot toggle/send/suggestion events, smooth scroll events                                                                                                           | No                                                | High          | keep in `js/investment-analytics.js` for now                                           | P2-do-not-extract-yet                       | High           | Avoid duplicate listeners until boot/module lifecycle is defined.                                |
| Accessibility/live regions        | `aria-live` panel updates, `aria-pressed`, SVG titles, tooltip focus/blur behavior, loading states, chatbot `aria-busy`                                                                                                             | No                                                | High          | keep in `js/investment-analytics.js` for now                                           | P2-do-not-extract-yet                       | High           | Needs focused keyboard/screen-reader regression checks before moving.                            |
| Utility helpers                   | `escapeHtml`, `clampNumber`, `parseLocalizedNumber`, text/source normalization helpers                                                                                                                                              | Partially: selected formatter/calculator bridges  | Low to Medium | `domains/investment-intelligence/analytics/scripts/utils/`                             | P0-next when pure and covered               | Low to Medium  | Extract small pure helpers only when all call sites can be guarded safely.                       |

## 4. What should remain in the classic orchestrator for now

The following should remain in `js/investment-analytics.js` for now:

- DOM boot sequencing.
- Event registration.
- Panel initialization.
- Large render functions.
- Chart DOM/SVG rendering.
- Premium gate orchestration.
- Chatbot UI orchestration.
- Anything relying on current page markup/classes.
- Calculator panel rendering and selector-driven rebinding.
- Sector panel rendering and ARIA state coordination.

## 5. What can be extracted next

Low-risk next targets after the current bridge work are:

- Additional pure calculator helpers only after smoke testing.
- Pure data/model mappers if present, easy to fixture, and easy to verify.
- Small pure utility helpers with no DOM access, no network access, and no reliance on page markup.
- Small normalization helpers that can keep bridge-first/local-fallback behavior.

Do **not** use the next extraction PR for full renderers. The safest next runtime extraction should be a small pure helper group with deterministic inputs/outputs and local fallback retained in the classic orchestrator.

## 6. Do not extract next

Do not extract these areas in the next runtime phase:

- Full calculator renderers.
- Chart/SVG DOM renderers.
- Event binding.
- Page boot/init.
- Premium gate UI.
- Chatbot UI.
- Sector panel renderers.
- Functions relying on current markup, CSS classes, focus state, ARIA state, or live DOM mutation.

## 7. Proposed future module structure

```text
domains/investment-intelligence/analytics/scripts/
├── boot.js
├── charts/
│   ├── README.md
│   ├── chart-renderers.js
│   └── svg-helpers.js
├── sectors/
│   ├── README.md
│   ├── sector-panels.js
│   └── sector-data.js
├── calculators/
├── chatbot/
├── premium/
└── utils/
```

Current bridge modules are stepping stones, not final boot ownership. They let the classic script consume pure helpers safely while the page remains a classic deferred entrypoint. Final ownership should move only after module loading, boot sequencing, duplicate initialization, and smoke test gates are proven.

## 8. Classic-to-module migration strategy

- Keep `js/investment-analytics.js` as classic until boot ownership is ready.
- Continue bridge-first/local-fallback for pure helpers.
- After pure helpers stabilize, create a domain boot module without loading it.
- Only then consider a compatibility wrapper or page script relink.
- Do not convert `js/investment-analytics.js` to `type="module"` abruptly.
- Keep each runtime PR small enough to review with focused smoke tests.

## 9. Proposed staged migration order

- **Phase 7A:** Orchestrator cleanup plan + runtime map audit script.
- **Phase 7B:** Create charts/sectors/chatbot/premium README ownership docs and/or missing folders.
- **Phase 7C:** Create pure data/model mapper modules if identifiable, not consumed yet.
- **Phase 7D:** Migrate one additional pure helper group with fallback.
- **Phase 7E:** Create domain boot skeleton but do not load it.
- **Phase 7F:** Page boot compatibility plan.
- **Later:** Move renderers/events only after smoke tests.

## 10. Runtime map audit command

```bash
node scripts/architecture/check-investment-runtime-map.js
```

The audit inspects `index.html` and all `pages/*.html` files for Investment Analytics runtime consumers, CSS manifest consumers, route bridge consumers, investment bridge consumers, and the expected `pages/investment-analytics.html` script order.

## 11. Risk matrix

| Risk                          | Impact                                                                                                                        | Likelihood | Mitigation                                                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------- |
| Broken boot order             | Bridge globals, route globals, Firebase compat globals, or shared scripts are unavailable when the classic orchestrator runs. | Medium     | Keep the runtime map audit in the migration checklist and do not relink scripts without a dedicated smoke pass. |
| Duplicate initialization      | Repeated imports or wrapper calls attach duplicate listeners, duplicate panels, or duplicate chatbot messages.                | Medium     | Add idempotent boot guards before loading any future boot module.                                               |
| Missing bridge dependency     | Classic fallback paths may mask a missing bridge during development, slowing detection.                                       | Medium     | Audit bridge presence and order; require manual smoke tests before fallback cleanup.                            |
| Classic/module timing issue   | A `type="module"` conversion changes execution timing or scope.                                                               | High       | Keep `js/investment-analytics.js` classic until a compatibility wrapper plan is approved.                       |
| Broken chart rendering        | SVG charts render blank, clipped, visually wrong, or inaccessible.                                                            | Medium     | Move chart renderers only after visual/chart smoke testing and class/ARIA contract review.                      |
| Broken calculator rendering   | Calculator panels, result cards, charts, or tables fail to update.                                                            | Medium     | Extract pure helpers first; keep renderers/forms in classic until calculator smoke tests pass.                  |
| Broken sector switching       | Sector buttons no longer update panels or `aria-pressed` state.                                                               | Medium     | Keep selector and panel rendering together until boot strategy is ready.                                        |
| Broken chatbot/premium UI     | Chatbot sends/logs incorrectly or premium access state becomes inconsistent.                                                  | Medium     | Review data/API/auth/access contracts before extraction.                                                        |
| Hidden DOM dependency         | A helper thought to be pure reads markup, classes, globals, time, or current document state.                                  | Medium     | Require purity review and deterministic fixtures before moving helpers.                                         |
| Inaccessible/focus regression | Tooltips, live regions, buttons, or chatbot controls lose keyboard/screen-reader affordances.                                 | Medium     | Include keyboard, focus, ARIA, and live-region checks in smoke tests before moving UI code.                     |

## 12. Relationship to existing docs

- [`investment-frontend-split-plan.md`](investment-frontend-split-plan.md)
- [`investment-module-loading-strategy.md`](investment-module-loading-strategy.md)
- [`investment-calculator-extraction-plan.md`](investment-calculator-extraction-plan.md)
- [`investment-css-consumer-audit.md`](investment-css-consumer-audit.md)
- [`../../domains/investment-intelligence/analytics/scripts/README.md`](../../domains/investment-intelligence/analytics/scripts/README.md)
- [`../../domains/investment-intelligence/analytics/scripts/utils/README.md`](../../domains/investment-intelligence/analytics/scripts/utils/README.md)
- [`../../domains/investment-intelligence/analytics/scripts/calculators/README.md`](../../domains/investment-intelligence/analytics/scripts/calculators/README.md)

## Phase 10A enterprise readiness note

The enterprise readiness checker now validates the Investment runtime map assumptions by running:

```bash
node scripts/architecture/check-investment-runtime-map.js
```

The consolidated gate is:

```bash
node scripts/architecture/check-enterprise-migration-readiness.js
```

This does not convert `js/investment-analytics.js` to `type="module"`; it keeps the current classic entrypoint guarded while future runtime migrations are planned.
