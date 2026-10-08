# 21 — Native cursor restored; cookie consent on the Teknoify purple

Date: 2026-10-08. Branch: `fix/native-cursor-cookie-brand` (from `main`). Scope: the homepage's custom cursor and the cookie-consent branding. No content, field, header, Tools page or cookie behaviour change.

## 1. Custom cursor removed

The custom cursor existed only on the homepage: two nodes in `index.html` (`.cursor` dot, `.cursor__ring`), the cursor half of `js/experience/pointer.js` (a `mousemove` listener driving the dot, `mouseover` toggling the hover ring, `mouseenter`/`mouseleave` for the out state, and a scheduler task lerping the ring every frame) and a rule block in `css/01-foundation/experience.css` (fixed nodes at `z-index: 3000`, cyan ring, `html.has-cursor … { cursor: none }`). Secondary pages never had it (`shell.js`).

Removed: the two nodes, the four cursor listeners and the per-frame ring task, the `has-cursor` opt-in class, every `.cursor*` rule and the `cursor: none` override. `pointer.js` now only feeds the field (pointer lens via `pointermove`, click ripple via `pointerdown`, `mouseleave` parking the lens), the same three listeners the secondary-page shell uses; `scroll.js` imports it no longer needs are gone. The generated `demo/styles/shell.css` was re-synced.

Result: native cursor semantics everywhere. Computed `cursor` is `auto` on `html`, `body` and `main`, `pointer` on links and buttons (their own styles), text on inputs; nothing forces `cursor: pointer` globally. The field's pointer lens and click ripple are unchanged.

## 2. Cookie consent branding

The consent panel took its accents from the legacy `--primary` alias, which resolves to the ion cyan (`#8fe3ff`). The block moved out of `css/06-pages/home.css` (legacy layer) into `css/05-components/cookie-consent.css`, imported in the foundation layer after `actions.css`, so its own focus ring wins over the generic cyan `:focus-visible` rule. Rules are otherwise the same; the panel's `h4` keeps the foundation heading size it already had in production (the old `1rem` override had never applied), so geometry is pixel-identical (450×200 at 1440, 370×217 at 390).

Component-scoped tokens on `.cookie-banner`: `--cookie-purple: #5945d2`, `--cookie-purple-hover: #6b58e6`, `--cookie-purple-active: #4b3ac0`, `--cookie-lavender: #b2a4f2` (the Tools system's lavender; no purple interaction tokens exist in the global token set, which is still cyan-based).

| Element | Before | After |
|---|---|---|
| Left accent border (4px, 12px radius) | cyan `--primary` | `#5945d2` |
| Cookie icon | cyan | `#5945d2` |
| Kabul Et default | cyan, white text | `#5945d2`, white text (6.5:1) |
| Kabul Et hover | `#5e50ee`, shadow `rgba(115,103,240,.4)` | `#6b58e6`, lift kept, shadow `rgba(89,69,210,.4)` |
| Kabul Et active | none | `#4b3ac0`, no lift |
| Link hover | cyan | lavender `#b2a4f2` |
| Focus-visible (links, Kapat, Kabul Et) | generic cyan ring | `2px solid #b2a4f2`, offset 3px |
| Kapat, surface, copy, links, z-index 99999 | unchanged | unchanged |

`js/cookies.js` is untouched: consent key, Accept / Kapat behaviour, policy links, Google Analytics loading, 1.5 s appearance.

## 3. Verification

Local matrix: homepage, AI Agent, Web Scraping, API, RPA, Finansal İndikatör & Botlar, Eğitim & Danışmanlık and KVKK at 1440×900, homepage also at 1280×800, 1024×768, 390×844, 360×800, 412×915: zero fake cursor nodes, no `has-cursor` class, native cursor values as above, one canvas, no console or request errors. Window listeners on the homepage after the change: pointerdown, pointermove, resize, scroll, wheel, touchstart, keydown, pagehide (field, scheduler, journey); no `mousemove`/`mouseover` left. Cursor over the panel background, icon, links, Kapat and Kabul Et resolves to `auto` / `pointer` with no overlay. Accept sets consent, removes the panel, loads analytics, and the panel does not return after reload; Kapat hides it; touch tap on Kapat works at phone widths. Homepage pixel diff against production (cookie panel and field excluded): 0.00 percent at 1440, 1280 and 1024, 0.03 percent at 390. `npm run check:shell` in sync, `npm run check:public` passing.
