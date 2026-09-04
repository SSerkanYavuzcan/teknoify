# 04 — Phased Implementation Plan

The initial hypothesis (A → J) is kept, with two evidence-driven changes:

1. A short **Phase A.2 — Production safety & hygiene** is inserted before architecture work, because the audit found live risks that are independent of the redesign (public exposure of repo internals, auto-deploying bot commits, a likely-dead contact endpoint, dead redirect target, no security headers).
2. **Legacy cut-over** (removing auth/dashboard code) runs as a **parallel track** gated on the platform, not as a step inside the redesign, so the marketing rebuild is never blocked on platform migration and the platform is never broken by marketing cleanup.

Every phase ends with a production checkpoint: a Netlify Deploy Preview reviewed on desktop and mobile, `main` still deployable, and a rollback path (revert PR) identified.

Unknowns referenced as U1–U12 are in `02-rebuild-boundaries.md` §5.

---

## Phase A — Repository / production audit ✅ (this phase)

Deliverables: the four documents in `docs/marketing-rebuild/`, `.gitignore`, audit branch `chore/marketing-rebuild-audit`.

---

## Phase A.2 — Production safety & hygiene (small, immediate)

**Objective**: make production explicit and stop the bleeding without redesigning anything.

**Major work**

- Record Netlify settings (U1, U2) in `docs/deployment/netlify.md`; add `netlify.toml` that pins the current behaviour (publish `.`, no build) so it is versioned.
- Add `_redirects`: `/login.html → https://platform.teknoify.com/... 302` (or the current `/pages/login.html`), `/domains/* 404`, `/docs/* 404`, `/scripts/* 404`, `/services/* 404`, `/dashboard/*/backend/* 404`, `/data/entitlements.json 404`, `/data/stock/* 404`, `/package.json 404`, `/render.yaml 404`.
- Add `_headers`: `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`, CSP in **report-only**.
- Add `robots.txt` disallowing `/dashboard/`, `/pages/login.html`, `/pages/impersonate.html`, `/pages/unauthorized.html`, `/reset-password.html`, `/domains/`; add a placeholder `sitemap.xml` for the public pages; add a `404.html`.
- Verify the contact endpoint (U6) from two networks; if dead, switch the existing form to Netlify Forms or the platform endpoint with a one-line change in `js/script.js`.
- Ask for GitHub branch protection on `main` (U11) and move the two data workflows to run on a branch + PR, or to the platform repo (blocks on U5 only for `render.yaml`, not for workflows).
- Declare ESLint/Prettier as devDependencies or delete the scripts that reference them, so `npm run check` is honest.

**Prerequisites**: Netlify UI access. **Risks**: R-01, R-02, R-14, R-15, R-17. **Validation**: live probes from doc 01 §4 return the intended status codes; Deploy Preview shows no visual change. **Deliverable**: one small PR, production checkpoint #1.

---

## Phase B — Marketing architecture & content model

**Objective**: decide what the site is, page by page, before any pixel.

**Major work**: resolve U8, U9, U10, U12; freeze the URL contract and 301 map (doc 03 §2); write the content model (types for page metadata, services, tools/agents, legal); write copy briefs per page from the existing Turkish copy; define analytics events; decide `/demo/` canonical (U2); confirm toolchain choice (Astro recommended) with a 1-page ADR (`docs/decisions/ADR-0002-marketing-toolchain.md`); mark the ADR-0001 governance corpus as historical.

**Prerequisites**: A.2 merged. **Risks**: R-06, R-18, R-19. **Validation**: content model reviewed by product owner; every current public URL has a target in the redirect map. **Deliverable**: `docs/marketing-rebuild/05-content-model-and-url-contract.md`, ADR-0002.

---

## Phase C — Brand & design foundation

**Objective**: tokens and primitives, not pages.

**Major work**: finalize type families and scale, color roles for light and dark, spacing/radius/border/shadow/motion tokens (doc 03 §4); logo/wordmark and favicon set (the site has none); icon set; screenshot chrome; a static style guide page (not linked publicly) rendering every primitive; accessibility contrast verification of every role pairing.

**Prerequisites**: Phase B. **Risks**: R-10 (contrast), scope creep into page design. **Validation**: contrast report, token file reviewed, style guide renders in both themes at 375/768/1440. **Deliverable**: `tokens` source + style guide route on a preview.

---

## Phase D — Toolchain + global shell (navigation, layout, footer)

**Objective**: the new build pipeline in this repository, producing the existing site unchanged plus the new shell.

**Major work**: introduce the framework in-repo with `dist/` publish and a real `netlify.toml` build; keep all legacy HTML serving as static passthrough during transition; implement layout primitives, header with accessible mobile menu (dialog pattern), footer, consent banner on every page (keep GA4 ID), skip link, focus policy, metadata/SEO layer, sitemap/robots generation, image pipeline, self-hosted fonts, inline SVG icons; CI on PRs (lint, typecheck, build, link check, axe, viewport screenshots); Lighthouse budget in CI (JS ≤ 100 KB per marketing page, LCP < 2.5 s mobile).

**Prerequisites**: Phase C tokens; U1 confirmed so build settings can change safely. **Risks**: R-08, R-09, R-10, R-11, R-12; build config changing production. **Validation**: Deploy Preview serves both new shell pages and every legacy URL; CI green; Lighthouse ≥ 90 perf/a11y/SEO on the shell. **Deliverable**: production checkpoint #2 — the build pipeline is live but no public page has changed.

---

## Phase E — Homepage

**Objective**: replace `/` with the new homepage.

