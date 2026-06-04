# Investment Analytics CAGR Extraction Plan

## 1. Title and purpose

Phase 5U is a documentation-only plan for safely extracting Compound Annual Growth Rate (CAGR) calculator logic from `js/investment-analytics.js`.

This phase does not move, refactor, rename, or create runtime JavaScript, CSS, HTML, data, route, workflow, package, compound, formatter, or chart files. Its purpose is to inspect the current CAGR implementation, document extraction boundaries, and define a low-risk migration order before any runtime CAGR module is created.

## 2. Why CAGR extraction matters

- CAGR is a reusable investment calculator: the same annualized return formula can support analytics pages, standalone tools, comparison widgets, and educational content.
- CAGR may become a standalone public or premium product calculator later, so the current implementation should be understood before page-specific behavior is separated from reusable math.
- CAGR is output-sensitive because the current page combines financial percentages, invalid input messages, zero and empty values, date/duration modes, Turkish percentage formatting, USD formatting, chart labels, and projection rows.
- Extraction must preserve current UI behavior. The calculator selector, input mode toggles, disabled calculated-ending field state, validation text, result cards, chart, projection table, formatter bridge behavior, and existing compound calculator behavior must remain unchanged.

## 3. Current files inspected

The following files were inspected for this plan and were not edited except where explicitly listed in the Phase 5U documentation updates:

- `js/investment-analytics.js`
    - CAGR panel rendering, input parsing, validation/defaulting, math, result rendering, chart rendering, table rendering, event binding, and calculator selector coordination were inspected.
- `pages/investment-analytics.html`
    - The calculator selector cards and existing bridge loading order were inspected. The page was not changed.
- `domains/investment-intelligence/analytics/scripts/calculators/README.md`
    - Existing calculator module status and compound bridge notes were inspected.
- `domains/investment-intelligence/calculators/README.md`
    - Future product calculator folder guidance was inspected.
- `css/investment-analytics.css`
    - The page stylesheet import graph was inspected.
- `css/06-pages/investment-analytics/calculators.css`
    - CAGR calculator selectors, result grid, validation message, and chart classes were inspected. CSS was not changed.

## 4. Current CAGR inventory

