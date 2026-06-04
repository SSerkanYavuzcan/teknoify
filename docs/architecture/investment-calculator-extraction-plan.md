# Investment Analytics Calculator Extraction Plan

## 1. Title and purpose

This document is the **Phase 5P Investment Analytics calculator extraction plan** for Teknoify. It is documentation-only.

The goal is to plan a safe future extraction of investment calculator logic from `js/investment-analytics.js` without moving, refactoring, renaming, or relinking runtime JavaScript, CSS, HTML, data, package, script, workflow, formatter, or chart modules in this phase.

Calculator extraction is intentionally planned after the formatter bridge and chart math bridge work because calculator behavior combines pure financial math with DOM input reads, validation/defaulting, localized parsing, result formatting, SVG/chart rendering, table rendering, tab/selector coordination, and event listeners.

**Phase 5Q note:** The first compound calculator pure module, `domains/investment-intelligence/analytics/scripts/calculators/compound-interest.js`, and legacy-safe bridge, `domains/investment-intelligence/analytics/scripts/calculators/compound-interest-global.js`, now exist. They are not loaded by any HTML page yet, and `js/investment-analytics.js` has not been migrated to consume them, so existing calculator runtime behavior remains unchanged.

**Phase 5R note:** The compound interest bridge is now loaded on `pages/investment-analytics.html`. `js/investment-analytics.js` has not been migrated to read it yet, and the local compound calculator logic remains in place.

**Phase 5W note:** The CAGR bridge is now loaded on `pages/investment-analytics.html` after the compound interest bridge. `js/investment-analytics.js` has not been migrated to read it yet, and the local CAGR calculator logic remains in place.

## 2. Why calculator extraction matters

Calculator extraction matters because the calculators are not just page widgets; they are productizable individual tools:

- They can later live under `domains/investment-intelligence/calculators/` as reusable product-level calculator features.
- They may be reused across public pages, dashboards, member-only experiences, or premium investment flows.
- They are user-facing and output-sensitive, so extraction must preserve numeric results, rounding, formatting, validation, chart output, and accessibility behavior.
- They currently share helpers with the Investment Analytics page, so extraction needs a plan that separates stable math from volatile DOM and rendering layers before runtime code moves.

## 3. Current files inspected

Phase 5P inspected these files and areas without editing runtime pages, JavaScript, or CSS:

- `js/investment-analytics.js`
    - Calculator helper and formatter bridge usage.
    - Compound interest calculator math, parsing, result rendering, chart rendering, table rendering, and event binding.
    - Calculator selector/tab logic.
    - CAGR calculator panel rendering, math, parsing, result rendering, chart rendering, table rendering, mode switching, and event binding.
    - Retirement calculator panel rendering, math, validation, result rendering, chart rendering, table rendering, and event binding.
    - Shared SVG/chart helper usage around calculator charts.
- `pages/investment-analytics.html`
    - Calculator selector markup, `#calculator-panel` mount, compound calculator template, compound inputs/results/chart/table markup, and current script loading order.
- `domains/investment-intelligence/analytics/scripts/calculators/README.md`
    - Current README-only analytics calculator skeleton and migration cautions.
- `domains/investment-intelligence/calculators/README.md`
    - Current README-only product calculator skeleton and migration cautions.
- `css/investment-analytics.css`
    - Manifest imports for Investment Analytics partial styles.
- `css/06-pages/investment-analytics/calculators.css`
    - Calculator selector, panels, fields, result cards, validation, tables, and calculator chart styles.
- `css/06-pages/investment-analytics/responsive.css`
    - Responsive behavior that future calculator rendering or class changes must not break.

No runtime page, JavaScript, CSS, formatter/chart module, data, route, package, script, or workflow file was changed for this plan.

## 4. Current calculator inventory

