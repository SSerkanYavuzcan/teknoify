# Investment Analytics Premium Scripts

## Purpose

This folder documents future ownership for Investment Analytics premium and access gate UI behavior.
It exists so premium/access runtime boundaries can be reviewed before any premium UI code moves out of the active classic orchestrator.

## What belongs here

Future premium modules may coordinate:

- Investment page premium gate UI behavior.
- Upgrade/login CTA coordination scoped to Investment Analytics experiences.
- Access-state UI wiring after auth and route contracts are stable.
- Premium README notes, smoke-test expectations, and auth/access documentation references.

## What does not belong here yet

Do not move premium gate runtime code here yet.
Current runtime code still lives in `js/investment-analytics.js`, with related shared behavior remaining in existing shared gate scripts until ownership is reviewed.
Premium gate extraction should be coordinated with auth/access docs and must not alter current access behavior in a documentation-only phase.

## Current migration status

Current migration status: Phase 7A ownership documentation only; no runtime code moved here yet.
