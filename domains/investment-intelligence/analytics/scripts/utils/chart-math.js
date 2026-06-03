export function getPoint(index, value, periods, chartConfig) {
    const { left, top, width, height, maxValue, minValue } = chartConfig;
    const divisor = Math.max(periods.length - 1, 1);
    const valueRange = Math.max(maxValue - minValue, 1);
    const x = left + (index / divisor) * width;
    const y = top + height - ((value - minValue) / valueRange) * height;

    return { x, y };
}

export function getLineChartConfig(options, series) {
    const rawMax = Math.max(...series.flatMap((item) => item.values), 1);
    const rawMin = Math.min(...series.flatMap((item) => item.values), 0);
    const roundedMax = Math.ceil(rawMax / options.axisStep) * options.axisStep;
    const lowerPadding = (roundedMax - rawMin) * 0.04;
    const roundedMin = Math.max(
        0,
        Math.floor((rawMin - lowerPadding) / options.axisStep) * options.axisStep
    );

    if (options.mode === 'modal') {
        return {
            left: 84,
            top: 34,
            width: 940,
            height: 430,
            minValue: roundedMin,
            maxValue: roundedMax,
            viewBox: '0 0 1100 540'
        };
    }

    if (options.variant === 'wide') {
        return {
            left: 86,
            top: 32,
            width: 900,
            height: 330,
            minValue: roundedMin,
            maxValue: roundedMax,
            viewBox: '0 0 1080 430'
        };
    }

    return {
        left: 78,
        top: 30,
        width: 800,
        height: 320,
        minValue: roundedMin,
        maxValue: roundedMax,
        viewBox: '0 0 980 420'
    };
}

export function getCompoundChartPoint(index, value, points, chartConfig) {
    const { left, top, width, height, maxValue } = chartConfig;
    const divisor = Math.max(points.length - 1, 1);
    const x = left + (index / divisor) * width;
    const y = top + height - (value / maxValue) * height;

    return { x, y };
}

export function buildChartPath(points, key, chartConfig) {
    return points
        .map((point, index) => {
            const coordinates = getCompoundChartPoint(index, point[key], points, chartConfig);

            return `${index === 0 ? 'M' : 'L'}${coordinates.x.toFixed(2)} ${coordinates.y.toFixed(2)}`;
        })
        .join(' ');
}

export function shouldShowChartValueLabel(index, totalPoints) {
    if (totalPoints <= 14) return true;
    if (index === 0 || index === totalPoints - 1) return true;

    return index % Math.ceil(totalPoints / 6) === 0;
}
