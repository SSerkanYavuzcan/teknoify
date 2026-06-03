import { growCompoundValue } from './compound-interest.js';

const compoundInterestBridge = Object.freeze({
    growCompoundValue
});

const existingUtils = window.TEKNOIFY_INVESTMENT_UTILS;
let exposedOnInvestmentUtils = false;

if (existingUtils && typeof existingUtils === 'object') {
    const existingCalculators = existingUtils.calculators;

    if (
        existingCalculators &&
        typeof existingCalculators === 'object' &&
        !('compoundInterest' in existingCalculators) &&
        Object.isExtensible(existingCalculators)
    ) {
        Object.defineProperty(existingCalculators, 'compoundInterest', {
            value: compoundInterestBridge,
            writable: false,
            configurable: false,
            enumerable: true
        });
        exposedOnInvestmentUtils = true;
    } else if (!existingCalculators && Object.isExtensible(existingUtils)) {
        Object.defineProperty(existingUtils, 'calculators', {
            value: Object.freeze({
                compoundInterest: compoundInterestBridge
            }),
            writable: false,
            configurable: false,
            enumerable: true
        });
        exposedOnInvestmentUtils = true;
    } else if (existingCalculators?.compoundInterest) {
        exposedOnInvestmentUtils = true;
    }
}

if (!exposedOnInvestmentUtils && !window.TEKNOIFY_INVESTMENT_COMPOUND_INTEREST) {
    Object.defineProperty(window, 'TEKNOIFY_INVESTMENT_COMPOUND_INTEREST', {
        value: compoundInterestBridge,
        writable: false,
        configurable: false,
        enumerable: false
    });
}
