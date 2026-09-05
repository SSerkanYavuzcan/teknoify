# 13 — Homepage Experience v2, phase 2: audience split, capability catalog, living vignettes

Date: 2026-09-05. Branch: `feat/homepage-experience-v2-phase2` (from `main` at `39874e4`). Status: **local prototype awaiting manual review; not pushed, no PR.**

Extends the approved homepage (hero, manifesto, pinned journey) with the reference's next two ideas, productionized against product truth: the Business / Individual split and the scroll-driven capability catalog with living vignettes. The approved sections, navigation, logo, field architecture and favicon system are untouched; only the section order after the journey changed (audience → catalog → contact).

## 1. Product truth gate

| Prototype entry | Status | Decision |
| --- | --- | --- |
| Satış Asistanı, Destek Ajanı, Fatura Akışı, Sosyal Medya Yazarı, Kişisel Planlayıcı, Toplantı Notçusu | MARKETING CONCEPT ONLY | not shipped |
| Araştırma Aracı | REAL / IN DEVELOPMENT (AI Asistan page, document Q&A) | shown as "AI Asistan" in the individual list, not as a catalog card |
| Product Discover (add site & crawl, source products, 20-at-a-time processing, chat) | REAL AND CURRENT | catalog card 01, business list |
| Fiyat Karşılaştırma (quick-commerce price comparison demo) | REAL AND CURRENT (Demo Lab) | card 02, individual list |
| Web Scraping & Veri Madenciliği | REAL (service page) | card 03, business list |
| Yatırım Analizleri (retail datasets, investment analytics page) | REAL | card 04, business list |
| Finansal İndikatör & Botlar (currency rates data updated by a bot, indicators page) | REAL | card 05, individual list |
| RPA and API Entegrasyon Hizmetleri | REAL (service pages) | card 06, business list |
| Ajan Kütüphanesi | REAL (platform) | closing card inviting to the platform |
| Eğitim ve Danışmanlık | REAL (service page) | individual list |
| "Yüzlerce ajan", "test edilmiş", customer names, metrics | UNSUPPORTED | not shipped; vignettes use bars and status words, not numbers |

Taxonomy on cards: Ajan · Araç · Otomasyon · Katalog (closing card).

## 2. Audience (Kimin için)

"İki farklı ihtiyaç, tek platform." Two halves: İşletmeler için (Product Discover, Web Scraping, RPA ve API entegrasyonu, perakende ve yatırım analitiği) and Bireyler için (Fiyat Karşılaştırma, finansal göstergeler, AI Asistan, eğitim ve danışmanlık), each item linking to its real page or the platform. On fine pointers a hovered half expands (flex 1.5) while the other recedes (0.85) and its list unfolds; keyboard focus inside a half, or its heading button (`aria-expanded`), does the same; Escape and leaving collapse. Below 64rem both lists are open and the heading buttons are inert. `js/experience/audience.js`, `css/01-foundation/audience.css`.

## 3. Catalog

Wide (≥ 64rem): a 340vh section pins its viewport; native vertical scroll translates the card track horizontally (progress × maximum translation) while the rail stays anchored; the active card is the one nearest the left edge, reflected in the index, a status counter and the card's border and lift; clicking an index entry scrolls the page to that card's progress. Narrow (< 64rem, which covers the 768 tablet): a native horizontal scroll-snap track, arrow keys move between cards when the region is focused, index hidden, a "Kartları yana kaydırın" cue. `js/experience/catalog.js`, `css/01-foundation/catalog.css`.

## 4. Vignettes

Each card carries an 11-second CSS loop of states entering in sequence (s1…s5) and superseded states leaving (h2…h4): Product Discover (site added → source products listed → first 20 processed → comparison grid → ready, ask in chat); Fiyat Karşılaştırma (same product, three marketplaces → three price bars → lowest marked); Web Scraping (two scheduled URLs → extraction bar → structured cells → done); Yatırım Analitiği (dataset loaded → processing bar → growing bars → category breakdown → report ready); Finansal Göstergeler (USD/TRY daily data → bars against a threshold line → "izleniyor" becomes "aşıldı" → alert sent); RPA ve API (trigger → steps → system pipeline with tokens → form filled → API 200 → done); closing card (mosaic). Animations run only while a card intersects (IntersectionObserver), pause when the tab is hidden, and under reduced motion every state is shown at its end value with pending states hidden.

## 5. Performance

Baseline before this phase at 1440×900: 510 DOM nodes, 25 running animations. After: see the report. No new canvas, loop or dependency; the catalog writes one transform per changed frame through the shared scheduler and measures only on resize.
