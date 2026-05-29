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

## Future Fields

Planned response metadata may include `sources`, `usedCache`, `modelTier`, `answerId`, `confidence`, and `retrievalMode`.

Real AI responses, RAG/document retrieval, Firestore logging, web search, and automation logic are not implemented in this stage.
