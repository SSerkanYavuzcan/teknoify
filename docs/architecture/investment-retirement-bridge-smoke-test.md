# Investment Retirement Bridge Smoke Test

## 1. Title and purpose

This document is the **Phase 5AD manual smoke test checklist and result template** for the Investment Analytics retirement bridge rollout.

Phase 5AD verifies the first retirement bridge consumer migration after `safeMoney` was wrapped to prefer the retirement bridge while preserving local fallback behavior. This checklist is documentation-only and is intended to guide manual validation before any local fallback cleanup or higher-risk retirement extraction continues.

## 2. Scope

In scope for this smoke test:

- `pages/investment-analytics.html`
- `js/investment-analytics.js` retirement wrappers
- `domains/investment-intelligence/analytics/scripts/calculators/retirement.js`
- `domains/investment-intelligence/analytics/scripts/calculators/retirement-global.js`

Out of scope for this smoke test:

- Retirement DOM/input/render extraction
- Retirement chart/table extraction
- Retirement event binding extraction
- Compound calculator extraction
- CAGR calculator extraction
- CSS split
- Route changes
- Data/RAG migration
- Premium gate changes
- Chatbot extraction

## 3. Retirement helper under test

| Helper      | Bridge Export                   | Local Wrapper                               | Expected Behavior                                                                          | Test Status | Notes                                                           |
| ----------- | ------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------- | --------------------------------------------------------------- |
| `safeMoney` | `retirement.safeMoney` / global | `safeMoney` in `js/investment-analytics.js` | Finite positive values return unchanged; finite negative and non-finite values return `0`. | Not run     | First retirement bridge-wrapped helper; local fallback remains. |

## 4. Global bridge verification

Manual checks:

- Open `pages/investment-analytics.html`.
- Open browser devtools console.
- Confirm `window.TEKNOIFY_INVESTMENT_RETIREMENT` exists.
- If available, confirm `window.TEKNOIFY_INVESTMENT_UTILS.calculators.retirement` exists.
- Confirm `safeMoney` is a function on the bridge namespace.
- Confirm sample outputs match expected behavior.

Example console checks:

```js
window.TEKNOIFY_INVESTMENT_RETIREMENT.safeMoney(1000);
window.TEKNOIFY_INVESTMENT_RETIREMENT.safeMoney(-50);
window.TEKNOIFY_INVESTMENT_RETIREMENT.safeMoney(NaN);
window.TEKNOIFY_INVESTMENT_RETIREMENT.safeMoney(Infinity);
```

Expected behavior:

- Finite positive values return the value.
- Finite negative values clamp to `0`.
- Non-finite values return `0`.

## 5. Behavior checklist

- [ ] Investment analytics page loads without console errors.
- [ ] Retirement calculator UI still renders.
- [ ] Retirement output remains unchanged for sample positive inputs.
- [ ] Retirement output remains unchanged for zero/invalid/empty inputs.
- [ ] Retirement validation messages remain unchanged.
- [ ] Retirement target fund/shortfall values remain unchanged.
- [ ] Retirement required additional monthly contribution remains unchanged.
- [ ] Retirement lifecycle table remains unchanged.
- [ ] Retirement chart remains unchanged.
- [ ] Retirement currency/percentage formatting remains unchanged.
- [ ] Calculator tab/selector still works.
- [ ] Compound calculator still works.
- [ ] CAGR calculator still works.
- [ ] Formatter bridge fallback still works.
- [ ] Chart math bridge fallback still works.
- [ ] Mobile layout remains unchanged.
- [ ] No duplicate event listeners.
- [ ] No layout shift.

## 6. Fallback/negative checks

- [ ] Temporarily block `retirement-global.js` in devtools/network and confirm page still loads.
- [ ] Confirm local fallback `safeMoney` preserves displayed retirement results.
- [ ] Temporarily simulate missing `window.TEKNOIFY_INVESTMENT_RETIREMENT` and confirm no hard failure occurs.
- [ ] Temporarily simulate missing `safeMoney` on the bridge and confirm local fallback preserves behavior.
- [ ] Confirm a thrown bridged `safeMoney` falls back safely if tested manually.
- [ ] Confirm no `safeMoney` call site was renamed.

## 7. Manual result section

| Date | Tester | Environment                  | Browser | Result  | Notes                           |
| ---- | ------ | ---------------------------- | ------- | ------- | ------------------------------- |
| TBD  | TBD    | Local / staging / production | TBD     | Not run | Fill after manual smoke testing |

## 8. Future decision gate

- Do not remove local retirement fallback logic until smoke testing passes.
- Do not extract retirement DOM/input/render/chart/table/event logic until retirement bridge behavior is verified.
- Do not extract additional retirement pure helpers until `safeMoney` bridge behavior is verified.
- If tests pass, future work may continue toward additional pure helpers such as `getMonthlyRate` or `discountToToday`.
- If tests fail, keep local fallbacks and fix bridge loading or helper parity first.

## 9. Relationship to existing docs

This smoke test checklist builds on and should be read with:

- [`investment-retirement-extraction-plan.md`](investment-retirement-extraction-plan.md)
- [`investment-calculator-extraction-plan.md`](investment-calculator-extraction-plan.md)
- [`investment-compound-bridge-smoke-test.md`](investment-compound-bridge-smoke-test.md)
- [`investment-cagr-bridge-smoke-test.md`](investment-cagr-bridge-smoke-test.md)
- [`investment-formatter-bridge-smoke-test.md`](investment-formatter-bridge-smoke-test.md)
- [`investment-chart-math-bridge-smoke-test.md`](investment-chart-math-bridge-smoke-test.md)
- [`investment-module-loading-strategy.md`](investment-module-loading-strategy.md)
- [`../../domains/investment-intelligence/analytics/scripts/calculators/README.md`](../../domains/investment-intelligence/analytics/scripts/calculators/README.md)
