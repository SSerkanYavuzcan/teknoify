from datetime import date, datetime, timezone
import importlib
import json
from unittest.mock import Mock

from fastapi.testclient import TestClient

from app.main import app, manager
from app.models import Quote
from app.snapshot import Snapshot
from app.symbols import STOCKS


client = TestClient(app)


def sample(stock):
    return Quote(
        symbol=stock.symbol,
        provider_symbol=stock.provider_symbol,
        display_name=stock.display_name,
        market=stock.market,
        exchange=stock.exchange,
        currency=stock.currency,
        price=10.0,
        previous_close=9.0,
        change=1.0,
        change_percent=11.111,
        as_of=datetime.now(timezone.utc),
        price_date=date.today(),
        data_kind="intraday_15m",
        freshness="delayed",
        status="ok",
    )


def ready():
    now = datetime.now(timezone.utc)
    manager.snapshot = Snapshot(now, tuple(sample(s) for s in STOCKS))
    manager.last_refresh_at = manager.last_successful_refresh_at = now
    manager.last_refresh_succeeded = True


def test_warmup_and_not_ready():
    manager.snapshot = None
    assert client.get("/health").json() == {"status": "warming_up", "ready": False}
    assert client.get("/v1/equities").status_code == 503
    assert client.get("/v1/equities").json() == {"error": "data_not_ready"}


def test_full_and_market_filters_are_cached():
    ready()
    full = client.get("/v1/equities").json()
    assert len(full["items"]) == 10 and full["nominalDelayMinutes"] == 15
    assert len(client.get("/v1/equities?market=us").json()["items"]) == 6
    assert len(client.get("/v1/equities?market=BIST").json()["items"]) == 4


def test_symbol_alias_filters_and_single_lookup():
    ready()
    response = client.get("/v1/equities?symbols=AAPL,THYAO.IS").json()
    assert [item["symbol"] for item in response["items"]] == ["AAPL", "THYAO"]
    assert client.get("/v1/equities/thyao.is").json()["symbol"] == "THYAO"
    assert client.get("/v1/equities?symbols=BAD").status_code == 400
    assert client.get("/v1/equities/BAD").status_code == 404


def test_json_has_only_native_finite_numbers():
    ready()
    response = client.get("/v1/equities")
    assert response.status_code == 200 and "NaN" not in response.text and "Infinity" not in response.text
    json.dumps(response.json(), allow_nan=False)


def test_missing_configured_item_is_controlled_503_and_unknown_is_404():
    ready()
    manager.snapshot = Snapshot(manager.snapshot.generated_at, manager.snapshot.items[1:])
    assert client.get("/v1/equities/AAPL").status_code == 503
    assert client.get("/v1/equities/AAPL").json() == {"error": "symbol_data_not_ready"}
    assert client.get("/v1/equities/UNKNOWN").status_code == 404


def test_health_counts_stale_and_error_items():
    ready()
    stale = sample(STOCKS[0]).stale_copy("refresh_failed")
    from app.yahoo_client import error_quote
    manager.snapshot = Snapshot(manager.snapshot.generated_at, (stale, error_quote(STOCKS[1], "timeout")))
    manager.last_refresh_succeeded = False
    body = client.get("/health").json()
    assert body["lastRefreshSucceeded"] is False
    assert body["staleItemCount"] == 1 and body["errorItemCount"] == 1


def test_daily_and_intraday_date_serialization():
    ready()
    daily = sample(STOCKS[0])
    daily = Quote(
        symbol=daily.symbol,
        provider_symbol=daily.provider_symbol,
        display_name=daily.display_name,
        market=daily.market,
        exchange=daily.exchange,
        currency=daily.currency,
        price=daily.price,
        previous_close=None,
        change=None,
        change_percent=None,
        as_of=None,
        price_date=date(2026, 7, 24),
        data_kind="daily_close",
        freshness="eod",
        status="ok",
    )
    manager.snapshot = Snapshot(manager.snapshot.generated_at, (daily, sample(STOCKS[1])))
    items = client.get("/v1/equities").json()["items"]
    assert items[0]["priceDate"] == "2026-07-24" and items[0]["asOf"] is None
    assert items[1]["asOf"].endswith("Z") and items[1]["priceDate"]


def test_requests_do_not_trigger_collection(monkeypatch):
    ready()
    refresh = Mock(wraps=manager.refresh)
    monkeypatch.setattr(manager, "refresh", refresh)
    import app.yahoo_client as yahoo_client
    ticker = Mock(side_effect=AssertionError("HTTP request attempted Yahoo access"))
    monkeypatch.setattr(yahoo_client.yf, "Ticker", ticker)
    assert client.get("/health").status_code == 200
    assert client.get("/v1/equities/AAPL").status_code == 200
    assert refresh.call_count == 0
    assert ticker.call_count == 0


def test_cors_only_reflects_configured_origin(monkeypatch):
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://allowed.example")
    import app.main as main_module
    configured = importlib.reload(main_module)
    cors_client = TestClient(configured.app)
    allowed = cors_client.get("/health", headers={"Origin": "https://allowed.example"})
    denied = cors_client.get("/health", headers={"Origin": "https://denied.example"})
    assert allowed.headers["access-control-allow-origin"] == "https://allowed.example"
    assert "access-control-allow-origin" not in denied.headers
