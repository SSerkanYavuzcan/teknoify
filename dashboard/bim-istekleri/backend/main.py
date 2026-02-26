"""
Bim İstekleri Backend (Firebase + BigQuery)
────────────────────────────────────────────
Cloud Functions (gen2) Python backend.

Endpoints
- GET  /health
- POST /bim-requests/query
- POST /bim-requests/export
- POST /bim-requests/api-fetch

Auth
- Authorization: Bearer <Firebase ID Token>

Notes
- Kullanıcı yetkilendirmesi Firestore `entitlements/{uid}` üzerinden yapılır.
- BigQuery sorgusu tarih aralığına göre çalışır.
- Export çıktısı JSON/CSV/XLSX üretir.
"""

from __future__ import annotations

import csv
import functions_framework
import io
import json
import os
from datetime import datetime
from typing import Any

import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import firestore
from google.cloud import bigquery
from openpyxl import Workbook


if not firebase_admin._apps:
    firebase_admin.initialize_app()

bq_client = bigquery.Client()
fs_client = firestore.client()


GCP_PROJECT = os.environ.get("GCP_PROJECT", "")
BQ_DATASET = os.environ.get("BQ_DATASET", "teknoify_bim")
BQ_TABLE = os.environ.get("BQ_TABLE", "bim_requests")
MAX_ROWS = int(os.environ.get("MAX_ROWS", "20000"))
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "*")
HTTP_TIMEOUT = int(os.environ.get("HTTP_TIMEOUT", "20"))
API_ALLOWLIST = [u.strip() for u in os.environ.get("API_ALLOWLIST", "").split(",") if u.strip()]
DEFAULT_PROJECT_CODE = os.environ.get("DEFAULT_PROJECT_CODE", "bim_faz_2")


def _cors(extra: dict[str, str] | None = None) -> dict[str, str]:
    headers = {
        "Access-Control-Allow-Origin": ALLOWED_ORIGINS,
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Authorization,Content-Type",
        "Access-Control-Max-Age": "3600",
    }
    if extra:
        headers.update(extra)
    return headers


def _json(payload: dict[str, Any], status: int = 200):
    return (
        json.dumps(payload, ensure_ascii=False, default=str),
        status,
        {**_cors(), "Content-Type": "application/json; charset=utf-8"},
    )


def _validate_date(date_text: str) -> bool:
    try:
        datetime.strptime(date_text, "%Y-%m-%d")
        return True
    except ValueError:
        return False


def _verify_token(request):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None, "Authorization header eksik"

    token = auth_header[7:]
    try:
        decoded = firebase_auth.verify_id_token(token)
        return decoded.get("uid"), None
    except Exception as exc:  # noqa: BLE001
        return None, f"Token geçersiz: {exc}"


def _get_project_entitlement(uid: str, project_id: str) -> dict[str, Any]:
    snap = fs_client.collection("entitlements").document(uid).get()
    if not snap.exists:
        return {"enabled": False, "stores": [], "api_allowlist": []}

    data = snap.to_dict() or {}
    project_ids = data.get("projectIds") or data.get("projects") or []
    enabled = project_id in project_ids if isinstance(project_ids, list) else False

    project_stores = data.get("projectStores") or data.get("projectStoreAccess") or {}
    stores = project_stores.get(project_id, []) if isinstance(project_stores, dict) else []
    if not isinstance(stores, list):
        stores = []

    api_allowlist = data.get("apiAllowlist") or []
    if not isinstance(api_allowlist, list):
        api_allowlist = []

    return {
        "enabled": enabled,
        "stores": [str(s).strip() for s in stores if str(s).strip()],
        "api_allowlist": [str(u).strip() for u in api_allowlist if str(u).strip()],
    }


def _table_ref() -> str:
    return f"{GCP_PROJECT}.{BQ_DATASET}.{BQ_TABLE}" if GCP_PROJECT else f"{BQ_DATASET}.{BQ_TABLE}"


