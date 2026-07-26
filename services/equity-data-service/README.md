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

## Supported instruments

| Public symbol | Provider symbol | Exchange | Currency |
| --- | --- | --- | --- |
| AAPL, TSLA, MSFT, NVDA | same | NASDAQ | USD |
| JPM, KO | same | NYSE | USD |
| THYAO, EREGL, ASELS, BIMAS | `.IS` suffix | BIST | TRY |

Indices:

* `XU100` / `XU100.IS` — BIST 100
* `SP500` / `^GSPC` — S&P 500

Index values are points, not monetary prices. They use the same delayed
15-minute collection and daily fallback as equities; this unofficial upstream
data must not be described as guaranteed live.

The fixed list is shared by the CLI and API. API clients cannot supply arbitrary
Yahoo symbols; lookups accept either the public symbol or configured provider
symbol, including `XU100.IS` and `^GSPC` for the indices.

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
* `GET /v1/equities/{symbol}/history` — compact Yahoo close history for the
  `XU100`/`XU100.IS` and `SP500`/`^GSPC` aliases. Supports `range=1d|5d|1m`
  and `interval=15m|1d`; 15-minute history is limited to the 1- and 5-day ranges.

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
curl "http://localhost:8081/v1/equities/XU100/history?range=5d&interval=15m"
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

## Render deployment

### A. Blueprint deployment

1. Merge the deployment pull request into `main`.
2. Sign in to Render.
3. Create a new Blueprint.
4. Select the `SSerkanYavuzcan/teknoify` repository.
5. Select the root `render.yaml` Blueprint file.
6. Review the detected service:
   * Name: `teknoify-equity-data`
   * Runtime: Docker
   * Region: Frankfurt
   * Health path: `/health`
7. Create the service.
8. Wait for the first successful deployment before running production checks.

### B. Environment values

The Blueprint configures these production values:

```text
ALLOWED_ORIGINS=https://teknoify.com,https://www.teknoify.com
EQUITY_REFRESH_SECONDS=900
YF_REQUEST_DELAY_SECONDS=2.0
```

These operational settings are not secrets. Render supplies `PORT`; no provider
credentials or API keys are required by this service.

### C. Production checks

Replace the placeholder only in the commands below with the service URL assigned
by Render:

```bash
curl https://YOUR-RENDER-URL/health
curl https://YOUR-RENDER-URL/v1/equities
curl "https://YOUR-RENDER-URL/v1/equities?market=BIST"
curl "https://YOUR-RENDER-URL/v1/equities?market=US"
```

The standard-library smoke test accepts the deployed base URL, waits up to five
minutes for the initial snapshot, and validates the response contract:

```bash
cd services/equity-data-service
python deployment_smoke_test.py https://YOUR-RENDER-URL
```

### D. Browser CORS check

From the browser console while visiting `https://teknoify.com`, run:

```javascript
fetch("https://YOUR-RENDER-URL/v1/equities")
  .then(response => response.json())
  .then(console.log);
```

Production CORS remains restricted to the configured allowlist; do not disable
CORS to troubleshoot a mismatched origin.

### E. Frontend connection step

The Investment frontend is intentionally disconnected until the real deployed
URL is known. This deployment-preparation change leaves the following tag in
`dashboard/services/investment/index.html` unchanged:

```html
<meta name="teknoify-equity-api-base" content="" />
```

After deployment, a separate small pull request must replace it with the actual
Render URL:

```html
<meta
  name="teknoify-equity-api-base"
  content="https://YOUR-REAL-RENDER-URL"
/>
```

### F. Operational notes

* The service uses a single in-memory cache, an application-lifespan background
  refresh loop, and an in-process refresh lock. It must initially run as one
  Uvicorn process with one worker. Multiple workers would create independent
  caches and independent Yahoo refresh loops.
* A restart causes a short warm-up state. During warm-up, `/v1/equities` may
  return HTTP 503; the Investment frontend already handles this state.
* A later multi-instance deployment requires shared cache storage or leader
  election before it can safely coordinate refresh work.
* Yahoo requests remain sequential and paced by `YF_REQUEST_DELAY_SECONDS`.
* This feed must not be described as live. Yahoo Finance access uses the
  unofficial `yfinance` client, and upstream delay and availability can vary.
* Applicable market-data usage and redistribution conditions must be reviewed
  before broader commercial use.

### G. Local Docker usage

Build the production image from the service-specific context:

```bash
docker build \
  -t teknoify-equity-data \
  services/equity-data-service
```

Run it on the default container port:

```bash
docker run --rm \
  -p 8081:8081 \
  -e ALLOWED_ORIGINS=http://localhost:5500 \
  -e EQUITY_REFRESH_SECONDS=900 \
  -e YF_REQUEST_DELAY_SECONDS=2.0 \
  teknoify-equity-data
```

Test the local endpoints (the equity endpoint may briefly return 503 while the
first snapshot warms up):

```bash
curl http://localhost:8081/health
curl http://localhost:8081/v1/equities
```
