# Investment Chart Math Bridge Smoke Test

## 1. Title and purpose

Phase 5O documents manual smoke testing for the Investment Analytics chart math bridge rollout. It captures the checks that should be completed after the first chart math consumer migration and before local chart math fallbacks are removed or higher-risk chart renderer extraction begins.

This is a checklist and result document only. It does not change runtime pages, JavaScript, chart math modules, formatter modules, CSS, data files, scripts, workflows, or package configuration.

## 2. Scope

In scope for this manual smoke test:

- `pages/investment-analytics.html`
- `js/investment-analytics.js` chart math wrappers
- `domains/investment-intelligence/analytics/scripts/utils/chart-math.js`
- `domains/investment-intelligence/analytics/scripts/utils/chart-math-global.js`

Out of scope for this smoke test:

- Full chart renderer extraction
- SVG DOM creation extraction
- Tooltip/event wiring
- Calculator extraction
- CSS split
- Route changes
- Data/RAG migration
- Premium gate changes
- Chatbot extraction

## 3. Chart math helpers under test

Initial test status for each helper is **Not run**.

| Helper                      | Bridge Export               | Local Wrapper               | Expected Behavior                                                                  | Test Status | Notes                                                         |
| --------------------------- | --------------------------- | --------------------------- | ---------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------- |
| `getPoint`                  | `getPoint`                  | `getPoint`                  | Returns a coordinate object with numeric `x` and `y` values for line chart points. | Not run     | Verify parity between bridge output and local fallback shape. |
| `getLineChartConfig`        | `getLineChartConfig`        | `getLineChartConfig`        | Returns a line chart config object with dimensions, min/max values, and `viewBox`. | Not run     | Verify axis scaling and selected variant remain consistent.   |
| `getCompoundChartPoint`     | `getCompoundChartPoint`     | `getCompoundChartPoint`     | Returns a coordinate object with numeric `x` and `y` values for calculator charts. | Not run     | Verify compound chart coordinate placement remains stable.    |
| `buildChartPath`            | `buildChartPath`            | `buildChartPath`            | Returns an SVG path string for calculator chart series points.                     | Not run     | Verify path command shape remains visually consistent.        |
| `shouldShowChartValueLabel` | `shouldShowChartValueLabel` | `shouldShowChartValueLabel` | Returns a boolean that controls chart value label cadence.                         | Not run     | Verify label density remains unchanged.                       |

## 4. Global bridge verification

Manual bridge checks:

1. Open `pages/investment-analytics.html` in a browser.
2. Open browser devtools and switch to the console.
3. Confirm `window.TEKNOIFY_INVESTMENT_CHART_MATH` exists.
4. If available, confirm `window.TEKNOIFY_INVESTMENT_UTILS.chartMath` exists.
5. Confirm each chart math export is a function.
6. Confirm sample outputs match expected shapes and types.

Suggested console checks:

```js
typeof window.TEKNOIFY_INVESTMENT_CHART_MATH;
typeof window.TEKNOIFY_INVESTMENT_CHART_MATH.getPoint;
typeof window.TEKNOIFY_INVESTMENT_CHART_MATH.getLineChartConfig;
typeof window.TEKNOIFY_INVESTMENT_CHART_MATH.getCompoundChartPoint;
typeof window.TEKNOIFY_INVESTMENT_CHART_MATH.buildChartPath;
typeof window.TEKNOIFY_INVESTMENT_CHART_MATH.shouldShowChartValueLabel;
window.TEKNOIFY_INVESTMENT_UTILS?.chartMath;
```

Coverage examples for the five bridge-wrapped helpers include:

- `window.TEKNOIFY_INVESTMENT_CHART_MATH.getLineChartConfig([1, 2, 3])`
- `window.TEKNOIFY_INVESTMENT_CHART_MATH.getPoint(0, 1, 1, 3, 300, 120)`
- `window.TEKNOIFY_INVESTMENT_CHART_MATH.getCompoundChartPoint(0, 100, 100, 200, 300, 120)`
- `window.TEKNOIFY_INVESTMENT_CHART_MATH.buildChartPath([{ x: 0, y: 10 }, { x: 100, y: 20 }])`
- `window.TEKNOIFY_INVESTMENT_CHART_MATH.shouldShowChartValueLabel(0, 5)`

