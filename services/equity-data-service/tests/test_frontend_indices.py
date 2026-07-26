from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
HTML = (ROOT / "dashboard/services/investment/index.html").read_text(encoding="utf-8")
JS = (ROOT / "js/pages/investment-market.js").read_text(encoding="utf-8")


def test_index_hero_cards_and_backend_history_requests_are_present():
    assert 'data-index-card="XU100"' in HTML and 'data-index-card="SP500"' in HTML
    assert 'id="overview-chart-xu100"' in HTML and 'id="overview-chart-sp500"' in HTML
    assert "/history?range=5d&interval=15m" in JS
    assert "yahoo.com" not in JS.casefold()


def test_indices_are_excluded_from_read_only_stock_lists():
    assert 'symbol:"XU100"' in JS and 'symbol:"SP500"' in JS
    assert "function isMarketIndex" in JS
    assert "item.market===market&&!isMarketIndex(item)" in JS
    assert "Borsa İstanbul Hisseleri" in HTML and "ABD Hisseleri" in HTML
    index_formatter = JS[JS.index("function formatIndexValue"):JS.index("function formatEquityPercent")]
    assert 'Intl.NumberFormat("tr-TR"' in index_formatter
    assert 'style:"currency"' not in index_formatter


def test_indices_do_not_enter_crypto_or_selected_asset_flows():
    assets = JS[JS.index("const ASSETS="):JS.index("const LOCAL_ICON_PREFIX=")]
    assert "XU100" not in assets and "SP500" not in assets
    assert "const state={selected:ASSETS[0]" in JS
    assert 'data-overview-card="BTCUSD"' in HTML
