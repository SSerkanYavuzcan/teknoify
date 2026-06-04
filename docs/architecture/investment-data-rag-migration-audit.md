# Phase 8A Investment Data + RAG Migration Audit

## 1. Title and purpose

This Phase 8A audit is a non-runtime Investment Data + RAG migration map. Its purpose is to identify current stock/investment data, generated outputs, RAG documents, API contracts, RAG scripts, workers, APIs, and workflows before any physical file moves happen.

Phase 8A does not move data files, does not change generated payload formats, does not change retrieval behavior, and does not relink runtime pages. It creates ownership documentation and a validation script so future migration phases can make small, reversible changes with known producers and consumers.

## 2. Scope

In scope:

- Current stock/investment data folders, especially `data/stock/turkey/`, `data/investment/`, and related investment-like data roots discovered under `data/`.
- Generated stock outputs such as document catalogs, text extraction catalogs, and extracted text JSON files.
- RAG docs under `docs/rag/`.
- API contracts under `docs/api-contracts/`.
- RAG, extraction, retrieval, and diagnostic scripts under `scripts/` and `scripts/rag/`.
- RAG worker/service ownership folders under `services/rag-workers/`.
- API endpoints that log or serve chatbot/RAG behavior under `api/`.
- Workflows that may produce or refresh data under `.github/workflows/`.

Out of scope:

- Moving data files.
- Changing script paths.
- Changing API contracts.
- Changing workflows.
- Changing public runtime pages.
- Changing generated data format.
- Changing embeddings or retrieval behavior.

## 3. Current asset inventory

