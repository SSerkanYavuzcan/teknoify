# Phase 4J: Route Bridge Loading Plan

## Title and purpose

Phase 4J is a documentation-only loading plan for introducing the route global bridge created in Phase 4I. It records the current public HTML script-loading shape before any page adds:

```html
<script type="module" src="/packages/config/routes-global.js"></script>
```

This phase does not change runtime files, HTML script tags, Firebase setup, route constants, auth behavior, package scripts, data files, or public navigation. Its purpose is to make the future bridge-loading PR small, reviewable, and smoke-testable.

## Current finding

`js/script.js` is loaded on the public pages as a classic/plain browser script with `defer`. Because it is not currently an ES module, it cannot safely import `packages/config/routes.js` directly without changing its loading mode and compatibility surface.

Phase 4I created `packages/config/routes-global.js` as a separate ES module bridge. A later PR can load that bridge independently, expose centralized route constants as `window.TEKNOIFY_ROUTES`, and keep `js/script.js` as the existing deferred plain script during the first runtime migration.

`index.html` currently loads `packages/config/routes-global.js` from Phase 4K. Phase 4M expands that bridge loading to the remaining public `pages/*.html` files that load `js/script.js`.

## Target loading order

Pages that load `js/script.js` should use this order when they opt into the bridge:

1. Firebase compat SDK scripts, if the page needs Firebase.
2. `packages/config/routes-global.js` as a module script.
3. `js/script.js` as the existing deferred plain script.

Example target order for a root-level page:

```html
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>
<script type="module" src="/packages/config/routes-global.js"></script>
<script src="js/script.js" defer></script>
```

`js/script.js` should not read `window.TEKNOIFY_ROUTES` until the bridge has executed. The first runtime migration that reads the global should keep the current hardcoded route strings as fallbacks so redirects remain unchanged if the bridge fails to load, executes later than expected, or is unavailable in a static-hosting preview.

## Re-inspection scope

The Phase 4J re-inspection found these public HTML pages loading `js/script.js`:

- `index.html`
- `pages/ai-assistant.html`
- `pages/api.html`
- `pages/financial-indicators.html`
- `pages/gizlilik.html`
- `pages/hizmet-sozlesmesi.html`
- `pages/investment-airlines.html`
- `pages/investment-analytics.html`
- `pages/investment-retail.html`
- `pages/kullanim-sartlari.html`
- `pages/kvkk.html`
- `pages/rpa.html`
- `pages/subscription.html`
- `pages/training-consulting.html`
- `pages/webscraping.html`

`reset-password.html` is present in the repository, but it does not load `js/script.js`, so it is outside the bridge-loading table for this phase.

## Page-by-page loading plan

