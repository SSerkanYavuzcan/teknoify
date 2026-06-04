export function getCagrBaseResult(inputs, cagr, endingValue, durationYears, titleValue = 'CAGR') {
    const totalReturn = endingValue / inputs.beginningValue - 1;
    const absoluteGain = endingValue - inputs.beginningValue;
    const realCagr = (1 + cagr) / (1 + inputs.inflationRate) - 1;

    return {
        valid: true,
        titleValue,
        beginningValue: inputs.beginningValue,
        endingValue,
        cagr,
        totalReturn,
        absoluteGain,
        realCagr,
        durationYears
    };
}

export function calculateCagr(inputs) {
    if (inputs.validationMessage) return { valid: false, message: inputs.validationMessage };
    if (inputs.beginningValue <= 0)
        return { valid: false, message: "Başlangıç değeri 0'dan büyük olmalıdır." };
    if (inputs.endingValue <= 0)
        return { valid: false, message: "Bitiş değeri 0'dan büyük olmalıdır." };
    if (inputs.durationYears <= 0) return { valid: false, message: "Süre 0'dan büyük olmalıdır." };

    const cagr = (inputs.endingValue / inputs.beginningValue) ** (1 / inputs.durationYears) - 1;

    if (!Number.isFinite(cagr))
        return { valid: false, message: 'Bu değerlerle CAGR hesaplanamadı.' };

    return getCagrBaseResult(inputs, cagr, inputs.endingValue, inputs.durationYears);
}
