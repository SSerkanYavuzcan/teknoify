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
- JSON / CSV / gerçek XLSX export
- Allowlist tabanlı harici API çağırma

## Önemli kavram
- `GCP_PROJECT`: Gerçek Firebase/GCP proje id (ör. `teknoify-9449c`)
- `DEFAULT_PROJECT_CODE`: Uygulama servis kodu (ör. `bim_faz_2`)

> `bim_faz_2` bir **servis kodu** olarak kullanılmalı. GCP proje id olarak underscore (`_`) geçersizdir.

## Hızlı kurulum
```bash
cd dashboard/bim-istekleri/backend
cp .env.example .env
# .env değerlerini düzenleyin
# BQ_DATASET=teknoify_bim olarak kalsın
chmod +x deploy.sh
./deploy.sh
```

## Firebase/Firestore kurulumu (senin kullanıcı için)
Aşağıdaki UID için atama yap:
- `DbXY7wyeJnTuSWQfrTsRVjCzPcp2`

### 1) projects koleksiyonuna servis ekle
Koleksiyon: `projects`
Doküman ID: `bim_faz_2`

Örnek alanlar:
```json
{
  "name": "Bim İstekleri",
  "description": "BİM istek verilerinin filtrelenmesi ve indirilmesi",
  "status": "active",
  "demoUrl": "/dashboard/bim-istekleri/index.html"
}
```

### 2) entitlements koleksiyonunda kullanıcıya yetki ver
Koleksiyon: `entitlements`
Doküman ID: `DbXY7wyeJnTuSWQfrTsRVjCzPcp2`

> Mevcut panel yapınız `projectIds` alanını okuyor. Bu yüzden bu alan zorunlu.

Örnek alanlar:
```json
{
  "projectIds": ["web_scraping", "bim_faz_2"],
  "projectStores": {
    "bim_faz_2": ["BIM"]
  },
  "apiAllowlist": [
    "https://example.com/api/"
  ]
}
```

### 3) (Opsiyonel) Firebase Console üzerinden hızlı atama
Firestore > `entitlements` > `DbXY7wyeJnTuSWQfrTsRVjCzPcp2` dokümanına girip `projectIds` array alanına `bim_faz_2` ekleyin.


## Sorguyu nereye yazacağız?
Sorgu backend içinde `main.py` dosyasındaki `_run_query(...)` fonksiyonunda yer alıyor.
- Dosya: `dashboard/bim-istekleri/backend/main.py`
- Bölüm: `_run_query`

Aşağıda aynı yapıya uygun bir örnek BigQuery sorgusu var (dataset `teknoify_bim`, table `bim_requests`):

```sql
SELECT
  request_date,
  request_id,
  request_title,
  request_description,
  source,
  status,
  payload,
  created_at
FROM `teknoify-9449c.teknoify_bim.bim_requests`
WHERE customer_id = @customer_id
  AND project_id = @project_id
  AND request_date BETWEEN @start_date AND @end_date
ORDER BY request_date DESC, created_at DESC
LIMIT @max_rows;
```

> Not: Bu backend parametreli sorgu kullanıyor (`@customer_id`, `@project_id` vb.) ve SQL injection riskini azaltır.

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
