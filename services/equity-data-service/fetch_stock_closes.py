"""Collect the latest available completed daily close for configured equities."""

from __future__ import annotations

import logging
import math
import os
import random
import time
from dataclasses import dataclass
from datetime import date
from typing import Sequence

import pandas as pd
import yfinance as yf
from tabulate import tabulate

LOGGER = logging.getLogger(__name__)
DEFAULT_REQUEST_DELAY_SECONDS = 2.0
MAX_ATTEMPTS = 3


@dataclass(frozen=True)
class StockConfig:
    symbol: str
    display_name: str
    market: str
    currency: str


@dataclass
class StockResult:
    symbol: str
    display_name: str
    market: str
    currency: str
    latest_close: float | None
    closing_date: date | None
    status: str
    error: str | None = None


STOCKS: tuple[StockConfig, ...] = (
    StockConfig("AAPL", "Apple", "US", "USD"),
    StockConfig("TSLA", "Tesla", "US", "USD"),
    StockConfig("MSFT", "Microsoft", "US", "USD"),
    StockConfig("NVDA", "NVIDIA", "US", "USD"),
    StockConfig("THYAO.IS", "Türk Hava Yolları", "BIST", "TRY"),
    StockConfig("EREGL.IS", "Ereğli Demir ve Çelik", "BIST", "TRY"),
    StockConfig("ASELS.IS", "ASELSAN", "BIST", "TRY"),
    StockConfig("BIMAS.IS", "BİM Birleşik Mağazalar", "BIST", "TRY"),
)


def get_request_delay() -> float:
    """Return the configured inter-symbol delay, or a safe default."""
    raw_value = os.getenv("YF_REQUEST_DELAY_SECONDS")
    if raw_value is None:
        return DEFAULT_REQUEST_DELAY_SECONDS
    try:
        delay = float(raw_value)
    except ValueError:
        LOGGER.warning("Invalid YF_REQUEST_DELAY_SECONDS; using %.1f", DEFAULT_REQUEST_DELAY_SECONDS)
        return DEFAULT_REQUEST_DELAY_SECONDS
    if not math.isfinite(delay) or delay < 0:
        LOGGER.warning("Invalid YF_REQUEST_DELAY_SECONDS; using %.1f", DEFAULT_REQUEST_DELAY_SECONDS)
        return DEFAULT_REQUEST_DELAY_SECONDS
    return delay


def _error_result(stock: StockConfig, message: str) -> StockResult:
    return StockResult(
        stock.symbol,
        stock.display_name,
        stock.market,
        stock.currency,
        None,
        None,
        "ERROR",
        message,
    )


def _parse_history(stock: StockConfig, history: pd.DataFrame) -> StockResult:
    if history.empty:
        return _error_result(stock, "No price history returned")
    if "Close" not in history.columns:
        return _error_result(stock, "Close data unavailable")

    valid_closes = history["Close"].dropna()
    if valid_closes.empty:
        return _error_result(stock, "No valid closing prices returned")

    timestamp = pd.Timestamp(valid_closes.index[-1])
    closing_date = timestamp.date()
    return StockResult(
        stock.symbol,
        stock.display_name,
        stock.market,
        stock.currency,
        float(valid_closes.iloc[-1]),
        closing_date,
        "OK",
    )


def fetch_latest_close(stock: StockConfig) -> StockResult:
    """Fetch one symbol, retrying transient exceptions up to three times."""
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            history = yf.Ticker(stock.symbol).history(
                period="5d",
                interval="1d",
                auto_adjust=False,
                actions=False,
                timeout=10,
            )
            # Empty or structurally invalid responses are deterministic for this run.
            return _parse_history(stock, history)
        except Exception as exc:  # Symbol boundary: a failure must not stop the batch.
            category = type(exc).__name__
            if attempt == MAX_ATTEMPTS:
                LOGGER.error("%s failed (%s)", stock.symbol, category)
                return _error_result(stock, f"Request failed ({category})")
            LOGGER.warning(
                "%s request failed (%s); retrying with attempt %d of %d",
                stock.symbol,
                category,
                attempt + 1,
                MAX_ATTEMPTS,
            )
            time.sleep((2 ** attempt) + random.uniform(0, 0.75))

    return _error_result(stock, "Request failed")  # Defensive; the loop always returns.


def collect_stock_closes(stocks: Sequence[StockConfig]) -> list[StockResult]:
    """Collect symbols serially, pausing after every processed symbol."""
    results: list[StockResult] = []
    request_delay = get_request_delay()
    for stock in stocks:
        LOGGER.info("Processing %s", stock.symbol)
        try:
            result = fetch_latest_close(stock)
        except Exception as exc:  # Keep orchestration resilient to unexpected symbol errors.
            category = type(exc).__name__
            LOGGER.error("%s failed unexpectedly (%s)", stock.symbol, category)
            result = _error_result(stock, f"Collection failed ({category})")
        results.append(result)
        time.sleep(request_delay + random.uniform(0, 0.75))
    return results


def render_results_table(results: Sequence[StockResult]) -> str:
    """Render results without exposing pandas indexes or upstream details."""
    rows = [
        [
            result.symbol,
            result.display_name,
            result.market,
            result.currency,
            f"{result.latest_close:.2f}" if result.latest_close is not None else "—",
            result.closing_date.isoformat() if result.closing_date is not None else "—",
            result.status,
        ]
        for result in results
    ]
    return tabulate(
        rows,
        headers=["Symbol", "Company", "Market", "Currency", "Last Close", "Close Date", "Status"],
        tablefmt="simple",
        disable_numparse=True,
    )


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    LOGGER.info("Collector start: %d symbols", len(STOCKS))
    try:
        results = collect_stock_closes(STOCKS)
    except Exception as exc:
        LOGGER.error("Collector could not run (%s)", type(exc).__name__)
        return 1
    print(render_results_table(results))
    failures = sum(result.status != "OK" for result in results)
    LOGGER.info("Collector complete: %d succeeded, %d failed", len(results) - failures, failures)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
