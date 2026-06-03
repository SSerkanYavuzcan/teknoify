# Investment Intelligence Migration Plan

## 1. Title and purpose

This document is the **Phase 5A Investment Intelligence migration plan** for Teknoify.
It is documentation-only and defines the inventory, target boundaries, risks, and staged
migration order for the investment intelligence domain before any runtime files are moved.

Phase 5A must not move public pages, JavaScript, CSS, data, scripts, workflows, or API
contracts. Its purpose is to make the future migration reviewable by documenting what
currently exists, what should eventually move, and what must remain stable until dedicated
compatibility work is complete.

## 2. Why Investment Intelligence is a separate domain

Investment Intelligence is a major product domain rather than a single page feature. The
current investment surface includes analytics pages, sector detail pages, financial
indicator pages, calculators, charting and chatbot UI, company/source-document data,
stock-document extraction utilities, generated catalogs, local retrieval/search scripts,
and RAG documentation.

Those concerns should not remain scattered indefinitely across `pages/`, `js/`, `css/`,
`data/`, `docs/`, `scripts/`, `.github/workflows/`, and `api/`. A dedicated domain will
make ownership clearer by separating user-facing analytics, calculators, indicators,
sector/company concepts, RAG runtime implementation, source documents, generated data, and
worker scripts. The domain boundary also reduces the chance that future dataset or chatbot
changes accidentally break public routes, chart rendering, extraction workflows, or source
traceability.

## 3. Current inventory to inspect

Phase 5A inspected investment-related files in the following areas without editing runtime
or data files:

- `pages/` for investment analytics, sector detail, and financial indicator public routes.
- `js/` and `js/pages/` for investment page logic and possible page-specific modules.
- `css/` and `css/06-pages/` for investment analytics and financial indicator styling.
- `data/`, `data/investment/`, and `data/stock/` for UI datasets, stock manifests, source
  PDFs, extracted text, generated catalogs, and existing placeholder investment data docs.
- `docs/rag/` for RAG pipeline, extraction, retrieval, and document-index design notes.
- `docs/api-contracts/` for chatbot response and query-logging contracts.
- `scripts/` and `scripts/rag/` for stock-document catalog, extraction, retrieval, and
  script-area documentation.
- `.github/workflows/` for stock-document extraction automation.
- `api/` for investment chatbot logging support.

Discovered investment-related public pages include:

- `pages/investment-analytics.html`
- `pages/investment-retail.html`
- `pages/investment-airlines.html`
- `pages/financial-indicators.html`

Discovered investment-related runtime, data, documentation, workflow, and API files include:

- `js/investment-analytics.js`
- `css/investment-analytics.css`
- `css/financial-indicators.css`
- `css/06-pages/investment-analytics/*`
- `data/investment-analytics/supermarket_dataset.json`
- `data/investment/README.md`
- `data/stock/turkey/*`
- `scripts/build-stock-document-catalog.mjs`
- `scripts/extract-stock-document-text.py`
- `scripts/search-stock-document-text.mjs`
- `scripts/rag/README.md`
- `docs/rag/*`
- `docs/api-contracts/chatbot-api-contract.md`
- `docs/api-contracts/chatbot-query-logging-contract.md`
- `.github/workflows/extract-stock-document-text.yml`
- `api/chat-log.js`

## 4. Current investment file inventory table

