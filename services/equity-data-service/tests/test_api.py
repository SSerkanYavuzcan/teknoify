from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.main import app, manager
from app.models import Quote
from app.snapshot import Snapshot
from app.symbols import STOCKS


client = TestClient(app)


def sample(stock):
    return Quote(stock.symbol, stock.provider_symbol, stock.display_name, stock.market, stock.exchange,
                 stock.currency, 10.0, 9.0, 1.0, 11.111, datetime.now(timezone.utc),
                 "intraday_15m", "delayed", "ok")


def ready():
    now = datetime.now(timezone.utc)
    manager.snapshot = Snapshot(now, tuple(sample(s) for s in STOCKS))
    manager.last_refresh_at = manager.last_successful_refresh_at = now


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
