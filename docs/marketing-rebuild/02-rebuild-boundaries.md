# 02 — Rebuild Boundaries, Classification, Legacy Removal Map, Risk Register

Companion to `01-repository-production-audit.md`. Same evidence labels (CONFIRMED / LIKELY / UNVERIFIED). Nothing in this document is executed in Phase A; it is the input for cleanup and rebuild phases.

---

## 1. Ownership boundary

| Concern | Owner | Rule for this repository |
| --- | --- | --- |
| Public marketing pages, legal pages, pricing presentation, demo/landing content, SEO, analytics consent, contact/lead capture UI | **teknoify-marketing** (this repo) | Build and own. |
| Sign in / sign up / password reset / email action handlers | **platform** (`platform.teknoify.com`) | Marketing links to the platform sign-in URL. Do not host auth UI here. `reset-password.html` stays only until the Firebase email action URL is repointed (UNVERIFIED where it points today). |
| Dashboards, tools, agents, projects, entitlements, billing, profile, admin, impersonation | platform | Everything under `dashboard/`, `pages/impersonate.html`, `pages/unauthorized.html`, `pages/login.html`, premium-gated `pages/investment-*.html` content. Marketing may *describe* these products; it must not *run* them. |
| Firebase (Auth, Firestore, App Check, Functions), Cloud Run, Cloud Functions, Render, PostgreSQL | platform | No Firebase SDK on marketing pages after cleanup. `render.yaml`, `services/*`, `dashboard/*/backend` should leave this repo (see §5 for the safe order). |
| Data pipelines (USD/TRY rates, stock document RAG) and their GitHub Actions | platform / data | Workflows that commit to `main` should be moved out; until then they are production-critical because they trigger deploys. |
| Domain, DNS, Netlify site for `teknoify.com` | marketing | Protect. Config must become explicit (`netlify.toml`, `_headers`, `_redirects`). |

Hard rule: the marketing site may link to `https://platform.teknoify.com` (sign in, "Start using Teknoify", deep links to tools) and nothing else. It must not import platform code, share a Firebase project at runtime, or proxy platform APIs.

---

## 2. Classification matrix

Statuses: **KEEP** · **KEEP BUT REFACTOR** · **REBUILD** · **REMOVE LATER** · **PLATFORM CONCERN — DO NOT REIMPLEMENT** · **INVESTIGATE** · **PRODUCTION CRITICAL** (may combine).

### 2.1 Deployment and repository files

