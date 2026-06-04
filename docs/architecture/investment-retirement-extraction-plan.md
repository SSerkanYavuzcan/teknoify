# Investment Retirement Calculator Extraction Plan

## 1. Title and purpose

Phase 5Z is a documentation-only planning phase for the Investment Analytics retirement calculator. The goal is to inspect the current retirement implementation and define a safe extraction plan before moving any runtime logic out of `js/investment-analytics.js`.

This phase does **not** create retirement JavaScript modules, does **not** load new retirement bridges, and does **not** change any runtime HTML, CSS, JS, data, scripts, workflows, or package files. Retirement extraction should remain blocked until the boundaries, risks, bridge strategy, and smoke test coverage below are reviewed.

**Phase 5AA note:** The first pure retirement calculator module, `domains/investment-intelligence/analytics/scripts/calculators/retirement.js`, and its legacy-safe bridge, `domains/investment-intelligence/analytics/scripts/calculators/retirement-global.js`, now exist. They are not loaded by `pages/investment-analytics.html`, are not consumed by `js/investment-analytics.js`, and do not change existing retirement runtime behavior yet.

## 2. Why retirement extraction matters

Retirement is a reusable and productizable investment calculator. Unlike smaller helper calculators, it combines long-range accumulation, contribution growth, drawdown, inflation, target fund, shortfall, lifecycle table, and chart projections into outputs that users may treat as financial planning guidance.

That makes retirement highly output-sensitive:

- It may later become a standalone public or premium calculator.
- It can influence user expectations about retirement readiness, future savings needs, and funding gaps.
- Any changed projection, default, validation rule, table row, or chart point may appear as a change in financial assumptions.
- Extraction must preserve current UI behavior, validation messages, chart output, table output, formatting, event behavior, and assumptions exactly until intentional product changes are separately reviewed.

## 3. Current files inspected

Phase 5Z inspected these files without editing runtime assets:

- `js/investment-analytics.js`: contains the current retirement helpers, panel markup generation, DOM input parsing, validation, accumulation/drawdown math, target fund binary searches, chart point preparation, result rendering, SVG chart rendering, table rendering, update orchestration, and input event binding.
- `pages/investment-analytics.html`: contains the calculator selector card for `data-calculator-key="retirement"`, the shared `#calculator-panel` mount, existing formatter/chart/compound/CAGR bridge script tags, and the classic deferred `js/investment-analytics.js` entrypoint.
- `domains/investment-intelligence/analytics/scripts/calculators/README.md`: documents the future calculator module area and current compound/CAGR bridge migration status.
- `domains/investment-intelligence/calculators/README.md`: documents the future productized calculator feature area.
- `css/investment-analytics.css`: entry stylesheet for the Investment Analytics page.
- `css/06-pages/investment-analytics/calculators.css`: contains retirement calculator, result grid, chart, table, and mobile layout selectors used by current generated markup.

## 4. Current retirement inventory

