# Investment Analytics CSS Visual Smoke Test and Style Ownership

## 1. Title and purpose

This Phase 6B document is documentation-only. Its purpose is to define current style ownership and a repeatable manual visual smoke test checklist before any Investment Analytics CSS files are moved, copied, split, or relinked.

Phase 6B does not change runtime pages, JavaScript, CSS, data, scripts, workflows, package files, route files, or screenshots. It exists to make future CSS migration PRs safer by documenting the visual review surface before runtime stylesheet work begins.

## 2. Why visual smoke testing is required

Visual smoke testing is required before the Investment Analytics CSS split continues because:

- CSS regressions are often invisible to linting, formatting, and `npm run check` because those checks can pass even when spacing, stacking, visibility, or responsive behavior changes.
- Import order and selector specificity can silently change layout. A stylesheet that contains the same declarations can still behave differently if it is loaded from a new manifest, imported in a different order, or combined with shared/global CSS differently.
- Calculators, charts, chatbot, premium gates, sector panels, and responsive layouts are visually coupled. Changes in one area can affect another area through shared wrappers, z-index layers, typography, grid rules, buttons, cards, and breakpoint rules.
- The CSS split should not proceed without a repeatable manual visual checklist that reviewers can run before and after each migration step.

## 3. Current CSS ownership map

| Current CSS File                                      | Current Role                                             | Primary UI Area                                             | Likely Future Owner                | Risk Level | Notes                                                                                                                   |
| ----------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| `css/investment-analytics.css`                        | Public Investment Analytics manifest and import boundary | Analytics pages that currently load the manifest            | Analytics layout                   | High       | Keep this as the public manifest until parity is proven; future manifests should mirror its current import order first. |
| `css/06-pages/investment-analytics/base.css`          | Base page layout and shared analytics primitives         | Page shell, shared layout, typography, containers           | Analytics layout                   | Medium     | Lowest-risk candidate only if a first runtime CSS PR is required; still needs visual parity checks.                     |
| `css/06-pages/investment-analytics/hero.css`          | Hero and marketing presentation styles                   | Hero/header, headline area, calls to action                 | Hero/marketing                     | Medium     | Verify desktop and mobile hero spacing, hierarchy, and shared button interactions before any migration.                 |
| `css/06-pages/investment-analytics/orbit-visual.css`  | Decorative/interactive orbit visual styles               | Orbit visual and surrounding hero visual treatment          | Hero/marketing                     | Medium     | Visual alignment can be sensitive to container sizing and responsive breakpoints.                                       |
| `css/06-pages/investment-analytics/calculators.css`   | Calculator UI styles                                     | Calculator selector, compound, CAGR, retirement, results    | Calculators                        | High       | Do not start with this file; it is coupled to generated calculator markup and projection tables.                        |
| `css/06-pages/investment-analytics/sections.css`      | Section, sector, card, premium, and content area styles  | Sector selector, sector panels, premium/access UI, cards    | Premium/access UI                  | High       | Ownership likely needs finer future boundaries between analytics layout, sector panels, and premium/access UI.          |
| `css/06-pages/investment-analytics/charts.css`        | Chart card and SVG chart presentation styles             | Chart cards, chart containers, generated SVG chart elements | Charts                             | High       | Do not start with this file; verify chart sizing, labels, axes, legends, and empty/loading states.                      |
| `css/06-pages/investment-analytics/chart-modal.css`   | Chart modal presentation and overlay styles              | Modal shell, chart modal content, close affordances         | Charts                             | High       | Coupled to overlay stacking, chart rendering, body scroll expectations, and focus states.                               |
| `css/06-pages/investment-analytics/chart-tooltip.css` | Chart tooltip presentation styles                        | Chart tooltip, hover/focus state overlays                   | Charts                             | High       | Tooltips are stateful and often difficult to catch without manual hover/focus checks.                                   |
| `css/06-pages/investment-analytics/chatbot.css`       | Chatbot/mock assistant presentation styles               | Chatbot launcher, panel, messages, disabled/loading states  | Chatbot                            | Medium     | Verify fixed positioning, z-index, mobile placement, and disabled/mock assistant states.                                |
| `css/06-pages/investment-analytics/responsive.css`    | Breakpoint overrides                                     | Tablet/mobile layout for analytics page sections            | Responsive system                  | High       | Move last only; it can override every area above and can introduce horizontal overflow.                                 |
| `css/financial-indicators.css`                        | Separate public page CSS                                 | Financial indicators page                                   | Separate financial indicators page | Medium     | Keep separate from analytics CSS unless a future ownership review identifies intentional shared investment styling.     |
| `css/style.css`                                       | Shared/global dependency loaded before page CSS          | Global shell, shared navigation/footer, base UI conventions | Shared global shell                | High       | Do not duplicate or bypass; future page CSS must continue to account for global cascade and specificity.                |

