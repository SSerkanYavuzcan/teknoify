"""Sequential, bounded Yahoo collectors and response parsing."""

from __future__ import annotations

import logging
import math
import random
import time
from datetime import datetime, timedelta, timezone
from typing import Sequence

import pandas as pd
import yfinance as yf

from .config import request_delay
from .models import Quote, StockConfig, StockResult, iso_utc

LOGGER = logging.getLogger(__name__)
MAX_ATTEMPTS = 3
HISTORY_OPTIONS = {
    ("1d", "15m"), ("5d", "15m"),
    ("1d", "1d"), ("5d", "1d"), ("1m", "1d"),
}


def error_result(stock: StockConfig, message: str) -> StockResult:
    return StockResult(stock.provider_symbol or stock.symbol, stock.display_name, stock.market,
                       stock.currency, None, None, "ERROR", message)


def parse_daily_history(stock: StockConfig, history: pd.DataFrame) -> StockResult:
    if not isinstance(history, pd.DataFrame) or history.empty:
        return error_result(stock, "No price history returned")
    if "Close" not in history.columns:
        return error_result(stock, "Close data unavailable")
    closes = pd.to_numeric(history["Close"], errors="coerce")
    closes = closes[closes.map(lambda value: math.isfinite(float(value)) if pd.notna(value) else False)]
    if closes.empty:
        return error_result(stock, "No valid closing prices returned")
    stamp = pd.Timestamp(closes.index[-1])
    return StockResult(stock.provider_symbol or stock.symbol, stock.display_name, stock.market,
                       stock.currency, float(closes.iloc[-1]), stamp.date(), "OK")


def _history_with_retry(stock: StockConfig, *, intraday: bool) -> tuple[pd.DataFrame | None, str | None]:
    arguments = dict(period="5d", interval="15m" if intraday else "1d", auto_adjust=False,
                     actions=False, timeout=10)
    if intraday:
        arguments["prepost"] = False
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            return yf.Ticker(stock.provider_symbol).history(**arguments), None
        except Exception as exc:  # safe symbol boundary
            category = type(exc).__name__
            if attempt == MAX_ATTEMPTS:
                LOGGER.warning("%s failed (%s)", stock.provider_symbol, category)
                return None, category
            time.sleep((2 ** attempt) + random.uniform(0, 0.75))
    return None, "request_error"


def fetch_latest_close(stock: StockConfig) -> StockResult:
    history, category = _history_with_retry(stock, intraday=False)
    return error_result(stock, f"Request failed ({category})") if history is None else parse_daily_history(stock, history)


def parse_intraday(stock: StockConfig, history: pd.DataFrame,
                   now: datetime | None = None) -> Quote | None:
    if not isinstance(history, pd.DataFrame) or history.empty or "Close" not in history.columns:
        return None
    frame = pd.DataFrame({"Close": pd.to_numeric(history["Close"], errors="coerce")})
    frame = frame[frame["Close"].map(lambda x: pd.notna(x) and math.isfinite(float(x)))]
    if frame.empty:
        return None
    index = pd.DatetimeIndex(pd.to_datetime(frame.index))
    if index.tz is None:
        index = index.tz_localize(stock.timezone, ambiguous="NaT", nonexistent="NaT")
    index = index.tz_convert("UTC")
    frame.index = index
    frame = frame[~frame.index.isna()].sort_index()
    frame = frame[~frame.index.duplicated(keep="last")]
    current = pd.Timestamp(now or datetime.now(timezone.utc))
    if current.tzinfo is None:
        current = current.tz_localize("UTC")
    completed = frame[frame.index + pd.Timedelta(minutes=15) <= current.tz_convert("UTC")]
    if completed.empty:
        return None
    latest_at = completed.index[-1]
    price = float(completed.iloc[-1]["Close"])
    local_dates = completed.index.tz_convert(stock.timezone).date
    latest_date = local_dates[-1]
    previous_dates = sorted({day for day in local_dates if day < latest_date})
    previous = None
    if previous_dates:
        previous = float(completed.loc[local_dates == previous_dates[-1], "Close"].iloc[-1])
    change = price - previous if previous is not None else None
    percent = change / previous * 100 if change is not None and previous != 0 else None
    return Quote(symbol=stock.symbol, provider_symbol=stock.provider_symbol or stock.symbol,
                 display_name=stock.display_name, market=stock.market, exchange=stock.exchange,
                 currency=stock.currency, price=price, previous_close=previous, change=change,
                 change_percent=percent, as_of=(latest_at + pd.Timedelta(minutes=15)).to_pydatetime(),
                 price_date=latest_date, data_kind="intraday_15m", freshness="delayed", status="ok")