| Calculator / Function                                                                                                                       | Category                                      | Reads DOM? | Writes DOM? | Uses Formatter? | Uses Chart Math? | Adds Events?                              | Suggested Target                                                                                    | Extraction Priority   | Risk   | Notes                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ---------- | ----------- | --------------- | ---------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------- | ------ | --------------------------------------------------------------------------------------------------------------- |
| `getCompoundFrequencyPerYear`                                                                                                               | Shared calculator pure helper                 | No         | No          | No              | No               | No                                        | `domains/investment-intelligence/analytics/scripts/calculators/shared.js`                           | P0-first              | Low    | Pure frequency mapping used by compound input normalization.                                                    |
| `getContributionFrequencyPerYear`                                                                                                           | Shared calculator pure helper                 | No         | No          | No              | No               | No                                        | `domains/investment-intelligence/analytics/scripts/calculators/shared.js`                           | P0-first              | Low    | Pure monthly/yearly mapping; safe candidate if call sites keep fallback.                                        |
| `formatCalculatorPeriod`                                                                                                                    | Shared calculator display helper              | No         | No          | No              | No               | No                                        | `domains/investment-intelligence/analytics/scripts/calculators/shared.js`                           | P1-later              | Medium | Output text is user-facing Turkish copy, so preserve exact strings.                                             |
| `growCompoundValue`                                                                                                                         | Compound interest pure math                   | No         | No          | No              | No               | No                                        | `domains/investment-intelligence/analytics/scripts/calculators/compound-interest.js`                | P0-first              | Low    | Least-coupled first runtime candidate because it is pure math and has a small input/output surface.             |
| `getContributionTimes`                                                                                                                      | Compound interest pure math                   | No         | No          | No              | No               | No                                        | `domains/investment-intelligence/analytics/scripts/calculators/compound-interest.js`                | P0-first              | Low    | Pure schedule helper but depends on normalized input shape.                                                     |
| `calculateCompoundInterest`                                                                                                                 | Compound interest pure math                   | No         | No          | No              | No               | No                                        | `domains/investment-intelligence/analytics/scripts/calculators/compound-interest.js`                | P0-first              | Medium | Core financial output; pure, but output-sensitive. Must compare sample results before/after.                    |
| `buildBreakdownRows`                                                                                                                        | Compound table data preparation               | No         | No          | Yes             | No               | No                                        | `domains/investment-intelligence/analytics/scripts/calculators/compound-interest.js` or `shared.js` | P1-later              | Medium | Mostly data preparation, but it calls `formatCalculatorPeriod`; rows feed visible table output.                 |
| `buildGrowthSeries`                                                                                                                         | Compound chart data preparation               | No         | No          | No              | No               | No                                        | `domains/investment-intelligence/analytics/scripts/calculators/compound-interest.js`                | P1-later              | Medium | Pure chart data preparation, but chart output must remain visually unchanged.                                   |
| `parseCalculatorInputs`                                                                                                                     | Compound DOM input reading/parsing/defaulting | Yes        | No          | No              | No               | No                                        | Keep in `js/investment-analytics.js` for now                                                        | P2-do-not-extract-yet | High   | Reads IDs from the current page and clamps/parses localized values.                                             |
| `renderCalculatorResults`                                                                                                                   | Compound result rendering                     | Yes        | Yes         | Yes             | No               | No                                        | Keep in `js/investment-analytics.js` for now                                                        | P2-do-not-extract-yet | High   | Writes result cards with formatted money/percent values.                                                        |
| `renderGrowthChart`                                                                                                                         | Compound chart rendering                      | Yes        | Yes         | Yes             | Yes              | No                                        | Keep in `js/investment-analytics.js` for now                                                        | P2-do-not-extract-yet | High   | Creates SVG, writes chart mount/summary, and uses shared chart helpers/formatters.                              |
| `renderBreakdownTable`                                                                                                                      | Compound table rendering                      | Yes        | Yes         | Yes             | No               | No                                        | Keep in `js/investment-analytics.js` for now                                                        | P2-do-not-extract-yet | High   | Writes table HTML and note copy; preserve escaping and empty-state behavior.                                    |
| `updateCompoundCalculator`                                                                                                                  | Compound orchestration                        | Yes        | Yes         | Yes             | Yes              | No                                        | Keep in `js/investment-analytics.js` for now                                                        | P2-do-not-extract-yet | High   | Couples parsing, math, rendering, charting, and table updates.                                                  |
| `initCompoundInterestCalculator`                                                                                                            | Compound event binding                        | Yes        | No          | No              | No               | Yes                                       | Keep in `js/investment-analytics.js` for now                                                        | P2-do-not-extract-yet | High   | Adds input/change listeners and triggers initial calculation.                                                   |
| `updateCalculatorSelectorState`                                                                                                             | Calculator selector/tab state                 | Yes        | Yes         | No              | No               | No                                        | Keep in `js/investment-analytics.js` for now                                                        | P2-do-not-extract-yet | High   | Updates active classes, `aria-pressed`, and label copy for current page buttons.                                |
| `renderCompoundCalculatorPanel`                                                                                                             | Calculator panel rendering                    | Yes        | Yes         | No              | No               | No                                        | Keep in `js/investment-analytics.js` for now                                                        | P2-do-not-extract-yet | Medium | Clones the page template into the current calculator mount.                                                     |
| `renderCalculatorPanel`                                                                                                                     | Calculator selector orchestration             | Yes        | Yes         | No              | No               | No                                        | Keep in `js/investment-analytics.js` for now                                                        | P2-do-not-extract-yet | High   | Coordinates active calculator state, panel rendering, and calculator initialization.                            |
| `initCalculatorSelector`                                                                                                                    | Calculator selector event binding             | Yes        | No          | No              | No               | Yes                                       | Keep in `js/investment-analytics.js` for now                                                        | P2-do-not-extract-yet | High   | Adds selector click listeners and renders default calculator.                                                   |
| `safeMoney`                                                                                                                                 | Retirement shared numeric helper              | No         | No          | No              | No               | No                                        | `domains/investment-intelligence/analytics/scripts/calculators/shared.js`                           | P1-later              | Medium | Pure fallback helper but tied to retirement negative/invalid-value behavior.                                    |
| `getMonthlyRate`                                                                                                                            | Retirement pure math helper                   | No         | No          | No              | No               | No                                        | `domains/investment-intelligence/analytics/scripts/calculators/retirement.js`                       | P1-later              | Medium | Pure helper; verify negative/zero annual rate behavior.                                                         |
| `discountToToday`                                                                                                                           | Retirement pure math helper                   | No         | No          | No              | No               | No                                        | `domains/investment-intelligence/analytics/scripts/calculators/retirement.js`                       | P1-later              | Medium | Pure helper; output affects real-value projections.                                                             |
| `parseRetirementInputs` / `getRetirementFieldNumber`                                                                                        | Retirement DOM input reading/parsing          | Yes        | No          | No              | No               | No                                        | Keep in `js/investment-analytics.js` for now                                                        | P2-do-not-extract-yet | High   | Reads current IDs and depends on localized number parsing/defaulting.                                           |
| `validateRetirementInputs`                                                                                                                  | Retirement validation/defaulting              | No         | No          | No              | No               | No                                        | `domains/investment-intelligence/analytics/scripts/calculators/retirement.js`                       | P1-later              | Medium | Pure validation copy is user-facing and must remain exact.                                                      |
| `simulateRetirementAccumulation`                                                                                                            | Retirement pure math                          | No         | No          | No              | No               | No                                        | `domains/investment-intelligence/analytics/scripts/calculators/retirement.js`                       | P1-later              | High   | Core long-horizon financial projection; output-sensitive.                                                       |
| `simulateRetirementDrawdown`                                                                                                                | Retirement pure math                          | No         | No          | No              | No               | No                                        | `domains/investment-intelligence/analytics/scripts/calculators/retirement.js`                       | P1-later              | High   | Core drawdown behavior affects projected fund depletion and charts.                                             |
| `calculateProjectedRetirementFund`                                                                                                          | Retirement pure math                          | No         | No          | No              | No               | No                                        | `domains/investment-intelligence/analytics/scripts/calculators/retirement.js`                       | P1-later              | High   | Pure but depends on accumulation helper behavior.                                                               |
| `calculateRetirementTargetFund`                                                                                                             | Retirement pure math                          | No         | No          | No              | No               | No                                        | `domains/investment-intelligence/analytics/scripts/calculators/retirement.js`                       | P1-later              | High   | Uses inflation-adjusted target income and present value math.                                                   |
| `calculateRequiredAdditionalMonthlyContribution`                                                                                            | Retirement pure math                          | No         | No          | No              | No               | No                                        | `domains/investment-intelligence/analytics/scripts/calculators/retirement.js`                       | P1-later              | High   | Output is prominent and advice-like; needs strong sample coverage.                                              |
| `buildRetirementLifecycleRows`                                                                                                              | Retirement table data preparation             | No         | No          | No              | No               | No                                        | `domains/investment-intelligence/analytics/scripts/calculators/retirement.js`                       | P1-later              | Medium | Pure rows, but visible table values must remain unchanged.                                                      |
| `buildRetirementChartPoints`                                                                                                                | Retirement chart data preparation             | No         | No          | No              | No               | No                                        | `domains/investment-intelligence/analytics/scripts/calculators/retirement.js` or `chart-helpers.js` | P1-later              | Medium | Pure chart points; keep chart renderer unchanged at first.                                                      |
| `calculateRetirementPlan`                                                                                                                   | Retirement orchestration math                 | No         | No          | No              | No               | No                                        | `domains/investment-intelligence/analytics/scripts/calculators/retirement.js`                       | P1-later              | High   | Pure-ish orchestration, but high financial output sensitivity.                                                  |
| `renderRetirementCalculatorPanel`                                                                                                           | Retirement panel rendering                    | Yes        | Yes         | No              | No               | No                                        | Keep in `js/investment-analytics.js` for now                                                        | P2-do-not-extract-yet | High   | Writes large HTML panel and current markup/classes.                                                             |
| `renderRetirementResults`                                                                                                                   | Retirement result rendering                   | Yes        | Yes         | Yes             | No               | No                                        | Keep in `js/investment-analytics.js` for now                                                        | P2-do-not-extract-yet | High   | Writes formatted user-facing results and explanatory copy.                                                      |
| `renderRetirementGrowthChart`                                                                                                               | Retirement chart rendering                    | Yes        | Yes         | Yes             | Yes              | No                                        | Keep in `js/investment-analytics.js` for now                                                        | P2-do-not-extract-yet | High   | SVG renderer uses shared chart primitives and formatter output.                                                 |
| `renderRetirementBreakdownTable`                                                                                                            | Retirement table rendering                    | Yes        | Yes         | Yes             | No               | No                                        | Keep in `js/investment-analytics.js` for now                                                        | P2-do-not-extract-yet | High   | Writes lifecycle table and note.                                                                                |
| `updateRetirementCalculator`                                                                                                                | Retirement orchestration                      | Yes        | Yes         | Yes             | Yes              | No                                        | Keep in `js/investment-analytics.js` for now                                                        | P2-do-not-extract-yet | High   | Couples parsing, validation, clearing invalid output, math, chart, and table rendering.                         |
| `initRetirementCalculator`                                                                                                                  | Retirement event binding                      | Yes        | No          | No              | No               | Yes                                       | Keep in `js/investment-analytics.js` for now                                                        | P2-do-not-extract-yet | High   | Adds input/change listeners and triggers initial calculation.                                                   |
| `getCagrFieldNumber` / `parseCagrInputs`                                                                                                    | CAGR DOM input reading/parsing/defaulting     | Yes        | No          | No              | No               | No                                        | Keep in `js/investment-analytics.js` for now                                                        | P2-do-not-extract-yet | High   | Reads fields, active mode button state, and date/duration controls.                                             |
| `getCagrBaseResult`                                                                                                                         | CAGR result assembly                          | No         | No          | No              | No               | No                                        | `domains/investment-intelligence/analytics/scripts/calculators/cagr.js`                             | P0-first              | Medium | Pure result object helper, but used by multiple modes.                                                          |
| `calculateCagr`                                                                                                                             | CAGR pure math                                | No         | No          | No              | No               | No                                        | `domains/investment-intelligence/analytics/scripts/calculators/cagr.js`                             | P0-first              | Medium | Pure and relatively contained, but output text and validation are user-facing.                                  |
| `calculateCagrEndingValue`                                                                                                                  | CAGR pure math                                | No         | No          | No              | No               | No                                        | `domains/investment-intelligence/analytics/scripts/calculators/cagr.js`                             | P0-first              | Medium | Pure target ending-value mode.                                                                                  |
| `calculateCagrRequiredDuration`                                                                                                             | CAGR pure math                                | No         | No          | No              | No               | No                                        | `domains/investment-intelligence/analytics/scripts/calculators/cagr.js`                             | P0-first              | Medium | Pure required-duration mode with validation edge cases.                                                         |
| `buildCagrGrowthSeries`                                                                                                                     | CAGR chart data preparation                   | No         | No          | No              | No               | No                                        | `domains/investment-intelligence/analytics/scripts/calculators/cagr.js`                             | P1-later              | Medium | Pure points, but chart output depends on them.                                                                  |
| `buildCagrProjectionRows`                                                                                                                   | CAGR table data preparation                   | No         | No          | No              | No               | No                                        | `domains/investment-intelligence/analytics/scripts/calculators/cagr.js`                             | P1-later              | Medium | Pure rows with cap behavior; visible table must match.                                                          |
| `renderCagrCalculatorPanel`                                                                                                                 | CAGR panel rendering                          | Yes        | Yes         | No              | No               | No                                        | Keep in `js/investment-analytics.js` for now                                                        | P2-do-not-extract-yet | High   | Writes a large HTML panel from script-owned markup.                                                             |
| `renderCagrResults`                                                                                                                         | CAGR result rendering                         | Yes        | Yes         | Yes             | No               | No                                        | Keep in `js/investment-analytics.js` for now                                                        | P2-do-not-extract-yet | High   | Writes result cards and validation messages.                                                                    |
| `renderCagrGrowthChart`                                                                                                                     | CAGR chart rendering                          | Yes        | Yes         | Yes             | Yes              | No                                        | Keep in `js/investment-analytics.js` for now                                                        | P2-do-not-extract-yet | High   | SVG renderer writes mount/summary and uses chart/formatter helpers.                                             |
| `renderCagrProjectionTable`                                                                                                                 | CAGR table rendering                          | Yes        | Yes         | Yes             | No               | No                                        | Keep in `js/investment-analytics.js` for now                                                        | P2-do-not-extract-yet | High   | Writes projection table and capped-row note.                                                                    |
| `updateCagrCalculator`                                                                                                                      | CAGR orchestration                            | Yes        | Yes         | Yes             | Yes              | No                                        | Keep in `js/investment-analytics.js` for now                                                        | P2-do-not-extract-yet | High   | Couples parsing, mode field state, math, rendering, chart, and table updates.                                   |
| `initCagrCalculator`                                                                                                                        | CAGR event binding/mode switching             | Yes        | Yes         | No              | No               | Yes                                       | Keep in `js/investment-analytics.js` for now                                                        | P2-do-not-extract-yet | High   | Adds input/change/click listeners and toggles mode field visibility.                                            |
| `getCompoundChartPoint`, `buildChartPath`, `shouldShowChartValueLabel`, `appendSvgTitle`, `appendChartPointMarker`, `appendChartValueLabel` | Calculator chart/render helpers               | Some       | Some        | Some            | Yes              | Tooltip helpers may add events indirectly | `domains/investment-intelligence/analytics/scripts/calculators/chart-helpers.js` later              | P2-do-not-extract-yet | High   | Mixed SVG rendering helpers are shared by calculator chart renderers; do not extract until pure math is stable. |

