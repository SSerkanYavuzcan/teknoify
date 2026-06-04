# Investment Analytics Chart Scripts

## Purpose

This folder documents future ownership for Investment Analytics chart renderers and SVG helpers.
It exists so chart runtime boundaries can be reviewed before any chart code moves out of the active classic orchestrator.

## What belongs here

Future chart modules may own:

- Line chart renderers.
- Growth chart renderers.
- SVG helper utilities that create chart nodes, titles, markers, labels, and paths.
- Tooltip rendering helpers that are proven safe to isolate from current page markup.
- Chart README notes, smoke-test expectations, and renderer contracts.

Chart math helpers already have pure bridge modules under `domains/investment-intelligence/analytics/scripts/utils/`.
Those bridge modules are compatibility steps for the current classic script and do not mean chart DOM/SVG renderers are ready to move.

## What does not belong here yet

Do not move chart renderers, SVG DOM helpers, tooltip event binding, chart accessibility behavior, or chart-specific page boot code here yet.
Current runtime code still lives in `js/investment-analytics.js`.
Renderers should not be moved until visual/chart smoke testing passes and the SVG/class/ARIA contracts are documented.

## Current migration status

Current migration status: Phase 7A ownership documentation only; no runtime code moved here yet.