| Function/Constant                                                                                  | Category                                       | Reads DOM? | Writes DOM?                | Uses Formatter?                                          | Uses Chart Math?           | Adds Events?              | Suggested Target                                                                                               | Extraction Priority   | Risk   | Notes                                                                                                                         |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ---------- | -------------------------- | -------------------------------------------------------- | -------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `defaultCalculatorKey`                                                                             | Selector state/default                         | No         | No                         | No                                                       | No                         | No                        | Keep in `js/investment-analytics.js` for now                                                                   | P2-do-not-extract-yet | Medium | Shared by all calculator panels; not CAGR-specific.                                                                           |
| `activeCalculatorKey`                                                                              | Selector state/default                         | No         | No                         | No                                                       | No                         | No                        | Keep in `js/investment-analytics.js` for now                                                                   | P2-do-not-extract-yet | Medium | Page state for compound/CAGR/retirement selection.                                                                            |
| `formatPercent`                                                                                    | Result formatting helper                       | No         | No                         | Yes, local formatter-style helper                        | No                         | No                        | `domains/investment-intelligence/analytics/scripts/calculators/shared.js` only after formatter strategy review | P1-later              | High   | CAGR and retirement use this exact Turkish percent formatting; could later route through formatter bridge if contract exists. |
| `formatDurationYears`                                                                              | Result formatting helper                       | No         | No                         | No                                                       | No                         | No                        | `domains/investment-intelligence/analytics/scripts/calculators/shared.js`                                      | P1-later              | Medium | Pure formatter-like helper, but output text must remain exact.                                                                |
| `getCagrFieldNumber`                                                                               | CAGR DOM input parsing helper                  | Yes        | No                         | No                                                       | No                         | No                        | Keep in `js/investment-analytics.js` for now                                                                   | P2-do-not-extract-yet | Medium | Thin DOM wrapper around `parseLocalizedNumber`; not pure because it reads fields by id.                                       |
| `updateCalculatorSelectorState`                                                                    | Tab/selector coordination                      | Yes        | Yes                        | No                                                       | No                         | No                        | Keep in `js/investment-analytics.js` for now                                                                   | P2-do-not-extract-yet | High   | Shared selector UI state and labels; extraction could break all calculator tabs.                                              |
| `renderCagrCalculatorPanel`                                                                        | CAGR panel rendering                           | Yes        | Yes                        | No                                                       | No                         | No                        | Keep in `js/investment-analytics.js` for now                                                                   | P2-do-not-extract-yet | High   | Injects CAGR markup and calls `initCagrCalculator`; tightly coupled to current page DOM and CSS classes.                      |
| `renderCalculatorPanel`                                                                            | Tab/selector coordination                      | Yes        | Yes                        | No                                                       | No                         | No                        | Keep in `js/investment-analytics.js` for now                                                                   | P2-do-not-extract-yet | High   | Routes between compound, CAGR, and retirement panels.                                                                         |
| `parseCagrInputs`                                                                                  | CAGR input parsing, validation/defaulting seed | Yes        | No                         | No                                                       | No                         | No                        | Keep in `js/investment-analytics.js` for now                                                                   | P2-do-not-extract-yet | High   | Reads mode, active duration toggle, numeric fields, and dates; produces `validationMessage`.                                  |
| `getCagrBaseResult`                                                                                | CAGR pure result model helper                  | No         | No                         | No                                                       | No                         | No                        | `domains/investment-intelligence/analytics/scripts/calculators/cagr.js`                                        | P0-first              | Medium | Pure helper for total return, absolute gain, real CAGR, and result shape; output contract depends on exact property names.    |
| `calculateCagr`                                                                                    | CAGR pure math/validation helper               | No         | No                         | No                                                       | No                         | No                        | `domains/investment-intelligence/analytics/scripts/calculators/cagr.js`                                        | P0-first              | High   | Best first runtime candidate if extracted with local fallback; computes annualized CAGR and validation messages.              |
| `calculateCagrEndingValue`                                                                         | CAGR pure math/validation helper               | No         | No                         | No                                                       | No                         | No                        | `domains/investment-intelligence/analytics/scripts/calculators/cagr.js`                                        | P1-later              | High   | Pure, but mode-specific and output-sensitive; should follow after `calculateCagr` is smoke-tested.                            |
| `calculateCagrRequiredDuration`                                                                    | CAGR pure math/validation helper               | No         | No                         | No                                                       | No                         | No                        | `domains/investment-intelligence/analytics/scripts/calculators/cagr.js`                                        | P1-later              | High   | Pure, but includes logarithmic edge cases and zero-CAGR behavior.                                                             |
| `buildCagrGrowthSeries`                                                                            | CAGR chart data preparation                    | No         | No                         | No                                                       | Yes, prepares chart points | No                        | `domains/investment-intelligence/analytics/scripts/calculators/cagr.js` or `shared.js` after chart smoke tests | P1-later              | Medium | Pure data builder, but consumed by chart rendering and sensitive to point count and partial-year behavior.                    |
| `buildCagrProjectionRows`                                                                          | CAGR projection table data preparation         | No         | No                         | No                                                       | No                         | No                        | `domains/investment-intelligence/analytics/scripts/calculators/cagr.js`                                        | P1-later              | Medium | Pure row builder with 120-row cap and localized period labels; verify before moving.                                          |
| `renderCagrResults`                                                                                | CAGR result rendering                          | Yes        | Yes                        | Yes                                                      | No                         | No                        | Keep in `js/investment-analytics.js` for now                                                                   | P2-do-not-extract-yet | High   | Writes validation/results DOM, formats values, and calls chart/table clear paths for invalid results.                         |
| `renderCagrGrowthChart`                                                                            | CAGR chart rendering                           | Yes        | Yes                        | Yes                                                      | Yes                        | No                        | Keep in `js/investment-analytics.js` for now                                                                   | P2-do-not-extract-yet | High   | Builds SVG, uses shared chart helpers, writes chart summary, and depends on current CSS classes.                              |
| `renderCagrProjectionTable`                                                                        | CAGR table rendering                           | Yes        | Yes                        | Yes                                                      | No                         | No                        | Keep in `js/investment-analytics.js` for now                                                                   | P2-do-not-extract-yet | High   | Writes table rows and note; formatting and cap note must remain exact.                                                        |
| `updateCagrCalculator`                                                                             | CAGR orchestrator/page state                   | Yes        | Yes                        | Yes                                                      | Yes                        | No                        | Keep in `js/investment-analytics.js` for now                                                                   | P2-do-not-extract-yet | High   | Coordinates parsing, mode-specific math, disabled field state, rendering, chart, and table.                                   |
| `initCagrCalculator`                                                                               | CAGR event binding                             | Yes        | Yes                        | No                                                       | No                         | Yes                       | Keep in `js/investment-analytics.js` for now                                                                   | P2-do-not-extract-yet | High   | Adds input/change/click listeners and initializes state; duplicate listeners or selector bugs would be user-visible.          |
| `initCalculatorSelector`                                                                           | Calculator selector event binding              | Yes        | Yes                        | No                                                       | No                         | Yes                       | Keep in `js/investment-analytics.js` for now                                                                   | P2-do-not-extract-yet | High   | Shared by all calculator panels and default render flow.                                                                      |
| `parseLocalizedNumber`                                                                             | Shared input parsing helper                    | No         | No                         | Yes, via formatter bridge/local fallback                 | No                         | No                        | Existing utility/formatter area; do not move in CAGR PR                                                        | P2-do-not-extract-yet | High   | Shared by compound, CAGR, and retirement input parsing; changing it can affect multiple calculators.                          |
| `formatUsdCurrency` / `formatUsdCompact`                                                           | Shared result/chart formatting                 | No         | No                         | Yes                                                      | No                         | No                        | Existing formatter bridge; do not move in CAGR PR                                                              | P2-do-not-extract-yet | High   | CAGR result cards, chart labels, table rows, and summaries rely on exact output.                                              |
| `createSvgElement`, `appendChartPointMarker`, `appendChartValueLabel`, `shouldShowChartValueLabel` | Shared SVG/chart helpers                       | No         | Yes, to provided SVG nodes | Yes for bridge fallback in label helper where applicable | Yes                        | No                        | Existing chart helper area; do not move in CAGR PR                                                             | P2-do-not-extract-yet | High   | Shared with compound/retirement charts; avoid coupling a CAGR math extraction to chart helper changes.                        |
| `escapeHtml`                                                                                       | Shared render safety helper                    | No         | No                         | No                                                       | No                         | No                        | Existing utility area; do not move in CAGR PR                                                                  | P2-do-not-extract-yet | Medium | Used when injecting result cards and table rows.                                                                              |
| `calculator-selector-card` / `data-calculator-key="cagr"` markup                                   | CAGR tab/selector dependency                   | Yes        | Yes                        | No                                                       | No                         | Yes through selector init | Keep in `pages/investment-analytics.html`                                                                      | P2-do-not-extract-yet | High   | Existing page selector chooses the CAGR panel; page markup must not change in Phase 5U or first runtime CAGR math PR.         |
| `.cagr-*` CSS selectors                                                                            | CAGR visual dependency                         | No         | Yes, via CSS cascade       | No                                                       | No                         | No                        | Keep in CSS files                                                                                              | P2-do-not-extract-yet | Medium | Rendering functions depend on these class names; CSS must not change in extraction planning.                                  |

