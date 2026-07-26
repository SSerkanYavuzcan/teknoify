"""Environment configuration with safe bounds."""

import math
import os

DEFAULT_REFRESH_SECONDS = 900
DEFAULT_REQUEST_DELAY_SECONDS = 2.0


def refresh_seconds(raw: str | None = None) -> int:
    try:
        value = float(os.getenv("EQUITY_REFRESH_SECONDS", "900") if raw is None else raw)
    except (TypeError, ValueError):
        return DEFAULT_REFRESH_SECONDS
    if not math.isfinite(value):
        return DEFAULT_REFRESH_SECONDS
    return int(min(3600, max(300, value)))


def request_delay() -> float:
    try:
        value = float(os.getenv("YF_REQUEST_DELAY_SECONDS", str(DEFAULT_REQUEST_DELAY_SECONDS)))
    except ValueError:
        return DEFAULT_REQUEST_DELAY_SECONDS
    return value if math.isfinite(value) and value >= 0 else DEFAULT_REQUEST_DELAY_SECONDS


def allowed_origins() -> list[str]:
    return [value.strip() for value in os.getenv("ALLOWED_ORIGINS", "").split(",") if value.strip()]
