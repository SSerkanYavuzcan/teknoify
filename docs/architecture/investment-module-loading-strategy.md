# Investment Module Loading Strategy

## 1. Title and purpose

This document is the **Phase 5F Investment Analytics module loading and legacy bridge strategy plan** for Teknoify. It is documentation-only: Phase 5F does not change runtime JavaScript, HTML, CSS, data files, scripts, workflows, or package configuration.

The goal is to decide how future Investment Analytics utility modules can be consumed safely by the current classic script entrypoint, `js/investment-analytics.js`, before any pure utility extraction starts changing public runtime behavior.

**Phase 5G note:** The pure formatter module `domains/investment-intelligence/analytics/scripts/utils/formatters.js` and legacy-safe bridge module `domains/investment-intelligence/analytics/scripts/utils/formatters-global.js` now exist. The bridge has not been loaded into `pages/investment-analytics.html` yet, and `js/investment-analytics.js` has not been migrated to consume it.

## 2. Current loading facts

Phase 5F inspected `pages/investment-analytics.html`, `js/investment-analytics.js`, and the script tags around the Investment Analytics page without editing them.

Observed `pages/investment-analytics.html` script order:

```html
<script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore-compat.js"></script>
<script src="../js/session-manager.js"></script>
<script type="module" src="/packages/config/routes-global.js"></script>
<script src="../js/script.js" defer></script>
<script src="../js/investment-analytics.js" defer></script>
```

Current facts:

- `js/investment-analytics.js` is loaded from `pages/investment-analytics.html` as `../js/investment-analytics.js`.
- The investment analytics script tag uses `defer`.
- The investment analytics script tag does **not** use `type="module"`; it is a classic deferred script.
- The page already loads one module script: `/packages/config/routes-global.js`.
- The route bridge script is present before the shared `../js/script.js` and before `../js/investment-analytics.js`.
- Repository search shows `pages/investment-analytics.html` is the only public page that loads `js/investment-analytics.js` directly.
- Related investment pages such as `pages/investment-retail.html`, `pages/investment-airlines.html`, and `pages/financial-indicators.html` do not load `js/investment-analytics.js`.

## 3. Why direct imports are unsafe today

Direct static ES imports are unsafe inside `js/investment-analytics.js` today because the file is currently loaded as a classic deferred script. Classic scripts cannot contain top-level static `import` declarations; adding one would be a syntax error unless the script tag is converted to `type="module"`.

Converting `js/investment-analytics.js` to a module is also not a drop-in documentation-only decision. Module scripts have different execution and scoping behavior from classic scripts. A conversion could affect:

- Timing relative to existing dependency scripts and `DOMContentLoaded` handlers.
- Whether top-level declarations become visible as classic-script globals.
- Interactions with existing shared scripts that expect classic browser behavior.
- Hidden dependencies on Firebase compat globals, route bridge globals, DOM readiness, local state, or page-specific markup.

Public Investment Analytics behavior must be preserved while utilities are extracted. The current page includes charts, calculators, sector switching, premium gate interactions, and chatbot/mock assistant behavior, so Phase 5F treats script-loading changes as runtime-risk changes that need their own staged plan.

## 4. Migration options

### Option A: Convert `js/investment-analytics.js` to an ES module

Convert the existing page script tag to `type="module"` and allow `js/investment-analytics.js` to import future utilities directly.

**Pros**

- Enables standard static imports from future utility modules.
- Avoids adding a new global compatibility namespace.
- Makes dependency relationships explicit in source code.
- Aligns the file with future domain-owned modules under `domains/investment-intelligence/analytics/scripts/`.

**Cons**

- Changes execution and scoping semantics for a large public page entrypoint.
- Requires careful browser smoke testing for all Investment Analytics UI behavior.
- May reveal hidden dependencies on classic-script globals or load order.
- Makes the first utility extraction PR larger and riskier if done together.

**Risks**

- Existing code may depend on classic script timing or top-level declarations.
- Module loading may fail if static hosting serves module files with an incompatible MIME type.
- A module conversion could break chart/calculator/chatbot behavior even if extracted utilities are pure.
- Debugging would be harder if module conversion and utility extraction happen in the same PR.

**Prerequisites**

- Inventory all top-level globals and dependency assumptions in `js/investment-analytics.js`.
- Verify Firebase compat globals and shared scripts remain available at the required time.
- Confirm static hosting supports JavaScript modules from the target paths.
- Create smoke tests or a manual smoke checklist before removing classic-script fallbacks.

### Option B: Keep `js/investment-analytics.js` classic and expose utility modules via a global bridge

Keep the current classic deferred entrypoint and add a small future module bridge for pure utilities. For example, a future file named `domains/investment-intelligence/analytics/scripts/utils/formatters-global.js` could import pure formatters and expose a frozen `window.TEKNOIFY_INVESTMENT_UTILS` object.

**Pros**

