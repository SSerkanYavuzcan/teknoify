"""Backward-compatible CLI for completed Yahoo Finance daily closes."""

from __future__ import annotations

import logging
import random
import time
from typing import Sequence

from tabulate import tabulate
import yfinance as yf  # Compatibility: callers may patch this shared module object.

from app.config import DEFAULT_REQUEST_DELAY_SECONDS, request_delay
from app.models import StockConfig, StockResult
from app.symbols import STOCKS
from app.yahoo_client import MAX_ATTEMPTS, error_result as _error_result, fetch_latest_close, parse_daily_history as _parse_history

LOGGER = logging.getLogger(__name__)


def get_request_delay() -> float:
    return request_delay()


def collect_stock_closes(stocks: Sequence[StockConfig]) -> list[StockResult]:
    results: list[StockResult] = []
    delay = get_request_delay()
    for index, stock in enumerate(stocks):
        LOGGER.info("Processing %s", stock.provider_symbol)
        try:
            results.append(fetch_latest_close(stock))
        except Exception as exc:
            category = type(exc).__name__
            results.append(_error_result(stock, f"Collection failed ({category})"))
        if index < len(stocks) - 1:
            time.sleep(delay + random.uniform(0, 0.75))
    return results


def render_results_table(results: Sequence[StockResult]) -> str:
    rows = [[r.symbol, r.display_name, r.market, r.currency,
             f"{r.latest_close:.2f}" if r.latest_close is not None else "—",
             r.closing_date.isoformat() if r.closing_date else "—", r.status] for r in results]
    return tabulate(rows, headers=["Symbol", "Company", "Market", "Currency", "Last Close", "Close Date", "Status"],
                    tablefmt="simple", disable_numparse=True)


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    LOGGER.info("Collector start: %d symbols", len(STOCKS))
    results = collect_stock_closes(STOCKS)
    print(render_results_table(results))
    failures = sum(result.status != "OK" for result in results)
    LOGGER.info("Collector complete: %d succeeded, %d failed", len(results) - failures, failures)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
