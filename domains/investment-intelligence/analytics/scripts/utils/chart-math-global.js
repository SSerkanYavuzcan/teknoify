import {
    buildChartPath,
    getCompoundChartPoint,
    getLineChartConfig,
    getPoint,
    shouldShowChartValueLabel
} from './chart-math.js';

const chartMathBridge = Object.freeze({
    buildChartPath,
    getCompoundChartPoint,
    getLineChartConfig,
    getPoint,
    shouldShowChartValueLabel
});

const existingUtils = window.TEKNOIFY_INVESTMENT_UTILS;

if (
    existingUtils &&
    typeof existingUtils === 'object' &&
    !('chartMath' in existingUtils) &&
    Object.isExtensible(existingUtils)
) {
    Object.defineProperty(existingUtils, 'chartMath', {
        value: chartMathBridge,
        writable: false,
        configurable: false,
        enumerable: true
    });
}

if (!window.TEKNOIFY_INVESTMENT_CHART_MATH) {
    Object.defineProperty(window, 'TEKNOIFY_INVESTMENT_CHART_MATH', {
        value: chartMathBridge,
        writable: false,
        configurable: false,
        enumerable: false
    });
}