| Function/Constant                                                                                  | Category                                  | Reads DOM? | Writes DOM?      | Uses Formatter? | Uses Chart Math? | Adds Events?                      | Suggested Target                                                                                    | Extraction Priority   | Risk   | Notes                                                                                                           |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------- | ---------- | ---------------- | --------------- | ---------------- | --------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------- | ------ | --------------------------------------------------------------------------------------------------------------- |
| `safeMoney`                                                                                        | Pure money helper                         | No         | No               | No              | No               | No                                | `domains/investment-intelligence/analytics/scripts/calculators/shared.js` or `retirement.js`        | P0-first              | Low    | Clamps non-finite/negative money values to `0`; used by accumulation and drawdown loops.                        |
| `getMonthlyRate`                                                                                   | Pure rate helper                          | No         | No               | No              | No               | No                                | `domains/investment-intelligence/analytics/scripts/calculators/shared.js` or `retirement.js`        | P0-first              | Low    | Converts annual return to clamped monthly rate; isolated and deterministic, but affects every projection.       |
| `discountToToday`                                                                                  | Pure inflation/discount helper            | No         | No               | No              | No               | No                                | `domains/investment-intelligence/analytics/scripts/calculators/shared.js` or `retirement.js`        | P0-first              | Medium | Used for real projected/target fund values; output-sensitive because it changes buying-power labels.            |
| `getRetirementFieldNumber`                                                                         | DOM input parsing helper                  | Yes        | No               | No              | No               | No                                | Keep in `js/investment-analytics.js` for now                                                        | P2-do-not-extract-yet | Medium | Reads individual inputs and depends on `parseLocalizedNumber`; should stay local until DOM parsing is isolated. |
| `renderRetirementCalculatorPanel`                                                                  | Panel rendering/orchestration             | Yes        | Yes              | No              | No               | No                                | Keep in `js/investment-analytics.js` for now                                                        | P2-do-not-extract-yet | High   | Replaces `#calculator-panel`, embeds current markup/classes/defaults, and calls `initRetirementCalculator`.     |
| Retirement default input markup                                                                    | Defaults/UI assumptions                   | No         | Yes              | No              | No               | No                                | Keep in `js/investment-analytics.js` for now                                                        | P2-do-not-extract-yet | High   | Defaults include ages, savings, contribution, returns, inflation, desired income, and contribution growth.      |
| `parseRetirementInputs`                                                                            | DOM input parsing/default conversion      | Yes        | No               | No              | No               | No                                | Keep in `js/investment-analytics.js` for now                                                        | P2-do-not-extract-yet | High   | Converts percent fields to decimals and shapes the calculation input object.                                    |
| `validateRetirementInputs`                                                                         | Validation                                | No         | No               | No              | No               | No                                | `domains/investment-intelligence/analytics/scripts/calculators/retirement.js` later                 | P1-later              | Medium | Pure validation strings are extractable, but Turkish message text must remain byte-for-byte stable.             |
| `simulateRetirementAccumulation`                                                                   | Pure retirement accumulation math         | No         | No               | No              | No               | No                                | `domains/investment-intelligence/analytics/scripts/calculators/retirement.js`                       | P1-later              | High   | Annual rows depend on monthly compounding order, contribution timing, and contribution growth.                  |
| `simulateRetirementDrawdown`                                                                       | Pure retirement drawdown math             | No         | No               | No              | No               | No                                | `domains/investment-intelligence/analytics/scripts/calculators/retirement.js`                       | P1-later              | High   | Handles withdrawals, inflation-adjusted income, depletion age, and end-of-plan support.                         |
| `calculateProjectedRetirementFund`                                                                 | Pure projected fund wrapper               | No         | No               | No              | No               | No                                | `domains/investment-intelligence/analytics/scripts/calculators/retirement.js`                       | P1-later              | Medium | Thin wrapper over accumulation; safe only after accumulation parity is covered.                                 |
| `calculateRetirementTargetFund`                                                                    | Target fund binary-search math            | No         | No               | No              | No               | No                                | `domains/investment-intelligence/analytics/scripts/calculators/retirement.js`                       | P1-later              | High   | Repeatedly calls drawdown simulation; small changes affect required nest egg.                                   |
| `calculateRequiredAdditionalMonthlyContribution`                                                   | Shortfall/contribution binary-search math | No         | No               | No              | No               | No                                | `domains/investment-intelligence/analytics/scripts/calculators/retirement.js`                       | P1-later              | High   | Calculates extra monthly contribution; especially sensitive as user-facing planning guidance.                   |
| `buildRetirementLifecycleRows`                                                                     | Pure lifecycle table data orchestration   | No         | No               | No              | No               | No                                | `domains/investment-intelligence/analytics/scripts/calculators/retirement.js`                       | P1-later              | High   | Combines accumulation and drawdown rows consumed by table and chart.                                            |
| `buildRetirementChartPoints`                                                                       | Chart data preparation                    | No         | No               | No              | No               | No                                | `domains/investment-intelligence/analytics/scripts/calculators/chart-helpers.js` or `retirement.js` | P1-later              | Medium | Pure, but tightly coupled to row shape and current age labels.                                                  |
| `calculateRetirementPlan`                                                                          | Calculation orchestration                 | No         | No               | No              | No               | No                                | `domains/investment-intelligence/analytics/scripts/calculators/retirement.js` later                 | P1-later              | High   | Aggregates all projection, target, real value, shortfall, lifecycle, and chart data outputs.                    |
| `renderRetirementResults`                                                                          | Result rendering                          | Yes        | Yes              | Yes             | No               | No                                | Keep in `js/investment-analytics.js` for now                                                        | P2-do-not-extract-yet | High   | Uses `formatUsdCurrency`, `formatPercent`, `escapeHtml`, result cards, and current Turkish copy.                |
| `renderRetirementGrowthChart`                                                                      | SVG chart rendering                       | Yes        | Yes              | Yes             | Yes              | No                                | Keep in `js/investment-analytics.js` for now                                                        | P2-do-not-extract-yet | High   | Uses SVG helpers, chart labels, marker helpers, compact/currency formatters, and summary copy.                  |
| `renderRetirementBreakdownTable`                                                                   | Table rendering                           | Yes        | Yes              | Yes             | No               | No                                | Keep in `js/investment-analytics.js` for now                                                        | P2-do-not-extract-yet | High   | Writes rows and note text; depends on row shape, CSS classes, `escapeHtml`, and currency formatting.            |
| `updateRetirementCalculator`                                                                       | DOM orchestration                         | Yes        | Yes              | Yes             | Yes              | No                                | Keep in `js/investment-analytics.js` for now                                                        | P2-do-not-extract-yet | High   | Coordinates parsing, validation, clearing stale DOM, calculation, results, chart, and table rendering.          |
| `initRetirementCalculator`                                                                         | Event binding                             | Yes        | No               | No              | No               | Yes                               | Keep in `js/investment-analytics.js` for now                                                        | P2-do-not-extract-yet | High   | Adds `input` and `change` listeners to generated retirement inputs and triggers initial calculation.            |
| `renderCalculatorPanel` retirement branch                                                          | Tab/selector coordination                 | Yes        | Yes              | No              | No               | No                                | Keep in `js/investment-analytics.js` for now                                                        | P2-do-not-extract-yet | High   | Coordinates calculator selector state and dynamically renders the retirement panel.                             |
| `parseLocalizedNumber`                                                                             | Shared input helper used by retirement    | No         | No               | No              | No               | No                                | Existing/shared utilities only after separate review                                                | needs-review          | Medium | Shared across calculators; not retirement-specific and should not be moved in a retirement PR.                  |
| `formatUsdCurrency`, `formatUsdCompact`, `formatPercent`                                           | Shared formatters used by retirement      | No         | No               | Yes             | No               | No                                | Existing formatter bridge/shared utilities                                                          | needs-review          | High   | Existing formatter bridge should be used cautiously; no formatter changes in retirement extraction.             |
| `createSvgElement`, `appendChartPointMarker`, `appendChartValueLabel`, `shouldShowChartValueLabel` | Shared chart helpers used by retirement   | No         | Writes SVG nodes | Yes             | Yes              | No                                | Existing chart helpers/`chart-helpers.js` later                                                     | needs-review          | High   | Existing chart math bridge exists, but retirement chart rendering should stay local initially.                  |
| Calculator selector card for retirement                                                            | Page selector markup                      | Yes        | Yes              | No              | No               | Yes through shared selector setup | Keep in `pages/investment-analytics.html`                                                           | P2-do-not-extract-yet | High   | Page HTML should not change in this phase; selector behavior must remain stable.                                |
| CSS retirement selectors                                                                           | Styling/layout                            | No         | No               | No              | No               | No                                | Keep in current CSS files                                                                           | P2-do-not-extract-yet | Medium | Current generated markup relies on existing retirement classes and mobile rules.                                |

