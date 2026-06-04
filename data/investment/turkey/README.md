# Turkish Investment Data

## Purpose

Future Turkish investment data area for country-specific company, sector, indicator, source document, and generated investment datasets.

## Future ownership

This folder is the intended future owner for Turkish investment/company/sector/indicator datasets after migration compatibility is proven. Future subareas may include:

- `companies/`
- `sectors/`
- `indicators/`
- `source-documents/`
- `generated/`

These areas should preserve source traceability from original documents through generated outputs and product-facing datasets.

## Phase 8A audit note

Phase 8A documented current Investment Data + RAG assets and ownership boundaries. No `data/stock/turkey` migration happened in Phase 8A unless it had already been completed before this folder existed.

Migration into this folder requires producer/consumer verification first, including scripts, workflows, API contracts, RAG docs, generated catalogs, extracted text outputs, and frontend/static data paths.

## What does not belong here yet

Current Turkish stock data remains under `data/stock/turkey` until a dedicated migration PR. Do not move source PDFs, manifests, extracted text, generated catalogs, or scripts into this folder yet.

## Current migration status

Migration status: Phase 8A audit and README ownership update only; no runtime investment files or Turkish stock data payloads have been moved here yet.
