# 08 — Brand & Visual Foundation (Phase C)

Date: 2026-09-05. Branch: `feat/marketing-brand-foundation` (from `main` at `593dff9`). Status: **implemented on the branch, awaiting visual review; not pushed**.

This is a design decision record, not a style guide. Values live in `css/00-settings/tokens.css`; components in `css/01-foundation/`.

---

## 1. Creative direction: "Ink & Signal"

Teknoify sells scheduled business automation, agents and investment intelligence to Turkish enterprise buyers. The identity should read as an instrument you trust, not as a startup landing template. Three directions were formulated:

| Direction | Idea | Why not / why |
| --- | --- | --- |
| A. **Ink & Signal** (chosen) | Deep ink canvas (not black), typographic hierarchy carried by a characterful grotesk, hairline surfaces, one **amber signal** accent used like an indicator light, cyan reserved for data/code. Warm "paper" mode for long-form content. | Distinct from the purple/indigo dark-SaaS norm; amber on ink is rare in this category and maps to the product's "control room" idea; scales to tools/agents pages (each capability gets a signal, never a gradient); performs (no imagery required); relates to a dark platform UI without copying application chrome. |
| B. Editorial Ledger | Warm off-white paper as the default, ink typography, copper accent, data tables and rules as ornament. | Strong for trust and investment content, but the platform is dark and the brand would flip theme at the sign-in boundary; a light default also makes the terminal/technical motifs feel bolted on. Retained as the **paper mode** inside A. |
| C. Field Grid | Graphite canvas with a persistent engineering grid, electric cyan accent, monospace everywhere. | Reads as a developer tool and drifts toward the crowded cyan/grid dark-SaaS look; monospace-heavy UI hurts Turkish body copy readability. Its useful part, technical labels in mono, survives in A as `.t-label`. |

Rejected outright: the existing "quantum grid" canvas and floating particle field (decorative AI particles), gradient text, glowing borders, the rotating-light login button.

## 2. Typography

- **Display / headings: Bricolage Grotesque** (variable, opsz axis; Latin Extended covers Turkish). Authority and character at 34–68 px without shouting; tight tracking (−0.025em) and 1.05 line-height on display, 1.2 on H2/H3.
- **Body / UI: Inter Tight** retained (already loaded, excellent Turkish rendering, neutral next to the display face). Weights trimmed to 400–700.
- **Mono: Fira Code** retained for technical labels, kickers, code surfaces; JetBrains Mono listed as fallback for a future self-hosted swap.
- Scale (fluid, 375→1440 px): display 40→68, H1 34→56, H2 26→38, H3 20→26, lead 17→19, body 16, small 14, caption 12, nav 15. Headline max width 14ch; prose 42rem.
- Loading: one Google Fonts request for both sans families, `display=swap`, preconnect kept. Self-hosting and subsetting are a Phase D toolchain item.

## 3. Color roles

Dark (default): canvas `#0b0e14`, surface `#11151d`, elevated `#171c26`, inset `#0d1118`; text primary `#f3f5f8`, secondary `#b1b9c6`, tertiary `#7d8797`; borders 8 % / 16 % white; **accent amber `#f4b53f`** (hover `#ffc75c`, active `#e3a22b`, soft 12 %, text-on-accent `#1a1204`); **signal cyan `#5fd4cf`** for data and code only; positive `#4ade80`, warning `#fb923c`, destructive `#f87171`; focus `#ffd27a`.

Paper mode (`.theme-paper`): canvas `#f6f3ec`, surface white, text `#12151b`/`#4b5462`, accent darkened to `#b7790f` for 4.5:1 on paper.

Contrast (WCAG): primary text on canvas 17:1; secondary 9.6:1; tertiary 4.9:1; amber on canvas 10.5:1; accent-fg on amber 11:1; nav secondary text 9.6:1. No information is carried by color alone (the signal dot always sits beside text).

The old indigo seed is **rejected** as brand color: it is the default of the category. It survives nowhere in the foundation; legacy sections still show it until they are rebuilt.

## 4. Spacing and layout

- 4 px base; tokens `--space-1…32`.
- Containers: prose 42rem, md 64rem, **lg 72rem (default)**, xl 80rem (hero/nav).
- Gutters: 20 px (<480), 24 px (≥480), 32 px (≥1024), 40 px (≥1440). Never below 20 px.
- Section rhythm: `--section-y` = clamp(64px, 3rem+4vw, 112px); adjacent sections separated by a hairline, not by empty space.
- Breakpoints (rem): 30, 48, 64, 80, 90. Two-column compositions stay two-column down to 1024 px, then stack with the text first.
- Primitives: `.l-container`, `.l-section`, `.l-section-head`, `.l-stack`, `.l-cluster`, `.l-grid`, `.l-split`. Layout is grid/flex, no fixed pixel widths.

