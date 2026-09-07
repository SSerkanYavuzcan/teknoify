# 16 — Secondary capability pages: phone and tablet hardening

Date: 2026-09-07. Branch: `fix/secondary-pages-mobile` (from `main` at `64e1089`). Status: **local, awaiting manual review; not pushed, no PR.**

The seven Yetenekler-linked capability pages (`pages/rpa.html`, `webscraping.html`, `api.html`, `ai-assistant.html`, `financial-indicators.html`, `training-consulting.html`, `investment-analytics.html`) and the four legal pages share one responsive layer, `css/01-foundation/shell-responsive.css`, scoped to `html.shell-v2`. Content, copy, the pages' own visual language and the desktop presentation are unchanged (pixel-identical to production at 1440, 1280 and 1024).

## 1. What was wrong on phones

Measured before any edit (real-time Edge, phone emulation): no page created document width, because the legacy page shells clip overflow, but the composition was a desktop page squeezed into a phone. The hero CTA rows did not wrap on 360px (Web Scraping, AI Assistant: the second button left the viewport; Investment Analytics: three buttons 466px wide were cut on both sides). The "use case" icon tiles collapsed from a five-column grid into six or seven full-width single-icon cards. Desktop section margins (5–6rem) and hero padding (140px) made pages 4,200–5,000px tall. Headings kept desktop minimums (40px h1, 32px h2, 28px section headings) and body copy 18.4px, so measures fell to 35ch. The AI page's 300px rotating ring escaped the viewport. Footer social and legal links were 24px and 15px tall. Six near-identical `@media (max-width: 968px)` blocks lived in six page stylesheets.

## 2. The layer

Root causes are fixed once, in five bands. Every rule sits under `html.shell-v2 main` (or `.footer`), so the homepage is untouched.

- **Safety at every width**: media `max-width: 100%`; `pre`/`code`/`table` scroll or wrap inside their container; hover transforms are disabled where `hover: none`; under `pointer: coarse` buttons get a 2.75rem minimum, chart legend buttons 2.25rem, footer social icons a 2.75rem hit area and footer legal links a 34px tap row. The desktop container gutter is deliberately left alone.
- **Below desktop (≤ 63.99rem)**: grid items get `min-width: 0` (the reason 360px heroes overflowed), CTA rows wrap, long words may break, the AI ring scales to `min(300px, 76vw)`, benefit grids collapse to two columns and icon tiles to three, hero padding and section margins tighten one step.
- **Phones (≤ 47.99rem)**: 1.25rem gutters that respect iPhone landscape safe areas, fluid type (`h1 clamp(2rem, 9vw, 2.5rem)`, subtitle `clamp(1rem, 4.2vw, 1.125rem)` at a 34ch measure, h2 `clamp(1.5rem, 6.4vw, 1.9rem)`, section headings `clamp(1.35rem, 5.6vw, 1.6rem)`), phone rhythm (hero `clamp(6.25rem, 14vh, 7.5rem)` top, intro 2.75rem, cards 0.9rem gaps, 2.75rem section margins), one-column benefit cards with 1.35rem padding, two-per-row icon tiles, full-width bottom CTA, investment sections at 3rem, a compact footer.
- **Narrow phones (≤ 40rem)**: hero CTA rows become a stacked, centred column at most 22rem wide with 3rem-tall full-width buttons.
- **≤ 360px**: h1 pinned at 2rem so the heading never clips.

The file is linked directly after each page's own stylesheet (unlayered, on purpose): the page stylesheets are unlayered and would otherwise beat anything inside the `foundation` cascade layer. It is not part of `css/style.css`, so the generated demo bundle does not carry it.

## 3. Results

Audit script (`respaudit`, scratchpad) over 360×780, 360×800, 375×667, 390×844, 393×852, 412×915, 430×932, 432×960, 768×1024, 820×1180, 1024×768, 1280×800, 1440×900: document width equals the viewport on every page at every size; no element escapes the viewport (the only flagged rectangle is the rotated bounding box of the AI ring, which is clipped inside its animation box); one field canvas; no console errors; body copy 16–18px with a 36–44ch measure; pages are 2,940–3,360px tall on phones instead of 4,200–4,600 (Investment Analytics, a dashboard, stays at about 5,000). Desktop before/after pixel difference is 0.00 percent on RPA, Web Scraping, Investment Analytics and 0.05 percent on Financial Indicators (its marquee).

`pages/subscription.html` is reachable from the investment page and the demo; it is not a Yetenekler page, still wears the legacy header, and rendered without overflow at every size, so it was audited but not changed pending the pricing decision recorded in doc 02.