- Preserves the current public entrypoint loading mode.
- Mirrors the existing public route bridge pattern used for legacy plain scripts.
- Allows tiny, reviewable PRs: bridge first, load order second, consumer reads third.
- Lets `js/investment-analytics.js` keep local fallback formatter functions until smoke tests pass.

**Cons**

- Adds a temporary browser global surface.
- Requires careful namespace design to avoid duplicate or conflicting globals.
- Direct imports remain unavailable inside the classic script.
- Module utilities and fallback functions can drift if both are maintained too long.

**Risks**

- Browser execution ordering between a module bridge and a classic deferred script must be verified on the page.
- If the bridge fails to load, the classic script must continue using local fallback functions.
- The global must stay side-effect-limited so it does not become a second page boot path.

**Prerequisites**

- Create pure utility modules with no DOM, Firebase, fetch, localStorage, rendering, or chart side effects.
- Create one bridge namespace, `window.TEKNOIFY_INVESTMENT_UTILS`, with frozen sub-objects.
- Load the bridge before the classic investment analytics script in a later runtime PR.
- Keep fallback reads in `js/investment-analytics.js` until page smoke tests pass.

### Option C: Create a new module entrypoint and keep the existing classic script as a compatibility wrapper

Create a future module entrypoint such as `domains/investment-intelligence/analytics/scripts/boot.js`, then eventually reduce `js/investment-analytics.js` to a thin compatibility wrapper or loader.

**Pros**

- Provides a clean long-term home for Investment Analytics boot logic.
- Allows new code to use native module boundaries while preserving the old public path during migration.
- Makes it possible to move page ownership into the domain structure over time.

**Cons**

- Requires a larger migration plan than formatter extraction.
- May need dual boot paths during the transition.
- Could increase debugging complexity if wrapper and module entrypoint both initialize page behavior.

**Risks**

- Duplicate initialization if the wrapper and module boot file both attach listeners or render charts.
- Script ordering bugs between legacy dependencies, the wrapper, and the new module entrypoint.
- Public route behavior could regress if the old entrypoint is reduced too early.

**Prerequisites**

- Define a single boot ownership model.
- Extract pure helpers and side-effect modules separately before moving orchestration.
- Add smoke tests for every calculator, chart, sector, chatbot, and premium gate behavior.
- Only thin the classic wrapper after the module entrypoint is proven in production-like smoke tests.

### Option D: Keep utilities duplicated temporarily until a larger module migration

Leave formatter utilities duplicated in `js/investment-analytics.js` and any future modules until a larger module migration can safely remove duplication.

**Pros**

- Avoids immediate script-loading changes.
- Reduces short-term risk if a runtime release needs only isolated module files for future preparation.
- Keeps public page behavior untouched while planning continues.

**Cons**

- Least preferred because duplicated helpers can drift.
- Does not validate real consumption of future utility modules.
- Delays the architectural payoff of the utility extraction checklist.
- Can make later migrations harder if consumers start relying on different copies.

**Risks**

- Formatting differences, especially Turkish locale and currency behavior, may diverge between copies.
- Future maintainers may update only one version of a helper.
- Duplicated helpers can hide coupling between formatter output and chart/calculator rendering.

**Prerequisites**

- Treat duplication as explicitly temporary.
- Document which copy is authoritative.
- Remove duplication only after smoke tests confirm the shared utility path is safe.

## 5. Recommended strategy

The safest next step based on the current repo state is **Option B: keep `js/investment-analytics.js` as a classic deferred script and introduce a small global bridge for pure utilities first**.

Recommended default:

1. Do not convert `js/investment-analytics.js` to `type="module"` yet.
2. First create a small global bridge for pure utilities, similar to the public route bridge pattern.
3. Migrate only pure formatter reads through `window.TEKNOIFY_INVESTMENT_UTILS` with fallback local functions.
4. Keep local fallback functions in `js/investment-analytics.js` until Investment Analytics smoke tests pass.
5. Avoid extracting calculators, chart rendering, Firebase/data fetching, chatbot behavior, premium gate behavior, or page boot logic until formatter bridge behavior is proven.

This strategy minimizes behavior risk because it does not change the existing public entrypoint loading mode and preserves local fallback behavior while future modules are introduced gradually.

## 6. Proposed future bridge shape

A future runtime PR can create a pure formatter module:

```text
domains/investment-intelligence/analytics/scripts/utils/formatters.js
```

Responsibilities:

- Export pure formatter functions.
- Avoid DOM reads/writes.
- Avoid Firebase, fetch, localStorage, sessionStorage, and network access.
- Avoid chart, calculator, table, sector, chatbot, or premium gate rendering logic.

A later or same carefully scoped runtime PR can create a bridge module:

```text
domains/investment-intelligence/analytics/scripts/utils/formatters-global.js
```

Responsibilities:

- Import from `formatters.js`.
- Expose `window.TEKNOIFY_INVESTMENT_UTILS.formatters`.
- Limit side effects to defining one frozen global namespace or preserving an existing compatible namespace.
- Be safe if loaded more than once.
- Avoid DOM, Firebase, fetch, localStorage, sessionStorage, rendering logic, chart setup, calculator orchestration, sector switching, chatbot setup, and premium gate behavior.

