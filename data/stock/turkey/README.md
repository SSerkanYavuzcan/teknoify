# Turkish Listed Company Documents

This folder stores source documents for Turkish listed companies.

These documents will later be used for investment analytics and chatbot/RAG features based on official company materials such as annual reports, activity reports, investor presentations, and financial statements.

## Data integrity rules

- Do not invent data from documents.
- Do not add fake financial data.
- Store only source documents and metadata that describe those documents.
- Each added PDF should be registered in that company's `manifest.json`.

## Folder conventions

Each company folder may contain:

- `reports/`: annual reports, activity reports, and quarterly activity reports
- `investor-presentations/`: investor presentations and earnings presentations
- `financial-statements/`: financial statement PDFs or official filings

Keep filenames lowercase, kebab-case, and descriptive.

Suggested filename format:

```text
company-year-quarter-document-type.pdf
```

Example:

```text
migros-2026-q1-activity-report.pdf
```

If PDF files become large, consider Git LFS before committing many files.
