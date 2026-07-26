import asyncio
import threading
from datetime import datetime, timezone

import pytest

from app.config import refresh_seconds
from app.models import Quote
from app.snapshot import SnapshotManager
from app.symbols import STOCKS


def quote(symbol="AAPL", status="ok", price=10.0):
    stock = next(s for s in STOCKS if s.symbol == symbol)
    return Quote(
        symbol=stock.symbol,
        provider_symbol=stock.provider_symbol,
        display_name=stock.display_name,
        market=stock.market,
        exchange=stock.exchange,
        currency=stock.currency,
        price=price,
        previous_close=None,
        change=None,
        change_percent=None,
        as_of=datetime.now(timezone.utc) if price else None,
        price_date=datetime.now(timezone.utc).date() if price else None,
        data_kind="intraday_15m" if price else None,
        freshness="delayed" if price else None,
        status=status,
        error_category="timeout" if status == "error" else None,
    )


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


def test_collector_exception_without_snapshot_remains_not_ready():
    def fail(_stocks):
        raise RuntimeError("upstream detail")
    manager = SnapshotManager(STOCKS[:1], fail)
    asyncio.run(manager.refresh())
    assert manager.snapshot is None
    assert manager.last_refresh_succeeded is False


def test_collector_exception_marks_existing_values_stale_without_success_time_change():
    calls = 0
    def collector(_stocks):
        nonlocal calls
        calls += 1
        if calls == 1:
            return [quote()]
        raise RuntimeError("upstream detail")
    manager = SnapshotManager(STOCKS[:1], collector)
    asyncio.run(manager.refresh())
    successful_at = manager.last_successful_refresh_at
    asyncio.run(manager.refresh())
    item = manager.snapshot.items[0]
    assert item.status == "stale" and item.stale is True and item.price == 10
    assert item.error_category == "refresh_failed"
    assert manager.last_successful_refresh_at == successful_at
    assert manager.last_refresh_succeeded is False


def test_incomplete_duplicate_unknown_output_is_canonical_and_complete():
    # AAPL succeeds twice, TSLA is omitted, and a symbol outside this manager is returned.
    manager = SnapshotManager(STOCKS[:2], lambda _stocks: [quote("AAPL"), quote("AAPL"), quote("THYAO")])
    asyncio.run(manager.refresh())
    assert [item.symbol for item in manager.snapshot.items] == ["AAPL", "TSLA"]
    assert manager.snapshot.items[1].status == "error" and manager.snapshot.items[1].price is None


def test_missing_symbol_preserves_previous_value_as_stale():
    batches = [[quote("AAPL"), quote("TSLA")], [quote("AAPL")]]
    manager = SnapshotManager(STOCKS[:2], lambda _stocks: batches.pop(0))
    asyncio.run(manager.refresh())
    asyncio.run(manager.refresh())
    assert [item.symbol for item in manager.snapshot.items] == ["AAPL", "TSLA"]
    assert manager.snapshot.items[1].status == "stale"
    assert manager.snapshot.items[1].error_category == "missing_from_refresh"


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
