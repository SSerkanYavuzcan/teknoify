import {
    formatNumber,
    formatTlMillion,
    formatUsdCompact,
    formatUsdCurrency,
    parseLocalizedNumber
} from './formatters.js';

const investmentUtilsBridge = Object.freeze({
    formatters: Object.freeze({
        formatNumber,
        formatTlMillion,
        formatUsdCompact,
        formatUsdCurrency,
        parseLocalizedNumber
    })
});

if (!window.TEKNOIFY_INVESTMENT_UTILS) {
    Object.defineProperty(window, 'TEKNOIFY_INVESTMENT_UTILS', {
        value: investmentUtilsBridge,
        writable: false,
        configurable: false,
        enumerable: false
    });
}