| Current Path                                                             | Type                      | Current Role                                                                                                      | Producer                                                                                           | Consumer                                                                                                   | Suggested Future Owner                                   | Move Priority           | Risk   | Notes                                                                                                            |
| ------------------------------------------------------------------------ | ------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------- | ------ | ---------------------------------------------------------------------------------------------------------------- |
| `data/stock/turkey/README.md`                                            | manual docs               | Source document rules, folder conventions, and catalog builder instructions for Turkish listed company documents. | Manual documentation.                                                                              | Maintainers adding source PDFs/manifests.                                                                  | `data/investment/turkey/`                                | P2-safe-doc-only        | medium | Doc content can inform future ownership, but this file also documents current live paths.                        |
| `data/stock/turkey/manifest.schema.json`                                 | source schema             | JSON schema for per-company Turkish stock document manifests.                                                     | Manual schema updates.                                                                             | `scripts/build-stock-document-catalog.mjs`; maintainers validating manifests.                              | `data/investment/turkey/`                                | P0-do-not-move-yet      | medium | Schema movement requires catalog builder/path compatibility first.                                               |
| `data/stock/turkey/*/manifest.json`                                      | source data               | Company-level source document metadata for BIMAS, CRFSA, MGROS, SOKM, and TUPRS.                                  | Manual document registration.                                                                      | `scripts/build-stock-document-catalog.mjs`; docs describing source traceability.                           | `data/investment/turkey/companies/`                      | P0-do-not-move-yet      | medium | Keep source metadata with PDFs until producer/consumer paths are verified.                                       |
| `data/stock/turkey/*/reports/*.pdf`                                      | source documents          | Official company report PDFs used as future RAG source documents.                                                 | Manual source document ingestion.                                                                  | `scripts/build-stock-document-catalog.mjs`; `scripts/extract-stock-document-text.py`; future RAG indexing. | `data/investment/turkey/source-documents/`               | P0-do-not-move-yet      | high   | Source PDFs are path-sensitive and may become large; do not duplicate/move without LFS and compatibility review. |
| `data/stock/turkey/*/financial-statements/.gitkeep`                      | source folder placeholder | Placeholder for future financial statement PDFs.                                                                  | Manual folder scaffolding.                                                                         | Maintainers.                                                                                               | `data/investment/turkey/source-documents/`               | P1-copy-or-mirror-later | low    | Empty placeholders are lower risk, but folder semantics should move only with ownership docs.                    |
| `data/stock/turkey/*/investor-presentations/.gitkeep`                    | source folder placeholder | Placeholder for future investor presentation PDFs.                                                                | Manual folder scaffolding.                                                                         | Maintainers.                                                                                               | `data/investment/turkey/source-documents/`               | P1-copy-or-mirror-later | low    | Empty placeholders are lower risk, but folder semantics should move only with ownership docs.                    |
| `data/stock/turkey/*/reports/.gitkeep`                                   | source folder placeholder | Placeholder for report PDFs where no report exists yet.                                                           | Manual folder scaffolding.                                                                         | Maintainers.                                                                                               | `data/investment/turkey/source-documents/`               | P1-copy-or-mirror-later | low    | Empty placeholders are lower risk, but should remain stable until source document migration starts.              |
| `data/stock/turkey/document-catalog.json`                                | generated catalog         | Metadata-only generated catalog of company documents.                                                             | `scripts/build-stock-document-catalog.mjs`; `npm run build:stock-doc-catalog`.                     | `scripts/extract-stock-document-text.py`; future RAG/index consumers.                                      | `data/investment/turkey/generated/`                      | P0-do-not-move-yet      | high   | Generated path is embedded in producer/consumer scripts and catalog metadata.                                    |
| `data/stock/turkey/text-extraction-catalog.json`                         | generated catalog         | Generated catalog of extracted text outputs, hashes, pages, chunks, and extraction status.                        | `scripts/extract-stock-document-text.py`; `.github/workflows/extract-stock-document-text.yml`.     | `scripts/search-stock-document-text.mjs`; future retrieval/indexing.                                       | `data/investment/turkey/generated/`                      | P0-do-not-move-yet      | high   | Do not move until extraction workflow and search script read/write through compatibility paths.                  |
| `data/stock/turkey/extracted-text/*.json`                                | derived indexes           | Extracted text/chunk JSON for source PDFs.                                                                        | `scripts/extract-stock-document-text.py`; `.github/workflows/extract-stock-document-text.yml`.     | `scripts/search-stock-document-text.mjs`; future RAG retrieval/indexing.                                   | `data/investment/turkey/generated/`                      | P0-do-not-move-yet      | high   | Derived artifacts are path-sensitive and should remain separate from source PDFs.                                |
| `data/investment/README.md`                                              | ownership docs            | Future root ownership notes for investment datasets.                                                              | Phase 5B/Phase 8A documentation.                                                                   | Maintainers planning migration.                                                                            | keep-current                                             | P2-safe-doc-only        | low    | README-only target ownership, no data moved.                                                                     |
| `data/investment/turkey/README.md`                                       | ownership docs            | Future Turkish investment/company/sector/indicator dataset ownership notes.                                       | Phase 5B/Phase 8A documentation.                                                                   | Maintainers planning migration.                                                                            | keep-current                                             | P2-safe-doc-only        | low    | README-only target ownership, no `data/stock/turkey` migration yet.                                              |
| `data/investment-analytics/supermarket_dataset.json`                     | public/static JSON output | Investment analytics supermarket dataset consumed by frontend chart code.                                         | needs-review.                                                                                      | `js/investment-analytics.js` via static fetch path.                                                        | needs-review                                             | P0-do-not-move-yet      | high   | Runtime frontend data path; included by audit because it is investment data but not part of this migration.      |
| `docs/rag/README.md`                                                     | manual docs               | RAG docs index and ownership notes.                                                                               | Manual documentation.                                                                              | Maintainers.                                                                                               | `docs/rag/`                                              | P2-safe-doc-only        | low    | Documentation-only.                                                                                              |
| `docs/rag/rag-pipeline-design.md`                                        | rag-doc                   | Pipeline design for future Investment Analytics chatbot/RAG.                                                      | Manual architecture documentation.                                                                 | Maintainers and future RAG implementation.                                                                 | `docs/rag/`                                              | P2-safe-doc-only        | low    | Safe to keep as canonical design doc.                                                                            |
| `docs/rag/rag-text-extraction.md`                                        | rag-doc                   | Text extraction workflow and output documentation.                                                                | Manual architecture documentation.                                                                 | Maintainers; extraction script owners.                                                                     | `docs/rag/`                                              | P2-safe-doc-only        | low    | Describes extraction outputs; does not move runtime paths.                                                       |
| `docs/rag/rag-local-retrieval.md`                                        | rag-doc                   | Local retrieval/search testing notes.                                                                             | Manual architecture documentation.                                                                 | Maintainers; retrieval script owners.                                                                      | `docs/rag/`                                              | P2-safe-doc-only        | low    | Describes keyword retrieval behavior.                                                                            |
| `docs/rag/rag-document-index-schema.md`                                  | rag-doc                   | Document index schema expectations.                                                                               | Manual architecture documentation.                                                                 | Catalog builders, extraction, indexing, future retrievers.                                                 | `docs/rag/`                                              | P2-safe-doc-only        | medium | Preserve schema compatibility before moving generated artifacts.                                                 |
| `docs/api-contracts/README.md`                                           | manual docs               | API contracts index and ownership notes.                                                                          | Manual documentation.                                                                              | Maintainers.                                                                                               | `docs/api-contracts/`                                    | P2-safe-doc-only        | low    | Documentation-only.                                                                                              |
| `docs/api-contracts/chatbot-api-contract.md`                             | api-contract              | Chatbot API request/response contract.                                                                            | Manual contract documentation.                                                                     | `api/chat.js`; frontend chatbot callers.                                                                   | `docs/api-contracts/`                                    | P2-safe-doc-only        | medium | Contract must remain stable when runtime RAG behavior changes.                                                   |
| `docs/api-contracts/chatbot-query-logging-contract.md`                   | api-contract              | Chatbot query logging/privacy contract.                                                                           | Manual contract documentation.                                                                     | `api/chat-log.js`; frontend logging callers.                                                               | `docs/api-contracts/`                                    | P2-safe-doc-only        | medium | Logging/privacy contract must remain stable.                                                                     |
| `scripts/build-stock-document-catalog.mjs`                               | script                    | Builds `data/stock/turkey/document-catalog.json` from company manifests.                                          | Manual CLI; `npm run build:stock-doc-catalog`.                                                     | Maintainers; extraction workflow chain.                                                                    | `services/rag-workers/stock-documents/extract-or-index/` | P0-do-not-move-yet      | high   | Hard-codes current source root and output path.                                                                  |
| `scripts/extract-stock-document-text.py`                                 | script                    | Extracts PDF text/chunks and writes extracted text catalog/output JSON.                                           | Manual CLI; `.github/workflows/extract-stock-document-text.yml`; `npm run extract:stock-doc-text`. | Search/retrieval scripts and future RAG indexing.                                                          | `services/rag-workers/stock-documents/extract/`          | P0-do-not-move-yet      | high   | Hard-coded paths and workflow/package references must be wrapped first.                                          |
| `scripts/search-stock-document-text.mjs`                                 | script                    | Local keyword retrieval over extracted text JSON.                                                                 | Manual CLI; `npm run search:stock-doc-text`.                                                       | Maintainers diagnosing local retrieval.                                                                    | `scripts/rag/diagnostics/`                               | P0-do-not-move-yet      | medium | Reads current extracted text path directly.                                                                      |
| `scripts/rag/README.md`                                                  | ownership docs            | Future RAG maintenance/backfill/diagnostic CLI script ownership.                                                  | Phase 5B/Phase 8A documentation.                                                                   | Maintainers planning script migration.                                                                     | keep-current                                             | P2-safe-doc-only        | low    | README-only; package scripts not changed.                                                                        |
| `scripts/update-usd-try-rates.mjs` and `scripts/update-usd-try-rates.py` | one-off/data scripts      | Update currency data used by investment analytics calculations.                                                   | Manual CLI; `.github/workflows/update-usd-try-rates.yml`; `npm run update:usdtry`.                 | Frontend investment calculations via currency data.                                                        | needs-review                                             | P0-do-not-move-yet      | high   | Investment-adjacent but currency-owned; not a RAG move target.                                                   |
| `services/rag-workers/README.md`                                         | ownership docs            | Future service-level RAG worker root.                                                                             | Manual documentation.                                                                              | Maintainers.                                                                                               | `services/rag-workers/`                                  | P2-safe-doc-only        | low    | Documentation-only.                                                                                              |
| `services/rag-workers/stock-documents/README.md`                         | ownership docs            | Future stock document worker ownership notes.                                                                     | Phase 5B/Phase 8A documentation.                                                                   | Maintainers planning worker migration.                                                                     | keep-current                                             | P2-safe-doc-only        | low    | README-only; no worker runtime moved.                                                                            |
| `domains/investment-intelligence/rag/README.md`                          | ownership docs            | Future product-facing RAG prompts/UI/evaluation ownership notes.                                                  | Phase 5B/Phase 8A documentation.                                                                   | Product/domain maintainers.                                                                                | keep-current                                             | P2-safe-doc-only        | low    | Product RAG ownership is separate from worker/data/API contract ownership.                                       |
| `api/chat.js`                                                            | api                       | Mock chatbot API response endpoint.                                                                               | Runtime API handler.                                                                               | Frontend chatbot callers; chatbot API contract.                                                            | keep-current                                             | P0-do-not-move-yet      | high   | API runtime file; do not change in Phase 8A.                                                                     |
| `api/chat-log.js`                                                        | api                       | Chatbot query logging validation/no-op endpoint.                                                                  | Runtime API handler.                                                                               | Frontend logging callers; logging contract.                                                                | keep-current                                             | P0-do-not-move-yet      | high   | API runtime file; do not change in Phase 8A.                                                                     |
| `.github/workflows/extract-stock-document-text.yml`                      | workflow                  | Runs extraction, installs Python dependencies, commits extracted text outputs.                                    | GitHub Actions workflow.                                                                           | Generated extraction catalog/output files.                                                                 | keep-current                                             | P0-do-not-move-yet      | high   | Workflow writes current paths and must not move before compatibility updates.                                    |
| `.github/workflows/update-usd-try-rates.yml`                             | workflow                  | Refreshes USD/TRY data used by investment calculations.                                                           | GitHub Actions workflow.                                                                           | Currency JSON output and frontend calculations.                                                            | keep-current                                             | P0-do-not-move-yet      | high   | Investment-adjacent workflow; not a RAG move target.                                                             |