def fetch_quote(stock: StockConfig, now: datetime | None = None) -> Quote:
    history, category = _history_with_retry(stock, intraday=True)
    quote = parse_intraday(stock, history, now) if history is not None else None
    if quote is not None:
        return quote
    time.sleep(request_delay() + random.uniform(0, 0.75))
    daily = fetch_latest_close(stock)
    if daily.latest_close is not None:
        return Quote(symbol=stock.symbol, provider_symbol=stock.provider_symbol or stock.symbol,
                     display_name=stock.display_name, market=stock.market, exchange=stock.exchange,
                     currency=stock.currency, price=float(daily.latest_close), previous_close=None,
                     change=None, change_percent=None, as_of=None, price_date=daily.closing_date,
                     data_kind="daily_close", freshness="eod", status="ok")
    failure = category or (daily.error or "invalid_data").split(" (")[-1].rstrip(")").replace(" ", "_").lower()
    return error_quote(stock, failure)


def error_quote(stock: StockConfig, category: str) -> Quote:
    return Quote(symbol=stock.symbol, provider_symbol=stock.provider_symbol or stock.symbol,
                 display_name=stock.display_name, market=stock.market, exchange=stock.exchange,
                 currency=stock.currency, price=None, previous_close=None, change=None,
                 change_percent=None, as_of=None, price_date=None, data_kind=None, freshness=None,
                 status="error", stale=False, error_category=category)


def collect_quotes(stocks: Sequence[StockConfig]) -> list[Quote]:
    results: list[Quote] = []
    delay = request_delay()
    for index, stock in enumerate(stocks):
        try:
            results.append(fetch_quote(stock))
        except Exception as exc:
            LOGGER.warning("%s failed (%s)", stock.provider_symbol, type(exc).__name__)
            results.append(error_quote(stock, type(exc).__name__))
        if index < len(stocks) - 1:
            time.sleep(delay + random.uniform(0, 0.75))
    return results


def fetch_history(stock: StockConfig, period: str, interval: str) -> list[dict[str, object]]:
    """Fetch and normalize a compact, JSON-safe Yahoo close series."""
    if (period, interval) not in HISTORY_OPTIONS:
        raise ValueError("unsupported_history_range_interval")
    arguments = dict(period=period, interval=interval, auto_adjust=False, actions=False, timeout=10)
    if interval == "15m":
        arguments["prepost"] = False
    history = None
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            history = yf.Ticker(stock.provider_symbol).history(**arguments)
            break
        except Exception as exc:
            if attempt == MAX_ATTEMPTS:
                LOGGER.warning("History for %s failed (%s)", stock.provider_symbol, type(exc).__name__)
                raise RuntimeError("history_upstream_error") from exc
            time.sleep((2 ** attempt) + random.uniform(0, 0.75))
    if not isinstance(history, pd.DataFrame) or history.empty or "Close" not in history.columns:
        return []
    closes = pd.to_numeric(history["Close"], errors="coerce")
    index = pd.DatetimeIndex(pd.to_datetime(closes.index, errors="coerce"))
    if index.tz is None:
        index = index.tz_localize(stock.timezone, ambiguous="NaT", nonexistent="NaT")
    index = index.tz_convert("UTC")
    points = []
    for stamp, value in zip(index, closes):
        if pd.isna(stamp) or pd.isna(value) or not math.isfinite(float(value)):
            continue
        points.append({"t": iso_utc(stamp.to_pydatetime()), "v": float(value)})
    return points
