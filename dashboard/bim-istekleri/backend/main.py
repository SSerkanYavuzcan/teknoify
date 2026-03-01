# dashboard/bim-istekleri/backend/main.py
#
# ✅ GÜVENLİK GÜNCELLEMELERİ TAMAMLANDI:
# 1. SSRF Koruması: urlparse ile host ve scheme bazlı kesin doğrulama eklendi.
# 2. Crash (Çökme) Koruması: Senkron Firebase token doğrulaması try/except ile güvenli hale getirildi.
# 3. Payload Veri Tipi: requests.request içinde dict/list ise JSON, değilse data olarak iletilmesi sağlandı.
# 4. Header Abuse & Credential Relay: authorization, cookie gibi tehlikeli başlıkların 3. partilere sızması engellendi.
# 5. Open CORS Kapatıldı: Varsayılan "*" izni kaldırıldı, varsayılan olarak sadece "https://teknoify.com"a izin verildi.

from __future__ import annotations

import json
import os
from datetime import datetime
from typing import Any
from urllib.parse import urlparse

import functions_framework
import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import firestore
import requests


# -------------------- Firebase init --------------------
if not firebase_admin._apps:
    firebase_admin.initialize_app()

fs_client = firestore.client()


# -------------------- Env --------------------
HTTP_TIMEOUT = int(os.environ.get("HTTP_TIMEOUT", "20"))

# CORS allowlist: Varsayılan olarak sadece senin domainin (Açık CORS zafiyeti kapatıldı)
ALLOWED_ORIGINS_RAW = os.environ.get("ALLOWED_ORIGINS", "https://teknoify.com")
ALLOWED_ORIGINS = [o.strip() for o in ALLOWED_ORIGINS_RAW.split(",") if o.strip()]

# Generic proxy allowlist (optional):
API_ALLOWLIST = [u.strip() for u in os.environ.get("API_ALLOWLIST", "").split(",") if u.strip()]

# BIM credentials (Secret Manager veya Environment Variables üzerinden okunmalı)
BIM_USERNAME = os.environ.get("BIM_USERNAME", "")
BIM_PASSWORD = os.environ.get("BIM_PASSWORD", "")
BIM_CHAIN_ID = os.environ.get("BIM_CHAIN_ID", "cw7cw")

BIM_LOGIN_URL = os.environ.get(
    "BIM_LOGIN_URL",
    "https://ls-user-information-api.yemeksepeti.com/api/v1/auth/login",
)
BIM_CUSTOMER_INFO_URL_TEMPLATE = os.environ.get(
    "BIM_CUSTOMER_INFO_URL_TEMPLATE",
    "https://ls-user-information-api.yemeksepeti.com/api/v1/user/customer-info-detail/{order_id}",
)


# -------------------- CORS helpers --------------------
def _cors_headers_for_request(request, extra: dict[str, str] | None = None) -> dict[str, str]:
    origin = request.headers.get("Origin", "")

    allow_all = "*" in ALLOWED_ORIGINS
    headers: dict[str, str] = {
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Authorization,Content-Type",
        "Access-Control-Max-Age": "3600",
    }

    if allow_all:
        headers["Access-Control-Allow-Origin"] = "*"
    else:
        # İstek atan Origin, izin verilenler listesindeyse ekle, yoksa tarayıcı bloklar.
        if origin and origin in ALLOWED_ORIGINS:
            headers["Access-Control-Allow-Origin"] = origin
            headers["Vary"] = "Origin"

    if extra:
        headers.update(extra)

    return headers


def _json(request, payload: dict[str, Any], status: int = 200):
    return (
        json.dumps(payload, ensure_ascii=False, default=str),
        status,
        {**_cors_headers_for_request(request), "Content-Type": "application/json; charset=utf-8"},
    )


