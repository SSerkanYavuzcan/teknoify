#!/usr/bin/env python3
"""Update normalized USD/TRY rates from TCMB EVDS using the Python evds package."""

from __future__ import annotations

import argparse
import json
import os
import ssl
import sys
from collections.abc import Iterable, Mapping, Sequence
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

EVDS_USD_TRY_SERIES = "TP.DK.USD.A.YTL"
DEFAULT_START_DATE = "2020-01-01"
DEFAULT_LOOKBACK_DAYS = 7
KNOWN_DATE_FIELDS = ("Tarih", "Date", "date")
KNOWN_SERIES_FIELDS = (EVDS_USD_TRY_SERIES.replace(".", "_"), EVDS_USD_TRY_SERIES)
REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
USD_TRY_RATES_PATH = REPOSITORY_ROOT / "data" / "currency" / "usd_try_rates.json"


def today_iso_date() -> str:
    return date.today().isoformat()


def parse_iso_date(value: str, label: str) -> date:
    try:
        parsed = date.fromisoformat(value)
    except ValueError as error:
        raise ValueError(f"Invalid {label} date: {value}. Expected YYYY-MM-DD.") from error

    return parsed


def to_evds_date(iso_date: str) -> str:
    return parse_iso_date(iso_date, "EVDS").strftime("%d-%m-%Y")


def normalize_evds_date(value: Any) -> str | None:
    if not isinstance(value, str):
        return None

    trimmed_value = value.strip()
    if not trimmed_value:
        return None

    try:
        return date.fromisoformat(trimmed_value).isoformat()
    except ValueError:
        pass

    for date_format in ("%d-%m-%Y", "%d.%m.%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(trimmed_value, date_format).date().isoformat()
        except ValueError:
            continue

    return None


def parse_numeric_rate(value: Any) -> float | None:
    if isinstance(value, bool):
        return None

    if isinstance(value, (int, float)):
        parsed = float(value)
        return parsed if parsed == parsed and parsed not in (float("inf"), float("-inf")) else None

    if not isinstance(value, str):
        return None

    normalized_value = value.strip()
    if not normalized_value or normalized_value in {"-", "—", "null", "None"}:
        return None

    if "," in normalized_value and "." in normalized_value:
        normalized_value = normalized_value.replace(".", "").replace(",", ".")
    else:
        normalized_value = normalized_value.replace(",", ".")

    try:
        parsed = float(normalized_value)
    except ValueError:
        return None

    return parsed if parsed == parsed and parsed not in (float("inf"), float("-inf")) else None


def parse_arguments(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Update data/currency/usd_try_rates.json from TCMB EVDS."
    )
    parser.add_argument("--full", action="store_true", help="Fetch from 2020-01-01 to today.")
    parser.add_argument("--start", help="Optional start date in YYYY-MM-DD format.")
    parser.add_argument("--end", default=today_iso_date(), help="Optional end date in YYYY-MM-DD format.")
    options = parser.parse_args(argv)

    if options.start is not None:
        parse_iso_date(options.start, "--start")

    parse_iso_date(options.end, "--end")

    if options.full:
        options.start = DEFAULT_START_DATE

    if options.start is not None and options.start > options.end:
        raise ValueError(
            f"Invalid date range: --start ({options.start}) must not be after --end ({options.end})."
        )

    return options


def read_usd_try_rates_file() -> dict[str, Any]:
    with USD_TRY_RATES_PATH.open("r", encoding="utf-8") as usd_try_rates_file:
        parsed_json = json.load(usd_try_rates_file)

    return {
        "meta": {
            "baseCurrency": "USD",
            "quoteCurrency": "TRY",
            "source": "TCMB",
            "series": EVDS_USD_TRY_SERIES,
            "frequency": "daily",
            "startDate": DEFAULT_START_DATE,
            "endDate": None,
            "lastUpdatedAt": None,
            "rateField": "usdTry",
            "notes": [
                "Historical USD/TRY rates are fetched from TCMB EVDS using the Python evds package.",
                "Rates are stored as normalized daily values in YYYY-MM-DD format.",
                "Do not manually invent exchange rates. Use the update script or verified source data.",
            ],
            **parsed_json.get("meta", {}),
        },
        "rates": parsed_json.get("rates") if isinstance(parsed_json.get("rates"), list) else [],
    }


def find_date_field(row: Mapping[str, Any]) -> str | None:
    return next((field_name for field_name in KNOWN_DATE_FIELDS if field_name in row), None)


def find_series_field(rows: Sequence[Mapping[str, Any]]) -> str | None:
    for field_name in KNOWN_SERIES_FIELDS:
        if any(field_name in row for row in rows):
            return field_name

    candidate_fields: set[str] = set()
    for row in rows:
        for field_name in row:
            if "USD" in field_name.upper() and field_name not in KNOWN_DATE_FIELDS:
                candidate_fields.add(field_name)

    for field_name in candidate_fields:
        if any(parse_numeric_rate(row.get(field_name)) is not None for row in rows):
            return field_name

    return None


def is_non_string_sequence(value: Any) -> bool:
    return isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray))