## 5. Calculator boundaries

Future calculator extraction should preserve clear boundaries between these layers:

1. **Pure calculator math**: deterministic functions that receive normalized input objects or primitive values and return result objects, schedules, rows, or chart points without reading the DOM, writing the DOM, formatting display strings, or adding listeners.
2. **Input parsing**: conversion from raw string values to numbers, dates, modes, and frequencies.
3. **Validation/defaulting**: clamping, fallback defaults, error messages, and invalid-state decisions.
4. **DOM input reading**: `document.getElementById`, `querySelector`, active-button reads, and template/mount lookup.
5. **Result formatting**: currency, percent, compact number, duration, and localized display formatting.
6. **Result rendering**: result card HTML, validation messages, `aria-live` updates, notes, and empty-state copy.
7. **Chart data preparation**: pure conversion from calculator results to chart point arrays or series rows.
8. **Chart rendering**: SVG creation, chart paths, axes, labels, tooltips, legends, summaries, mount updates, and chart fallback/error states.
9. **Event binding**: input/change/click/keyboard listeners and duplicate-listener prevention.
10. **Tab/selector coordination**: calculator selector active state, `aria-pressed`, active label copy, panel switching, and initialization after panel render.

Pure calculator math is safer to extract before DOM, renderer, chart renderer, and event layers because it can be tested with fixed sample inputs and compared against current outputs without changing page lifecycle or listener registration.

