````md
# Turkish Stock Source Documents

This folder stores source documents for Turkish listed companies.

These documents will later be used for investment analytics and chatbot/RAG features based on official company materials such as annual reports, activity reports, investor presentations, and financial statements.

## Data integrity rules

- Do not invent data from documents.
- Do not add fake financial data.
- Store only source documents and metadata that describe those documents.
- Each added PDF should be registered in the relevant company `manifest.json` file.
- If a value is extracted from a document, keep the source document, source page, and document metadata traceable.

## Folder conventions

Company folders use lowercase BIST ticker codes. Examples:

```text
bimas
crfsa
mgros
sokm
tuprs
````

Each company folder may contain:

```text
reports/
investor-presentations/
financial-statements/
manifest.json
```

Folder meanings:

* `reports/`: annual reports, activity reports, and quarterly activity reports
* `investor-presentations/`: investor presentations and earnings presentations
* `financial-statements/`: financial statement PDFs or official filings

## File naming convention

Keep filenames lowercase, kebab-case, and descriptive.

Suggested filename format:

```text
ticker-year-quarter-document-type.pdf
```

Examples:

```text
mgros-2026-q1-activity-report.pdf
tuprs-2026-q1-activity-report.pdf
bimas-2026-q1-activity-report.pdf
crfsa-2026-q1-activity-report.pdf
sokm-2026-q1-activity-report.pdf
```

## Manifest rule

Every PDF should be registered in that company's `manifest.json`.

A future document item should follow this general shape:

```json
{
  "id": "mgros-2026-q1-activity-report",
  "period": "2026 1Ç",
  "fiscalYear": 2026,
  "quarter": 1,
  "documentType": "activity_report",
  "title": "2026 1. Çeyrek Faaliyet Raporu",
  "localPath": "reports/mgros-2026-q1-activity-report.pdf",
  "sourceUrl": null,
  "language": "tr",
  "uploadedAt": null,
  "notes": ""
}
```

## Large file note

If PDF files become large or the repository starts storing many documents, consider Git LFS before committing many files.

```
```
