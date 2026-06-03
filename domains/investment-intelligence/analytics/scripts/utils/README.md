# Investment Analytics Utility Scripts

## Purpose

This folder will contain pure helper modules for the Investment Analytics frontend once runtime extraction begins.

## What belongs here

Future utility modules may include:

- Formatters
- Number parsing
- DOM helper wrappers
- Chart math helpers if they are pure
- Data normalization helpers

## What does not belong here yet

Runtime functions should not be moved here yet. This folder should not contain Firebase calls, fetch orchestration, global state mutation, event listener binding, rendering side effects, page boot logic, or behavior that depends on existing DOM timing.

## Current migration status

Migration status: Phase 5D README-only skeleton; no investment analytics JS/CSS files have been moved here yet.

## Candidate current source files

- Pure helper candidates currently inside `js/investment-analytics.js`.

## First safe migration idea

This is likely the safest first runtime extraction target.
Only move pure functions with no DOM, Firebase, fetch, global state, event listener, or rendering side effects.
