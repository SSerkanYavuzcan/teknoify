# Investment Analytics Scripts

## Purpose

This folder will become the future home for Investment Analytics frontend orchestration and feature scripts.
It is intended to hold browser-facing modules that coordinate the analytics page experience after runtime split compatibility is verified.

## What belongs here

Future candidate modules may include:

- `boot.js`
- `sector-selector.js`
- `sector-panels.js`
- `retail-analysis.js`
- `airline-analysis.js`
- `chart-renderer.js`
- `svg-chart-utils.js`

These files should eventually coordinate investment analytics UI behavior while preserving the current public loading contract.

## What does not belong here yet

Runtime JavaScript should not be moved here yet. Public page entrypoints, script tags, data files, backend/API code, workflows, package files, and unrelated shared scripts should remain in their current locations until a dedicated compatibility PR proves the migration path.

## Current migration status

Migration status: Phase 5D README-only skeleton; no investment analytics JS/CSS files have been moved here yet.

## Candidate current source files

- `js/investment-analytics.js`

## First safe migration idea

Extract only pure utility functions first, or add wrappers without changing the public entrypoint.
Keep `js/investment-analytics.js` as the public entrypoint until static import/loading compatibility is verified.
