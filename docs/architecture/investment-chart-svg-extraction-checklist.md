# Investment Chart/SVG Extraction Checklist

## 1. Title and purpose

Phase 5K is a documentation-only checkpoint before any chart or SVG helper is extracted from `js/investment-analytics.js`. The goal is to inventory chart math, SVG creation, label, tooltip, accessibility, and renderer helpers; classify which helpers are safe candidates; and define a conservative future migration path that keeps the current Investment Analytics page behavior stable.

This checklist does not move runtime files and does not create chart modules yet. It is intended to guide a later, focused runtime PR after the formatter bridge rollout is validated.

**Phase 5L note:** The first pure chart math module, `domains/investment-intelligence/analytics/scripts/utils/chart-math.js`, and legacy-safe bridge, `domains/investment-intelligence/analytics/scripts/utils/chart-math-global.js`, now exist. They are not loaded by any HTML page yet, and `js/investment-analytics.js` has not been migrated to consume them, so current chart runtime behavior remains unchanged.

## 2. Why chart/SVG extraction is higher risk

Chart and SVG extraction is higher risk than formatter extraction because:

- Chart helpers affect visible output, including coordinates, viewBox sizing, axis scales, labels, paths, and marker placement.
- SVG helpers may create DOM nodes and must preserve the SVG namespace exactly.
- Tooltip, label, and accessibility behavior may be coupled to rendering order, generated elements, CSS classes, focus attributes, and event listeners.
- Chart helpers may be shared by calculators, sector panels, and tables, so a helper that looks isolated can still affect multiple user flows.
- Visual regressions are not fully caught by lint, format checks, or `npm run check`; screenshots and manual page checks are required for runtime extraction.

## 3. Current files inspected

The following files were inspected for Phase 5K and were not edited as runtime assets:

- `js/investment-analytics.js`
- `pages/investment-analytics.html`
- `css/investment-analytics.css`
- `css/06-pages/investment-analytics/base.css`
- `css/06-pages/investment-analytics/calculators.css`
- `css/06-pages/investment-analytics/chart-modal.css`
- `css/06-pages/investment-analytics/chart-tooltip.css`
- `css/06-pages/investment-analytics/charts.css`
- `css/06-pages/investment-analytics/chatbot.css`
- `css/06-pages/investment-analytics/hero.css`
- `css/06-pages/investment-analytics/orbit-visual.css`
- `css/06-pages/investment-analytics/responsive.css`
- `css/06-pages/investment-analytics/sections.css`

## 4. Candidate chart/SVG helper inventory