## 4. Visual smoke test matrix

| Area                            | Page / View                                   | What to Verify                                                                                                   | Desktop | Mobile  | Risk   | Notes                                                                           |
| ------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------- | ------- | ------ | ------------------------------------------------------------------------------- |
| Investment Analytics page shell | `pages/investment-analytics.html`             | Global shell, navigation/footer spacing, analytics containers, background, section spacing, and no CSS flashes.  | Not run | Not run | High   | Compare before and after any manifest or import-order change.                   |
| Hero/header                     | `pages/investment-analytics.html` hero        | Heading hierarchy, CTA placement, imagery/visual alignment, buttons, and spacing.                                | Not run | Not run | Medium | Check with the shared `css/style.css` dependency still loaded first.            |
| Orbit visual                    | `pages/investment-analytics.html` hero visual | Orbit sizing, centering, layering, motion-safe appearance, and clipping.                                         | Not run | Not run | Medium | Include both wide and narrow viewports.                                         |
| Sector selector                 | Investment Analytics sector navigation        | Tabs/cards, active state, hover/focus state, spacing, and wrapping.                                              | Not run | Not run | Medium | Confirm states remain readable and clickable.                                   |
| Sector panels                   | Investment Analytics sector content panels    | Panel visibility, active content, spacing, premium messaging, cards, and responsive stacking.                    | Not run | Not run | High   | Retail and airlines views may share assumptions.                                |
| Chart cards                     | Investment Analytics chart sections           | Card sizing, chart container height, SVG spacing, axis/label readability, legends, and empty/loading states.     | Not run | Not run | High   | Run after chart data loads.                                                     |
| Chart modal                     | Open chart modal state                        | Overlay positioning, modal sizing, close button, focus behavior, body scroll, and chart fit.                     | Not run | Not run | High   | Capture open modal before/after screenshots in future runtime PRs.              |
| Chart tooltip                   | Hover/focus chart tooltip state               | Tooltip position, readability, z-index, pointer/keyboard behavior, and clipping.                                 | Not run | Not run | High   | Manual hover/focus is required because lint/check cannot validate this state.   |
| Calculator selector             | Calculator tabs/cards                         | Active state, tab/card spacing, icons/labels, keyboard focus, and responsive wrapping.                           | Not run | Not run | High   | Coupled to calculator layout and generated results.                             |
| Compound calculator             | Compound interest calculator                  | Form fields, labels, validation/error text, result cards, chart/table output, and spacing.                       | Not run | Not run | High   | Do not migrate `calculators.css` until this state is checked.                   |
| CAGR calculator                 | CAGR calculator                               | Form fields, labels, computed result state, result cards, and responsive layout.                                 | Not run | Not run | High   | Verify both initial and calculated states.                                      |
| Retirement calculator           | Retirement calculator                         | Inputs, assumptions, result panels, projection output, and long-number wrapping.                                 | Not run | Not run | High   | Verify mobile overflow carefully.                                               |
| Projection tables               | Calculator result/projection tables           | Table readability, column spacing, scrolling behavior, and no clipped values.                                    | Not run | Not run | High   | Include mobile/narrow width checks.                                             |
| Chatbot/mock assistant          | Chatbot launcher and open panel               | Launcher placement, panel size, message spacing, controls, disabled/loading states, and overlap.                 | Not run | Not run | Medium | Verify open and closed states.                                                  |
| Premium gate/overlay            | Premium-gated analytics/content state         | Blur/lock treatment, overlay stacking, call-to-action visibility, and interaction blocking.                      | Not run | Not run | High   | Coupled to sections, cards, and auth/loading states.                            |
| Responsive layout               | Investment Analytics at breakpoint widths     | No horizontal overflow, readable cards/tables, preserved control order, and no hidden critical actions.          | Not run | Not run | High   | Use the viewport coverage in this document before migrating `responsive.css`.   |
| Focus states                    | Keyboard navigation across analytics controls | Visible focus on links, buttons, calculator controls, chart modal controls, chatbot controls, and premium CTAs.  | Not run | Not run | Medium | Include keyboard-only checks; do not rely only on mouse hover states.           |
| Financial indicators page       | `pages/financial-indicators.html`             | Page CSS remains independent, global shell still applies, indicators layout unchanged, and no shared CSS bleed.  | Not run | Not run | Medium | Relevant because it uses `css/style.css` before `css/financial-indicators.css`. |
| Retail investment page          | `pages/investment-retail.html`                | Shared analytics stylesheet still renders retail-specific content, sector/panel layout, cards, and responsive.   | Not run | Not run | Medium | Check because it loads the same analytics manifest as the main page.            |
| Airlines investment page        | `pages/investment-airlines.html`              | Shared analytics stylesheet still renders airlines-specific content, sector/panel layout, cards, and responsive. | Not run | Not run | Medium | Check because it loads the same analytics manifest as the main page.            |

