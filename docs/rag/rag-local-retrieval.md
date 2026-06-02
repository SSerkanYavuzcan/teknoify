# Local Stock Document Retrieval Tests

## Purpose

Stage 6C adds a local keyword retrieval test layer for extracted stock document chunks. It searches the JSON chunks in `data/stock/turkey/extracted-text/` so we can validate whether the Stage 6B PDF extraction and chunking output is searchable before building the full RAG stack.

This is a quality-testing tool only. It does **not** create embeddings, does **not** connect to a vector database, does **not** call an AI/LLM, and does **not** change chatbot behavior.

## Why this exists before embeddings

Local keyword retrieval gives us a deterministic baseline for extracted text quality. If an important phrase exists in a PDF and appears correctly in the extracted JSON, the command-line search should return a relevant chunk with source metadata and a snippet.

If local retrieval does not find an expected term, review whether:

- The term exists in the source PDF.
- The term appears in the extracted JSON text.
- Turkish normalization or query wording needs improvement.
- The relevant chunk was filtered out by company, ticker, period, or document type.

If the term does not exist in the source PDF, a missing result is not a retrieval failure.

## Command

Use the local Node.js script:

```bash
node scripts/search-stock-document-text.mjs --query="Migros hasılat"
```

Or via npm:

```bash
npm run search:stock-doc-text -- --query="Migros hasılat"
```

Supported options:

- `--query="..."` is required and must be non-empty.
- `--company=mgros` filters by `companyKey`.
- `--ticker=MGROS` filters by ticker.
- `--period="2026 1Ç"` filters by period.
- `--document-type=activity_report` filters by document type.
- `--top=5` controls result count.
- `--json` prints machine-readable JSON only.
- `--show-text` includes full chunk text in output.
- `--strict` requires all query tokens to match.

## Example commands

```bash
node scripts/search-stock-document-text.mjs --query="Migros hasılat"
node scripts/search-stock-document-text.mjs --query="mağaza sayısı" --company=mgros
node scripts/search-stock-document-text.mjs --query="net dönem karı" --company=tuprs --top=5
node scripts/search-stock-document-text.mjs --query="satış gelirleri" --json
node scripts/search-stock-document-text.mjs --query="mağaza başı kâr" --period="2026 1Ç"
```

## Recommended quality test queries

Run these queries after text extraction changes to check whether obvious source chunks are returned:

- Migros hasılat
- Migros mağaza sayısı
- Migros net dönem karı
- Migros 31 Mart 2026
- Tüpraş satış gelirleri
- Tüpraş net dönem karı
- Tüpraş rafineri
- Tüpraş kapasite
- faaliyet raporu riskler
- mağaza başı kâr

## Interpreting results

The default output is human-readable and includes result rank, score, ticker, period, document type, page range, document id, chunk id, matched normalized terms, phrase-match status, and a snippet.

JSON mode returns the same source metadata for automated checks:

```bash
node scripts/search-stock-document-text.mjs --query="Migros hasılat" --json --top=2
```

Use `--show-text` only when you need to inspect the full chunk text. The default snippet is intentionally short so large extraction output is not copied into terminal logs.
