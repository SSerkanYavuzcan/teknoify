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

## Candidate current source files

- Calculator sections currently inside `js/investment-analytics.js`.

## First safe migration idea

Do not extract calculators first.
After pure utilities and chart helpers are stable, extract one calculator at a time, starting with the least coupled one.
