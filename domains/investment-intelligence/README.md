# Investment Intelligence Domain

## Purpose

Future home for the Investment Intelligence product domain. This area will group investment product code by business capability instead of scattering it across public pages, shared scripts, styles, data, and RAG helpers.

## What belongs here

- Analytics page logic and product-facing coordination.
- Calculators for compound interest, CAGR, retirement, and future portfolio planning.
- Financial indicator definitions and UI behavior.
- Sector-specific analytics for retail, airlines, automotive, steel, energy, and future sectors.
- Company profile and comparison product logic.
- RAG/chatbot product-facing logic such as prompts, retrieval coordination, answer UX, and evaluations.

## What does not belong here yet

Public routes remain in `pages/` for now. Runtime HTML, JS, CSS, source data, extraction scripts, workflows, package scripts, and API contracts should not move here until dedicated migration PRs provide wrappers, redirects, or compatibility updates.

## Current migration status

Migration status: Phase 5B README-only skeleton; no runtime investment files have been moved here yet.
