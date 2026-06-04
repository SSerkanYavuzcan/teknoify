# Investment Analytics CSS Split Strategy

## 1. Title and purpose

This document is the Phase 6A Investment Analytics CSS split and manifest strategy. It is documentation-only and does not move, relink, refactor, or edit runtime CSS, HTML, JavaScript, formatter/chart/calculator modules, data files, scripts, workflows, package files, or public route files.

The goal is to plan a safe enterprise-level split of Investment Analytics CSS without changing public page behavior yet. Phase 6A defines the current stylesheet graph, risk areas, future ownership boundaries, manifest strategy, and smoke-test expectations that should be satisfied before any runtime stylesheet split or page `<link>` change.

## 2. Why CSS split needs a strategy

CSS splitting must be planned separately from JavaScript extraction because stylesheet behavior depends on cascade order, selector specificity, media-query placement, and static hosting paths.

- CSS order and specificity can silently break layout even when all selectors remain syntactically valid.
- Calculator, chart, premium, sector, responsive, and shared card styles may be coupled through shared containers, grids, variables, and generated class names.
- Static pages currently depend on stable linked stylesheet paths, so a file move or page relink can break production-like static hosting even if local development appears correct.
- Visual regressions may not be caught by lint/check because layout, spacing, stacking context, clipping, and responsive behavior require manual or visual validation.
- CSS should be split behind a stable manifest/import file before page links are changed so public routes can keep loading the same stylesheet path while internal ownership is proven.

## 3. Current files to inspect

Phase 6A inspected the following files and paths, but this PR does not edit runtime page, CSS, JavaScript, data, script, workflow, package, or route files:

- `pages/investment-analytics.html`
- `pages/investment-retail.html`
- `pages/investment-airlines.html`
- `pages/financial-indicators.html`
- `css/investment-analytics.css`
- `css/06-pages/investment-analytics/*`
- `css/financial-indicators.css`
- Shared/global stylesheet dependency `css/style.css`, including its imported settings, generic, element, object, component, footer, and home layers.
- External linked style dependencies on the inspected pages, including Google Fonts and Font Awesome.

## 4. Current CSS inventory