| Function/Constant                    | Category             | Pure?  | Creates DOM/SVG? | Reads DOM? | Mutates DOM? | Uses Formatter? | Used By                                               | Suggested Target                                                                 | Extraction Priority   | Notes                                                                                                                   |
| ------------------------------------ | -------------------- | ------ | ---------------- | ---------- | ------------ | --------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `svgNamespace`                       | SVG creation         | Yes    | No               | No         | No           | No              | `createSvgElement`                                    | `domains/investment-intelligence/analytics/scripts/utils/svg.js`                 | P1-later              | Constant is safe, but moving it separately is not useful until SVG helper ownership is decided.                         |
| `createSvgElement`                   | SVG creation         | No     | Yes              | No         | No           | No              | Retail chart renderers and calculator chart renderers | `domains/investment-intelligence/analytics/scripts/utils/svg.js`                 | P1-later              | Must preserve `document.createElementNS`; do not extract before namespace and classic-script bridge strategy is proven. |
| `renderLegend`                       | chart renderer       | No     | Yes              | No         | Yes          | No              | `renderLineChart`                                     | keep in `js/investment-analytics.js` for now                                     | P2-do-not-extract-yet | Creates HTML legend DOM and appends it to the chart container.                                                          |
| `getPoint`                           | chart math           | Yes    | No               | No         | No           | No              | Retail line grid/series/labels                        | `domains/investment-intelligence/analytics/scripts/utils/chart-math.js`          | P0-first              | Clear pure coordinate helper; safest extraction candidate if kept byte-for-byte compatible.                             |
| `renderLineGrid`                     | chart renderer       | No     | Yes              | No         | Yes          | Yes             | `renderLineChart`                                     | keep in `js/investment-analytics.js` for now                                     | P2-do-not-extract-yet | Appends grid lines and axis labels; formatter callback controls label text.                                             |
| `renderLineXAxis`                    | label helper         | No     | Yes              | No         | Yes          | No              | `renderLineChart`                                     | keep in `js/investment-analytics.js` for now                                     | P2-do-not-extract-yet | Encodes retail quarter label rules and appends SVG text/line nodes.                                                     |
| `renderPointLabel`                   | label helper         | No     | Yes              | No         | Yes          | Yes             | Modal retail line labels                              | keep in `js/investment-analytics.js` for now                                     | P2-do-not-extract-yet | Label cadence, color, class name, formatter callback, and focus behavior are renderer-coupled.                          |
| `renderAllPointLabel`                | label helper         | No     | Yes              | No         | Yes          | Yes             | Wide retail chart point labels                        | keep in `js/investment-analytics.js` for now                                     | P2-do-not-extract-yet | Appends focusable labels later in `renderLineSeries`; keep coupled to renderer for now.                                 |
| `createSourceMarkup`                 | tooltip helper       | Mostly | No               | No         | No           | No              | Retail tooltip content                                | keep in `js/investment-analytics.js` for now                                     | needs-review          | Pure string builder, but tooltip markup and source escaping are coupled to chart tooltip CSS.                           |
| `createFinancialTooltipContent`      | tooltip helper       | Mostly | No               | No         | No           | Yes             | Retail chart tooltips                                 | keep in `js/investment-analytics.js` for now                                     | P2-do-not-extract-yet | Uses formatter bridge-backed helpers and metric-specific retail financial text.                                         |
| `createTooltipContent`               | tooltip helper       | Mostly | No               | No         | No           | Yes             | Retail chart tooltips                                 | keep in `js/investment-analytics.js` for now                                     | P2-do-not-extract-yet | Combines source resolution, notes, escaped HTML, and formatter output.                                                  |
| `showTooltip`                        | tooltip helper       | No     | No               | Yes        | Yes          | No              | Retail chart tooltip triggers                         | keep in `js/investment-analytics.js` for now                                     | P2-do-not-extract-yet | Reads element sizes and mutates tooltip classes/styles; high DOM timing risk.                                           |
| `hideTooltip`                        | tooltip helper       | No     | No               | No         | Yes          | No              | Tooltip controller                                    | keep in `js/investment-analytics.js` for now                                     | P2-do-not-extract-yet | Simple, but coupled to tooltip visibility CSS.                                                                          |
| `createTooltipController`            | tooltip helper       | No     | No               | No         | Yes          | No              | `renderLineSeries`                                    | keep in `js/investment-analytics.js` for now                                     | P2-do-not-extract-yet | Wires `mouseenter`/`mouseleave` listeners and timers.                                                                   |
| `bindTooltipTrigger`                 | tooltip helper       | No     | No               | No         | Yes          | No              | Retail chart markers and labels                       | keep in `js/investment-analytics.js` for now                                     | P2-do-not-extract-yet | Event wiring must not duplicate listeners or change focus behavior.                                                     |
| `renderLineSeries`                   | chart renderer       | No     | Yes              | No         | Yes          | Yes             | `renderLineChart`                                     | `domains/investment-intelligence/analytics/scripts/chart-renderer.js`            | P2-do-not-extract-yet | Full renderer creates paths, markers, labels, ARIA labels, and tooltip bindings.                                        |
| `getLineChartConfig`                 | chart math           | Yes    | No               | No         | No           | No              | Retail line charts                                    | `domains/investment-intelligence/analytics/scripts/utils/chart-math.js`          | P0-first              | Pure scaling/config helper; watch rounded min/max behavior.                                                             |
| `renderLineChart`                    | chart renderer       | No     | Yes              | No         | Yes          | Yes             | `renderMetricChart`                                   | `domains/investment-intelligence/analytics/scripts/chart-renderer.js`            | P2-do-not-extract-yet | Public renderer empties/appends container, creates SVG title and tooltip DOM, then appends legend.                      |
| `buildSeries`                        | sector chart         | Mostly | No               | No         | No           | No              | `renderMetricChart`                                   | keep in `js/investment-analytics.js` for now                                     | needs-review          | Data mapping is pure with inputs, but currently reads global dataset through `getCompanies()`.                          |
| `renderMetricChart`                  | sector chart         | No     | No               | Yes        | Yes          | Yes             | Retail sector charts                                  | keep in `js/investment-analytics.js` for now                                     | P2-do-not-extract-yet | Reads mount by id and invokes full renderer; keep in sector/runtime owner.                                              |
| `renderOperatingProfitPerStoreChart` | sector chart         | No     | No               | Yes        | Yes          | Yes             | Retail sector panel and dataset load flow             | keep in `js/investment-analytics.js` for now                                     | P2-do-not-extract-yet | Depends on current retail panel mount id and active sector data lifecycle.                                              |
| `getCompoundChartPoint`              | chart math           | Yes    | No               | No         | No           | No              | Compound growth chart and `buildChartPath`            | `domains/investment-intelligence/analytics/scripts/utils/chart-math.js`          | P0-first              | Pure calculator coordinate helper; candidate for first chart math extraction.                                           |
| `buildChartPath`                     | SVG path builder     | Yes    | No               | No         | No           | No              | Compound growth chart                                 | `domains/investment-intelligence/analytics/scripts/utils/chart-math.js`          | P0-first              | Pure path string builder; depends on `getCompoundChartPoint` and current `toFixed(2)` output.                           |
| `shouldShowChartValueLabel`          | label helper         | Yes    | No               | No         | No           | No              | Compound, retirement, and CAGR chart labels           | `domains/investment-intelligence/analytics/scripts/utils/chart-math.js`          | P0-first              | Pure label cadence helper shared by calculator charts.                                                                  |
| `appendSvgTitle`                     | accessibility helper | No     | Yes              | No         | Yes          | No              | Calculator chart marker groups                        | `domains/investment-intelligence/analytics/scripts/utils/svg.js`                 | P1-later              | Creates a `<title>` child for accessible SVG groups; keep local until SVG helper contract is tested.                    |
| `appendChartPointMarker`             | accessibility helper | No     | Yes              | No         | Yes          | Yes             | Compound, retirement, and CAGR chart renderers        | `domains/investment-intelligence/analytics/scripts/calculators/chart-helpers.js` | P2-do-not-extract-yet | Creates focusable groups, markers, inline SVG tooltips, and title text.                                                 |
| `appendChartValueLabel`              | label helper         | No     | Yes              | No         | Yes          | No              | Compound, retirement, and CAGR chart renderers        | `domains/investment-intelligence/analytics/scripts/calculators/chart-helpers.js` | P1-later              | Small SVG label appender, but still mutates renderer-owned SVG.                                                         |
| `renderGrowthChart`                  | calculator chart     | No     | Yes              | Yes        | Yes          | Yes             | Compound calculator                                   | keep in `js/investment-analytics.js` for now                                     | P2-do-not-extract-yet | Full compound chart renderer controls summary text, axes, paths, labels, CSS classes, and mount lifecycle.              |
| `renderRetirementGrowthChart`        | calculator chart     | No     | Yes              | Yes        | Yes          | Yes             | Retirement calculator                                 | keep in `js/investment-analytics.js` for now                                     | P2-do-not-extract-yet | Full renderer uses local coordinate/path math, labels, focusable markers, and summary copy.                             |
| `renderCagrGrowthChart`              | calculator chart     | No     | Yes              | Yes        | Yes          | Yes             | CAGR calculator                                       | keep in `js/investment-analytics.js` for now                                     | P2-do-not-extract-yet | Full renderer includes min/max range padding, path generation, axes, markers, labels, and summary copy.                 |