## 5. CAGR boundaries

CAGR should be treated as separate layers, even though several layers currently live together in `js/investment-analytics.js`:

1. **Pure CAGR math**
    - `calculateCagr`, `getCagrBaseResult`, and possibly the mode-specific helpers compute result objects from already-parsed inputs.
    - This is the only safe first extraction target if the helper is clearly isolated and migrated through a bridge-first/local-fallback wrapper.
2. **Input parsing**
    - `parseCagrInputs` and `getCagrFieldNumber` convert DOM field values, selected modes, dates, and localized numbers into the input object.
3. **Validation/defaulting**
    - Date-mode validation, positive beginning/ending value checks, duration checks, `targetCagr <= -1` checks, zero-CAGR duration behavior, and invalid calculation messages must remain unchanged.
4. **DOM input reading**
    - Field ids such as `cagr-beginning-value`, `cagr-ending-value`, `cagr-years`, `cagr-months`, `cagr-start-date`, `cagr-end-date`, and `cagr-target-rate` are page-specific and should stay local until a broader panel strategy exists.
5. **Result formatting**
    - `formatPercent`, `formatUsdCurrency`, `formatUsdCompact`, and `formatDurationYears` determine visible output and must preserve exact locale/rounding behavior.
6. **Result rendering**
    - `renderCagrResults` writes result cards, validation text, and invalid-state clears.