## 6. Do not extract first

Do **not** extract these areas in the first calculator runtime PR:

- Event binding.
- Tab switching and calculator selector coordination.
- DOM render functions.
- Chart render functions.
- Premium gate interactions.
- Chatbot interactions.
- Functions coupled to current page state, current selectors, current IDs, or current template/mount structure.
- Functions whose output cannot be easily verified with sample inputs and before/after screenshots or DOM snapshots.
- Functions that create or mutate large HTML strings for calculator panels.
- Functions that depend on current CSS class names or responsive layout assumptions.

## 7. Proposed future module structure

Future current-page implementation modules can live under:

```text
domains/investment-intelligence/analytics/scripts/calculators/
├── README.md
├── index.js
├── shared.js
├── compound-interest.js
├── cagr.js
├── retirement.js
└── chart-helpers.js
```

Possible future product-level calculators can live under:

```text
domains/investment-intelligence/calculators/
├── compound-interest/
├── cagr/
├── retirement/
└── shared/
```

The distinction should remain explicit:

- `domains/investment-intelligence/analytics/scripts/calculators/` is for the current Investment Analytics page implementation and compatibility with `pages/investment-analytics.html` plus the classic `js/investment-analytics.js` entrypoint.
- `domains/investment-intelligence/calculators/` is for reusable, productized calculators that may later power public standalone tools, dashboard cards, premium flows, APIs, or packages.

