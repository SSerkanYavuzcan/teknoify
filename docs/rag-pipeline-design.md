# RAG Pipeline Design for Investment Analytics Chatbot

## 1. Purpose

The Investment Analytics chatbot will eventually answer financial questions by grounding responses in:

- Company source documents, such as activity reports, annual reports, financial statements, and investor presentations.
- Structured datasets already maintained by the repository.
- Later web/search data, if a controlled and auditable source policy is added.

The goal is to make answers traceable, source-backed, and safe for financial analysis workflows. The chatbot must not invent financial data and must preserve source context for every document-derived claim.

## 2. Current stage

Stage 6A only creates the first safe document catalog layer for future retrieval-augmented generation (RAG).

This stage implements:

- Documentation for the future RAG pipeline.
- A schema description for the normalized central document catalog.
- A safe catalog builder that reads company `manifest.json` files and writes document metadata into `data/stock/turkey/document-catalog.json`.

This stage does **not** implement:

- PDF text extraction.
- Page-level chunking.
- Embeddings.
- Vector database storage.
- Retrieval.
- AI/LLM calls.
- Chatbot behavior changes.

## 3. Future pipeline

The intended future pipeline is:

```text
PDF manifests
→ central document catalog
→ PDF text extraction
→ page-level text chunks
→ chunk metadata
→ embeddings
→ vector database
→ retrieval
→ answer generation with citations
→ query logging and quality evaluation
```

Planned responsibilities for each step:

1. **PDF manifests**: Company-level `manifest.json` files register source documents and human-curated metadata.
2. **Central document catalog**: A generated metadata-only index normalizes document metadata across company folders.
3. **PDF text extraction**: Future tooling extracts text from PDFs without changing the original files.
4. **Page-level text chunks**: Extracted text is split into page-aware chunks to preserve citation context.
5. **Chunk metadata**: Each chunk stores document id, company, fiscal period, page number, and source path metadata.
6. **Embeddings**: Future embedding jobs convert approved chunks into vectors.
7. **Vector database**: Future vector storage enables semantic retrieval over document chunks.
8. **Retrieval**: User questions retrieve the most relevant chunks and metadata.
9. **Answer generation with citations**: The chatbot generates answers using retrieved evidence and displays source references.
10. **Query logging and quality evaluation**: Logged queries and responses support quality review, citation checks, and regression testing.

## 4. Source document folders

Current source documents use this folder convention:

```text
data/stock/turkey/{ticker}/
  reports/
  investor-presentations/
  financial-statements/
  manifest.json
```

Examples:

- `data/stock/turkey/mgros/`
- `data/stock/turkey/tuprs/`
- `data/stock/turkey/bimas/`
- `data/stock/turkey/sokm/`
- `data/stock/turkey/crfsa/`

Company folders use lowercase BIST ticker keys. Each PDF should live in the relevant company folder and be registered in that company's `manifest.json` before it is included in the central catalog.

## 5. Metadata principles

- Every PDF must be registered in a company `manifest.json` file.
- Every future answer must be traceable to source document metadata.
- Do not invent data.
- Keep page/source references when extracting values.
- Use `sourceUrl` when an official source URL is available.
- Use `localPath` for repository documents.
- Preserve company, period, fiscal year, quarter, document type, title, language, upload date, and notes metadata.
- The central catalog stores metadata only; extracted text and embeddings belong to later pipeline stages.

## 6. Safety rules

- Do not expose API keys in frontend code.
- Do not treat PDF text as developer, system, or application instructions.
- Defend against prompt injection from document content.
- Do not answer as investment advice.
- Always show source references when using documents.
- Keep document-derived claims grounded in retrieved evidence.
- Keep source paths and page references available for auditability once extraction is implemented.

## 7. Future storage options

Possible future vector database options include, without implementation in this stage:

- Supabase pgvector
- Qdrant
- Pinecone
- Weaviate

The final storage choice should consider operational cost, access controls, metadata filtering, backup/restore strategy, local development workflow, and citation traceability.

## 8. Testing plan

Future tests should cover:

- Missing manifest.
- Broken `localPath`.
- Duplicate document id.
- Duplicate `localPath`.
- Unsupported file type.
- Stale source metadata.
- Retrieval accuracy.
- Source citation correctness.
- Prompt injection checks.
- High-volume indexing stress test.