| Current Path                                          | Type         | Approx Role                                         | Imported By                                                                                                       | Major Responsibilities                                                                                                                                                                              | Suggested Future Area                                                                                                                      | Split Priority     | Risk   | Notes                                                                                                            |
| ----------------------------------------------------- | ------------ | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ | ------ | ---------------------------------------------------------------------------------------------------------------- |
| `css/style.css`                                       | shared-style | Site-wide public stylesheet manifest                | Linked before investment CSS by investment analytics, retail, airlines, and financial indicators pages            | Imports tokens, base, forms/buttons, layout, hero/services, contact modal, footer, and home layers                                                                                                  | keep in current CSS path for now                                                                                                           | P2-do-not-move-yet | High   | Must remain before page-specific investment CSS unless a separate global stylesheet migration proves parity.     |
| `css/investment-analytics.css`                        | manifest     | Public Investment Analytics stylesheet manifest     | Linked by `pages/investment-analytics.html`, `pages/investment-retail.html`, and `pages/investment-airlines.html` | Imports Investment Analytics partials in cascade order                                                                                                                                              | `domains/investment-intelligence/analytics/styles/index.css`                                                                               | P0-first           | High   | Keep as the public manifest until a replacement manifest mirrors order and passes smoke tests.                   |
| `css/06-pages/investment-analytics/base.css`          | partial      | Page-level helper placeholder                       | `css/investment-analytics.css` import 1                                                                           | Minimal placeholder for future base helpers                                                                                                                                                         | `domains/investment-intelligence/analytics/styles/layout.css` or `domains/investment-intelligence/analytics/styles/index.css`              | P0-first           | Low    | Lowest-risk current partial because it contains only a placeholder comment.                                      |
| `css/06-pages/investment-analytics/hero.css`          | partial      | Analytics hero layout                               | `css/investment-analytics.css` import 2                                                                           | Hero grid, content stacking, and hero section alignment                                                                                                                                             | `domains/investment-intelligence/analytics/styles/hero.css`                                                                                | P1-later           | Medium | Coupled to shared hero classes from global CSS and responsive overrides.                                         |
| `css/06-pages/investment-analytics/orbit-visual.css`  | partial      | Hero visual and animation                           | `css/investment-analytics.css` import 3                                                                           | Orbit visual, animated rings/nodes/cards, reduced-motion behavior                                                                                                                                   | `domains/investment-intelligence/analytics/styles/hero.css`                                                                                | P1-later           | Medium | Could remain separate as `orbit-visual.css` if future ownership wants finer hero boundaries.                     |
| `css/06-pages/investment-analytics/calculators.css`   | partial      | Calculator UI and generated chart/table styles      | `css/investment-analytics.css` import 4                                                                           | Calculator selector, compound calculator, CAGR calculator, retirement calculator, calculator cards, generated SVG chart classes, tables, validation messages, focus states, and local media queries | `domains/investment-intelligence/analytics/styles/calculators.css`                                                                         | P2-do-not-move-yet | High   | High risk because it spans three calculators plus JS-generated chart/table markup. Do not start here.            |
| `css/06-pages/investment-analytics/sections.css`      | partial      | Main analytics sections and shared investment cards | `css/investment-analytics.css` import 5                                                                           | Section layout, cards, sector selector, sector panels, retail/airline panels, premium preview/lock overlay, tables, badges, source links, empty states, and shared investment component styles      | `domains/investment-intelligence/analytics/styles/layout.css`, `cards.css`, `sector-selector.css`, `sector-panels.css`, `premium-gate.css` | needs-review       | High   | Large multi-responsibility partial; split only after selector grouping and visual baselines are documented.      |
| `css/06-pages/investment-analytics/charts.css`        | partial      | Investment chart containers and SVG styling         | `css/investment-analytics.css` import 6                                                                           | Chart containers, SVG sizing, axes, bars, lines, labels, legends, and no-data states                                                                                                                | `domains/investment-intelligence/analytics/styles/charts.css`                                                                              | P1-later           | High   | Coupled to JS-generated SVG class names and chart math/renderer migration.                                       |
| `css/06-pages/investment-analytics/chart-modal.css`   | partial      | Chart modal overlay                                 | `css/investment-analytics.css` import 7                                                                           | Modal shell, backdrop, dialog, close button, expanded chart viewport, and modal meta text                                                                                                           | `domains/investment-intelligence/analytics/styles/charts.css`                                                                              | P1-later           | Medium | Preserve stacking order relative to chatbot and premium overlays.                                                |
| `css/06-pages/investment-analytics/chart-tooltip.css` | partial      | Chart tooltip UI                                    | `css/investment-analytics.css` import 8                                                                           | Tooltip positioning, arrow, typography, states, and reduced-motion behavior                                                                                                                         | `domains/investment-intelligence/analytics/styles/charts.css`                                                                              | P1-later           | Medium | Depends on chart containers and JS tooltip positioning.                                                          |
| `css/06-pages/investment-analytics/chatbot.css`       | partial      | Mock investment assistant shell                     | `css/investment-analytics.css` import 9                                                                           | Fixed launcher, panel, messages, input/actions, disabled/loading states, and responsive assistant behavior                                                                                          | `domains/investment-intelligence/analytics/styles/chatbot.css`                                                                             | P1-later           | Medium | Fixed positioning and z-index can conflict with overlays and mobile layout.                                      |
| `css/06-pages/investment-analytics/responsive.css`    | responsive   | Final responsive override layer                     | `css/investment-analytics.css` import 10                                                                          | Breakpoint overrides for hero, orbit visual, sectors, cards, charts, calculators, premium content, tables, chatbot, and mobile overflow behavior                                                    | `domains/investment-intelligence/analytics/styles/responsive.css`                                                                          | P2-do-not-move-yet | High   | Move last or keep as a final manifest layer because its position in the cascade is behaviorally important.       |
| `css/financial-indicators.css`                        | page-style   | Financial indicators page stylesheet                | Linked by `pages/financial-indicators.html`                                                                       | Financial indicators hero, animated chart/candles/ticker visuals, benefits, use cases, CTA, and responsive page rules                                                                               | keep in current CSS path for now                                                                                                           | needs-review       | Medium | Separate stylesheet today; only analyze for future investment-domain ownership if shared style pressure appears. |
| External Google Fonts link                            | shared-style | Font dependency                                     | Linked by all inspected pages before local CSS                                                                    | Provides the `Inter Tight` family used by global and investment styles                                                                                                                              | keep in current linked path for now                                                                                                        | P2-do-not-move-yet | Medium | Do not alter as part of Investment Analytics CSS splitting.                                                      |
| External Font Awesome link                            | shared-style | Icon dependency                                     | Linked by all inspected pages before local CSS                                                                    | Provides icon glyphs used in nav, hero, cards, calculators, premium overlays, and detail pages                                                                                                      | keep in current linked path for now                                                                                                        | P2-do-not-move-yet | Medium | Missing icon CSS could visually regress buttons, cards, and lock states.                                         |

