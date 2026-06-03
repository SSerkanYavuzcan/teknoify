# Investment Compound Bridge Smoke Test

## 1. Title and purpose

This document is the **Phase 5T Investment Analytics compound interest bridge smoke test checklist and result template** for Teknoify.

Phase 5T documents manual smoke testing for the Investment Analytics compound interest bridge rollout after the first compound calculator consumer migration. The purpose is to verify that `growCompoundValue` can safely use the compound interest bridge when it is available, while preserving the local fallback behavior in `js/investment-analytics.js` when the bridge is missing, malformed, incomplete, or throws.

This is documentation-only. It does not change runtime pages, JavaScript, compound calculator modules, formatter/chart modules, CSS, data files, scripts, workflows, or package configuration.

## 2. Scope

In scope for this smoke test:

- `pages/investment-analytics.html`
- `js/investment-analytics.js` `growCompoundValue` wrapper
- `domains/investment-intelligence/analytics/scripts/calculators/compound-interest.js`
- `domains/investment-intelligence/analytics/scripts/calculators/compound-interest-global.js`

Out of scope for this smoke test:

- CAGR calculator extraction
- Retirement calculator extraction
- Compound calculator DOM/input/render extraction
- Chart renderer extraction
- CSS split
- Route changes
- Data/RAG migration
- Premium gate changes
- Chatbot extraction

## 3. Helper under test

| Helper              | Bridge Export                                                                                                                                                            | Local Wrapper                                      | Expected Behavior                                                                                                                                                                                                                                                                                          | Test Status | Notes                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------- |
| `growCompoundValue` | `window.TEKNOIFY_INVESTMENT_COMPOUND_INTEREST.growCompoundValue` and, when extensible, `window.TEKNOIFY_INVESTMENT_UTILS.calculators.compoundInterest.growCompoundValue` | `js/investment-analytics.js` `growCompoundValue()` | Returns a finite, non-negative compounded value for valid inputs; returns `0` or the non-negative original value for invalid, zero, negative, or non-growing edge cases according to current helper parity; falls back to the local implementation if bridge lookup or execution is unavailable or unsafe. | Not run     | First and only compound calculator helper migrated so far; broader compound DOM/render logic remains local. |

## 4. Global bridge verification

Manual checks:

- Open `pages/investment-analytics.html`.
- Open browser devtools console.
- Confirm `window.TEKNOIFY_INVESTMENT_COMPOUND_INTEREST` exists when the standalone fallback namespace is used.
- If available, confirm `window.TEKNOIFY_INVESTMENT_UTILS.calculators.compoundInterest` exists.
- Confirm `growCompoundValue` is a function on the bridge namespace that is present.
- Confirm sample outputs match the expected shape and current helper behavior.

Example console checks:

```js
window.TEKNOIFY_INVESTMENT_COMPOUND_INTEREST.growCompoundValue(1000, 0.1, 1);
window.TEKNOIFY_INVESTMENT_COMPOUND_INTEREST.growCompoundValue(1000, 0.1, 2);
window.TEKNOIFY_INVESTMENT_COMPOUND_INTEREST.growCompoundValue(0, 0.1, 10);
window.TEKNOIFY_INVESTMENT_COMPOUND_INTEREST.growCompoundValue(1000, 0, 10);
```

Expected shape/behavior for the example checks:

- Each call should return a number, not throw.
- Returned values should be finite and non-negative.
- Zero starting value should remain non-negative and should not produce `NaN`.
- Zero or non-growing duration/rate edge cases should preserve current helper parity rather than hard-failing.
- Exact numeric expectations should be recorded only after confirming the active bridge signature and current local wrapper behavior in the tested environment.

Optional parity checks with the current four-argument helper signature:

