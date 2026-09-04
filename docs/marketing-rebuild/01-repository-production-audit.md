# 01 — Repository & Production Audit (Phase A)

Audit date: 2026-09-04. Audited commit: `24f3044` (`main`, aligned with `origin/main`).
Audit branch: `chore/marketing-rebuild-audit`.

Evidence labels used throughout: **CONFIRMED** (observed directly in the repository, a command result, or a live HTTP response), **LIKELY** (strong indirect evidence), **UNVERIFIED** (cannot be proven from repository or public evidence; needs Netlify/Firebase/Render console access).

No runtime file was modified during this audit. The only non-documentation change on the audit branch is a new `.gitignore` (see §15).

> **Phase A.2 corrections (2026-09-05, see `05-production-boundary-and-legacy-exit.md` §1).** Several labels below were upgraded or corrected with new evidence: the GitHub repository is **public**; production deploying from `main` is **CONFIRMED** (the Sep 4 bot commit's data file is what production serves); `render.yaml` is **CONFIRMED** linked to this repository and Render auto-deploys every `main` commit; two Netlify sites (`fancy-klepon-8eac4e` = `teknoify.com`, `teknoify-demo` = `demo.teknoify.com`) build from this repo with Deploy Previews **CONFIRMED** enabled; `main` has **no branch protection**; `api.teknoify.com` answers neither 443 nor 80 (LIKELY dead globally). Rows below keep their original wording with inline notes where the change matters.

---

## 1. Git baseline

| Item | Finding | Evidence |
| --- | --- | --- |
| Repository root | `C:/dev/Teknoify/teknoify-marketing` | `git rev-parse --show-toplevel` |
| Remote `origin` | `https://github.com/SSerkanYavuzcan/teknoify.git` — note the GitHub repo is named `teknoify`, not `teknoify-marketing` | `git remote -v` |
| Branch at audit start | `main`, tracking `origin/main`, **identical** (`## main...origin/main`, no ahead/behind) | `git status --porcelain --branch` |
| Working tree at audit start | Clean. No stash. | `git status`, `git stash list` |
| Tags | None | `git tag -l` |
| Remote branches | 324. Nearly all are `codex/*` task branches; non-codex: `feature/firebase-rbac`, `fix/firebase-load`, `micro/admin-view-as`, `micro/auth-effective-session`, `micro/impersonate-guardrails`, `micro/yakup-webscraping-entitlement` | `git branch -a` |
| History | 1 071 commits, 282 merge commits, first commit `f49d2cf` 2026-03-01 "Initial Secure Commit: All vulnerabilities patched (SSRF, XSS, Access Control)" — history before that date was squashed away | `git log --reverse`, `git rev-list --count HEAD` |
| Authorship | 1 049 commits by the repository owner, 22 by `github-actions[bot]` ("chore(data): update USD TRY rates") | `git shortlog -s -n` |
| Last human change | PR #318 merged 2026-08-28 (agent library typography). The four newest commits on `main` are bot data commits (Sep 1–4) | `git log` |
| `.gitignore` | **CONFIRMED absent.** `node_modules` was removed from tracking in `e3a8ea3` but never ignored; after `npm ci`, `git status` shows `?? node_modules/`. No global excludes file is configured. | `ls .gitignore`, `git config --global core.excludesfile` |
| Tracked files | 445 | `git ls-files \| wc -l` |
| Large tracked binaries | `dashboard/geo-intelligence/istanbul-ultimate.geojson` 11.5 MB; `images/projects/map-icon.png` 1.8 MB; `images/projects/scraper-icon.png` 1.5 MB; two Q1-2026 activity-report PDFs under `data/stock/turkey/*/reports/` (790 KB, 489 KB) | size scan of `git ls-files` |
| Secrets in Git | No private keys, service-account JSON or `.env` files are tracked. Only `.env.example` files exist (`dashboard/bim-istekleri/backend/`, `dashboard/web-scraping/backend/`, `services/equity-data-service/`). The Firebase **web** config (apiKey/appId/etc. for project `teknoify-9449c`) is embedded in four files (`js/lib/firebase.js`, `js/script.js`, `js/session-manager.js`, `reset-password.html`); Firebase web API keys are public identifiers by design, but see risk R-14 in doc 02. A reCAPTCHA v3 **site** key and the GA4 measurement ID are also embedded (public by design). The TCMB EVDS key is a GitHub Actions secret, not in Git. | pattern scan (values redacted, not copied) |
| Local Git quirk | On this machine the directory is owned by `BUILTIN\Administrators`, so Git refuses to operate ("dubious ownership"). The audit passed `-c safe.directory=…` per command instead of changing global config. The repository's own `npm run check:architecture` shells out to `git ls-files` and **fails for the same reason** unless `safe.directory` is set. | command output |

### Branch workflow support

The expected model (`main` → feature branch → PR → Netlify preview → merge → production) is **partially** supported:

- CONFIRMED: PR-based flow is the observed practice (282 merges, 324 task branches).
- CONFIRMED: there is **no CI** that runs lint/format/build on PRs. `.github/workflows/` contains only two data-pipeline workflows that **commit directly to `main`** (`update-usd-try-rates.yml` on a cron, `extract-stock-document-text.yml` on dispatch), both with `contents: write`.
- CONFIRMED: no branch protection is visible from the repository (branch protection is a GitHub setting; UNVERIFIED).
- UNVERIFIED: whether Netlify Deploy Previews are enabled for PRs (a Netlify UI setting; no `netlify.toml` exists to declare it).

---

## 2. Actual frontend stack

| Concern | Finding (all CONFIRMED unless noted) |
| --- | --- |
| Framework | **None.** Static multi-page HTML (`package.json` `"description": "Teknoify static multi-page website"`). 58 tracked `.html` files. |
| Rendering / routing | File-system routing on a static host. Root `index.html`, `pages/*.html`, `dashboard/**/*.html`, `demo/index.html`. No SPA router. `packages/config/routes.js` mirrors the route strings as constants. |
| Build system | **None.** No bundler, no transpiler, no image pipeline. Files are served as committed. |
| Language | JavaScript only. No TypeScript (no `tsconfig`, no `.ts` files). |
| Module strategy | Mixed: classic `<script>` globals (`js/script.js`, `js/session-manager.js`, `js/cookies.js`, `js/investment-analytics.js`) **and** ES modules (`js/lib/*`, `js/pages/*`, `dashboard/shared/*`, `packages/config/routes-global.js`). Modules import Firebase directly from `https://www.gstatic.com/firebasejs/...` URLs. |
| Firebase SDK versions in use | **Three**: `9.23.0` (homepage compat + all modular code), `9.6.1` compat (every `pages/*.html` service/legal page), `12.7.0` modular (`reset-password.html`). |
| Package manager / lockfile | npm, `package-lock.json` lockfileVersion 3, 186 top-level packages — almost all transitive dependencies of the single runtime dependency `firebase-admin@^13.7.0`. |
| Declared devDependencies | Only `stylelint` and `stylelint-config-standard`, both `file:tools/...` **local stubs**. `tools/stylelint/bin/stylelint.js` is a 30-line brace-balance checker, not Stylelint. ESLint and Prettier are **not declared** anywhere, so `npm run lint:js`, `format:check` and `check` fail from a clean install (§14). |
| Node assumptions | Docs say Node 18+ / npm 9+. No `engines`, no `.nvmrc`. Audit ran on Node 24.13.1 / npm 11.8.0. |
| CSS strategy | Hand-written CSS. `css/style.css` is an `@import` manifest of 8 layer files (settings → generic → elements → objects → components → pages). Each product page adds its own stylesheet (`css/rpa.css`, `css/webscraping.css`, …). Dashboard and investment areas have separate layer trees. 55 CSS files, 452 KB total. |
| CSS framework | None. `css/00-settings/tokens.css` defines 20 custom properties (brand indigo `#6366f1`, dark surfaces, Inter Tight / Fira Code, three radii, 1200px container). |
| Component architecture | None. Header, nav, footer, login modal and cookie banner are **copy-pasted into every HTML file** (14 pages carry an identical `<form id="loginForm">`). `js/lib/nav.js` renders a nav from JS but is only consumed by the legacy MVP flow. |
| State management | Browser globals (`window.USER_SESSION`, `window.PROJECT_CONFIG`, `window.TEKNOIFY_ROUTES`, `window.SessionManager`) plus `localStorage` / `sessionStorage` keys (full list in doc 02 §3). |
| Data fetching | `fetch()` from page scripts to Firebase (Firestore), Cloud Functions, Cloud Run, Render, Binance, and static JSON under `/data/`. |
| Forms | Native forms + custom `CustomSelectSystem` in `js/script.js`. Contact form posts JSON to `https://api.teknoify.com/submitContactForm`. |
| Animation | Custom: canvas "quantum grid" + DOM particle field (`BackgroundFX` in `js/script.js`), typing "terminal" effect, CSS keyframes. No animation library. Honors `prefers-reduced-motion` in JS and in 8 CSS files. |
| Icons | Font Awesome 6.5.0 **full** CSS from cdnjs (102 KB CSS + webfonts) on every page; 938 `<i class="fa…">` usages. Six inline SVG market icons under `assets/images/market-icons/`. |
| Fonts | Google Fonts `Inter Tight` (300–800) and `Fira Code` via render-blocking `<link>`; `preconnect` present on homepage. |
| Images | Two `<img>` tags in the whole site. Homepage and service pages are icon/CSS-art driven. No image optimization pipeline. |
| Analytics | GA4 (`G-1XSJMZ0J2J`) injected by `js/cookies.js` **only after cookie consent** and **only on `index.html`** (the only page that loads `cookies.js`). |
| Error monitoring | None. |
| Environment variables | None in the frontend (no `.env` consumption, no build). Backend services under `dashboard/*/backend` and `services/*` use `.env.example`. |
| Testing | No frontend tests. Python `pytest` suites exist for `services/equity-data-service` (not run in this audit; that service is a platform concern). |
| Linting / formatting | `eslint.config.js` (flat config, targets `js/**` only), `.prettierrc.json` with a `.prettierignore` that excludes **all** `*.html`, `css/**`, `dashboard/**`, `pages/**`, `js/**`, `data/**` — i.e. formatting is enforced on almost nothing. `.stylelintrc.json` extends a stub config. `.editorconfig` present. |
| CI | None for quality. Two data workflows (see §1). |
| Deployment config in repo | **None** for the website. `render.yaml` (Render Blueprint) deploys the Python equity service from this repo. |

---

## 3. Repository structure

| Path | Tracked files | What it actually is | Marketing / Platform | Notes |
| --- | --- | --- | --- | --- |
| `index.html` | 1 | Homepage (42 KB): hero, services hub, contact form, login modal, cookie banner, 5 Firebase compat SDKs, reCAPTCHA | Marketing (with embedded auth) | Production entry point |
| `reset-password.html` | 1 | Firebase `confirmPasswordReset` handler (`?oobCode=`) using SDK 12.7.0 | Platform | Firebase Auth email templates LIKELY point here (UNVERIFIED) |
| `pages/` | 17 | 6 service pages, 4 legal pages, 3 investment pages, pricing (`subscription.html`), `login.html` (legacy MVP), `impersonate.html`, `unauthorized.html` | Mixed | See §6 |
| `dashboard/` | 72 | Authenticated app: admin, member, premium, AI hub, billing, developer, workspace, settings, product tools (BİM API console, web-scraping, geo-intelligence, product-discover agent), shared shell scripts, **two Python Cloud Functions backends**, 11.5 MB GeoJSON | Platform | Entire tree is a platform concern |
| `js/` | 24 | Global scripts, Firebase/auth libs, page controllers, 149 KB investment analytics | Mixed | `js/script.js` fuses marketing UI, auth, contact form and background FX |
| `css/` | 55 | Layered marketing CSS + dashboard/analysis/investment CSS trees | Mixed | |
| `demo/` | 12 | "Teknoify Demo Lab" static page (`/demo/`), data-driven catalog, no auth | Marketing-adjacent | Also served at `demo.teknoify.com` (UNVERIFIED whether same repo) |
| `domains/` | 43 | ADR-0001 "domain ownership" skeleton: READMEs, 6 **mirror copies** of `pages/*.html`, extracted investment calculator modules | Governance | Mirrors are not routed and have broken relative links |
| `apps/`, `packages/`, `_archive/` | 6 / 11 / 1 | ADR-0001 skeleton READMEs; `packages/config/routes*.js` and `packages/auth/roles.js` are the only runtime files | Governance | `routes-global.js` is loaded by 15 public pages |
| `services/` | 43 | Python FastAPI equity service (deployed to Render), Node Cloud Run market-data proxy, worker READMEs | Platform | `render.yaml` at root references `services/equity-data-service` |
| `api/` | 2 | Node `(req,res)` handlers (`chat.js`, `chat-log.js`), mock chatbot. Called from `js/investment-analytics.js` as `/api/chat` and `/api/chat-log`. **Live `/api/chat` returns 404**; nothing deploys them. | Platform / dead | CONFIRMED not deployed |
| `data/` | 41 | Currency rates (bot-updated), stock document catalog + PDFs + extracted text (RAG), supermarket dataset, `entitlements.json`, `projects.json` | Platform (mostly) | `usd_try_rates.json` and `supermarket_dataset.json` are fetched by the public investment page |
| `scripts/` | 25 | 15 "architecture governance" checkers, data update scripts (Node + Python), RAG tooling | Governance / Platform | Checkers are read-only (no write calls found) |
| `docs/` | 65 | ADR-0001 governance corpus: 35+ phase documents about a never-executed "enterprise migration" | Governance | Useful history; not a marketing content model |
| `tools/` | 4 | Stylelint stubs | Tooling | |
| `.github/workflows/` | 2 | Data pipelines committing to `main` | Platform | Trigger production deploys (LIKELY) |
| `images/`, `assets/` | 2 / 6 | Two multi-MB PNG project icons; six SVG market icons | Mixed | `images/favicon.png` / `favicon.ico` are **referenced but do not exist** |

---

## 4. Netlify / production findings

### 4.1 What is confirmed

| Finding | Status | Evidence |
| --- | --- | --- |
| `teknoify.com` is served by Netlify | **CONFIRMED** | `curl -I https://teknoify.com/` → `Server: Netlify`, `X-Nf-Request-Id: …` |
| `www.teknoify.com` redirects to the apex | CONFIRMED | `curl -IL https://www.teknoify.com/` → final `https://teknoify.com/` |
| Publish directory is the **repository root** with **no build step** | CONFIRMED | Non-web files are publicly served: `/package.json` 200, `/docs/README.md` 200, `/dashboard/bim-istekleri/backend/main.py` 200, `/data/entitlements.json` 200, `/packages/config/routes.js` 200. Dotfiles are hidden (`/services/equity-data-service/.env.example` 404). |
| Production content equals `main` | **LIKELY (strong)** → **CONFIRMED in A.2** (live `data/currency/usd_try_rates.json` equals the `24f3044` bot commit and no earlier commit) | Live `/js/script.js` is **byte-identical** to HEAD (modulo CRLF/LF). Live `index.html`, `pages/rpa.html`, `dashboard/member.html` differ from HEAD **only** in link rewriting (`href="pages/rpa.html"` → `href='/pages/rpa'`, attributes re-serialized with single quotes). That is the signature of Netlify's **Pretty URLs** asset-optimization post-processing, a UI-only setting. |
| Extensionless URLs resolve | CONFIRMED | `/dashboard/admin` → 200 |
| No `netlify.toml`, `_redirects`, `_headers`, `netlify/functions`, edge functions, plugins, or `.netlify/` directory in the repo or **anywhere in Git history** | CONFIRMED | file search + `git log --all --name-only` |
| No custom headers beyond HSTS | CONFIRMED | Live response has `Strict-Transport-Security` only; no CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` |
| No `robots.txt`, `sitemap.xml`, `404.html`, web manifest, or favicon files | CONFIRMED | 404 on `/robots.txt`, `/sitemap.xml`, `/images/favicon.png`; none tracked |
| `/login.html` is a dead redirect target | CONFIRMED | `dashboard/index.html` falls back to `window.location.replace("/login.html")`; live `/login.html` → 404 |
| `/api/chat` and `/api/chat-log` are not deployed | CONFIRMED | live 404; `api/*.js` are Node handlers with no Netlify Functions wiring |
| `platform.teknoify.com` and `demo.teknoify.com` are live, both on Netlify | CONFIRMED (header) | Out of scope; recorded because the marketing site links to `https://demo.teknoify.com/` (PR #231 changed the homepage demo CTA from `developers.teknoify.com` to `demo.teknoify.com`; `developers.teknoify.com` does not resolve today) |
| Contact-form endpoint `https://api.teknoify.com/submitContactForm` | **LIKELY BROKEN** | DNS resolves (35.241.42.136, a Google Cloud address) but the TLS handshake fails from the audit machine (`schannel: failed to receive handshake`). The homepage contact form therefore LIKELY fails for visitors. Needs verification from a second network. |
| `https://teknoify-equity-data.onrender.com/health` | CONFIRMED reachable | Returned `{"status":"warming_up","ready":false}` (free-plan cold start). Used by `dashboard/services/investment/index.html`. |

### 4.2 What powers `teknoify.com` today (answers to the brief)

1. **Repository state** — `main` at HEAD, published raw, with Netlify Pretty URLs rewriting (LIKELY).
2. **Production branch** — `main` (LIKELY; the Netlify site settings are UNVERIFIED but nothing else fits the evidence).
3. **What could break production if removed** — anything under `/`, `/pages/`, `/dashboard/`, `/demo/`, `/css/`, `/js/`, `/packages/config/`, `/data/currency/`, `/data/investment-analytics/` is a live URL. Removing `packages/config/routes-global.js` breaks 15 pages; removing `js/script.js` breaks every public page; removing `data/currency/usd_try_rates.json` breaks the investment page and the cron workflow.
4. **Legacy deployment artifacts** — `render.yaml` (Render Blueprint, `autoDeployTrigger: commit`), `dashboard/*/backend/deploy.sh` (gcloud Functions deploy scripts), `services/market-data-proxy` (Cloud Run). None affect Netlify but all are couplings to platform infrastructure living in the marketing repo.
5. **Preview deployments** — UNVERIFIED in Phase A; **CONFIRMED in A.2** via PR commit statuses (`netlify/fancy-klepon-8eac4e/deploy-preview` and `netlify/teknoify-demo/deploy-preview`, "Deploy Preview ready!").
6. **Redirects/rewrites coupling marketing URLs to app functionality** — none exist. The coupling is in the HTML itself: every public page embeds the login modal and `AuthSystem` redirects into `/dashboard/*.html` on the same origin.
7. **Auth assumptions in production routing** — none at the host level (no Netlify role-based redirects). All auth gating is client-side JavaScript after page load.

### 4.3 Production couplings that are not Netlify

| Coupling | Evidence | Status |
| --- | --- | --- |
| GitHub Actions bot pushes to `main` daily (cron `0 6 1-7 * *`, plus dispatch) | `.github/workflows/update-usd-try-rates.yml` | CONFIRMED; **A.2: each push CONFIRMED to deploy** both Netlify (content proof) and Render (deployment record) |
| Render Blueprint in repo root | `render.yaml` → `services/equity-data-service/Dockerfile`, `ALLOWED_ORIGINS=https://teknoify.com,https://www.teknoify.com` | CONFIRMED file; **A.2: CONFIRMED linked** — GitHub deployment records `main - teknoify-equity-data` exist for every `main` commit since 2026-07-26, bot commits included |
| Firebase project `teknoify-9449c` (Auth, Firestore, App Check, Functions) | four config sites; `europe-west1-teknoify-9449c.cloudfunctions.net/teknoify-api`, `us-central1-…/apiProxy` | CONFIRMED referenced; whether `platform.teknoify.com` uses the **same** Firebase project is UNVERIFIED and matters for cleanup |
| Google Cloud Run `product-discover-api-…run.app` | `dashboard/agents/product-discover/product-discover.js` | CONFIRMED referenced |

---

## 5. Quality-gate results (§14 has the table)

See §14.

---

## 6. Route inventory

Legend for **Disposition**: KEEP · REWORK · REPLACE · MOVE TO PLATFORM · REMOVE LATER · INVESTIGATE. "Auth" = requires or assumes a Firebase session. "Reach" = reachable from the homepage navigation/footer (N = only by direct URL).

### 6.1 Root and marketing pages

| Route | Source | Purpose | Facing | Auth | Key dependencies | Reach | Disposition |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | `index.html` | Homepage: hero, 8-card services hub, contact form, login modal, cookie banner | Marketing + auth entry | Optional (modal) | Firebase compat ×5 (app, auth, firestore, appcheck, functions), reCAPTCHA v3, `js/session-manager.js`, `packages/config/routes-global.js`, `js/script.js`, `js/cookies.js`, `css/style.css` chain | Y | **REPLACE** (rebuild; preserve copy and URL) |
| `/pages/rpa.html` | `pages/rpa.html` | RPA service page | Marketing | Optional (modal) | Firebase 9.6.1 compat, session-manager, script.js, `css/rpa.css` | Y | REWORK (content) / REPLACE (implementation) |
| `/pages/webscraping.html` | `pages/webscraping.html` | Web scraping service page | Marketing | Optional | same pattern + `css/webscraping.css` | Y | REWORK / REPLACE |
| `/pages/api.html` | `pages/api.html` | API integration service page | Marketing | Optional | same + `css/api.css` | Y | REWORK / REPLACE |
| `/pages/ai-assistant.html` | `pages/ai-assistant.html` | AI assistant / chatbot service page | Marketing | Optional | same + `css/ai-assistant.css` | Y | REWORK / REPLACE |
| `/pages/financial-indicators.html` | `pages/financial-indicators.html` | Financial indicators & bots page | Marketing | Optional | same + `css/financial-indicators.css` | Y | INVESTIGATE (is this a real product?) |
| `/pages/training-consulting.html` | `pages/training-consulting.html` | Training & consulting page | Marketing | Optional | same + `css/training-consulting.css` | Y | REWORK / REPLACE |
| `/pages/investment-analytics.html` | `pages/investment-analytics.html` | Hybrid: public investment analytics landing + calculators + "Yatırım Asistanı" chatbot; premium sections gated | Marketing **and** product | Optional / premium gate | Firebase 9.6.1 compat ×3, `js/investment-analytics.js` (149 KB), 5 bridge modules under `domains/investment-intelligence/`, fetches `/data/currency/usd_try_rates.json`, `/data/investment-analytics/supermarket_dataset.json`, posts to `/api/chat` (404 live) | Y | **INVESTIGATE → MOVE TO PLATFORM** (product), keep a marketing landing |
| `/pages/investment-retail.html` | `pages/investment-retail.html` | Premium-gated retail analysis preview | Product | Premium | `js/premium-content-gate.js`, Firestore `users` | N (from analytics page) | MOVE TO PLATFORM / REMOVE LATER |
| `/pages/investment-airlines.html` | `pages/investment-airlines.html` | Premium-gated airline analysis preview | Product | Premium | same | N | MOVE TO PLATFORM / REMOVE LATER |
| `/pages/subscription.html` | `pages/subscription.html` | Pricing: Başlangıç / Premium ₺199 per month or ₺1.990 per year / Profesyonel | Marketing (pricing) | Optional | Firebase compat ×3, session-manager, script.js | N (linked from investment pages) | **INVESTIGATE** (are these plans real and purchasable? no checkout exists) |
| `/pages/gizlilik.html`, `/pages/kvkk.html`, `/pages/kullanim-sartlari.html`, `/pages/hizmet-sozlesmesi.html` | `pages/*.html` | Legal texts (privacy, KVKK, terms, service agreement) | Marketing (legal) | Optional (modal) | Firebase 9.6.1 compat, session-manager, script.js | Y (footer) | KEEP content / REPLACE shell |
| `/pages/login.html` | `pages/login.html` | "Teknoify MVP Giriş — demo hesaplar" login page | Legacy app | localStorage MVP | `js/pages/login.js`, `js/lib/storage.js` seed data | N | REMOVE LATER (redirect to platform sign-in) |
| `/pages/impersonate.html` | `pages/impersonate.html` | Admin "view as user" tool; page text admits it is backend-less and "gerçek güvenlik sağlamaz" | Legacy admin | Admin | `js/impersonate.js`, localStorage keys | N | MOVE TO PLATFORM / REMOVE LATER |
| `/pages/unauthorized.html` | `pages/unauthorized.html` | Access-denied page linking to dashboard | App | — | `js/pages/unauthorized.js`, empty `#site-header` | N | REMOVE LATER |
| `/reset-password.html` | `reset-password.html` | Firebase password-reset action handler | Platform auth | oobCode | Firebase 12.7.0 modular, own config copy | N (from email) | **INVESTIGATE**: keep until Firebase email action URL is repointed to the platform |
| `/demo/` | `demo/index.html` | Demo Lab catalog (one demo: web-scraping price comparison, empty table until Sheets integration) | Marketing-adjacent | None | `demo/scripts/*`, `css/style.css`, local CSS; links `/images/favicon.*` (404) | Y (services hub) | INVESTIGATE (overlaps `demo.teknoify.com`) |

### 6.2 Dashboard (all platform concern; none reachable from marketing navigation except via post-login redirect)

| Route (`/dashboard/…`) | Purpose | Auth | Notable dependencies / defects | Disposition |
| --- | --- | --- | --- | --- |
| `index.html` | Role router → admin/member; falls back to `/login.html` (404) | requireAuth | `js/lib/auth.js` | MOVE TO PLATFORM → REMOVE LATER (redirect) |
| `admin.html` | Admin panel: users, roles, projects, password reset emails, impersonation | Admin | `js/pages/admin.js` (Firestore `users`, `projects` update/delete), `dashboard/shared/sidebar.js` | MOVE TO PLATFORM |
| `member.html` | Member overview (redesigned 2026-08-28) | Member | `dashboard/shared/{sidebar,member-topbar,app-shell}.js` → Firestore | MOVE TO PLATFORM |
| `premium.html` | Premium panel | Premium/Admin | inline `requireAuth({allowedRoles})` | MOVE TO PLATFORM |
| `analysis.html` | Redirect stub ("Yönlendiriliyor…") | — | none | REMOVE LATER |
| `market-analysis.html` | Market analysis | session-manager | Firebase 9.23 compat | MOVE TO PLATFORM |
| `market-analysis-demo.html` | Demo | — | references `../shared/auth.js`, `config.js`, `../../../css/*` — **none resolve** (CONFIRMED broken) | REMOVE LATER |
| `demo/market-analysis/index.html` | Market analysis demo project | — | `../../../config.js` missing (CONFIRMED) | INVESTIGATE / REMOVE LATER |
| `ai-hub/{agents,models,tools}.html` | AI hub shell pages (phase-2 redesign) | Member | shared shell | MOVE TO PLATFORM |
| `agents/product-discover/index.html` | Product Discover agent UI (95 KB JS) → Cloud Run API | Member + entitlement | `product-discover.js`, Firebase modular | MOVE TO PLATFORM |
| `billing/{usage,invoices}.html`, `developer/{api,docs,webhooks}.html`, `organization/team.html`, `settings/profile.html`, `support/help.html`, `workspace/{projects,history}.html` | Phase-3 shell pages; most render "kaynak bağlı değil" empty states | Member/Admin | `dashboard/shared/phase3.js`, `profile-manager.js` (72 KB) | MOVE TO PLATFORM |
| `bim-istekleri/index.html` | BİM API request console (46 KB) → Cloud Function `teknoify-api` | Entitlement `bim_faz_2` | `dashboard/shared/{auth,request-console}.js`; `../../../css/*` links don't resolve; **`dashboard/shared/auth.js` imports `/dashboard/js/lib/firebase.js`, which does not exist (CONFIRMED)** | MOVE TO PLATFORM / INVESTIGATE (LIKELY broken) |
| `geo-intelligence/index.html` | Map tool over 11.5 MB GeoJSON (Leaflet tiles) | requireAuth | inline module import | MOVE TO PLATFORM |
| `member/finance/index.html` | Personal finance (29 KB HTML, `js/finance.js`, SheetJS from CDN) | Member | Firestore | MOVE TO PLATFORM |
| `member/{health,productivity,subscriptions}/index.html` | Personal tools | Member | reference `../../config.js`, `../../css/dashboard.css` — **missing** (CONFIRMED) | REMOVE LATER (LIKELY broken) |
| `services/investment/index.html` | Investment market dashboard → Render equity API + Cloud Run proxy | Member | `js/pages/investment-market.js` (65 KB) | MOVE TO PLATFORM |
| `web-scraping/quickcommerce/index.html` | Price comparison tool → Cloud Function | Entitlement | Firebase modular inline | MOVE TO PLATFORM |
| `web-scraping/{clothes,food}/index.html` | Same pattern | Entitlement | reference `../shared/auth.js`, `../shared/engine.js` — **missing** (CONFIRMED) | REMOVE LATER (LIKELY broken) |

### 6.3 Non-routed HTML

`domains/**/page.html` (6 files) are governance "mirrors" of `pages/*.html`. They are not linked from anywhere, their relative links (`../css/style.css`, `../index.html`, `rpa.html`) do not resolve from their depth, and the repo's own parity checkers report them as **drifted** from the live pages. Disposition: REMOVE LATER.

---

## 7. Component inventory

There is no component system; "components" are CSS class families plus copy-pasted HTML. Classification:

### Marketing primitives (potentially reusable as *reference*, not as code)

| Element | Where | Assessment |
| --- | --- | --- |
| Header/nav (`.header`, `.navbar`, `.nav-menu`, `.dropdown`, `.hamburger`) | duplicated in 17 HTML files; CSS in `css/04-objects/layout.css` + `css/05-components/contact-modal.css` (mobile rules live in the *contact-modal* file) | Hover-only dropdown; mobile panel toggled by a non-focusable `<div role="button">`; no `aria-expanded`; services submenu unreachable on touch (§11). Not reusable. |
| Hero (`.hero`, `.hero-terminal`, `BackgroundFX`) | `index.html`, `css/05-components/hero-services.css` (29 KB), `js/script.js` | Visually distinctive (terminal + grid). Concept worth keeping as inspiration; implementation is monolithic. |
| Services hub cards (`.service-hub-card--*`, `.teknoify-orbit`) | `index.html`, `hero-services.css` | Good content model (8 services with one-line value props). CSS is bespoke per card modifier. |
| Contact form (`.contact-form`, `CustomSelectSystem`) | `index.html`, `js/script.js`, `css/05-components/contact-modal.css` | Overflows on mobile (§11); posts to a LIKELY dead endpoint; honeypot "ban" writes `tk_access_denied` to localStorage and replaces the whole document with a fake 403. |
| Footer (`.footer`) | duplicated everywhere; `css/05-components/footer.css` | Three social links are `href="#"`. |
| Cookie banner | `js/cookies.js` (homepage only) | Consent gates GA; "Kapat" only hides for the session. |
| Legal page layout | `pages/gizlilik.html` etc. | Plain content; reusable copy. |
| Demo Lab (`demo/`) | `demo/*` | Cleanest code in the repo (data-driven, aria-labelled nav, no auth); still duplicates the shell. |

### Application primitives (platform concern)

`dashboard/shared/sidebar.js` (13 KB), `member-topbar.js`, `app-shell.js` (23 KB), `profile-manager.js` (72 KB), `request-console.js`, `screen-recorder.js` (18 KB, **orphaned**), `phase3.js`, `css/06-pages/dashboard/*`, `css/dashboard.css`, `css/analysis.css`, `dashboard/index.css` (91 `!important`).

### Shared primitives

`.btn`, `.btn-primary/secondary/outline/sm/block`, `.container`, `.page-frame`, form controls (`css/03-elements/forms-buttons.css`), tokens (`tokens.css`), modal (`.modal-overlay`). Minimal, dark-only, no focus-ring system beyond scattered `:focus` rules (26 in `hero-services.css`).

### Legacy components

`js/lib/nav.js` (localStorage "MVP" nav), `js/pages/home.js`, `js/pages/login.js`, `js/lib/storage.js` seed data, `js/pages/dashboard.js` and `js/pages/member.js` (**both orphaned** — no HTML references them; `member.html` was rewired to `app-shell.js` on 2026-08-28), `js/services/exchange-rate-service.js` (orphaned), `js/utils/ids.js` (orphaned), `packages/auth/premium-access.js` (orphaned), `css/05-components/forms.css` and `css/request-control.css` (orphaned), `api/*.js` (orphaned).

### Unknown / coupled

`js/script.js` (38 KB, classic script): `AuthSystem` + `UISystem` + `CustomSelectSystem` + `ContactSystem` + `TerminalEffect` + `BackgroundFX` in one file loaded by every public page. Cannot be partially removed without splitting.

### Evaluation

- Coupling: every marketing page is coupled to Firebase Auth, Firestore, App Check and the dashboard route table through the embedded modal and `script.js`.
- Duplication: header/footer/modal duplicated 14–17×; three Firebase config copies; 440 inline `style=""` attributes; 134 inline `onclick=`/`onchange=`; 18 inline `<style>` blocks; 28 inline `<script>` blocks; 320 `!important`.
- Layout: fixed 72 px header, `max-width` 1200/1400 px containers, per-page ad-hoc grids; breakpoints are inconsistent (968, 900, 980, 760, 768, 767, 576, 560, 520, 480, 420, 390 px all appear).
- Accessibility and responsiveness: see §11–§12.

**Recommendation: C — rebuild the presentation layer substantially.** Preserve the *content* (copy, service taxonomy, legal texts), the *URL contract*, the *brand tokens as a starting point* (indigo accent, dark surfaces, Inter Tight), and the *hosting* (Netlify). Do not carry the CSS or JS forward. Evidence: no component model, auth coupling on every page, three SDK versions, no build pipeline for metadata/images, and the repo's own governance docs already conclude that the current runtime cannot be moved safely. Full rationale and the framework choice are in doc 03 and doc 04.

---

## 8. Asset inventory

| Asset | Format / size | Used by | Belongs to | Verdict |
| --- | --- | --- | --- | --- |
| Logo | None. The "logo" is `<i class="fas fa-cube">` + text | all pages | Marketing | **Missing brand asset** — needs a real logo/wordmark (SVG) |
| Favicon | `images/favicon.png`, `images/favicon.ico` referenced by `index.html` and `demo/index.html` | — | Marketing | **Missing files** (404 live). No `manifest`, no `apple-touch-icon` |
| OpenGraph / social image | None | — | Marketing | Missing |
| `images/projects/map-icon.png` (1.8 MB), `scraper-icon.png` (1.5 MB) | PNG | **CONFIRMED unreferenced** by any HTML/JS/CSS in HEAD (`git grep`) | App | Obsolete; oversized; candidate for removal |
| `assets/images/market-icons/*.svg` (6) | SVG < 2 KB each | investment dashboard | App | Fine, platform-owned |
| `dashboard/geo-intelligence/istanbul-ultimate.geojson` | 11.5 MB | geo dashboard | App | Should not live in a marketing repo |
| `data/stock/turkey/**/reports/*.pdf` (2) | PDF 0.5–0.8 MB | RAG pipeline | Platform | Should not be publicly served |
| Font Awesome 6.5.0 | CDN CSS 102 KB + woff2 | every page | Shared | Replace with inline SVG icon set |
| Google Fonts Inter Tight, Fira Code | CDN | every page | Marketing | Self-host in rebuild |
| Illustrations / screenshots / video | None | — | — | The site has no product imagery at all |

---

## 9. Dependency audit

| Package | Where | Category | Note |
| --- | --- | --- | --- |
| `firebase-admin@^13.7.0` | root `dependencies` | **application-only legacy / misplaced** | Nothing in the website uses it (server SDK). LIKELY intended for `api/chat-log.js` or a function; it drags 185 transitive packages into the lockfile (grpc, google-cloud storage/firestore, protobuf). Removable once `api/` is retired. |
| `stylelint`, `stylelint-config-standard` (`file:tools/…`) | root `devDependencies` | **fake tooling** | Stubs; give false confidence. Replace with real Stylelint or drop. |
| ESLint, Prettier | referenced by scripts, **not declared** | missing dev tooling | Scripts fail on clean install. |
| Firebase JS SDK 9.23.0 / 9.6.1 / 12.7.0 | CDN `<script>`/`import` | application-only legacy | Three versions; ~510 KB compat bundles on the homepage. |
| reCAPTCHA v3 (`www.google.com/recaptcha/api.js`) | homepage + `js/lib/auth.js` (App Check) | application-only | Loads on every homepage visit for anonymous users. |
| Font Awesome 6.5.0 (cdnjs) | every page | marketing-relevant, oversized | Replace. |
| Google Fonts | every page | marketing-relevant | Self-host. |
| ApexCharts, flatpickr, PapaParse, SheetJS/xlsx, xlsx-js-style, highlight.js, Leaflet tiles | dashboard pages (CDN) | application-only | Platform. |
| `express`, `firebase-admin@^12`, `googleapis` | `services/market-data-proxy` | platform service | Separate lockfile inside the repo. |
| FastAPI, yfinance, pypdf, evds (Python) | `services/*`, `scripts/*`, workflows | platform / data pipeline | |
| Analytics: GA4 via gtag | `js/cookies.js` | marketing-relevant | Keep the measurement ID; reimplement consent. |

Abandoned/duplicate risk: `xlsx@0.18.5` (SheetJS CDN build has known unpatched CVEs in old versions), `firebase@9.6.1` (2021) alongside 9.23 and 12.

---

## 10. Legacy application / authentication findings (summary)

Full dependency-oriented removal map: doc 02 §3. Key facts:

- CONFIRMED: **every** public page except `login`, `impersonate`, `unauthorized` and `demo` embeds a login modal and loads Firebase compat + `js/session-manager.js` + `js/script.js`; a successful login redirects into `/dashboard/*.html` via `getDashboardRouteForRole()` (`packages/config/routes.js`).
- CONFIRMED: two parallel auth stacks exist — (a) Firebase Auth + Firestore roles/claims (`js/script.js` `AuthSystem`, `js/session-manager.js`, `js/lib/auth.js`, `dashboard/shared/auth.js`), and (b) an older localStorage "MVP" (`js/pages/login.js`, `js/pages/home.js`, `js/lib/storage.js`, `js/lib/nav.js`) whose `login` import from `js/lib/auth.js` no longer exists as an export (LIKELY broken).
- CONFIRMED: Firestore collections referenced: `users` (17×), `projects` (6×), `entitlements` (4×), `admins` (2×), `project_requests`, `configs`.
- CONFIRMED: admin impersonation is implemented client-side via localStorage keys (`teknoify_impersonate_uid`, `impersonated_user_key`, `impersonated_user_id`) in three different modules.
- CONFIRMED: `dashboard/shared/auth.js` imports a non-existent module path (`/dashboard/js/lib/firebase.js`); the 19 unresolved script/style references reported by the repo's own `check:dashboard-routes` confirm that a large part of `dashboard/` is already non-functional.
- CONFIRMED: `data/entitlements.json` (user-id → project entitlements) is publicly served.

---

## 11. Responsive findings

Measured in the in-app browser against the live site at 375 × 812 (mobile preset, Android UA) and at the pane's desktop width. Screenshots of scrolled positions rendered black in the embedded browser (a compositor artefact of the fixed canvas background), so scrolled evidence below is DOM-measured.

| Finding | Status | Evidence |
| --- | --- | --- |
| Services submenu is **unreachable on touch devices** | **CONFIRMED** | With the mobile panel open, `.dropdown-menu` computed `visibility: hidden; opacity: 0; position: absolute` — it only opens on `.dropdown:hover` (`css/04-objects/layout.css`). The 7 service pages are reachable on mobile only via the hub cards further down the page. |
| Contact form overflows the viewport at 375 px | **CONFIRMED** | `form.contact-form` bounding box right = 510 px, `.form-grid` right = 469 px, inputs right = 384/469 px, while `body { overflow-x: hidden }` clips them — 53 elements exceed the viewport. Users cannot see the right edge of the form. |
| No horizontal page scroll (masked) | CONFIRMED | `scrollWidth` 375 = `clientWidth`, because of `overflow-x: hidden` on `body` (`css/02-generic/base.css`) — this hides rather than fixes overflow. |
| Breakpoint sprawl | CONFIRMED | 87 media queries across 13 distinct max-widths; mobile nav rules live in `contact-modal.css` at 968 px while `nav.css` uses 900 px. |
| Hamburger is a `<div>` | CONFIRMED | `role="button"` but no `tabindex`, `aria-expanded`, or `aria-controls`; not keyboard-operable. Menu panel is `position:absolute` under a fixed 72 px header; no focus trap, no Escape handling. |
| Touch targets under 44 px | CONFIRMED | 24 interactive elements below 44 px on the homepage at 375 px (footer social links 24×24, legal links 13 px tall, service `<select>` 28 px tall, modal close 30×30). |
| Typography | CONFIRMED | Hero `h1` 40 px on mobile (clamp), body 16 px. Reasonable. |
| Fixed/absolute positioning | CONFIRMED | `home.css` uses `position:absolute` in 8 rules for decorative layers; hero terminal fixed-height boxes (`height:300px`, `term-body height:146px`) truncate content. |
| RPA service page at 375 px | CONFIRMED clean | 0 overflowing elements; but same nav defect. |
| Investment analytics page | CONFIRMED heavy | 40 resources, 12 scripts, 2.8 s `loadEventEnd` on desktop from Türkiye-adjacent network; 307 DOM nodes visible at load (rest injected). |
| Tablet / small Android widths | UNVERIFIED (manual) | Not measured beyond 375 px and desktop. |

Architectural blockers for a premium responsive redesign: no shared layout primitives, per-page hand-tuned breakpoints, decorative absolute layers coupled to the hero, and mobile nav behaviour spread across three CSS files and one class in `script.js`.

---

## 12. Accessibility findings

**Confirmed issues**

1. No skip link on any page (`grep` for skip patterns: 0 results; DOM check `false`).
2. Mobile menu trigger is a non-focusable `<div role="button">` without state (`aria-expanded`) or relationship (`aria-controls`).
3. Services dropdown is hover-only: keyboard users cannot open it (no focus-within rule; `.dropdown:hover` only) and it is invisible on touch.
4. Login modal: `aria-hidden="true"` on the overlay is toggled by class only; no `role="dialog"`, no `aria-modal`, no focus trap or focus return; close button is icon-only with `aria-label` (good) but 30×30 px.
5. Inline `onclick` handlers on 134 elements including `<a href="#">` links used as buttons (`toggleResetView`, `sendResetLink`).
6. Homepage contains two `<h1>` in the served HTML (the hero title and the inline "403" template string in the `<head>` script); heading order jumps `h1 → h3` inside the modal.
7. Legal text links in the footer at 13 px height; social links are `href="#"` with icon-only content and no accessible name (`<a href="#">` ×3).
8. The honeypot "ban" replaces `document.documentElement.innerHTML` with a fake 403 page and persists it in `localStorage` (`tk_access_denied`) — a screen-reader user who tabs into the hidden field and types would permanently lock themselves out of the site.
9. Contrast risk: muted text `#9ca3af` on `#050505` passes, but `.phase3-muted` `#858b98` on `#101319` (dashboard) is ~4.1:1 and `.nav-link` muted on translucent header depends on scroll state (needs measurement).
10. `prefers-reduced-motion` is respected by `BackgroundFX` and 8 CSS files, but the `.nav-login-btn::before` conic-gradient rotates forever and is **not** gated.

**Probable issues (need browser/manual verification)**

- Focus visibility: `:focus` rules exist only in component CSS (26 in `hero-services.css`, 9 in `home.css`); no global `:focus-visible` policy in `base.css`.
- Language: all pages `lang="tr"`, but several UI strings are English (`Unauthorized`, `View as`, `Logout`) without `lang` overrides.
- Cookie banner is injected after 1.5 s without `role="dialog"`/`aria-live`; it overlays the CTA area on mobile.
- Custom `<select>` replacement (`CustomSelectSystem`) has keyboard handling but its ARIA pattern was not audited.

**Requires manual verification**: screen-reader flow (NVDA/VoiceOver), Windows High Contrast, 200 % zoom / 320 px reflow, form error announcement (`#contact-error` has no `aria-live`).

Tooling: none exists in the repo. No new stack was introduced; findings come from static analysis and DOM inspection.

---

## 13. SEO findings

| Signal | Status | Evidence |
| --- | --- | --- |
| `<title>` | Present on all 58 pages, pattern `Page | Teknoify` | inventory table |
| Meta description | **Only 2 of 58 pages** (`index.html`, `demo/index.html`) | grep count |
| Canonical | Only `demo/index.html` | grep count |
| OpenGraph / Twitter cards | **None anywhere** | grep count |
| Structured data (JSON-LD) | None | grep count |
| `robots` meta | Only homepage (`index, follow`) | grep |
| `robots.txt` / `sitemap.xml` | **Absent** (live 404) | curl |
| Indexability of app pages | **All dashboard/app/legacy pages are indexable** — no `noindex`, no robots rules, no auth at the HTTP layer. Google can index `/dashboard/admin.html` shells, `/pages/impersonate.html`, `/pages/login.html`, `/data/entitlements.json`, `/docs/*.md`, backend `.py` source. | live probes |
| Duplicate-route risk | High: Netlify Pretty URLs serve both `/pages/rpa.html` and `/pages/rpa`; `/index.html` and `/` both 200; `domains/**/page.html` mirrors are also served (`/domains/corporate-automation/rpa/page.html`) with broken assets. No canonicals to disambiguate. | live probes |
| Headings | Service pages have a single `h1` and an `h2` sub-headline (good); homepage has the inline-script `h1` duplicate. | heading scan |
| Link structure | Homepage nav → 7 services + `/demo/`; footer → 4 legal pages; social links dead. No cross-linking between service pages beyond the shared nav. | HTML |
| Favicon / identity | Missing files. | live 404 |
| Language / hreflang | `lang="tr"` only; no English variant. | HTML |
| Content architecture | Copy is marketing-ready Turkish (e.g. RPA: "İnsan Hatasını Sıfırlayan Dijital İş Gücü"); no blog/resources; pricing page exists but is not linked from nav. | HTML |

Can the current stack support a scalable content/SEO strategy? **No** — metadata, canonicals, sitemaps, OG images and structured data would have to be hand-written into each HTML file. A build step with a metadata layer is required (doc 03 §2).

---

## 14. Performance findings

| Finding | Status | Evidence |
| --- | --- | --- |
| Homepage third-party JS before first paint | CONFIRMED | 5 Firebase compat scripts in `<head>` without `defer`: app 29 KB + auth 132 KB + firestore 339 KB + appcheck 2 KB + functions 8 KB = **~510 KB** (uncompressed sizes measured via `curl`), plus reCAPTCHA (`api.js` + iframe from `www.google.com`, `apis.google.com` ×2, `teknoify-9449c.firebaseapp.com` ×1 observed in the resource timeline). All of this loads for anonymous marketing visitors. |
| CSS delivery | CONFIRMED | `css/style.css` is an `@import` chain: 1 + 8 sequential requests before render (observed in the network log). |
| Fonts | CONFIRMED | Two render-blocking Google Fonts stylesheets; no `font-display` control beyond `display=swap` in the URL; no self-hosting. |
| Icon font | CONFIRMED | Font Awesome full CSS 102 KB + webfonts for ~10 distinct icons on the homepage. |
| First-party JS on homepage | CONFIRMED | `script.js` 38 KB + `session-manager.js` 7 KB + `cookies.js` 3 KB + `routes-global.js`/`routes.js` (module) — small, but the `BackgroundFX` canvas runs a `requestAnimationFrame` loop plus 100+ animated DOM particles. |
| Investment analytics page | CONFIRMED | 149 KB classic script + 5 module bridges + 3 Firebase compat + JSON fetches; 40 requests; 2.8 s load. |
| Resource count | CONFIRMED | Homepage 28 requests across 7 hosts; RPA page 23 requests across 6 hosts. |
| Images | N/A | Practically no images; the two PNGs in `images/` are 1.5–1.8 MB each if ever used. |
| Layout shift risk | LIKELY | Fonts swap; cookie banner injected after 1.5 s; hero terminal types text into fixed-height boxes (bounded). |
| Caching | CONFIRMED | Netlify default `Cache-Control: public,max-age=0,must-revalidate` on everything; assets are cache-busted with ad-hoc `?v=` strings (`?v=services-hub-8`, `?v=20260828`, `?v=phase2`). |
| Build/analysis commands | None exist (no build). |

Legacy application code shipped to marketing visitors: Firebase Auth/Firestore/App Check/Functions SDKs, `session-manager.js`, `AuthSystem`, dashboard route table, reCAPTCHA — on every marketing page.

---

## 15. Quality gates: commands run and results

All commands were run at `24f3044` after `npm ci` (which installed 211 packages and created an untracked `node_modules/`). `npm ci` also rewrote `tools/stylelint/bin/stylelint.js` line endings (LF → CRLF under `core.autocrlf=true`); the file was restored with `git checkout --` so the tree stayed clean.

| Command | Exit | Result |
| --- | --- | --- |
| `npm ci --no-audit --no-fund` | 0 | 211 packages; two deprecation warnings (`node-domexception`, `glob@10`) |
| `npm run lint:js` | **1** | `'eslint' is not recognized` — ESLint is not a dependency |
| `npm run format:check` | **1** | `'prettier' is not recognized` — Prettier is not a dependency |
| `npm run check` | **1** | Fails at `format:check` |
| `npm run lint:css` | 0 | Passes — but it is the brace-balance stub, not Stylelint |
| `npm run check:architecture` | **1** (env) then **1** (real) | First fails on git "dubious ownership"; with `safe.directory` set via `GIT_CONFIG_*` env it runs and reports **FAIL** on CSS manifest parity, corporate service page mirrors, product/funnel mirrors, public page wrapper readiness, and mirror source policy |
| `npm run check:public-mirrors` | **1** | All four mirror parity checks fail (mirrors drifted from `pages/*.html`, e.g. `?v=rpa-quantum-grid-1` cache-busters) |
| `npm run check:dashboard-routes` | 0 | Passes, while reporting "19 linked local script/style references do not resolve from the current static tree" |
| `npm run check:readiness-seal` | **1** | Fails on RPA mirror parity |
| `npm run check:investment-runtime` | 0 | Passes |
| Build | n/a | No build command exists |
| Unit / integration / e2e / a11y / bundle checks | n/a | None exist for the website |

Interpretation: the repository's own governance gates are **red on `main`**, and the basic lint/format gates cannot run at all. None of this blocks production because production has no build step.

### The one non-documentation change in this phase

A minimal `.gitignore` (`node_modules/`, `.env*` except `.env.example`, `.netlify/`, OS/editor files) was added so the audit's `npm ci` step is reproducible without polluting `git status` and to remove the standing risk of committing `node_modules` (which happened once before, see `e3a8ea3`). It changes no runtime behaviour.

---

## 16. Pointers

- Ownership boundary, classification matrix, legacy removal map, production-critical files, known unknowns and the risk register: `02-rebuild-boundaries.md`.
- Information architecture, content model, brand/design foundation: `03-marketing-architecture-proposal.md`.
- Phased plan: `04-phased-implementation-plan.md`.