## 4. Data classification

- **Source documents:** `data/stock/turkey/*/reports/*.pdf` are official source PDFs. Future placeholders also exist for financial statements and investor presentations.
- **Generated catalogs:** `data/stock/turkey/document-catalog.json` and `data/stock/turkey/text-extraction-catalog.json` are generated outputs and should not be edited as source data.
- **Derived indexes:** `data/stock/turkey/extracted-text/*.json` contains extracted text/chunk data derived from source PDFs.
- **Embeddings/retrieval artifacts:** No committed embedding vectors were identified in Phase 8A. Existing catalogs include `embeddingStatus` fields and must preserve this schema for future embedding/index stages.
- **Public/static JSON/CSV outputs:** `data/investment-analytics/supermarket_dataset.json` is investment runtime data and should remain out of physical RAG migration until frontend consumers and public paths are mapped.
- **Manual docs:** `docs/rag/`, `docs/api-contracts/`, `data/investment/README.md`, `data/investment/turkey/README.md`, `scripts/rag/README.md`, `services/rag-workers/stock-documents/README.md`, and `domains/investment-intelligence/rag/README.md` are manual ownership/architecture docs.
- **API contracts:** `docs/api-contracts/chatbot-api-contract.md` and `docs/api-contracts/chatbot-query-logging-contract.md` define chatbot response and logging expectations.
- **Worker scripts:** `scripts/build-stock-document-catalog.mjs` and `scripts/extract-stock-document-text.py` are future worker candidates because they produce catalogs/extracted text.
- **One-off scripts:** `scripts/search-stock-document-text.mjs` is a local diagnostic retrieval script; `scripts/update-usd-try-rates.*` is investment-adjacent currency data maintenance and needs separate ownership review.
- **Workflows:** `.github/workflows/extract-stock-document-text.yml` writes stock document extraction outputs; `.github/workflows/update-usd-try-rates.yml` writes currency data.