## 5. Required viewport coverage

Future runtime CSS migration PRs should cover these viewport widths before review when practical:

| Viewport Target               | Suggested Width | Required Focus                                                                 |
| ----------------------------- | --------------- | ------------------------------------------------------------------------------ |
| Desktop wide                  | `1440px`        | Full hero, chart grids, sector panels, calculator/results layout, and modals.  |
| Laptop                        | `1024px`        | Common desktop/laptop spacing, cards, tables, and modal sizing.                |
| Tablet                        | `768px`         | Breakpoint behavior, wrapping, navigation density, and chart/calculator width. |
| Mobile narrow                 | `390px`         | Primary mobile layout, card stacking, chatbot placement, and tables.           |
| Mobile landscape if practical | `360px`         | Narrow/mobile stress check for overflow, clipped controls, and readable text.  |

## 6. Required browser coverage

Future runtime CSS migration PRs should check these browsers when available:

- Chrome.
- Safari, if available.
- Firefox, if available.
- A mobile browser, if available.

At minimum, Chrome desktop plus one mobile-size viewport should be checked before any CSS migration PR is considered safe.

## 7. Before/after screenshot guidance

Future runtime CSS migration PRs should use screenshots as comparison evidence:

- Capture screenshots before moving, copying, relinking, or splitting CSS.
- Capture the same states after the change using the same viewport sizes and browser where practical.
- Include calculator tabs, calculated result states, chart states, chart modals, chart tooltips, chatbot open/closed states, premium gate states, and mobile layouts.
- Store screenshots outside the repo unless a future architecture decision creates a dedicated visual regression artifact folder.
- Do not commit ad-hoc screenshots unless the artifact location and naming convention are explicitly planned in a future PR.

## 8. CSS migration decision gate

The Investment Analytics CSS split should follow these gates:

- Do not move or relink CSS until the visual smoke checklist exists.
- Do not remove old CSS imports until the new manifest has visual parity.
- Do not start with `responsive.css`, `calculators.css`, `charts.css`, `chart-modal.css`, or `chart-tooltip.css`.
- Prefer `base.css` only if a first low-risk CSS runtime PR is required.
- Keep `css/investment-analytics.css` as the public manifest until parity is proven.

## 9. Proposed Phase 6C recommendation

Recommended next phase:

- Create a domain-owned CSS manifest skeleton at `domains/investment-intelligence/analytics/styles/index.css`.
- The new manifest should mirror current import order only.
- Do not load the new manifest from any HTML page yet.
- Do not move current CSS partials yet.
- Document path compatibility risks, especially relative `@import` resolution and static hosting behavior from `pages/` URLs.

## Phase 6C note

Phase 6C creates a domain-owned manifest skeleton only. Visual smoke testing remains the gate before loading or relinking the new manifest from any HTML page.

## Phase 6D note

Phase 6D requires the automated Investment Analytics CSS manifest parity check before any visual-smoke-based relinking plan. Visual checks remain required even if automated parity passes because rendered layout, interactions, and responsive states are outside manifest-level validation.

## 10. Relationship to existing docs

Related documents:

- [`investment-css-split-strategy.md`](investment-css-split-strategy.md)
- [`investment-frontend-split-plan.md`](investment-frontend-split-plan.md)
- [`../../domains/investment-intelligence/analytics/styles/README.md`](../../domains/investment-intelligence/analytics/styles/README.md)
- [`folder-structure.md`](folder-structure.md)

## 11. Update docs index

Phase 6B should be discoverable from the architecture documentation index. The index entry should point to this document and summarize that it covers CSS ownership, visual smoke testing, viewport/browser coverage, screenshot guidance, and migration decision gates.

Phase 6B also adds short status notes to the Phase 6A CSS split strategy and the future analytics styles README to confirm that style ownership and visual smoke testing are documented while runtime CSS files remain in their current paths.
