# Investment RAG Product Logic

## Purpose

Future home for product-facing RAG and chatbot behavior for Investment Intelligence.

## Future ownership

Product-facing RAG ownership belongs here later, including prompts, retrieval UI behavior, answer UX, product-level evaluation criteria, and orchestration that shapes how investment answers are presented.

Worker logic, source/generated data, API contracts, and API runtime handlers remain separate:

- Worker/extraction/index/retrieval services belong under `services/rag-workers/stock-documents/`.
- Maintenance/backfill/diagnostic CLIs belong under `scripts/rag/` when compatibility wrappers exist.
- Source and generated data belongs under data ownership folders.
- API contracts remain under `docs/api-contracts/`.

## Phase 8A audit note

Phase 8A audited product-facing RAG ownership boundaries only. No runtime RAG UI, prompts, API files, workflows, scripts, source data, generated data, or public frontend behavior were moved or changed.

## What does not belong here yet

RAG architecture docs stay under `docs/rag/`. Source PDFs and data stay under data folders. Worker and extraction code belongs under `services/rag-workers/` or `scripts/rag/`. Do not move current scripts, workflows, data payloads, or API contracts here yet.

## Current migration status

Migration status: Phase 8A audit and README ownership update only; no runtime RAG UI has been moved here yet.
