# 20 — Finansal İndikatör & Botlar: strategy language

Date: 2026-09-08. Branch: `fix/finance-strategy-language` (from `main` at `a5f7264`). Scope: copy and terminology only on `pages/financial-indicators.html`; no layout, chart, market-screen or shared Tools system change.

## Product vocabulary

The page no longer describes the product as rule-based ("Kuralı siz yazarsınız, bot uygular."). The model it now states:

1. Teknoify continuously tests strategies.
2. The visitor selects a strategy.
3. The bot runs its operations according to the selected strategy.
4. Indicators and market conditions are monitored within that strategy.
5. The strategy's conditions produce Long / Short oriented signals.

Headline of the strategy chapter: **"Stratejiyi siz seçersiniz, bot uygular."** Supporting copy: "Sürekli test edilen stratejiler arasından seçim yapın; botunuz işlemlerini seçtiğiniz stratejiye göre yürütür." No performance, profitability or execution-success claims were added; the page-level note ("Teknoify yatırım tavsiyesi vermez…") stays in the Neden chapter, now phrased with "seçtiğiniz stratejiye göre".

## What changed

- Every visible "kural / kurallar / kural tabanlı" occurrence rewritten with "strateji / stratejiler / strateji bazlı / stratejiye göre": hero title and sub, hero vignette labels, Nasıl çalışır (H2, lead, rail steps 03 and 04), market screen lead, window title ("strateji motoru") and bot status line, the strategy chapter (kicker "Strateji bazlı çalışma", H2, lead, definitions, transcript rows), the Neden chapter (kicker, H2, lead, note, list), the solutions cells and the final CTA. The chapter anchor is now `#strateji` (nothing linked `#kural`).
- "temsilî seri" removed from the hero vignette tag (the tag element and its CSS rule are gone) and from the market screen venue line, which now shows only the venue ("spot", "kur", "ons", "parite"). The chart's accessible name reads "Fiyat grafiği: …". No "canlı / gerçek zamanlı" wording was added: the series are still generated deterministically in `js/experience/tools/market.js`, unchanged.
- Meta description updated for consistency ("seçtiğiniz stratejiye göre çalışan …"); title and canonical unchanged.
- Internal identifiers (`s-rule`, `data-m="rule"`, `.fi-rule`, `.fi-chart__rule-label`, `#rule-title`) kept.

## Verification

Local matrix at 360×800, 375×667, 390×844, 412×915, 430×932, 768×1024, 1440×900: document width equals the viewport, no escaping or clipped copy, no page or request errors, no visible "kural", "temsil" or "rule" in the rendered text, market screen geometry unchanged (44 candles, chart width and head height identical to the previous build at each viewport). Line wrapping compared against production: the strategy H2 keeps its line count everywhere; the hero title's second line wraps at 412 and 430 as it already did at 390 and below. `npm run check:shell` in sync; `npm run check:public` passing.
