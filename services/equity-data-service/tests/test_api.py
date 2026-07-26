from datetime import datetime, timezone

from fastapi.middleware.cors import CORSMiddleware
from fastapi.testclient import TestClient

from app.main import app, manager
from app.models import Quote
from app.snapshot import Snapshot
from app.symbols import STOCKS


client = TestClient(app)


def sample(stock):
    return Quote(symbol=stock.symbol, provider_symbol=stock.provider_symbol,
                 display_name=stock.display_name, market=stock.market, exchange=stock.exchange,
                 currency=stock.currency, price=10.0, previous_close=9.0, change=1.0,
                 change_percent=11.111, as_of=datetime.now(timezone.utc),
                 price_date=datetime.now(timezone.utc).date(), data_kind="intraday_15m",
                 freshness="delayed", status="ok")


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
    assert client.get("/v1/equities/AAPL").json() == {"error": "data_not_ready"}


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


def test_configured_missing_symbol_is_controlled_503():
    ready()
    manager.snapshot = Snapshot(manager.snapshot.generated_at, manager.snapshot.items[1:])
    response = client.get("/v1/equities/AAPL")
    assert response.status_code == 503
    assert response.json() == {"error": "symbol_data_not_ready"}


def test_health_counts_and_price_date_metadata():
    ready()
    manager.snapshot = Snapshot(manager.snapshot.generated_at,
                                (manager.snapshot.items[0].stale_copy("timeout"),
                                 sample(STOCKS[1]).__class__(**{
                                     **sample(STOCKS[1]).__dict__, "status": "error"}),
                                 *manager.snapshot.items[2:]))
    health = client.get("/health").json()
    assert health["lastRefreshSucceeded"] is True
    assert health["staleItemCount"] == 1 and health["errorItemCount"] == 1
    item = client.get("/v1/equities/AAPL").json()
    assert item["priceDate"] and item["asOf"].endswith("Z")


def test_json_has_only_native_finite_numbers():
    ready()
    response = client.get("/v1/equities")
    assert response.status_code == 200 and "NaN" not in response.text and "Infinity" not in response.text


def test_daily_json_has_price_date_and_null_as_of():
    ready()
    daily = sample(STOCKS[0])
    daily = daily.__class__(**{**daily.__dict__, "as_of": None, "price_date": datetime(2026, 7, 24).date(),
                               "data_kind": "daily_close", "freshness": "eod"})
    manager.snapshot = Snapshot(manager.snapshot.generated_at, (daily, *manager.snapshot.items[1:]))
    item = client.get("/v1/equities/AAPL").json()
    assert item["priceDate"] == "2026-07-24" and item["asOf"] is None


def test_http_requests_do_not_refresh(monkeypatch):
    ready()
    called = False
    async def unexpected_refresh():
        nonlocal called
        called = True
    monkeypatch.setattr(manager, "refresh", unexpected_refresh)
    assert client.get("/health").status_code == 200
    assert client.get("/v1/equities/AAPL").status_code == 200
    assert called is False


def test_cors_only_reflects_configured_origin():
    cors_client = TestClient(CORSMiddleware(app, allow_origins=["https://allowed.example"],
                                            allow_methods=["GET"], allow_headers=[]))
    allowed = cors_client.options("/health", headers={"Origin": "https://allowed.example",
                                                       "Access-Control-Request-Method": "GET"})
    denied = cors_client.options("/health", headers={"Origin": "https://denied.example",
                                                      "Access-Control-Request-Method": "GET"})
    assert allowed.headers["access-control-allow-origin"] == "https://allowed.example"
    assert "access-control-allow-origin" not in denied.headers
