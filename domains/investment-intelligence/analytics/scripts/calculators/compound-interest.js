export function growCompoundValue(value, years, annualRate, compoundingPeriodsPerYear) {
    if (!Number.isFinite(value) || value <= 0 || years <= 0) {
        return Number.isFinite(value) ? Math.max(value, 0) : 0;
    }

    const periodRate = annualRate / compoundingPeriodsPerYear;
    const growthBase = 1 + periodRate;

    if (growthBase <= 0) return 0;

    const grownValue = value * growthBase ** (compoundingPeriodsPerYear * years);

    return Number.isFinite(grownValue) ? Math.max(grownValue, 0) : 0;
}
