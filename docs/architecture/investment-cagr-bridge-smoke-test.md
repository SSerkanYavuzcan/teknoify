# Investment CAGR Bridge Smoke Test

## 1. Title and purpose

This document is the **Phase 5Y Investment Analytics CAGR bridge smoke test checklist and result template** for Teknoify.

Phase 5Y documents manual smoke testing for the Investment Analytics Compound Annual Growth Rate (CAGR) bridge rollout after the first CAGR consumer migration. The purpose is to verify that `calculateCagr` and `getCagrBaseResult` can safely use the CAGR bridge when it is available, while preserving the local fallback behavior in `js/investment-analytics.js` when the bridge is missing, malformed, incomplete, or throws.

This is documentation-only. It does not change runtime pages, JavaScript, CAGR modules, compound/formatter/chart modules, CSS, data files, scripts, workflows, package configuration, routes, premium gates, or chatbot behavior.

## 2. Scope

In scope for this smoke test:

- `pages/investment-analytics.html`
- `js/investment-analytics.js` CAGR wrappers
- `domains/investment-intelligence/analytics/scripts/calculators/cagr.js`
- `domains/investment-intelligence/analytics/scripts/calculators/cagr-global.js`

Out of scope for this smoke test:

- CAGR DOM/input/render extraction
- CAGR chart/table extraction
- CAGR event binding extraction
- Compound calculator extraction
- Retirement calculator extraction
- CSS split
- Route changes
- Data/RAG migration
- Premium gate changes
- Chatbot extraction

## 3. CAGR helpers under test

| Helper              | Bridge Export                                                                                                                                   | Local Wrapper                                      | Expected Behavior                                                                                                                                                                                                                                                                                                 | Test Status | Notes                                                                                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `calculateCagr`     | `window.TEKNOIFY_INVESTMENT_CAGR.calculateCagr` and, when extensible, `window.TEKNOIFY_INVESTMENT_UTILS.calculators.cagr.calculateCagr`         | `js/investment-analytics.js` `calculateCagr()`     | Returns a valid CAGR result object for valid positive beginning, ending, and duration inputs; returns the current invalid result shape/message for validation, zero, negative, non-finite, or uncomputable inputs; falls back to the local implementation if bridge lookup or execution is unavailable or unsafe. | Not run     | First consumer-migrated CAGR calculation helper; DOM parsing, rendering, validation text placement, event handling, charting, and table logic remain local. |
| `getCagrBaseResult` | `window.TEKNOIFY_INVESTMENT_CAGR.getCagrBaseResult` and, when extensible, `window.TEKNOIFY_INVESTMENT_UTILS.calculators.cagr.getCagrBaseResult` | `js/investment-analytics.js` `getCagrBaseResult()` | Returns the current valid base result object shape with `valid`, `titleValue`, `beginningValue`, `endingValue`, `cagr`, `totalReturn`, `absoluteGain`, `realCagr`, and `durationYears`; falls back to the local implementation if bridge lookup or execution is unavailable or unsafe.                            | Not run     | Shared result-shaping helper used by CAGR calculation modes; broader CAGR render/chart/table consumers remain unchanged.                                    |

## 4. Global bridge verification

Manual checks:

- Open `pages/investment-analytics.html`.
- Open browser devtools console.
- Confirm `window.TEKNOIFY_INVESTMENT_CAGR` exists when the standalone fallback namespace is used.
- If available, confirm `window.TEKNOIFY_INVESTMENT_UTILS.calculators.cagr` exists.
- Confirm `calculateCagr` is a function on the bridge namespace that is present.
- Confirm `getCagrBaseResult` is a function on the bridge namespace that is present.
- Confirm sample outputs match expected behavior.

Example console checks against the standalone namespace:

```js
window.TEKNOIFY_INVESTMENT_CAGR.calculateCagr({
    beginningValue: 1000,
    endingValue: 2000,
    durationYears: 10
});
window.TEKNOIFY_INVESTMENT_CAGR.calculateCagr({
    beginningValue: 1000,
    endingValue: 1000,
    durationYears: 10
});
window.TEKNOIFY_INVESTMENT_CAGR.calculateCagr({
    beginningValue: 0,
    endingValue: 1000,
    durationYears: 10
});
window.TEKNOIFY_INVESTMENT_CAGR.getCagrBaseResult({
    beginningValue: 1000,
    endingValue: 2000,
    durationYears: 10,
    cagr: 0.0717734625
});
```

Expected shape/behavior for the example checks:

- Each call should return an object, not throw.
- Valid positive `calculateCagr` inputs should return an object with `valid: true` and base result fields such as `beginningValue`, `endingValue`, `cagr`, `totalReturn`, `absoluteGain`, `realCagr`, and `durationYears`.
- Equal positive beginning and ending values should return a valid result with a zero-growth CAGR-style result rather than an invalid result.
- A zero beginning value should return the current invalid result shape and the existing beginning-value validation message.
- `getCagrBaseResult` should preserve the current base result shape. If using the active helper signature directly, pass `inputs`, `cagr`, `endingValue`, and `durationYears` as positional arguments.
- Exact numeric expectations should be recorded only after confirming the active bridge signature and current local wrapper behavior in the tested environment.

