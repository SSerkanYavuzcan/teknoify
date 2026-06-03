# Phase 4I: Route Global Bridge

## Purpose

Phase 4I adds a small browser ES module bridge at `packages/config/routes-global.js` so legacy plain scripts can read centralized route constants through a browser global in a later migration.

The bridge is intentionally non-invasive in this PR: it creates the bridge module and documents how to load it later, but it does not update HTML script tags, `js/script.js`, or any existing route consumers.

## Why the bridge is needed

`packages/config/routes.js` is an ES module that owns centralized route constants. `js/script.js` is currently loaded as a classic deferred script on public pages, so direct `import` statements inside `js/script.js` would be unsafe unless the script is converted to `type="module"` first.

The bridge gives future PRs a lower-risk path: load one small ES module before the legacy script, expose the route constants on `window`, and let `js/script.js` keep running as a plain script while it gradually moves away from hardcoded route strings.

## How `routes-global.js` works

`packages/config/routes-global.js` imports only route exports from `/packages/config/routes.js`, creates a frozen bridge object, and defines a non-writable, non-configurable, non-enumerable `window.TEKNOIFY_ROUTES` property when it does not already exist.

If the module is loaded more than once and `window.TEKNOIFY_ROUTES` already exists, the module leaves the existing global untouched.

## Exposed global

Future legacy consumers should read route constants from `window.TEKNOIFY_ROUTES` after the bridge has loaded. The bridge exposes:

- `window.TEKNOIFY_ROUTES.all`: the full `ALL_ROUTES` route grouping.
- `window.TEKNOIFY_ROUTES.dashboard`: dashboard route constants.
- `window.TEKNOIFY_ROUTES.legal`: legal route constants.
- `window.TEKNOIFY_ROUTES.products`: product/service route constants.
- `window.TEKNOIFY_ROUTES.public`: public route constants.
- `window.TEKNOIFY_ROUTES.getDashboardRouteForRole`: the existing dashboard route helper.

The top-level bridge object is frozen, and the imported route groups keep their existing frozen shapes from `routes.js`.

## What the bridge must not do

The bridge must remain side-effect-limited and must not:

- Import Firebase, auth, dashboard, data, DOM, or page modules.
- Initialize Firebase or App Check.
- Perform redirects or mutate `window.location`.
- Read or write `localStorage` or `sessionStorage`.
- Query, depend on, or mutate HTML elements.
- Change existing route values.
- Replace or migrate existing runtime consumers by itself.

## Loading order requirements

No HTML pages load this bridge in Phase 4I.

Phase 4J created [the route bridge loading plan](route-bridge-loading-plan.md) before adding the bridge script tag to any HTML page.

In a future PR that opts into the bridge, load it before `/js/script.js` on the selected pages:

```html
<script type="module" src="/packages/config/routes-global.js"></script>
<script defer src="/js/script.js"></script>
```

Before `js/script.js` reads the bridge, the future PR must verify that `window.TEKNOIFY_ROUTES` exists at the time the legacy redirect code runs. If there is any uncertainty about module/classic-script execution ordering on a page, keep hardcoded fallback route strings in `js/script.js` until browser smoke tests confirm safe ordering.

## Phase 4K note

- `index.html` is the first page loading the bridge.
- The bridge remains non-invasive because no existing consumer reads it yet.

## Future migration plan

1. Add bridge module only — this PR.
2. In a later PR, add `<script type="module" src="/packages/config/routes-global.js"></script>` before `/js/script.js` on one low-risk page or all pages that load `js/script.js`, depending on audit findings.
3. Verify `window.TEKNOIFY_ROUTES` exists before `js/script.js` uses it.
4. Update `redirectAfterLogin()` to read from `window.TEKNOIFY_ROUTES`.
5. Keep fallback route strings inside `js/script.js` during first migration for safety.
6. Remove fallback strings only after smoke tests.

## Smoke test checklist

When a later PR loads the bridge and updates `js/script.js`, verify:

- [ ] The selected page loads without console errors before login interaction.
- [ ] `window.TEKNOIFY_ROUTES` exists before any legacy redirect code reads it.
- [ ] `window.TEKNOIFY_ROUTES.dashboard.admin` matches `/dashboard/admin.html`.
- [ ] `window.TEKNOIFY_ROUTES.dashboard.premium` matches `/dashboard/premium.html`.
- [ ] `window.TEKNOIFY_ROUTES.dashboard.member` matches `/dashboard/member.html`.
- [ ] `window.TEKNOIFY_ROUTES.getDashboardRouteForRole('admin')` returns the admin dashboard route.
- [ ] `window.TEKNOIFY_ROUTES.getDashboardRouteForRole('premium')` returns the premium dashboard route.
- [ ] `window.TEKNOIFY_ROUTES.getDashboardRouteForRole('member')` returns the member dashboard route.
- [ ] Anonymous login-trigger behavior still opens the login modal.
- [ ] Admin, premium, and member users still land on the same dashboard URLs as before.
- [ ] A valid saved post-login redirect still wins over role-based dashboard routing.
- [ ] Existing Firebase, App Check, auth, contact form, terminal, and background behavior remains unchanged.

## Risks

- Browser execution ordering between a module bridge and a classic deferred script must be verified on each page where the bridge is introduced.
- If `js/script.js` reads the global before the module finishes, fallback route strings must preserve existing redirects.
- Adding the bridge to every public page at once may increase rollout risk; a low-risk page can be used first if the audit recommends a staged rollout.
- The bridge adds a global compatibility surface that should remain temporary and documented until legacy consumers can import route constants directly or use a stable shared module boundary.