def list_contains_dictionary(value: Any) -> bool:
    return is_non_string_sequence(value) and any(isinstance(item, Mapping) for item in value)


def extract_evds_rows(raw_response: Any) -> list[Mapping[str, Any]]:
    if isinstance(raw_response, Mapping):
        items = raw_response.get("items")
        if list_contains_dictionary(items):
            return [item for item in items if isinstance(item, Mapping)]

        for value in raw_response.values():
            if list_contains_dictionary(value):
                return [item for item in value if isinstance(item, Mapping)]

    if is_non_string_sequence(raw_response):
        if any(isinstance(item, Mapping) for item in raw_response):
            return [item for item in raw_response if isinstance(item, Mapping)]

        for item in raw_response:
            rows = extract_evds_rows(item)
            if rows:
                return rows

    return []


def normalize_evds_rows(raw_response: Any) -> list[dict[str, Any]]:
    rows = extract_evds_rows(raw_response)
    series_field = find_series_field(rows)

    if not series_field and rows:
        raise ValueError("Unexpected TCMB EVDS response shape: USD/TRY series field was not found.")

    rates_by_date: dict[str, dict[str, Any]] = {}

    for row in rows:
        date_field = find_date_field(row)
        if not date_field or not series_field:
            continue

        normalized_date = normalize_evds_date(row.get(date_field))
        usd_try = parse_numeric_rate(row.get(series_field))

        if normalized_date is None or usd_try is None:
            continue

        rates_by_date[normalized_date] = {
            "date": normalized_date,
            "usdTry": usd_try,
            "source": "TCMB",
            "series": EVDS_USD_TRY_SERIES,
        }

    return sorted(rates_by_date.values(), key=lambda rate: rate["date"])


def normalize_existing_rates(rates: Iterable[Any]) -> list[dict[str, Any]]:
    normalized_rates_by_date: dict[str, dict[str, Any]] = {}

    for rate in rates:
        if not isinstance(rate, Mapping):
            continue

        normalized_date = normalize_evds_date(rate.get("date"))
        usd_try = parse_numeric_rate(rate.get("usdTry"))

        if normalized_date is None or usd_try is None:
            continue

        normalized_rates_by_date[normalized_date] = {
            "date": normalized_date,
            "usdTry": usd_try,
            "source": rate.get("source") or "TCMB",
            "series": rate.get("series") or EVDS_USD_TRY_SERIES,
        }

    return sorted(normalized_rates_by_date.values(), key=lambda rate: rate["date"])


def merge_rates(existing_rates: Iterable[Any], fetched_rates: Iterable[Mapping[str, Any]]) -> list[dict[str, Any]]:
    rates_by_date = {rate["date"]: rate for rate in normalize_existing_rates(existing_rates)}

    for rate in fetched_rates:
        rates_by_date[rate["date"]] = dict(rate)

    return sorted(rates_by_date.values(), key=lambda rate: rate["date"])


def latest_available_rate(rates: Iterable[Any]) -> dict[str, Any] | None:
    normalized_rates = normalize_existing_rates(rates)
    return normalized_rates[-1] if normalized_rates else None


def resolve_fetch_options(options: argparse.Namespace, current_data: Mapping[str, Any]) -> dict[str, str]:
    latest_rate = latest_available_rate(current_data.get("rates", []))
    start_date = options.start
    mode = "incremental"

    if options.full:
        start_date = DEFAULT_START_DATE
        mode = "full"
    elif options.start is not None:
        mode = "custom"
    elif latest_rate:
        start_date = (parse_iso_date(latest_rate["date"], "latest local rate") - timedelta(days=DEFAULT_LOOKBACK_DAYS)).isoformat()
        if start_date < DEFAULT_START_DATE:
            start_date = DEFAULT_START_DATE
    else:
        start_date = DEFAULT_START_DATE
        mode = "initial"

    if start_date > options.end:
        raise ValueError(
            f"Invalid date range: resolved start date ({start_date}) must not be after end date ({options.end})."
        )

    return {"startDate": start_date, "endDate": options.end, "mode": mode}


def is_ssl_related_error(error: BaseException) -> bool:
    current_error: BaseException | None = error
    visited: set[int] = set()

    while current_error is not None and id(current_error) not in visited:
        visited.add(id(current_error))
        if isinstance(current_error, ssl.SSLError):
            return True

        error_text = f"{current_error.__class__.__name__}: {current_error}".lower()
        if any(keyword in error_text for keyword in ("ssl", "certificate", "tls", "handshake")):
            return True

        current_error = current_error.__cause__ or current_error.__context__

    return False


def fetch_with_evds_client(api_key: str, start_date: str, end_date: str, *, legacy_ssl: bool = False) -> Any:
    try:
        from evds import evdsAPI
    except ImportError as error:
        raise RuntimeError(
            "The Python 'evds' package is required. Install it with: python -m pip install evds"
        ) from error

    client_kwargs = {"legacySSL": True} if legacy_ssl else {}
    client = evdsAPI(api_key, **client_kwargs)

    return client.get_data(
        [EVDS_USD_TRY_SERIES],
        startdate=to_evds_date(start_date),
        enddate=to_evds_date(end_date),
        raw=True,
    )


