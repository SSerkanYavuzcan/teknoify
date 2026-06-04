# Investment Frontend Split Plan

## 1. Title and purpose

This document is the **Phase 5C Investment Intelligence frontend split plan** for Teknoify.
It is documentation-only.

The goal is to plan how to split the current Investment Intelligence frontend JavaScript and
CSS safely, without changing runtime behavior yet. Phase 5C does not move, refactor, rename,
or relink public pages, runtime JavaScript, runtime CSS, data files, scripts, workflows, or
package configuration.

This plan should make future review smaller and safer by documenting the current frontend
inventory, the responsibilities inside the large investment files, the proposed future module
and style boundaries, compatibility rules, staged migration order, risks, and smoke tests.

**Phase 5E update:** `investment-utility-extraction-checklist.md` now documents the pure
utility extraction checklist for `js/investment-analytics.js`. Phase 5E did not move runtime
JavaScript or CSS files.

**Phase 5F update:** `investment-module-loading-strategy.md` now documents the module
loading and legacy bridge strategy for future Investment Analytics utility modules. Phase 5F
keeps runtime HTML, JavaScript, CSS, data files, scripts, workflows, and package configuration
unchanged.

**Phase 5G update:** The first Investment Analytics formatter module and legacy-safe formatter bridge now exist under `domains/investment-intelligence/analytics/scripts/utils/`. No page loads the bridge yet, and `js/investment-analytics.js` remains unchanged for the future consumer migration step.

**Phase 5H update:** `pages/investment-analytics.html` now loads the formatter bridge before the existing classic deferred Investment Analytics entrypoint. Formatter consumers have not been migrated yet, so local formatter functions still preserve current runtime behavior.

**Phase 5J smoke-test note:** `investment-formatter-bridge-smoke-test.md` now documents the manual checks and result template for validating formatter bridge behavior after the first consumer migration. Treat this as a decision gate before chart/SVG helper extraction, calculator extraction planning, or local formatter fallback removal.

**Phase 5M update:** `pages/investment-analytics.html` now loads the chart math bridge after the formatter bridge while `js/investment-analytics.js` remains a classic deferred script with its local chart math consumers unchanged.

**Phase 5O smoke-test note:** `investment-chart-math-bridge-smoke-test.md` now documents the manual decision gate for validating chart math bridge behavior before local chart math fallback removal, SVG utility extraction, or chart renderer extraction planning.

**Phase 5P update:** `investment-calculator-extraction-plan.md` now documents the safe calculator extraction plan, current calculator inventory, staged migration order, and risk controls. No runtime calculator logic was moved.

**Phase 5Q update:** The first pure compound interest calculator module and bridge now exist under `domains/investment-intelligence/analytics/scripts/calculators/`, but no HTML page loads the bridge and no Investment Analytics calculator consumer has been migrated yet.

**Phase 5T smoke-test note:** `investment-compound-bridge-smoke-test.md` now documents the manual decision gate for validating `growCompoundValue` bridge behavior before local compound fallback removal or higher-risk compound calculator DOM/input/render extraction.

## 2. Current investment frontend files to inspect

Phase 5C inspected these frontend files and areas without editing runtime frontend files:

- `pages/investment-analytics.html`
- `pages/investment-retail.html`
- `pages/investment-airlines.html`
- `pages/financial-indicators.html`
- `js/investment-analytics.js`
- `js/pages/`
- `css/investment-analytics.css`
- `css/financial-indicators.css`
- `css/06-pages/investment-analytics/`
- Investment-related CSS imported by `css/investment-analytics.css`.

Observed loading relationships:

- `pages/investment-analytics.html` links `../css/style.css`,
  `../css/investment-analytics.css`, shared scripts, and `../js/investment-analytics.js`.
- `pages/investment-retail.html` links `../css/style.css`,
  `../css/investment-analytics.css`, shared scripts, and `../js/premium-content-gate.js`.
- `pages/investment-airlines.html` links `../css/style.css`,
  `../css/investment-analytics.css`, and shared scripts.
- `pages/financial-indicators.html` links `../css/style.css`,
  `../css/financial-indicators.css`, shared scripts, and inline page animation/counter logic.
- `css/investment-analytics.css` is already a manifest-style file that imports partials from
  `css/06-pages/investment-analytics/`.
