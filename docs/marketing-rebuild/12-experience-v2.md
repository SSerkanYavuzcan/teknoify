# 12 — Homepage Experience v2 (first pass): productionizing the interaction north star

Date: 2026-09-05. Branch: `feat/homepage-experience-v2` (from `main` at `8614c47`). Status: **local prototype awaiting manual side-by-side review; not pushed, no PR.**

The user-authored prototype `design-reference/teknoify-interaction-north-star.html` is the creative and interaction north star for the homepage. The experimental Phase D / D.1 / D.2 branches (`feat/homepage-scroll-narrative`) are preserved for history and are not used. This first pass productionizes four things only: the environmental field, the hero, the scroll-scrubbed manifesto and the pinned "how it works" journey. Who, catalog, why, final CTA and footer are untouched (the legacy contact section stays below, visually isolated).

---

## 1. Product truth gate (reference content → status)

| Reference item | Status | Decision |
| --- | --- | --- |
| "Geleceğin iş gücünü bugün inşa edin" headline; "hazır ajanlar, araçlar ve otomasyonlar; seçin, bağlayın, çalıştırın" | MARKETING CONCEPT (positioning) | kept: describes the platform's agent library, tools and services without numbers |
| Terminal `ai_core.py` typing | PROTOTYPE PLACEHOLDER | replaced by the Ajan Kütüphanesi search window listing real entries |
| Sales Assistant, Support Agent, Invoice Flow, Social Media Writer, Meeting Notetaker | MARKETING CONCEPT ONLY | not shipped |
| Personal Planner | PROTOTYPE PLACEHOLDER (a broken legacy member tool existed) | not shipped |
| Research Tool | REAL / IN DEVELOPMENT (AI assistant page, document tooling) | not used in this pass |
| Product Discover agent (add site & crawl, source products, process 20 at a time, chat) | REAL AND CURRENT (platform) | the journey's subject; UI labels taken from the real agent |
| Fiyat karşılaştırma (quick-commerce price comparison), web scraping | REAL AND CURRENT (tool + service page + demo) | hero window rows, journey catalog tiles |
| Yatırım analitiği, finansal göstergeler | REAL AND CURRENT (pages, datasets, indicator bot) | hero window row, journey tiles |
| RPA, API entegrasyonu | REAL (service pages) | journey tile |
| "Yüzlerce ajan", "test edilmiş ajanlar", "7/24 çalışır", "24 fatura bugün", "12 nitelenen talep", customer names (Ayşe K.) | UNSUPPORTED CLAIMS | rejected; the journey's numbers are the demo's own steps and are labelled "temsilî" |
| Permissions list (e-posta okuma/gönderme, CRM yazma) | fictional | replaced with what the real agent touches: added sites (read), your workspace (write), chat history (your account) |
| `href="#"` CTAs | placeholder | every product CTA routes to `https://platform.teknoify.com/` |

## 2. What was preserved from the reference

Scroll-controlled progression with native scrolling; the fixed environmental field with story-driven modes (calm · chaos→order · lanes · pulse) and pointer lens/ripples; the staged hero entrance (clipped headline lines, delayed copy and CTAs, the window fading and settling, the scroll hint, parallax and fade on leaving, pointer tilt); the sticky manifesto revealed word by word with the field moving from chaos to order; the 440vh pinned journey with four tabs whose bars fill with scroll progress, one device window with four panels, a scripted cursor demonstrating each step, controls that answer real clicks, tabs that scroll to their step; mobile simplifications (tab descriptions hidden, two-column tiles, simplified panels, hidden fifth node); reduced-motion handling (static states, no scripted cursor).

## 3. What was intentionally changed

- Visual system: production tokens (Deep Field palette, Schibsted Grotesk, Inter Tight, Fira Code, ion accent, gold for resolved states) instead of the prototype's indigo/Syne, so the page keeps the approved brand.
- Loader removed: the entrance starts on document ready (fonts awaited at most 900 ms). No artificial hold.
- Custom cursor kept but opt-in: fine pointers with motion only, shown after the first real pointer movement so the native cursor is never hidden early.
- Field runtime: DPR capped at 1.5, cell size grows on low-memory or save-data devices and self-throttles when a frame costs more than about 9 ms, the loop stops while the document is hidden, and under reduced motion the field renders once per story change instead of every frame.
- One shared scheduler: a single requestAnimationFrame loop with one scrollY read per frame; modules skip work when scroll has not changed; the journey's demo timers clear when the section leaves the viewport or the tab is hidden.
- Semantics: tabs are real `role="tab"` buttons with roving tabindex and arrow keys; tiles, chips, connect buttons and run are real buttons; panels use `hidden`; the device window is labelled "temsilî demo".
- Header, navigation and the contact section stay as production has them.

## 4. Architecture

`js/experience/scroll.js` (viewport state, scheduler, progress helpers) · `field.js` (canvas field) · `hero.js` · `manifesto.js` · `journey.js` · `pointer.js` · `index.js` (wiring and section ownership of the field). CSS: `css/01-foundation/experience.css` (field, chrome, window surface), `hero.css`, `manifesto.css`, `journey.css`. Loaded as one ES module; no framework, no library.

## 5. Review

Reference: `http://localhost:8790/design-reference/teknoify-interaction-north-star.html`. Implementation: `http://localhost:8790/`. Review flags: `?motion=force` on reduced-motion systems.
