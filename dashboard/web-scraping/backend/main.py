"""
Teknoify BigQuery Sorgu Cloud Function
────────────────────────────────────────
Deployment: Google Cloud Functions (gen2) — Python 3.11
Ücretsiz kota: 2M istek/ay, 400K GB-saniye/ay

Çalıştırma:
  Yerel test  : functions-framework --target=query_price_data --port=8080
  Deploy      : gcloud functions deploy query_price_data --gen2 ...
"""

import functions_framework
from google.cloud import bigquery
from firebase_admin import auth as firebase_auth
from firebase_admin import firestore
import firebase_admin
import json
import os
import uuid
from datetime import datetime

# ── Firebase Admin (coldstart'ta bir kez başlatılır) ──────────────────────────
if not firebase_admin._apps:
    firebase_admin.initialize_app()

# ── BigQuery istemcisi ─────────────────────────────────────────────────────────
bq_client = bigquery.Client()
fs_client = firestore.client()

# ── Ortam değişkenleri ─────────────────────────────────────────────────────────
GCP_PROJECT = os.environ.get("GCP_PROJECT", "")              # GCP proje ID
BQ_DATASET  = os.environ.get("BQ_DATASET", "teknoify_scraping")
BQ_TABLE    = os.environ.get("BQ_TABLE", "price_comparisons")
MAX_ROWS    = int(os.environ.get("MAX_ROWS", "10000"))
# Virgülle ayrılmış izin verilen originlar. Prod'da teknoify domain'ini yaz.
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "*")

# ── CORS başlıkları ────────────────────────────────────────────────────────────
def _cors(extra=None):
    h = {
        "Access-Control-Allow-Origin":  ALLOWED_ORIGINS,
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
        "Access-Control-Max-Age":       "3600",
    }
    if extra:
        h.update(extra)
    return h


def _json(data, status=200):
    return (
        json.dumps(data, default=str),
        status,
        {**_cors(), "Content-Type": "application/json"},
    )




def _get_store_access(uid, project_id):
    """Firestore entitlements üzerinden proje bazlı mağaza erişim listesini döndürür."""
    try:
        snap = fs_client.collection("entitlements").document(uid).get()
        if not snap.exists:
            return []

        data = snap.to_dict() or {}
        project_stores = data.get("projectStores") or data.get("projectStoreAccess") or {}
        stores = project_stores.get(project_id) if isinstance(project_stores, dict) else []
        if not stores:
            stores = data.get("allowedStores") or []

        if not isinstance(stores, list):
            return []

        return [str(store).strip() for store in stores if str(store).strip()]
    except Exception as e:
        print(f"[WARN] Store erişimi okunamadı (uid={uid}, project={project_id}): {e}")
        return []

