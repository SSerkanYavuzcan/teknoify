# Investment Analytics Styles

## Purpose

This folder will become the future home for Investment Analytics styles after CSS split compatibility is verified.

## What belongs here

Future candidate CSS files may include:

- `index.css`
- `layout.css`
- `hero.css`
- `sector-selector.css`
- `sector-panels.css`
- `charts.css`
- `calculators.css`
- `chatbot.css`
- `premium-gate.css`
- `responsive.css`

## What does not belong here yet

Runtime CSS should not be moved here yet. Public page links, the currently linked public stylesheet, JavaScript, data files, scripts, workflows, package files, and unrelated shared CSS should remain unchanged until CSS order and specificity are verified.

## Current migration status

Migration status: Phase 5D README-only skeleton; no investment analytics JS/CSS files have been moved here yet.

Phase 6A documents CSS split planning in `docs/architecture/investment-css-split-strategy.md`; no CSS files have been moved or relinked yet.

## Candidate current source files

- `css/investment-analytics.css`
- `css/06-pages/investment-analytics/*`
- Financial indicators CSS, such as `css/financial-indicators.css`, if future ownership analysis finds shared investment analytics styling that belongs here.

## First safe migration idea

Keep the currently linked public stylesheet stable.
Split CSS behind a manifest/import file first.
Do not update page links until CSS order/specificity is verified.
