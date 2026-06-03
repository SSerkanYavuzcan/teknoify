# Phase 4H: Script Loading Compatibility Audit

## Purpose

This audit records the loading-mode constraint that affects future route migrations in `js/script.js`.

## Finding

`js/script.js` is treated as a legacy plain browser script for the public-site runtime migration plan. Because it is not currently migrated to an ES module, direct `import` statements must not be added to `js/script.js` until the relevant HTML loading mode is changed and tested.

## Phase 4I note

Phase 4I created the proposed bridge module at `packages/config/routes-global.js` so centralized route constants can be exposed as `window.TEKNOIFY_ROUTES` for legacy plain scripts in a future PR.

Phase 4I did not load the bridge into HTML pages, did not change HTML script tags, and did not change `js/script.js` or existing route consumers.

## Compatibility implication

Future PRs should prefer loading the bridge before `/js/script.js` on selected pages and then reading from `window.TEKNOIFY_ROUTES`, unless `js/script.js` is intentionally converted to `type="module"` with a dedicated compatibility review and smoke tests.

## Phase 4M note

The loading inventory now reflects that public HTML pages using `js/script.js`
load `/packages/config/routes-global.js` before the existing classic
`js/script.js` tag. `js/script.js` remains a non-module script and still relies
on fallback route strings if the bridge is unavailable.