| HTML File                         | Current js/script.js Path | Current Script Attributes | Firebase Compat Before?                                                                                | Inline Dependencies                                                                                              | Recommended Bridge Position                                                                                                                               | Risk Level | Notes                                                                                                                                                                                                                    |
| --------------------------------- | ------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `index.html`                      | `js/script.js`            | `defer` classic script    | Yes: Firebase app, auth, Firestore, App Check, and Functions compat scripts are before `js/script.js`. | One inline reCAPTCHA/contact helper block before `js/script.js`; one inline toast helper block after it.         | After Firebase compat, reCAPTCHA, and the existing inline contact helper block; before `js/script.js`. Use root path `/packages/config/routes-global.js`. | low        | Uses login modal, contact form, hero terminal, and background effects. Adding the side-effect-limited module bridge before `js/script.js` should be safe, but smoke tests should cover the widest behavior surface here. |
| `pages/ai-assistant.html`         | `../js/script.js`         | `defer` classic script    | Yes: Firebase app and auth compat scripts are before `js/script.js`.                                   | One inline page-specific script after `js/script.js`.                                                            | After Firebase compat and `../js/session-manager.js`; before `../js/script.js`. Use root path `/packages/config/routes-global.js`.                        | low        | Uses login modal behavior. No contact form or terminal/background selectors were found.                                                                                                                                  |
| `pages/api.html`                  | `../js/script.js`         | `defer` classic script    | Yes: Firebase app and auth compat scripts are before `js/script.js`.                                   | One inline page-specific script after `js/script.js`.                                                            | After Firebase compat and `../js/session-manager.js`; before `../js/script.js`. Use root path `/packages/config/routes-global.js`.                        | low        | Uses login modal behavior. No contact form or terminal/background selectors were found.                                                                                                                                  |
| `pages/financial-indicators.html` | `../js/script.js`         | `defer` classic script    | Yes: Firebase app and auth compat scripts are before `js/script.js`.                                   | One inline page-specific script after `js/script.js`.                                                            | After Firebase compat and `../js/session-manager.js`; before `../js/script.js`. Use root path `/packages/config/routes-global.js`.                        | low        | Uses login modal behavior. No contact form or terminal/background selectors were found.                                                                                                                                  |
| `pages/gizlilik.html`             | `../js/script.js`         | `defer` classic script    | Yes: Firebase app and auth compat scripts are before `js/script.js`.                                   | None found before or after `js/script.js`.                                                                       | After Firebase compat and `../js/session-manager.js`; before `../js/script.js`. Use root path `/packages/config/routes-global.js`.                        | low        | Uses login modal behavior only. This is one of the simpler page shapes.                                                                                                                                                  |
| `pages/hizmet-sozlesmesi.html`    | `../js/script.js`         | `defer` classic script    | Yes: Firebase app and auth compat scripts are before `js/script.js`.                                   | None found before or after `js/script.js`.                                                                       | After Firebase compat and `../js/session-manager.js`; before `../js/script.js`. Use root path `/packages/config/routes-global.js`.                        | low        | Uses login modal behavior only. This is one of the simpler page shapes.                                                                                                                                                  |
| `pages/investment-airlines.html`  | `../js/script.js`         | `defer` classic script    | Yes: Firebase app, auth, and Firestore compat scripts are before `js/script.js`.                       | None found before or after `js/script.js`.                                                                       | After Firebase compat and `../js/session-manager.js`; before `../js/script.js`. Use root path `/packages/config/routes-global.js`.                        | low        | Uses login modal behavior. Firestore compat is already available before the legacy script.                                                                                                                               |
| `pages/investment-analytics.html` | `../js/script.js`         | `defer` classic script    | Yes: Firebase app, auth, and Firestore compat scripts are before `js/script.js`.                       | No inline scripts found, but `../js/investment-analytics.js` is a deferred external script after `js/script.js`. | After Firebase compat and `../js/session-manager.js`; before `../js/script.js`. Use root path `/packages/config/routes-global.js`.                        | low        | Uses login modal behavior. Keep `../js/investment-analytics.js` after `js/script.js` in the future bridge-loading PR.                                                                                                    |
| `pages/investment-retail.html`    | `../js/script.js`         | `defer` classic script    | Yes: Firebase app, auth, and Firestore compat scripts are before `js/script.js`.                       | No inline scripts found, but `../js/premium-content-gate.js` is a deferred external script after `js/script.js`. | After Firebase compat and `../js/session-manager.js`; before `../js/script.js`. Use root path `/packages/config/routes-global.js`.                        | low        | Uses login modal behavior. Keep `../js/premium-content-gate.js` after `js/script.js` in the future bridge-loading PR.                                                                                                    |
| `pages/kullanim-sartlari.html`    | `../js/script.js`         | `defer` classic script    | Yes: Firebase app and auth compat scripts are before `js/script.js`.                                   | None found before or after `js/script.js`.                                                                       | After Firebase compat and `../js/session-manager.js`; before `../js/script.js`. Use root path `/packages/config/routes-global.js`.                        | low        | Uses login modal behavior only. This is one of the simpler page shapes.                                                                                                                                                  |
| `pages/kvkk.html`                 | `../js/script.js`         | `defer` classic script    | Yes: Firebase app and auth compat scripts are before `js/script.js`.                                   | None found before or after `js/script.js`.                                                                       | After Firebase compat and `../js/session-manager.js`; before `../js/script.js`. Use root path `/packages/config/routes-global.js`.                        | low        | Uses login modal behavior only. This is one of the simpler page shapes.                                                                                                                                                  |
| `pages/rpa.html`                  | `../js/script.js`         | `defer` classic script    | Yes: Firebase app and auth compat scripts are before `js/script.js`.                                   | One inline page-specific script after `js/script.js`.                                                            | After Firebase compat and `../js/session-manager.js`; before `../js/script.js`. Use root path `/packages/config/routes-global.js`.                        | low        | Uses login modal behavior. No contact form or terminal/background selectors were found.                                                                                                                                  |
| `pages/subscription.html`         | `../js/script.js`         | `defer` classic script    | Yes: Firebase app, auth, and Firestore compat scripts are before `js/script.js`.                       | One inline page-specific script after `js/script.js`.                                                            | After Firebase compat and `../js/session-manager.js`; before `../js/script.js`. Use root path `/packages/config/routes-global.js`.                        | low        | Uses login modal behavior and subscription page logic after the legacy script. Firestore compat is already available before `js/script.js`.                                                                              |
| `pages/training-consulting.html`  | `../js/script.js`         | `defer` classic script    | Yes: Firebase app and auth compat scripts are before `js/script.js`.                                   | One inline page-specific script after `js/script.js`.                                                            | After Firebase compat and `../js/session-manager.js`; before `../js/script.js`. Use root path `/packages/config/routes-global.js`.                        | low        | Uses login modal behavior. No contact form or terminal/background selectors were found.                                                                                                                                  |
| `pages/webscraping.html`          | `../js/script.js`         | `defer` classic script    | Yes: Firebase app and auth compat scripts are before `js/script.js`.                                   | One inline page-specific script after `js/script.js`.                                                            | After Firebase compat and `../js/session-manager.js`; before `../js/script.js`. Use root path `/packages/config/routes-global.js`.                        | low        | Uses login modal behavior. No contact form or terminal/background selectors were found.                                                                                                                                  |

