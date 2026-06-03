# Stock Document RAG Worker

## Purpose

Future home for backend or worker-style responsibilities for stock document processing.

## What belongs here

This folder will eventually contain worker responsibilities for:

- Extraction
- Catalog building
- Retrieval preparation
- Embeddings
- Evaluation

Current candidates include:

- `scripts/extract-stock-document-text.py`
- `scripts/build-stock-document-catalog.mjs`
- `scripts/search-stock-document-text.mjs`
- `.github/workflows/extract-stock-document-text.yml`

## What does not belong here yet

Do not move existing scripts, workflows, generated catalogs, extracted text, source PDFs, or runtime chatbot code until worker entry points and compatibility paths are defined.

## Current migration status

Migration status: Phase 5B README-only skeleton; no runtime investment files have been moved here yet.