| Item | Status | Rationale |
| --- | --- | --- |
| Netlify site + domain (UI-configured, not in repo) | PRODUCTION CRITICAL · INVESTIGATE | Everything about it (build settings, Pretty URLs, previews, env vars) is UNVERIFIED from the repo. Must be documented from the Netlify UI before Phase B ends. |
| `render.yaml` | PLATFORM CONCERN · PRODUCTION CRITICAL (until verified) | Deploys `teknoify-equity-data` on Render with `autoDeployTrigger: commit`. Do not delete until Render confirms which repo the service is linked to. |
| `.github/workflows/update-usd-try-rates.yml` | PLATFORM CONCERN · PRODUCTION CRITICAL | Commits to `main` on a cron; the investment page reads its output. Moving it requires moving the data consumer first. |
| `.github/workflows/extract-stock-document-text.yml` | PLATFORM CONCERN · REMOVE LATER | Dispatch-only RAG pipeline. |
| `package.json` / `package-lock.json` | REBUILD | Runtime dependency `firebase-admin` is unused by the site; dev tooling is stubs. Rebuild toolchain in Phase D. |
| `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `.stylelintrc.json`, `tools/stylelint*` | REBUILD | Not enforceable today. |
| `.editorconfig` | KEEP | |
| `.gitignore` (added in Phase A) | KEEP | |
| `ARCHITECTURE.md`, `DEVELOPMENT.md`, `CHANGELOG.md` | KEEP BUT REFACTOR | Describe the old "enterprise migration"; rewrite once the new toolchain lands. |

### 2.2 Routes and directories

| Item | Status | Rationale |
| --- | --- | --- |
| `/` (`index.html`) | REBUILD · PRODUCTION CRITICAL | Content and URL kept; implementation replaced. |
| `pages/{rpa,webscraping,api,ai-assistant,training-consulting}.html` | REBUILD (content KEEP) | Marketing copy is good; shells carry auth. |
| `pages/financial-indicators.html` | INVESTIGATE | Is "Finansal İndikatör & Botlar" a real product today? If not, fold into Investment. |
| `pages/investment-analytics.html` | INVESTIGATE · split | Marketing landing → REBUILD here; calculators/chatbot/premium sections → PLATFORM CONCERN. |
| `pages/investment-retail.html`, `pages/investment-airlines.html` | PLATFORM CONCERN · REMOVE LATER | Premium-gated product previews. Keep 301s. |
| `pages/subscription.html` | INVESTIGATE | Shows ₺199/month Premium with no checkout; confirm real plans before a Pricing page exists. |
| `pages/{gizlilik,kvkk,kullanim-sartlari,hizmet-sozlesmesi}.html` | KEEP BUT REFACTOR | Legal text kept verbatim; strip Firebase/modal. Check with legal owner that the texts are current. |
| `pages/login.html`, `pages/unauthorized.html`, `pages/impersonate.html` | PLATFORM CONCERN · REMOVE LATER | Legacy MVP / admin tools. Redirect to platform. |
| `reset-password.html` | PLATFORM CONCERN · INVESTIGATE · PRODUCTION CRITICAL (auth emails) | Remove only after Firebase Auth action URL points to the platform. |
| `demo/` | KEEP BUT REFACTOR · INVESTIGATE | Cleanest code in repo; decide whether `/demo/` or `demo.teknoify.com` is canonical (both live). |
| `dashboard/**` (72 files) | PLATFORM CONCERN — DO NOT REIMPLEMENT · REMOVE LATER | Entire authenticated app. Removal requires the redirect plan in §5. |
| `dashboard/bim-istekleri/backend/`, `dashboard/web-scraping/backend/` | PLATFORM CONCERN · REMOVE LATER | Python Cloud Functions source, publicly served today. |
| `dashboard/geo-intelligence/istanbul-ultimate.geojson` | PLATFORM CONCERN · REMOVE LATER | 11.5 MB data file. |
| `domains/**/page.html` (6 mirrors) | REMOVE LATER | Unrouted, drifted copies with broken relative links; only the governance checkers care. |
| `domains/investment-intelligence/analytics/scripts/**` | PLATFORM CONCERN · INVESTIGATE | Live bridges loaded by `pages/investment-analytics.html`; move with the analytics product. |
| `apps/`, `packages/*/README.md`, `_archive/`, `services/*/README.md` skeleton | REMOVE LATER (decide in Phase B) | ADR-0001 skeleton for a migration that will not happen in this form. Keep the ADR as history. |
| `packages/config/routes.js`, `routes-global.js` | KEEP BUT REFACTOR · PRODUCTION CRITICAL | Loaded by 15 live pages; becomes the URL-contract source in the rebuild, then the dashboard entries are dropped. |
| `packages/auth/roles.js`, `premium-access.js` | PLATFORM CONCERN · REMOVE LATER | `premium-access.js` is already orphaned. |
| `services/equity-data-service/` | PLATFORM CONCERN · PRODUCTION CRITICAL (Render) | Real deployed service; move to platform repo with Render re-link. |
| `services/market-data-proxy/` | PLATFORM CONCERN · REMOVE LATER | Cloud Run service source. |
| `api/chat.js`, `api/chat-log.js` | REMOVE LATER | Orphaned, not deployed (live 404). |
| `data/currency/usd_try_rates.json` | PLATFORM CONCERN · PRODUCTION CRITICAL | Consumed by the public investment page and written by the cron workflow. |
| `data/investment-analytics/supermarket_dataset.json` | PLATFORM CONCERN | Consumed by the investment page. |
| `data/stock/**` (catalog, PDFs, extracted text) | PLATFORM CONCERN · REMOVE LATER | RAG corpus; publicly served today. |
| `data/entitlements.json`, `data/projects.json` | PLATFORM CONCERN · REMOVE LATER · **security review** | Publicly served entitlement map; only the legacy MVP seed reads them. |
| `scripts/architecture/*` | REMOVE LATER | Governance checkers for the old migration; currently red. |
| `scripts/update-usd-try-rates.*`, `scripts/*stock-doc*` | PLATFORM CONCERN | Data pipelines. |
| `docs/architecture/*`, `docs/decisions/ADR-0001*` | KEEP (as history) | Do not delete; archive under `docs/` when the new architecture is adopted. |
| `docs/{api-contracts,data-contracts,rag,security,product,deployment}` | KEEP BUT REFACTOR | Mostly skeleton READMEs. |

### 2.3 Systems and integrations

| Item | Status | Rationale |
| --- | --- | --- |
| Firebase Auth / Firestore / App Check / Functions on public pages | PLATFORM CONCERN · REMOVE LATER | Core cleanup target. |
| Login modal on every page (`#loginModal`, `AuthSystem`) | REMOVE LATER (replace with "Sign in" link to platform) | |
| `js/session-manager.js` (3-hour session timer, impersonation bar) | PLATFORM CONCERN · REMOVE LATER | |
| `js/lib/{firebase,auth,data,storage,nav}.js`, `js/pages/*`, `js/impersonate.js`, `js/premium-content-gate.js`, `js/finance.js`, `js/investment-analytics.js`, `js/pages/investment-market.js`, `js/services/exchange-rate-service.js`, `js/utils/*` | PLATFORM CONCERN · REMOVE LATER | Application code. Several already orphaned. |
| `js/script.js` | KEEP BUT REFACTOR → REBUILD | Contains the only marketing behaviours (nav, contact form, hero FX) fused with auth. Split conceptually; reimplement in the new toolchain. |
| `js/cookies.js` + GA4 `G-1XSJMZ0J2J` | KEEP BUT REFACTOR | Keep the property; rebuild consent so it covers all pages. |
| Contact endpoint `https://api.teknoify.com/submitContactForm` | INVESTIGATE · PRODUCTION CRITICAL (lead capture) | LIKELY unreachable today (TLS failure). Decide owner and replacement (Netlify Forms, platform API, or repaired Cloud endpoint). |
| reCAPTCHA v3 site key (App Check) | PLATFORM CONCERN · REMOVE LATER | Leaves with Firebase. |
| Cloud Functions `teknoify-api`, `apiProxy`; Cloud Run product-discover; Render equity API; Binance | PLATFORM CONCERN | Referenced only by dashboard/app code. |
| `css/00-settings/tokens.css` | KEEP BUT REFACTOR | Seed values for the new token system. |
| `css/{02-generic,03-elements,04-objects,05-components,06-pages/home.css}` | REBUILD | Reference only. |
| `css/06-pages/{dashboard,analysis,investment-analytics}/**`, `css/dashboard.css`, `css/analysis.css`, `dashboard/**/*.css` | PLATFORM CONCERN · REMOVE LATER | |
| Font Awesome, Google Fonts CDN | REBUILD (inline SVG, self-hosted fonts) | |

---

## 3. Legacy removal map (dependency-oriented)

Each chain lists what must be true before the head node can be deleted. Arrows read "depends on".

### 3.1 Public-page auth coupling (the first cleanup target)

```
index.html + 14 pages/*.html  (login modal markup, .trigger-login CTAs)
 → js/script.js  AuthSystem (firebase.auth compat, Firestore users role read, App Check init)
   → <script> firebase-{app,auth,firestore,appcheck,functions}-compat.js  (9.23.0 on index, 9.6.1 on pages)
   → reCAPTCHA api.js (index only) + site key 6Letm…dAwk (also in js/lib/auth.js)
   → js/session-manager.js  (own Firebase config copy; localStorage session_start_time, impersonated_user_*)
   → packages/config/routes-global.js → packages/config/routes.js  getDashboardRouteForRole()
   → sessionStorage tk_post_login_redirect  (written by js/premium-content-gate.js)
   → redirect targets /dashboard/{admin,premium,member}.html
```

Safe removal order: (1) replace the modal trigger with a link to the platform sign-in; (2) delete the modal markup from all 15 pages; (3) split `script.js` into `nav`, `contact`, `fx` and drop `AuthSystem`; (4) remove the Firebase/reCAPTCHA `<script>` tags and `session-manager.js`; (5) drop `DASHBOARD_ROUTES` from `routes.js`. Verify after each step that the header, contact form and hero still work, and that no public page still references `firebase`.

### 3.2 Investment analytics (hybrid page)

```
pages/investment-analytics.html
 → js/investment-analytics.js (149 KB classic)  → fetch /data/currency/usd_try_rates.json  ← written by .github cron
                                                 → fetch /data/investment-analytics/supermarket_dataset.json
                                                 → fetch /api/chat, sendBeacon /api/chat-log  (404 in production)
 → domains/investment-intelligence/analytics/scripts/**  (5 "-global.js" bridges, load-order sensitive)
 → js/premium-content-gate.js → firebase compat auth + Firestore users.role  → pages/investment-{retail,airlines}.html
 → pages/subscription.html (pricing CTA)
```

Blocking question: which parts are product (calculators, chatbot, sector data) versus marketing. Recommended split: keep a marketing landing at the same URL; move the interactive analytics to the platform; then delete `js/investment-analytics.js`, the bridges, the two premium pages and `premium-content-gate.js` together.

### 3.3 Dashboard

```
/dashboard/index.html → js/lib/auth.js requireAuth → js/lib/firebase.js (config copy #3) → Firestore users/{uid}.role
                      → packages/auth/roles.js, packages/config/routes.js
                      → fallback /login.html (404 today)
/dashboard/admin.html → js/pages/admin.js → Firestore users, projects (update/delete), sendPasswordResetEmail
                      → dashboard/shared/sidebar.js → js/lib/auth.js logout
/dashboard/member.html + ai-hub/*, billing/*, developer/*, workspace/*, settings/*, support/*, organization/*
                      → dashboard/shared/{sidebar,member-topbar,app-shell,profile-manager,phase3}.js → Firestore users, projects, project_requests, configs, admins
/dashboard/bim-istekleri, web-scraping/*, demo/market-analysis, market-analysis-demo
                      → dashboard/shared/auth.js (BROKEN import /dashboard/js/lib/firebase.js) → dashboard/shared/config.js → window.TK_PROJECT_ID → data/entitlements semantics
                      → Cloud Function teknoify-api / apiProxy
/dashboard/services/investment → js/pages/investment-market.js → Render equity API (meta teknoify-equity-api-base) + Cloud Run proxy + Binance
/dashboard/agents/product-discover → product-discover.js → Cloud Run product-discover-api
/dashboard/geo-intelligence → istanbul-ultimate.geojson (11.5 MB) + OSM/Carto tiles
/dashboard/member/{finance,health,productivity,subscriptions} → js/finance.js, broken ../../config.js refs
```

Safe removal order: (1) platform provides equivalents or explicit sunset; (2) add `_redirects` `/dashboard/* https://platform.teknoify.com/:splat 301` (or a static "moved" page) **before** deleting files; (3) delete `dashboard/**`, `js/lib/**`, `js/pages/**`, `js/finance.js`, `js/impersonate.js`, `css/06-pages/dashboard/**`, `css/06-pages/analysis/**`, `css/dashboard.css`, `css/analysis.css`, `dashboard/index.css`; (4) delete `packages/auth/*` and the dashboard keys in `routes.js`; (5) drop `firebase-admin` from `package.json`.

### 3.4 Legacy localStorage MVP (dead layer)

```
pages/login.html → js/pages/login.js → js/lib/auth.js (expects `login` export that no longer exists — LIKELY broken)
index.html (no longer) → js/pages/home.js → js/lib/storage.js initSeedDataOnce → fetch data/projects.json, data/entitlements.json → localStorage teknoify_projects/entitlements/seeded_v2
js/lib/nav.js renderNav → js/lib/data.js getUsers → Firestore
pages/unauthorized.html → js/pages/unauthorized.js
```

Can be removed together with `data/projects.json` and `data/entitlements.json` once no dashboard code reads them (`js/lib/data.js` `getProjectsByIds` reads Firestore, not the JSON).

### 3.5 Browser storage keys owned by legacy code

`localStorage`: `session_start_time`, `impersonated_user_key`, `impersonated_user_id`, `teknoify_impersonate_uid`, `tk_access_denied`, `tk_last_success`, `tk_visitor_id`, `teknoify_projects`, `teknoify_entitlements`, `teknoify_seeded_v2`, `teknoify_sidebar_collapsed`, `teknoify_cookie_consent`. `sessionStorage`: `tk_post_login_redirect`. Only `teknoify_cookie_consent` (and a future analytics consent key) belongs to marketing. Cleanup should ship a one-time script that clears the others so returning visitors are not stuck behind `tk_access_denied`.

### 3.6 Platform infrastructure files in this repo

```
render.yaml → services/equity-data-service/** (Dockerfile, FastAPI, tests)  [Render link UNVERIFIED]
dashboard/bim-istekleri/backend/{main.py,deploy.sh}, dashboard/web-scraping/backend/{main.py,deploy.sh} → gcloud functions deploy (manual)
services/market-data-proxy/** → Cloud Run (manual)
.github/workflows/* → commits data/** to main
```

Move order: copy to the platform repo → re-link Render/Cloud deploy sources → remove here. Never delete `render.yaml` first.

---

## 4. Production-critical files (do not touch without a checkpoint)

`index.html`; `pages/*.html` (public URLs); `css/style.css` and the 8 files it imports; `css/{rpa,webscraping,api,ai-assistant,financial-indicators,training-consulting}.css`; `js/script.js`; `js/session-manager.js` (until auth cleanup); `js/cookies.js`; `packages/config/routes.js`, `routes-global.js`; `demo/**`; `data/currency/usd_try_rates.json`; `data/investment-analytics/supermarket_dataset.json`; `reset-password.html` (auth emails); `render.yaml`; `.github/workflows/update-usd-try-rates.yml`; the Netlify UI configuration (external).

---

## 5. Known unknowns (must be resolved before cleanup)

| # | Unknown | Who can answer | Why it matters |
| --- | --- | --- | --- |
| U1 | Netlify site settings: production branch, publish dir, build command, Deploy Previews, Pretty URLs, branch deploys, env vars, deploy hooks, form handling | Netlify UI | Every deploy assumption in this audit is inferred. |
| U2 | Is `demo.teknoify.com` this repo's `/demo/` (branch/subdomain deploy) or a separate site? | Netlify UI | Duplicate content and which one to keep. |
| U3 | Does `platform.teknoify.com` use Firebase project `teknoify-9449c`? Are marketing-site users the same users? | Platform team | Determines whether removing Firebase here is a pure deletion or a user migration. |
| U4 | Where does the Firebase Auth password-reset email action URL point (`/reset-password.html` here?) | Firebase console | Deleting the page could break password resets for platform users. |
| U5 | Is the Render service `teknoify-equity-data` linked to this GitHub repo/branch? | Render dashboard | `render.yaml` deletion safety. |
| U6 | Is `https://api.teknoify.com/submitContactForm` alive from other networks/regions? Who owns it? | Cloud console | Lead capture is the only conversion mechanism today. |
| U7 | Which URLs are indexed by Google today (Search Console)? Any inbound links to `/pages/*.html`, `/dashboard/*`, `/demo/`? | GSC / analytics | Redirect map for the rebuild. |
| U8 | Are the Subscription page plans (₺199/₺1.990, Profesyonel) real, purchasable, and current? | Product owner | Pricing page content. |
| U9 | Are "Finansal İndikatör & Botlar", "Eğitim & Danışmanlık", and "Veri Analitiği" active offerings? | Product owner | Information architecture. |
| U10 | Real user counts on the dashboard (Firestore `users`) and which tools are in use | Firebase console | Sunset/redirect plan for `/dashboard/*`. |
| U11 | Are GitHub branch protection rules on `main`? | GitHub settings | Workflow safety. |
| U12 | Is the GA4 property `G-1XSJMZ0J2J` the one to keep, and is a GTM container preferred? | Marketing owner | Analytics continuity. |

---

## 6. Risk register

Probability/Impact: L / M / H. "Phase" refers to `04-phased-implementation-plan.md`.

| ID | Risk | Evidence | P | I | Mitigation | Phase |
| --- | --- | --- | --- | --- | --- | --- |
| R-01 | Any push to `main` deploys to production immediately; bot commits deploy too | No build step; bot cron; Netlify auto-deploy LIKELY | H | H | Add `netlify.toml` with explicit context config; branch-protect `main`; move data workflows out; use PR previews for all changes | A.2 |
| R-02 | Netlify configuration lives only in the UI (Pretty URLs, previews, domain) and can be lost or misread | No config files in repo/history | M | H | Snapshot settings into `docs/deployment/netlify.md` and codify in `netlify.toml`/`_headers`/`_redirects` | A.2 |
| R-03 | Removing auth breaks the homepage (modal, CTAs, `script.js` coupling) | `AuthSystem` fused into `script.js`; `.trigger-login` CTAs | H | M | Follow §3.1 order; keep a "Sign in" link to platform; smoke test nav/contact/hero after each step | F (cleanup track) |
| R-04 | Firebase removal breaks password resets or platform users | `reset-password.html`, U3/U4 | M | H | Resolve U3/U4 first; keep `reset-password.html` until the action URL is repointed; 301 afterwards | cleanup track |
| R-05 | Dead-code false positives | Netlify link rewriting, `window.*` globals, string-built paths (`joinPath`), 15 pages loading modules by absolute path | M | M | Treat orphan analysis as a hint; verify with live URL probes and grep for basenames and globals before deleting | cleanup track |
| R-06 | SEO regression from URL changes (`/pages/rpa.html` → new slugs) | Pretty URLs already serve two variants; U7 unknown | M | H | Freeze URL contract in Phase B; 301 map in `_redirects`; canonicals; submit sitemap; monitor GSC | B, I |
| R-07 | Broken legacy URLs (bookmarked `/dashboard/*`, `/login.html` already 404) | live probes | H | M | `_redirects` for `/dashboard/*` → platform; custom 404 page | cleanup track |
| R-08 | Bundle/perf regression if the rebuild imports a UI/animation stack | Current homepage already ships ~510 KB Firebase | M | M | Static-first framework, zero-JS default, budget: ≤ 100 KB JS on marketing pages, LCP < 2.5 s | D, H, I |
| R-09 | Mobile regression (nav, forms) | Confirmed defects today | M | H | Mobile-first components; device matrix in every PR preview; automated viewport screenshots | D, I |
| R-10 | Accessibility regression | No a11y tooling; 10 confirmed issues | M | H | axe + keyboard checklist in CI from Phase D; skip link, focus policy, dialog pattern in the shell | D, I |
| R-11 | Analytics loss | GA only on homepage, consent-gated | M | L | Keep GA4 ID; consent component on every page; verify events in preview | D |
| R-12 | Environment-variable coupling | None in frontend; Render/Cloud envs in repo docs | L | M | Keep marketing build env-free except public IDs | D |
| R-13 | Accidental platform coupling stays (render.yaml, workflows, backends, data) | Files in repo; Render link UNVERIFIED | H | H | Move in the order of §3.6; never delete infra files before re-link confirmation | cleanup track |
| R-14 | Public exposure of internals: backend source, docs, `data/entitlements.json`, RAG PDFs, `package.json` served from root | live 200s | H | M | Immediate: `_redirects` 404 rules for `/docs/*`, `/data/entitlements.json`, `/dashboard/*/backend/*`, `/services/*`, `/scripts/*`; long-term: build to a `dist/` publish dir | A.2 |
| R-15 | Contact form silently failing (endpoint TLS failure) | curl handshake failure; U6 | M | H | Verify from two networks; choose replacement (Netlify Forms or platform endpoint); add error telemetry | A.2 |
| R-16 | Honeypot "ban" locks real users out via `localStorage` | `banAndLogBot()` | L | M | Remove in rebuild; ship a one-time cleanup of legacy keys | D |
| R-17 | Missing security headers (no CSP, X-Frame-Options, etc.) | live headers | M | M | `_headers` with CSP report-only first | A.2 / I |
| R-18 | Governance checkers red on `main` mislead contributors | `check:architecture` FAIL | M | L | Deprecate the checkers in Phase B docs; remove in cleanup | B |
| R-19 | Duplicate content: `/demo/` vs `demo.teknoify.com`, `domains/**/page.html` served | live 200s | M | M | Canonicals; 404 the mirrors; decide U2 | A.2, B |
| R-20 | Repo identity confusion (`SSerkanYavuzcan/teknoify` holds platform infra) | remote URL, contents | L | M | Rename repo to `teknoify-marketing` on GitHub only after Netlify/Render links are confirmed to survive a rename (GitHub redirects renames; Netlify re-links automatically; Render UNVERIFIED) | J |