Do not create calculator JavaScript modules in Phase 5P. This plan only documents where they may live later.

## 8. Module/bridge strategy

Because `js/investment-analytics.js` is still a classic deferred script, calculator extraction must respect the existing module-loading strategy:

- Calculator pure math modules may need a global bridge pattern if they must be consumed before the full Investment Analytics entrypoint is converted to ES modules.
- Do not expose DOM renderers globally. A bridge, if needed, should expose only stable pure math functions with a narrow namespace.
- Local fallback functions should remain in `js/investment-analytics.js` during the first migration so the page preserves behavior if bridge loading fails or the namespace is unavailable.
- Formatter and chart math bridges are already available and should be used cautiously; calculator extraction should not expand their public surface casually.
- Calculator extraction should not begin until formatter bridge and chart math bridge smoke tests pass.
- Bridge loading should be additive and ordered before the classic script only when a future runtime PR is ready to migrate one consumer.
- Any bridge lookup should fail safe, warn clearly, and fall back to current local behavior.

## 9. Proposed staged migration order

- **Phase 5P:** Create this calculator extraction plan only. Do not move runtime calculator logic.
- **Phase 5Q:** Create or update calculator README/skeleton documentation if needed. Do not create runtime calculator modules unless that phase explicitly scopes them.
- **Phase 5R:** Extract pure calculator math for one calculator only, likely the least coupled function group.
- **Phase 5S:** Migrate `growCompoundValue` to bridge-first/local-fallback behavior while keeping calculator render, input, validation, chart, and event logic untouched.
- **Phase 5T:** Add a calculator bridge/runtime smoke test document with sample input/output checks and manual page checks after the first compound calculator consumer migration.
- **Phase 5U:** Migrate the next calculator math consumer only after compound bridge smoke testing passes, with a local fallback and unchanged DOM/render/chart/event behavior.
- **Later:** Extract chart data preparation, rendering, and event binding only after math extraction is stable and smoke-tested.