| Current Path                                           | Type              | Current Role                                                                                                                      | Suggested Target Area                                                                                   | Migration Priority | Risk   | Notes                                                                                             |
| ------------------------------------------------------ | ----------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------ | ------ | ------------------------------------------------------------------------------------------------- |
| `pages/investment-analytics.html`                      | page              | Main public investment analytics route.                                                                                           | `domains/investment-intelligence/analytics/pages/`                                                      | High               | High   | Keep current public route until wrappers, aliases, or redirects are ready.                        |
| `pages/investment-retail.html`                         | page              | Retail sector detail page.                                                                                                        | `domains/investment-intelligence/sectors/retail/`                                                       | High               | High   | Public route must continue to work during any future sector migration.                            |
| `pages/investment-airlines.html`                       | page              | Airlines sector detail page.                                                                                                      | `domains/investment-intelligence/sectors/airlines/`                                                     | High               | High   | Public route must continue to work during any future sector migration.                            |
| `pages/financial-indicators.html`                      | page              | Financial indicators and bot-oriented public page.                                                                                | `domains/investment-intelligence/indicators/`                                                           | High               | High   | Treat as an investment route even though it is not named `investment-*`.                          |
| `js/investment-analytics.js`                           | script            | Investment analytics UI behavior, chart/calculator interactions, data loading, premium gating, and chatbot mock/logging behavior. | `domains/investment-intelligence/analytics/scripts/` and `domains/investment-intelligence/rag/chatbot/` | High               | High   | Refactor in-place first; avoid large behavior changes in the same PR as any path move.            |
| `js/pages/`                                            | unknown           | Existing page module area inspected; no investment-specific page module discovered.                                               | `domains/investment-intelligence/analytics/scripts/` if future modules are created                      | Low                | Low    | No Phase 5A move.                                                                                 |
| `css/investment-analytics.css`                         | style             | Linked stylesheet for the investment analytics and sector pages.                                                                  | `domains/investment-intelligence/analytics/styles/`                                                     | High               | High   | Preserve linked path until HTML route/wrapper strategy is ready.                                  |
| `css/financial-indicators.css`                         | style             | Linked stylesheet for the financial indicators page.                                                                              | `domains/investment-intelligence/indicators/`                                                           | Medium             | Medium | Preserve linked path until page references are migrated safely.                                   |
| `css/06-pages/investment-analytics/base.css`           | style             | Page-scoped base investment analytics styles.                                                                                     | `domains/investment-intelligence/analytics/styles/`                                                     | Medium             | Medium | Future split should keep import/link order stable.                                                |
| `css/06-pages/investment-analytics/hero.css`           | style             | Investment analytics hero styles.                                                                                                 | `domains/investment-intelligence/analytics/styles/`                                                     | Medium             | Medium | Move only after linked bundle strategy is documented.                                             |
| `css/06-pages/investment-analytics/orbit-visual.css`   | style             | Investment analytics orbit visual styles.                                                                                         | `domains/investment-intelligence/analytics/components/`                                                 | Medium             | Medium | Component-like style file.                                                                        |
| `css/06-pages/investment-analytics/sections.css`       | style             | Investment analytics content section styles.                                                                                      | `domains/investment-intelligence/analytics/styles/`                                                     | Medium             | Medium | Preserve page layout during future split.                                                         |
| `css/06-pages/investment-analytics/calculators.css`    | style             | Investment calculator tab/tool styles.                                                                                            | `domains/investment-intelligence/calculators/shared/`                                                   | Medium             | High   | Calculator regressions are easy to miss without manual smoke tests.                               |
| `css/06-pages/investment-analytics/charts.css`         | style             | Chart layout and visual styles.                                                                                                   | `domains/investment-intelligence/analytics/components/`                                                 | Medium             | High   | Chart rendering and responsiveness must be checked after changes.                                 |
| `css/06-pages/investment-analytics/chart-modal.css`    | style             | Chart modal styles.                                                                                                               | `domains/investment-intelligence/analytics/components/`                                                 | Medium             | Medium | Keep modal behavior and focus expectations intact.                                                |
| `css/06-pages/investment-analytics/chart-tooltip.css`  | style             | Chart tooltip styles.                                                                                                             | `domains/investment-intelligence/analytics/components/`                                                 | Medium             | Medium | Validate hover/touch behavior after future changes.                                               |
| `css/06-pages/investment-analytics/chatbot.css`        | style             | Investment chatbot UI styles.                                                                                                     | `domains/investment-intelligence/rag/chatbot/`                                                          | Medium             | Medium | Keep aligned with chatbot contract and mock behavior.                                             |
| `css/06-pages/investment-analytics/responsive.css`     | style             | Responsive investment analytics styles.                                                                                           | `domains/investment-intelligence/analytics/styles/`                                                     | Medium             | High   | Future split must preserve mobile behavior.                                                       |
| `data/investment-analytics/supermarket_dataset.json`   | data              | UI dataset for supermarket/retail investment analytics.                                                                           | `data/investment/turkey/sectors/retail/`                                                                | Medium             | Medium | Keep path stable until data loading paths are configurable.                                       |
| `data/investment/README.md`                            | data              | Existing placeholder or documentation for future investment data area.                                                            | `data/investment/`                                                                                      | Low                | Low    | Do not expand in Phase 5A beyond this plan.                                                       |
| `data/stock/turkey/README.md`                          | data              | Current stock-document data root documentation.                                                                                   | `data/investment/turkey/README.md`                                                                      | Medium             | Medium | Existing `data/stock/turkey` path must remain stable until scripts support alternatives.          |
| `data/stock/turkey/manifest.schema.json`               | data              | Schema for company stock-document manifests.                                                                                      | `data/investment/turkey/companies/`                                                                     | Medium             | High   | Schema changes affect catalog and extraction scripts.                                             |
| `data/stock/turkey/*/README.md`                        | data              | Company-level source-document folder notes for BIMAS, CRFSA, MGROS, SOKM, and similar company folders.                            | `data/investment/turkey/companies/`                                                                     | Medium             | Medium | Preserve company traceability.                                                                    |
| `data/stock/turkey/*/manifest.json`                    | data              | Company metadata and document manifests.                                                                                          | `data/investment/turkey/companies/`                                                                     | High               | High   | Source of truth for catalog/extraction; do not move before scripts and workflow are configurable. |
| `data/stock/turkey/*/reports/*.pdf`                    | source-document   | Source PDFs for stock/company reports.                                                                                            | `data/investment/turkey/companies/` or external object storage                                          | Medium             | High   | May require Git LFS or object storage as corpus grows.                                            |
| `data/stock/turkey/*/financial-statements/.gitkeep`    | source-document   | Placeholder folders for future financial statement source documents.                                                              | `data/investment/turkey/companies/`                                                                     | Low                | Low    | Preserve folder intent if moved later.                                                            |
| `data/stock/turkey/*/investor-presentations/.gitkeep`  | source-document   | Placeholder folders for future investor presentation source documents.                                                            | `data/investment/turkey/companies/`                                                                     | Low                | Low    | Preserve folder intent if moved later.                                                            |
| `data/stock/turkey/*/reports/.gitkeep`                 | source-document   | Placeholder report folders where no PDF exists yet.                                                                               | `data/investment/turkey/companies/`                                                                     | Low                | Low    | Preserve folder intent if moved later.                                                            |
| `data/stock/turkey/document-catalog.json`              | generated-data    | Generated source-document catalog from company manifests.                                                                         | `data/investment/turkey/generated/`                                                                     | Medium             | High   | Generated output; document source of truth before moving.                                         |
| `data/stock/turkey/text-extraction-catalog.json`       | generated-data    | Generated extraction status/catalog data.                                                                                         | `data/investment/turkey/generated/`                                                                     | Medium             | High   | Generated output; do not edit manually.                                                           |
| `data/stock/turkey/extracted-text/*.json`              | generated-data    | Extracted text chunks/metadata for stock documents.                                                                               | `data/investment/turkey/generated/` or `services/rag-workers/stock-documents/extraction/outputs/`       | Medium             | High   | Must retain source PDF and manifest references.                                                   |
| `scripts/build-stock-document-catalog.mjs`             | extraction-script | Builds the stock-document catalog from `data/stock/turkey` manifests.                                                             | `services/rag-workers/stock-documents/catalog/` or `scripts/rag/`                                       | High               | High   | Make paths configurable before moving data.                                                       |
| `scripts/extract-stock-document-text.py`               | extraction-script | Extracts text from source PDFs for stock documents.                                                                               | `services/rag-workers/stock-documents/extraction/` or `scripts/rag/`                                    | High               | High   | Workflow depends on current script path. Add compatibility wrapper if moved.                      |
| `scripts/search-stock-document-text.mjs`               | retrieval-script  | Local retrieval/search utility over extracted stock-document text.                                                                | `services/rag-workers/stock-documents/retrieval/` or `scripts/rag/`                                     | High               | Medium | Make extracted-text path configurable before data moves.                                          |
| `scripts/rag/README.md`                                | rag-doc           | Existing documentation placeholder for future RAG scripts.                                                                        | `scripts/rag/`                                                                                          | Low                | Low    | Phase 5B may add/update README-only structure if needed.                                          |
| `.github/workflows/extract-stock-document-text.yml`    | workflow          | Manual workflow for compiling and running PDF text extraction.                                                                    | `.github/workflows/` with script paths targeting `services/rag-workers/` later                          | High               | High   | Do not move scripts until workflow path changes are tested.                                       |
| `docs/rag/README.md`                                   | rag-doc           | Index for RAG documentation.                                                                                                      | `docs/rag/`                                                                                             | Low                | Low    | Keep docs here unless they describe runtime implementation details.                               |
| `docs/rag/rag-pipeline-design.md`                      | rag-doc           | RAG pipeline design documentation.                                                                                                | `docs/rag/`                                                                                             | Low                | Low    | Link from the migration plan; no Phase 5A contract change.                                        |
| `docs/rag/rag-local-retrieval.md`                      | rag-doc           | Local retrieval process documentation.                                                                                            | `docs/rag/`                                                                                             | Low                | Low    | Keep near non-runtime RAG docs.                                                                   |
| `docs/rag/rag-text-extraction.md`                      | rag-doc           | PDF text extraction documentation.                                                                                                | `docs/rag/`                                                                                             | Low                | Low    | Keep as documentation while scripts remain in `scripts/`.                                         |
| `docs/rag/rag-document-index-schema.md`                | rag-doc           | Document index schema documentation.                                                                                              | `docs/rag/`                                                                                             | Low                | Medium | Must stay aligned with generated catalog shape.                                                   |
| `docs/api-contracts/chatbot-api-contract.md`           | api-contract      | Chatbot API request/response contract.                                                                                            | `docs/api-contracts/`                                                                                   | Low                | Medium | Keep API contracts in docs; do not imply production AI behavior unless implemented.               |
| `docs/api-contracts/chatbot-query-logging-contract.md` | api-contract      | Chatbot query logging and privacy contract.                                                                                       | `docs/api-contracts/`                                                                                   | Low                | Medium | Keep aligned with `api/chat-log.js`.                                                              |
| `api/chat-log.js`                                      | backend-api       | No-op validation endpoint for investment analytics chatbot log events.                                                            | `domains/investment-intelligence/rag/chatbot/` or backend service area when defined                     | Medium             | Medium | Currently validates `page: investment-analytics`; do not move without deployment-path review.     |