## 5. Producer / consumer map

| Producer/Consumer                                   | Reads                                                                            | Writes                                                                                            | Notes                                                                                           |
| --------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `scripts/build-stock-document-catalog.mjs`          | `data/stock/turkey/*/manifest.json`; source PDF paths referenced by manifests.   | `data/stock/turkey/document-catalog.json`.                                                        | Hard-coded `data/stock/turkey` source root.                                                     |
| `scripts/extract-stock-document-text.py`            | `data/stock/turkey/document-catalog.json`; source PDF paths from catalog.        | `data/stock/turkey/extracted-text/*.json`; `data/stock/turkey/text-extraction-catalog.json`.      | Workflow-backed extraction; exact parser dependencies are script-owned.                         |
| `scripts/search-stock-document-text.mjs`            | `data/stock/turkey/extracted-text/`.                                             | None.                                                                                             | Diagnostic local keyword retrieval over extracted chunks.                                       |
| `.github/workflows/extract-stock-document-text.yml` | `scripts/extract-stock-document-text.py`; source catalog/PDF inputs.             | Commits `data/stock/turkey/extracted-text/` and `data/stock/turkey/text-extraction-catalog.json`. | Must be updated only after compatibility paths exist.                                           |
| `api/chat.js`                                       | Request body only in current mock implementation.                                | HTTP response payload.                                                                            | Contract described by `docs/api-contracts/chatbot-api-contract.md`; no RAG data file reads yet. |
| `api/chat-log.js`                                   | Request body.                                                                    | No-op validation response; no persistent file write.                                              | Contract described by `docs/api-contracts/chatbot-query-logging-contract.md`.                   |
| `js/investment-analytics.js`                        | `../data/investment-analytics/supermarket_dataset.json` and currency data paths. | DOM only.                                                                                         | Frontend runtime consumer remains separate from this Data/RAG migration.                        |
| `.github/workflows/update-usd-try-rates.yml`        | `scripts/update-usd-try-rates.py`.                                               | `data/currency/usd_try_rates.json`.                                                               | Investment-adjacent data refresh workflow; not a stock document RAG move target.                |
| `docs/rag/*.md`                                     | Current data/script/API paths by documentation reference.                        | Documentation only.                                                                               | Contractual design references; keep synchronized with staged moves.                             |
| `docs/api-contracts/*.md`                           | API behavior and payload conventions.                                            | Documentation only.                                                                               | Defines expected API contracts; do not change behavior in Phase 8A.                             |