## 5. Retirement boundaries

Retirement should be separated into layers before any runtime movement:

1. **Pure money/rate helpers**: `safeMoney`, `getMonthlyRate`, and possibly `discountToToday` after inflation parity samples exist.
2. **Pure retirement accumulation math**: monthly compounding, contribution timing, annual contribution growth, and accumulation rows.
3. **Pure retirement drawdown math**: post-retirement returns, inflation-adjusted withdrawals, depletion age, ending balance, and support flags.
4. **Target fund and shortfall math**: binary searches for required target fund and extra monthly contribution.
5. **Validation/defaulting**: numeric boundaries, Turkish validation messages, field defaults, and percentage conversion rules.
6. **DOM input reading**: `document.getElementById`, localized number parsing, and current field IDs.
7. **Result formatting**: currency, compact currency, percent, and HTML escaping.
8. **Result rendering**: result card copy, classes, and ARIA live regions.
9. **Chart data preparation**: lifecycle row to chart point conversion.
10. **Chart rendering**: SVG dimensions, grid, paths, markers, labels, tooltips, summary copy, and formatter calls.
11. **Table rendering**: table row markup, positive/negative classes, note text, and formatter calls.
12. **Event binding**: input/change listeners and initial update call.
13. **Tab/selector coordination**: calculator selector state, active calculator key, and panel replacement.

