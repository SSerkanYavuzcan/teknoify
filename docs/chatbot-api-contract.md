# Chatbot API Contract

## Endpoint

`POST /api/chat`

Current status: **mock only**. This contract does not call a real AI model, RAG pipeline, external search service, database, or logging service.

## Request JSON

```json
{
    "message": "Migros için mağaza başı kâr nasıl hesaplanacak?",
    "sessionId": "chat_session_1710000000000_abcd1234",
    "page": "investment-analytics",
    "context": {
        "source": "investment-chatbot",
        "stage": "mock"
    }
}
```

## Response JSON

```json
{
    "answer": "Migros için gelecek yanıtlar Migros faaliyet raporları, yatırımcı sunumları ve yapılandırılmış veri setleri üzerinden kaynaklı hazırlanacak.",
    "sources": [],
    "usedCache": false,
    "modelTier": "mock",
    "status": "mock",
    "disclaimer": "Bu yanıt yatırım tavsiyesi değildir; kaynaklı finansal asistan altyapısı geliştirme aşamasındadır."
}
```

## Response Fields

- `answer`: Assistant answer text.
- `sources`: Source list for future retrieval-backed answers. Real document retrieval is **not implemented yet**, so mock responses currently return an empty array.
- `sources[].title`: Source title.
- `sources[].url`: Optional source URL.
- `sources[].page`: Optional page reference, for example `"10, 11"`.
- `sources[].documentType`: Optional document type.
- `sources[].period`: Optional reporting period, for example `"2026 1Ç"`.
- `usedCache`: Boolean cache indicator.
- `modelTier`: Current response tier, currently `"mock"`.
- `status`: Current response status, currently `"mock"`.
- `disclaimer`: Non-advice disclaimer text shown by the frontend when present.

Real AI responses, RAG/document retrieval, Firestore logging, web search, and automation logic are not implemented in this stage.