## 10. First runtime PR recommendation

The first actual calculator runtime PR should:

- Extract only pure math for the least coupled calculator/function group.
- Do not change DOM input reads, event binding, panel rendering, chart rendering, table rendering, selector behavior, or chart helper behavior.
- Do not rename call sites beyond the smallest bridge/fallback wrapper needed.
- Keep local fallback functions in `js/investment-analytics.js` until smoke tests prove bridge behavior is stable.
- Add or update a smoke test/checklist before extracting more calculator logic.

Recommended first runtime extraction target: **compound interest pure math helper `growCompoundValue` plus its minimal helper group only if needed**.

Reason: `growCompoundValue` is identifiable from inspection as the least coupled calculator math function. It does not read or write the DOM, does not format output, does not add events, and does not directly render charts. The broader compound calculation (`calculateCompoundInterest` and `getContributionTimes`) is also pure, but it is more output-sensitive and should follow only after `growCompoundValue` bridge/fallback behavior is proven.

Phase 5S confirms `growCompoundValue` now uses bridge-first/local-fallback behavior, while calculator render, input, validation, chart, and event logic remains untouched.

Phase 5T adds `investment-compound-bridge-smoke-test.md`, a manual checklist and result document for validating the compound interest bridge after the first compound calculator consumer migration.

