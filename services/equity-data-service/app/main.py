"""FastAPI application exposing cached, read-only equity snapshots."""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager, suppress
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import allowed_origins, refresh_seconds
from .models import iso_utc
from .snapshot import SnapshotManager
from .symbols import STOCKS, find_stock
from .yahoo_client import fetch_history

LOGGER = logging.getLogger(__name__)
manager = SnapshotManager(STOCKS)
REFRESH_SECONDS = refresh_seconds()
history_lock = asyncio.Lock()


async def _refresh_loop() -> None:
    while True:
        try:
            await manager.refresh()
        except asyncio.CancelledError:
            raise
        except Exception:
            LOGGER.exception("Unexpected equity refresh loop failure")
        await asyncio.sleep(REFRESH_SECONDS)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    LOGGER.info("Equity service startup")
    task = asyncio.create_task(_refresh_loop())
    try:
        yield
    finally:
        task.cancel()
        with suppress(asyncio.CancelledError):
            await task
        LOGGER.info("Equity service shutdown")


app = FastAPI(title="Teknoify Equity Data Service", lifespan=lifespan)
origins = allowed_origins()
if origins:
    app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=False,
                       allow_methods=["GET", "OPTIONS"], allow_headers=[])


@app.get("/health")
async def health() -> dict[str, object]:
    snapshot = manager.snapshot
    if snapshot is None:
        return {"status": "warming_up", "ready": False}
    age = max(0, int((datetime.now(timezone.utc) - snapshot.generated_at).total_seconds()))
    return {"status": "ok", "ready": True, "lastRefreshAt": iso_utc(manager.last_refresh_at),
            "lastSuccessfulRefreshAt": iso_utc(manager.last_successful_refresh_at), "snapshotAgeSeconds": age,
            "lastRefreshSucceeded": manager.last_refresh_succeeded,
            "staleItemCount": sum(item.stale for item in snapshot.items),
            "errorItemCount": sum(item.status == "error" for item in snapshot.items)}


def _snapshot_or_503():
    if manager.snapshot is None:
        raise HTTPException(status_code=503, detail="data_not_ready")
    return manager.snapshot


@app.exception_handler(HTTPException)
async def http_error(_request, exc: HTTPException):
    if exc.status_code == 503 and exc.detail in {"data_not_ready", "symbol_data_not_ready"}:
        return JSONResponse(status_code=503, content={"error": exc.detail})
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.get("/v1/equities")
async def equities(market: str | None = None, symbols: str | None = Query(default=None)) -> dict[str, object]:
    snapshot = _snapshot_or_503()
    requested: set[str] | None = None
    if symbols is not None:
        requested = set()
        for value in (part.strip() for part in symbols.split(",") if part.strip()):
            stock = find_stock(value)
            if stock is None:
                raise HTTPException(400, f"unsupported_symbol: {value}")
            requested.add(stock.symbol)
    items = [quote for quote in snapshot.items
             if (market is None or quote.market.casefold() == market.casefold())
             and (requested is None or quote.symbol in requested)]
    return {"generatedAt": iso_utc(snapshot.generated_at),
            "lastSuccessfulRefreshAt": iso_utc(manager.last_successful_refresh_at),
            "source": "yahoo_finance_unofficial", "freshness": "delayed", "nominalDelayMinutes": 15,
            "refreshIntervalSeconds": REFRESH_SECONDS, "items": [item.to_api() for item in items]}


@app.get("/v1/equities/{symbol}/history")
async def equity_history(symbol: str, range: str = Query(default="5d"),
                         interval: str = Query(default="15m")) -> dict[str, object]:
    stock = find_stock(symbol)
    if stock is None or stock.symbol not in {"XU100", "SP500"}:
        raise HTTPException(404, "unsupported_symbol")
    try:
        async with history_lock:
            points = await asyncio.to_thread(fetch_history, stock, range, interval)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(502, "history_upstream_error") from exc
    return {"symbol": stock.symbol, "displayName": stock.display_name, "market": stock.market,
            "exchange": stock.exchange, "range": range, "interval": interval,
            "freshness": "delayed", "points": points}


@app.get("/v1/equities/{symbol}")
async def equity(symbol: str) -> dict[str, object]:
    stock = find_stock(symbol)
    if stock is None:
        raise HTTPException(404, "unsupported_symbol")
    snapshot = _snapshot_or_503()
    quote = next((item for item in snapshot.items if item.symbol == stock.symbol), None)
    if quote is None:
        raise HTTPException(503, "symbol_data_not_ready")
    return quote.to_api()