## 5. Proposed future target structure

```text
domains/investment-intelligence/
  README.md
  analytics/
    README.md
    pages/
    scripts/
    styles/
    components/
  calculators/
    README.md
    compound-interest/
    cagr/
    retirement/
    shared/
  indicators/
    README.md
    valuation/
    profitability/
    growth/
    risk/
    liquidity/
  sectors/
    README.md
    retail/
    airlines/
    automotive/
    steel/
    energy/
  companies/
    README.md
    profiles/
    comparison/
  rag/
    README.md
    chatbot/
    prompts/
    retrieval/
    evaluations/

data/investment/
  README.md
  turkey/
    README.md
    companies/
    sectors/
    indicators/
    generated/

services/rag-workers/
  stock-documents/
    README.md
    extraction/
    catalog/
    retrieval/
    embeddings/
    evaluation/

scripts/rag/
  README.md
```

## 6. Migration principles

- Preserve public routes until a dedicated route migration exists.
- Do not move public HTML pages until a wrapper/redirect strategy is ready.
- Keep `data/stock/turkey` paths stable until scripts are made configurable.
- Do not break existing npm scripts.
- Do not break GitHub Actions workflows.
- Do not move generated files without clearly documenting source of truth.
- Do not mix source PDFs, extracted text, generated catalogs, and UI data without clear
  folder rules.
