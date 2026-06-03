# Investment Analytics Chatbot Scripts

## Purpose

This folder will contain product-facing investment chatbot UI and coordination logic for the Investment Analytics frontend.

## What belongs here

Future chatbot modules may coordinate:

- Chatbot widget behavior
- Mock client integration
- Query logging client coordination if applicable
- Source/citation display logic in the future

## What does not belong here yet

Current chatbot or mock assistant runtime code should not be moved here yet. RAG architecture docs stay under `docs/rag/`, API contracts stay under `docs/api-contracts/`, and backend/API code does not belong here.

## Current migration status

Migration status: Phase 5D README-only skeleton; no investment analytics JS/CSS files have been moved here yet.

## Candidate current source files

- Chatbot and mock assistant sections currently inside `js/investment-analytics.js`, if present.

## First safe migration idea

Keep current chatbot/mock assistant logic in place until it can be isolated from the main investment script.
