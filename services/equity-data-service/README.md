# Equity data service

This directory contains two deliberately separate interfaces over one centralized
allowlist and Yahoo client:

* `fetch_stock_closes.py` is the backward-compatible terminal collector for the
  latest completed **daily** close.
* `app.main` is a read-only FastAPI application. A background task collects the
  latest completed 15-minute candles and HTTP handlers only read its in-memory
  snapshot; handlers never contact Yahoo.

Yahoo Finance access is through the unofficial `yfinance` client. The feed is
described as delayed with a nominal delay of 15 minutes, but the exact upstream
delay and availability can vary and are not guaranteed. Review Yahoo's terms and
applicable exchange licences before displaying or redistributing market data.

## Supported equities

| Public symbol | Provider symbol | Exchange | Currency |
| --- | --- | --- | --- |
| AAPL, TSLA, MSFT, NVDA | same | NASDAQ | USD |
| JPM, KO | same | NYSE | USD |
| THYAO, EREGL, ASELS, BIMAS | `.IS` suffix | BIST | TRY |

The fixed list is shared by the CLI and API. API clients cannot supply arbitrary
Yahoo symbols; BIST lookups accept either `THYAO` or `THYAO.IS` form.

## Install and test

```bash
cd services/equity-data-service
python -m venv .venv
. .venv/bin/activate
pip install -r requirements-dev.txt
pytest -q
```

Run the daily-close CLI (partial symbol failures do not make it fail):

```bash
python fetch_stock_closes.py
```

Run the API locally:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8081
```

## Cache behavior

FastAPI lifespan starts one refresh loop without waiting for collection during
startup. Blocking, sequential Yahoo work runs in a worker thread and an asyncio
lock prevents overlap. The API initially reports `warming_up`, and equity routes
return `503 {"error":"data_not_ready"}` until the first completed batch.

Each symbol first requests five days of 15-minute candles. The latest completed
candle and prior available market-local session close provide price and change.
If intraday data is unusable, the existing daily parser is used as an end-of-day
fallback (`dataKind: daily_close`, `freshness: eod`). If a later refresh fails,
the last usable quote is retained with `status: stale` and `stale: true`. A symbol
that has never succeeded instead has `status: error` and a null price. A single
failure does not invalidate the other symbols.

## API

* `GET /health` — process health and snapshot readiness/age.
* `GET /v1/equities` — full cached response; optional case-insensitive
  `market=US|BIST` and comma-separated `symbols=AAPL,THYAO.IS` filters.
* `GET /v1/equities/{symbol}` — one configured cached quote.

The collection response contains `generatedAt`, `lastSuccessfulRefreshAt`, source,
nominal freshness metadata, the configured refresh interval, and `items`. Items
contain identity/exchange/currency metadata, finite numeric price/change values
(or null), UTC `asOf`, data kind, freshness, status, stale state, and an optional
safe error category.

```bash
curl http://localhost:8081/health
curl http://localhost:8081/v1/equities
curl "http://localhost:8081/v1/equities?market=BIST"
curl http://localhost:8081/v1/equities/THYAO
```

## Environment

| Variable | Meaning |
| --- | --- |
| `EQUITY_REFRESH_SECONDS` | Refresh period; default 900, clamped to 300–3600. Invalid/non-finite values use 900. |
| `YF_REQUEST_DELAY_SECONDS` | Non-negative sequential request pacing; safe default 2 seconds. |
| `ALLOWED_ORIGINS` | Comma-separated origins allowed for GET/OPTIONS CORS; empty disables cross-origin access. |

CORS uses explicit configured origins, does not enable credentials or a wildcard,
and does not affect CLI execution. Starlette's CORS middleware adds the appropriate
origin response and `Vary: Origin` behavior for allowed browser requests.