def _verify_token(request):
    """Firebase ID token doğrular, (uid, error) döndürür."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None, "Authorization header eksik"
    try:
        decoded = firebase_auth.verify_id_token(auth_header[7:])
        return decoded["uid"], None
    except Exception as e:
        return None, f"Token geçersiz: {e}"


# ══════════════════════════════════════════════════════════════════════════════
# ANA ENDPOINT — tüm rotalar buradan yönlendirilir
# ══════════════════════════════════════════════════════════════════════════════
@functions_framework.http
def api(request):
    """Teknoify API ana router."""

    # Preflight
    if request.method == "OPTIONS":
        return ("", 204, _cors())

    path = request.path.rstrip("/")

    if path == "/health" and request.method == "GET":
        return _json({"status": "ok", "ts": datetime.utcnow().isoformat()})

    if path == "/query" and request.method == "POST":
        return _handle_query(request)

    if path == "/upload" and request.method == "POST":
        return _handle_upload(request)

    return _json({"error": "Endpoint bulunamadı"}, 404)


# ─── /query ───────────────────────────────────────────────────────────────────
def _handle_query(request):
    """
    POST /query
    Body: { project_id, start_date (YYYY-MM-DD), end_date (YYYY-MM-DD) }
    Auth: Bearer <Firebase ID Token>

    BigQuery'den müşteriye ait fiyat karşılaştırma verilerini çeker.
    """
    uid, err = _verify_token(request)
    if err:
        return _json({"error": err}, 401)

    body = request.get_json(force=True, silent=True) or {}
    project_id = str(body.get("project_id", "")).strip()
    start_date  = str(body.get("start_date",  "")).strip()
    end_date    = str(body.get("end_date",    "")).strip()

    if not all([project_id, start_date, end_date]):
        return _json({"error": "project_id, start_date ve end_date zorunludur"}, 400)

    # Tarih formatı doğrulama
    for d in (start_date, end_date):
        try:
            datetime.strptime(d, "%Y-%m-%d")
        except ValueError:
            return _json({"error": f"Tarih formatı YYYY-MM-DD olmalı: {d}"}, 400)

    table_ref = (
        f"`{GCP_PROJECT}.{BQ_DATASET}.{BQ_TABLE}`"
        if GCP_PROJECT
        else f"`{BQ_DATASET}.{BQ_TABLE}`"
    )

    allowed_stores = _get_store_access(uid, project_id)
    has_store_filter = len(allowed_stores) > 0

    store_clause = "AND store_name IN UNNEST(@allowed_stores)" if has_store_filter else ""

    query = f"""
    SELECT
        report_date,
        store_name,
        product_name,
        sku,
        brand_name,
        category_l1,
        category_l2,
        our_original_price,
        our_discount_price,
        competitor_name,
        competitor_original_price,
        competitor_discount_price
    FROM {table_ref}
    WHERE customer_id  = @customer_id
      AND project_id   = @project_id
      AND report_date BETWEEN @start_date AND @end_date
      {store_clause}
    ORDER BY report_date DESC, product_name ASC
    LIMIT @max_rows
    """

    query_parameters = [
        bigquery.ScalarQueryParameter("customer_id", "STRING", uid),
        bigquery.ScalarQueryParameter("project_id",  "STRING", project_id),
        bigquery.ScalarQueryParameter("start_date",  "DATE",   start_date),
        bigquery.ScalarQueryParameter("end_date",    "DATE",   end_date),
        bigquery.ScalarQueryParameter("max_rows",    "INT64",  MAX_ROWS),
    ]

    if has_store_filter:
        query_parameters.append(
            bigquery.ArrayQueryParameter("allowed_stores", "STRING", allowed_stores)
        )

    job_config = bigquery.QueryJobConfig(
        query_parameters=query_parameters,
        use_query_cache=True,   # Aynı sorgu tekrar gelirse cache'den döner (ücretsiz!)
    )

    try:
        rows = list(bq_client.query(query, job_config=job_config).result())
        data = [dict(row) for row in rows]
        return _json({
            "data":    data,
            "count":   len(data),
            "project": project_id,
            "range":   f"{start_date} → {end_date}",
            "allowedStores": allowed_stores,
        })
    except Exception as e:
        print(f"[ERROR] BigQuery sorgu hatası: {e}")
        return _json({"error": "Veri sorgulanırken hata oluştu"}, 500)


# ─── /upload ──────────────────────────────────────────────────────────────────
def _handle_upload(request):
    """
    POST /upload  (multipart/form-data)
    Form fields: file=<CSV>, project_id=<str>
    Auth: Bearer <Firebase ID Token>

    CSV'yi BigQuery'e batch yükler.
    CSV başlıkları upload_template.csv ile aynı olmalı.
    Küçük dosyalar (<10 MB) için doğrudan BQ load kullanır — ÜCRETSİZ.
    """
    uid, err = _verify_token(request)
    if err:
        return _json({"error": err}, 401)

    if "file" not in request.files:
        return _json({"error": "Dosya bulunamadı (form field: 'file')"}, 400)

    project_id = request.form.get("project_id", "").strip()
    if not project_id:
        return _json({"error": "project_id gereklidir"}, 400)

    uploaded_file = request.files["file"]
    batch_id      = str(uuid.uuid4())

    # Geçici dosyaya yaz
    import tempfile, csv
    with tempfile.NamedTemporaryFile(mode="wb", suffix=".csv", delete=False) as tmp:
        uploaded_file.save(tmp)
        tmp_path = tmp.name

    # CSV'yi oku, customer_id ve upload_batch_id ekle
    import io
    enriched_rows = []
    try:
        with open(tmp_path, newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                row["customer_id"]      = uid
                row["project_id"]       = project_id
                row["upload_batch_id"]  = batch_id
                # uploaded_at yoksa şimdiki zamanı ekle
                if not row.get("uploaded_at"):
                    row["uploaded_at"] = datetime.utcnow().isoformat() + "Z"
                enriched_rows.append(row)
    except Exception as e:
        return _json({"error": f"CSV okunamadı: {e}"}, 400)

    if not enriched_rows:
        return _json({"error": "CSV boş veya geçersiz"}, 400)

    # BigQuery şeması
    schema = [
        bigquery.SchemaField("customer_id",               "STRING"),
        bigquery.SchemaField("project_id",                "STRING"),
        bigquery.SchemaField("upload_batch_id",           "STRING"),
        bigquery.SchemaField("uploaded_at",               "TIMESTAMP"),
        bigquery.SchemaField("report_date",               "DATE"),
        bigquery.SchemaField("store_name",                "STRING"),
        bigquery.SchemaField("product_name",              "STRING"),
        bigquery.SchemaField("sku",                       "STRING"),
        bigquery.SchemaField("brand_name",                "STRING"),
        bigquery.SchemaField("category_l1",               "STRING"),
        bigquery.SchemaField("category_l2",               "STRING"),
        bigquery.SchemaField("our_original_price",        "NUMERIC"),
        bigquery.SchemaField("our_discount_price",        "NUMERIC"),
        bigquery.SchemaField("competitor_name",           "STRING"),
        bigquery.SchemaField("competitor_original_price", "NUMERIC"),
        bigquery.SchemaField("competitor_discount_price", "NUMERIC"),
    ]

    table_id = (
        f"{GCP_PROJECT}.{BQ_DATASET}.{BQ_TABLE}"
        if GCP_PROJECT
        else f"{BQ_DATASET}.{BQ_TABLE}"
    )

    # Zenginleştirilmiş satırları geçici CSV'ye yaz
    out_buf = io.StringIO()
    if enriched_rows:
        writer = csv.DictWriter(out_buf, fieldnames=enriched_rows[0].keys())
        writer.writeheader()
        writer.writerows(enriched_rows)
    out_buf.seek(0)

    job_config = bigquery.LoadJobConfig(
        schema=schema,
        source_format=bigquery.SourceFormat.CSV,
        skip_leading_rows=1,
        write_disposition=bigquery.WriteDisposition.WRITE_APPEND,
        allow_quoted_newlines=True,
    )

    try:
        job = bq_client.load_table_from_file(
            io.BytesIO(out_buf.getvalue().encode("utf-8")),
            table_id,
            job_config=job_config,
        )
        job.result()  # Tamamlanmasını bekle

        # Upload log kaydı
        _log_upload(uid, project_id, batch_id, uploaded_file.filename, len(enriched_rows))

        return _json({
            "success":        True,
            "batch_id":       batch_id,
            "rows_uploaded":  len(enriched_rows),
            "project_id":     project_id,
        })
    except Exception as e:
        print(f"[ERROR] BQ load hatası: {e}")
        return _json({"error": f"Yükleme başarısız: {e}"}, 500)


def _log_upload(uid, project_id, batch_id, filename, row_count):
    """upload_log tablosuna kayıt ekler (opsiyonel, hata durumunda sessizce geçer)."""
    try:
        log_table = (
            f"{GCP_PROJECT}.{BQ_DATASET}.upload_log"
            if GCP_PROJECT
            else f"{BQ_DATASET}.upload_log"
        )
        rows = [{
            "upload_batch_id": batch_id,
            "customer_id":     uid,
            "project_id":      project_id,
            "source_file_name": filename,
            "row_count":       row_count,
            "status":          "SUCCESS",
            "created_at":      datetime.utcnow().isoformat() + "Z",
        }]
        bq_client.insert_rows_json(log_table, rows)
    except Exception as e:
        print(f"[WARN] upload_log yazılamadı: {e}")
