# Marketing Rebuild

Audit and planning documents for transforming this repository into the public marketing site for `https://teknoify.com`, separate from the authenticated platform at `https://platform.teknoify.com`.

Phase A (2026-09-04) is an audit only: no runtime files were changed.

## Documents

- [`01-repository-production-audit.md`](01-repository-production-audit.md): Git baseline, actual stack, repository structure, Netlify/production findings, route/component/asset/dependency inventories, legacy auth findings, responsive/accessibility/SEO/performance findings, quality-gate results.
- [`02-rebuild-boundaries.md`](02-rebuild-boundaries.md): marketing vs platform ownership boundary, KEEP/REBUILD/REMOVE classification matrix, dependency-oriented legacy removal map, production-critical files, known unknowns, risk register.
- [`03-marketing-architecture-proposal.md`](03-marketing-architecture-proposal.md): proposed information architecture, content model, toolchain recommendation, brand/design foundation, responsive and motion principles.
- [`04-phased-implementation-plan.md`](04-phased-implementation-plan.md): phased roadmap with prerequisites, risks, validation and production checkpoints.
- [`05-production-boundary-and-legacy-exit.md`](05-production-boundary-and-legacy-exit.md): Phase A.2 — revalidated claims, public artifact contract (`npm run check:public` → `dist/`), path classification, Netlify configuration as code, URL migration matrix, legacy exit classification, security headers, generated-data workflows, safeguards, rollout/rollback, end-of-phase decisions.

- [`06-deployment-cutover.md`](06-deployment-cutover.md): Phase A.3 — ownership lock (see [`../decisions/ADR-0002-marketing-platform-ownership.md`](../decisions/ADR-0002-marketing-platform-ownership.md)), what is known about the two Netlify sites, root `netlify.toml` precedence analysis, cutover contract validation (clean-checkout reproducibility, EOL-independent hashes, site guard), post-cutover behaviour of internal URLs, legacy URL redirect classes, branch-protection plan, Deploy Preview model, rollback contract, merge verdict and next PR plan.

- [`12-experience-v2.md`](12-experience-v2.md): Homepage experience v2 — productionizing the user-authored interaction north star (`design-reference/teknoify-interaction-north-star.html`): product truth gate, preserved interaction patterns, deliberate changes, module architecture. First pass: field, hero, manifesto, pinned product journey.
- [`13-experience-v2-phase2.md`](13-experience-v2-phase2.md): Homepage experience v2, phase 2 — audience split (Kimin için), the scroll-driven capability catalog and living vignettes: product truth gate, interaction behaviour, breakpoints, reduced motion, performance.
- [`07-legacy-frontend-cleanup.md`](07-legacy-frontend-cleanup.md): Phase B0 — removal of the legacy authenticated application frontend (Firebase/auth, dashboard, premium gating, impersonation, MVP auth), what was retained, legacy URL behaviour, reset-password compatibility decision, dependencies removed, validation results and remaining non-blocking debt.

## Tooling introduced in Phase A.2

- `scripts/public-artifact/manifest.json`: allow-list of entry pages, transitional pages/files, explicit static data, allowed roots and forbidden rules.
- `scripts/public-artifact/build.mjs`: builds `dist/` from the manifest by following asset references structurally; fails on any forbidden reference. `npm run build:public`.
- `scripts/public-artifact/verify.mjs`: asserts the artifact contains only permitted content and all required files; checks robots, sitemap, `_redirects` and `_headers` consistency. `npm run verify:public`.
- `public/`: overlay copied verbatim into the artifact (`_redirects`, `_headers`, `robots.txt`, `sitemap.xml`, `404.html`).
- `netlify.toml`: deployment contract as code (not active until merged; see doc 05 §4 and §15, doc 06 §4 and §11).
- Phase A.3 additions: `build.mjs` normalizes text files to LF (artifact hash is identical on CRLF and LF checkouts) and refuses to run on Netlify for any site other than `manifest.netlify.siteName` (defence in depth only).
- `demo/netlify.toml`: pins the separate `demo.teknoify.com` site to today's behaviour (publish `demo/`, no build). Effective once that site's Netlify Package directory is `demo` (doc 06 §16, §20).
- `.github/workflows/public-artifact.yml`: builds and verifies the artifact on pull requests to `main` (intended required check, doc 06 §18–§19).

## Evidence convention

Findings are labelled CONFIRMED (observed in the repository, a command result, or a live HTTP response), LIKELY (strong indirect evidence), or UNVERIFIED (requires console access outside the repository). Secrets are never reproduced; only variable names or file locations are cited.
