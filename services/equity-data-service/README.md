# Equity daily-close collector

This small command-line service retrieves the latest available **completed daily closing price** for a fixed set of US and Borsa Istanbul equities. It is an isolated collector: it does not provide an API or integrate with Teknoify's dashboard. The result is not guaranteed to be current or a live quote.

The configured symbols are `AAPL`, `TSLA`, `MSFT`, `NVDA`, `THYAO.IS`, `EREGL.IS`, `ASELS.IS`, and `BIMAS.IS`. US rows use USD; Borsa Istanbul rows use TRY. Currency is configured locally rather than fetched separately.

## Requirements and installation

Python 3.11 or newer is required. No API key or authentication is required.

First, from the repository root:

```text
cd services/equity-data-service
python -m venv .venv
```

### Windows PowerShell

```powershell
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python fetch_stock_closes.py
```

### Linux and macOS

```bash
source .venv/bin/activate
pip install -r requirements.txt
python fetch_stock_closes.py
```

## Request pacing

Symbols are fetched sequentially. The collector waits after every processed symbol to reduce pressure on Yahoo Finance. The base delay defaults to 2 seconds and has up to 0.75 seconds of random jitter. Set `YF_REQUEST_DELAY_SECONDS` to a non-negative number to change the base delay:

```powershell
$env:YF_REQUEST_DELAY_SECONDS = "3.0"
python fetch_stock_closes.py
```

```bash
YF_REQUEST_DELAY_SECONDS=3.0 python fetch_stock_closes.py
```

Invalid or negative values safely fall back to 2 seconds. A request exception is attempted at most three times, with exponential backoff of approximately 2 and 4 seconds plus jitter.

## Output and failures

After collection, a plain terminal table shows symbol, company, market, configured currency, last close, close date, and status. Prices have two decimal places. If Yahoo returns no usable close, or an individual request ultimately fails, the row has status `ERROR`; price and date appear as `—`. Other symbols continue processing, and a partial failure does not make the process exit unsuccessfully. Logs contain short failure categories rather than response bodies or credentials.

The tests mock all Yahoo access and can be run without a network connection:

```bash
pytest -q tests
```

## Data-source notice

The collector uses `yfinance`, an unofficial Yahoo Finance client. Availability and accuracy are controlled by the upstream service. Yahoo Finance and applicable data-usage terms must be evaluated before any public or commercial redistribution of collected data.