# -------------------- Auth / entitlement --------------------
def _verify_token(request):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None, "Authorization header eksik veya hatalı format"

    token = auth_header[7:]
    try:
        decoded = firebase_auth.verify_id_token(token)
        return decoded.get("uid"), None
    except Exception as exc: 
        return None, f"Token geçersiz veya süresi dolmuş: {str(exc)}"


def _get_project_entitlement(uid: str, project_id: str) -> dict[str, Any]:
    try:
        snap = fs_client.collection("entitlements").document(uid).get()
        if not snap.exists:
            return {"enabled": False, "api_allowlist": []}

        data = snap.to_dict() or {}

        projects = data.get("projects") or data.get("projectIds") or []
        enabled = project_id in projects if isinstance(projects, list) else False

        api_allowlist = data.get("apiAllowlist") or []
        if not isinstance(api_allowlist, list):
            api_allowlist = []

        return {
            "enabled": enabled,
            "api_allowlist": [str(u).strip() for u in api_allowlist if str(u).strip()],
        }
    except Exception as e:
        print(f"[ERROR] Entitlement kontrolü başarısız (UID: {uid}): {e}")
        return {"enabled": False, "api_allowlist": []}


# -------------------- URL allowlist (SSRF Protection) --------------------
def _host_matches_prefix(target_url: str, prefix: str) -> bool:
    try:
        tu = urlparse(target_url)
        pr = urlparse(prefix)

        if not tu.scheme or not tu.netloc:
            return False
        if not pr.scheme or not pr.netloc:
            return False

        if tu.scheme != pr.scheme:
            return False
        if tu.netloc != pr.netloc:
            return False

        base_path = pr.path or "/"
        return (tu.path or "/").startswith(base_path)
    except Exception:
        return False


def _is_allowed_url(url: str, allowlist: list[str]) -> bool:
    if not allowlist:
        return False
    return any(_host_matches_prefix(url, prefix) for prefix in allowlist)


# -------------------- BIM flow --------------------
def _handle_bim_customer_info(request, body: dict[str, Any]):
    uid, err = _verify_token(request)
    if err:
        return _json(request, {"error": err}, 401)

    project_id = str(body.get("project_id", "bim_faz_2")).strip()
    order_id = str(body.get("orderId") or body.get("order_id") or "").strip()

    if not order_id:
        return _json(request, {"error": "orderId zorunludur"}, 400)

    entitlement = _get_project_entitlement(uid, project_id)
    if not entitlement["enabled"]:
        return _json(request, {"error": "Bu proje için yetkiniz yok"}, 403)

    if not BIM_USERNAME or not BIM_PASSWORD:
        return _json(request, {"error": "BIM credentials server-side eksik"}, 500)

    # 1) LOGIN -> token
    try:
        login_resp = requests.get(
            BIM_LOGIN_URL,
            params={"UserName": BIM_USERNAME, "Password": BIM_PASSWORD, "ChainId": BIM_CHAIN_ID},
            timeout=HTTP_TIMEOUT,
        )
    except Exception as exc: 
        print(f"[ERROR] bim login request failed: {exc}")
        return _json(request, {"error": "BIM login isteği başarısız"}, 502)

    try:
        login_json = login_resp.json()
        raw_token = (
            login_json.get("data", {}).get("data", {}).get("token", "")
            or login_json.get("data", {}).get("token", "")
            or login_json.get("token", "")
        )
    except Exception:
        login_json = None
        raw_token = ""

    raw_token = str(raw_token or "").strip()
    if not raw_token:
        return _json(
            request,
            {
                "error": "BIM token alınamadı",
                "login_status": login_resp.status_code,
            },
            502,
        )

    bearer = raw_token if raw_token.lower().startswith("bearer ") else f"Bearer {raw_token}"

    # 2) CUSTOMER INFO
    info_url = BIM_CUSTOMER_INFO_URL_TEMPLATE.format(order_id=order_id)

    try:
        info_resp = requests.get(
            info_url,
            headers={"Authorization": bearer, "accept": "*/*"},
            timeout=HTTP_TIMEOUT,
        )
    except Exception as exc: 
        print(f"[ERROR] bim customer-info request failed: {exc}")
        return _json(request, {"error": "BIM customer-info isteği başarısız"}, 502)

    try:
        info_body = info_resp.json()
    except Exception:
        info_body = info_resp.text

    return _json(
        request,
        {
            "ok": True,
            "order_id": order_id,
            "status": info_resp.status_code,
            "data": info_body,
        },
        200,
    )


