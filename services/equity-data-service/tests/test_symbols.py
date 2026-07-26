from app.symbols import STOCKS, find_stock


def test_index_public_and_provider_aliases_are_case_insensitive():
    assert find_stock("xu100").symbol == "XU100"
    assert find_stock("XU100.IS").symbol == "XU100"
    assert find_stock("sp500").symbol == "SP500"
    assert find_stock("^gspc").symbol == "SP500"


def test_canonical_instrument_order_and_existing_equities():
    assert [stock.symbol for stock in STOCKS] == [
        "XU100", "THYAO", "EREGL", "ASELS", "BIMAS", "SP500",
        "AAPL", "TSLA", "MSFT", "NVDA", "JPM", "KO",
    ]
    assert len(STOCKS) == 12
    assert {stock.symbol for stock in STOCKS} - {"XU100", "SP500"} == {
        "THYAO", "EREGL", "ASELS", "BIMAS", "AAPL", "TSLA", "MSFT", "NVDA", "JPM", "KO",
    }