## 5. Current import graph

Current page-linked stylesheets:

- `pages/investment-analytics.html` links Google Fonts, Font Awesome, `../css/style.css`, then `../css/investment-analytics.css`.
- `pages/investment-retail.html` links Google Fonts, Font Awesome, `../css/style.css`, then `../css/investment-analytics.css`.
- `pages/investment-airlines.html` links Google Fonts, Font Awesome, `../css/style.css`, then `../css/investment-analytics.css`.
- `pages/financial-indicators.html` links Google Fonts, Font Awesome, `../css/style.css`, then `../css/financial-indicators.css`.

`css/investment-analytics.css` already acts as a public manifest/import file. It imports current Investment Analytics partials in this order:

1. `./06-pages/investment-analytics/base.css`
2. `./06-pages/investment-analytics/hero.css`
3. `./06-pages/investment-analytics/orbit-visual.css`
4. `./06-pages/investment-analytics/calculators.css`
5. `./06-pages/investment-analytics/sections.css`
6. `./06-pages/investment-analytics/charts.css`
7. `./06-pages/investment-analytics/chart-modal.css`
8. `./06-pages/investment-analytics/chart-tooltip.css`
9. `./06-pages/investment-analytics/chatbot.css`
10. `./06-pages/investment-analytics/responsive.css`

Retail and airlines pages currently use the same `../css/investment-analytics.css` stylesheet as the main Investment Analytics page. Financial indicators uses a separate page stylesheet, `../css/financial-indicators.css`, after the shared global stylesheet.

Shared/global dependencies that must remain before investment CSS in the initial migration path:

- Google Fonts link.
- Font Awesome link.
- `../css/style.css`.
- The `css/style.css` import chain: `00-settings/tokens.css`, `02-generic/base.css`, `03-elements/forms-buttons.css`, `04-objects/layout.css`, `05-components/hero-services.css`, `05-components/contact-modal.css`, `05-components/footer.css`, and `06-pages/home.css`.

## 6. Responsibility map

- **Page layout:** `sections.css`, `hero.css`, global `style.css` layout imports, and final overrides in `responsive.css`.
- **Hero/header sections:** `hero.css`, `orbit-visual.css`, shared hero classes from `style.css`, and responsive hero overrides.
- **Cards:** `sections.css` for investment cards, KPI cards, retail/airline preview cards, source cards, and shared card shells; `calculators.css` for calculator cards.
- **Sector selector:** `sections.css` plus responsive selector/grid overrides.
- **Sector panels:** `sections.css` for retail and airline panel shells, comparison grids, notes, and premium content previews.
- **Charts/SVG containers:** `charts.css`, `chart-modal.css`, `chart-tooltip.css`, calculator chart styles in `calculators.css`, and responsive chart overrides.
- **Calculator selector:** `calculators.css` and responsive calculator grid overrides.
- **Compound calculator:** `calculators.css` for form, results, chart, tooltip, legend, and breakdown table styles.
- **CAGR calculator:** `calculators.css` for form mode toggles, result cards, validation, and chart classes.
- **Retirement calculator:** `calculators.css` for input/result panels, chart classes, validation, and breakdown table classes.
- **Tables:** `sections.css` for investment/sector tables; `calculators.css` for compound and retirement breakdown tables.
- **Chatbot/mock assistant:** `chatbot.css` and responsive chatbot overrides.
- **Premium gate/overlay:** `sections.css` for premium content shell, blur state, lock overlay, lock card, and premium actions.
- **Responsive behavior:** `responsive.css` plus local media queries inside `calculators.css`, `chatbot.css`, and other partials.
- **Accessibility/focus states:** Focus-visible styles in calculator selectors, chart points/tooltips, modal close controls, chatbot launcher/actions, premium actions, and shared buttons from global CSS.
- **Shared investment components:** `sections.css`, `charts.css`, `calculators.css`, and `chatbot.css` define reusable investment-specific shells that are currently shared by analytics, retail, and airlines pages through one manifest.

