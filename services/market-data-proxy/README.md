# Teknoify Market Data Proxy

Standalone Node.js 20 Cloud Run service for the investment dashboard. It normalizes Binance public crypto data and Twelve Data US/Borsa İstanbul data, verifies Firebase ID tokens, applies origin-restricted CORS, and caches upstream responses in memory.

## 1. Prerequisites
- Google Cloud project with billing enabled.
- Firebase project linked to the web app.
- Cloud Run service account.
- Twelve Data account and verified symbols for BIST 100 and S&P 500 before enabling them.

## 2. Required Google Cloud APIs
```bash
gcloud services enable run.googleapis.com secretmanager.googleapis.com sheets.googleapis.com cloudbuild.googleapis.com
```

## 3. Creating the Twelve Data secret
```bash
printf 'REPLACE_WITH_TWELVE_DATA_KEY' | gcloud secrets create twelve-data-api-key --data-file=-
```
Expose it to Cloud Run as `TWELVE_DATA_API_KEY`. Never commit keys, `.env` files, service-account JSON, or spreadsheet credentials.

## 4. Granting Secret Manager access
```bash
gcloud secrets add-iam-policy-binding twelve-data-api-key \
  --member="serviceAccount:CLOUD_RUN_SERVICE_ACCOUNT@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## 5. Creating the Google Sheet
Create a spreadsheet and share it with the Cloud Run service account using Viewer access.

## 6. Market Symbols schema
Sheet: `Market Symbols`

Columns: A `id`, B `label`, C `subtitle`, D `provider`, E `provider_symbol`, F `exchange`, G `mic_code`, H `currency`, I `freshness`, J `enabled`, K `sort_order`.

Supported provider values: `binance`, `twelve_data`, `manual`. Supported freshness values: `live`, `delayed`, `eod`, `manual`.

Conceptual rows:
```text
BTCUSD | BTC/USD | Bitcoin | binance | BTCUSDT | | | USD | live | TRUE | 30
SP500 | S&P 500 | ABD Büyük Şirketler Endeksi | twelve_data | [VERIFIED TWELVE DATA SYMBOL] | [VERIFIED EXCHANGE] | [VERIFIED MIC] | USD | delayed | TRUE | 20
BIST100 | BIST 100 | Borsa İstanbul | twelve_data | [VERIFIED TWELVE DATA SYMBOL] | BIST | XIST | TRY | eod | TRUE | 10
```
Do not guess BIST 100 or S&P 500 provider symbols. Verify exact symbols first using Twelve Data symbol search/reference data. If `provider_symbol` is empty, the API returns `Yakında`.

## 7. Manual data schema
Sheet: `Market Manual Data`

Columns: A `asset_id`, B `timestamp`, C `price`.

Example:
```text
BIST100 | 2026-07-17T18:10:00+03:00 | 10842.31
```
The service parses valid asset IDs, valid timestamps, and finite positive prices; sorts chronologically; uses the latest 60 valid rows; and labels manual values `Manuel`. Manual fallback order is provider data, valid manual Sheet history, then `Yakında`.

## 8. Configuring ranges
Environment variables:
- `MARKET_SYMBOLS_SHEET_ID`
- `MARKET_SYMBOLS_RANGE` default: `Market Symbols!A2:K`
- `MARKET_MANUAL_DATA_RANGE` default: `Market Manual Data!A2:C`
- `ALLOWED_ORIGINS` comma-separated origins, for example `https://teknoify.com,https://www.teknoify.com,http://localhost:5500,http://127.0.0.1:5500`

## 9. Installing dependencies
```bash
npm install
```

## 10. Local run
```bash
ALLOWED_ORIGINS="http://localhost:5500" PORT=8080 npm start
```
`/v1/market/overview` requires `Authorization: Bearer FIREBASE_ID_TOKEN`.

## 11. Cloud Run deployment
Recommended service name: `teknoify-market-data`. Recommended region: `europe-west1`.
```bash
gcloud run deploy teknoify-market-data \
  --source . \
  --region europe-west1 \
  --service-account CLOUD_RUN_SERVICE_ACCOUNT@PROJECT_ID.iam.gserviceaccount.com \
  --set-env-vars ALLOWED_ORIGINS="https://teknoify.com,https://www.teknoify.com" \
  --set-env-vars MARKET_SYMBOLS_SHEET_ID="SPREADSHEET_ID" \
  --set-secrets TWELVE_DATA_API_KEY=twelve-data-api-key:latest
```

## 12. Frontend meta tag
Place the deployed Cloud Run URL in:
```html
<meta name="teknoify-market-api-base" content="https://YOUR_CLOUD_RUN_URL">
```
Leave it empty until the proxy is deployed. BTC can still use direct Binance fallback; BIST 100 and S&P 500 display `Yakında`.

## 13. Testing `/health`
```bash
curl -i https://YOUR_CLOUD_RUN_URL/health
```
Expected body: `{ "status": "ok" }`.

## 14. Testing protected overview
```bash
curl -i https://YOUR_CLOUD_RUN_URL/v1/market/overview \
  -H "Origin: https://teknoify.com" \
  -H "Authorization: Bearer FIREBASE_ID_TOKEN"
```
Missing, malformed, expired, or invalid tokens return `401` without verification internals.

## 15. Rotating the Twelve Data secret
```bash
printf 'NEW_TWELVE_DATA_KEY' | gcloud secrets versions add twelve-data-api-key --data-file=-
gcloud run services update teknoify-market-data --region europe-west1 --set-secrets TWELVE_DATA_API_KEY=twelve-data-api-key:latest
```

## Cache TTLs
- Google Sheets configuration/manual data: 5 minutes
- Binance overview: 20 seconds
- Twelve Data live/delayed quote: 60 seconds
- Twelve Data daily series: 15 minutes
- Twelve Data EOD series: 30 minutes
- Stale real-data fallback for temporary failures: about 60 minutes