Optional parity checks with the current positional `getCagrBaseResult` signature:

```js
window.TEKNOIFY_INVESTMENT_CAGR.getCagrBaseResult(
    { beginningValue: 1000, inflationRate: 0 },
    0.0717734625,
    2000,
    10
);
```

If the CAGR helper is exposed through `window.TEKNOIFY_INVESTMENT_UTILS.calculators.cagr`, repeat the same checks against that namespace:

```js
window.TEKNOIFY_INVESTMENT_UTILS.calculators.cagr.calculateCagr({
    beginningValue: 1000,
    endingValue: 2000,
    durationYears: 10
});
window.TEKNOIFY_INVESTMENT_UTILS.calculators.cagr.getCagrBaseResult(
    { beginningValue: 1000, inflationRate: 0 },
    0.0717734625,
    2000,
    10
);
```

## 5. Behavior checklist

- [ ] Investment analytics page loads without console errors.
- [ ] CAGR calculator UI still renders.
- [ ] CAGR output remains unchanged for sample positive inputs.
- [ ] CAGR output remains unchanged for zero/invalid/empty inputs.
- [ ] CAGR validation messages remain unchanged.
- [ ] CAGR percentage formatting remains unchanged.
- [ ] CAGR result cards remain visually unchanged.
- [ ] CAGR projection table remains unchanged if present.
- [ ] CAGR chart remains unchanged if present.
- [ ] Calculator tab/selector still works.
- [ ] Compound calculator still works.
- [ ] Retirement calculator still works if present.
- [ ] Formatter bridge fallback still works.
- [ ] Chart math bridge fallback still works.
- [ ] Mobile layout remains unchanged.
- [ ] No duplicate event listeners.
- [ ] No layout shift.

## 6. Fallback/negative checks

- [ ] Temporarily block `cagr-global.js` in devtools/network and confirm page still loads.
- [ ] Confirm local fallback `calculateCagr` and `getCagrBaseResult` preserve displayed CAGR results.
- [ ] Temporarily simulate missing `window.TEKNOIFY_INVESTMENT_CAGR` and confirm no hard failure occurs.
- [ ] Temporarily simulate missing `calculateCagr` or `getCagrBaseResult` on the bridge and confirm local fallbacks preserve behavior.
- [ ] Confirm a thrown bridged `calculateCagr` falls back safely if tested manually.
- [ ] Confirm a thrown bridged `getCagrBaseResult` falls back safely if tested manually.
- [ ] Confirm no CAGR call site was renamed.

Suggested manual simulation examples:

```js
// In a controlled local/devtools-only session, before calculator recalculation:
Object.defineProperty(window, 'TEKNOIFY_INVESTMENT_CAGR', { value: undefined });
```

```js
// If the property descriptor allows replacement in the local test setup:
window.TEKNOIFY_INVESTMENT_CAGR = {
    calculateCagr() {
        throw new Error('Manual smoke-test calculateCagr bridge failure');
    },
    getCagrBaseResult() {
        throw new Error('Manual smoke-test getCagrBaseResult bridge failure');
    }
};
```

Only perform mutation-style simulations in a disposable local browser session. Reload the page between negative checks so one simulation does not affect the next result.

## 7. Manual result section

| Date | Tester | Environment                  | Browser | Result  | Notes                           |
| ---- | ------ | ---------------------------- | ------- | ------- | ------------------------------- |
| TBD  | TBD    | Local / staging / production | TBD     | Not run | Fill after manual smoke testing |

## 8. Future decision gate

- Do not remove local CAGR fallback logic until smoke testing passes.
- Do not extract CAGR DOM/input/render/chart/table/event logic until CAGR bridge behavior is verified.
- Do not extract retirement calculator logic until CAGR bridge behavior is verified.
- If tests pass, future work may continue toward CAGR secondary pure helpers or retirement extraction planning.
- If tests fail, keep local fallbacks and fix bridge loading or helper parity first.

## 9. Relationship to existing docs

Read this smoke test checklist with:

- [`investment-cagr-extraction-plan.md`](investment-cagr-extraction-plan.md)
- [`investment-calculator-extraction-plan.md`](investment-calculator-extraction-plan.md)
- [`investment-compound-bridge-smoke-test.md`](investment-compound-bridge-smoke-test.md)
- [`investment-formatter-bridge-smoke-test.md`](investment-formatter-bridge-smoke-test.md)
- [`investment-chart-math-bridge-smoke-test.md`](investment-chart-math-bridge-smoke-test.md)
- [`investment-module-loading-strategy.md`](investment-module-loading-strategy.md)
- [`../../domains/investment-intelligence/analytics/scripts/calculators/README.md`](../../domains/investment-intelligence/analytics/scripts/calculators/README.md)