7. **Chart data preparation**
    - `buildCagrGrowthSeries` prepares CAGR value points and handles partial-year behavior.
8. **Chart rendering**
    - `renderCagrGrowthChart` creates SVG, labels, markers, tooltip metadata, and accessible summary text.
9. **Event binding**
    - `initCagrCalculator` attaches input/change and duration-mode click handlers.
10. **Tab/selector coordination**
    - `renderCalculatorPanel`, `updateCalculatorSelectorState`, `initCalculatorSelector`, `defaultCalculatorKey`, and `activeCalculatorKey` coordinate all calculators and are not safe first extraction targets.

## 6. Do not extract first

Do not extract these CAGR-adjacent areas in the first runtime CAGR PR:

- Event binding.
- Tab switching.
- DOM render functions.
- Chart render functions.
- Premium gate interactions.
- Chatbot interactions.
- Functions coupled to current page state.
- Functions whose output cannot be easily verified.
- Selector labels or `aria-pressed` behavior.
- Shared formatter, chart, and parser helpers used by compound or retirement calculators.

## 7. Proposed future module structure

Current Investment Analytics page implementation modules could eventually live under:

```text
domains/investment-intelligence/analytics/scripts/calculators/
├── cagr.js
├── cagr-global.js
└── shared.js
```

Potential productized future standalone calculator documentation could live under:

```text
domains/investment-intelligence/calculators/cagr/
├── README.md
├── model.md
└── examples.md
```

`domains/investment-intelligence/analytics/scripts/calculators/cagr.js` should be scoped to the current Investment Analytics page implementation and its migration from `js/investment-analytics.js`.

`domains/investment-intelligence/calculators/cagr/` should be reserved for a future standalone or productized public/premium CAGR calculator. That future area can document a product model, examples, and monetization-specific behavior without forcing the analytics page to change prematurely.

## 8. Module/bridge strategy

`js/investment-analytics.js` is still a classic deferred script, so CAGR runtime extraction must follow the existing bridge-compatible migration style:

- A pure CAGR math module may need a global bridge pattern if consumed before the full Investment Analytics entrypoint is converted to modules.
- Do not expose DOM renderers globally.
- Local fallback functions should remain in `js/investment-analytics.js` during the first migration so missing, malformed, incomplete, or throwing bridge helpers cannot break the calculator.
- The formatter bridge is already available and should preserve percentage/number/currency formatting. CAGR extraction should avoid changing formatter contracts in the same PR.
- CAGR extraction should not proceed beyond pure math until compound bridge smoke testing is considered and any shared bridge/fallback risks are understood.
- A future `cagr-global.js` should expose only a small, immutable pure-helper surface, for example under a calculator namespace, and should avoid page DOM, selectors, chart rendering, or event handlers.

## 9. Proposed staged migration order

- **Phase 5U:** CAGR extraction plan only. Inspect and document current behavior; move no runtime CAGR logic.
- **Phase 5V:** Create pure CAGR math module plus global bridge only. `cagr.js` and `cagr-global.js` now exist, but the bridge is not loaded by `pages/investment-analytics.html` and no CAGR consumers read from it yet.
- **Phase 5W:** Load the CAGR bridge on `pages/investment-analytics.html` without migrating consumers.
- **Phase 5X:** Migrate one pure CAGR math helper with local fallback, keeping DOM/render/chart/event behavior unchanged.
- **Phase 5Y:** Add CAGR bridge smoke test checklist/result documentation.
- **Later:** Extract rendering, event, input, table, and chart logic only after smoke tests pass and only with narrowly scoped follow-up plans.

## 10. First runtime PR recommendation

The first actual CAGR runtime PR should:

- Extract only the pure CAGR math helper if clearly identified.
- Do not change DOM, event, render, chart, selector, or table logic.
- Do not rename call sites beyond the minimum bridge/fallback wrapper needed.
- Keep the local fallback in `js/investment-analytics.js`.
- Add a smoke test checklist before extracting more.

