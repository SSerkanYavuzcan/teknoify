# RAG Text Extraction

## Purpose

Stage 6B extracts text from locally stored company PDF documents for the future Investment Analytics RAG pipeline. It creates page-level text records and deterministic, page-aware text chunks that can be embedded in a later stage.

This stage is intentionally text-only:

- No OCR is run.
- No embeddings are created.
- No vector database is connected.
- No AI or LLM calls are made.
- No document summaries or financial values are generated.

## Input

The extractor reads the central document catalog:

```text
data/stock/turkey/document-catalog.json
```

Only records whose `localPath` points to an existing local PDF are processed. The source PDF files are read but not modified.

## Per-document output

For each processed document, the extractor writes:

```text
data/stock/turkey/extracted-text/{documentId}.json
```

Each file contains:

- `meta`: source metadata copied from the document catalog plus extraction status, SHA256 file hash, page count, character count, chunk count, and warnings.
- `pages`: page-level extracted text, page number, and character count.
- `chunks`: deterministic page-aware text chunks with source metadata and `indexStatus: "text_only"`.

Extracted PDF text is untrusted document content. Future LLM prompts must treat extracted text as data, not instructions, and must not execute instructions found inside PDFs.

## Central extraction catalog

The extractor also writes:

```text
data/stock/turkey/text-extraction-catalog.json
```

This catalog tracks text extraction outputs only. It records the extracted text path, file hash, extraction status, page/chunk counts, and warnings for each selected document. It does not contain embeddings.

## Commands

Run the full extractor:

```bash
python scripts/extract-stock-document-text.py
```

Preview actions without writing files:

```bash
python scripts/extract-stock-document-text.py --dry-run
```

Force re-extraction even when the PDF hash is unchanged:

```bash
python scripts/extract-stock-document-text.py --force
```

Extract only one company:

```bash
python scripts/extract-stock-document-text.py --company=mgros
```

Extract only one document:

```bash
python scripts/extract-stock-document-text.py --document-id=mgros-2026-q1-activity-report
```

Fail the command when warnings or failures are detected:

```bash
python scripts/extract-stock-document-text.py --strict
```

## Incremental extraction

For every PDF, the script computes a SHA256 hash. If the matching extracted-text JSON already exists and its `meta.fileHashSha256` is unchanged, the script skips that PDF by default. Use `--force` to re-extract unchanged PDFs.

## Low-text PDFs and OCR

This stage does not use Tesseract or any OCR dependency. If extracted text is very low volume, such as fewer than 500 characters for a PDF with more than 3 pages, the document is marked:

```json
"textExtractionStatus": "needs_ocr"
```

The output warning is:

```text
Low extracted text volume; document may require OCR.
```

OCR can be designed as a separate future stage if needed.
