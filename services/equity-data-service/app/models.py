"""Typed models shared by the collectors and API."""

from __future__ import annotations

import math
from dataclasses import asdict, dataclass, replace
from datetime import date, datetime, timezone


@dataclass(frozen=True)
class StockConfig:
    symbol: str
    display_name: str
    market: str
    currency: str
    provider_symbol: str | None = None
    exchange: str = ""
    timezone: str = "UTC"

    def __post_init__(self) -> None:
        if self.provider_symbol is None:
            object.__setattr__(self, "provider_symbol", self.symbol)


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


@dataclass(frozen=True)
class Quote:
    symbol: str
    provider_symbol: str
    display_name: str
    market: str
    exchange: str
    currency: str
    price: float | None
    previous_close: float | None
    change: float | None
    change_percent: float | None
    as_of: datetime | None
    price_date: date | None
    data_kind: str | None
    freshness: str | None
    status: str
    stale: bool = False
    error_category: str | None = None

    def stale_copy(self, category: str | None) -> "Quote":
        return replace(self, status="stale", stale=True, error_category=category)

    def to_api(self) -> dict[str, object]:
        values = asdict(self)
        for key in ("price", "previous_close", "change", "change_percent"):
            value = values[key]
            values[key] = float(value) if value is not None and math.isfinite(float(value)) else None
        values["as_of"] = iso_utc(self.as_of)
        price_date = self.price_date
        values["price_date"] = price_date.isoformat() if price_date is not None else None
        names = {
            "provider_symbol": "providerSymbol", "display_name": "displayName",
            "previous_close": "previousClose", "change_percent": "changePercent",
            "as_of": "asOf", "data_kind": "dataKind", "error_category": "errorCategory",
            "price_date": "priceDate",
        }
        return {names.get(key, key): value for key, value in values.items() if value is not None or key not in {"error_category"}}


def iso_utc(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