- `js/pages/` currently contains page modules such as admin, common, dashboard, home, login,
  member, and unauthorized modules; no investment-specific file was found there during this
  inspection.

## 3. Current frontend inventory table

| Current Path                                          | Type          | Approx Role                                             | Major Responsibilities                                                                                                                                                                               | Suggested Future Area                                                                                                                                                   | Split Priority | Risk   | Notes                                                                                                 |
| ----------------------------------------------------- | ------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------ | ----------------------------------------------------------------------------------------------------- |
| `pages/investment-analytics.html`                     | page          | Main public investment analytics route.                 | Hero, sector selector, dynamic sector panel mount, stock placeholder, calculator markup, chatbot markup, Firebase/shared script loading, current `../js/investment-analytics.js` entrypoint loading. | Keep public route under `pages/` until a route compatibility plan exists; future source ownership can be documented under `domains/investment-intelligence/analytics/`. | Later          | High   | Do not edit in Phase 5C. Future PRs must preserve static hosting paths and script order.              |
| `pages/investment-retail.html`                        | page          | Retail sector detail route.                             | Premium content shell, retail KPI preview, premium lock overlay, shared auth scripts, `../js/premium-content-gate.js` loading.                                                                       | Keep public route under `pages/`; future source ownership can map to `domains/investment-intelligence/sectors/retail/`.                                                 | Later          | High   | Uses investment analytics CSS plus premium gate markup; avoid changing until compatibility is proven. |
| `pages/investment-airlines.html`                      | page          | Airlines sector detail placeholder route.               | Hero, planned analytics placeholder, shared auth/nav scripts, investment analytics CSS.                                                                                                              | Keep public route under `pages/`; future source ownership can map to `domains/investment-intelligence/sectors/airlines/`.                                               | Later          | Medium | Low runtime behavior today, but route and styling must remain stable.                                 |
| `pages/financial-indicators.html`                     | page          | Financial indicators and bots route.                    | Financial indicator hero animation markup, use-case cards, CTA sections, shared auth/nav scripts, inline animation/counter behavior.                                                                 | `domains/investment-intelligence/indicators/` after a separate compatibility plan.                                                                                      | Later          | Medium | Separate CSS file; not part of the first investment analytics JS split.                               |
| `js/investment-analytics.js`                          | script        | Public analytics page script entrypoint.                | Boot/init, sector selection, retail charting, calculators, SVG/chart helpers, dataset fetching, table rendering, chatbot/mock assistant, logging, DOM handlers.                                      | `domains/investment-intelligence/analytics/scripts/` with `js/investment-analytics.js` retained as wrapper/orchestrator first.                                          | High           | High   | Largest and riskiest split target; keep public entrypoint stable.                                     |
| `js/pages/`                                           | unknown       | Existing page-module area.                              | Contains non-investment page modules; no investment-specific module was found.                                                                                                                       | Avoid using for new investment modules if the domain folder becomes the canonical future target.                                                                        | Low            | Low    | Inspect again before runtime work in case new modules are added.                                      |
| `css/investment-analytics.css`                        | style         | Public linked investment analytics stylesheet manifest. | Imports current investment analytics partials in order.                                                                                                                                              | Keep as public manifest/wrapper while future domain styles are introduced behind it.                                                                                    | Medium         | High   | Existing import order is behaviorally significant. Do not edit in Phase 5C.                           |
| `css/06-pages/investment-analytics/base.css`          | style-partial | Base partial placeholder.                               | Currently minimal/empty placeholder for investment analytics base scope.                                                                                                                             | Future `domains/investment-intelligence/analytics/styles/index.css` or `layout.css`.                                                                                    | Low            | Low    | Existing import should remain until CSS wrapper strategy is ready.                                    |
| `css/06-pages/investment-analytics/hero.css`          | style-partial | Investment hero glue.                                   | Small investment-specific hero content tweaks.                                                                                                                                                       | Future `hero.css`.                                                                                                                                                      | Low            | Low    | Works with shared hero styles from `css/style.css`.                                                   |
| `css/06-pages/investment-analytics/orbit-visual.css`  | style-partial | Hero orbit visual.                                      | Orbit rings, nodes, icon styling, particles, core visual animation.                                                                                                                                  | Future `hero.css` or `orbit-visual.css`.                                                                                                                                | Low            | Medium | Animation and responsive behavior should be tested after any move.                                    |
| `css/06-pages/investment-analytics/calculators.css`   | style-partial | Calculator UI and calculator charts.                    | Calculator selector cards, compound/CAGR/retirement panels, fields, results, SVG chart styling, legends, tables, validation states.                                                                  | Future `calculators.css` plus calculator-specific partials if needed.                                                                                                   | Medium         | High   | High specificity/order risk because all calculators share classes and chart styles.                   |
| `css/06-pages/investment-analytics/sections.css`      | style-partial | Main investment sections and detail/premium surfaces.   | Investment sections, sector blocks, selector/detail cards, chart cards, placeholders, stock placeholder, premium content shell, lock overlay, retail preview/KPI cards, detail page styles.          | Future `layout.css`, `sector-selector.css`, `sector-panels.css`, `premium-gate.css`, and shared component partials.                                                     | Medium         | High   | Broadest CSS partial; split only after visual baselines exist.                                        |
| `css/06-pages/investment-analytics/charts.css`        | style-partial | Investment analytics chart styling.                     | SVG chart containers, grid lines, axis labels, line/point styles, legends, notes, loading and error states.                                                                                          | Future `charts.css`.                                                                                                                                                    | Medium         | High   | Must stay aligned with SVG classes generated by JavaScript.                                           |
| `css/06-pages/investment-analytics/chart-modal.css`   | style-partial | Chart modal styling.                                    | Modal overlay/dialog/header/body/mount styles and body scroll lock class.                                                                                                                            | Future `charts.css` or `chart-modal.css`.                                                                                                                               | Later          | Medium | Current JS file did not expose a complete modal ownership boundary; inspect again before extraction.  |
| `css/06-pages/investment-analytics/chart-tooltip.css` | style-partial | Chart tooltip styling.                                  | Tooltip card, header, period/value/note/source/link/accent styles and visibility state.                                                                                                              | Future `charts.css` or `chart-tooltip.css`.                                                                                                                             | Medium         | High   | Tooltip CSS is coupled to generated HTML/SVG tooltip markup.                                          |
| `css/06-pages/investment-analytics/chatbot.css`       | style-partial | Investment chatbot UI.                                  | Fixed launcher, panel, header, messages, source cards, suggestions, input row, disclaimer, mobile sizing.                                                                                            | Future `chatbot.css`.                                                                                                                                                   | Later          | Medium | Split after chatbot JS boundary is stable.                                                            |
| `css/06-pages/investment-analytics/responsive.css`    | style-partial | Responsive and motion behavior.                         | Mobile/tablet layout overrides for hero, sectors, calculators, chatbot, premium shell, charts, and reduced-motion preferences.                                                                       | Future `responsive.css`, or responsive sections co-located with each component after order is tested.                                                                   | Later          | High   | Last CSS partial to move because it depends on all earlier selectors and ordering.                    |
| `css/financial-indicators.css`                        | style         | Financial indicators page stylesheet.                   | Indicator hero visual, animated chart/candles/ticker tape, content sections, benefit cards, use cases, CTA, responsive rules.                                                                        | Future `domains/investment-intelligence/indicators/styles/`.                                                                                                            | Later          | Medium | Separate from analytics CSS; should receive its own split plan if it grows.                           |