```js
window.TEKNOIFY_INVESTMENT_COMPOUND_INTEREST.growCompoundValue(1000, 1, 0.1, 1); // Expected: 1100
window.TEKNOIFY_INVESTMENT_COMPOUND_INTEREST.growCompoundValue(1000, 2, 0.1, 1); // Expected: 1210
window.TEKNOIFY_INVESTMENT_COMPOUND_INTEREST.growCompoundValue(0, 10, 0.1, 1); // Expected: 0
window.TEKNOIFY_INVESTMENT_COMPOUND_INTEREST.growCompoundValue(1000, 10, 0, 1); // Expected: 1000
```

If the compound helper is exposed through `window.TEKNOIFY_INVESTMENT_UTILS.calculators.compoundInterest`, repeat the same checks against that namespace:

```js
window.TEKNOIFY_INVESTMENT_UTILS.calculators.compoundInterest.growCompoundValue(1000, 1, 0.1, 1);
```

## 5. Behavior checklist

- [ ] Investment analytics page loads without console errors.
- [ ] Compound interest calculator still renders.
- [ ] Compound interest result value remains unchanged for sample inputs.
- [ ] Compound breakdown values remain unchanged for sample inputs.
- [ ] Compound chart still renders.
- [ ] Currency/number formatting remains unchanged.
- [ ] Empty/default inputs behave the same.
- [ ] Invalid inputs behave the same.
- [ ] Calculator tab/selector still works.
- [ ] Chart math bridge fallback still works.
- [ ] Formatter bridge fallback still works.
- [ ] Mobile layout remains unchanged.
- [ ] No duplicate event listeners.
- [ ] No layout shift.

## 6. Fallback/negative checks

- [ ] Temporarily block `compound-interest-global.js` in devtools/network and confirm page still loads.
- [ ] Confirm local fallback `growCompoundValue` preserves displayed compound results.
- [ ] Temporarily simulate missing `window.TEKNOIFY_INVESTMENT_COMPOUND_INTEREST` and confirm no hard failure occurs.
- [ ] Temporarily simulate missing `growCompoundValue` on the bridge and confirm local fallback preserves behavior.
- [ ] Confirm a thrown bridged `growCompoundValue` falls back safely if tested manually.
- [ ] Confirm no `growCompoundValue` call site was renamed.

Suggested manual simulation examples:

```js
// In a controlled local/devtools-only session, before calculator recalculation:
Object.defineProperty(window, 'TEKNOIFY_INVESTMENT_COMPOUND_INTEREST', { value: undefined });
```

```js
// If the property descriptor allows replacement in the local test setup:
window.TEKNOIFY_INVESTMENT_COMPOUND_INTEREST = {
    growCompoundValue() {
        throw new Error('Manual smoke-test bridge failure');
    }
};
```

Only perform mutation-style simulations in a disposable local browser session. Reload the page between negative checks so one simulation does not affect the next result.

## 7. Manual result section

| Date | Tester | Environment                  | Browser | Result  | Notes                           |
| ---- | ------ | ---------------------------- | ------- | ------- | ------------------------------- |
| TBD  | TBD    | Local / staging / production | TBD     | Not run | Fill after manual smoke testing |

## 8. Future decision gate

- Do not remove local `growCompoundValue` fallback logic until smoke testing passes.
- Do not extract compound DOM/input/render logic until `growCompoundValue` bridge behavior is verified.
- Do not extract CAGR or retirement calculator logic until compound bridge behavior is verified.
- If tests pass, future work may continue toward more compound math helpers or another calculator extraction plan.
- If tests fail, keep local fallbacks and fix bridge loading or helper parity first.

## 9. Relationship to existing docs

Read this smoke test checklist with:

- [`investment-calculator-extraction-plan.md`](investment-calculator-extraction-plan.md)
- [`investment-module-loading-strategy.md`](investment-module-loading-strategy.md)
- [`investment-frontend-split-plan.md`](investment-frontend-split-plan.md)
- [`investment-formatter-bridge-smoke-test.md`](investment-formatter-bridge-smoke-test.md)
- [`investment-chart-math-bridge-smoke-test.md`](investment-chart-math-bridge-smoke-test.md)
- [`../../domains/investment-intelligence/analytics/scripts/calculators/README.md`](../../domains/investment-intelligence/analytics/scripts/calculators/README.md)
