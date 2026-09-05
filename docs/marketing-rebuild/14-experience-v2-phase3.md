# 14 — Homepage Experience v2, phase 3: Why Teknoify, trust, final CTA, footer

Date: 2026-09-05. Branch: `feat/homepage-experience-v2-phase3` (from `main` at `caad282`). Status: **local prototype awaiting manual review; not pushed, no PR.**

Completes the homepage after the catalog with a calmer, trust-oriented ending: discovery → understanding → confidence → action. The approved sections (hero, manifesto, journey, audience, catalog), navigation, logo, field architecture and favicon system are untouched. New: `css/01-foundation/closing.css`, `js/experience/closing.js` (one IntersectionObserver that adds `.is-in` once per `[data-reveal]`; skipped under reduced motion).

## 1. Claim gate

| Claim | Evidence | Status | Decision |
| --- | --- | --- | --- |
| Ready to use: pick from the library, add to your workspace, run the same day | Product Discover flow (add site → source products → process 20 → chat), catalog card CTAs to the platform | VERIFIED | Why 01 "Hazır" |
| Every capability corresponds to a real job (product discovery, price comparison, scheduled scraping, rates tracking, process automation) | catalog product truth (phase 2 gate), service pages, demo, rates bot | VERIFIED | Why 02 "Gerçek işler için" |
| Modular: agents, tools and automations work independently; start with one | library taxonomy (Ajan · Araç · Otomasyon), per-agent add-to-workspace | VERIFIED | Why 03 "Parça parça" |
| You connect your own sites, data sources and systems; outputs accumulate in your workspace and can be queried by chat | Product Discover (user adds sites, chat over results), scraping/API services | SUPPORTED (Product Discover verified; services general) | Why 04 "Bağlı" |
| Visible access: in Product Discover, added sites are read, results written to the workspace, chat history stays in the account | phase 1 access list derived from the real agent (`docs/marketing-rebuild/12-experience-v2.md` §1) | VERIFIED for Product Discover; phrased as that example | Trust "Görünür erişim" |
| Controlled execution: agents run when you start them and in user-triggered batches of 20 | Product Discover "Sonraki 20 ürünü işle" | VERIFIED | Trust "Kontrollü çalıştırma" |
| teknoify.com is a marketing surface only; sessions, accounts and data live on platform.teknoify.com | ADR-0002, public artifact contract (no Firebase/auth in `dist/`), `/dashboard/*` → platform redirects | VERIFIED | Trust "Ayrı yüzeyler" |
| You add the sources; agents only work with the sources you added | product model (Product Discover requires added sites; scraping/RPA scopes are customer-defined) | SUPPORTED BUT GENERAL | Trust "Kendi bağlantılarınız", phrased positively |
| Flows on this page are representative and based on real products; no references, numbers or certification claims | this repository's own content rules | VERIFIED | Trust note |
| "Your data never leaves your account", "fully isolated", "encrypted end-to-end" | no evidence in this repository | UNSUPPORTED — DO NOT SHIP | rejected |
| "Enterprise-grade security", SOC 2, GDPR/KVKK compliance as certification, uptime guarantees | none (KVKK aydınlatma metni exists as a legal page, not a compliance claim) | UNSUPPORTED — DO NOT SHIP | rejected; legal pages linked in the footer only |
| Stop/remove an integration at any time (prototype "istediğiniz an durdurursunuz") | platform behaviour not verifiable from this repository | UNSUPPORTED — DO NOT SHIP | rejected |
| "Test edilmiş ajanlar", customer names, metrics, social profiles | none | UNSUPPORTED | rejected; footer social links (`href="#"`) removed |

## 2. Sections

- **Neden Teknoify** (`#neden`, field `order`): a resolve line with "Keşif tamamlandı" closes the catalog's horizontal energy; left column statement "Sıfırdan kurmazsınız. Hazır olanı seçersiniz."; right column an ordered list of four principles with dividers, the first set larger.
- **Güven ve kontrol** (`#guven`, field `order`): "Kara kutu değil." and a 2×2 definition list on a hairline grid (Görünür erişim · Kontrollü çalıştırma · Ayrı yüzeyler · Kendi bağlantılarınız) plus a gold-ruled honesty note.
- **Sıradaki adım** (`#contact`, field `pulse`): "Keşif tamam. / Şimdi çalıştırın." with two clipped-line reveals, one sentence, primary `Platforma git` → `https://platform.teknoify.com/`, secondary `Bize yazın` → `mailto:info@teknoify.com`, and a mono meta line (e-mail, İstanbul). Keeps the `#contact` id so the header link and the service pages' "Teklif İste" links still land on a working path.
- **Footer** (`.site-footer`): canonical lockup, one-line description, four navigation groups (Yetenekler · Platform · Ana sayfa · Şirket ve yasal) containing only real destinations, and a bottom row with the copyright and the three domains. Legacy `.footer` styles are untouched for the other pages.

## 3. Legacy contact form

Removed from the homepage. The form posted to `https://api.teknoify.com/submitContactForm`, which the production audit (`01-repository-production-audit.md` §Endpoints, `05-production-boundary-and-legacy-exit.md` §1 item 5) records as unreachable (TLS handshake fails; re-confirmed today). The form markup, its toast markup, the inline toast styles and the inline `showToast` script were removed from `index.html`; the `ContactForm` and `CustomSelectSystem` classes in `js/script.js` and the legacy CSS remain in place (they no-op without the form) so the form can be re-hosted on a dedicated page once the endpoint has an owner (open question U6). The final CTA carries the verified contact path (`info@teknoify.com`).

## 4. Motion, accessibility, performance

One authored entrance per block (opacity/translate 16px, CTA lines clip-revealed), no loop, no pinning, no new canvas or dependency. Under `prefers-reduced-motion` every state is shown at its end value and the observer is skipped. Headings stay h2 per section with h3 principles; the footer uses labelled `nav` groups with h3 headings; buttons and links are real, focus-visible styles apply. Cost: ~12 KB CSS, ~1 KB JS, one IntersectionObserver over 13 targets; total DOM 885 nodes versus 880 before (the legacy form, its custom select and the toast were removed).

## 5. Pre-merge corrections

- Header: the "Hizmetler" item pointed at `#services`, which no longer exists. It is now "Yetenekler" → `#katalog` (desktop and the inlined mobile menu share the same list); the dropdown of service pages is unchanged. Every header anchor (`#home`, `#katalog`, `#contact`) resolves.
- Title "Teknoify | Hazır yapay zekâ ajanları, araçlar ve otomasyonlar"; description rewritten around the current positioning; `rel="canonical"` → `https://teknoify.com/` added (the homepage had no canonical or OpenGraph tags; none invented).
- Contact address: `info@teknoify.com` is the address named in the KVKK aydınlatma metni and gizlilik pages as the contact for data-rights requests, appears on every page and the demo, and has been in the repository since the initial commit. `merhaba@teknoify.com` exists only in the prototype and is not used.
- Trust scope: Product Discover behaviour (three-line access, batches of 20, chat) is now written as the labelled example; scheduled work (planned scraping, the daily rates bot) is named as such; "agents only work with what you added" was narrowed to source-bound capabilities, with a note that tools on prepared data state their source. Why 04 says chat querying applies to Product Discover.
