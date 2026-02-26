# Bim İstekleri Backend

Bu klasör, **Bim İstekleri** hizmeti için Cloud Function backend altyapısını içerir.

## Endpointler
- `GET /health`
- `POST /bim-requests/query`
- `POST /bim-requests/export`
- `POST /bim-requests/api-fetch`

## Özellikler
- Firebase ID token doğrulama
- Firestore `entitlements/{uid}` üzerinden proje bazlı yetkilendirme
- BigQuery tarih filtresi ile sorgu
- JSON / CSV (Excel için CSV tabanlı) export
- Allowlist tabanlı harici API çağırma

## Hızlı kurulum
```bash
cd dashboard/bim-istekleri/backend
cp .env.example .env
# .env değerlerini düzenleyin
chmod +x deploy.sh
./deploy.sh
```

## Entitlement örneği
```json
{
  "projects": ["bim_faz_2"],
  "projectStores": {
    "bim_faz_2": ["BIM", "FILE"]
  },
  "apiAllowlist": [
    "https://example.com/api/"
  ]
}
```

## BigQuery beklenen kolonlar
- `customer_id` STRING
- `project_id` STRING
- `request_date` DATE
- `request_id` STRING
- `request_title` STRING
- `request_description` STRING
- `source` STRING
- `status` STRING
- `payload` STRING/JSON
- `created_at` TIMESTAMP
