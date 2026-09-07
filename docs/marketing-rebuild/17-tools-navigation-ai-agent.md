# 17 — Araçlar navigation taxonomy and the AI Agent product page

Date: 2026-09-07. Branch: `feat/tools-navigation-ai-agent` (from `main` at `1a0d71e`, after the mobile-hardening merge #335). Status: **local, awaiting review; not pushed, no PR.**

## 1. The Araçlar taxonomy

The canonical public header's top-level capability item is renamed from `Yetenekler` to `Araçlar`. It still leads to the homepage catalog (`#katalog` on the homepage, `/#katalog` on secondary pages, `https://teknoify.com/#katalog` on the Demo Lab; the homepage section itself is not renamed). The dropdown now carries exactly six items, in this order:

| # | Label | Route |
|---|---|---|
| 1 | AI Agent | `pages/ai-agent.html` (new) |
| 2 | API & Entegrasyon | `pages/api.html` (label only; file unchanged) |
| 3 | Robotik Süreç Otomasyonu | `pages/rpa.html` |
| 4 | Finansal İndikatör & Botlar | `pages/financial-indicators.html` |
| 5 | Web Scraping | `pages/webscraping.html` |
| 6 | Eğitim & Danışmanlık | `pages/training-consulting.html` |

`AI Asistan` (`pages/ai-assistant.html`) and `Yatırım Analizleri` (`pages/investment-analytics.html`) leave the canonical navigation. Their files, their shell, their sitemap entries and their public-artifact entries are untouched, so old links keep working; their future is a separate decision. Remaining references to them outside the header: the homepage audience list (editorial content, unchanged), the homepage catalog card 04 (frozen; the pending `polish/catalog-content-01` branch owns catalog content), `pages/subscription.html` (legacy header, not part of the shell), `packages/config/routes.js` (documentation of routes; `aiAgent` added).

## 2. One header source, fourteen pages

`scripts/shell/header.template.html` is now the only copy of the header markup. `scripts/shell/sync-shell.mjs` stamps it into the homepage too (new `<!-- shell:header -->` markers in `index.html`; the homepage's field markup is still owned by `js/experience/index.js` and is not stamped), into the twelve secondary pages and into `demo/index.html`. Placeholders resolve per origin: `{{home}}`, `{{katalog}}`, `{{contact}}`, `{{pages}}`; active states `{{active_home}}` (Ana Sayfa `aria-current="page"` on the homepage), `{{active_araclar}}` (`is-active` on every product page, including the two legacy routes), `{{active_demo}}`. The dropdown entry of the page being rendered gets `aria-current="page"` (styled in `css/01-foundation/header.css`), so `/pages/ai-agent.html` shows both Araçlar active and AI Agent current, on desktop and in the mobile sheet. `npm run check:shell` guards drift for all fourteen pages and the demo's generated copies.

Other canonical lists updated to the six items: the homepage footer group (heading `Yetenekler` → `Araçlar`; Product Discover and Fiyat Karşılaştırma, which are platform and demo destinations rather than tool pages, left the group and remain reachable through the Platform group and the catalog), and the AI Agent page's own footer.

## 3. The AI Agent page

`pages/ai-agent.html` is the first next-generation secondary page: canonical header and purple field through the shared shell, the foundation tokens and type (Schibsted Grotesk display, Inter Tight, Fira Code labels), the shared responsive layer, and its own stylesheet `css/ai-agent.css` (unlayered, mobile-first). Behaviour: `js/experience/agent.js` imports the shared `shell.js` (one canvas, one scheduler), lets each section own a field mode as on the homepage (hero → calm → order → lanes → calm → pulse), reuses the closing-section reveal observer, and runs the hero vignette.

Information architecture (all copy from the brief; structural labels added are the flow descriptors `hedef / adımlar / araç çağrıları / çıktı`, the diagram captions `hedef · plan · çalışma sırası` and `belirlenen akış veya program`, the window titles, and the reused homepage kicker `Sıradaki adım`):

1. Hero: eyebrow, `İşi tarif edin. Ajan çalışmaya başlasın.` (second sentence in the homepage's purple gradient), supporting copy, `AI Agent'ları keşfet` → platform, `Nasıl çalışır?` → `#nasil-calisir`; execution vignette on the right.
2. `AI Agent nedir?` → four-stage process rail (`Hedefi alır / Plan oluşturur / Araçları çalıştırır / Sonucu teslim eder`), vertical on phones, horizontal with nodes from 64rem.
3. `Tek bir ajan, birden fazla işi birbirine bağlayabilir.` → four linked cells (Araştırma, Veri, Analiz, Aksiyon) with connecting arrows on desktop.
4. `Ajan düşünür. Araç uzmanlaşır. Otomasyon tekrarlar.` → definitions and a workspace diagram: agent tier fanning out to three tool nodes, merging into the automation tier.
5. `Örnek çalışma` → five-row transcript (Kullanıcı, Ajan, Araçlar, İşleme, Çıktı) in the window surface, sticky heading on desktop.
6. `Ne yaptığını görebilirsiniz.` → three numbered principles.
7. `Tek kişilik ekipten kurumsal operasyona.` → two audience surfaces with example tags.
8. Final CTA (the homepage's composition, purple-toned): `İlk işi ajana verin.`, `Platforma git`, `Bize yazın` (Gmail compose).

Footer: the homepage's canonical `site-footer` with root-relative links, not the legacy footer (which carries three `href="#"` social links). No third footer system was created.

### Vignette behaviour

Timer-driven, no animation loop: the request types in (~26–50 ms per character), the plan items check in one by one, the tool chips light up, `Rapor hazır` appears, then the window holds its final state (about 7 s in total). It plays **once per page visit** (an in-memory `hasPlayed` flag, nothing persisted): the first time at least 30 percent of the window is in view the run starts; if the window leaves the viewport or the tab is hidden before the run ends, the sequence jumps to its completed state and its timers are cleared; scrolling back never restarts it; a reload or a new navigation plays it again. Under `prefers-reduced-motion` (without the review override `?motion=force`) the final state is shown immediately. The full request text is present for assistive technology in a visually hidden span; the typed copy is `aria-hidden`.

### Phone rhythm

Measured at 390×844 before the polish pass the page was 8,158 px tall. A phone-only block (≤ 47.99 rem) in `css/ai-agent.css` tightens what was air, not content: section padding `clamp(4rem, 9vh, 7rem)` → `clamp(3rem, 6.5vh, 4rem)` (76 → 55 px per edge), hero top `header + 2rem` and bottom 3 rem, hero and section grid gaps 40 → 32 px (run/control 32 → 24), flow rows 20 → 14 px padding, capability cells 24/32 → 20/24 px with 8 px label rhythm, definition rows 20 → 14 px, principle rows 24 → 18 px, audience cards and tags one step tighter, final CTA 101 → 64 px per edge. The canonical footer's tap rows keep their 33 px height but no longer add the 8 px list gap on top (shared layer). Type sizes are unchanged. Result at 390×844: **7,346 px** (−10 percent); 360×800: 8,290 → 7,511; 375×667: 8,003 → 7,346; 412×915: 8,227 → 7,359; 430×932: 8,136 → 7,255. Desktop and tablet heights are unchanged (1440×900: 5,289).

### Canonical URL

`<link rel="canonical" href="https://teknoify.com/pages/ai-agent">` on the AI Agent page only. Verified, not assumed: `netlify.toml` sets `pretty_urls = true`, `public/sitemap.xml` publishes every page in the extensionless form, and production answers `200` with no redirect on `/pages/rpa` and `/pages/ai-assistant` (the trailing-slash form 301s to the extensionless one). Other secondary pages still carry no canonical; that migration is separate (doc 05, section 8).

## 4. Verification

Local audit (real-time Edge) at 375×667, 390×844, 430×932, 360×800, 412×915, 432×960, 768×1024, 820×1180, 1024×768, 1280×800, 1440×900: document width equals the viewport everywhere; no escaping element; one canvas; no console, request or HTTP errors; heading order h1 → h2 → h3 valid; hero one column below 64rem and two columns above; capability cells 1 → 2 → 4 columns, audiences 1 → 2, footer 2 → 5; zero sub-32 px targets under a coarse pointer (the canonical footer's text links gained tap rows in `shell-responsive.css`); field purple share 9–16 percent; tab order reaches the four CTAs; reduced-motion state verified. Demo Lab: same six-item dropdown pointing at `https://teknoify.com/pages/…`, Demo current, one canvas. `npm run check:public` passes with the new page as an entry page and in the sitemap; the demo bundle regenerated (shell.js export, header.css current-entry rule).

## 5. Open items

- Page metadata: the other secondary pages still have no canonical URL (the AI Agent page has one; the site-wide form is the Phase B decision in doc 05).
- `pages/subscription.html` keeps its legacy header with the old labels; it is outside the shell (INVESTIGATE in doc 02).
- `pages/api.html` `<title>` still reads `API Entegrasyon Hizmetleri` (page content, not navigation).
- The legacy product pages still use the legacy footer; the AI Agent page shows the direction for their redesign.