## 5. Surface language

Depth from hairlines and a single inner highlight; shadows only for raised (`--shadow-raised`) and overlay surfaces. Radii 6/10/14/20; tags are rectangular (6 px), not pills. Cards only to group or to act (`.s-surface`, `--interactive`). Highlighted content is an amber left rule (`.s-highlight`), not a box. Technical content sits on the inset surface with a mono bar (`.s-code`). The hero terminal is the first instance of this language.

## 6. Actions

`.btn` (44 px min height, 10 px radius, 14 px semibold), `.btn-primary` amber/ink, `.btn-secondary`/`.btn-outline` hairline, `.btn-ghost` text, `.btn-sm` (40 px), `.btn-lg` (52 px). `.link-action` (arrow affordance), `.link-inline` (underline that turns amber). States: hover, focus-visible (2 px canvas gap + 2 px amber ring), active (1 px press), disabled (50 %). Class names are unchanged so every existing page inherits the new buttons.

## 7. Icons

Decision: **inline SVG, 1.5 px stroke, 20/24 px, one set** (Lucide-compatible geometry) introduced with the navigation/homepage phase; Font Awesome stays loaded only until the legacy sections that use its 938 glyphs are rebuilt, then the CDN stylesheet is removed. No new icon dependency was added in this phase. New brand assets: the **T-mark** (bar-and-stem "T" with an amber signal dot) as inline SVG in the header and as `images/favicon.svg` (fixes the missing favicon). Existing image assets: none worth keeping.

## 8. Imagery / product visual direction

No fake dashboards. Capabilities are shown as **schematic capability diagrams**: monoline strokes on the inset surface, amber for the "live" path, cyan for data, labels in mono. Suitable for scheduled workflows (tracks and timelines), agent → tool → result narratives, and data flows without inventing UI. Real platform screenshots, when available, sit inside one consistent window chrome derived from the terminal surface. The current typing terminal is the interim placeholder for this language.

## 9. Motion principles

Durations 150 / 220 / 320 ms; `ease-out` for entrances and state, `ease-in-out` for movement. Entrances reveal once (opacity + 8 px), hover states 150 ms, no looping decoration, no parallax. Global reduced-motion rule in `base.css` neutralizes all animation and transitions; `.m-reveal` and the cursor blink additionally opt out. The hero animation is deferred to the hero phase; the particle field and canvas grid are retired.

## 10. Responsive principles

Mobile is designed, not derived: the mobile nav is a full-width sheet under the header with inlined sub-links (every destination reachable on touch), 48 px rows and full-width CTAs; the hero stacks text-first with the terminal below; type and gutters scale by tokens. Verified at 1440, 1280, 768, 390 and 375 px (see §12).

## 11. Accessibility foundation

Skip link, `<main id="main">`, `<nav aria-label>`, hamburger is a `<button>` with `aria-expanded`/`aria-controls` (synced by `script.js`), `aria-current` on the active nav item, decorative icons `aria-hidden`, global `:focus-visible` policy, 44 px targets, reduced motion honored globally, contrast per §3.

## 12. Implementation notes and review results

- `css/style.css` now declares cascade layers `tokens, base, legacy, foundation`; legacy stylesheets are imported into `legacy`, the foundation into `foundation`, so the foundation wins without specificity games. Page-specific stylesheets stay unlayered and override for their own selectors. The one legacy `!important` block (nav login light effect) was deleted because `!important` inverts layer order.
- New files: `css/01-foundation/{typography,layout,surfaces,actions,header,motion,hero}.css`; rewritten `tokens.css` (with legacy aliases) and `base.css`; `images/favicon.svg`.
- Markup changed only on `index.html` (head links, skip link, header, hero kicker/title/CTAs, `main` id). Other pages inherit the foundation through shared classes and keep their old header markup (visible inconsistency accepted until the navigation phase).
- Review on the built artifact: desktop 1440 and 1280 show the ink canvas, Bricolage headline at 68 px, amber CTAs (48 px), 72 px header; tablet 768 stacks text first after fixing a legacy `order` conflict; zero failed same-origin requests; artifact gate green.

## 13. Known refinements before approval (see the end-of-phase critique)

Listed in the phase report; tracked for the navigation/homepage phase.