Recommended first CAGR runtime extraction target: **`calculateCagr` with `getCagrBaseResult` as its required pure local/module helper**.

Reason: inspection shows `calculateCagr` does not read or write the DOM, does not add events, does not call formatter helpers, and does not render charts. It only consumes an already-parsed input object and returns the existing result object shape or existing validation messages. Its risk remains high because formula, invalid input messages, and downstream formatting must remain unchanged, so it should be migrated with a local fallback and smoke-tested before extracting `calculateCagrEndingValue`, `calculateCagrRequiredDuration`, `buildCagrGrowthSeries`, or `buildCagrProjectionRows`.

Phase 5V status: the first pure CAGR module and bridge were created for `calculateCagr` and `getCagrBaseResult` only. They are not loaded by any HTML page, are not consumed by `js/investment-analytics.js`, and do not change current runtime behavior.

## 11. Smoke test checklist

Future CAGR runtime extraction PRs should include or complete a smoke test checklist covering:

- CAGR calculator UI still renders.
- CAGR output unchanged for sample positive inputs.
- CAGR output unchanged for zero, invalid, and empty inputs.
- CAGR formatting unchanged.
- Calculator tab/selector still works.
- No console errors.
- No duplicate event listeners.
- Formatter bridge fallback still works.
- Compound calculator still works.
- Chart math bridge fallback still works if shared.

## 12. Risk matrix

| Risk                                                            | Impact | Likelihood                                     | Mitigation                                                                                                                          |
| --------------------------------------------------------------- | ------ | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Changed CAGR formula                                            | High   | Medium                                         | Extract only pure helper code first; compare outputs for known positive examples before and after migration.                        |
| Changed rounding/percentage formatting                          | High   | Medium                                         | Do not move formatter helpers in the CAGR runtime PR; verify visible percentages remain `tr-TR` with two fraction digits.           |
| Broken invalid input handling                                   | High   | Medium                                         | Preserve validation message strings and branch order; smoke-test zero, negative, empty, invalid date, and zero-duration cases.      |
| Broken empty/default values                                     | Medium | Medium                                         | Keep DOM parsing/defaulting local until pure math bridge is proven; test initial render defaults.                                   |
| Broken event listeners                                          | High   | Low for math-only PR, High if event code moves | Do not extract `initCagrCalculator` or selector handlers first; check for duplicate updates after tab switches.                     |
| Broken tab/selector behavior                                    | High   | Medium                                         | Keep `renderCalculatorPanel`, `updateCalculatorSelectorState`, and `initCalculatorSelector` in the classic script.                  |
| Module/classic script incompatibility                           | High   | Medium                                         | Use a legacy-safe global bridge plus local fallback; load the bridge before the classic script in a separate staged PR.             |
| Hidden dependency on formatter helpers                          | High   | Medium                                         | Avoid formatter changes; keep result formatting/rendering local while extracting only math.                                         |
| Shared helper changes impacting compound/retirement calculators | High   | Medium                                         | Do not change `parseLocalizedNumber`, chart helpers, formatter helpers, or shared calculator selector logic in CAGR extraction PRs. |

## 13. Relationship to existing docs

- [`investment-calculator-extraction-plan.md`](investment-calculator-extraction-plan.md): Parent calculator extraction plan and global calculator migration rules.
- [`investment-compound-bridge-smoke-test.md`](investment-compound-bridge-smoke-test.md): Existing compound bridge smoke test checklist that should be considered before extracting more calculator logic.
- [`investment-formatter-bridge-smoke-test.md`](investment-formatter-bridge-smoke-test.md): Formatter bridge smoke test checklist relevant to CAGR currency and percentage output preservation.
- [`investment-module-loading-strategy.md`](investment-module-loading-strategy.md): Module/classic-script loading strategy that a future CAGR bridge should follow.
- [`../../domains/investment-intelligence/analytics/scripts/calculators/README.md`](../../domains/investment-intelligence/analytics/scripts/calculators/README.md): Current analytics calculator scripts migration status.
- [`../../domains/investment-intelligence/calculators/README.md`](../../domains/investment-intelligence/calculators/README.md): Future product calculator folder guidance.
