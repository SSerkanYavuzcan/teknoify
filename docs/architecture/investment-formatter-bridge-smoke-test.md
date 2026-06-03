# Investment Analytics Formatter Bridge Smoke Test

## 1. Title and purpose

This document is the **Phase 5J manual smoke test checklist and result template** for the Investment Analytics formatter bridge rollout. It records the checks that should be run after the Phase 5G pure formatter module and global bridge, the Phase 5H page loading change, and the Phase 5I first consumer migration that reads formatter helpers through `window.TEKNOIFY_INVESTMENT_UTILS.formatters` with local fallbacks.

The purpose is to verify that the bridge-wrapped formatter behavior remains compatible with the existing Investment Analytics page before local fallback formatter logic is removed or higher-risk extraction work begins.

## 2. Scope

In scope for this smoke test:

- `pages/investment-analytics.html`
- `js/investment-analytics.js` formatter wrappers
- `domains/investment-intelligence/analytics/scripts/utils/formatters.js`
- `domains/investment-intelligence/analytics/scripts/utils/formatters-global.js`

Out of scope for this smoke test:

- Calculator extraction
- Chart extraction
- CSS split
- Route changes
- Data/RAG migration
- Premium gate changes
- Chatbot extraction

## 3. Formatter functions under test

| Formatter              | Bridge Export          | Local Wrapper          | Expected Behavior                                                          | Test Status | Notes                                                                                 |
| ---------------------- | ---------------------- | ---------------------- | -------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------- |
| `formatNumber`         | `formatNumber`         | `formatNumber`         | Formats rounded values with the current Turkish locale thousands style.    | Not run     | Compare chart, table, and calculator number labels against the pre-bridge baseline.   |
| `formatUsdCompact`     | `formatUsdCompact`     | `formatUsdCompact`     | Formats USD values as compact rounded thousand labels with a `$` prefix.   | Not run     | Used by Investment Analytics chart axes, endpoint labels, and tooltip values.         |
| `formatTlMillion`      | `formatTlMillion`      | `formatTlMillion`      | Formats TL-denominated million values with current Turkish locale output.  | Not run     | Verify visual parity in TL million labels and tables.                                 |
| `parseLocalizedNumber` | `parseLocalizedNumber` | `parseLocalizedNumber` | Parses localized numeric input using the current local fallback semantics. | Not run     | Confirm Turkish-style calculator inputs continue to be accepted without hard failure. |
| `formatUsdCurrency`    | `formatUsdCurrency`    | `formatUsdCurrency`    | Formats finite values as whole-dollar `en-US` currency strings.            | Not run     | Used by calculator result cards, chart labels, and projection/breakdown tables.       |

Initial test status for every formatter is **Not run** until the manual result section is completed.

## 4. Global bridge verification

Run these checks manually in a browser:

- Open `pages/investment-analytics.html`.
- Open the browser devtools console.
- Confirm `window.TEKNOIFY_INVESTMENT_UTILS` exists.
- Confirm `window.TEKNOIFY_INVESTMENT_UTILS.formatters` exists.
- Confirm each formatter export is a function.
- Confirm sample outputs match the expected values for the current formatter contract and the local wrapper fallback behavior.

Example console checks:

- `window.TEKNOIFY_INVESTMENT_UTILS.formatters.formatNumber(1234567)`
- `window.TEKNOIFY_INVESTMENT_UTILS.formatters.formatUsdCompact(1500000)`
- `window.TEKNOIFY_INVESTMENT_UTILS.formatters.formatTlMillion(250000000)`
- `window.TEKNOIFY_INVESTMENT_UTILS.formatters.parseLocalizedNumber("1.234,56")`
- `window.TEKNOIFY_INVESTMENT_UTILS.formatters.formatUsdCurrency(1234.56)`

