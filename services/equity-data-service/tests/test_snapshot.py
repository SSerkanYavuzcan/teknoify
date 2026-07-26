import asyncio
import threading
from datetime import datetime, timezone

import pytest

from app.config import refresh_seconds
from app.models import Quote
from app.snapshot import SnapshotManager
from app.symbols import STOCKS


def quote(symbol="XU100", status="ok", price=10.0):
    stock = next(s for s in STOCKS if s.symbol == symbol)
    return Quote(symbol=stock.symbol, provider_symbol=stock.provider_symbol,
                 display_name=stock.display_name, market=stock.market, exchange=stock.exchange,
                 currency=stock.currency, price=price, previous_close=None, change=None,
                 change_percent=None, as_of=datetime.now(timezone.utc) if price else None,
                 price_date=datetime.now(timezone.utc).date() if price else None,
                 data_kind="intraday_15m" if price else None, freshness="delayed" if price else None,
                 status=status, error_category="timeout" if status == "error" else None)


def test_success_then_failure_is_preserved_stale():
    batches = [[quote()], [quote(status="error", price=None)]]
    manager = SnapshotManager(STOCKS[:1], lambda _stocks: batches.pop(0))
    asyncio.run(manager.refresh())
    assert manager.snapshot.items[0].status == "ok"
    asyncio.run(manager.refresh())
    assert manager.snapshot.items[0].status == "stale" and manager.snapshot.items[0].price == 10


def test_never_successful_remains_null_error():
    manager = SnapshotManager(STOCKS[:1], lambda _stocks: [quote(status="error", price=None)])
    asyncio.run(manager.refresh())
    assert manager.snapshot.items[0].status == "error" and manager.snapshot.items[0].price is None


def test_complete_failure_without_snapshot_stays_not_ready():
    manager = SnapshotManager(STOCKS[:1], lambda _stocks: (_ for _ in ()).throw(RuntimeError("secret")))
    asyncio.run(manager.refresh())
    assert manager.snapshot is None
    assert manager.last_refresh_at is not None and manager.last_successful_refresh_at is None
    assert manager.last_refresh_succeeded is False


def test_complete_failure_preserves_values_as_stale():
    batches = [[quote()], RuntimeError("secret")]
    def collect(_stocks):
        value = batches.pop(0)
        if isinstance(value, Exception):
            raise value
        return value
    manager = SnapshotManager(STOCKS[:1], collect)
    asyncio.run(manager.refresh())
    successful_at = manager.last_successful_refresh_at
    original = manager.snapshot.items[0]
    asyncio.run(manager.refresh())
    failed = manager.snapshot.items[0]
    assert failed.status == "stale" and failed.stale and failed.error_category == "refresh_failed"
    assert (failed.price, failed.as_of, failed.price_date, failed.data_kind) == (
        original.price, original.as_of, original.price_date, original.data_kind)
    assert manager.last_successful_refresh_at == successful_at
    assert manager.last_refresh_succeeded is False


def test_snapshot_rebuilds_in_allowlist_order_and_handles_bad_output():
    stocks = STOCKS[:3]
    previous = [quote(stocks[0].symbol), quote(stocks[1].symbol)]
    batches = [previous, [quote(stocks[1].symbol, price=20), quote(stocks[1].symbol, price=30),
                          quote(STOCKS[3].symbol)]]
    manager = SnapshotManager(stocks, lambda _stocks: batches.pop(0))
    asyncio.run(manager.refresh())
    asyncio.run(manager.refresh())
    assert [item.symbol for item in manager.snapshot.items] == [stock.symbol for stock in stocks]
    assert manager.snapshot.items[0].status == "stale"
    assert manager.snapshot.items[1].price == 20
    assert manager.snapshot.items[2].status == "error"
    assert manager.snapshot.items[2].error_category == "missing_result"


def test_overlap_is_skipped():
    gate = threading.Event()
    entered = threading.Event()
    def slow(_stocks):
        entered.set()
        gate.wait()
        return [quote()]
    manager = SnapshotManager(STOCKS[:1], slow)
    async def scenario():
        first = asyncio.create_task(manager.refresh())
        await asyncio.to_thread(entered.wait)
        assert await manager.refresh() is False
        gate.set()
        assert await first is True
    asyncio.run(scenario())


@pytest.mark.parametrize(("raw", "expected"), [("bad", 900), ("nan", 900), ("inf", 900), ("1", 300), ("5000", 3600), ("600", 600)])
def test_refresh_validation(raw, expected):
    assert refresh_seconds(raw) == expected


def test_snapshot_contains_indices_in_canonical_order():
    manager = SnapshotManager(STOCKS, lambda stocks: [quote(stock.symbol) for stock in stocks])
    asyncio.run(manager.refresh())
    assert [item.symbol for item in manager.snapshot.items] == [stock.symbol for stock in STOCKS]
    assert {"XU100", "SP500"}.issubset(item.symbol for item in manager.snapshot.items)


@pytest.mark.parametrize("prior", [True, False])
def test_missing_index_uses_stale_prior_or_null_error(prior):
    index = next(stock for stock in STOCKS if stock.symbol == "XU100")
    batches = [[quote("XU100")], []] if prior else [[]]
    manager = SnapshotManager([index], lambda _stocks: batches.pop(0))
    if prior:
        asyncio.run(manager.refresh())
    asyncio.run(manager.refresh())
    item = manager.snapshot.items[0]
    assert item.status == ("stale" if prior else "error")
    assert item.price == (10.0 if prior else None)
    assert item.error_category == "missing_result"