**Major work**: hero (keep terminal motif idea, real value proposition), three-pillar section, tools/agents preview (real ones only), services, trust/security strip (no fake logos), contact/lead capture (endpoint from A.2), CTAs to platform; remove the login modal from this page only; keep GA and consent; OG image.

**Prerequisites**: Phase D; copy approved. **Risks**: R-03 (auth coupling on `/`), R-06, R-15. **Validation**: full a11y/keyboard pass, mobile matrix, form submission end-to-end, analytics events verified, no Firebase requests on `/`. **Deliverable**: production checkpoint #3 — new homepage live; legacy pages untouched.

---

## Phase F — Product / Tools / Agents surfaces

**Objective**: the platform's public face.

**Major work**: `/product`, `/tools`, `/tools/<slug>` for real tools, `/investment` landing (interactive analytics stay on the old URL until the platform hosts them), deep links to platform; real screenshots via the chrome component; JSON-LD for tools.

**Prerequisites**: platform team supplies stable screenshots and deep-link URLs; U3 answered (so "Sign in" links are correct). **Risks**: publishing tools that are not usable; screenshot drift. **Validation**: every tool page links to a working platform URL; content status gates enforced at build. **Deliverable**: production checkpoint #4.

---

## Phase G — Additional marketing pages

**Objective**: services, security, legal, contact, demo, (pricing if U8 resolved).

**Major work**: migrate the five service pages' copy into the new templates; legal pages verbatim; `/security`; `/contact`; `/demo` decision executed; 301s from every `pages/*.html`; retire `pages/*.html` files after redirects are verified.

**Prerequisites**: Phase F; legal texts re-confirmed. **Risks**: R-06, R-07. **Validation**: redirect map tested by an automated link check against the previous sitemap; GSC shows no new 404s after a week. **Deliverable**: production checkpoint #5 — all marketing URLs on the new stack.

---

## Parallel track — Legacy cut-over (auth, dashboard, platform infra)

Runs alongside E–G; each step is its own PR; **gated on platform readiness**.

1. **Auth off marketing pages** (after E; before G finishes): follow doc 02 §3.1. Replace modal with a platform sign-in link. Remove Firebase/reCAPTCHA/session-manager from public pages. One-time cleanup of legacy `localStorage` keys. Gate: U3 answered.
2. **Investment split** (doc 02 §3.2): marketing landing stays; calculators/chatbot/premium pages move to platform; delete `js/investment-analytics.js`, bridges, premium gate, `pages/investment-{retail,airlines}.html` with 301s. Gate: platform hosts the analytics.
3. **Dashboard sunset** (doc 02 §3.3): `_redirects` `/dashboard/* → platform`; delete `dashboard/**`, `js/lib/**`, `js/pages/**`, dashboard CSS, `packages/auth`, dashboard route constants; drop `firebase-admin`. Gate: U10 (users informed), platform equivalents live.
4. **Password reset** (doc 02 §2.2): repoint Firebase action URL to platform (U4), then 301 `reset-password.html`.
5. **Infra out** (doc 02 §3.6): move `services/*`, `dashboard/*/backend`, `render.yaml`, workflows and `data/**` (except what the marketing build needs — nothing, once investment moves) to the platform/data repos; confirm Render re-link (U5) before deleting `render.yaml`.
6. **Governance corpus**: remove `scripts/architecture`, `domains/**`, `apps/`, `packages/*` READMEs, `_archive/`; keep ADR-0001 and doc history under `docs/`.
7. **Repo rename** to `teknoify-marketing` (R-20) as the last step.

**Validation for every step**: live probes of all public URLs; no `firebase` string in built marketing output; Netlify preview reviewed; rollback = revert PR.

---

## Phase H — Motion & visual polish

**Objective**: finish, not decorate. Reveal choreography, hero background performance budget, hover states, empty/error states, dark/light parity, OG image set. **Prerequisites**: E–G live. **Risks**: R-08, motion a11y. **Validation**: reduced-motion audit, frame-time check on a mid-range Android, Lighthouse unchanged. **Deliverable**: polish PRs, checkpoint #6.

## Phase I — Performance / accessibility / SEO hardening

**Objective**: measured quality. Real-user metrics (CrUX/Web Vitals via GA4), axe + manual screen-reader pass (NVDA, VoiceOver), keyboard-only walkthrough, 200 % zoom/320 px reflow, CSP enforced (from report-only), structured data validation, sitemap submitted, GSC coverage reviewed, redirect map re-verified. **Deliverable**: hardening report appended to this folder; checkpoint #7.

## Phase J — Production readiness

**Objective**: operability. Runbook (`docs/deployment/`), branch protection, CODEOWNERS, PR template with the checklist (preview reviewed at 5 widths, a11y, links), monitoring/alerts (uptime, form failures, 404 spikes), analytics dashboard, domain/DNS/SSL review, rollback drill, repo rename. **Deliverable**: sign-off document; checkpoint #8.

---

## Ordering rationale

- Safety before architecture: the site is leaking internals and auto-deploying bot commits today; fixing that costs one PR and is independent of design.
- Architecture before design: the URL contract and content model decide what components exist.
- Shell before pages: navigation, metadata and CI are shared by every page and are where the confirmed a11y/mobile defects live.
- Homepage before product pages: it is the only page with a lead-capture path and carries the heaviest legacy coupling.
- Legacy removal in parallel, gated on the platform: the marketing rebuild must never wait on, or break, `platform.teknoify.com`.
- Polish and hardening last, with budgets enforced from Phase D so they are confirmation, not rescue.