- Keep RAG docs in `docs/rag` unless they describe runtime implementation details.
- Keep API contracts in `docs/api-contracts`.
- Use source traceability for all investment data.

## 7. Data and RAG migration concerns

Current stock documents and manifests must remain traceable from source PDF to company
manifest, generated catalog, extracted text, retrieval result, and any chatbot response.
The migration should preserve explicit source/output boundaries:

- Source PDFs and company manifests are source-of-truth inputs.
- Document catalogs and extraction catalogs are generated outputs.
- Extracted text JSON files are generated outputs derived from specific source PDFs and
  manifest entries.
- UI datasets should not be mixed with source PDFs or generated RAG artifacts unless clear
  folder rules define their ownership.

Extraction scripts currently depend on existing paths such as `data/stock/turkey`, so path
configuration must be implemented before moving stock documents or generated outputs. Future
vector, embedding, retrieval evaluation, and RAG worker logic should live under
`services/rag-workers` or a dedicated backend service rather than being mixed into page UI
folders. Source PDFs may eventually need Git LFS or external object storage as the corpus
grows.

Investment answers must remain source-backed. Future chatbot or RAG behavior should not
invent financial data, document metadata, company facts, ratios, or investment conclusions
without a traceable source.

## 8. Public route preservation

The following public routes must continue working during every future Investment
Intelligence phase until an explicit route-wrapper or redirect migration is implemented and
verified:

- `/pages/investment-analytics.html`
- `/pages/investment-retail.html`
- `/pages/investment-airlines.html`
- `/pages/financial-indicators.html`

No other investment-related public pages were discovered during the Phase 5A inspection.
If future inventory finds additional investment routes, add them to this list before moving
or wrapping them.

## 9. Proposed staged migration order

- **Phase 5A:** Create this migration plan only.
- **Phase 5B:** Create README files under `domains/investment-intelligence` and
  `data/investment` without moving runtime files. Phase 5B README-only skeletons are now
  in place across the future domain, data, RAG worker, and RAG script folders; no runtime
  investment files were moved.
- **Phase 5C:** Add `docs/architecture/investment-frontend-split-plan.md` as the documentation-only investment frontend JavaScript/CSS split plan; no runtime frontend files are moved.
- **Phase 5D:** Extract investment analytics JS into internal sections without changing the
  public `js/investment-analytics.js` path.
