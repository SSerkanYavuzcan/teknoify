from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
HTML = (ROOT / "dashboard/services/investment/index.html").read_text(encoding="utf-8")
JS = (ROOT / "js/pages/investment-market.js").read_text(encoding="utf-8")


def test_index_containers_and_shared_request_are_present():
    assert 'id="overview-bist-index"' in HTML
    assert 'id="overview-us-index"' in HTML
    assert JS.count("/v1/equities") == 1
    assert "yahoo.com" not in JS.casefold()


def test_indices_are_points_and_excluded_from_stock_tiles():
    assert 'symbol:"XU100"' in JS and 'symbol:"SP500"' in JS
    assert "function isMarketIndex" in JS
    assert "item.market===market&&!isMarketIndex(item)" in JS
    index_formatter = JS[JS.index("function formatIndexValue"):JS.index("function formatEquityPercent")]
    assert 'Intl.NumberFormat("tr-TR"' in index_formatter
    assert 'style:"currency"' not in index_formatter
    assert 'points.textContent="puan"' in JS


def test_indices_do_not_enter_crypto_or_chart_flows():
    assets = JS[JS.index("const ASSETS="):JS.index("const LOCAL_ICON_PREFIX=")]
    assert "XU100" not in assets and "SP500" not in assets
    assert "const state={selected:ASSETS[0]" in JS
    assert "indexChart" not in JS and "indexSparkline" not in JS
    assert 'data-overview-card="BTCUSD"' in HTML
