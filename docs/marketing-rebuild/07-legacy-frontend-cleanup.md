# 07 — Legacy Frontend & Authentication Cleanup (Phase B0)

Date: 2026-09-05. Branch: `refactor/remove-legacy-marketing-app` (from `main` at `1854521`, the merged Phase A boundary). Ownership decision applied: `docs/decisions/ADR-0002-marketing-platform-ownership.md`.

Purpose: remove the legacy authenticated application frontend from the marketing repository so the visual redesign starts on an auth-free surface. This record is deliberately short; the full inventory of what existed is in docs 01–02, and Git history (`24f3044`) is the archive.

---

## 1. Removed

| Area | What | Files |
| --- | --- | --- |
| Dashboard / application frontend | every page, shared shell script, CSS, config and asset under `dashboard/` (admin, member, premium, AI hub, billing, developer, workspace, settings, support, organization, product-discover agent, BİM API console, geo-intelligence incl. the 11.5 MB GeoJSON, web-scraping tools, personal finance/health/productivity/subscriptions, market-analysis demos) | 63 |
| Browser-side auth stack | `js/session-manager.js`, `js/premium-content-gate.js`, `js/lib/{firebase,auth,data,storage,nav}.js`, `js/pages/*` (admin, dashboard, member, login, home, unauthorized, investment-market, common), `js/impersonate.js`, `js/finance.js`, `js/utils/*`, `js/config/*`, `js/services/exchange-rate-service.js`, `packages/auth/*`, `packages/config/routes-global.js` | 25 |
| Auth on public pages | Firebase SDK `<script>` tags (5 on the homepage, 2–3 on each page), reCAPTCHA tag, session-manager and route-bridge tags, the login/reset modal markup (`#loginModal`) on 13 pages, the homepage inline `togglePasswordVisibility` / `toggleResetView` / `resetModalView` / `sendResetLink` helpers, the `tk_access_denied` 403 lockout script, password-toggle and reCAPTCHA-badge styles | 13 pages edited |
| `js/script.js` | Firebase config, App Check activation, `auth`/`db` handles, post-login redirect helpers, dashboard route fallbacks, the `AuthSystem` class; the contact honeypot no longer writes a permanent client-side lockout | edited |
| Legacy pages | `pages/login.html` (localStorage MVP login), `pages/impersonate.html`, `pages/unauthorized.html`, `pages/investment-retail.html`, `pages/investment-airlines.html` (premium-gated previews) | 5 |
| Unrouted mirrors | `domains/**/page.html` (6 copies of public pages carrying the auth modal) | 6 |
| Governance checkers | `scripts/architecture/*` and the five `npm run check:*` scripts that referenced deleted files | 15 |
| Dead server-side stubs | `api/chat.js`, `api/chat-log.js` (never deployed; `/api/chat` was 404) and the root `firebase-admin` dependency they implied | 2 + dependency |
| Legacy data / assets | `data/entitlements.json`, `data/projects.json` (MVP seed), `images/projects/*.png` (unreferenced, 3.3 MB), `assets/images/market-icons/*.svg` (dashboard only) | 10 |
| Orphaned CSS | `css/06-pages/dashboard/**`, `css/06-pages/analysis/**`, `css/dashboard.css`, `css/analysis.css`, `css/investment-analytics.css`, `css/06-pages/dashboard-portal.css`, `css/request-control.css`, `css/05-components/{forms,card,nav,table,buttons,modal}.css` | 30 |

Totals: 156 files deleted, about 497 KB of tracked source removed; tracked files 466 → 310. Every deletion was verified as unreachable from the 13 surviving public pages (structural reference crawl by `build.mjs`), application-only, or already orphaned.

## 2. Deliberately retained

- **Marketing surface**: `index.html`, 6 service pages, 4 legal pages, `pages/investment-analytics.html` (public landing + calculators; its two premium "detail" buttons now link to the platform), `pages/subscription.html` (public pricing content; CTAs already led to the contact section), `demo/`.
- **Marketing scripts**: `js/script.js` (nav, custom select, contact form, hero terminal, background FX), `js/cookies.js` (GA consent), `js/investment-analytics.js` (its `/api/chat` calls still fail gracefully; pre-existing).
- **Infrastructure outside the frontend, untouched**: `render.yaml` and `services/**` (Render/Cloud Run), `dashboard/bim-istekleri/backend/` and `dashboard/web-scraping/backend/` (Python Cloud Functions source; the only files left under `dashboard/`), `.github/workflows/*` and `scripts/update-usd-try-rates.*` / stock-document scripts (data pipelines), `data/currency/`, `data/stock/**`, `data/investment-analytics/`. All are excluded from `dist/` by the artifact contract; their ownership migration is independent of the redesign.
- **Documentation skeleton**: `apps/`, `packages/*/README.md`, `domains/**/README.md`, `_archive/`, `docs/architecture/*` (history).
- **`packages/config/routes.js`**: trimmed to public routes plus `PLATFORM_ROUTES.root`; no page loads it.

## 3. Ownership boundary in the code