# -------------------- Generic proxy fetch --------------------
def _handle_api_fetch(request, body: dict[str, Any]):
    uid, err = _verify_token(request)
    if err:
        return _json(request, {"error": err}, 401)

    project_id = str(body.get("project_id", "bim_faz_2")).strip()
    target_url = str(body.get("url", "")).strip()
    method = str(body.get("method", "GET")).strip().upper()
    headers = body.get("headers")
    payload = body.get("body") 

    if not target_url:
        return _json(request, {"error": "url zorunludur"}, 400)

    entitlement = _get_project_entitlement(uid, project_id)
    if not entitlement["enabled"]:
        return _json(request, {"error": "Bu proje için yetkiniz yok"}, 403)

    effective_allowlist = entitlement["api_allowlist"] or API_ALLOWLIST
    if not _is_allowed_url(target_url, effective_allowlist):
        return _json(request, {"error": "Bu URL allowlist dışında"}, 403)

    if method not in {"GET", "POST", "PUT", "PATCH", "DELETE"}:
        return _json(request, {"error": "Desteklenmeyen HTTP method"}, 400)

    # 🚨 GÜVENLİK: Header Abuse & Credential Relay Koruması
    DANGEROUS_HEADERS = {
        "host", "content-length", "connection", 
        "authorization", "cookie", "proxy-authorization", 
        "x-forwarded-for", "x-forwarded-host", "origin", "referer"
    }
    
    safe_headers = {}
    if isinstance(headers, dict):
        for k, v in headers.items():
            header_name = str(k).lower().strip()
            if header_name not in DANGEROUS_HEADERS:
                safe_headers[k] = v

    try:
        req_kwargs = {
            "method": method, 
            "url": target_url, 
            "headers": safe_headers, 
            "timeout": HTTP_TIMEOUT
        }
        
        # Payload Tipi Güvenliği (Çökme ve Veri Uyuşmazlığını Engeller)
        if isinstance(payload, (dict, list)):
            req_kwargs["json"] = payload
        elif payload is not None:
            req_kwargs["data"] = payload

        response = requests.request(**req_kwargs)
    except Exception as exc: 
        print(f"[ERROR] api fetch failed: {exc}")
        return _json(request, {"error": "Harici API isteği başarısız"}, 502)

    try:
        parsed_body = response.json()
    except Exception:
        parsed_body = response.text

    return _json(
        request,
        {
            "ok": True,
            "status": response.status_code,
            "data": parsed_body,
        },
        200,
    )


# -------------------- Main entrypoint --------------------
@functions_framework.http
def apiProxy(request):
    # Preflight (CORS)
    if request.method == "OPTIONS":
        return "", 204, _cors_headers_for_request(request)

    # Health Check
    if request.method == "GET" and request.path.rstrip("/") in ("/health", "/apiProxy/health"):
        return _json(request, {"status": "ok", "time": datetime.utcnow().isoformat() + "Z"}, 200)

    # Parse JSON body
    body = request.get_json(silent=True) or {}

    # Routing
    if isinstance(body, dict) and (body.get("orderId") or body.get("order_id")):
        return _handle_bim_customer_info(request, body)

    if isinstance(body, dict) and body.get("url"):
        return _handle_api_fetch(request, body)

    return _json(
        request,
        {
            "error": "Geçersiz istek. 'orderId' veya 'url' alanı bekleniyor.",
        },
        400,
    )