## 4. Current `js/investment-analytics.js` responsibility map

`js/investment-analytics.js` currently contains two immediately invoked function expressions:

1. The analytics/calculator controller.
2. The investment chatbot frontend controller.

Approximate responsibility areas:

### Boot/init logic

- Registers `DOMContentLoaded` handlers.
- Initializes smooth scrolling, the sector selector, and calculator selector.
- Initializes the chatbot independently if `[data-investment-chatbot]` exists.
- Uses global DOM state rather than exported modules.

### Sector selection

- Tracks the active sector with a default of `retail`.
- Reads `[data-sector-key]` buttons.
- Updates `.is-active` and `aria-pressed` state.
- Renders the active sector panel into `#sector-analysis-panel`.
- Supports retail as the live panel and airline, automotive, and steel as placeholder panels.

### Retail analytics

- Fetches `../data/investment-analytics/supermarket_dataset.json`.
- Fetches `../data/currency/usd_try_rates.json` to derive USD-per-store values when needed.
- Builds company series from supermarket dataset metrics.
- Renders retail store count, revenue per store, and operating profit per store analytics.
- Handles loading and error states for retail charts.

### Airline analytics

- The main analytics page currently renders the airline sector as a placeholder panel.
- `pages/investment-airlines.html` is a separate placeholder/detail public route.
- Future extraction should keep airline placeholder logic distinct from future real airline datasets.