## 5. Strict extraction classification

### Pure chart math helper

A pure chart math helper accepts all data and configuration as parameters and returns only numbers, coordinate objects, booleans, arrays, or path strings. It must not read or write DOM, access globals, call formatter bridge functions, create SVG/HTML elements, attach event listeners, mutate inputs, or depend on current page state.

Examples from the inventory include `getPoint`, `getLineChartConfig`, `getCompoundChartPoint`, `buildChartPath`, and `shouldShowChartValueLabel`.

### SVG utility

An SVG utility creates or configures SVG nodes, attributes, or child nodes. It may be small and reusable, but it is not pure because it depends on `document.createElementNS` and mutates element trees. SVG utilities should move only after the namespace contract and classic-script bridge strategy are proven.

Examples include `createSvgElement`, `appendSvgTitle`, and potentially small label appenders.

### Renderer

A renderer owns generated chart structure, mount lifecycle, CSS classes, dimensions, labels, accessibility attributes, summaries, tooltip behavior, or event listeners. Renderers should remain in `js/investment-analytics.js` during the first chart/SVG extraction and should only be moved after pure chart math has been extracted and smoke-tested.

Pure chart math is the safest first extraction target. Renderers are the least safe first target because they combine DOM timing, visual output, CSS coupling, accessibility, and formatter behavior.

## 6. Do not extract first

The first chart/SVG runtime extraction must not move these categories:

- Full chart render functions.
- DOM mounting functions.
- Tooltip/event wiring.
- Calculator render functions.
- Sector panel render functions.
- Functions depending on current page state.
- Chatbot or premium logic.