```js
window.TEKNOIFY_INVESTMENT_UTILS;
window.TEKNOIFY_INVESTMENT_UTILS.formatters;
typeof window.TEKNOIFY_INVESTMENT_UTILS.formatters.formatNumber === 'function';
typeof window.TEKNOIFY_INVESTMENT_UTILS.formatters.formatUsdCompact === 'function';
typeof window.TEKNOIFY_INVESTMENT_UTILS.formatters.formatTlMillion === 'function';
typeof window.TEKNOIFY_INVESTMENT_UTILS.formatters.parseLocalizedNumber === 'function';
typeof window.TEKNOIFY_INVESTMENT_UTILS.formatters.formatUsdCurrency === 'function';
```

Sample output checks:

```js
window.TEKNOIFY_INVESTMENT_UTILS.formatters.formatNumber(1234567);
window.TEKNOIFY_INVESTMENT_UTILS.formatters.formatUsdCompact(1500000);
window.TEKNOIFY_INVESTMENT_UTILS.formatters.formatTlMillion(250000000);
window.TEKNOIFY_INVESTMENT_UTILS.formatters.parseLocalizedNumber('1.234,56');
window.TEKNOIFY_INVESTMENT_UTILS.formatters.formatUsdCurrency(1234.56);
```

Expected sample outputs under the current Phase 5G/5I contract:

| Console check                      | Expected output |
| ---------------------------------- | --------------- |
| `formatNumber(1234567)`            | `"1.234.567"`   |
| `formatUsdCompact(1500000)`        | `"$1.500K"`     |
| `formatTlMillion(250000000)`       | `"250.000.000"` |
| `parseLocalizedNumber("1.234,56")` | `1.234`         |
| `formatUsdCurrency(1234.56)`       | `"$1,235"`      |

If a browser/locale environment returns a different string, compare it with the existing local wrapper output before treating it as a bridge failure.

## 5. Behavior checklist

- [ ] Investment analytics page loads without console errors.
- [ ] Sector selector still works.
- [ ] Retail panel still renders.
- [ ] Airlines panel still renders.
- [ ] Calculator outputs still render.
- [ ] Chart labels remain visually consistent.
- [ ] Table values remain visually consistent.
- [ ] USD compact values remain visually consistent.
- [ ] TL million values remain visually consistent.
- [ ] Localized number parsing still accepts Turkish-style values.
- [ ] Chatbot/mock assistant still works if present.
- [ ] Premium gate behavior remains unchanged.
- [ ] No duplicate bridge/global warnings.
- [ ] No visual layout regression.

## 6. Fallback/negative checks

- [ ] Temporarily block `formatters-global.js` in devtools/network and confirm page still loads.
- [ ] Confirm local fallback formatters still preserve displayed values.
- [ ] Temporarily simulate missing `window.TEKNOIFY_INVESTMENT_UTILS` and confirm no hard failure occurs.
- [ ] Temporarily simulate missing formatter functions and confirm local fallbacks preserve behavior.
- [ ] Confirm a thrown bridged formatter falls back safely if tested manually.
- [ ] Confirm no formatter call site was renamed.

## 7. Manual result section

| Date | Tester | Environment                  | Browser | Result  | Notes                           |
| ---- | ------ | ---------------------------- | ------- | ------- | ------------------------------- |
| TBD  | TBD    | Local / staging / production | TBD     | Not run | Fill after manual smoke testing |

## 8. Future decision gate

- Do not remove local fallback formatter logic until smoke testing passes.
- Do not extract calculators/charts before formatter bridge behavior is verified.
- If tests pass, future work may continue toward chart/SVG helper extraction or calculator extraction planning.
- If tests fail, keep local fallbacks and fix bridge loading or formatter parity first.

## 9. Relationship to existing docs

- [Investment Module Loading Strategy](investment-module-loading-strategy.md)
- [Investment Utility Extraction Checklist](investment-utility-extraction-checklist.md)
- [Investment Frontend Split Plan](investment-frontend-split-plan.md)
- [Investment Analytics Utils README](../../domains/investment-intelligence/analytics/scripts/utils/README.md)
