from __future__ import annotations

import sys
from datetime import date
from pathlib import Path
from unittest.mock import Mock

import pandas as pd
import pytest

SERVICE_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_DIR))

import fetch_stock_closes as collector  # noqa: E402


@pytest.fixture(autouse=True)
def no_sleep(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(collector.time, "sleep", Mock())
    monkeypatch.setattr(collector.random, "uniform", lambda _start, _end: 0.0)


def stock(symbol: str = "AAPL", market: str = "US", currency: str = "USD") -> collector.StockConfig:
    return collector.StockConfig(symbol, "Test Company", market, currency)


def ticker_with(history: pd.DataFrame) -> Mock:
    ticker = Mock()
    ticker.history.return_value = history
    return ticker


def test_valid_us_stock_selects_latest_non_null_close(monkeypatch: pytest.MonkeyPatch) -> None:
    history = pd.DataFrame(
        {"Close": [210.0, None, 215.125, None]},
        index=pd.to_datetime(["2026-07-20", "2026-07-21", "2026-07-22", "2026-07-23"]),
    )
    ticker = ticker_with(history)
    monkeypatch.setattr(collector.yf, "Ticker", Mock(return_value=ticker))

    result = collector.fetch_latest_close(stock())

    assert result.latest_close == pytest.approx(215.125)
    assert result.closing_date == date(2026, 7, 22)
    assert result.currency == "USD"
    assert result.status == "OK"
    ticker.history.assert_called_once_with(
        period="5d", interval="1d", auto_adjust=False, actions=False, timeout=10
    )


def test_valid_bist_stock_preserves_try(monkeypatch: pytest.MonkeyPatch) -> None:
    history = pd.DataFrame({"Close": [289.75]}, index=pd.to_datetime(["2026-07-24"]))
    monkeypatch.setattr(collector.yf, "Ticker", Mock(return_value=ticker_with(history)))

    result = collector.fetch_latest_close(stock("THYAO.IS", "BIST", "TRY"))

    assert result.latest_close == 289.75
    assert result.market == "BIST"
    assert result.currency == "TRY"


@pytest.mark.parametrize(
    ("history", "message"),
    [
        (pd.DataFrame(), "No price history returned"),
        (pd.DataFrame({"Open": [1.0]}), "Close data unavailable"),
        (pd.DataFrame({"Close": [None, None]}), "No valid closing prices returned"),
    ],
)
def test_invalid_history_returns_error_without_retry(
    monkeypatch: pytest.MonkeyPatch, history: pd.DataFrame, message: str
) -> None:
    ticker = ticker_with(history)
    monkeypatch.setattr(collector.yf, "Ticker", Mock(return_value=ticker))

    result = collector.fetch_latest_close(stock())

    assert result.status == "ERROR"
    assert result.latest_close is None
    assert result.closing_date is None
    assert result.error == message
    assert ticker.history.call_count == 1


def test_network_exception_retries_no_more_than_three(monkeypatch: pytest.MonkeyPatch) -> None:
    ticker = Mock()
    ticker.history.side_effect = TimeoutError("secret upstream detail")
    monkeypatch.setattr(collector.yf, "Ticker", Mock(return_value=ticker))

    result = collector.fetch_latest_close(stock())

    assert ticker.history.call_count == 3
    assert collector.time.sleep.call_count == 1
    assert result.status == "ERROR"
    assert result.error == "Request failed (TimeoutError)"
    assert "secret" not in result.error


def test_collection_continues_after_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    failed = collector._error_result(stock("BAD"), "No history")
    succeeded = collector.StockResult("MSFT", "Microsoft", "US", "USD", 500.0, date(2026, 7, 24), "OK")
    fetch = Mock(side_effect=[failed, succeeded])
    monkeypatch.setattr(collector, "fetch_latest_close", fetch)
    monkeypatch.setattr(collector, "get_request_delay", lambda: 0.0)

    results = collector.collect_stock_closes([stock("BAD"), stock("MSFT")])

    assert [result.status for result in results] == ["ERROR", "OK"]
    assert fetch.call_count == 2
    assert collector.time.sleep.call_count == 2


@pytest.mark.parametrize("value", ["invalid", "-0.1", "nan", "inf"])
def test_invalid_request_delay_uses_default(monkeypatch: pytest.MonkeyPatch, value: str) -> None:
    monkeypatch.setenv("YF_REQUEST_DELAY_SECONDS", value)
    assert collector.get_request_delay() == collector.DEFAULT_REQUEST_DELAY_SECONDS


def test_table_contains_currencies_columns_and_failed_row() -> None:
    results = [
        collector.StockResult("AAPL", "Apple", "US", "USD", 213.5, date(2026, 7, 24), "OK"),
        collector.StockResult("THYAO.IS", "Türk Hava Yolları", "BIST", "TRY", 289.75, date(2026, 7, 24), "OK"),
        collector._error_result(stock("INVALID"), "No history"),
    ]

    table = collector.render_results_table(results)

    assert all(column in table for column in ["Symbol", "Company", "Market", "Currency", "Last Close", "Close Date", "Status"])
    assert "AAPL" in table and "USD" in table and "213.50" in table
    assert "THYAO.IS" in table and "TRY" in table and "289.75" in table
    invalid_line = next(line for line in table.splitlines() if "INVALID" in line)
    assert invalid_line.count("—") == 2
    assert "ERROR" in invalid_line
    assert len(table.splitlines()) == 5