## 7. Proposed first runtime extraction scope

For the first future runtime extraction PR:

- Extract only clearly pure chart math/path helpers if found.
- Keep `js/investment-analytics.js` as the public entrypoint.
- Do not extract full chart renderers.
- Do not change chart dimensions, labels, tooltip behavior, CSS classes, or SVG output.
- If direct imports are unsafe, use the same global bridge pattern as formatters.

Recommended first helpers are `getPoint`, `getLineChartConfig`, `getCompoundChartPoint`, `buildChartPath`, and `shouldShowChartValueLabel`, provided they can be mirrored without changing return values or call timing.

## 8. Module/bridge strategy

Because `js/investment-analytics.js` is still a classic script, future chart math extraction should use a bridge-compatible strategy instead of direct static imports from the classic entrypoint.

Future bridge shape:

- Use the new `domains/investment-intelligence/analytics/scripts/utils/chart-math.js` module for pure chart math helpers.
- Phase 5M loads `domains/investment-intelligence/analytics/scripts/utils/chart-math-global.js` on `pages/investment-analytics.html` before migrating classic-script consumers.
- Prefer `window.TEKNOIFY_INVESTMENT_UTILS.chartMath` when the existing investment utils global can be safely extended; otherwise use the bridge's `window.TEKNOIFY_INVESTMENT_CHART_MATH` fallback namespace.
- Keep local fallback functions in `js/investment-analytics.js` during the first migration, matching the formatter bridge pattern.
- Do not expose renderer globals yet; renderer extraction should wait until pure helpers and the bridge are validated.

## 9. Future target files

Future extraction targets may include:

- `domains/investment-intelligence/analytics/scripts/utils/chart-math.js`
- `domains/investment-intelligence/analytics/scripts/utils/svg.js`
- `domains/investment-intelligence/analytics/scripts/chart-renderer.js`
- `domains/investment-intelligence/analytics/scripts/calculators/chart-helpers.js`

Phase 5L created `chart-math.js` and `chart-math-global.js`; the remaining targets should wait for later, focused runtime PRs.

Phase 5M loads the chart math bridge on `pages/investment-analytics.html`, while local chart math and path helper functions remain in place.

Phase 5N updates selected chart math helper definitions in `js/investment-analytics.js` to use guarded bridge-first/local-fallback wrappers when bridge helpers are available. Chart renderers and DOM/SVG mounting remain untouched, and the local chart math/path fallback definitions remain in place.

## 10. Smoke test checklist for future chart/SVG extraction

Future chart/SVG extraction PRs should verify:

- Investment analytics page loads without console errors.
- Compound growth chart still renders.
- Retirement chart still renders.
- Sector charts still render if present.
- SVG paths visually match prior behavior.
- Axis labels remain unchanged.
- Value labels remain unchanged.
- Tooltips still work.
- Keyboard/focus accessibility remains unchanged.
- Chart summaries still render.
- Mobile/responsive chart layout still works.
- Calculator outputs remain unchanged.
- No duplicate event listeners.
- No layout shift.

## 11. Risk notes

Known chart/SVG extraction risks:

- SVG namespace bugs can create elements that appear in the DOM but do not render as SVG.
- Axis scaling changes can alter chart interpretation even when data is unchanged.
- Floating point rounding differences can change SVG path strings and marker positions.
- Formatter bridge interaction can affect axis labels, value labels, tooltip text, and summaries.
- Accessibility label regressions can remove meaningful focus names or SVG titles.
- DOM timing issues can appear if renderers run before mounts, templates, or bridge globals are available.
- Hidden CSS class coupling can break styling when generated class names or element order changes.
- The classic script cannot directly import modules, so bridge loading and local fallbacks are required.
- Visual regressions may not be caught by lint/check.

## 12. Relationship to existing docs

Related documentation:

- [`investment-frontend-split-plan.md`](investment-frontend-split-plan.md)
- [`investment-utility-extraction-checklist.md`](investment-utility-extraction-checklist.md)
- [`investment-module-loading-strategy.md`](investment-module-loading-strategy.md)
- [`investment-formatter-bridge-smoke-test.md`](investment-formatter-bridge-smoke-test.md)
- [`../../domains/investment-intelligence/analytics/scripts/utils/README.md`](../../domains/investment-intelligence/analytics/scripts/utils/README.md)

## 13. Phase 5K status

Phase 5K created this chart/SVG helper extraction checklist only. No runtime JS, CSS, HTML, data, workflow, package, route, or formatter files were moved or changed.
