# Route Constants Migration

## Purpose

Phase 4C prepares route centralization by adding `packages/config/routes.js` as a static constants module. The module mirrors existing route strings and is intentionally non-invasive: no runtime consumers, redirects, dashboard guards, Firebase setup, App Check setup, data files, or public URLs are changed in this phase.

The goal is to create one future source of truth before any consumer migration starts.

## Current route inventory summary

The Phase 4C inventory inspected route-like strings in public scripts, auth helpers, page scripts, dashboard shared scripts, dashboard HTML pages, root HTML files, and `data/projects.json`. The existing codebase uses a mix of absolute paths, root-relative paths, page-relative links, and route-like data values.

Key route sources include:

- public navigation and footer links in `index.html` and `pages/*.html`;
- auth and redirect helpers in `js/lib/auth.js`, `js/script.js`, `js/lib/nav.js`, `js/pages/login.js`, `js/pages/admin.js`, `js/pages/dashboard.js`, and `js/session-manager.js`;
- dashboard shared navigation and auth helpers in `dashboard/shared/*.js`;
- dashboard cards, redirects, and project launch links in `dashboard/*.html` and nested dashboard pages;
- route-like demo URLs and project folder metadata in `data/projects.json` and `js/lib/storage.js`.

## Route groups

### Public web routes

Public routes discovered during inventory include:

- `/`
- `/pages/login.html`
- `/pages/subscription.html`
- `/pages/impersonate.html`
- `/pages/unauthorized.html`
- `/reset-password.html`

Some existing consumers also contain root-relative or relative variants such as `/login.html`, `pages/login.html`, `../index.html`, and `../index.html#home`. Those strings remain untouched until a dedicated consumer migration verifies the current behavior.

### Product/service routes

Product and service page routes discovered during inventory include:

- `/pages/api.html`
- `/pages/rpa.html`
- `/pages/webscraping.html`
- `/pages/ai-assistant.html`
- `/pages/financial-indicators.html`
- `/pages/training-consulting.html`

`data/projects.json` and `js/lib/storage.js` contain route-like values for some of these pages, including `pages/api.html`, `pages/rpa.html`, and `pages/webscraping.html`. Those data values are not changed in Phase 4C.

### Investment routes

Investment routes discovered during inventory include:

- `/pages/investment-analytics.html`
- `/pages/investment-retail.html`
- `/pages/investment-airlines.html`

Page-level links also include hash anchors such as `investment-analytics.html#retail-store-performance` and `investment-analytics.html#airline-sector-performance`. These anchors are documented for future migration checks but are not represented as separate route constants in Phase 4C.

### Dashboard routes

Dashboard routes discovered during inventory include:

- `/dashboard/index.html`
- `/dashboard/member.html`
- `/dashboard/premium.html`
- `/dashboard/admin.html`
- `/dashboard/admin`
- `/dashboard/analysis.html`
- `/dashboard/market-analysis.html`
- `/dashboard/market-analysis-demo.html`
- `/dashboard/web-scraping/quickcommerce/index.html`
- `/dashboard/web-scraping/clothes/index.html`
- `/dashboard/web-scraping/food/index.html`
- `/dashboard/agents/product-discover/index.html`
- `/dashboard/bim-istekleri/index.html`
- `/dashboard/geo-intelligence/index.html`
- `/dashboard/demo/market-analysis/index.html`

The inventory also found relative dashboard links such as `member.html`, `analysis.html`, `market-analysis.html`, `../../member.html`, and `../../market-analysis.html`. These remain in place until consumer migration verifies context-specific behavior.

### Legal/account routes

Legal and account-related routes discovered during inventory include:

- `/pages/gizlilik.html`
- `/pages/kullanim-sartlari.html`
- `/pages/kvkk.html`
- `/pages/hizmet-sozlesmesi.html`
- `/pages/login.html`
- `/pages/impersonate.html`
- `/pages/unauthorized.html`
- `/reset-password.html`

Root and page HTML files also contain relative variants such as `pages/kvkk.html`, `gizlilik.html`, and `../index.html`. These variants are not rewritten in Phase 4C.

### Project-specific dashboard routes

Project-specific dashboard routes discovered during inventory include:

- `/dashboard/member/finance/index.html`
- `/dashboard/member/health/index.html`
- `/dashboard/member/productivity/index.html`
- `/dashboard/member/subscriptions/index.html`
- `/dashboard/${rawId}/index.html` as a generated fallback pattern in `dashboard/member.html`
- `/${projectData.config.folderPath}/${projectData.config.entryPoint}` as a generated project link pattern in `dashboard/member.html`

The generated project route patterns depend on runtime project data and are not replaced by static constants in Phase 4C.

## Route constants behavior

`packages/config/routes.js` mirrors current route strings in static `Object.freeze` groups:

- `PUBLIC_ROUTES`
- `PRODUCT_ROUTES`
- `INVESTMENT_ROUTES`
- `LEGAL_ROUTES`
- `DASHBOARD_ROUTES`
- `ALL_ROUTES`

It also exposes `getDashboardRouteForRole(roleType)` to preserve the existing admin, premium, and member dashboard route mapping for future migrations. The helper is pure, dependency-free, and does not inspect Firebase auth, Firestore, browser globals, storage, or dashboard access state.

## Migration safety rules

Future PRs that consume route constants must follow these rules:

- Do not change public route availability.
- Do not change auth redirect outcomes.
- Do not change dashboard access control.
- Do not change Firebase config or App Check initialization.
- Do not update data files as part of auth/config route consumer migration.
- Replace route strings in small, reviewable batches.
- Preserve relative-link behavior where the current page context matters.
- Verify anonymous, member, premium, admin, unauthorized, and logout flows before and after each runtime migration.
- Keep duplicate route strings until all consumers are verified.

## Future consumer migration order

1. Add constants only — this PR.
2. Replace route strings in `js/lib/auth.js` redirect helpers.
3. Replace route strings in `js/script.js` login redirect logic.
4. Replace dashboard shared route references.
5. Replace page-level route references.
6. Replace `data/projects.json` route-like values only in a dedicated data/config PR if needed.
7. Add route smoke test checklist.
8. Remove duplicate route strings only after all consumers are verified.