### Chart rendering

- Creates SVG line charts, legends, axes, grid lines, point labels, all-point labels, and notes.
- Builds series from metric keys and normalized periods.
- Handles empty/missing metric values.
- Renders chart error states.
- Generates tooltip content for generic metric values and retail financial per-store values.

### Calculator selector

- Maintains calculator selector state with `[data-calculator-key]` buttons.
- Renders the active calculator panel into the calculator mount.
- Initializes active calculator inputs after panel rendering.
- Supports compound interest, CAGR, and retirement calculators.

### Compound interest calculator

- Parses localized numeric input values.
- Supports compounding frequency and contribution frequency options.
- Calculates contributions, ending balance, invested principal, gain, and growth series.
- Renders result cards, growth SVG chart, legends, value labels, and a breakdown table.
- Wires input/change event listeners to recalculate as users edit fields.

### CAGR calculator

- Supports CAGR, ending-value, and required-duration modes.
- Parses starting value, ending value, duration, target CAGR, and target ending value inputs.
- Calculates CAGR, projected ending value, or required duration.
- Renders result cards, projection chart, projection table, and validation messages.
- Updates visible fields when the duration/mode selector changes.

### Retirement calculator

- Parses retirement inputs such as current age, retirement age, life expectancy, savings,
  monthly contribution, expected return, inflation, and target monthly income.
- Validates age/duration assumptions.
- Simulates accumulation, drawdown, projected fund, target fund, additional monthly
  contribution, lifecycle rows, and chart points.
- Renders result cards, growth chart, breakdown table, and validation state.
- Wires input/change event listeners to recalculate as users edit fields.

### Table rendering

- Renders compound breakdown rows.
- Renders CAGR projection rows.
- Renders retirement lifecycle/breakdown rows.
- Updates empty-state notes when no rows are available.

### Chatbot/mock assistant logic

- Normalizes user messages.
- Provides structured mock assistant responses for known prompt patterns.
- Attempts `/api/chat` first, then falls back to mock responses if needed.
- Normalizes assistant responses and sources.
- Renders source cards, response metadata, disclaimers, user/assistant/error messages, and
  suggestion chips.
- Opens, closes, toggles, focuses, and outside-click-dismisses the chatbot panel.

### Premium gate logic

- `js/investment-analytics.js` does not own the retail detail premium gate runtime.
- The premium detail page loads `../js/premium-content-gate.js` separately.
- Investment analytics CSS does include premium shell and lock overlay styles used by the
  retail detail page.
- Future frontend splitting must coordinate with `premium-content-gate.js` before moving or
  renaming premium-related styles.

### Utility/formatting functions

- Number formatting for Turkish locale values.
- USD compact formatting and TL million formatting.
- Percent, duration, money, localized number parsing, clamping, HTML escaping, safe source
  URL handling, safe text preview, and metadata inference helpers.
- These are the safest first extraction candidates if static module compatibility is proven.

### DOM selectors and event handlers

- Uses direct selectors such as `document.querySelector`, `querySelectorAll`, `getElementById`,
  and data attributes from page markup.
- Adds click, input, change, keydown, document click, and DOMContentLoaded listeners.
- Future extraction must avoid duplicate listener registration when modules are imported more
  than once or when panels are re-rendered.

### Data loading/fetching

- Fetches supermarket dataset with `cache: "no-cache"`.
- Fetches USD/TRY rates with `cache: "no-cache"`.
- Fetches `/api/chat` for assistant responses.
- Best-effort sends chat log events with `navigator.sendBeacon` or `/api/chat-log` fetch.
- Relative dataset paths are sensitive because pages are served from `pages/`.

### SVG/chart helpers

- Creates namespaced SVG elements.
- Builds paths, markers, labels, axes, chart areas, tooltip groups, and chart summaries.
- Calculator charts and retail charts reuse some SVG primitives but have different class names
  and rendering assumptions.

