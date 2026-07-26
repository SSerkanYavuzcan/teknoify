from datetime import datetime, timezone
from unittest.mock import Mock

import pandas as pd
import pytest

from app.models import StockConfig
from app import yahoo_client


US = StockConfig("AAPL", "Apple", "US", "USD", "AAPL", "NASDAQ", "America/New_York")
BIST = StockConfig("THYAO", "THY", "BIST", "TRY", "THYAO.IS", "BIST", "Europe/Istanbul")


@pytest.mark.parametrize(
    ("stock", "index", "expected"),
    [
        (US, ["2026-07-23 15:30", "2026-07-24 15:30"], "2026-07-24T19:45:00+00:00"),
        (BIST, ["2026-07-23 12:00", "2026-07-24 12:00"], "2026-07-24T09:15:00+00:00"),
    ],
)
def test_naive_indexes_use_market_timezone(stock, index, expected):
    quote = yahoo_client.parse_intraday(
        stock, pd.DataFrame({"Close": [100, 105]}, index=pd.to_datetime(index)),
        datetime(2026, 7, 24, 21, tzinfo=timezone.utc),
    )
    assert quote.as_of.isoformat() == expected
    assert quote.previous_close == 100
    assert quote.change == 5
    assert quote.change_percent == pytest.approx(5)
    assert quote.price_date.isoformat() == "2026-07-24"


def test_aware_history_filters_incomplete_duplicates_and_invalid_values():
    index = pd.to_datetime(["2026-07-23 14:00Z", "2026-07-24 14:00Z", "2026-07-24 14:00Z",
                            "2026-07-24 14:15Z", "2026-07-24 14:30Z", "2026-07-24 14:45Z"])
    history = pd.DataFrame({"Close": [90, 100, 101, float("nan"), float("inf"), 999]}, index=index)
    quote = yahoo_client.parse_intraday(US, history, datetime(2026, 7, 24, 14, 50, tzinfo=timezone.utc))
    assert quote.price == 101
    assert quote.previous_close == 90
    assert quote.as_of == datetime(2026, 7, 24, 14, 15, tzinfo=timezone.utc)


def test_no_previous_session_has_null_changes():
    history = pd.DataFrame({"Close": [10, 11]}, index=pd.to_datetime(["2026-07-24 10:00", "2026-07-24 10:15"]))
    quote = yahoo_client.parse_intraday(BIST, history, datetime(2026, 7, 24, 12, tzinfo=timezone.utc))
    assert quote.previous_close is quote.change is quote.change_percent is None


def test_intraday_failure_uses_daily_fallback(monkeypatch):
    intraday = pd.DataFrame()
    daily = pd.DataFrame({"Close": [12.5]}, index=pd.to_datetime(["2026-07-24"]))
    ticker = Mock()
    ticker.history.side_effect = [intraday, daily]
    monkeypatch.setattr(yahoo_client.yf, "Ticker", Mock(return_value=ticker))
    monkeypatch.setattr(yahoo_client.time, "sleep", Mock())
    monkeypatch.setattr(yahoo_client.random, "uniform", lambda *_: 0)
    quote = yahoo_client.fetch_quote(US)
    assert quote.price == 12.5 and quote.data_kind == "daily_close" and quote.freshness == "eod"
    assert quote.price_date.isoformat() == "2026-07-24"
    assert quote.as_of is None


def test_complete_failure_is_safe_and_retry_is_bounded(monkeypatch):
    ticker = Mock()
    ticker.history.side_effect = TimeoutError("secret")
    monkeypatch.setattr(yahoo_client.yf, "Ticker", Mock(return_value=ticker))
    monkeypatch.setattr(yahoo_client.time, "sleep", Mock())
    monkeypatch.setattr(yahoo_client.random, "uniform", lambda *_: 0)
    quote = yahoo_client.fetch_quote(US)
    assert quote.price is None and quote.status == "error" and quote.error_category == "TimeoutError"
    assert ticker.history.call_count == 6  # three intraday and three fallback attempts


def test_batch_is_sequential_and_does_not_sleep_after_last(monkeypatch):
    calls = []
    monkeypatch.setattr(yahoo_client, "fetch_quote", lambda stock: calls.append(stock.symbol) or yahoo_client.error_quote(stock, "test"))
    sleep = Mock()
    monkeypatch.setattr(yahoo_client.time, "sleep", sleep)
    monkeypatch.setattr(yahoo_client.random, "uniform", lambda *_: 0)
    results = yahoo_client.collect_quotes([US, BIST])
    assert calls == ["AAPL", "THYAO"] and sleep.call_count == 1
    assert [item.symbol for item in results] == ["AAPL", "THYAO"]


def test_unexpected_symbol_error_is_isolated_and_later_symbols_run(monkeypatch):
    calls = []
    def fetch(stock):
        calls.append(stock.symbol)
        if stock.symbol == "AAPL":
            raise ValueError("private response detail")
        return yahoo_client.error_quote(stock, "expected_test_error")
    monkeypatch.setattr(yahoo_client, "fetch_quote", fetch)
    monkeypatch.setattr(yahoo_client.time, "sleep", Mock())
    monkeypatch.setattr(yahoo_client.random, "uniform", lambda *_: 0)
    results = yahoo_client.collect_quotes([US, BIST])
    assert calls == ["AAPL", "THYAO"]
    assert len(results) == 2
    assert [item.symbol for item in results] == ["AAPL", "THYAO"]
    assert results[0].status == "error" and results[0].error_category == "ValueError"
