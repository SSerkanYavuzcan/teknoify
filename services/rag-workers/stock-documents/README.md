# Stock Document RAG Worker

## Purpose

Future home for backend or worker-style responsibilities for stock document processing.

## Future ownership

This folder should eventually own extraction, indexing, retrieval preparation, and evaluation worker logic for stock documents. Candidate future subareas include:

- `extract/`
- `index/`
- `retrieve/`
- `evaluate/`

Current candidates include:

- `scripts/extract-stock-document-text.py`
- `scripts/build-stock-document-catalog.mjs`
- `scripts/search-stock-document-text.mjs`
- `.github/workflows/extract-stock-document-text.yml`

## Phase 8A audit note

Phase 8A audited worker candidates and documented future ownership only. Current scripts/workers were not moved, package scripts were not changed, workflows were not changed, and no runtime behavior changed.

## What does not belong here yet

Do not move existing scripts, workflows, generated catalogs, extracted text, source PDFs, or runtime chatbot code until worker entry points and compatibility paths are defined.

## Current migration status

Migration status: Phase 8A audit and README ownership update only; no runtime investment files, worker scripts, workflows, or generated outputs have been moved here yet.
