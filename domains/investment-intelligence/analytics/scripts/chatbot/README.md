# Investment Analytics Chatbot Scripts

## Purpose

This folder documents future ownership for investment chatbot and mock assistant UI behavior.
It exists so chatbot runtime boundaries can be reviewed before any chatbot code moves out of the active classic orchestrator.

## What belongs here

Future chatbot modules may coordinate:

- Investment chatbot widget open/close behavior.
- Mock assistant UI behavior.
- Message rendering and source/citation display behavior after contracts are stable.
- Query logging client coordination if the frontend API contract requires it.
- Chatbot README notes, smoke-test expectations, and data/API contract references.

## What does not belong here yet

Do not move chatbot runtime code here yet.
Current runtime code still lives in `js/investment-analytics.js`.
No chatbot extraction should happen before data/API contracts are reviewed, including response normalization, source display, logging best-effort behavior, and fallback/error handling.

## Current migration status

Current migration status: Phase 7A ownership documentation only; no runtime code moved here yet.
