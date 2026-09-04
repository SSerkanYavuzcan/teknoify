# 08 — Brand & Visual Foundation (Phase C → C.1)

Date: 2026-09-05. Branch: `feat/marketing-brand-foundation`. Status: **prototype awaiting visual review; not pushed, no PR.**

Phase C laid the engineering foundation (tokens, cascade layers, fluid type, spacing, focus, reduced motion, containers). Phase C.1 replaced its art direction: the amber-on-ink "Ink & Signal" hero with a typing terminal was judged a competent but conventional dark-SaaS composition. This record describes what stands now.

---

## 1. Creative direction: the Signal Field

**Principle: motion explains the product.** Teknoify turns fragmented inputs into working decisions, so the signature visual is a *system*, not a screenshot: heterogeneous inputs (web page, document, market signal, product data, task) travel along traces into a precise **intelligence lattice**; the lattice reasons in a moment of stillness; ordered outputs (report, alert, workflow, automated action) assemble on the far side. The visitor can read what Teknoify does from the field alone, and the three-step legend under the copy ("01 Girdi → 02 Zekâ → 03 Eylem") tracks the same phases in words.

Rejected on the way: the typing terminal (communicates developer tooling, not a broad automation platform); decorative particles and the canvas grid; gradient text; glassmorphic cards; a two-square lattice whose quarter turn was invisible (replaced by an asymmetric square + circle + three arcs).

## 2. Motion grammar

| Layer | Behaviour |
| --- | --- |
| **Signature** (12 s cycle, CSS/SVG only) | 0–24 % gather: ion packets travel input traces (`offset-path`), each input glyph and trace lights as its packet passes; 24–42 % understand: lattice turns 120° and brightens, core dot pulses, halo rises; 42–66 % act: solar packets leave the core, output boxes take a solar edge and a low fill; 66–100 % stillness: everything holds, then the cycle restarts. Packets are staggered 0.45–0.5 s so the field reads as a sequence, not a burst. |
| **Narrative** | Deferred to the homepage phase; only the first stage ("01 Gözlemle") and the rail hint at continuity, and the hero's spine line hands the output rail to the next section. |
| **Component** | Entrances reveal once (opacity + 8 px, 320 ms). |
| **Micro** | 150 ms colour/border changes, 1 px press, no lifts. |
| Depth | Layered SVG groups; on fine pointers the groups shift by at most 1–4 px per layer toward the pointer (rAF, eased, off on touch). A spatial hint, not a cursor follower. |
| Stillness | A third of every cycle is a hold. |

Runtime: animations run only while the field is at least 15 % in view and the tab is visible (`IntersectionObserver` + `visibilitychange` toggle `.is-live`); nothing animates offscreen. No canvas, no WebGL, no dependency.

Reduced motion: the field renders the *resolved* state (all inputs lit, lattice bright, outputs edged and filled), packets hidden, legend fully lit; the global rule in `base.css` neutralises everything else. A documented review-only override, `?motion=force`, adds `html.force-motion` so reviewers on a reduced-motion OS can inspect the motion; it is never set for visitors.

## 3. Compositions

- **Desktop (≥ 1280 px):** copy 10/24, field 14/24; field is a masked region of the canvas, not a card; inputs left, lattice centre, outputs right.
- **Laptop (1024–1279 px):** copy 5/12, field 7/12.
- **Tablet (768–1023 px):** stacked, copy first, desktop field below at full width.
- **Mobile (< 768 px):** a separate SVG: four inputs in a row feed a smaller lattice from above; three outputs stack below. Same phases, same classes, fewer elements; packets still travel.

## 4. Typography

- **Display: Fraunces** (variable, optical size 144 in the hero, 96 in section titles, weight 500, italic for the accent clause). An editorial serif separates Teknoify from grotesk-heavy AI brands and carries authority in Turkish; Latin Extended covers ğ, ş, İ, ç, ö, ü.
- **Body / UI: Inter Tight** 400–700 (retained: readable, neutral next to the serif, Turkish rendering is excellent).
- **Mono: Fira Code** for technical labels, kickers, field labels.
- Scale unchanged from Phase C (display 40→68 px, H1 34→56, H2 26→38, lead 17→19, body 16). Headline max width 12ch with authored line breaks.
- Loading: one Google Fonts request (Fraunces 500/600 + Inter Tight 400–700) plus Fira Code; self-hosting/subsetting is a Phase D item.

## 5. Color: "Deep Field"

Near-monochrome UI with a spectral range reserved for meaning:

| Role | Value | Meaning |
| --- | --- | --- |
| canvas / surface / elevated / inset | `#070a10` / `#0e121a` / `#141924` / `#0a0d14` | depth by layering, not blur |
| text primary / secondary / tertiary | `#eef1f6` / `#a8b1bf` / `#717c8d` | 17:1, 9.4:1, 4.7:1 on canvas |
| **steel** `--color-signal` | `#8797ad` | raw inputs, technical labels |
| **ion** `--color-accent` | `#8fe3ff` | intelligence, links, focus, interactive |
| **solar** `--color-action` | `#ffb454` | action, outcomes, primary CTA (10:1 on canvas; ink text on solar 12:1) |
| positive / warning / destructive | `#5ee0a0` / `#ff8a5b` / `#ff6b6b` | status only |

Amber survives only because the system gives it a job: it is the colour of *outcome*, which is also what the primary CTA promises. Ion is the brand's interactive colour. Paper mode (`.theme-paper`) carries the same roles with darkened accents for light surfaces. Indigo is gone.

## 6. Surfaces, actions, icons, imagery (unchanged principles, adjusted values)

Hairlines and one inner highlight for depth; radii 6/10/14/20 with buttons at 6 px; primary button solar with a 1 px inner top highlight; secondary hairline; ghost text. Icons: inline SVG 1.5 px strokes (the field's glyphs are the first set); Font Awesome remains only for legacy sections. Imagery: the Signal Field *is* the imagery language; capability pages will reuse its grammar (traces, lattice, structured outputs) per tool, and real platform screenshots later sit inside the same inset surface. No fake dashboards.

## 7. Brand mark

Replaced the T-mark with the **field mark**: a ring (the field), a trace entering from the lower left, and an ion point at the centre (the resolved signal). Used inline in the header and as `images/favicon.svg`.

## 8. Performance budget (met by the prototype)

No video, no 3D, no canvas; two inline SVGs (≈9 KB + 7.7 KB of markup); CSS animations on transform/opacity/offset-distance/stroke/fill only; one rAF loop that runs only while the pointer moves over the hero; animations paused offscreen and in hidden tabs; fonts loaded with `display=swap`; LCP is the headline text. Nothing blocks interaction readiness.

## 9. Accessibility

The SVGs carry `role="img"` with a title and a Turkish description; the legend duplicates the narrative in text; reduced motion is fully static and still explanatory; no information is colour-only (every packet ends in a labelled box); focus ring is ion on a canvas gap; the hamburger is a real button with state.

## 10. Implementation notes

`css/01-foundation/hero.css` (field, grammar, mobile variant, narrative hint), `css/00-settings/tokens.css` (Deep Field palette, Fraunces), `css/02-generic/base.css` (canvas horizon + dot field, reduced-motion gate), `css/01-foundation/{actions,header}.css` (button radius/highlight, wordmark), `index.html` (hero markup generated from a reproducible script, narrative stage 01, field mark, fonts), `js/script.js` (`SignalField` controller, review flag), `images/favicon.svg`.
