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

## Candidate current source files

- Pure helper candidates currently inside `js/investment-analytics.js`.

## First safe migration idea

The first runtime extraction target is the formatter set created in Phase 5G. Consumer migrations should keep local fallbacks in `js/investment-analytics.js` until the bridge load order and Investment Analytics smoke tests are proven.