## Recommended first HTML PR scope

The safest first HTML bridge-loading PR should add the bridge only to `index.html`.

Although every inspected `js/script.js` tag is a deferred classic script and every inspected page already loads Firebase compat scripts before it, `index.html` is the best first production-facing smoke target because it exercises the broadest set of `js/script.js` behaviors in one page:

- login modal behavior;
- contact form behavior;
- terminal effect initialization;
- background effect initialization;
- App Check/Firebase compat presence; and
- a root-level `js/script.js` path that pairs naturally with the root bridge path `/packages/config/routes-global.js`.

Phase 4M expands the bridge tag to the remaining low-risk `pages/*.html` files that load `../js/script.js`.

## Smoke test checklist for future bridge-loading PR

When Phase 4K adds the bridge script tag to the chosen page or page set, manually verify:

- [ ] Page loads without console errors.
- [ ] `window.TEKNOIFY_ROUTES` exists before login redirect logic needs it.
- [ ] Existing login modal still opens.
- [ ] Existing login redirect behavior does not change.
- [ ] Contact form still works where present.
- [ ] Terminal/background effects still initialize where present.
- [ ] No duplicate App Check/Firebase initialization warning is introduced by the bridge.
- [ ] No route values change.

## Phase 4K note

- The bridge script tag has been added only to `index.html`.
- Other pages that load `js/script.js` remain unchanged.
- `js/script.js` has not been migrated to read `window.TEKNOIFY_ROUTES` yet.

## Phase 4L note

Phase 4L migrated only the `redirectAfterLogin()` redirect target selection in
`js/script.js` to read `window.TEKNOIFY_ROUTES` when available. Pages without
the bridge still use the preserved fallback dashboard routes.

## Phase 4M note

Phase 4M expands bridge loading from `index.html` to the remaining public
`pages/*.html` files that load `js/script.js`. The bridge must continue to
appear before the existing classic `js/script.js` tag, and the fallback route
strings in `js/script.js` remain in place so redirect behavior is preserved if
the bridge is unavailable.

## Future runtime sequence

1. Phase 4J: bridge loading plan only.
2. Phase 4K: add the bridge script tag to `index.html` first.
3. Phase 4L: migrate `redirectAfterLogin()` in `js/script.js` to read from `window.TEKNOIFY_ROUTES` with fallback strings.
4. Phase 4M: expand bridge loading to the remaining public pages that load `js/script.js`.
5. Later: remove fallback strings only after smoke tests.

## Risk notes

- Module scripts are deferred by default, but execution order relative to deferred classic scripts should still be considered and smoke-tested on every page where the bridge is introduced.
- If `js/script.js` reads `window.TEKNOIFY_ROUTES` too early in a future runtime migration, fallback strings must protect login redirect behavior.
- Relative versus root script paths must be consistent: the future bridge tag should use `/packages/config/routes-global.js` while existing `js/script.js` paths remain unchanged.
- Pages with inline scripts may depend on global functions, classes, or DOM side effects established by the current script order.
- Static hosting must serve `/packages/config/routes-global.js` and its `/packages/config/routes.js` import with the correct JavaScript MIME type.
- Browser support for module scripts should be acceptable for current targets, but it should remain documented because legacy browsers would skip the bridge.

## Relationship to existing docs

Read this loading plan with:

- [Script loading compatibility audit](script-loading-compatibility-audit.md)
- [Route global bridge](route-global-bridge.md)
- [Script login redirect migration checklist](script-login-redirect-migration-checklist.md)
- [Auth config centralization plan](auth-config-centralization-plan.md)
