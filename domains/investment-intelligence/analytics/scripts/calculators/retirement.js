export function safeMoney(value) {
    return Number.isFinite(value) ? Math.max(value, 0) : 0;
}
