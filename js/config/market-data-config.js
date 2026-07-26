const meta = document.querySelector('meta[name="teknoify-market-api-base"]');
const rawMarketDataApiBase = meta?.getAttribute("content")?.trim() || "";
export const MARKET_DATA_API_BASE = rawMarketDataApiBase.replace(/\/+$/, "");

const equityMeta = document.querySelector('meta[name="teknoify-equity-api-base"]');
const rawEquityDataApiBase = equityMeta?.getAttribute("content")?.trim() || "";
export const EQUITY_DATA_API_BASE = rawEquityDataApiBase.replace(/\/+$/, "");
