# Investment Data

## Purpose

Future data root for investment datasets, source document metadata, generated catalogs, and structured indicator/company/sector datasets.

## What belongs here

Investment data that has clear ownership, source traceability, and path-safe consumers. Future contents may include source document metadata, generated catalogs, structured indicator datasets, company datasets, sector datasets, and migration documentation for data lineage.

## Phase 8A audit note

Phase 8A completed the Investment Data + RAG migration audit and added a validation script for mapping current data/RAG assets before physical moves. No data files were moved, copied, or reformatted in Phase 8A.

The source/generated distinction must be preserved during future phases:

- Source documents and source metadata must stay traceable to their original company, period, document type, and path.
- Generated catalogs, extracted text, future indexes, and future embeddings must remain separate from source documents.
- Public/static data paths must not change until producers, consumers, and compatibility wrappers are verified.

## What does not belong here yet

Current source data remains under `data/stock/` until scripts/workflows are configurable. Do not move `data/stock/turkey` yet. Do not move generated data, source PDFs, manifests, or extracted text without preserving source traceability and updating every consumer path safely.

## Current migration status

Migration status: Phase 8A audit and README ownership update only; no runtime investment files or data payloads have been moved here yet.
