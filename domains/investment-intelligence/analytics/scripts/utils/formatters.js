export function formatNumber(value) {
    return Math.round(value).toLocaleString('tr-TR');
}

export function formatUsdCompact(value) {
    return `$${Math.round(value / 1000).toLocaleString('tr-TR')}K`;
}

export function formatTlMillion(value) {
    return Number(value).toLocaleString('tr-TR', {
        maximumFractionDigits: 3
    });
}

export function parseLocalizedNumber(value) {
    const normalizedValue = String(value ?? '')
        .replace(/\s/g, '')
        .replace(',', '.');
    const numberValue = Number.parseFloat(normalizedValue);

    return Number.isFinite(numberValue) ? numberValue : 0;
}

export function formatUsdCurrency(value) {
    const safeValue = Number.isFinite(value) ? value : 0;

    return safeValue.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    });
}