Unknowns are intentionally marked `needs-review` instead of inferred. In particular, ownership for currency update scripts, `data/investment-analytics/supermarket_dataset.json`, and any future embedding artifacts should be resolved in a dedicated compatibility/data-path phase.

## 6. Future target structure

```text
data/investment/
├── README.md
├── turkey/
│   ├── README.md
│   ├── companies/
│   ├── sectors/
│   ├── indicators/
│   ├── source-documents/
│   └── generated/
services/rag-workers/
└── stock-documents/
    ├── README.md
    ├── extract/
    ├── index/
    ├── retrieve/
    └── evaluate/
scripts/rag/
├── README.md
├── maintenance/
├── backfills/
└── diagnostics/
domains/investment-intelligence/
└── rag/
    ├── README.md
    ├── prompts/
    ├── retrieval-ui/
    └── evaluations/
```

Ownership intent:

- `data/investment/turkey/source-documents/`: future source PDFs and manifest-like source metadata after compatibility is proven.
- `data/investment/turkey/generated/`: generated catalogs, extracted text, and derived non-public stock document artifacts.
- `services/rag-workers/stock-documents/`: extraction, indexing, retrieval preparation, and evaluation worker logic.
- `scripts/rag/`: maintenance, backfill, and diagnostic CLI wrappers that are safe for local use.
- `domains/investment-intelligence/rag/`: product-facing prompts, retrieval UI orchestration, answer evaluation criteria, and UX-level RAG behavior.

## 7. Migration principles

- Do not move generated data before producers and consumers are identified.
- Prefer copy/mirror before delete.
- Keep public/static paths stable.
- Add compatibility wrappers before path changes.
- Preserve document index schema and API contracts.
- Never mix source documents with generated indexes.
- Avoid committing large generated artifacts without clear ownership.
- Keep API runtime handlers, workflows, and frontend runtime paths unchanged until smoke checks exist.
- Treat path constants as compatibility boundaries, not incidental implementation details.

## 8. Proposed staged migration order

