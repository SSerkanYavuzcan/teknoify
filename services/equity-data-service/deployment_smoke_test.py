#!/usr/bin/env python3
"""Verify the health and cached equity response of a deployed service."""

from __future__ import annotations

import json
import math
import sys
import time
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit, urlunsplit
from urllib.request import Request, urlopen

TIMEOUT_SECONDS = 10
MAX_WAIT_SECONDS = 300
RETRY_INTERVAL_SECONDS = 15
EXPECTED_SYMBOLS = {
    "XU100", "THYAO", "EREGL", "ASELS", "BIMAS",
    "SP500", "AAPL", "TSLA", "MSFT", "NVDA", "JPM", "KO",
}
REQUIRED_FIELDS = {
    "symbol", "displayName", "market", "exchange", "currency", "status", "stale"
}
PRICE_FIELDS = ("price", "previousClose", "change", "changePercent")


class SmokeTestError(Exception):
    """A deployment response did not satisfy the smoke-test contract."""


def normalize_base_url(raw_url: str) -> str:
    """Return a validated absolute HTTP(S) base URL without trailing slashes."""
    try:
        parsed = urlsplit(raw_url.strip())
        _ = parsed.port
    except ValueError as exc:
        raise SmokeTestError(f"invalid base URL: {exc}") from exc
    if parsed.scheme not in {"http", "https"} or not parsed.netloc or not parsed.hostname:
        raise SmokeTestError("base URL must be an absolute http:// or https:// URL")
    if parsed.username is not None or parsed.password is not None:
        raise SmokeTestError("base URL must not contain embedded credentials")
    if parsed.query or parsed.fragment:
        raise SmokeTestError("base URL must not contain a query string or fragment")
    path = parsed.path.rstrip("/")
    return urlunsplit((parsed.scheme, parsed.netloc, path, "", ""))


def parse_json(body: bytes, endpoint: str) -> Any:
    """Decode strict JSON, rejecting JavaScript-style non-finite constants."""
    try:
        return json.loads(
            body.decode("utf-8"),
            parse_constant=lambda value: (_ for _ in ()).throw(
                ValueError(f"non-finite JSON number {value}")
            ),
        )
    except (UnicodeDecodeError, json.JSONDecodeError, ValueError) as exc:
        raise SmokeTestError(f"{endpoint} returned malformed JSON: {exc}") from exc


def request(base_url: str, path: str) -> tuple[int, Any]:
    """GET one service endpoint and return its status and parsed JSON body."""
    req = Request(f"{base_url}{path}", headers={"Accept": "application/json"})
    try:
        with urlopen(req, timeout=TIMEOUT_SECONDS) as response:
            return response.status, parse_json(response.read(), path)
    except HTTPError as exc:
        return exc.code, parse_json(exc.read(), path)
    except (TimeoutError, URLError) as exc:
        raise SmokeTestError(f"{path} request failed: {exc}") from exc


def check_health(base_url: str) -> None:
    status, payload = request(base_url, "/health")
    if status != 200 or not isinstance(payload, dict):
        raise SmokeTestError(f"/health returned HTTP {status} or a non-object body")
    health_status = payload.get("status")
    if health_status not in {"warming_up", "ok", "ready"}:
        raise SmokeTestError(f"/health returned unexpected status {health_status!r}")
    print(f"Health: {health_status} (ready={payload.get('ready', health_status != 'warming_up')})")


def wait_for_equities(base_url: str) -> dict[str, Any]:
    deadline = time.monotonic() + MAX_WAIT_SECONDS
    attempt = 0
    while True:
        attempt += 1
        status, payload = request(base_url, "/v1/equities")
        if status == 200:
            if not isinstance(payload, dict):
                raise SmokeTestError("/v1/equities returned a non-object body")
            return payload
        if status != 503 or not isinstance(payload, dict) or payload.get("error") != "data_not_ready":
            raise SmokeTestError(f"/v1/equities returned unexpected HTTP {status}: {payload!r}")
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise SmokeTestError("equity data was not ready within 300 seconds")
        print(f"Equity snapshot is warming up (attempt {attempt}); retrying in {min(RETRY_INTERVAL_SECONDS, remaining):.0f}s")
        time.sleep(min(RETRY_INTERVAL_SECONDS, remaining))


def validate_equities(payload: dict[str, Any]) -> None:
    items = payload.get("items")
    if not isinstance(items, list):
        raise SmokeTestError("equity response 'items' must be a list")
    if len(items) < len(EXPECTED_SYMBOLS):
        raise SmokeTestError(f"expected at least {len(EXPECTED_SYMBOLS)} configured items, received {len(items)}")

    for index, item in enumerate(items):
        if not isinstance(item, dict):
            raise SmokeTestError(f"item {index} is not an object")
        missing = REQUIRED_FIELDS - item.keys()
        if missing:
            raise SmokeTestError(f"item {index} is missing fields: {', '.join(sorted(missing))}")
        if not isinstance(item["stale"], bool):
            raise SmokeTestError(f"item {index} has non-boolean stale state")
        for field in PRICE_FIELDS:
            value = item.get(field)
            if value is not None and (isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value)):
                raise SmokeTestError(f"item {index} has invalid {field}: {value!r}")

    symbols = {item["symbol"] for item in items}
    missing_symbols = EXPECTED_SYMBOLS - symbols
    if missing_symbols:
        raise SmokeTestError(f"missing configured symbols: {', '.join(sorted(missing_symbols))}")
    markets = {item["market"] for item in items}
    currencies = {item["currency"] for item in items}
    if not {"US", "BIST"}.issubset(markets):
        raise SmokeTestError(f"missing required markets; received {sorted(markets)}")
    if not {"USD", "TRY"}.issubset(currencies):
        raise SmokeTestError(f"missing required currencies; received {sorted(currencies)}")

    counts = {
        "ok": sum(item["status"] == "ok" for item in items),
        "stale": sum(bool(item["stale"]) for item in items),
        "error": sum(item["status"] == "error" for item in items),
        "US": sum(item["market"] == "US" for item in items),
        "BIST": sum(item["market"] == "BIST" for item in items),
    }
    print(f"Equities: total={len(items)} " + " ".join(f"{key}={value}" for key, value in counts.items()))


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(f"Usage: {argv[0]} BASE_URL", file=sys.stderr)
        return 2
    try:
        base_url = normalize_base_url(argv[1])
        check_health(base_url)
        validate_equities(wait_for_equities(base_url))
    except SmokeTestError as exc:
        print(f"Smoke test failed: {exc}", file=sys.stderr)
        return 1
    print("Deployment smoke test passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
