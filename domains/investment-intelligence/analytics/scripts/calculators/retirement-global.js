import { safeMoney } from './retirement.js';

const retirementBridge = Object.freeze({
    safeMoney
});

const existingUtils = window.TEKNOIFY_INVESTMENT_UTILS;
let exposedOnInvestmentUtils = false;

if (existingUtils && typeof existingUtils === 'object') {
    const existingCalculators = existingUtils.calculators;

    if (
        existingCalculators &&
        typeof existingCalculators === 'object' &&
        !('retirement' in existingCalculators) &&
        Object.isExtensible(existingCalculators)
    ) {
        Object.defineProperty(existingCalculators, 'retirement', {
            value: retirementBridge,
            writable: false,
            configurable: false,
            enumerable: true
        });
        exposedOnInvestmentUtils = true;
    } else if (!existingCalculators && Object.isExtensible(existingUtils)) {
        Object.defineProperty(existingUtils, 'calculators', {
            value: Object.freeze({
                retirement: retirementBridge
            }),
            writable: false,
            configurable: false,
            enumerable: true
        });
        exposedOnInvestmentUtils = true;
    } else if (existingCalculators?.retirement) {
        exposedOnInvestmentUtils = true;
    }
}

if (!exposedOnInvestmentUtils && !window.TEKNOIFY_INVESTMENT_RETIREMENT) {
    Object.defineProperty(window, 'TEKNOIFY_INVESTMENT_RETIREMENT', {
        value: retirementBridge,
        writable: false,
        configurable: false,
        enumerable: false
    });
}
