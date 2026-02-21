#!/bin/bash
# ─── deploy.sh ────────────────────────────────────────────────────────────────
# Cloud Function deployment scripti.
# Çalıştırmadan önce: chmod +x deploy.sh
#
# Gereksinimler:
#   - gcloud CLI kurulu ve teknoify projesi seçili
#   - gcloud auth application-default login
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

PROJECT_ID="teknoify-9449c"
REGION="europe-west1"           # İstanbul'a en yakın ücretsiz region
FUNCTION_NAME="teknoify-api"
ENTRY_POINT="api"               # main.py'deki fonksiyon adı
RUNTIME="python311"
MEMORY="256MB"                  # Ücretsiz kotada kalır
TIMEOUT="60s"

# .env dosyasından değerleri oku
source "$(dirname "$0")/.env"

echo "🚀 Deploying ${FUNCTION_NAME} to ${REGION}..."

gcloud functions deploy "${FUNCTION_NAME}" \
  --gen2 \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --runtime="${RUNTIME}" \
  --entry-point="${ENTRY_POINT}" \
  --trigger-http \
  --allow-unauthenticated \
  --memory="${MEMORY}" \
  --timeout="${TIMEOUT}" \
  --set-env-vars="GCP_PROJECT=${GCP_PROJECT},BQ_DATASET=${BQ_DATASET},BQ_TABLE=${BQ_TABLE},MAX_ROWS=${MAX_ROWS},ALLOWED_ORIGINS=${ALLOWED_ORIGINS}" \
  --source="$(dirname "$0")"

echo ""
echo "✅ Deployment tamamlandı!"
echo ""
echo "Function URL:"
gcloud functions describe "${FUNCTION_NAME}" \
  --gen2 \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --format="value(serviceConfig.uri)"

echo ""
echo "🧪 Test:"
echo "curl -X GET <URL>/health"