### Accessibility behavior

- Updates `aria-pressed` on sector and calculator selector buttons.
- Uses SVG titles/labels in chart rendering.
- Uses focusable chart markers and keyboard-friendly tooltip triggers.
- Uses chatbot panel `aria-expanded`, focus management, Escape close behavior, and outside
  click close behavior.
- Uses `aria-live` mounts in page markup, so future renderers must preserve announcement
  behavior.

## 5. Current CSS responsibility map

### Page layout

- `sections.css` owns investment section shells, container interactions, dashboard grids,
  chart cards, note cards, placeholder cards, detail pages, and stock placeholder sections.
- `responsive.css` adjusts major page layouts at tablet/mobile breakpoints.

### Hero/sections

- `hero.css` contains investment-specific hero content adjustments.
- `orbit-visual.css` owns the animated investment hero visual.
- `sections.css` owns section headers, eyebrows, sector blocks, and detail hero/detail
  placeholder styles.

### Cards

- `sections.css` owns chart cards, note cards, sector placeholder cards, retail KPI cards,
  retail preview cards, subscription cards, and action buttons.
- `calculators.css` owns calculator selector cards, calculator panels, result cards, chart
  cards, and breakdown cards.

### Charts

- `charts.css` owns investment analytics chart containers, SVG line/grid/axis/point styles,
  legends, notes, loading states, and errors.
- `chart-tooltip.css` owns chart tooltip markup generated by JavaScript.
- `chart-modal.css` owns modal chart presentation styles.
- `calculators.css` owns calculator-specific SVG chart classes.

### Calculator panels

- `calculators.css` owns calculator selector layout, field controls, advanced settings,
  result panels, calculator charts, legends, validation, and tables.
- `responsive.css` changes calculator grids, chart/table overflow, and mobile sizing.

### Chatbot

- `chatbot.css` owns the fixed investment chatbot launcher, panel, messages, suggestions,
  source rendering, input controls, disclaimers, and mobile panel behavior.
- `responsive.css` includes additional chatbot mobile constraints.

### Responsive behavior

- `responsive.css` centralizes breakpoint overrides and reduced-motion behavior for the
  investment analytics page, detail/premium surfaces, calculators, and chatbot.
- Future CSS extraction should preserve import order until visual diffing confirms that
  co-located responsive rules are safe.

### Premium gate/overlay

- `sections.css` owns `.premium-content-shell`, preview blur states, lock overlay/card,
  premium actions, subscription badges, and retail preview styles.
- `responsive.css` adjusts premium lock and preview behavior on small screens.
- Runtime behavior is controlled outside this file by `js/premium-content-gate.js`.

### Sector/detail styles

- `sections.css` owns sector selector cards, sector placeholders, sector detail buttons,
  retail detail cards, and detail page placeholders.
- These selectors are shared by the main analytics page and sector detail pages.

### Shared investment components

- Existing investment CSS is already partially split under `css/06-pages/investment-analytics/`.
- The current public stylesheet `css/investment-analytics.css` functions as a manifest and can
  remain the public link while future domain styles are introduced behind a wrapper.

## 6. Proposed future JS structure

Future split target:

```text
domains/investment-intelligence/analytics/scripts/
├── README.md
├── boot.js
├── sector-selector.js
├── sector-panels.js
├── retail-analysis.js
├── airline-analysis.js
├── chart-renderer.js
├── svg-chart-utils.js
├── calculators/
│   ├── index.js
│   ├── compound-interest.js
│   ├── cagr.js
│   └── retirement.js
├── chatbot/
│   ├── investment-chatbot.js
│   └── mock-chatbot-client.js
├── premium/
│   └── premium-gate.js
└── utils/
    ├── formatters.js
    ├── dom.js
    └── numbers.js
```

Suggested boundaries:

- `boot.js`: DOMContentLoaded orchestration, idempotent initialization guards, and public
  entrypoint coordination.
- `sector-selector.js`: sector selector button state and event binding.
- `sector-panels.js`: sector panel selection and placeholder rendering coordination.
- `retail-analysis.js`: supermarket dataset loading, retail metric series building, and retail
  panel render calls.
- `airline-analysis.js`: current airline placeholder logic first; future airline dataset logic
  later.
