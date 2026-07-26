"""The sole provider-symbol allowlist used by both entry points."""

from .models import StockConfig

STOCKS: tuple[StockConfig, ...] = (
    StockConfig(
        symbol="XU100",
        display_name="BIST 100",
        market="BIST",
        currency="TRY",
        provider_symbol="XU100.IS",
        exchange="BIST",
        timezone="Europe/Istanbul",
    ),
    StockConfig("THYAO", "Türk Hava Yolları", "BIST", "TRY", "THYAO.IS", "BIST", "Europe/Istanbul"),
    StockConfig("EREGL", "Ereğli Demir ve Çelik", "BIST", "TRY", "EREGL.IS", "BIST", "Europe/Istanbul"),
    StockConfig("ASELS", "ASELSAN", "BIST", "TRY", "ASELS.IS", "BIST", "Europe/Istanbul"),
    StockConfig("BIMAS", "BİM Birleşik Mağazalar", "BIST", "TRY", "BIMAS.IS", "BIST", "Europe/Istanbul"),
    StockConfig(
        symbol="SP500",
        display_name="S&P 500",
        market="US",
        currency="USD",
        provider_symbol="^GSPC",
        exchange="S&P",
        timezone="America/New_York",
    ),
    StockConfig("AAPL", "Apple", "US", "USD", "AAPL", "NASDAQ", "America/New_York"),
    StockConfig("TSLA", "Tesla", "US", "USD", "TSLA", "NASDAQ", "America/New_York"),
    StockConfig("MSFT", "Microsoft", "US", "USD", "MSFT", "NASDAQ", "America/New_York"),
    StockConfig("NVDA", "NVIDIA", "US", "USD", "NVDA", "NASDAQ", "America/New_York"),
    StockConfig("JPM", "JPMorgan Chase", "US", "USD", "JPM", "NYSE", "America/New_York"),
    StockConfig("KO", "Coca-Cola", "US", "USD", "KO", "NYSE", "America/New_York"),
)

BY_ALIAS = {alias.upper(): stock for stock in STOCKS for alias in (stock.symbol, stock.provider_symbol)}


def find_stock(symbol: str) -> StockConfig | None:
    return BY_ALIAS.get(symbol.strip().upper())