Pure helpers are safer to extract before orchestration, rendering, event, and selector layers because they can be compared with deterministic sample inputs and can keep local fallbacks while the classic script remains the runtime owner.

## 6. Do not extract first

The first retirement extraction PR should not move:

- Event binding.
- Tab switching.
- DOM render functions.
- Chart render functions.
- Table render functions.
- Premium gate interactions.
- Chatbot interactions.
- Functions coupled to current page state.
- Functions whose output cannot be easily verified.
- Functions whose output may be interpreted as advice unless sample coverage is strong.

## 7. Proposed future module structure

Current-page implementation modules may eventually live under:

```text
domains/investment-intelligence/analytics/scripts/calculators/
├── retirement.js
├── retirement-global.js
├── shared.js
└── chart-helpers.js
```

Potential productized future materials may eventually live under:

```text
domains/investment-intelligence/calculators/retirement/
├── README.md
├── model.md
├── assumptions.md
└── examples.md
```

`domains/investment-intelligence/analytics/scripts/calculators/retirement.js` should serve the current Investment Analytics page implementation and should begin with pure math only. `domains/investment-intelligence/calculators/retirement/` should be reserved for a future standalone/productized retirement calculator with its own model documentation, assumptions, and examples.

## 8. Module/bridge strategy

`js/investment-analytics.js` is still a classic script, so retirement extraction must follow the existing bridge-first strategy:

- Retirement pure math modules may need a global bridge pattern if consumed before full module conversion.
- Do not expose DOM renderers globally.
- Local fallback functions should remain during the first migration so the page still works if the bridge is missing, malformed, incomplete, frozen, or throws.
- Formatter and chart math bridges are already available and should be used cautiously; retirement extraction should not change formatter or chart helper behavior.
- Retirement extraction should not proceed beyond pure math until compound and CAGR bridge smoke testing is considered and any regression patterns are addressed.

## 9. Proposed staged migration order

- **Phase 5Z**: Create this retirement extraction plan only. Do not move retirement runtime logic.
- **Phase 5AA**: Create a pure retirement math module and global bridge only. Do not migrate consumers.
- **Phase 5AB**: Load the retirement bridge on `pages/investment-analytics.html` before `js/investment-analytics.js` while preserving local behavior.
- **Phase 5AC**: Migrate one low-risk pure retirement helper with a local fallback.
- **Phase 5AD**: Add a retirement bridge smoke test checklist/result document.
- **Later**: Extract broader retirement calculation groups, chart data, table data, rendering, and event binding only after bridge smoke tests pass.

## 10. First runtime PR recommendation

The first actual retirement runtime PR should:

- Extract only the least coupled pure helper if clearly identified.
- Do not change DOM, event, render, chart, or table logic.
- Do not rename call sites except for the smallest bridge/fallback wrapper needed.
- Keep local fallback behavior in `js/investment-analytics.js`.
- Add a retirement smoke test checklist before extracting more.

Recommended first retirement runtime extraction target: **`safeMoney`**.

Reason: `safeMoney` is the least coupled pure helper identified from inspection. It does not read or write the DOM, does not format output, does not use chart helpers, does not add events, and has a small deterministic contract: return a finite non-negative money value or `0`. It is still projection-sensitive because accumulation and drawdown loops call it repeatedly, so the first runtime PR must keep a local fallback and compare default, zero, invalid, negative, and high-growth samples before extracting broader retirement math.

`getMonthlyRate` is also a plausible early candidate, but it directly changes every monthly compounding step and has more rate-edge assumptions. `discountToToday` should follow later because it affects inflation/buying-power outputs that users may interpret as planning guidance.