- `chart-renderer.js`: reusable line chart rendering, legends, axes, labels, tooltip binding,
  and error/loading states.
- `svg-chart-utils.js`: SVG namespace creation, path helpers, point coordinate helpers, title
  helpers, and marker helpers.
- `calculators/index.js`: calculator selector/orchestrator.
- `calculators/compound-interest.js`: compound input parsing, calculation, rendering, and event
  binding.
- `calculators/cagr.js`: CAGR modes, calculations, rendering, and event binding.
- `calculators/retirement.js`: retirement validation, simulation, rendering, and event binding.
- `chatbot/investment-chatbot.js`: chatbot controller, rendering, focus/open/close behavior,
  source normalization, and logging hooks.
- `chatbot/mock-chatbot-client.js`: mock response delay and structured fallback responses.
- `premium/premium-gate.js`: only after coordinating with existing `js/premium-content-gate.js`.
- `utils/formatters.js`: locale, currency, percent, period, and duration formatting.
- `utils/dom.js`: safe DOM lookup helpers, class/ARIA helpers, listener helpers.
- `utils/numbers.js`: localized number parsing, clamping, compounding/frequency helpers.

Current public pages should **not** import these proposed modules directly until a
compatibility/wrapper strategy exists. The current public entrypoint should remain
`js/investment-analytics.js` until static hosting, relative paths, script type, load order, and
fallback behavior are verified.

## 7. Proposed future CSS structure

Future split target option:

```text
domains/investment-intelligence/analytics/styles/
├── index.css
├── layout.css
├── hero.css
├── sector-selector.css
├── sector-panels.css
├── charts.css
├── calculators.css
├── chatbot.css
├── premium-gate.css
└── responsive.css
```

Recommended mapping from existing partials:

| Existing CSS                                          | Future CSS Target                                                            | Notes                                                                              |
| ----------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `css/investment-analytics.css`                        | Public manifest/wrapper first; later `domains/.../styles/index.css`          | Keep current linked file until pages are updated safely.                           |
| `css/06-pages/investment-analytics/base.css`          | `index.css` or `layout.css`                                                  | Currently minimal; can remain a placeholder until there is real base scope.        |
| `css/06-pages/investment-analytics/hero.css`          | `hero.css`                                                                   | Keep interaction with shared hero styles stable.                                   |
| `css/06-pages/investment-analytics/orbit-visual.css`  | `hero.css` or `orbit-visual.css`                                             | Preserve animation and reduced-motion handling.                                    |
| `css/06-pages/investment-analytics/sections.css`      | `layout.css`, `sector-selector.css`, `sector-panels.css`, `premium-gate.css` | Split only after selectors are grouped and visual baselines exist.                 |
| `css/06-pages/investment-analytics/charts.css`        | `charts.css`                                                                 | Keep in sync with JavaScript-generated SVG classes.                                |
| `css/06-pages/investment-analytics/chart-tooltip.css` | `charts.css` or `chart-tooltip.css`                                          | Keep near tooltip rendering code ownership.                                        |
| `css/06-pages/investment-analytics/chart-modal.css`   | `charts.css` or `chart-modal.css`                                            | Move after modal runtime ownership is confirmed.                                   |
| `css/06-pages/investment-analytics/calculators.css`   | `calculators.css`                                                            | May later split by calculator, but only after JS calculator boundaries are stable. |
| `css/06-pages/investment-analytics/chatbot.css`       | `chatbot.css`                                                                | Move after chatbot JS split.                                                       |
| `css/06-pages/investment-analytics/responsive.css`    | `responsive.css`                                                             | Move last or keep as manifest-level responsive layer to avoid order regressions.   |

## 8. Route and compatibility strategy

- Public routes remain under `pages/` for now.
- Existing script and stylesheet links should remain until a wrapper strategy is ready.
- First split PRs should create internal modules but keep `js/investment-analytics.js` as the
  public entrypoint.
- `js/investment-analytics.js` can gradually become a thin orchestrator that imports or delegates
  to internal implementation modules once module loading is proven safe.
- CSS can keep `css/investment-analytics.css` as the public linked manifest/import file before
  any page links are updated.
- Do not break static hosting or relative paths. Current dataset paths are relative to pages and
  current API paths are root-relative.
- Avoid changing `<script type>` on public pages until browser compatibility, hosting behavior,
  and fallback behavior are tested.