Use the current bridge function signatures when executing shape checks. Example shape/type checks:

```js
const chartMath = window.TEKNOIFY_INVESTMENT_CHART_MATH;
const lineConfig = chartMath.getLineChartConfig({ axisStep: 1, variant: 'wide' }, [
    { values: [1, 2, 3] }
]);
const point = chartMath.getPoint(0, 1, ['A', 'B', 'C'], lineConfig);
const compoundConfig = {
    left: 0,
    top: 0,
    width: 300,
    height: 120,
    maxValue: 200
};
const compoundPoints = [{ value: 100 }, { value: 200 }];
const compoundPoint = chartMath.getCompoundChartPoint(0, 100, compoundPoints, compoundConfig);
const path = chartMath.buildChartPath(compoundPoints, 'value', compoundConfig);
const showLabel = chartMath.shouldShowChartValueLabel(0, 5);

({ lineConfig, point, compoundPoint, path, showLabel });
```

Expected shapes and types:

- `lineConfig` is an object with numeric chart dimensions, numeric `minValue`/`maxValue`, and a string `viewBox`.
- `point` is an object with numeric `x` and `y` values.
- `compoundPoint` is an object with numeric `x` and `y` values.
- `path` is a non-empty SVG path string.
- `showLabel` is a boolean.

Do not treat minor floating-point representation differences as failures unless they create visible chart, axis, path, or label regressions.

## 5. Behavior checklist

Manual behavior checks:

- [ ] Investment analytics page loads without console errors.
- [ ] Compound growth chart still renders.
- [ ] Retirement chart still renders.
- [ ] Any sector charts still render if present.
- [ ] SVG line paths remain visually consistent.
- [ ] Axis/scale behavior remains visually consistent.
- [ ] Value labels remain visually consistent.
- [ ] Chart summaries still render.
- [ ] Calculator outputs remain unchanged.
- [ ] Sector switching still works.
- [ ] Mobile/responsive chart layout still works.
- [ ] No duplicate event listeners.
- [ ] No layout shift.
- [ ] No chart tooltip/accessibility regression if applicable.

## 6. Fallback/negative checks

Manual fallback and negative checks:

- [ ] Temporarily block `chart-math-global.js` in devtools/network and confirm page still loads.
- [ ] Confirm local fallback chart math helpers preserve displayed chart behavior.
- [ ] Temporarily simulate missing `window.TEKNOIFY_INVESTMENT_CHART_MATH` and confirm no hard failure occurs.
- [ ] Temporarily simulate missing helper functions and confirm local fallbacks preserve behavior.
- [ ] Confirm a thrown bridged helper falls back safely if tested manually.
- [ ] Confirm no chart math call site was renamed.

## 7. Manual result section

| Date | Tester | Environment                  | Browser | Result  | Notes                           |
| ---- | ------ | ---------------------------- | ------- | ------- | ------------------------------- |
| TBD  | TBD    | Local / staging / production | TBD     | Not run | Fill after manual smoke testing |

## 8. Future decision gate

Use this Phase 5O smoke test as a decision gate before additional chart work:

- Do not remove local chart math fallback logic until smoke testing passes.
- Do not extract full chart renderers until chart math bridge behavior is verified.
- Do not extract calculator chart renderers until chart math bridge behavior is verified.
- If tests pass, future work may continue toward SVG utility extraction or chart renderer extraction planning.
- If tests fail, keep local fallbacks and fix bridge loading or helper parity first.

## 9. Relationship to existing docs

Related documentation:

- [`investment-chart-svg-extraction-checklist.md`](investment-chart-svg-extraction-checklist.md)
- [`investment-module-loading-strategy.md`](investment-module-loading-strategy.md)
- [`investment-frontend-split-plan.md`](investment-frontend-split-plan.md)
- [`investment-formatter-bridge-smoke-test.md`](investment-formatter-bridge-smoke-test.md)
- [`../../domains/investment-intelligence/analytics/scripts/utils/README.md`](../../domains/investment-intelligence/analytics/scripts/utils/README.md)
