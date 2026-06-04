# Investment Analytics Calculator Scripts

## Purpose

This folder will contain calculator-specific modules for the Investment Analytics frontend once the runtime split begins.

## What belongs here

Future calculator modules may cover:

- Compound interest calculators
- CAGR calculators
- Retirement calculators
- Future portfolio calculators
- Shared calculator helpers

## What does not belong here yet

Calculator runtime code should not be moved here yet. This folder should not contain page markup, global script entrypoints, CSS, data files, backend/API code, or calculator behavior changes before lower-risk utilities and chart helpers are stable.

## Current migration status

Migration status: Phase 5D README-only skeleton; no investment analytics JS/CSS files have been moved here yet.

Phase 5P documents calculator extraction planning in `docs/architecture/investment-calculator-extraction-plan.md`.

Phase 5Q created the first pure calculator module, `compound-interest.js`, and its legacy-safe browser bridge, `compound-interest-global.js`. Existing calculator consumers have not been migrated yet, so `js/investment-analytics.js` still contains the original local `growCompoundValue` helper.

The compound interest bridge tries to expose `window.TEKNOIFY_INVESTMENT_UTILS.calculators.compoundInterest` only when the existing investment utils global can be extended safely. If the formatter bridge has already provided the frozen, non-extensible investment utils namespace, the compound interest bridge instead exposes `window.TEKNOIFY_INVESTMENT_COMPOUND_INTEREST` as a separate fallback namespace.

Phase 5R loads `compound-interest-global.js` on `pages/investment-analytics.html` after the chart math bridge and before the classic deferred `js/investment-analytics.js` entrypoint. Existing compound calculator consumers are still not migrated, and local compound calculator behavior remains active.

Phase 5S migrates the first compound calculator consumer: `growCompoundValue` in `js/investment-analytics.js` now reads from the compound interest bridge when available while retaining the local fallback definition for missing, malformed, incomplete, or throwing bridge entries.

Phase 5U documents CAGR extraction planning in `docs/architecture/investment-cagr-extraction-plan.md`; later CAGR migration work adds pure CAGR calculator bridge files while existing page fallback logic remains in `js/investment-analytics.js`.

Phase 5X migrates selected CAGR consumers in `js/investment-analytics.js`: `calculateCagr` and `getCagrBaseResult` now read from the CAGR bridge when available while retaining local fallback definitions for missing, malformed, or throwing bridge helpers.

## Candidate current source files

- Calculator sections currently inside `js/investment-analytics.js`.

## First safe migration idea

Do not extract calculators first.
After pure utilities and chart helpers are stable, extract one calculator at a time, starting with the least coupled one.