Possible shape, for planning only:

```js
import { formatNumber, formatUsdCurrency } from './formatters.js';

const formatters = Object.freeze({
    formatNumber,
    formatUsdCurrency
});

const bridge = Object.freeze({
    formatters
});

if (!window.TEKNOIFY_INVESTMENT_UTILS) {
    Object.defineProperty(window, 'TEKNOIFY_INVESTMENT_UTILS', {
        value: bridge,
        writable: false,
        configurable: false,
        enumerable: false
    });
}
```

This was an illustrative future shape in Phase 5F. Phase 5G created the formatter module and bridge runtime files, but does not load the bridge from any HTML page or migrate any consumer yet.

## 7. Loading order plan

A future `pages/investment-analytics.html` runtime PR should use this loading order:

1. Any existing dependency scripts that must remain before page logic, including Firebase compat scripts and `../js/session-manager.js`.
2. Existing route bridge module script, `/packages/config/routes-global.js`, if the page continues to use it.
3. Future formatter bridge module script, for example `../domains/investment-intelligence/analytics/scripts/utils/formatters-global.js` or the static-hosting-safe path chosen by that PR.
4. Existing shared classic script, `../js/script.js`, preserving its current safety requirements.
5. Existing `js/investment-analytics.js` classic deferred script.

Important safety rules:

- `js/investment-analytics.js` must keep local fallback functions during the first migration.
- The formatter bridge must be loaded before the classic script uses `window.TEKNOIFY_INVESTMENT_UTILS`.
- If module execution order is uncertain in the target browser/static-hosting environment, local fallback functions preserve behavior.
- No fallback cleanup should happen in the same PR that first introduces bridge reads.

## 8. First future runtime PR recommendation

Recommended staged runtime sequence:

- **Phase 5G:** Create the pure formatter module plus formatter global bridge only. Do not change `js/investment-analytics.js`.
- **Phase 5H:** Load the formatter bridge on `pages/investment-analytics.html` while preserving existing dependency order and without changing formatter call sites.
- **Phase 5I:** Update only one or two formatter call paths in `js/investment-analytics.js` to read from `window.TEKNOIFY_INVESTMENT_UTILS.formatters` with local fallback functions.

Do not extract calculators, chart rendering, chart math coupled to rendering, sector orchestration, chatbot behavior, premium gate behavior, Firebase/data fetching, or page boot logic in these first runtime PRs.

## 9. Smoke test checklist

Future bridge and formatter-consumer runtime PRs should verify:

- [ ] Investment analytics page loads without console errors.
- [ ] `window.TEKNOIFY_INVESTMENT_UTILS` exists after bridge loading.
- [ ] Formatter outputs match current outputs for sample values.
- [ ] Charts display the same labels.
- [ ] Calculator outputs display the same currency and number formats.
- [ ] Tables display the same values.
- [ ] Sector switching still works.
- [ ] Chatbot/mock assistant still works.
- [ ] Premium gate behavior is unchanged.
- [ ] If the bridge fails to load, local fallback functions preserve behavior.

## 10. Risk notes

- **Module MIME type/static hosting:** JavaScript modules must be served with a valid JavaScript MIME type from the chosen public path.
- **Classic vs module execution timing:** Module scripts and classic deferred scripts have different execution rules; verify order before removing fallbacks.
- **Turkish locale/Intl formatting differences:** Formatter extraction must preserve current `Intl` locale, currency, compact notation, rounding, and fallback behavior.
- **Shared fallback drift:** Local fallback functions in `js/investment-analytics.js` can diverge from module functions if both remain active too long.
- **Hidden rendering coupling:** Formatter output may be coupled to chart labels, calculator result markup, table values, and text comparisons.
- **Potential duplicate globals:** The bridge must define one documented namespace and be safe when loaded more than once.
- **Cleanup timing:** Future cleanup should happen only after smoke tests pass and after the bridge has been proven on the public page.

## 11. Relationship to existing docs

Related planning and pattern documents:

- [Investment Utility Extraction Checklist](investment-utility-extraction-checklist.md)
- [Investment Frontend Split Plan](investment-frontend-split-plan.md)
- [Analytics scripts README](../../domains/investment-intelligence/analytics/scripts/README.md)
- [Analytics utils README](../../domains/investment-intelligence/analytics/scripts/utils/README.md)
- [Route Global Bridge](route-global-bridge.md), which is the pattern inspiration for a legacy-safe global bridge.

## 12. Phase 5F status

Phase 5F adds this module loading and legacy bridge strategy before extracting pure Investment Analytics utilities. It intentionally does not:

- Change `pages/investment-analytics.html`.
- Change `js/investment-analytics.js`.
- Create formatter JavaScript modules.
- Change CSS.
- Change data files.
- Change scripts, workflows, or package configuration.