def fetch_usd_try_rates(api_key: str, start_date: str, end_date: str) -> Any:
    print(
        "Fetching TCMB USD/TRY rates with the Python evds package "
        f"from {start_date} to {end_date}..."
    )

    try:
        return fetch_with_evds_client(api_key, start_date, end_date)
    except Exception as error:
        if not is_ssl_related_error(error):
            raise

        print("Retrying EVDS request with legacySSL=True due to SSL-related error.")
        return fetch_with_evds_client(api_key, start_date, end_date, legacy_ssl=True)


def are_rates_equal(first_rates: Iterable[Any], second_rates: Iterable[Any]) -> bool:
    return normalize_existing_rates(first_rates) == normalize_existing_rates(second_rates)


def write_usd_try_rates_file(
    *,
    current_data: Mapping[str, Any],
    fetched_rates: Sequence[Mapping[str, Any]],
    requested_start_date: str,
    requested_end_date: str,
    fetch_started_at: str,
    fetch_completed_at: str,
    fetch_mode: str,
) -> dict[str, Any]:
    merged_rates = merge_rates(current_data.get("rates", []), fetched_rates)
    earliest_rate = merged_rates[0] if merged_rates else None
    latest_rate = merged_rates[-1] if merged_rates else None
    output = {
        "meta": {
            **current_data.get("meta", {}),
            "baseCurrency": "USD",
            "quoteCurrency": "TRY",
            "source": "TCMB",
            "series": EVDS_USD_TRY_SERIES,
            "frequency": "daily",
            "startDate": earliest_rate["date"] if earliest_rate else requested_start_date,
            "endDate": latest_rate["date"] if latest_rate else requested_end_date,
            "lastUpdatedAt": fetch_completed_at,
            "lastFetchStartedAt": fetch_started_at,
            "lastFetchCompletedAt": fetch_completed_at,
            "lastFetchStatus": "success",
            "lastFetchRange": {
                "startDate": requested_start_date,
                "endDate": requested_end_date,
                "mode": fetch_mode,
            },
            "lastAvailableRateDate": latest_rate["date"] if latest_rate else None,
            "lastAvailableRate": latest_rate["usdTry"] if latest_rate else None,
            "rateField": "usdTry",
            "notes": [
                "Historical USD/TRY rates are fetched from TCMB EVDS using the Python evds package.",
                "Rates are stored as normalized daily values in YYYY-MM-DD format.",
                "Do not manually invent exchange rates. Use the update script or verified source data.",
            ],
        },
        "rates": merged_rates,
    }

    USD_TRY_RATES_PATH.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return output


def main(argv: Sequence[str]) -> int:
    try:
        options = parse_arguments(argv)
    except ValueError as error:
        print(error, file=sys.stderr)
        return 1

    api_key = os.environ.get("TCMB_EVDS_API_KEY")
    if not api_key:
        print("TCMB_EVDS_API_KEY is not set. No USD/TRY rates were fetched or written.", file=sys.stderr)
        print("Set the TCMB_EVDS_API_KEY GitHub Actions repository secret or environment variable.", file=sys.stderr)
        return 1

    current_data = read_usd_try_rates_file()
    fetch_options = resolve_fetch_options(options, current_data)
    existing_rate_count = len(normalize_existing_rates(current_data.get("rates", [])))
    fetch_started_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    print(
        "Resolved TCMB USD/TRY fetch range: "
        f"{fetch_options['startDate']} to {fetch_options['endDate']} ({fetch_options['mode']} mode)."
    )

    try:
        raw_response = fetch_usd_try_rates(
            api_key,
            fetch_options["startDate"],
            fetch_options["endDate"],
        )
        fetched_rates = normalize_evds_rows(raw_response)
    except Exception as error:
        print("Failed to update USD/TRY rates safely. Existing data was not modified.", file=sys.stderr)
        print(str(error), file=sys.stderr)
        return 1

    print(f"Normalized {len(fetched_rates):,} valid USD/TRY rows from TCMB EVDS.")

    if not fetched_rates:
        print("No new valid TCMB rows found. Existing dataset kept unchanged.")
        if existing_rate_count > 0:
            return 0

        print("No existing USD/TRY rates are available for fallback.", file=sys.stderr)
        return 1

    merged_rates = merge_rates(current_data.get("rates", []), fetched_rates)

    if are_rates_equal(current_data.get("rates", []), merged_rates):
        print("No USD/TRY rate changes found. Existing dataset kept unchanged.")
        return 0

    fetch_completed_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    output = write_usd_try_rates_file(
        current_data=current_data,
        fetched_rates=fetched_rates,
        requested_start_date=fetch_options["startDate"],
        requested_end_date=fetch_options["endDate"],
        fetch_started_at=fetch_started_at,
        fetch_completed_at=fetch_completed_at,
        fetch_mode=fetch_options["mode"],
    )
    latest_rate = output["rates"][-1]

    print(f"Wrote {len(output['rates']):,} normalized rates to data/currency/usd_try_rates.json.")
    print(f"Last available rate: {latest_rate['date']} = {latest_rate['usdTry']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