## 7. Proposed future CSS structure

Proposed domain-owned structure:

```text
domains/investment-intelligence/analytics/styles/
├── index.css
├── layout.css
├── hero.css
├── cards.css
├── sector-selector.css
├── sector-panels.css
├── charts.css
├── calculators.css
├── chatbot.css
├── premium-gate.css
└── responsive.css
```

Existing current partial path:

```text
css/06-pages/investment-analytics/
```

The future structure should gradually replace current partials rather than immediately mirror every existing file one-to-one. The first domain-owned `index.css`, if introduced, should mirror the current public manifest order exactly. After parity is proven, broad current partials such as `sections.css` can be decomposed into clearer domain files like `layout.css`, `cards.css`, `sector-selector.css`, `sector-panels.css`, and `premium-gate.css`. High-risk areas such as `calculators.css` and `responsive.css` should remain stable until calculator boundaries, generated class names, and visual baselines are proven.

## 8. Manifest strategy

Recommended manifest strategy:

- Keep the public linked stylesheet stable at first.
- Use `css/investment-analytics.css` as the public manifest until migration is proven.
- Split or reorganize CSS behind the manifest before changing page `<link>` tags.
- Avoid changing import order in the first runtime CSS PR.
- If a domain-owned `domains/investment-intelligence/analytics/styles/index.css` is introduced later, it should first mirror existing import order.
- Page link changes should happen only after visual smoke testing across analytics, retail detail, airlines detail, and mobile layouts.

## 9. Route/link preservation strategy

- Public pages should keep their existing CSS links until a dedicated relink PR.
- Static hosting paths must remain valid for `../css/style.css`, `../css/investment-analytics.css`, and `../css/financial-indicators.css`.
- Relative path behavior must be reviewed before using domain-owned CSS paths because pages under `pages/` currently resolve CSS through `../css/...`.
- Do not move or delete old CSS until compatibility is proven in production-like static paths.
- Do not change public route files or stylesheet links during manifest parity work.

## 10. Proposed staged migration order

- **Phase 6A:** CSS split strategy only.
- **Phase 6B:** Create README/style ownership notes under the analytics styles folder if needed.
- **Phase 6C:** Create a domain-owned CSS manifest that mirrors current import order, but do not load it.
- **Phase 6D:** Compare the current manifest and domain manifest for import-order parity and path correctness.
- **Phase 6E:** Move or copy one low-risk partial behind the manifest, preserving import order.
- **Phase 6F:** Add a visual smoke test checklist and result template for runtime CSS PRs.
- **Phase 6G:** Update page links only after manifest parity is proven.
- **Later:** Remove old CSS paths only after redirects/import compatibility is no longer needed.

## 11. First runtime CSS PR recommendation

Recommended first runtime CSS migration target: `needs-review`, with `css/06-pages/investment-analytics/base.css` as the only obvious low-risk candidate if a runtime PR must touch a partial.

The first real CSS PR should:

- Not change page `<link>` tags.
- Not change selectors.
- Not change CSS order.
- Create or mirror a domain-owned CSS manifest only if path and import-order parity are safe.
- Or, if current partials are already clean enough for planning but not safe enough to move, start with README/docs and a visual smoke checklist before moving files.
- Not start with responsive CSS or calculator CSS because those are high-risk and tightly coupled to generated calculator/chart/table markup.

## 12. Risk matrix

