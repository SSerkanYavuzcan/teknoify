# Phase 4N: Public Route Bridge Smoke Test

## Title and purpose

Phase 4N documents the manual smoke testing plan and result template for the public route bridge rollout. It verifies that the Phase 4I `window.TEKNOIFY_ROUTES` bridge, the Phase 4K initial `index.html` load, the Phase 4L `js/script.js` redirect reader, and the Phase 4M public-page bridge expansion behave safely before any fallback route strings are removed or larger script refactors begin.

This document is a checklist/result record only. It does not change runtime behavior, HTML script tags, JavaScript, auth files, dashboard files, route constants, package scripts, or data files.

## Scope

In scope:

- `index.html`.
- Public `pages/*.html` files that load `js/script.js` and now load `/packages/config/routes-global.js`.

Out of scope:

- `reset-password.html`, unless it starts loading `js/script.js` in a later phase.
- Dashboard pages, unless they load `js/script.js` and were explicitly part of Phase 4M.
- Any fallback removal, auth refactor, module migration, Firebase/App Check change, dashboard change, data change, or route value change.

## Pages to test

Each in-scope page should load `/packages/config/routes-global.js` before the existing deferred `js/script.js` tag.

| Page                              | Loads Route Bridge? | Loads js/script.js? | Expected Bridge Order    | Test Status | Notes                        |
| --------------------------------- | ------------------- | ------------------- | ------------------------ | ----------- | ---------------------------- |
| `index.html`                      | Yes                 | Yes                 | Before `js/script.js`    | Not run     | Root-level public home page. |
| `pages/ai-assistant.html`         | Yes                 | Yes                 | Before `../js/script.js` | Not run     | Public feature page.         |
| `pages/api.html`                  | Yes                 | Yes                 | Before `../js/script.js` | Not run     | Public feature page.         |
| `pages/financial-indicators.html` | Yes                 | Yes                 | Before `../js/script.js` | Not run     | Public feature page.         |
| `pages/gizlilik.html`             | Yes                 | Yes                 | Before `../js/script.js` | Not run     | Public legal page.           |
| `pages/hizmet-sozlesmesi.html`    | Yes                 | Yes                 | Before `../js/script.js` | Not run     | Public legal page.           |
| `pages/investment-airlines.html`  | Yes                 | Yes                 | Before `../js/script.js` | Not run     | Public investment page.      |
| `pages/investment-analytics.html` | Yes                 | Yes                 | Before `../js/script.js` | Not run     | Public investment page.      |
| `pages/investment-retail.html`    | Yes                 | Yes                 | Before `../js/script.js` | Not run     | Public investment page.      |
| `pages/kullanim-sartlari.html`    | Yes                 | Yes                 | Before `../js/script.js` | Not run     | Public legal page.           |
| `pages/kvkk.html`                 | Yes                 | Yes                 | Before `../js/script.js` | Not run     | Public legal page.           |
| `pages/rpa.html`                  | Yes                 | Yes                 | Before `../js/script.js` | Not run     | Public feature page.         |
| `pages/subscription.html`         | Yes                 | Yes                 | Before `../js/script.js` | Not run     | Public subscription page.    |
| `pages/training-consulting.html`  | Yes                 | Yes                 | Before `../js/script.js` | Not run     | Public service page.         |
| `pages/webscraping.html`          | Yes                 | Yes                 | Before `../js/script.js` | Not run     | Public feature page.         |

## Global bridge verification

On each in-scope page:

- [ ] Open browser devtools console.
- [ ] Confirm `window.TEKNOIFY_ROUTES` exists.
- [ ] Confirm `window.TEKNOIFY_ROUTES.public.home === "/"`.
- [ ] Confirm `window.TEKNOIFY_ROUTES.dashboard.admin === "/dashboard/admin.html"`.
- [ ] Confirm `window.TEKNOIFY_ROUTES.dashboard.premium === "/dashboard/premium.html"`.
- [ ] Confirm `window.TEKNOIFY_ROUTES.dashboard.member === "/dashboard/member.html"`.
- [ ] Confirm `window.TEKNOIFY_ROUTES.getDashboardRouteForRole("admin") === "/dashboard/admin.html"`.
- [ ] Confirm `window.TEKNOIFY_ROUTES.getDashboardRouteForRole("premium") === "/dashboard/premium.html"`.
- [ ] Confirm `window.TEKNOIFY_ROUTES.getDashboardRouteForRole("member") === "/dashboard/member.html"`.

## Public page behavior checklist

### All in-scope public pages

- [ ] Page loads without console errors.
- [ ] Header/nav still renders.
- [ ] Login trigger still opens modal if present.
- [ ] Modal close button still works.
- [ ] Modal backdrop close still works.
- [ ] Escape key closes modal if applicable.
- [ ] Existing links still work.
- [ ] No visual layout regression from adding the module script.
- [ ] No duplicate Firebase/App Check initialization warnings caused by the bridge.

### Pages with forms or page-specific interaction

- [ ] Contact form still works where present.
- [ ] Existing inline page behavior still runs after `js/script.js` where present.
- [ ] Subscription or feature-specific interactions still behave as before where present.

### Pages with visual effects

- [ ] Terminal effect still works where present.
- [ ] Background/stars effect still works where present.
- [ ] Existing animation or decorative UI behavior remains unchanged.

## Login redirect behavior checklist

Expected behavior:

- [ ] Saved post-login redirect still takes priority.
- [ ] Admin redirect target remains `/dashboard/admin.html`.
- [ ] Premium redirect target remains `/dashboard/premium.html`.
- [ ] Member redirect target remains `/dashboard/member.html`.
- [ ] If the bridge fails to load, fallback strings in `js/script.js` still preserve the same redirect targets.
- [ ] Malformed bridge data falls back safely.

## Negative/failure checks

- [ ] Temporarily block `/packages/config/routes-global.js` in devtools/network and confirm the page still loads.
- [ ] Confirm login redirect fallback still works if the bridge is unavailable.
- [ ] Confirm no hard failure occurs if `window.TEKNOIFY_ROUTES` is undefined.
- [ ] Confirm no hard failure occurs if `window.TEKNOIFY_ROUTES.getDashboardRouteForRole` is unavailable.
- [ ] Confirm no route value changes.

## Manual result section

| Date | Tester | Environment                  | Pages Tested | Result  | Notes                           |
| ---- | ------ | ---------------------------- | ------------ | ------- | ------------------------------- |
| TBD  | TBD    | Local / staging / production | TBD          | Not run | Fill after manual smoke testing |

## Future decision gate

- Do not remove fallback route strings from `js/script.js` until smoke testing is completed.
- Do not expand further auth/script refactors until the bridge rollout is validated.
- If smoke tests pass, future work may continue toward fallback cleanup or script modularization.
- If smoke tests fail, keep fallback strings and fix loading/order issues first.

## Relationship to existing docs

Read this smoke test checklist with:

- [Route bridge loading plan](route-bridge-loading-plan.md)
- [Route global bridge](route-global-bridge.md)
- [Script loading compatibility audit](script-loading-compatibility-audit.md)
- [Script login redirect migration checklist](script-login-redirect-migration-checklist.md)
- [Auth config centralization plan](auth-config-centralization-plan.md)
