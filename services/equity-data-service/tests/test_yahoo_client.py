from datetime import datetime, timezone
from unittest.mock import Mock

import numpy as np
import pandas as pd
import pytest

from app.models import StockConfig
from app import yahoo_client


US = StockConfig("AAPL", "Apple", "US", "USD", "AAPL", "NASDAQ", "America/New_York")
BIST = StockConfig("THYAO", "THY", "BIST", "TRY", "THYAO.IS", "BIST", "Europe/Istanbul")
XU100 = StockConfig("XU100", "BIST 100", "BIST", "TRY", "XU100.IS", "BIST", "Europe/Istanbul")
SP500 = StockConfig("SP500", "S&P 500", "US", "USD", "^GSPC", "S&P", "America/New_York")


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
    assert quote.price_date.isoformat() == "2026-07-24"
    assert quote.previous_close == 100
    assert quote.change == 5
    assert quote.change_percent == pytest.approx(5)


def test_aware_history_filters_incomplete_duplicates_and_invalid_values():
    index = pd.to_datetime(["2026-07-23 14:00Z", "2026-07-24 14:00Z", "2026-07-24 14:00Z",
                            "2026-07-24 14:15Z", "2026-07-24 14:30Z", "2026-07-24 14:45Z"])
    history = pd.DataFrame({"Close": [90, 100, 101, np.nan, np.inf, 999]}, index=index)
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
    assert quote.price_date.isoformat() == "2026-07-24" and quote.as_of is None


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
    monkeypatch.setattr(yahoo_client, "fetch_quote", lambda stock: calls.append(stock.symbol) or Mock())
    sleep = Mock()
    monkeypatch.setattr(yahoo_client.time, "sleep", sleep)
    monkeypatch.setattr(yahoo_client.random, "uniform", lambda *_: 0)
    yahoo_client.collect_quotes([US, BIST])
    assert calls == ["AAPL", "THYAO"] and sleep.call_count == 1


def test_batch_isolates_unexpected_symbol_failure(monkeypatch):
    calls = []
    def fetch(stock):
        calls.append(stock.symbol)
        if stock is US:
            raise ValueError("unsafe details")
        return yahoo_client.error_quote(stock, "expected")
    monkeypatch.setattr(yahoo_client, "fetch_quote", fetch)
    sleep = Mock()
    monkeypatch.setattr(yahoo_client.time, "sleep", sleep)
    monkeypatch.setattr(yahoo_client.random, "uniform", lambda *_: 0)
    quotes = yahoo_client.collect_quotes([US, BIST])
    assert calls == ["AAPL", "THYAO"]
    assert [quote.symbol for quote in quotes] == ["AAPL", "THYAO"]
    assert quotes[0].status == "error" and quotes[0].error_category == "ValueError"
    assert sleep.call_count == 1


@pytest.mark.parametrize(("stock", "expected_price"), [(XU100, 105.0), (SP500, 105.0)])
def test_index_intraday_uses_shared_collector(monkeypatch, stock, expected_price):
    history = pd.DataFrame(
        {"Close": [100.0, expected_price]},
        index=pd.to_datetime(["2026-07-23 12:00Z", "2026-07-24 12:00Z"]),
    )
    ticker_factory = Mock()
    ticker = ticker_factory.return_value
    ticker.history.return_value = history
    monkeypatch.setattr(yahoo_client.yf, "Ticker", ticker_factory)
    quote = yahoo_client.fetch_quote(stock, datetime(2026, 7, 24, 13, tzinfo=timezone.utc))
    assert quote.symbol == stock.symbol and quote.price == expected_price
    ticker_factory.assert_called_once_with(stock.provider_symbol)
    assert ticker.history.call_args.kwargs["interval"] == "15m"


def test_index_daily_fallback_and_caret_provider_symbol_are_unchanged(monkeypatch):
    ticker_factory = Mock()
    ticker_factory.return_value.history.side_effect = [
        pd.DataFrame(), pd.DataFrame({"Close": [6789.12]}, index=pd.to_datetime(["2026-07-24"])),
    ]
    monkeypatch.setattr(yahoo_client.yf, "Ticker", ticker_factory)
    monkeypatch.setattr(yahoo_client.time, "sleep", Mock())
    monkeypatch.setattr(yahoo_client.random, "uniform", lambda *_: 0)
    quote = yahoo_client.fetch_quote(SP500)
    assert quote.price == 6789.12 and quote.data_kind == "daily_close"
    assert [call.args[0] for call in ticker_factory.call_args_list] == ["^GSPC", "^GSPC"]


def test_failed_index_does_not_prevent_equity_processing(monkeypatch):
    monkeypatch.setattr(
        yahoo_client,
        "fetch_quote",
        lambda stock: (_ for _ in ()).throw(RuntimeError("failed")) if stock is XU100 else yahoo_client.error_quote(stock, "test"),
    )
    monkeypatch.setattr(yahoo_client.time, "sleep", Mock())
    monkeypatch.setattr(yahoo_client.random, "uniform", lambda *_: 0)
    quotes = yahoo_client.collect_quotes([XU100, BIST])
    assert [item.symbol for item in quotes] == ["XU100", "THYAO"]
