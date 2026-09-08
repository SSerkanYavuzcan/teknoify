# 19 — Retiring the demo destination; embedded product experiences on the Tools pages

Date: 2026-09-08. Branch: `feat/retire-demo-embedded-experiences` (from `main` at `8d804be`).

## 1. demo.teknoify.com becomes a dead end

The separate Netlify site still publishes `demo/` (`demo/netlify.toml`, Package directory `demo`, no build), so the deploy contract is unchanged, but the folder now holds one branded page instead of the Demo Lab.

- `demo/index.html`: the Teknoify field, the logo lockup (linking to `https://teknoify.com/`), the kicker "Yanlış adres", the message **"Güzel deneme ama sanırım yanlış geldin."** with the last two words in the hero gradient, one supporting line ("Burası artık bir Teknoify deneyim alanı değil. Ürün deneyimleri, ilgili araç sayfalarının içinde yaşıyor."), one restrained link back to teknoify.com, and a mono meta row. `noindex, follow`. No header, no navigation, no CTA; nothing points at `demo.teknoify.com`.
- `demo/styles/index.css`: the page's own composition (the AI Agent hero type scale, the same entrance choreography, reduced motion showing the end state, safe-area padding). It sits on the GENERATED `demo/styles/shell.css`.
- Removed: `demo/data/demos.js`, `demo/scripts/{app,demo-catalog,sandbox-simulator}.js`, `demo/styles/{base,layout,components,demos,responsive}.css` (the catalog, sandbox, comparison table and export code). The GENERATED shell copies stay because the field needs them.
- `scripts/shell/sync-shell.mjs`: the demo page is `header: false`; it still receives the field markers.

The same page is also served at `https://teknoify.com/demo/` because the marketing artifact publishes `demo/` (doc 05); it carries `noindex` there as well.

## 2. Demo removed as a destination

| Location | Before | After |
|---|---|---|
| `scripts/shell/header.template.html` (homepage, 12 secondary pages) | `Demo` item → `https://demo.teknoify.com/` | item removed; nav is Ana Sayfa · Araçlar · İletişim · Giriş yap · Başla |
| `scripts/shell/footer.template.html` (six Tools pages) | Platform group: Demo Lab | removed |
| `index.html` footer Platform group | Demo Lab | removed |
| `index.html` audience list, "Fiyat Karşılaştırma" | `https://demo.teknoify.com/` | `pages/webscraping.html#karsilastirma` (the new comparison experience) |
| `public/sitemap.xml` | `https://teknoify.com/demo/` | removed |
| `packages/config/routes.js` | `demo: '/demo/'` | kept, annotated as retired |

Homepage pixel diff against production: 0.01 percent, exactly the header row where the item left and the footer "Demo Lab" row. Nothing else on the homepage changed.

## 3. Embedded experiences

Both sit inside the existing Tools page grammar (doc 18): a `tp-section` with kicker, H2 and a short lead, then one `win` surface. Neither is labelled as a demo; both use static, representative records and are structured for a live source later.

### Web Scraping — `#karsilastirma` (chapter 5, between Çıktı and Kontrol)

"Aynı ürün, iki kaynak, tek ekran." A window with a product tablist (Kablosuz kulaklık, Robot süpürge, Akıllı saat), a live-status line, and two source columns (Pazaryeri · pazaryeri-a.com, Marka mağazası · marka-magazasi.com). Each column: abstract product visual, name, SKU and seller, current price, previous price and change chip, a seven-day sparkline, and stock / campaign / delivery rows with state dots (in stock, low, out). The cheaper source gets a purple rule and an "en düşük fiyat" tag; an out-of-stock source is dimmed; the foot line states the difference ("Marka mağazası 150 ₺ daha uygun."). Interaction: product tabs (keyboard arrows), row mirroring on hover for fine pointers. Phones: the two sources stack, the tablist wraps, rows keep a two-column grid. `js/experience/tools/compare.js` holds the records and the `render()` seam; `css/tools/webscraping.css` the styles.

### Finansal İndikatör & Botlar — `#piyasa` (chapter 3, between Nasıl çalışır and Kural tabanlı çalışma)

"Seviye, sinyal ve yön: tek ekranda." A terminal-like window: symbol and venue ("temsilî seri"), last price and change, timeframe controls (15m, 1h, 4h, 1D), a candlestick chart drawn as SVG with EMA 20 / EMA 50, support and resistance levels, the last-price tag and a pointer crosshair (fine pointers), a signal rail (LONG or SHORT with the rule that produced it, entry, stop, target), indicator rows (RSI 14, MACD, trend, levels), a "bot aktif" status, and a five-symbol watchlist with sparkline and change. Every number is derived from a deterministic seeded series per symbol and timeframe (`js/experience/tools/market.js`): EMA, RSI, MACD sign, levels and the side are computed, not typed. Switching symbol or timeframe re-renders with a one-time draw-in. Phones get a taller, phone-sized viewBox so labels stay legible; the rail and watchlist stack. Long is shown in the positive token, Short in the warning token; everything else stays purple.

## 4. Verification

Local: both experiences at 360×800, 375×667, 390×844, 412×915, 430×932, 768×1024, 820×1180, 1024×768, 1280×800, 1440×900: document width equals the viewport, no escaping element, one canvas, no console or request errors; interactions verified (product switch changes name, prices, best source and difference; symbol and timeframe switches re-render the chart and signal). Dead-end page at 1440, 768, 390, 360: no header, one canvas, the message, zero links to demo, `noindex`. Navigation: homepage desktop and mobile menu, AI Agent, a legal page and a legacy page all show Ana Sayfa · Araçlar · İletişim with the six-item dropdown and no demo link anywhere. `npm run check:shell` in sync; `npm run check:public` passing.