- Avoid importing proposed domain modules directly from HTML until cache busting, pathing, and
  rollback behavior are documented.

## 9. Proposed staged migration order

- **Phase 5C:** Split plan only. No runtime frontend files moved.
- **Phase 5D:** README-only skeletons for future analytics `scripts/` and `styles/` folders were created under `domains/investment-intelligence/analytics/`; no runtime JS/CSS files were moved.
- **Phase 5E:** Extract pure utility functions from `js/investment-analytics.js`.
- **Phase 5F:** Extract chart/SVG helpers.
- **Phase 5G:** Extract calculator logic one calculator at a time.
- **Phase 5H:** Extract sector selector and sector panel logic.
- **Phase 5I:** Extract chatbot/mock assistant logic.
- **Phase 5J:** Extract premium gate logic only after coordination with the existing premium gate
  runtime.
- **Phase 5K:** A chart/SVG helper extraction checklist was created before runtime chart extraction; no runtime JS/CSS files were moved.
- **Phase 5L:** The first pure chart math module and legacy-safe bridge were created, but no HTML page loads the bridge yet and no `js/investment-analytics.js` chart consumers were migrated.
- **Phase 5O:** The chart math bridge smoke test checklist/result document was added as the decision gate before local chart math fallback cleanup or higher-risk chart renderer extraction.
- **Phase 5R:** The compound interest bridge is loaded after the chart math bridge on `pages/investment-analytics.html`, while `js/investment-analytics.js` keeps its local compound calculator logic until a future guarded consumer migration.
- **Future orchestrator phase:** Turn `js/investment-analytics.js` into a thin orchestrator after pure utilities, chart math, calculators, sectors, chatbot, premium coordination, and CSS split work are validated.
- **Phase 5L:** Split CSS behind the existing linked stylesheet.
- **Phase 5M:** Update public pages only after compatibility is verified.
- **Phase 6C:** A domain-owned Investment Analytics CSS manifest skeleton now exists at `domains/investment-intelligence/analytics/styles/index.css`; it mirrors the current public import order but is not loaded by any page yet.
- **Phase 6E:** `pages/investment-analytics.html` now loads the domain-owned CSS manifest only; retail and airlines pages remain on the public manifest while CSS partials stay in their current paths.

## 10. Risk matrix

| Risk                                 | Impact                                                                                 | Likelihood | Mitigation                                                                                                                                   |
| ------------------------------------ | -------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Broken charts                        | Retail analytics becomes unusable or misleading.                                       | Medium     | Extract chart helpers after utilities; keep generated class names and SVG structure stable; compare before/after screenshots and DOM output. |
| Broken calculators                   | Users receive incorrect financial calculations or blank panels.                        | Medium     | Extract one calculator per PR with known input/output fixtures and manual smoke tests.                                                       |
| Broken sector selection              | Sector buttons stop updating active panel or ARIA state.                               | Medium     | Keep selector state in one module, use idempotent binding guards, and test each sector button.                                               |
| Broken premium gate                  | Retail premium detail page unlock/lock behavior changes.                               | Medium     | Coordinate with `js/premium-content-gate.js`; do not move premium styles before runtime ownership is clear.                                  |
| Broken chatbot/mock assistant        | Chat panel fails to open, send, render sources, or fall back to mock responses.        | Medium     | Extract chatbot after calculators and sectors; preserve fallback and logging best-effort behavior.                                           |
| Broken data fetch paths              | Datasets or API calls fail on static hosting.                                          | High       | Keep public entrypoint path stable; centralize URL resolution with tests before moving modules.                                              |
| Broken SVG rendering                 | Charts appear blank, clipped, inaccessible, or unstyled.                               | Medium     | Preserve SVG namespace helper, viewBox values, class names, labels, and focus attributes.                                                    |
| Broken mobile/responsive layout      | Mobile pages become unusable or visually regressed.                                    | Medium     | Move `responsive.css` last; test main analytics, retail detail, airline detail, and chatbot on narrow widths.                                |
| Duplicate event listeners            | Repeated panel renders or imports cause duplicate calculations/messages.               | Medium     | Add idempotent init guards and avoid binding listeners inside functions that may run repeatedly unless old markup is replaced deliberately.  |
| Module path issues on static hosting | Browser fails to load modules from domain folders.                                     | Medium     | Keep `js/investment-analytics.js` as the public wrapper; verify relative and root-relative imports before page changes.                      |
| Pages loading scripts in wrong order | Shared globals, auth state, or route bridge are unavailable when investment code runs. | Medium     | Preserve existing page script order until wrapper behavior is tested.                                                                        |
| CSS specificity/order regressions    | Components look different after splitting despite equivalent selectors.                | High       | Keep `css/investment-analytics.css` as ordered manifest; move one CSS concern at a time and preserve import order.                           |

