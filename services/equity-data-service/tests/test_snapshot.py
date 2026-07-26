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
    return Quote(stock.symbol, stock.provider_symbol, stock.display_name, stock.market, stock.exchange,
                 stock.currency, price, None, None, None, datetime.now(timezone.utc) if price else None,
                 "intraday_15m" if price else None, "delayed" if price else None, status,
                 error_category="timeout" if status == "error" else None)


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
