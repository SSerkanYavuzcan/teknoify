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

Load `compound-interest-global.js` in a later PR before migrating any calculator consumer.

## Candidate current source files

- Calculator sections currently inside `js/investment-analytics.js`.

## First safe migration idea

Do not extract calculators first.
After pure utilities and chart helpers are stable, extract one calculator at a time, starting with the least coupled one.