## 11. Smoke test checklist

Future manual tests for runtime split PRs:

- Investment analytics page loads without console errors.
- Sector selector works.
- Retail panel renders.
- Airlines panel renders.
- Compound interest calculator works.
- CAGR calculator works.
- Retirement calculator works.
- Charts render and tooltips/labels work.
- Tables render.
- Chatbot/mock assistant still responds if present.
- Premium gate still behaves the same.
- Mobile layout still works.
- Public routes still work.

## 12. First recommended runtime PR

The first actual runtime code PR after this plan should be intentionally small:

- Extract only pure formatting/number utility functions from `js/investment-analytics.js` into a
  new utility module, if import compatibility is safe.
- If module compatibility is not safe, first create non-runtime folder README files and a wrapper
  strategy instead.
- Do not start by extracting calculators or chart rendering because those areas are higher risk,
  are tightly coupled to generated DOM/SVG, and require broader manual testing.

Recommended first extraction candidates, once safe:

- Locale number formatting.
- USD/TL/percent/duration formatting.
- Localized number parsing.
- Number clamping.
- Pure compounding frequency helpers.
- HTML escaping only if all call sites can import it safely and tests cover tooltip/source markup.

## Phase 6A CSS split strategy note

Phase 6A created [`investment-css-split-strategy.md`](investment-css-split-strategy.md) as a documentation-only Investment Analytics CSS split and manifest strategy. No runtime CSS, HTML, JavaScript, formatter/chart/calculator modules, data files, scripts, workflows, package files, or public route files were moved, relinked, or refactored in Phase 6A.

## Phase 6F CSS relink note

Phase 6F completes the controlled CSS manifest relink for analytics, retail, and airlines investment pages by loading the domain-owned Investment Analytics manifest while leaving financial indicators on its separate stylesheet. The public `css/investment-analytics.css` manifest and existing CSS partial locations remain available until visual smoke testing proves the relinked pages.

## Phase 6G CSS consumer audit note

Phase 6G completes the final Investment Analytics CSS manifest consumer audit and relinks `pages/subscription.html` to the domain-owned manifest. Analytics, retail, airlines, and subscription now consume `/domains/investment-intelligence/analytics/styles/index.css`; financial indicators remains on its separate stylesheet, and the public manifest remains available for rollback.

## 13. Relationship to existing docs

Related documentation:

- [`investment-intelligence-migration-plan.md`](investment-intelligence-migration-plan.md)
- [`../../domains/investment-intelligence/analytics/README.md`](../../domains/investment-intelligence/analytics/README.md)
- [`../../domains/investment-intelligence/calculators/README.md`](../../domains/investment-intelligence/calculators/README.md)
- [`../../domains/investment-intelligence/rag/README.md`](../../domains/investment-intelligence/rag/README.md)
- [`current-inventory.md`](current-inventory.md)
- [`folder-structure.md`](folder-structure.md)

## Phase 7A JS orchestrator cleanup note

Phase 7A created [`investment-js-orchestrator-cleanup-plan.md`](investment-js-orchestrator-cleanup-plan.md) and the runtime map audit script `scripts/architecture/check-investment-runtime-map.js`. The audit documents current Investment Analytics script consumers, CSS manifest consumers, route/bridge consumers, and the expected `pages/investment-analytics.html` bridge-to-classic script order. No runtime JavaScript moved in Phase 7A; `js/investment-analytics.js` remains the active classic deferred orchestrator.

## Phase 8A Data/RAG separation note

Phase 8A keeps the frontend split separate from the Investment Data + RAG migration. The Data/RAG audit documents current data, RAG docs, API contracts, scripts, workers, and workflows only; no frontend runtime data paths, public pages, CSS, or `js/investment-analytics.js` behavior changed.