| Risk                                    | Impact                                                                                                             | Likelihood | Mitigation                                                                                                                          |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| CSS import order regression             | Later rules stop overriding earlier rules, causing layout, spacing, or state changes.                              | High       | Keep `css/investment-analytics.css` stable, mirror import order exactly, and compare manifests before loading a new one.            |
| Specificity regression                  | Equivalent-looking selectors lose to shared/global styles or fail to override component states.                    | Medium     | Do not change selectors in the first CSS PR; move one concern at a time and verify computed styles visually.                        |
| Broken calculator layout                | Compound, CAGR, or retirement forms/results become misaligned or clipped.                                          | High       | Do not start with `calculators.css`; preserve calculator class names and run calculator visual smoke tests after any change.        |
| Broken chart layout                     | SVG charts, labels, axes, tooltips, or modals render at wrong sizes or with missing styles.                        | Medium     | Keep chart styles near generated class-name ownership and verify chart containers, tooltips, and modal states.                      |
| Broken responsive layout                | Mobile or tablet pages overflow, reorder incorrectly, or hide critical controls.                                   | High       | Move `responsive.css` last and test narrow widths before any page relink.                                                           |
| Broken premium gate overlay             | Premium preview blur, lock overlay, or z-index behavior changes.                                                   | Medium     | Keep premium gate styles in the current manifest until overlay stacking and auth/loading states are smoke tested.                   |
| Broken chatbot styling                  | Fixed launcher/panel overlaps content, loses disabled states, or breaks mobile placement.                          | Medium     | Preserve chatbot import order and z-index assumptions; test open/closed/disabled/mobile states.                                     |
| Broken sector selector                  | Sector tabs/cards lose active state, grid alignment, or panel spacing.                                             | Medium     | Split sector selector only after selector/panel responsibilities are separated and tested on analytics, retail, and airlines flows. |
| Broken focus/accessibility states       | Keyboard users lose visible focus on calculator cards, chart points, modals, chatbot controls, or premium actions. | Medium     | Include focus-visible checks in every visual smoke test and avoid selector rewrites.                                                |
| Missing static asset paths              | Domain-owned CSS uses relative paths that fail from `pages/` or static hosting.                                    | Medium     | Review URL/path resolution before introducing domain-owned CSS or page relinks.                                                     |
| Stale duplicate CSS                     | Old and new manifests drift or both load conflicting rules.                                                        | Medium     | Keep one public stylesheet loaded, document ownership, and compare duplicates before cleanup.                                       |
| Page link path issues on static hosting | Pages fail to load CSS after a relink even if local paths work.                                                    | Medium     | Defer page `<link>` changes to a dedicated PR with production-like static path validation.                                          |

## 13. Visual smoke test checklist

Future runtime CSS PRs should verify:

- Investment Analytics page loads with same layout.
- Hero/header section unchanged.
- Sector selector unchanged.
- Retail/airlines panels unchanged if applicable.
- Calculator selector unchanged.
- Compound calculator layout unchanged.
- CAGR calculator layout unchanged.
- Retirement calculator layout unchanged.
- Charts keep same size and spacing.
- Tables remain readable.
- Chatbot/mock assistant styling unchanged.
- Premium gate/overlay unchanged.
- Mobile layout unchanged.
- Focus states remain visible.
- No horizontal overflow.
- No missing CSS in production-like static path.

## Phase 6B note

Phase 6B documents Investment Analytics style ownership and visual smoke testing in [`investment-css-visual-smoke-test.md`](investment-css-visual-smoke-test.md). No runtime CSS, HTML, or JavaScript files were moved, copied, relinked, or refactored in Phase 6B.

## Phase 6C note

Phase 6C creates the domain-owned CSS manifest skeleton at `domains/investment-intelligence/analytics/styles/index.css`. The skeleton mirrors the current `css/investment-analytics.css` import order exactly, imports the existing partials from their current paths, is not loaded yet, and does not change any public page stylesheet links.

## Phase 6D note

Phase 6D adds `scripts/architecture/check-investment-css-manifest-parity.js` as a manifest parity checker and creates `docs/architecture/investment-css-manifest-parity-audit.md` to document the audit gate. No page links or existing CSS partials changed.

## 14. Relationship to existing docs

Related documents and ownership notes:

- [`investment-css-manifest-parity-audit.md`](investment-css-manifest-parity-audit.md)
- [`investment-frontend-split-plan.md`](investment-frontend-split-plan.md)
- [`investment-calculator-extraction-plan.md`](investment-calculator-extraction-plan.md)
- [`investment-module-loading-strategy.md`](investment-module-loading-strategy.md)
- [`../../domains/investment-intelligence/analytics/styles/README.md`](../../domains/investment-intelligence/analytics/styles/README.md)
- [`../../domains/investment-intelligence/analytics/README.md`](../../domains/investment-intelligence/analytics/README.md)
- [`folder-structure.md`](folder-structure.md)
