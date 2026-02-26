#!/bin/bash
set -euo pipefail

PROJECT_ID="teknoify-9449c"
REGION="europe-west1"
FUNCTION_NAME="teknoify-bim-api"
ENTRY_POINT="api"
RUNTIME="python311"
MEMORY="512MB"
TIMEOUT="120s"

# Firestore + BigQuery yetkili service account
SERVICE_ACCOUNT="teknoify-cloudfunctions-sa@${PROJECT_ID}.iam.gserviceaccount.com"

ENV_FILE="$(dirname "$0")/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ .env dosyası bulunamadı: $ENV_FILE"
  echo "   cp .env.example .env && değerleri düzenleyin"
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

echo "🚀 Deploying ${FUNCTION_NAME} to ${PROJECT_ID}..."

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
  --set-env-vars="GCP_PROJECT=${GCP_PROJECT},DEFAULT_PROJECT_CODE=${DEFAULT_PROJECT_CODE},BQ_DATASET=${BQ_DATASET},BQ_TABLE=${BQ_TABLE},MAX_ROWS=${MAX_ROWS},ALLOWED_ORIGINS=${ALLOWED_ORIGINS},API_ALLOWLIST=${API_ALLOWLIST},HTTP_TIMEOUT=${HTTP_TIMEOUT}" \
  --source="$(dirname "$0")"

echo "✅ Deployment tamamlandı"
gcloud functions describe "${FUNCTION_NAME}" \
  --gen2 \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --format="value(serviceConfig.uri)"