Phase 5U adds `investment-cagr-extraction-plan.md`, a documentation-only CAGR extraction plan. No runtime CAGR logic was moved, no CAGR JavaScript modules were created, and the current page implementation remains in `js/investment-analytics.js`.

## 11. Smoke test checklist

Future calculator extraction PRs should include a smoke test document or completed checklist covering:

- Calculator tab/selector still works.
- Compound interest outputs are unchanged for sample inputs.
- CAGR outputs are unchanged for sample inputs.
- Retirement outputs are unchanged for sample inputs.
- Invalid/empty inputs behave the same.
- Currency/percentage formatting is unchanged.
- Chart outputs are unchanged.
- Mobile layout is unchanged.
- No duplicate event listeners are introduced.
- No console errors appear.
- Formatter bridge fallback still works.
- Chart math bridge fallback still works.

Suggested sample coverage should include default inputs, zero/empty inputs, negative or edge annual rates where supported, monthly versus yearly contributions, CAGR mode switching, invalid CAGR duration/target combinations, retirement age validation, and retirement shortfall/additional-contribution cases.

## 12. Risk matrix

| Risk                                                  | Impact | Likelihood | Mitigation                                                                                                                               |
| ----------------------------------------------------- | ------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Changed financial output                              | High   | Medium     | Extract one pure function group at a time; compare fixed sample inputs before/after; keep local fallback.                                |
| Changed rounding/formatting                           | High   | Medium     | Do not move formatters in calculator PRs; preserve formatter bridge fallback and exact formatter call sites.                             |
| Broken input parsing                                  | High   | Medium     | Do not extract DOM reads/parsing first; add sample invalid/empty/localized input checks before moving parsing.                           |
| Broken empty/default values                           | High   | Medium     | Preserve current clamp/default rules and test blank, zero, and boundary values.                                                          |
| Broken event listeners                                | High   | Medium     | Keep event binding in the classic entrypoint until renderer/math are stable; test for duplicate updates after tab switching.             |
| Broken chart rendering                                | High   | Medium     | Keep chart renderers local during first math extraction; compare chart summaries and visible SVG output.                                 |
| Broken mobile layout                                  | Medium | Medium     | Do not change markup/classes/CSS in calculator math PRs; include mobile viewport smoke checks before moving renderers.                   |
| Broken premium gating                                 | High   | Low        | Do not touch premium gate scripts, pages, or styles during calculator extraction; coordinate separately before premium calculator reuse. |
| Module/classic script incompatibility                 | High   | Medium     | Use bridge loading only when needed; keep local fallback; load bridge before the classic script; fail safe.                              |
| Hidden dependency on formatter/chart helper functions | High   | Medium     | Inventory helper calls before extraction; avoid exposing renderers globally; verify formatter and chart math bridge smoke tests first.   |

## 13. Relationship to existing docs

This plan builds on and should be read with:

- [`investment-frontend-split-plan.md`](investment-frontend-split-plan.md)
- [`investment-utility-extraction-checklist.md`](investment-utility-extraction-checklist.md)
- [`investment-formatter-bridge-smoke-test.md`](investment-formatter-bridge-smoke-test.md)
- [`investment-chart-math-bridge-smoke-test.md`](investment-chart-math-bridge-smoke-test.md)
- [`../../domains/investment-intelligence/analytics/scripts/calculators/README.md`](../../domains/investment-intelligence/analytics/scripts/calculators/README.md)
- [`../../domains/investment-intelligence/calculators/README.md`](../../domains/investment-intelligence/calculators/README.md)

## 14. Docs index update

Phase 5P also updates `docs/architecture/README.md` so this plan appears in the architecture document index.

Phase 5P adds a short note to `docs/architecture/investment-frontend-split-plan.md` confirming that calculator extraction planning now exists and no runtime calculator logic was moved.

Phase 5P adds a short note to `domains/investment-intelligence/analytics/scripts/calculators/README.md` confirming that calculator extraction planning is documented and no calculator JavaScript modules have been created yet.
