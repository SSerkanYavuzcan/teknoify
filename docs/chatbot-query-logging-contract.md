# Chatbot Query Logging Contract (Stage 5)

## Purpose

The Investment Analytics chatbot logging contract is designed to support future quality and cost optimization without storing raw user conversations in Stage 5. The intended analytics use cases are:

- Improve chatbot response quality by understanding which metadata categories appear most often.
- Identify frequent questions and missing answer patterns.
- Route repeated questions to cheaper or faster answer strategies in a later stage.
- Measure response quality signals, response status, cache usage, source count, and latency.

## Stage 5 Status

`POST /api/chat-log` is a **no-op validation endpoint** in Stage 5.

The endpoint currently:

- Accepts and validates metadata-only chat log events.
- Enforces a small payload limit.
- Rejects invalid event types and malformed payloads.
- Returns a success response for valid events.

The endpoint does **not**:

- Store logs in a database.
- Write logs to files.
- Call Firestore, Supabase, or another external service.
- Call OpenAI, another LLM, RAG, web search, or automation service.
- Log full user messages in server logs.

## Privacy and KVKK-First Rules

Stage 5 uses a metadata-only logging mode:

- No full message storage in Stage 5.
- No personal data should be sent to the logging endpoint.
- The frontend sends only a short `textPreview`, `textLength`, and basic local metadata.
- `textPreview` is capped at 160 characters on the frontend and truncated again by the endpoint.
- The in-memory chatbot session id is used only for the current browser session and is not written to `localStorage` or cookies.
- No cookies are used for query logging.
- No `localStorage` writes are used for query logging.
- No API keys, auth tokens, emails, or names are included in log events.
- Logging is best-effort: logging failures must never block or break the chatbot user experience.

## Endpoint

`POST /api/chat-log`

## Success Response

```json
{
    "ok": true,
    "status": "accepted_noop",
    "message": "Chat log event validated but not stored in Stage 5."
}
```

## Error Response

```json
{
    "ok": false,
    "error": "eventType is required and must be an allowed chat log event type."
}
```

## Event Types

Allowed `eventType` values:

- `chat_message_sent`
- `chat_response_received`
- `chat_feedback_submitted`
- `chat_error`

## Payload Shape

```json
{
    "eventType": "chat_message_sent",
    "sessionId": "chat_session_1710000000000_abcd1234",
    "messageId": "msg_1710000000000_1",
    "answerId": "answer_1710000000000_1",
    "page": "investment-analytics",
    "timestamp": "2026-05-29T12:00:00.000Z",
    "query": {
        "textPreview": "Migros mağaza sayısı 2026 1Ç",
        "textLength": 31,
        "normalizedIntent": "store_count",
        "detectedCompany": "mgros",
        "detectedPeriod": "2026 1Ç"
    },
    "response": {
        "status": "mock",
        "modelTier": "mock",
        "usedCache": false,
        "sourceCount": 0,
        "latencyMs": 734
    },
    "privacy": {
        "containsPersonalData": false,
        "loggingMode": "metadata_only"
    }
}
```

## Query Metadata

The frontend derives lightweight metadata locally without AI, backend inference, external libraries, or retrieval:

- `detectedCompany`
    - `mgros` or `migros` -> `mgros`
    - `bim` or `bimas` -> `bimas`
    - `şok`, `sok`, or `sokm` -> `sokm`
    - `carrefour`, `carrefoursa`, or `crfsa` -> `crfsa`
    - `tüpraş`, `tupras`, or `tuprs` -> `tuprs`
- `detectedPeriod`
    - Simple quarter phrases such as `2026 1Ç`, `2026 1Çeyrek`, or `2026 q1`.
    - `null` when no simple period is found.
- `normalizedIntent`
    - `store_count` for store count / mağaza sayısı questions.
    - `profit_per_store` for mağaza başı kâr / operasyonel kâr questions.
    - `revenue_per_store` for mağaza başı ciro / hasılat questions.
    - `report_summary` for rapor / faaliyet raporu / öne çıkanlar questions.
    - `unknown` otherwise.

## Example: Message Sent

```json
{
    "eventType": "chat_message_sent",
    "sessionId": "chat_session_1710000000000_abcd1234",
    "messageId": "msg_1710000000000_1",
    "page": "investment-analytics",
    "timestamp": "2026-05-29T12:00:00.000Z",
    "query": {
        "textPreview": "BIM 2026 q1 mağaza sayısı nedir?",
        "textLength": 34,
        "normalizedIntent": "store_count",
        "detectedCompany": "bimas",
        "detectedPeriod": "2026 1Ç"
    },
    "response": {
        "status": "mock",
        "modelTier": "mock",
        "usedCache": false,
        "sourceCount": 0,
        "latencyMs": 0
    },
    "privacy": {
        "containsPersonalData": false,
        "loggingMode": "metadata_only"
    }
}
```

## Example: Response Received

```json
{
    "eventType": "chat_response_received",
    "sessionId": "chat_session_1710000000000_abcd1234",
    "messageId": "msg_1710000000000_1",
    "page": "investment-analytics",
    "timestamp": "2026-05-29T12:00:01.000Z",
    "query": {
        "textPreview": "BIM 2026 q1 mağaza sayısı nedir?",
        "textLength": 34,
        "normalizedIntent": "store_count",
        "detectedCompany": "bimas",
        "detectedPeriod": "2026 1Ç"
    },
    "response": {
        "status": "mock",
        "modelTier": "mock",
        "usedCache": false,
        "sourceCount": 0,
        "latencyMs": 742
    },
    "privacy": {
        "containsPersonalData": false,
        "loggingMode": "metadata_only"
    }
}
```

## Example: Error

```json
{
    "eventType": "chat_error",
    "sessionId": "chat_session_1710000000000_abcd1234",
    "messageId": "msg_1710000000000_1",
    "page": "investment-analytics",
    "timestamp": "2026-05-29T12:00:01.000Z",
    "query": {
        "textPreview": "Tüpraş operasyonel kâr 2026 1Ç",
        "textLength": 33,
        "normalizedIntent": "profit_per_store",
        "detectedCompany": "tuprs",
        "detectedPeriod": "2026 1Ç"
    },
    "response": {
        "status": "error",
        "modelTier": "local-mock",
        "usedCache": false,
        "sourceCount": 0,
        "latencyMs": 1200
    },
    "privacy": {
        "containsPersonalData": false,
        "loggingMode": "metadata_only"
    }
}
```

## Future Storage Plan

A future stage may add Firestore or Supabase storage after this contract is reviewed. Future storage should:

- Store metadata by default, not raw personal text.
- Keep optional user feedback separate from query metadata.
- Keep retention, access control, deletion, and audit rules explicit.
- Continue avoiding API keys or database secrets in frontend code.
- Add database writes only after privacy and product requirements are finalized.