- No public page loads or initializes Firebase, App Check, reCAPTCHA, a session manager or entitlement gating.
- "Giriş Yap" in the navigation of all 13 pages and the demo, and the hero "Hemen Başla" CTA, are plain links to `https://platform.teknoify.com/` (`rel="noopener"`), styled with the existing button classes. Deep links are PLATFORM TARGET TBD.
- The only client-side storage left is `teknoify_cookie_consent` (GA consent), `tk_last_success` (contact-form rate limit) and `tk_subscription_interest` (pricing-page intent hint).

## 4. Legacy URL behaviour (`public/_redirects`)

| URL | Behaviour |
| --- | --- |
| `/dashboard/*` | 302 → `https://platform.teknoify.com/` |
| `/login.html`, `/pages/login`, `/pages/login.html` | 302 → platform root |
| `/pages/investment-retail(.html)`, `/pages/investment-airlines(.html)` | 302 → platform root (premium capability is a platform concern) |
| `/pages/impersonate*`, `/pages/unauthorized*`, `/domains/*` | 404 (branded page) |
| `/reset-password.html` | 200, static compatibility page (§5) |
| `https://www.teknoify.com/*` | 301 → apex |

`robots.txt` disallows the redirecting and compatibility paths; the sitemap lists only the 13 public URLs.

## 5. Reset-password decision

No verified platform reset route exists, so `reset-password.html` is now a **static compatibility page**: no scripts, no Firebase, `noindex`; it states that password reset is handled on Teknoify Platform and links to the platform root. It does not pretend to process the `oobCode` it may receive. Final ownership belongs to the platform: when the platform publishes its reset handler and the Firebase Auth e-mail action URL is repointed there (U4), this page becomes a 301 with query passthrough and is then deleted.

## 6. Dependencies

- Removed: `firebase-admin` (root `dependencies`; only the deleted `api/` stubs could have used it). Lockfile shrank from 186 top-level packages to the two local stylelint stubs; `npm ci` now installs nothing of substance. No package was upgraded or added.
- Retained: the stylelint stub devDependencies (out of scope), the Python/Node dependencies of `services/*` and the backends (infrastructure).
- Browser CDN dependencies now: Font Awesome (cdnjs), Google Fonts, Google Analytics after consent. Firebase, reCAPTCHA and `apis.google.com` no longer appear in the artifact's external-host inventory.

## 7. Validation

| Check | Result |
| --- | --- |
| `npm run check:public` | green; 70 files, 760 508 bytes, hash `ae4ced55…`; all 13 entry pages present |
| Auth-free assertion | 14 new forbidden content markers in `scripts/public-artifact/manifest.json` (`gstatic.com/firebasejs`, `firebase.initializeApp`, `initializeAppCheck`, `firebase.appCheck`, `google.com/recaptcha/api.js`, `onAuthStateChanged`, `getIdTokenResult`, `sendPasswordResetEmail`, `confirmPasswordReset`, `id="loginModal"`, `session-manager.js`, `premium-content-gate`, `teknoify_impersonate_uid`, `tk_access_denied`). Negative test: a Firebase tag injected into a page makes `verify.mjs` fail with "forbidden content marker". |
| Source grep of surviving public sources for firebase/recaptcha/session/modal/impersonation identifiers | only a comment in `js/script.js` and the explanatory comment in `reset-password.html` |
| Reference integrity | every local `href`/`src` of the 16 artifact HTML files resolves inside `dist/`, except the pre-existing missing favicons |
| Browser, desktop (local artifact) | `/`, RPA, investment analytics, subscription, gizlilik, reset-password, `/demo/`: zero failed same-origin requests, `typeof firebase === 'undefined'`, no `#loginModal`, nav link and hero CTA point to the platform, 8 service cards, contact form and toast present, 5 sector cards and 4 calculators on the investment page, 3 plan cards with billing toggle on the pricing page |
| Browser, 375 px | hamburger opens, "Giriş Yap" link visible and reachable, no horizontal overflow on the RPA and pricing pages, zero failed requests |
| Background canvas | absent locally **and** on production in this browser because it reports `prefers-reduced-motion`; particle field and terminal render in both, so no regression |
| Syntax | `node --check` clean on `js/script.js` and `js/investment-analytics.js` |
| Demo isolation | `demo/index.html` changed only its login link; `demo/netlify.toml` untouched |

## 8. Remaining legacy debt (non-blocking for the redesign)

- Favicons referenced by the homepage and demo do not exist (Phase C brand assets).
- `js/investment-analytics.js` still calls `/api/chat` and `/api/chat-log` (404); the "Yatırım Asistanı" widget is a product decision for Phase B/F.
- Contact form posts to `api.teknoify.com`, which was unreachable in Phase A (U6); unchanged here.
- Governance READMEs (`apps/`, `packages/*`, `domains/*`, `_archive/`) and the ADR-0001 phase docs remain as history.
- Infrastructure in this repository (`render.yaml`, `services/`, backend folders, data workflows) awaits its own migration; it does not affect the public artifact.
- The stylelint stub, missing ESLint/Prettier declarations and the CRLF checkout churn are toolchain items for Phase D.
