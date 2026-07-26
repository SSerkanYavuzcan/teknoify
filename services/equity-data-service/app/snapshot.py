"""In-memory full-list snapshot and non-overlapping refresh management."""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Callable, Sequence

from .models import Quote, StockConfig
from .yahoo_client import collect_quotes

LOGGER = logging.getLogger(__name__)


@dataclass(frozen=True)
class Snapshot:
    generated_at: datetime
    items: tuple[Quote, ...]


class SnapshotManager:
    def __init__(self, stocks: Sequence[StockConfig], collector: Callable[[Sequence[StockConfig]], list[Quote]] = collect_quotes) -> None:
        self.stocks = tuple(stocks)
        self.collector = collector
        self.snapshot: Snapshot | None = None
        self.last_refresh_at: datetime | None = None
        self.last_successful_refresh_at: datetime | None = None
        self._lock = asyncio.Lock()

    async def refresh(self) -> bool:
        if self._lock.locked():
            return False
        async with self._lock:
            LOGGER.info("Equity refresh start")
            try:
                incoming = await asyncio.to_thread(self.collector, self.stocks)
            except Exception:
                self.last_refresh_at = datetime.now(timezone.utc)
                LOGGER.exception("Equity refresh failed")
                return True
            now = datetime.now(timezone.utc)
            previous = {quote.symbol: quote for quote in self.snapshot.items} if self.snapshot else {}
            items: list[Quote] = []
            for quote in incoming:
                if quote.status == "ok":
                    items.append(quote)
                elif quote.symbol in previous and previous[quote.symbol].price is not None:
                    items.append(previous[quote.symbol].stale_copy(quote.error_category))
                else:
                    items.append(quote)
                if items[-1].status != "ok":
                    LOGGER.warning("%s refresh result (%s)", quote.symbol, quote.error_category or quote.status)
            self.snapshot = Snapshot(now, tuple(items))
            self.last_refresh_at = now
            if any(item.status == "ok" for item in items):
                self.last_successful_refresh_at = now
            counts = {status: sum(item.status == status for item in items) for status in ("ok", "stale", "error")}
            LOGGER.info("Equity refresh complete: %d ok, %d stale, %d failed", counts["ok"], counts["stale"], counts["error"])
            return True
