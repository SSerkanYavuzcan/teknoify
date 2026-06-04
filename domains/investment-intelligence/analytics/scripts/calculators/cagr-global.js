import { calculateCagr, getCagrBaseResult } from './cagr.js';

const cagrBridge = Object.freeze({
    calculateCagr,
    getCagrBaseResult
});

const existingUtils = window.TEKNOIFY_INVESTMENT_UTILS;
let exposedOnInvestmentUtils = false;

if (existingUtils && typeof existingUtils === 'object') {
    const existingCalculators = existingUtils.calculators;

    if (
        existingCalculators &&
        typeof existingCalculators === 'object' &&
        !('cagr' in existingCalculators) &&
        Object.isExtensible(existingCalculators)
    ) {
        Object.defineProperty(existingCalculators, 'cagr', {
            value: cagrBridge,
            writable: false,
            configurable: false,
            enumerable: true
        });
        exposedOnInvestmentUtils = true;
    } else if (!existingCalculators && Object.isExtensible(existingUtils)) {
        Object.defineProperty(existingUtils, 'calculators', {
            value: Object.freeze({
                cagr: cagrBridge
            }),
            writable: false,
            configurable: false,
            enumerable: true
        });
        exposedOnInvestmentUtils = true;
    } else if (existingCalculators?.cagr) {
        exposedOnInvestmentUtils = true;
    }
}

if (!exposedOnInvestmentUtils && !window.TEKNOIFY_INVESTMENT_CAGR) {
    Object.defineProperty(window, 'TEKNOIFY_INVESTMENT_CAGR', {
        value: cagrBridge,
        writable: false,
        configurable: false,
        enumerable: false
    });
}