def _run_query(uid: str, project_id: str, start_date: str, end_date: str, allowed_stores: list[str]):
    store_clause = "AND source IN UNNEST(@allowed_stores)" if allowed_stores else ""

    query = f"""
    SELECT
      request_date,
      request_id,
      request_title,
      request_description,
      source,
      status,
      payload,
      created_at
    FROM `{_table_ref()}`
    WHERE customer_id = @customer_id
      AND project_id = @project_id
      AND request_date BETWEEN @start_date AND @end_date
      {store_clause}
    ORDER BY request_date DESC, created_at DESC
    LIMIT @max_rows
    """

    params: list[Any] = [
        bigquery.ScalarQueryParameter("customer_id", "STRING", uid),
        bigquery.ScalarQueryParameter("project_id", "STRING", project_id),
        bigquery.ScalarQueryParameter("start_date", "DATE", start_date),
        bigquery.ScalarQueryParameter("end_date", "DATE", end_date),
        bigquery.ScalarQueryParameter("max_rows", "INT64", MAX_ROWS),
    ]

    if allowed_stores:
        params.append(bigquery.ArrayQueryParameter("allowed_stores", "STRING", allowed_stores))

    job_config = bigquery.QueryJobConfig(query_parameters=params, use_query_cache=True)
    rows = list(bq_client.query(query, job_config=job_config).result())
    return [dict(r) for r in rows]


def _rows_to_csv(rows: list[dict[str, Any]]) -> str:
    if not rows:
        return ""

    out = io.StringIO()
    writer = csv.DictWriter(out, fieldnames=list(rows[0].keys()))
    writer.writeheader()
    writer.writerows(rows)
    return out.getvalue()


