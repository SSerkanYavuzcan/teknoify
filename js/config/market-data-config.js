const meta = document.querySelector('meta[name="teknoify-market-api-base"]');
const rawMarketDataApiBase = meta?.getAttribute("content")?.trim() || "";
export const MARKET_DATA_API_BASE = rawMarketDataApiBase.replace(/\/+$/, "");
