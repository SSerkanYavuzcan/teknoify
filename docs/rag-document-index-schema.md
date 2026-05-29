# RAG Document Index Schema

## Target file

The normalized central document catalog is generated at:

```text
data/stock/turkey/document-catalog.json
```

This catalog is generated from first-level company manifests under `data/stock/turkey/{ticker}/manifest.json`.

## Purpose

The central catalog stores repository-wide document metadata for future RAG stages. It does not store extracted PDF text, chunks, embeddings, vector database records, or AI-generated content.

## Top-level shape

```json
{
  "meta": {
    "generatedAt": "ISO_TIMESTAMP",
    "sourceRoot": "data/stock/turkey",
    "documentCount": 0,
    "companyCount": 0,
    "notes": [
      "Generated from company manifest.json files.",
      "This catalog stores document metadata only. It does not contain extracted PDF text or embeddings."
    ]
  },
  "documents": []
}
```

### `meta.generatedAt`

ISO timestamp for when the catalog was generated.

### `meta.sourceRoot`

Repository-root relative source folder scanned by the builder.

### `meta.documentCount`

Number of document metadata entries included in `documents`.

### `meta.companyCount`

Number of company manifests discovered while generating the catalog.

### `meta.notes`

Human-readable safety notes explaining that this is generated metadata only.

## Document item shape

Each item in `documents` should follow this shape:

```json
{
  "documentId": "mgros-2026-q1-activity-report",
  "companyKey": "mgros",
  "companyName": "Migros Ticaret A.Ş.",
  "ticker": "MGROS",
  "market": "BIST",
  "country": "TR",
  "period": "2026 1Ç",
  "fiscalYear": 2026,
  "quarter": 1,
  "documentType": "activity_report",
  "title": "2026 1. Çeyrek Faaliyet Raporu",
  "localPath": "data/stock/turkey/mgros/reports/mgros-2026-q1-activity-report.pdf",
  "sourceUrl": null,
  "language": "tr",
  "uploadedAt": null,
  "notes": "",
  "indexStatus": "metadata_only",
  "textExtractionStatus": "not_started",
  "embeddingStatus": "not_started"
}
```

## Field notes

- `documentId`: Normalized central id copied from the manifest document `id`.
- `companyKey`: Lowercase company key from the company manifest.
- `companyName`: Legal or display name from the company manifest.
- `ticker`: Exchange ticker from the company manifest.
- `market`: Market identifier, such as `BIST`.
- `country`: Country code, such as `TR`.
- `period`: Human-readable period label from the manifest document.
- `fiscalYear`: Fiscal year from the manifest document.
- `quarter`: Fiscal quarter from the manifest document, when applicable.
- `documentType`: Document type from the manifest document, such as `activity_report`.
- `title`: Human-readable source document title.
- `localPath`: Repository-root relative path to the local PDF file.
- `sourceUrl`: Official source URL when available; otherwise `null`.
- `language`: Document language code, such as `tr`.
- `uploadedAt`: Upload or repository registration timestamp when available; otherwise `null`.
- `notes`: Optional notes preserved from the manifest document.
- `indexStatus`: Current central catalog status. Stage 6A uses `metadata_only`.
- `textExtractionStatus`: Future extraction status. Stage 6A uses `not_started`.
- `embeddingStatus`: Future embedding status. Stage 6A uses `not_started`.

## Catalog rules

- `localPath` in the central catalog must be repository-root relative.
- Preserve document metadata from the source company manifest.
- Add `indexStatus`, `textExtractionStatus`, and `embeddingStatus` for future pipeline stages.
- Include only documents registered in company manifests.
- Include only documents whose local PDF path exists.
- Do not include extracted PDF text.
- Do not include embeddings.
- Do not invent documents or financial data.