- **Phase 8A:** Create the audit script and migration audit docs. No runtime/data moves.
- **Phase 8B:** Create missing target README/ownership docs and empty folders only.
- **Phase 8C:** Create compatibility constants or a data path map if needed.
- **Phase 8D:** Copy/mirror one low-risk generated catalog or doc-only asset.
- **Phase 8E:** Update one script to write/read through a compatibility path.
- **Phase 8F:** Add RAG/data smoke checks.
- **Phase 8G:** Archive old duplicated outputs only after parity and consumers are verified.

## 9. Recommended first migration target

Recommended first target: **a doc-only RAG asset / README-only ownership move**.

The first safe migration should be limited to docs or empty ownership folders because current source PDFs, generated catalogs, extracted text outputs, extraction workflows, and diagnostic retrieval scripts all have direct or likely path coupling. Do not move high-risk generated data outputs until producers and consumers are clear and compatibility wrappers exist.

## 10. Validation command

```bash
node scripts/architecture/check-investment-data-rag-map.js
```

The script prints matched files, category counts, suggested owner counts, and high-risk/needs-review items. It exits `0` for audit findings and exits `1` only for script/runtime errors.

## 11. Risk matrix

| Risk                                                       | Impact                                                                            | Likelihood | Mitigation                                                                                            |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------- |
| Broken static data path                                    | Investment pages may fail to load JSON/CSV data.                                  | Medium     | Keep public/static paths stable; add compatibility maps before frontend path changes.                 |
| Stale generated data                                       | Catalogs or extracted text may no longer match source PDFs/manifests.             | Medium     | Keep generator scripts authoritative; add smoke checks comparing catalog counts and hashes.           |
| Broken RAG retrieval/index                                 | Future chatbot retrieval may miss documents or cite stale chunks.                 | Medium     | Preserve index schema; update extraction/index/retrieval together behind compatibility wrappers.      |
| Broken API logging contract                                | Chat logging clients may send invalid payloads or lose privacy guarantees.        | Medium     | Keep `docs/api-contracts/` and `api/chat-log.js` behavior stable until contract versioning exists.    |
| Workflow writing to old path                               | GitHub Actions may regenerate files in legacy locations after a move.             | High       | Update workflows only after scripts support compatible read/write paths and dry-run checks pass.      |
| Large files accidentally duplicated                        | Repository size may grow quickly if PDFs or generated outputs are copied blindly. | Medium     | Prefer README-only or small catalog mirrors first; consider Git LFS before source PDF expansion.      |
| Source/generated data mixed                                | Source traceability may be lost and generated indexes may be edited as source.    | Medium     | Keep `source-documents/` and `generated/` separate; document producer ownership.                      |
| Undocumented schema drift                                  | Consumers may break when generated catalog fields change.                         | Medium     | Preserve schema docs; add schema/version notes before writer changes.                                 |
| Frontend expecting old JSON/CSV path                       | Runtime pages may silently break after path changes.                              | High       | Do not change frontend runtime paths in Data/RAG phases; use compatibility constants and smoke tests. |
| Private/sensitive data accidentally moved into public path | Sensitive logs or source material could become web-accessible.                    | Low        | Classify data before moving; keep logs/contracts separate from public static data.                    |

## 12. Relationship to existing docs

- [`investment-intelligence-migration-plan.md`](investment-intelligence-migration-plan.md)
- [`investment-frontend-split-plan.md`](investment-frontend-split-plan.md)
- [`../rag/README.md`](../rag/README.md)
- [`../api-contracts/README.md`](../api-contracts/README.md)
- [`../../data/investment/README.md`](../../data/investment/README.md)
- [`../../data/investment/turkey/README.md`](../../data/investment/turkey/README.md)
- [`../../services/rag-workers/stock-documents/README.md`](../../services/rag-workers/stock-documents/README.md)
- [`../../scripts/rag/README.md`](../../scripts/rag/README.md)
- [`../../domains/investment-intelligence/rag/README.md`](../../domains/investment-intelligence/rag/README.md)

## 13. Phase 10A enterprise readiness note

The enterprise readiness checker now runs the Data/RAG map audit as part of the final migration readiness gate:

```bash
node scripts/architecture/check-enterprise-migration-readiness.js
```

The underlying Data/RAG audit remains:

```bash
node scripts/architecture/check-investment-data-rag-map.js
```

Phase 10A does not move `data/stock/turkey/`, generated RAG outputs, workflows, API handlers, or RAG producers/consumers.
