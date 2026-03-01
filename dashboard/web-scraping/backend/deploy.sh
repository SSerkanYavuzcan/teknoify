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
REGION="europe-west1"           # İstanbul'a en yakın region
FUNCTION_NAME="teknoify-api"
ENTRY_POINT="api"               # main.py'deki fonksiyon adı
RUNTIME="python311"
MEMORY="256MB"                  # Ücretsiz kotada kalır
TIMEOUT="60s"

# Cloud Function runtime service account (BigQuery + Firestore erişimi için)
SERVICE_ACCOUNT="teknoify-cloudfunctions-sa@teknoify-9449c-488120.iam.gserviceaccount.com"

# .env dosyasından değerleri oku
ENV_FILE="$(dirname "$0")/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ .env dosyası bulunamadı: $ENV_FILE"
  echo "   Lütfen backend klasöründe .env dosyasını oluştur ve gerekli değişkenleri ekle."
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

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
  --service-account="${SERVICE_ACCOUNT}" \
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