- **Phase 5E:** Split investment analytics CSS into domain/component structure while
  preserving linked CSS paths.
- **Phase 5F:** Make stock-document script paths configurable before moving data.
- **Phase 5G:** Move RAG worker scripts into `services/rag-workers` or `scripts/rag` with
  compatibility wrappers.
- **Phase 5H:** Move `data/stock/turkey` to `data/investment/turkey` only after scripts and
  workflows support the new path.
- **Phase 5I:** Create route wrappers or route aliases for investment pages if needed.
- **Phase 5J:** Archive old duplicated investment files only after verification.

## 10. Risk matrix

| Risk                                                                | Impact                                                                                   | Likelihood | Mitigation                                                                                              |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------- |
| Broken public investment page routes                                | Users lose access to analytics, sector, or indicators pages.                             | Medium     | Preserve existing `pages/*.html` routes until route aliases/wrappers are implemented and smoke-tested.  |
| Broken CSS/JS relative paths                                        | Pages load without styling or interactive behavior.                                      | High       | Refactor in-place first; preserve linked CSS/JS files until HTML references are migrated deliberately.  |
| Broken document extraction scripts                                  | Source PDFs cannot be converted into extracted text outputs.                             | Medium     | Make paths configurable before moving data or scripts; keep compatibility wrappers.                     |
| Broken GitHub Actions workflow                                      | Manual extraction automation fails.                                                      | Medium     | Update workflow paths only after local dry-run and script compile checks pass.                          |
| Lost source traceability                                            | Generated outputs cannot be traced to source PDFs/manifests.                             | Medium     | Keep manifest ids, local paths, source URLs, generated metadata, and output provenance together.        |
| Generated data edited manually                                      | Catalog or extracted text drifts from source of truth.                                   | Medium     | Label generated files clearly and regenerate through scripts instead of manual edits.                   |
| Large `investment-analytics.js` refactor introducing UI regressions | Calculators, charts, premium gating, or chatbot behavior breaks.                         | High       | Split internal sections incrementally and run manual smoke tests after each behavior-preserving change. |
| RAG docs separated from implementation context                      | Future workers and contracts become hard to understand.                                  | Medium     | Keep conceptual docs in `docs/rag` and link runtime implementation READMEs back to them.                |
| Large PDFs bloating repo                                            | Repository size and clone times grow.                                                    | Medium     | Evaluate Git LFS or external object storage before adding a large corpus.                               |
| Chatbot contract misunderstood as production AI                     | Reviewers or users assume source-backed production answers before implementation exists. | Medium     | Keep API contracts explicit about mock/no-op behavior and source-backed requirements.                   |

## 11. Smoke test checklist

Future phases that touch Investment Intelligence runtime, data, scripts, or workflows should
run this manual checklist as applicable:

- Investment analytics page loads.
- Retail detail page loads.
- Airlines detail page loads.
- Financial indicators page loads.
- Calculator tabs/tools still work.
- Charts still render.
- Chatbot mock behavior still works if present.
- Premium gating still behaves the same.
- Data files still load.
- Extraction scripts still run.
- Local retrieval script still runs.
- GitHub workflow still compiles/runs dry-run if applicable.

## 12. Relationship to existing docs

This plan should be read with the existing architecture, RAG, and API contract documents:

- [Current inventory](current-inventory.md)
- [Target folder structure](folder-structure.md)
- [Auth/config centralization plan](auth-config-centralization-plan.md)
- [RAG pipeline design](../rag/rag-pipeline-design.md)
- [RAG local retrieval](../rag/rag-local-retrieval.md)
- [RAG text extraction](../rag/rag-text-extraction.md)
- [Chatbot API contract](../api-contracts/chatbot-api-contract.md)

## 13. Next PR recommendation

Phase 5B should create only README files under the future Investment Intelligence folders:

- `domains/investment-intelligence/`
- `domains/investment-intelligence/analytics/`
- `domains/investment-intelligence/calculators/`
- `domains/investment-intelligence/indicators/`
- `domains/investment-intelligence/sectors/`
- `domains/investment-intelligence/companies/`
- `domains/investment-intelligence/rag/`
- `data/investment/`
- `data/investment/turkey/`
- `services/rag-workers/stock-documents/`
- `scripts/rag/`

No runtime moves should happen in Phase 5B.

Phase 5C has now added the investment frontend JS/CSS split plan in
`docs/architecture/investment-frontend-split-plan.md`. This was documentation-only; no
runtime frontend pages, JavaScript files, CSS files, data files, scripts, workflows, or package
files were moved.
