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
from .models import Quote, StockConfig, StockResult

LOGGER = logging.getLogger(__name__)
MAX_ATTEMPTS = 3


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
    return Quote(stock.symbol, stock.provider_symbol or stock.symbol, stock.display_name, stock.market,
                 stock.exchange, stock.currency, price, previous, change, percent,
                 (latest_at + pd.Timedelta(minutes=15)).to_pydatetime(), "intraday_15m", "delayed", "ok")


def fetch_quote(stock: StockConfig, now: datetime | None = None) -> Quote:
    history, category = _history_with_retry(stock, intraday=True)
    quote = parse_intraday(stock, history, now) if history is not None else None
    if quote is not None:
        return quote
    time.sleep(request_delay() + random.uniform(0, 0.75))
    daily = fetch_latest_close(stock)
    if daily.latest_close is not None:
        as_of = datetime.combine(daily.closing_date, datetime.min.time(), tzinfo=timezone.utc)
        return Quote(stock.symbol, stock.provider_symbol or stock.symbol, stock.display_name, stock.market,
                     stock.exchange, stock.currency, float(daily.latest_close), None, None, None,
                     as_of, "daily_close", "eod", "ok")
    failure = category or (daily.error or "invalid_data").split(" (")[-1].rstrip(")").replace(" ", "_").lower()
    return Quote(stock.symbol, stock.provider_symbol or stock.symbol, stock.display_name, stock.market,
                 stock.exchange, stock.currency, None, None, None, None, None, None, None,
                 "error", False, failure)


def collect_quotes(stocks: Sequence[StockConfig]) -> list[Quote]:
    results: list[Quote] = []
    delay = request_delay()
    for index, stock in enumerate(stocks):
        results.append(fetch_quote(stock))
        if index < len(stocks) - 1:
            time.sleep(delay + random.uniform(0, 0.75))
    return results
