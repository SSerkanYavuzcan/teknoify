# 08 — Brand & Visual Foundation (Phase C → C.2)

Date: 2026-09-05. Branch: `feat/marketing-brand-foundation`. Status: **prototype awaiting visual review; not pushed, no PR.**

Phase C built the engineering foundation (tokens, cascade layers, fluid type, spacing, focus, reduced motion, containers). C.1 introduced the Signal Field. C.2 integrates copy and system into one stage, adds the signature gesture, and revisits type and colour. This record describes what stands now.

---

## 1. Direction: the Signal Field as one stage

**Principle: motion explains the product.** The hero is a single full-bleed composition, not copy beside a diagram. Five raw inputs enter from beyond the left edge along faint dashed traces that pass *behind* the headline (a soft reading zone keeps the text clear), surface as labelled markers to the right of the copy, and converge on a deep intelligence lattice right of centre. Outputs (Rapor, Uyarı, İş akışı, Otomatik eylem) live in a column on the far right whose rail drops through the hero's bottom edge and lands, at the same x, on the rail of the next section ("01 Gözlemle").

Depth: ambient field lines behind everything, two faint depth rings around the core, a diagonal light field from the upper right, a soft halo, hairline traces with two thicknesses, the reading zone, and a lateral mask so the field belongs to the canvas. No glass, no cards.

## 2. The signature gesture: disorder resolves into a column

One-shot, 8 s, plays once when the field first enters view:

| Phase | % | What happens |
| --- | --- | --- |
| Gather | 0–30 | three shards per input stream along the traces (fragmented signals), inputs and traces light in sequence |
| Understand | 30–52 | rings contract and turn, 36 ticks sweep in ion, the lattice rotates 120° and brightens, the core dot pulses |
| **Resolve** | 52–62 | the decision line draws from the core; the four outputs, until now scattered, rotated and ghosted, **snap into one aligned column** with overshoot, take a gold edge and a brief fill; the rail drops to the section edge and its node lights |
| Stillness | 62–100 | everything holds |

After resolution a quiet ambient loop continues (occasional shards, a 7 s breath in the halo). Under reduced motion the resolved frame is rendered directly. `?motion=force` and `?stage=pre` are review-only flags (force motion on a reduced-motion OS; hold the unresolved frame).

## 3. Compositions

- **Desktop (≥ 1024):** stage 1440 × 820 units, right-anchored scaling (`xMaxYMax slice`) so the output column never crops; copy 33 rem wide on the left; marker column at ≈ 48 % of width; core at ≈ 68 %; outputs at 80–95 %. Hero height clamps between 44 and 56 rem (92 vh).
- **Mobile (< 1024):** copy first, then a dedicated pipeline SVG: four inputs across the top feed a compact lattice, three outputs resolve below with the same snap, the rail continues down.

## 4. Typography

- **Display: Schibsted Grotesk 500/600** (neo-grotesk; authority without editorial softness; Latin Extended covers Turkish). Tested against **Host Grotesk** (technical-humanist, review flag `?type=b`) and the previous **Fraunces** (rejected: read as editorial/finance). Headline 40 → 68 px, −0.035 em tracking, 11 ch max, authored line breaks.
- **Body / UI: Inter Tight 400–700. Mono: Fira Code** for labels and kickers.
- Loading: one Google Fonts request for Schibsted Grotesk + Inter Tight plus Fira Code; self-hosting is a Phase D item.

## 5. Colour: role-based progression

| Role | Value | Meaning |
| --- | --- | --- |
| steel (`--color-signal`) | `#8797ad` | raw signals, technical labels |
| ion (`--color-accent`) | `#8fe3ff` | reasoning, links, focus, interactive |
| gold (`--color-action`) | `#f0c65e` | resolved action: output column, decision line, rail, accent clause |
| luminous CTA (`--color-cta`) | `#eef1f6` on `#0b0e14` | the primary button is the brightest object on the stage, no orange |

Canvas `#070a10`, surfaces `#0e121a` / `#141924`, text `#eef1f6` / `#a8b1bf` / `#717c8d`. Contrast: gold on canvas 12:1, CTA text 16:1, tertiary text 4.7:1. Paper mode keeps the roles with darkened accents. The earlier solar orange is gone; warmth survives only as the colour of resolved outcomes.

## 6. Header

Transparent over the stage (a top gradient only) until scrolled, then the surface returns; the mark is the **field mark**: a dashed ring (field), a rotated rounded square (lattice) and an ion point; wordmark in the display face; actions are a ghost "Giriş yap" and the luminous "Başla" CTA.

## 7. Surfaces, actions, icons, imagery

Hairlines and one inner highlight; radii 6/10/14/20 with buttons at 6 px; inline SVG 1.5 px stroke glyphs (the field's five inputs are the first icon set; Font Awesome remains only in legacy sections). Capability pages will reuse the field grammar (traces, lattice, structured outputs) per tool; real screenshots later sit on the inset surface. No fake dashboards.

## 8. Performance

No video, 3D or canvas; two inline SVGs (≈ 15 KB + 10 KB markup); animations on `offset-distance`, transform, opacity, stroke and fill; one-shot then a sparse loop; animations run only in view and with the tab visible; one rAF loop only while the pointer moves over the hero on fine pointers. Fonts with `display=swap`; LCP is the headline.

## 9. Accessibility

SVGs carry `role="img"`, title and Turkish description; the legend ("01 Girdi · 02 Zekâ · 03 Eylem") follows the phases in text; the reduced-motion frame is fully explanatory; no colour-only information; skip link, `main` landmark, real `<button>` hamburger with state; focus ring in ion.

## 10. Implementation notes

`css/01-foundation/hero-stage.css` (stage, field drawing, initial state, one-shot keyframes, ambient loop, reduced motion, hand-off), `css/00-settings/tokens.css` (Deep Field roles incl. `--color-cta`, Schibsted Grotesk), `css/02-generic/base.css`, `css/01-foundation/{actions,header}.css`, `index.html` (hero generated by a reproducible script; narrative stage 01 with the aligned rail), `js/script.js` (`SignalField`: arms once on view, marks resolution, syncs the legend, pointer depth, review flags), `images/favicon.svg`.