def _rows_to_xlsx(rows: list[dict[str, Any]]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "bim_istekleri"

    if rows:
        headers = list(rows[0].keys())
        ws.append(headers)
        for row in rows:
            ws.append([row.get(h) for h in headers])

    out = io.BytesIO()
    wb.save(out)
    return out.getvalue()


def _handle_query(request):
    uid, err = _verify_token(request)
    if err:
        return _json({"error": err}, 401)

    body = request.get_json(force=True, silent=True) or {}
    project_id = str(body.get("project_id", DEFAULT_PROJECT_CODE)).strip()
    start_date = str(body.get("start_date", "")).strip()
    end_date = str(body.get("end_date", "")).strip()

    if not project_id or not start_date or not end_date:
        return _json({"error": "project_id, start_date ve end_date zorunludur"}, 400)

    if not (_validate_date(start_date) and _validate_date(end_date)):
        return _json({"error": "Tarih formatı YYYY-MM-DD olmalıdır"}, 400)

    entitlement = _get_project_entitlement(uid, project_id)
    if not entitlement["enabled"]:
        return _json({"error": "Bu proje için yetkiniz yok"}, 403)

    try:
        rows = _run_query(uid, project_id, start_date, end_date, entitlement["stores"])
    except Exception as exc:  # noqa: BLE001
        print(f"[ERROR] query failed: {exc}")
        return _json({"error": "BigQuery sorgusu başarısız"}, 500)

    return _json(
        {
            "data": rows,
            "count": len(rows),
            "project_id": project_id,
            "range": {"start_date": start_date, "end_date": end_date},
        }
    )


def _handle_export(request):
    uid, err = _verify_token(request)
    if err:
        return _json({"error": err}, 401)

    body = request.get_json(force=True, silent=True) or {}
    fmt = str(body.get("format", "json")).strip().lower()
    if fmt not in {"json", "csv", "excel", "xlsx"}:
        return _json({"error": "format json, csv, excel veya xlsx olmalıdır"}, 400)

    project_id = str(body.get("project_id", DEFAULT_PROJECT_CODE)).strip()
    start_date = str(body.get("start_date", "")).strip()
    end_date = str(body.get("end_date", "")).strip()

    if not (_validate_date(start_date) and _validate_date(end_date)):
        return _json({"error": "Tarih formatı YYYY-MM-DD olmalıdır"}, 400)

    entitlement = _get_project_entitlement(uid, project_id)
    if not entitlement["enabled"]:
        return _json({"error": "Bu proje için yetkiniz yok"}, 403)

    rows = _run_query(uid, project_id, start_date, end_date, entitlement["stores"])
    export_name = f"bim-istekleri-{start_date}_{end_date}"

    if fmt == "json":
        payload = json.dumps(rows, ensure_ascii=False, default=str)
        return (
            payload,
            200,
            {
                **_cors(),
                "Content-Type": "application/json; charset=utf-8",
                "Content-Disposition": f'attachment; filename="{export_name}.json"',
            },
        )

    if fmt in {"excel", "xlsx"}:
        xlsx_bytes = _rows_to_xlsx(rows)
        return (
            xlsx_bytes,
            200,
            {
                **_cors(),
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": f'attachment; filename="{export_name}.xlsx"',
            },
        )

    csv_text = _rows_to_csv(rows)
    return (
        csv_text,
        200,
        {
            **_cors(),
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": f'attachment; filename="{export_name}.csv"',
        },
    )


def _is_allowed_url(url: str, allowlist: list[str]) -> bool:
    if not allowlist:
        return False
    return any(url.startswith(prefix) for prefix in allowlist)


def _handle_api_fetch(request):
    import requests

    uid, err = _verify_token(request)
    if err:
        return _json({"error": err}, 401)

    body = request.get_json(force=True, silent=True) or {}
    project_id = str(body.get("project_id", DEFAULT_PROJECT_CODE)).strip()
    target_url = str(body.get("url", "")).strip()
    method = str(body.get("method", "GET")).strip().upper()
    headers = body.get("headers") if isinstance(body.get("headers"), dict) else {}
    payload = body.get("payload")

    if not target_url:
        return _json({"error": "url zorunludur"}, 400)

    entitlement = _get_project_entitlement(uid, project_id)
    if not entitlement["enabled"]:
        return _json({"error": "Bu proje için yetkiniz yok"}, 403)

    effective_allowlist = entitlement["api_allowlist"] or API_ALLOWLIST
    if not _is_allowed_url(target_url, effective_allowlist):
        return _json({"error": "Bu URL allowlist dışında"}, 403)

    if method not in {"GET", "POST", "PUT", "PATCH", "DELETE"}:
        return _json({"error": "Desteklenmeyen HTTP method"}, 400)

    try:
        response = requests.request(
            method=method,
            url=target_url,
            headers=headers,
            json=payload,
            timeout=HTTP_TIMEOUT,
        )
    except Exception as exc:  # noqa: BLE001
        print(f"[ERROR] api fetch failed: {exc}")
        return _json({"error": "Harici API isteği başarısız"}, 502)

    content_type = response.headers.get("content-type", "")
    parsed_body: Any
    if "application/json" in content_type:
        try:
            parsed_body = response.json()
        except Exception:  # noqa: BLE001
            parsed_body = response.text
    else:
        parsed_body = response.text

    return _json(
        {
            "status": response.status_code,
            "content_type": content_type,
            "data": parsed_body,
        },
        status=200,
    )


@functions_framework.http
def api(request):
    if request.method == "OPTIONS":
        return "", 204, _cors()

    path = request.path.rstrip("/")

    if path == "/health" and request.method == "GET":
        return _json({"status": "ok", "time": datetime.utcnow().isoformat() + "Z"})

    if path == "/bim-requests/query" and request.method == "POST":
        return _handle_query(request)

    if path == "/bim-requests/export" and request.method == "POST":
        return _handle_export(request)

    if path == "/bim-requests/api-fetch" and request.method == "POST":
        return _handle_api_fetch(request)

    return _json({"error": "Endpoint bulunamadı"}, 404)
