# Investment Analytics Sector Scripts

## Purpose

This folder documents future ownership for Investment Analytics sector selectors, sector panels, and sector data mapping.
It exists to keep sector UI boundaries explicit before any runtime sector code moves out of the active classic orchestrator.

## What belongs here

Future sector modules may own:

- Sector selector state coordination.
- Sector panel rendering after renderer contracts are stable.
- Sector-specific static data mapping and pure normalization helpers.
- Sector README notes, smoke-test expectations, and selector/panel contracts.

## What does not belong here yet

Do not move sector UI behavior here yet.
Current runtime code still lives in `js/investment-analytics.js`.
Sector UI should not move before the boot/orchestrator strategy is ready because selectors, panels, ARIA state, and current page markup are tightly coupled.

## Current migration status

Current migration status: Phase 7A ownership documentation only; no runtime code moved here yet.
