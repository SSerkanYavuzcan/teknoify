# 05 — Production Boundary, Deployment Safety & Legacy Application Exit (Phase A.2)

Date: 2026-09-05. Branch: `chore/marketing-rebuild-audit` (continues from Phase A commit `2081ceb`; production baseline `24f3044`).
Evidence labels: **CONFIRMED** / **LIKELY** / **UNVERIFIED**, applied strictly. Where this document corrects Phase A, the correction is stated explicitly.

Ownership decision in force: `teknoify.com` owns only the public marketing website; `platform.teknoify.com` owns the authenticated product. Legacy auth/application code in this repository is scheduled for removal; Git history is its archive.

Nothing in this phase was pushed, merged, or deployed. The prototype below runs locally only.

---

## 1. Revalidated Phase A claims

| # | Claim | Phase A label | Phase A.2 result | Evidence |
| --- | --- | --- | --- | --- |
| 1 | Netlify serves arbitrary repository-root files | CONFIRMED | **CONFIRMED** (re-tested 21 paths) | `200` for `/package.json`, `/package-lock.json`, `/render.yaml`, `/docs/README.md`, `/scripts/update-usd-try-rates.py` (`text/x-python`), `/api/chat.js`, `/services/equity-data-service/app/main.py`, `/dashboard/web-scraping/backend/main.py`, `/dashboard/bim-istekleri/backend/deploy.sh`, `/data/stock/turkey/document-catalog.json`, the Migros Q1 PDF (790 KB), `/domains/corporate-automation/rpa/page.html`, `/tools/stylelint/package.json`, `/eslint.config.js`, `/ARCHITECTURE.md`. Dotfiles are not served: `404` for `/.github/workflows/update-usd-try-rates.yml`, `/.gitignore`, `/.editorconfig`. `/docs/marketing-rebuild/README.md` is `404`, which proves the audit branch is not what production serves. |
| 2 | Representative internal files are public | CONFIRMED | **CONFIRMED**, with a correction of framing | The GitHub repository `SSerkanYavuzcan/teknoify` is **public** (`gh api repos/... → "private": false`). Serving these files from `teknoify.com` therefore does not leak secrets that GitHub already exposes; the problems are attack surface, search indexing of backend source and datasets under the brand domain, and the fact that any future file lands in production automatically. Phase A's risk R-14 wording ("public exposure of internals") stands, with this framing. |
| 3 | Production deploys from `main` | LIKELY | **CONFIRMED (behaviourally)** | The live `/data/currency/usd_try_rates.json` has sha256 `9e7e835b…`, identical to the file at `24f3044` (the Sep 4 bot commit) and different from every earlier commit (`33823c0` `4191fa…`, `65d9362` `7baa1c…`, …). The Netlify site `fancy-klepon-8eac4e.netlify.app` serves a byte-identical `/js/script.js` to `teknoify.com` (`143dd684…`), and PR commit statuses name that site (`netlify/fancy-klepon-8eac4e/deploy-preview`). The *setting* "production branch = main" in the Netlify UI remains UNVERIFIED, but no other configuration produces this observed behaviour. |
| 4 | Pretty URLs post-processing | LIKELY | **CONFIRMED (behaviour); UNVERIFIED (which UI toggle)** | Served `index.html` contains 18 `href='/pages/…'` links and zero `href="pages/….html"` links, while HEAD has the opposite. `/pages/rpa/` → `301` → `/pages/rpa`; `/pages/rpa.html` and `/pages/rpa` both `200` (no `.html` → extensionless redirect); `/demo` → `301` → `/demo/`. This is the documented behaviour of Netlify's HTML post-processing "Pretty URLs". `netlify.toml` now pins `[build.processing.html] pretty_urls = true` so a deploy preview can confirm equivalence. |
| 5 | `api.teknoify.com/submitContactForm` is broken | LIKELY | **CONFIRMED unreachable from this network on three independent client stacks; LIKELY broken globally; UNVERIFIED from a second geography** | DNS resolves to `35.241.42.136` (Google Cloud). OpenSSL 3.2 `s_client`: "unexpected eof while reading", *no peer certificate*. curl/Schannel: handshake failure. Plain HTTP on port 80: "Empty reply" and "Connection was reset". From the same network, another Google-hosted endpoint (`europe-west1-teknoify-9449c.cloudfunctions.net`) completes TLS normally (`404`). A forwarding rule that answers neither 443 nor 80 is a server-side condition, not a local TLS quirk. The in-app browser refused to open the host, so no fourth stack was possible. Second-network verification remains open (U6). |
| 6 | `render.yaml` corresponds to active infrastructure | UNVERIFIED (link to repo) | **CONFIRMED active and CONFIRMED linked to this repository** | GitHub holds 27 deployment records with environment `main - teknoify-equity-data`, one per `main` commit since 2026-07-26 (`73899dc`), including all four September bot commits (`9217475`, `65d9362`, `33823c0`, `24f3044`). That naming is Render's GitHub integration. The service answers at `teknoify-equity-data.onrender.com` (`x-render-origin-server: uvicorn` behind Cloudflare), `/health` → `{"status":"warming_up","ready":false}`, and a repo-defined route `/v1/equities/AAPL` → `503` while warming. **Correction to Phase A doc 02 U5: resolved.** |
| 7 | Bot commits to `main` trigger production deploys | LIKELY | **CONFIRMED** for Netlify (claim 3 evidence: the bot's own commit is what production serves) and **CONFIRMED** for Render (claim 6: a Render deployment per bot commit). Netlify does not post commit statuses for `main` pushes on this repo (status list empty on `24f3044`), so per-deploy timing must be read in the Netlify UI. |

### Additional facts established in this phase

- **Two Netlify sites build from this repository** (CONFIRMED via PR statuses on `76e4bfb`, `82a0d7c`, `fecc6c5`): `fancy-klepon-8eac4e` (= `teknoify.com`) and `teknoify-demo` (= `demo.teknoify.com`; identical title and content hash class). Both have **Deploy Previews enabled** (CONFIRMED: "Deploy Preview ready!" statuses, preview URLs still `200`). The demo site did not exist yet at PR #231 (`e40791e`, only one status context).
- **`demo.teknoify.com` publishes the `demo/` folder as its root** (LIKELY: `/scripts/demo-catalog.js` and `/data/demos.js` are `200` at its root while `/css/style.css`, `/pages/rpa.html`, `/demo/`, `/package.json` are `404`). Because `demo/index.html` links `/css/style.css` absolutely, **`demo.teknoify.com` serves the demo page without the main stylesheet** (CONFIRMED `404` on the linked asset). The same page works at `teknoify.com/demo/`, which the page itself declares canonical.
- **`main` is not protected** (CONFIRMED: `GET /branches/main/protection` → "Branch not protected"; `protected: false`). Direct pushes and bot pushes are unrestricted. `allow_auto_merge` and `delete_branch_on_merge` are off.
- Phase A's "live `js/script.js` is byte-identical" holds modulo line endings: the local checkout uses CRLF (`core.autocrlf=true`), the served file uses LF; content is identical.

---

## 2. Public artifact contract

The production output of `teknoify.com` is a **constructed directory** (`dist/`), never the repository root. Membership follows an allow-list:

1. **Entry pages** listed in `scripts/public-artifact/manifest.json` (`entryPages`).
2. **Transitional pages and files** listed there with a written sunset condition (`transitionalPages`, `transitionalFiles`). They are reported on every build and never appear in the sitemap.
3. **Explicit static files** fetched by JavaScript through variables the crawler cannot follow (`staticFiles`), so every data exposure is a deliberate line in the manifest.
4. **Transitive asset dependencies** of 1–3, discovered structurally: `<link>`, `<script src>`, `<img>`, `srcset`, `<source>`, CSS `@import`/`url()`, ES `import`. Navigation links (`<a href>`, `<form action>`) are **never** followed; they are reported and must be either in the artifact or matched by a `_redirects` rule.
5. **The overlay** `public/` (copied verbatim): `_redirects`, `_headers`, `robots.txt`, `sitemap.xml`, `404.html`.

Everything else is excluded by construction. Additionally, **any** reference from an included file to a forbidden path (prefix, extension, basename, or pattern in `manifest.forbidden`) fails the build, and `verify.mjs` fails on any forbidden file, any file outside `allowedRoots` that is not an overlay file, any forbidden content marker (private-key headers, service-account JSON, `firebase-admin`), a sitemap entry without a file, a redirect shadowed by a real file, or a CSP that omits a host the pages actually load from.

The contract is framework-independent: a future Astro/Next/other build only has to (a) emit its pages into `dist/`, (b) copy `public/` verbatim (Astro does this natively), and (c) keep `verify.mjs` green. The manifest's `entryPages` list becomes the route list in whatever content model replaces it.

Adding a new `.md`, `.py`, JSON dataset, infra config, or developer script to the repository can no longer reach production: it is neither an entry, nor referenced by one, nor in `public/`, and its extension or prefix is forbidden by the verifier as a second line of defence.

---

## 3. Repository path classification

| Path | Class | Enters artifact? | Notes |
| --- | --- | --- | --- |
| `index.html` | PUBLIC WEB ARTIFACT | Yes (entry) | Still contains the legacy login modal (see §6). |
| `pages/{rpa,webscraping,api,ai-assistant,financial-indicators,training-consulting}.html` | PUBLIC WEB ARTIFACT | Yes (entry) | Service pages. |
| `pages/{gizlilik,kvkk,kullanim-sartlari,hizmet-sozlesmesi}.html` | PUBLIC WEB ARTIFACT | Yes (entry) | Legal. |
| `pages/investment-analytics.html`, `pages/subscription.html` | PUBLIC WEB ARTIFACT (investigate) | Yes (entry) | Public today; product/pricing reality open (U8/U9). |
| `pages/investment-retail.html`, `pages/investment-airlines.html` | LEGACY APPLICATION (premium gate) | Yes, **transitional** | Linked from the analytics page; removed when the platform hosts analytics. |
| `reset-password.html` | LEGACY AUTHENTICATION | Yes, **transitional** | See §7. |
| `pages/login.html`, `pages/impersonate.html`, `pages/unauthorized.html` | LEGACY AUTHENTICATION / APPLICATION | No | Redirect / 404 rules in `_redirects`. |
| `demo/**` | PUBLIC WEB ARTIFACT | Yes (entry + deps) | README excluded by pattern. |
| `css/style.css` + 8 imported layer files; `css/{rpa,webscraping,api,ai-assistant,financial-indicators,training-consulting}.css`; `css/06-pages/investment-analytics/*` | PUBLIC WEB ARTIFACT | Yes (dependency) | |
| `css/06-pages/dashboard/**`, `css/06-pages/analysis/**`, `css/dashboard.css`, `css/analysis.css`, `css/investment-analytics.css` (legacy manifest), `css/request-control.css`, `css/05-components/forms.css`, `css/05-components/{buttons,card,modal,nav,table}.css` | LEGACY APPLICATION / orphaned | No (unreferenced) | Not referenced by any entry page. |
| `js/script.js`, `js/cookies.js`, `js/investment-analytics.js` | PUBLIC WEB ARTIFACT (with legacy auth inside `script.js`) | Yes (dependency) | `script.js` must be split in the legacy exit. |
| `js/session-manager.js`, `js/premium-content-gate.js` | LEGACY AUTHENTICATION | Yes, **transitional** | Still `<script src>`-referenced by public pages. |
| `js/lib/**`, `js/pages/**`, `js/impersonate.js`, `js/finance.js`, `js/services/exchange-rate-service.js`, `js/utils/**`, `js/config/**` | LEGACY AUTHENTICATION / APPLICATION | No (forbidden / unreferenced) | |
| `packages/config/routes.js`, `routes-global.js` | PUBLIC WEB ARTIFACT (build input) | Yes (dependency) | Loaded by 15 pages; contains dashboard route strings (harmless strings). |
| `packages/auth/**`, other `packages/*` READMEs | LEGACY AUTHENTICATION / INTERNAL DOCUMENTATION | No (forbidden) | |
| `domains/investment-intelligence/analytics/scripts/**`, `.../styles/index.css` | PUBLIC WEB ARTIFACT (build input) | Yes (dependency) | Bridges loaded by the analytics page. |
| `domains/**/page.html`, `domains/**/README.md` | LEGACY APPLICATION (unrouted mirrors) / INTERNAL DOCUMENTATION | No (forbidden) | |
| `data/currency/usd_try_rates.json`, `data/investment-analytics/supermarket_dataset.json` | DATA (public by decision) | Yes (explicit static) | Fetched by `js/investment-analytics.js`. |
| `data/stock/**`, `data/entitlements.json`, `data/projects.json`, `data/*/README.md` | DATA (internal) / LEGACY APPLICATION | No (forbidden) | |
| `dashboard/**` | LEGACY APPLICATION (+ two Python backends) | No (forbidden) | `/dashboard/*` redirects to the platform. |
| `api/**` | LEGACY APPLICATION (never deployed) | No (forbidden) | `/api/chat` is `404` today. |
| `services/**`, `render.yaml`, `dashboard/*/backend/**` | BACKEND / INFRASTRUCTURE | No (forbidden) | Render link CONFIRMED; move later (§14). |
| `.github/workflows/**` | BACKEND / INFRASTRUCTURE (data pipeline) | No | See §12. |
| `scripts/architecture/**`, `scripts/*stock*`, `scripts/update-usd-try-rates.*` | DEVELOPMENT ONLY / INFRASTRUCTURE | No (forbidden) | |
| `scripts/public-artifact/**` | BUILD INPUT ONLY | No | The builder itself. |
| `public/**` | BUILD INPUT ONLY (overlay) | Yes (copied to root) | |
| `netlify.toml`, `package.json`, `package-lock.json`, `eslint.config.js`, `.prettierrc.json`, `.stylelintrc.json`, `.editorconfig`, `.gitignore`, `tools/**`, `node_modules/` | DEVELOPMENT ONLY | No (forbidden) | |
| `docs/**`, `ARCHITECTURE.md`, `DEVELOPMENT.md`, `CHANGELOG.md`, `apps/**`, `_archive/**` | INTERNAL DOCUMENTATION | No (forbidden) | |
| `images/projects/*.png` (1.5–1.8 MB), `assets/images/market-icons/*.svg` | UNKNOWN / LEGACY APPLICATION | No (unreferenced) | Allowed roots exist for `images/` and `assets/` so future favicons/OG images can be referenced. |
| `requirements-rag.txt`, `.prettierignore` | DEVELOPMENT ONLY | No | |

---

## 4. The Netlify boundary

Current: `repository root → Netlify`. Target: `repository (build inputs) → dist/ (constructed) → Netlify`.

**Smallest safe transition, chosen on evidence**

- No files move and no URLs change: the builder copies files to the same relative paths, so the URL contract is untouched and Pretty URLs continue to apply.
- The mechanism is a zero-dependency Node script (`scripts/public-artifact/build.mjs`) rather than a framework, a shell script, or a Netlify plugin, because: Node is already the declared toolchain (`package.json`), Netlify runs `npm install` on every build regardless, the script is deterministic (artifact hash identical across runs), it runs on Windows and Linux, and the same manifest can drive a future framework's page list.
- Alternatives rejected: (a) changing the Netlify publish directory to a subfolder would require moving every runtime file (the exact operation the repo's own governance corpus spent 16 phases failing to make safe); (b) a `_redirects` deny-list (`/docs/* 404` …) leaves the root published and must be maintained forever; (c) Netlify's "ignore" or build-hook tricks change nothing about what is published.
- `netlify.toml` now declares `command = "npm run check:public"`, `publish = "dist"`, Node 20, and pins post-processing (`pretty_urls = true`, no bundling/minification/image compression) so link rewriting is versioned. Redirects and headers live as files in `public/` so a framework that copies `public/` verbatim inherits them.

**Why this is not yet safe to merge (blocker)**: `netlify.toml` applies to every Netlify site that builds from the repository root. The second site `teknoify-demo` LIKELY has base directory `demo/`; if Netlify resolves the root `netlify.toml` for it, its publish directory would become `demo/dist` (non-existent) and its deploys would fail. This must be verified in the Netlify UI (site *teknoify-demo → Build & deploy → base directory*), and one of these done first: retire the demo site in favour of `teknoify.com/demo/` (recommended: it is the declared canonical and the demo site is currently unstyled), or point `demo.teknoify.com` at a redirect, or give the demo site its own `demo/netlify.toml`. See §12/§15.

---

## 5. Preserving the current marketing site from the artifact

`npm run check:public` builds and verifies `dist/` locally: **76 files, 872 954 bytes, artifact hash `c4d730d5…`**, deterministic across two consecutive builds. Contents: 14 entry pages, 3 transitional pages, 2 transitional scripts, 49 dependency files (CSS layers, page CSS, `script.js`, `cookies.js`, `investment-analytics.js`, 10 investment bridge modules and their style manifest, `packages/config/routes*.js`, demo scripts/styles), 2 explicit data files, 5 overlay files. Full inventory with per-file sha256 and referrers: `.artifact-report.json` (git-ignored).

Local serving (`python -m http.server` on `dist/`, in-app browser): `/`, `/pages/rpa.html`, `/pages/investment-analytics.html`, `/demo/`, `/404.html` all render with **zero failed same-origin requests** (14, 14, 35 and 18 local requests respectively), no console errors, hero, 8 service cards and demo cards present. External CDN resources (Firebase, Font Awesome, Google Fonts, reCAPTCHA) load exactly as on production because the HTML is unchanged.

Known, pre-existing defects carried into the artifact on purpose (the artifact reproduces the site; it does not fix it): `images/favicon.png`/`.ico` referenced but absent (already `404` in production); `js/investment-analytics.js` posts to `/api/chat` and `/api/chat-log` (already `404` in production); `demo/index.html` links `/pages/login.html`, now answered by a redirect rule instead of a legacy login page.

Behavioural differences versus production root publishing, all intentional: `/dashboard/*`, `/login.html`, `/pages/login(.html)` → `302` to `https://platform.teknoify.com/`; `/pages/impersonate*`, `/pages/unauthorized*`, `/domains/*` → `404`; every internal/backend/doc/data path → `404`; new security headers and report-only CSP; `robots.txt`, `sitemap.xml`, branded `404.html`. **Consequence for existing users**: anyone who logs in through the legacy modal on a marketing page is redirected by `script.js` to `/dashboard/*.html`, which the artifact answers with a `302` to the platform root. Whether the platform can receive those users (same Firebase project? U3) must be settled before merge; until then the modal keeps "working" only in the sense that it authenticates and then lands on the platform home page.

---

## 6. Legacy auth / application dependency map with exit classification

Classes: **SAFE TO REMOVE AFTER PUBLIC BOUNDARY** (S) · **NEEDS URL REDIRECT FIRST** (R) · **NEEDS EXTERNAL CONFIG MIGRATION FIRST** (X) · **NEEDS INVESTIGATION** (I) · **ALREADY DEAD / ORPHANED** (D).

| Item | Depends on | Depended on by | Class | Note |
| --- | --- | --- | --- | --- |
| `dashboard/**` (32 HTML + shared scripts + CSS + GeoJSON) | Firebase SDK 9.23, `js/lib/*`, `packages/auth`, Cloud Functions/Run/Render APIs | post-login redirects from `script.js`, `routes.js` constants | **R** (rule in place in `_redirects`; final targets TBD) then S | Already outside the artifact. Files can be deleted once the redirect targets are agreed with the platform (U3/U10). |
| `dashboard/*/backend/**` (Python) | gcloud | nothing in the site | S (repo hygiene) / X (Cloud Functions source of truth) | Copy to the platform/infra repo before deleting if they are still the deployed source. |
| `js/lib/{firebase,auth,data,storage,nav}.js`, `packages/auth/*` | Firebase 9.23 modular | `dashboard/**`, `pages/login.html` (broken) | S | Only dashboard/MVP consumers. |
| `js/pages/{admin,dashboard,member,login,home,unauthorized,investment-market,common}.js`, `js/impersonate.js`, `js/finance.js`, `js/utils/*`, `js/config/*`, `js/services/exchange-rate-service.js` | as above | dashboard pages; several have **no referrer at all** | **D** (`js/pages/dashboard.js`, `js/pages/member.js`, `exchange-rate-service.js`, `js/utils/ids.js`, `packages/auth/premium-access.js`, `dashboard/shared/screen-recorder.js`, `css/05-components/forms.css`, `css/request-control.css`) / S (rest) | |
| `pages/login.html` + `js/pages/login.js` (localStorage MVP) | `js/lib/auth.js` `login` export (no longer exists) | `demo/index.html` footer link | **D** functionally, **R** for the URL (rule in place) | LIKELY broken since the Firebase migration. |
| `pages/impersonate.html`, `pages/unauthorized.html` | localStorage keys, `../css/style.css` | admin flow | **R** (404 rules in place) then S | Page text admits "backend'siz, gerçek güvenlik sağlamaz". |
| `api/chat.js`, `api/chat-log.js` | `firebase-admin` (root dependency) | `js/investment-analytics.js` (calls fail `404` already) | **D** | Removing also removes `firebase-admin` and 185 lockfile packages. |
| Login modal markup (`#loginModal`, `.trigger-login`) in `index.html` + 14 `pages/*.html` | `AuthSystem` in `js/script.js`, Firebase compat `<script>` tags (9.23.0 / 9.6.1), reCAPTCHA `api.js` on `index.html` | nothing else | **I → S** | Removal is an HTML/JS edit on every public page: replace with a "Giriş Yap" link to the platform. Needs U3 (are marketing-site users platform users?) answered first, otherwise the link leads to a product they cannot enter. |
| `AuthSystem`, `firebaseConfig`, `appCheck` init in `js/script.js` | Firebase compat globals | `UISystem`/`ContactSystem`/`BackgroundFX` share the file | **I → S** | Split the file: keep nav, contact, FX; drop auth. `firebase` global checks are already guarded (`typeof firebase !== 'undefined'`), so removing the SDK tags does not throw. |
| `js/session-manager.js` | Firebase compat | `<script src>` on 15 public pages; `new SessionManager()` used only by `dashboard/market-analysis.html` | **S** (after removing the tag from each page) | Transitional file in the artifact. |
| `js/premium-content-gate.js` + `pages/investment-{retail,airlines}.html` + `[data-premium-*]` markup on the analytics page | Firebase compat auth + Firestore `users.role` / claims | `pages/subscription.html` CTAs | **I** (platform hosts analytics?) then **R** (301 to platform analytics or to `/pages/investment-analytics`) | Transitional in the artifact; excluded from sitemap; disallowed in robots. |
| `reset-password.html` | Firebase 12.7.0 modular, own config copy, `?oobCode=`; hotlinks `i.imgur.com/Hjo9r3b.png` | Firebase Auth password-reset e-mails (LIKELY; U4) | **X** | See §7. |
| `packages/config/routes.js` `DASHBOARD_ROUTES`, `getDashboardRouteForRole()` | — | `js/lib/auth.js`, `js/script.js` redirect fallbacks, `routes-global.js` | S after the modal removal | Keep `PUBLIC_ROUTES`, `PRODUCT_ROUTES`, `LEGAL_ROUTES`, `INVESTMENT_ROUTES` as the URL-contract source until Phase B replaces them. |
| Browser storage keys: `session_start_time`, `impersonated_user_key`, `impersonated_user_id`, `teknoify_impersonate_uid`, `tk_access_denied`, `tk_last_success`, `tk_visitor_id`, `teknoify_projects`, `teknoify_entitlements`, `teknoify_seeded_v2`, `teknoify_sidebar_collapsed`; sessionStorage `tk_post_login_redirect` | — | legacy code above | S, with a one-time cleanup snippet shipped in the new shell (`tk_access_denied` locks users out of the whole site) | Keep only `teknoify_cookie_consent`. |
| Firebase project `teknoify-9449c` config (4 copies), App Check site key, reCAPTCHA v3 tag | — | all of the above | **X** (config lives in Firebase/Google consoles; only *references* are removed here) | Do not rotate or change from this repo. |
| `data/entitlements.json`, `data/projects.json` | — | `js/lib/storage.js` (MVP seed) | **D** | Already outside the artifact. |
| `services/**`, `render.yaml`, `.github/workflows/**`, `data/stock/**`, `scripts/*` data tooling | Render (CONFIRMED linked), GitHub secrets | `pages/investment-analytics.html` reads `data/currency/usd_try_rates.json` | **X** (Render/GitHub re-link) — PLATFORM CONCERN, FUTURE MIGRATION | §12 and §14. |
| Governance skeleton: `apps/`, `domains/**/page.html`, `packages/*` READMEs, `_archive/`, `scripts/architecture/**`, 35 phase docs | — | `npm run check:*` scripts (red on `main`) | S | Keep ADR-0001 and the docs as history; delete the checkers and mirrors. |

Removal order that respects the classes: (1) merge the public boundary (§15); (2) delete everything marked **D** and **S** that has no page reference (dashboard tree, `js/lib`, `js/pages`, `api/`, dead CSS, governance checkers/mirrors, `firebase-admin`); (3) answer U3, then remove the modal, `session-manager.js`, Firebase/reCAPTCHA tags and split `script.js` (**I → S**); (4) resolve **X** items (reset-password action URL, Render/workflow relocation) and then delete their files; (5) resolve premium/analytics ownership and retire the transitional pages with 301s.

---

## 7. `reset-password.html` and other auth URLs

What may generate links to marketing-site auth URLs today:

| Source | Status | Handling |
| --- | --- | --- |
| Firebase Auth e-mail templates ("customize action URL") for password reset / e-mail verification | **UNVERIFIED** (Firebase console). The page reads `?oobCode=` and calls `confirmPasswordReset`, and `js/pages/admin.js` calls `sendPasswordResetEmail`, so the template LIKELY points at `https://teknoify.com/reset-password.html`. | Keep the page **transitional** in the artifact (it is self-contained: one inline module + Firebase 12.7 from CDN). Sunset when the platform owns the handler. |
| Already-sent e-mails | Firebase action codes expire (default one hour for password reset), so the tail is short. | A short migration window after the platform switch suffices. |
| Bookmarks / search index | `reset-password.html` has no `noindex`; it is now `Disallow`ed in `robots.txt` and excluded from the sitemap; GSC coverage is UNVERIFIED (U7). | After migration: `301 /reset-password.html https://platform.teknoify.com/<handler>?:query` (Netlify passes query strings through, so `oobCode` survives). |
| `/pages/login.html`, `/login.html` (dead redirect target from `dashboard/index.html`) | `/login.html` is `404` in production today. | `302` to the platform root now; permanent target once the platform sign-in URL is fixed (PLATFORM TARGET TBD). |
| `/dashboard/*` bookmarks and post-login redirects | Live and indexable today. | `302` to the platform root now (§5). |

Platform-side migration that will eventually be required (documented, not implemented, not this repository's work): host an auth action handler on `platform.teknoify.com` for `mode=resetPassword|verifyEmail|recoverEmail` using the platform's Firebase project; change the Firebase Auth e-mail template action URL to it; add the platform domain to Firebase authorised domains; then tell this repository to switch the transitional page to a `301`. No Firebase configuration is changed from here.

---

## 8. URL contract matrix

Categories: **Marketing — keep** · **Marketing — rebuild** · **Platform — redirect** · **Retire** · **Investigate**. "Now" = status in the prototype artifact (this branch). "Production today" = root publishing on `main`.

| Current URL | Purpose | Production today | Category | Future owner | Now (artifact) | Final action / target | HTTP | Dependency |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | Homepage | 200 | Marketing — rebuild | marketing | served | keep URL | 200 | — |
| `/index.html` | duplicate of `/` | 200 | Marketing — keep | marketing | served | canonical to `/` (Phase B) | 200/301 | canonical decision |
| `/pages/rpa`, `/pages/webscraping`, `/pages/api`, `/pages/ai-assistant`, `/pages/training-consulting` (+ `.html`) | Service pages | 200 both forms | Marketing — rebuild | marketing | served | 301 to new slugs in Phase G (`/services/...`) | 200 → 301 | URL contract freeze |
| `/pages/financial-indicators` (+ `.html`) | Service page | 200 | Investigate (U9) | marketing | served | keep or fold into investment | 200 | product decision |
| `/pages/investment-analytics` (+ `.html`) | Hybrid landing + calculators + chatbot | 200 | Investigate (split) | marketing (landing) / platform (tools) | served | landing stays; interactive parts move | 200 | platform hosts analytics |
| `/pages/investment-retail`, `/pages/investment-airlines` (+ `.html`) | Premium-gated previews | 200 | Platform — redirect | platform | served (transitional, noindex via robots) | 301 → PLATFORM TARGET TBD | 200 → 301 | platform analytics |
| `/pages/subscription` (+ `.html`) | Pricing (₺199/mo Premium) | 200 | Investigate (U8) | marketing | served | `/pricing` or retire | 200 | pricing reality |
| `/pages/gizlilik`, `/pages/kvkk`, `/pages/kullanim-sartlari`, `/pages/hizmet-sozlesmesi` (+ `.html`) | Legal | 200 | Marketing — keep | marketing | served | 301 to `/legal/...` in Phase G | 200 → 301 | — |
| `/demo/` | Demo Lab | 200 (also `demo.teknoify.com`) | Marketing — keep (Investigate U2) | marketing | served | keep; make `demo.teknoify.com` redirect here | 200 | Netlify demo site decision |
| `/demo` | no slash | 301 → `/demo/` | Marketing — keep | marketing | Netlify default | same | 301 | — |
| `/reset-password.html` | Firebase reset handler | 200 | Platform — redirect | platform | served (transitional) | 301 → platform handler, query preserved | 200 → 301 | Firebase action URL (U4) |
| `/pages/login`, `/pages/login.html` | Legacy MVP login | 200 | Platform — redirect | platform | 302 → `https://platform.teknoify.com/` | permanent sign-in URL | 302 → 301 | PLATFORM TARGET TBD |
| `/login.html` | Dead fallback target | 404 | Platform — redirect | platform | 302 → platform root | same | 302 → 301 | — |
| `/pages/impersonate(.html)`, `/pages/unauthorized(.html)` | Admin tool / denied page | 200 | Retire | — | 404 | 404 (or 410) | 404 | — |
| `/dashboard/`, `/dashboard/index.html`, `/dashboard/admin(.html)`, `/dashboard/member.html`, `/dashboard/premium.html`, `/dashboard/analysis.html`, `/dashboard/market-analysis(-demo).html` | Authenticated app | 200 | Platform — redirect | platform | 302 → platform root | PLATFORM TARGET TBD per route | 302 → 301 | U3, U10 |
| `/dashboard/ai-hub/*`, `/dashboard/billing/*`, `/dashboard/developer/*`, `/dashboard/organization/*`, `/dashboard/settings/*`, `/dashboard/support/*`, `/dashboard/workspace/*` | Phase-2/3 shell pages | 200 | Platform — redirect | platform | 302 → platform root | same | 302 → 301 | same |
| `/dashboard/agents/product-discover/`, `/dashboard/bim-istekleri/`, `/dashboard/geo-intelligence/`, `/dashboard/web-scraping/{quickcommerce,clothes,food}/`, `/dashboard/services/investment/`, `/dashboard/member/{finance,health,productivity,subscriptions}/`, `/dashboard/demo/market-analysis/` | Tools (several already broken) | 200 (some non-functional) | Platform — redirect | platform | 302 → platform root | per-tool deep links TBD | 302 → 301 | same |
| `/dashboard/bim-istekleri/backend/*`, `/dashboard/web-scraping/backend/*` | Python source | 200 | Retire (from web) | infra | 404 | 404 | 404 | copy source to infra repo first |
| `/domains/**/page.html` | Unrouted mirrors | 200 | Retire | — | 404 | 404 | 404 | — |
| `/api/chat`, `/api/chat-log` | Never deployed | 404 | Retire | — | 404 | 404 | 404 | analytics page still calls them |
| `/data/currency/usd_try_rates.json`, `/data/investment-analytics/supermarket_dataset.json` | Data for analytics page | 200 | Marketing — keep (until analytics moves) | marketing → platform | served | move with analytics | 200 | workflow relocation |
| `/data/**` (everything else), `/docs/**`, `/scripts/**`, `/services/**`, `/tools/**`, `/apps/**`, `/packages/auth/**`, `/package.json`, `/package-lock.json`, `/render.yaml`, `/eslint.config.js`, `/ARCHITECTURE.md`, `/DEVELOPMENT.md`, `/CHANGELOG.md`, `/requirements-rag.txt` | Repository internals | 200 | Retire (from web) | — | 404 | 404 | 404 | — |
| `/packages/config/routes.js`, `/packages/config/routes-global.js`, `/domains/investment-intelligence/analytics/**` | Runtime modules | 200 | Marketing — keep (build input) | marketing | served | fold into the new build | 200 | Phase D |
| `/css/**`, `/js/**` (referenced subset) | Assets | 200 | Marketing — rebuild | marketing | served subset | replaced by hashed assets | 200 | Phase D |
| `/css/06-pages/dashboard/**`, `/css/06-pages/analysis/**`, `/js/lib/**`, `/js/pages/**`, other unreferenced JS/CSS | Legacy assets | 200 | Retire | — | 404 | 404 | 404 | — |
| `https://www.teknoify.com/*` | www alias | 301 → apex (UI) | Marketing — keep | marketing | codified `301!` | same | 301 | — |
| `/robots.txt`, `/sitemap.xml`, `/404.html` | Site plumbing | 404 | Marketing — keep | marketing | served | keep | 200 | — |

---

## 9. Netlify configuration as code

| Setting | Codified? | Where | Manual verification still required |
| --- | --- | --- | --- |
| Build command | Yes | `netlify.toml` `[build] command = "npm run check:public"` | Confirm the UI has no conflicting command (toml wins, but confirm) |
| Publish directory | Yes | `publish = "dist"` | Same |
| Node runtime | Yes | `NODE_VERSION = "20"` | Netlify's default for this site is unknown; toml pins it |
| Production branch | **No** (not expressible in toml) | — | UI: Site → Build & deploy → Branches. Expected `main` (behaviourally CONFIRMED) |
| Deploy Previews | **No** (UI) | — | CONFIRMED enabled on both sites via PR statuses |
| Pretty URLs / post-processing | Yes | `[build.processing.html] pretty_urls = true`, bundling/minify/image compression off | Confirm a deploy preview rewrites links exactly as production does |
| Redirects | Yes | `public/_redirects` → `dist/_redirects` | www → apex rule duplicates the UI domain setting; harmless |
| Headers, CSP (report-only) | Yes | `public/_headers` | Watch for Netlify's own HSTS header duplication (it sets HSTS when "HTTPS enforce" is on; two identical headers are tolerated but should be reconciled) |
| 404 page | Yes | `public/404.html` (Netlify picks `404.html` at publish root automatically) | — |
| Caching | Default for pages; `/data/*` 5-minute revalidate | `_headers` | Hashed asset caching is a Phase D concern |
| Environment variables | None needed | — | Confirm the UI defines none that a build would rely on |
| Domain / DNS / TLS | **No** (UI/DNS) | — | `teknoify.com`, `www`, `demo`, `platform` records; certificate provider |
| Second site `teknoify-demo` | **Not addressed by this toml** | — | **Blocker**: confirm base directory and decide its future before merging (§4) |
| Netlify Forms | No | — | Not used; the contact form posts to `api.teknoify.com` |

---

## 10. Security-header strategy

Now (in `public/_headers`): `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, a conservative `Permissions-Policy`, `Strict-Transport-Security: max-age=31536000` (no `includeSubDomains`: `api.teknoify.com` is broken and `demo`/`platform` are separate sites; no `preload`), and a **report-only** CSP whose host list is generated from the build's external-resource inventory: `www.gstatic.com`, `www.google.com`, `apis.google.com`, `www.googletagmanager.com`, `cdnjs.cloudflare.com`, `fonts.googleapis.com`, `fonts.gstatic.com`, `*.googleapis.com` and `teknoify-9449c.firebaseapp.com` (Firebase/App Check/reCAPTCHA), `*.google-analytics.com`, `api.teknoify.com`, and `i.imgur.com` (hotlinked only by the transitional `reset-password.html`). `'unsafe-inline'` is unavoidable today: 28 inline `<script>` blocks and 134 inline event handlers. `verify.mjs` fails the build if a page loads a resource from a host the CSP omits, so the policy cannot silently drift from reality.

After the legacy-auth exit the policy collapses to: `default-src 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self'; font-src 'self'; img-src 'self' data: https://*.google-analytics.com; connect-src 'self' https://*.google-analytics.com <contact endpoint>; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'` with self-hosted fonts and inline SVG icons, and nonces for any remaining inline script once a build step renders HTML. Switch from report-only to enforcing only after a full week of clean previews; Netlify does not collect CSP reports, so a `report-to` endpoint is a Phase I item.

---

## 11. robots.txt, sitemap.xml, 404.html

- `robots.txt`: allow all; `Disallow` only paths that redirect to the platform or are transitional/gated (`/dashboard/`, `/pages/login`, `/pages/impersonate`, `/pages/unauthorized`, `/pages/investment-retail`, `/pages/investment-airlines`, `/reset-password`); `Sitemap:` line. Internal paths are *not* listed because they no longer exist (listing them would advertise them). `verify.mjs` warns if a `Disallow` names an internal path.
- `sitemap.xml`: the 13 public marketing URLs only (home, 6 services, investment landing, `/demo/`, 4 legal). Extensionless form, matching what Netlify emits today; canonical form is a Phase B decision. `verify.mjs` fails if a `<loc>` has no file, points at a transitional page, or at `404.html`.
- `404.html`: self-contained (no external requests), Turkish, `noindex`, links to `/` and `/#contact`. Netlify serves it for every unmatched path, including the retired internal URLs.

---

## 12. Generated-data workflows (bot commits)

| Workflow | Writes | Why | Consumed by the marketing site? | Belongs to marketing? | Triggers deploys | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `update-usd-try-rates.yml` (cron `0 6 1-7 * *` + dispatch; `scripts/update-usd-try-rates.py`; the `.mjs` twin is marked deprecated in its header) | `data/currency/usd_try_rates.json` (99 KB, TCMB EVDS series `TP.DK.USD.A.YTL`) | Feeds the investment analytics page's USD/TRY conversions | **Yes**: `js/investment-analytics.js` fetches it (and the orphaned `exchange-rate-service.js`) | No — it is investment-product data | **CONFIRMED**: Netlify (content proof) and Render (deployment record) on every commit | **PLATFORM CONCERN — FUTURE MIGRATION** |
| `extract-stock-document-text.yml` (dispatch only; `scripts/extract-stock-document-text.py`) | `data/stock/turkey/extracted-text/*.json`, `text-extraction-catalog.json` | RAG corpus for the future finance chatbot | No | No | Same when run | **PLATFORM CONCERN — FUTURE MIGRATION** |

Interim behaviour with the artifact: the rates file is an explicit `staticFiles` entry, so bot commits keep updating production data and keep triggering Netlify builds (now a real build, roughly a minute plus `npm install` of `firebase-admin`'s 186 packages until that dependency is removed). Nothing is disabled. When the analytics tools move to the platform, the workflow, the scripts, `data/currency/`, and the TCMB secret move with them and bot commits to this repository stop.

---

## 13. Deployment safeguards: what must be true before substantial implementation

| Safeguard | Status | Action |
| --- | --- | --- |
| Branch protection on `main` (PR required, no direct push, required checks) | **CONFIRMED absent** | Enable in GitHub; require `check:public` once a CI workflow exists. The bot workflows need a PAT/app with bypass or must switch to PR-based updates. |
| Deploy Previews | **CONFIRMED enabled** (both sites) | Keep; review every PR at 375/768/1440 widths. |
| Production branch = `main` | Behaviourally CONFIRMED; UI setting UNVERIFIED | Read and record in `docs/deployment/netlify.md`. |
| Required checks | None exist | Add a GitHub Actions workflow running `npm run check:public` on PRs (Phase D at the latest; can be added with the boundary PR). |
| Bot behaviour | CONFIRMED: two workflows push to `main` and deploy production | Accept for now (data is served); relocate later (§12). |
| Rollback | Netlify keeps previous deploys; "publish deploy" in the UI restores instantly; Git revert of `netlify.toml` restores root publishing | Document the two-step rollback (§16) and rehearse on the first boundary deploy. |
| Deployment history | Netlify UI only (no commit statuses for `main`); Render history in GitHub deployments | Record the Netlify deploy ID of the last root-published build before switching. |
| Second Netlify site | CONFIRMED exists; base dir LIKELY `demo/`; currently unstyled | Decide and configure before merging `netlify.toml` (§4). |
| Repository visibility | CONFIRMED public | Keep in mind for everything committed; no secrets, and no expectation that "not served" means "not visible". |

---

## 14. Remaining unknowns (updated from doc 02 §5)

| # | Unknown | Status after A.2 |
| --- | --- | --- |
| U1 | Netlify site settings | Partially resolved: site id `fancy-klepon-8eac4e`, previews on, root publish, Pretty URLs behaviour. Still UNVERIFIED: production branch setting, env vars, deploy hooks, "HTTPS enforce"/HSTS source. |
| U2 | `demo.teknoify.com` | Resolved as LIKELY: Netlify site `teknoify-demo`, publishes `demo/`, unstyled. Decision needed (retire or redirect). |
| U3 | Shared Firebase project with the platform? | Open. Gates the modal removal and the meaning of the `/dashboard/*` redirect. |
| U4 | Firebase reset action URL | Open (console). |
| U5 | Render link | **Resolved: CONFIRMED linked to this repo, auto-deploys every `main` commit.** |
| U6 | `api.teknoify.com` from another network | Open; evidence now strongly indicates a dead endpoint. |
| U7 | Indexed URLs (GSC) | Open. |
| U8 | Subscription plans real? | Open. |
| U9 | Active offerings | Open. |
| U10 | Dashboard user counts / tools in use | Open. |
| U11 | Branch protection | **Resolved: none.** |
| U12 | GA property | Open. |
| U13 (new) | Does Netlify apply the root `netlify.toml` to the `teknoify-demo` site given its base directory? | Open; blocks the merge. |
| U14 (new) | Does the Netlify UI for `fancy-klepon-8eac4e` define a build command or env vars that the toml would now override? | Open. |

---

## 15. Rollout plan for the boundary (when the blockers clear)

1. Netlify UI: record current settings of both sites; resolve U13/U14; note the current production deploy ID.
2. Decide `teknoify-demo`: recommended retire the site and make `demo.teknoify.com` a Netlify domain-level redirect to `https://teknoify.com/demo/` (or DNS CNAME to the main site with a `_redirects` rule `https://demo.teknoify.com/* https://teknoify.com/demo/:splat 301!`).
3. Open the PR from `chore/marketing-rebuild-audit`; the Deploy Preview will build with `netlify.toml` for the first time. Verify on the preview: all 13 sitemap URLs `200`; `/dashboard/admin.html` `302` to the platform; `/package.json`, `/docs/README.md`, `/render.yaml` `404`; headers present; links rewritten like production; the investment page loads its two data files; the contact form behaviour is unchanged (still dependent on `api.teknoify.com`).
4. Merge during low-traffic hours; watch the production deploy log for `verify.mjs` output.
5. Post-deploy probes (the same list as step 3 against `teknoify.com`), plus `curl -I https://www.teknoify.com/`.
6. Keep root publishing recoverable for one week (§16); then proceed to legacy deletions (§6 order).

## 16. Rollback plan

- **Instant (Netlify UI)**: Deploys → select the last root-published deploy → "Publish deploy". No Git change; production returns to the previous state within seconds.
- **Git**: revert the boundary merge commit (removes `netlify.toml`, `public/`, builder). Netlify falls back to UI settings (root publish). Bot commits will continue to deploy either state.
- Redirect rules live only in the artifact, so a rollback also restores the legacy dashboard URLs; nothing external needs to change.
- Rollback does **not** undo any Firebase/Render/DNS change, which is why none is made in this phase.

## 17. Git history as the legacy archive

- `24f3044` (2026-09-04, `main`) is the last commit that is exactly what production serves today and contains the complete legacy application. `2081ceb` adds only Phase A docs.
- Recommendation: create the annotated tag `legacy-marketing-app-before-separation` on `24f3044` in the same PR that performs the first legacy deletion (not now; a tag today would only duplicate `main`). Tags are cheap but must be pushed to be useful; pushing is outside this phase.
- Recoverability is CONFIRMED by construction: every file scheduled for removal is present at `24f3044` and the repository is public on GitHub.

---

## 18. End-of-phase decisions

**A. Can Netlify safely stop publishing the repository root?** — **Not yet.** The artifact and its guards are implemented and validated locally, but two external facts block a merge: the `teknoify-demo` site's base-directory interaction with a root `netlify.toml` (U13), and whether the UI defines conflicting build settings or env vars (U14). Both are single UI look-ups.

**B. What exact artifact replaces it?** — `dist/`, produced by `npm run check:public`: entry pages + declared transitional pages + declared static data + their transitively referenced assets + the `public/` overlay, verified against forbidden prefixes/extensions/basenames/content markers, allowed roots, required files, sitemap/redirect/header consistency, and a CSP that must cover every host the pages load from. 76 files, 873 KB, deterministic.

**C. Can the current legitimate marketing site be preserved from that artifact?** — **Yes.** All 14 public pages and their assets render locally with zero missing same-origin resources and no console errors; the HTML is unchanged, so external resources behave as in production. The only behavioural changes are the intended ones (legacy URLs redirect or 404; internals are absent; headers and site plumbing are added).

**D. Which legacy application/auth systems can be removed next?** — In order: (1) files with no page reference at all: `dashboard/**` (after confirming the interim redirect is acceptable to the platform), `js/lib/**`, `js/pages/**`, `js/impersonate.js`, `js/finance.js`, `js/utils/**`, `js/config/**`, `js/services/**`, `api/**` + `firebase-admin`, dashboard/analysis CSS trees, `css/investment-analytics.css`, `css/request-control.css`, `css/05-components/{forms,buttons,card,modal,nav,table}.css`, `packages/auth/**`, `domains/**/page.html`, `scripts/architecture/**`, `data/entitlements.json`, `data/projects.json`, `pages/{login,impersonate,unauthorized}.html`; (2) after U3: the login modal on 15 pages, Firebase/reCAPTCHA tags, `js/session-manager.js`, and the auth half of `js/script.js`; (3) after ownership of investment analytics: `js/premium-content-gate.js`, `pages/investment-{retail,airlines}.html`; (4) after U4: `reset-password.html`; (5) after Render/GitHub re-link: `services/**`, `render.yaml`, `dashboard/*/backend`, workflows, `data/stock/**`.

**E. Which legacy URLs require redirects or migration handling?** — `/dashboard/*` (302 now, per-route targets TBD), `/pages/login(.html)` and `/login.html` (302 now), `/pages/impersonate*` and `/pages/unauthorized*` (404 now), `/domains/*` (404 now), `/reset-password.html` (transitional, later 301 with query), `/pages/investment-retail` and `/pages/investment-airlines` (transitional, later 301), and in Phase G every `/pages/*.html` service/legal slug (301 to the new IA). `www` → apex is codified.

**F. What external settings remain unverified?** — Netlify: production-branch setting, env vars, deploy hooks, HTTPS/HSTS source, the `teknoify-demo` base directory (U13), UI build command conflicts (U14). Firebase: reset-e-mail action URL (U4), whether the platform shares project `teknoify-9449c` (U3), authorised domains. Google Cloud: the state of `api.teknoify.com` (U6). Google Search Console coverage (U7).

**G. Is the repository ready for controlled legacy cleanup?** — **No, with three blockers**: merge the public boundary first (itself blocked by U13/U14), enable branch protection, and answer U3 before touching the login modal. Deleting the unreferenced files listed in D(1) is technically safe on a branch today because the artifact proves they are not part of the public site, but landing that deletion before the boundary is live would still be "delete from production" under root publishing, so the boundary must go first.

**H. Should Astro remain a candidate?** — **Yes.** Nothing found in this phase weakens it: the artifact contract (pages + `public/` overlay + `dist/`) is exactly Astro's output model, the site has no images or interactivity that would need a client framework, and the CSP after legacy exit fits a zero-JS-by-default build. The decision is still deferred to Phase B's ADR-0002 and is not implemented here.