## 11. Smoke test checklist

Future retirement migration PRs should verify:

- Retirement calculator UI still renders.
- Retirement output unchanged for sample positive inputs.
- Retirement output unchanged for zero/invalid/empty inputs.
- Retirement validation messages unchanged.
- Retirement target fund/shortfall values unchanged.
- Required additional contribution output unchanged.
- Lifecycle table unchanged.
- Retirement chart unchanged.
- Currency/percentage formatting unchanged.
- Calculator tab/selector still works.
- Compound calculator still works.
- CAGR calculator still works.
- Formatter bridge fallback still works.
- Chart math bridge fallback still works.
- Mobile layout unchanged.
- No duplicate event listeners.
- No console errors.

## 12. Risk matrix

| Risk                                               | Impact | Likelihood | Mitigation                                                                                                             |
| -------------------------------------------------- | ------ | ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| Changed retirement projection                      | High   | Medium     | Extract one pure helper at a time; compare fixed default and edge-case samples; keep local fallback.                   |
| Changed drawdown behavior                          | High   | Medium     | Do not move drawdown until accumulation and helper parity is proven; add depletion-age and ending-balance samples.     |
| Changed inflation/discounting behavior             | High   | Medium     | Keep `discountToToday` local until real value samples cover positive, zero, and negative inflation.                    |
| Changed required monthly contribution              | High   | Medium     | Do not move binary-search shortfall logic until projected and target fund parity are documented.                       |
| Changed validation/defaults                        | High   | Medium     | Keep DOM parsing/default markup local; compare exact Turkish validation messages and boundary values.                  |
| Changed table rows                                 | High   | Medium     | Preserve lifecycle row shape and table rendering until sample table snapshots are available.                           |
| Broken chart output                                | High   | Medium     | Keep chart rendering local; verify SVG paths, markers, labels, summary copy, and chart helper fallback.                |
| Broken event listeners                             | High   | Medium     | Keep `initRetirementCalculator` local; smoke test repeated selector switching for duplicate updates.                   |
| Broken tab/selector behavior                       | High   | Medium     | Do not change `renderCalculatorPanel`, selector markup, or page script order during pure math extraction.              |
| Module/classic script incompatibility              | High   | Medium     | Use a global bridge loaded before the classic script; fail safe to local functions if unavailable.                     |
| Hidden dependency on formatter/chart helpers       | High   | Medium     | Inventory formatter/chart calls before extraction; do not expose DOM renderers or SVG renderers globally.              |
| User misinterpretation of changed financial output | High   | Medium     | Treat output parity as mandatory; document assumptions and avoid changing financial model semantics in extraction PRs. |

## 13. Relationship to existing docs

This plan builds on and should be read with:

- [`investment-calculator-extraction-plan.md`](investment-calculator-extraction-plan.md)
- [`investment-compound-bridge-smoke-test.md`](investment-compound-bridge-smoke-test.md)
- [`investment-cagr-bridge-smoke-test.md`](investment-cagr-bridge-smoke-test.md)
- [`investment-formatter-bridge-smoke-test.md`](investment-formatter-bridge-smoke-test.md)
- [`investment-chart-math-bridge-smoke-test.md`](investment-chart-math-bridge-smoke-test.md)
- [`investment-module-loading-strategy.md`](investment-module-loading-strategy.md)
- [`../../domains/investment-intelligence/analytics/scripts/calculators/README.md`](../../domains/investment-intelligence/analytics/scripts/calculators/README.md)
- [`../../domains/investment-intelligence/calculators/README.md`](../../domains/investment-intelligence/calculators/README.md)

## 14. Docs index update

Phase 5Z adds this document to `docs/architecture/README.md` so the retirement extraction plan appears in the architecture document index.

Phase 5Z also adds a short note to `docs/architecture/investment-calculator-extraction-plan.md` confirming that retirement extraction planning was created and no runtime retirement logic was moved.

Phase 5Z also adds a short note to `domains/investment-intelligence/analytics/scripts/calculators/README.md` confirming that retirement extraction planning is documented and no retirement JavaScript modules have been created yet.
