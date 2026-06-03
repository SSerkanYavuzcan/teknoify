# Investment Analytics Utility Scripts

## Purpose

This folder contains pure helper modules for the Investment Analytics frontend as runtime extraction begins.

## What belongs here

Utility modules may include:

- Formatters
- Number parsing
- DOM helper wrappers
- Chart math helpers if they are pure
- Data normalization helpers

## What does not belong here

Runtime functions with page side effects should not be moved here yet. This folder should not contain Firebase calls, fetch orchestration, global state mutation, event listener binding, rendering side effects, page boot logic, or behavior that depends on existing DOM timing.

## Current migration status

Migration status: Phase 5G created the first pure formatter module and legacy-safe formatter bridge:

- `formatters.js` exports pure formatter and number parsing helpers mirrored from `js/investment-analytics.js`.
- `formatters-global.js` imports those helpers and exposes them under `window.TEKNOIFY_INVESTMENT_UTILS.formatters` when the bridge module is loaded.

Phase 5H loads `formatters-global.js` on `pages/investment-analytics.html` before the existing classic deferred analytics entrypoint.

Phase 5I migrates selected formatter consumers in `js/investment-analytics.js` to read from the bridge when available while retaining local fallback definitions. Missing bridge utilities, malformed bridge values, incomplete formatter sets, or throwing bridged functions still fall back to the local helper logic.

Phase 5K adds a documentation-only chart/SVG helper extraction checklist for future pure chart math extraction. No runtime JS/CSS files were moved, and no chart utility modules were created in this phase.

Phase 5L creates the first pure chart math module and bridge without migrating consumers:

- `chart-math.js` exports pure chart coordinate, path, config, and label cadence helpers mirrored from the current local functions in `js/investment-analytics.js`.
- `chart-math-global.js` imports those helpers and safely exposes the frozen chart math bridge as `window.TEKNOIFY_INVESTMENT_CHART_MATH`. It also adds `window.TEKNOIFY_INVESTMENT_UTILS.chartMath` only when an existing investment utils object is extensible and can be extended without replacing `window.TEKNOIFY_INVESTMENT_UTILS.formatters`.
- The existing formatter bridge currently defines `window.TEKNOIFY_INVESTMENT_UTILS` as a frozen, non-writable object, so the chart math bridge must preserve formatter behavior and use the separate chart math namespace when loaded after formatters.
- Existing consumers have not been migrated yet. `js/investment-analytics.js` still contains its original chart math/path helper functions.

Phase 5M loads `chart-math-global.js` on `pages/investment-analytics.html` after the formatter bridge and before the classic deferred analytics entrypoint. Existing chart math consumers are still not migrated. A future PR should migrate selected chart math helpers with fallback safety so local helpers continue to protect runtime behavior if the bridge is missing, incomplete, or throws.

## Candidate current source files

- Pure helper candidates currently inside `js/investment-analytics.js`.

## First safe migration idea

The first runtime extraction target was the formatter set created in Phase 5G. Phase 5L now provides pure chart math helpers, but consumer migrations should keep local fallbacks in `js/investment-analytics.js` until the bridge load order and Investment Analytics smoke tests are proven.
