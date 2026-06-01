(function () {
    const supermarketDatasetUrl = "../data/investment-analytics/supermarket_dataset.json";
    const usdTryRatesUrl = "../data/currency/usd_try_rates.json";
    const operatingProfitPerStoreChartMountId = "retail-operating-profit-per-store-chart";
    const svgNamespace = "http://www.w3.org/2000/svg";
    const defaultSectorKey = "retail";
    let supermarketDataset = null;
    let supermarketDatasetPromise = null;
    let activeSectorKey = defaultSectorKey;
    let usdTryRatesPromise = null;

    function createSvgElement(tagName, attributes = {}) {
        const element = document.createElementNS(svgNamespace, tagName);

        Object.entries(attributes).forEach(([name, value]) => {
            element.setAttribute(name, value);
        });

        return element;
    }

    function formatNumber(value) {
        return Math.round(value).toLocaleString("tr-TR");
    }

    function formatUsdCompact(value) {
        return `$${Math.round(value / 1000).toLocaleString("tr-TR")}K`;
    }

    function formatTlMillion(value) {
        return Number(value).toLocaleString("tr-TR", {
            maximumFractionDigits: 3
        });
    }

    function getCompanies() {
        return supermarketDataset?.companies ?? [];
    }

    function getPeriods() {
        const metaPeriods = supermarketDataset?.meta?.periods;

        if (Array.isArray(metaPeriods) && metaPeriods.length) {
            return metaPeriods;
        }

        const firstCompany = getCompanies()[0];
        const firstMetric = firstCompany?.storeCounts ?? [];

        return firstMetric.map((item) => item.period).filter(Boolean);
    }

    function normalizeMetricPoint(rawPoint, index, periods) {
        if (typeof rawPoint === "number") {
            return {
                period: periods[index] ?? "",
                value: rawPoint,
                note: null,
                sourceTitle: null,
                sourceUrl: null,
                sourceRef: null,
                derivePerStoreUsdFrom: null
            };
        }

        return {
            period: rawPoint?.period ?? periods[index] ?? "",
            value: rawPoint?.value,
            note: rawPoint?.note ?? null,
            sourceTitle: rawPoint?.sourceTitle ?? null,
            sourceUrl: rawPoint?.sourceUrl ?? null,
            sourceRef: rawPoint?.sourceRef ?? null,
            derivePerStoreUsdFrom: rawPoint?.derivePerStoreUsdFrom ?? null
        };
    }

    function normalizeMetricPoints(metricValues, periods) {
        return (metricValues ?? []).map((item, index) => normalizeMetricPoint(item, index, periods));
    }

    function isValidMetricValue(value) {
        return Number.isFinite(value);
    }

    function isMissingMetricValue(value) {
        return value === null || value === undefined;
    }

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"]/g, (character) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "\"": "&quot;"
        }[character]));
    }

    function clampNumber(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function getCompactTooltipNote(note, maxLength = 110) {
        const compactNote = String(note ?? "").replace(/\s+/g, " ").trim();

        if (compactNote.length <= maxLength) {
            return compactNote;
        }

        const trimmedNote = compactNote.slice(0, maxLength).trimEnd();
        const lastSpaceIndex = trimmedNote.lastIndexOf(" ");
        const summary = lastSpaceIndex > 64 ? trimmedNote.slice(0, lastSpaceIndex) : trimmedNote;

        return `${summary}…`;
    }

    function resolvePointSource(pointData) {
        const financials = pointData.quarterlyFinancials ?? null;
        const sourceRef = pointData.sourceRef ?? financials?.sourceRef ?? null;
        const referencedSource = sourceRef
            ? supermarketDataset?.sourceRefs?.[sourceRef]
            : null;

        return {
            title: pointData.sourceTitle ?? financials?.sourceTitle ?? referencedSource?.title ?? null,
            url: pointData.sourceUrl ?? financials?.sourceUrl ?? referencedSource?.url ?? null
        };
    }

    function showErrorState(mountId, message) {
        const mount = document.getElementById(mountId);
        if (!mount) return;

        mount.textContent = "";
        const error = document.createElement("div");
        error.className = "investment-chart-error";
        error.textContent = message;
        mount.appendChild(error);
    }
    function parseQuarterPeriod(period) {
        const match = String(period ?? "").trim().match(/^(\d{4})\s+([1-4])Ç$/);

        if (!match) return null;

        return {
            year: Number(match[1]),
            quarter: Number(match[2])
        };
    }

    function getQuarterDateBounds(period) {
        const parsedPeriod = parseQuarterPeriod(period);

        if (!parsedPeriod) return null;

        const startMonth = (parsedPeriod.quarter - 1) * 3 + 1;
        const endMonth = startMonth + 2;
        const startDate = `${parsedPeriod.year}-${String(startMonth).padStart(2, "0")}-01`;
        const endDate = new Date(Date.UTC(parsedPeriod.year, endMonth, 0))
            .toISOString()
            .slice(0, 10);

        return { startDate, endDate };
    }

    async function loadUsdTryRates() {
        if (!usdTryRatesPromise) {
            usdTryRatesPromise = fetch(usdTryRatesUrl, { cache: "no-cache" })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(`USD/TRY rates request failed: ${response.status}`);
                    }

                    return response.json();
                });
        }

        return usdTryRatesPromise;
    }

    function getValidUsdTryRates(data) {
        if (!Array.isArray(data?.rates)) return [];

        return data.rates.filter((rate) => (
            /^\d{4}-\d{2}-\d{2}$/.test(rate?.date)
                && Number.isFinite(rate?.usdTry)
        ));
    }

    async function getQuarterAverageUsdTry(period) {
        const bounds = getQuarterDateBounds(period);

        if (!bounds) return null;

        const data = await loadUsdTryRates();
        const rates = getValidUsdTryRates(data).filter((rate) => (
            rate.date >= bounds.startDate && rate.date <= bounds.endDate
        ));

        if (!rates.length) return null;

        return rates.reduce((sum, rate) => sum + rate.usdTry, 0) / rates.length;
    }

    async function applyDerivedPerStoreUsdValues() {
        const calculations = [];

        getCompanies().forEach((company) => {
            ["revenuePerStoreUsd", "operatingProfitPerStoreUsd"].forEach((metricKey) => {
                (company[metricKey] ?? []).forEach((point) => {
                    if (!point?.derivePerStoreUsdFrom) return;

                    const financials = (company.quarterlyFinancials ?? [])
                        .find((item) => item.period === point.period);
                    const tlMillion = financials?.[point.derivePerStoreUsdFrom];
                    const storeCount = financials?.totalStoreCount;

                    if (!Number.isFinite(tlMillion) || !Number.isFinite(storeCount) || storeCount <= 0) return;

                    calculations.push(getQuarterAverageUsdTry(point.period).then((quarterAverageUsdTry) => {
                        if (!Number.isFinite(quarterAverageUsdTry) || quarterAverageUsdTry <= 0) return;

                        point.value = (tlMillion * 1000000) / storeCount / quarterAverageUsdTry;
                    }));
                });
            });
        });

        await Promise.all(calculations);
    }


    function renderLegend(container, series) {
        const legend = document.createElement("div");
        legend.className = "investment-chart-legend";

        series.forEach((item) => {
            const legendItem = document.createElement("span");
            const marker = document.createElement("span");
            marker.style.backgroundColor = item.color;
            marker.style.color = item.color;

            legendItem.append(marker, item.name);
            legend.appendChild(legendItem);
        });

        container.appendChild(legend);
    }

    function getPoint(index, value, periods, chartConfig) {
        const { left, top, width, height, maxValue, minValue } = chartConfig;
        const divisor = Math.max(periods.length - 1, 1);
        const valueRange = Math.max(maxValue - minValue, 1);
        const x = left + (index / divisor) * width;
        const y = top + height - ((value - minValue) / valueRange) * height;

        return { x, y };
    }

    function renderLineGrid(svg, chartConfig, formatAxisValue) {
        const { left, top, width, height, maxValue, minValue } = chartConfig;
        const gridSteps = 4;

        for (let step = 0; step <= gridSteps; step += 1) {
            const y = top + (height / gridSteps) * step;
            const value = maxValue - ((maxValue - minValue) / gridSteps) * step;

            svg.appendChild(createSvgElement("line", {
                x1: left,
                y1: y,
                x2: left + width,
                y2: y,
                class: "investment-chart-grid-line"
            }));

            svg.appendChild(createSvgElement("text", {
                x: left - 14,
                y: y + 4,
                "text-anchor": "end",
                class: "investment-chart-axis-label"
            })).textContent = formatAxisValue(value);
        }
    }

    function renderLineXAxis(svg, chartConfig, periods, mode) {
        const { left, top, width, height } = chartConfig;

        periods.forEach((period, index) => {
            const shouldShowLabel = mode === "modal"
                ? period.endsWith("2Ç") || period.endsWith("4Ç")
                : period.endsWith("4Ç");

            if (!shouldShowLabel) return;

            const x = left + (index / Math.max(periods.length - 1, 1)) * width;

            svg.appendChild(createSvgElement("line", {
                x1: x,
                y1: top,
                x2: x,
                y2: top + height,
                class: "investment-chart-grid-line investment-chart-grid-line-vertical"
            }));

            svg.appendChild(createSvgElement("text", {
                x,
                y: top + height + 32,
                "text-anchor": "middle",
                class: "investment-chart-axis-label"
            })).textContent = period;
        });
    }

    function renderPointLabel(svg, item, point, value, index, formatValue) {
        if (index % 4 !== 3) return null;

        const label = createSvgElement("text", {
            x: point.x,
            y: point.y - 12,
            "text-anchor": "middle",
            fill: item.color,
            class: "investment-chart-point-label"
        });

        label.textContent = formatValue(value);
        svg.appendChild(label);

        return label;
    }

    function renderAllPointLabel(svg, point, value, chartConfig, formatValue) {
        const label = createSvgElement("text", {
            x: point.x,
            y: Math.max(chartConfig.top + 12, point.y - 10),
            "text-anchor": "middle",
            class: "investment-chart-all-point-label"
        });

        label.textContent = formatValue(value);
        svg.appendChild(label);

        return label;
    }

    function createSourceMarkup(source, showTitle = true) {
        const sourceTitleMarkup = showTitle && source.title
            ? `<span class="investment-chart-tooltip__source-title">Kaynak: ${escapeHtml(source.title)}</span>`
            : "";
        const sourceLinkMarkup = source.url
            ? `<a class="investment-chart-tooltip__source-link" href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">Kaynağı Aç</a>`
            : "";

        return sourceTitleMarkup || sourceLinkMarkup
            ? `<div class="investment-chart-tooltip__source">${sourceTitleMarkup}${sourceLinkMarkup}</div>`
            : "";
    }

    function createFinancialTooltipContent(item, pointData, options, source) {
        const financials = pointData.quarterlyFinancials;
        const metricConfig = {
            revenuePerStoreUsd: {
                label: "Hasılat",
                value: financials?.revenueTlMillion,
                perStoreLabel: "Mağaza başı ciro",
                formula: "Hasılat / mağaza sayısı / çeyrek ort. USDTRY"
            },
            operatingProfitPerStoreUsd: {
                label: "FAVÖK",
                value: financials?.ebitdaTlMillion,
                perStoreLabel: "Mağaza başı kâr",
                formula: "FAVÖK / mağaza sayısı / çeyrek ort. USDTRY"
            }
        }[options.metricKey];

        if (
            !metricConfig
                || !Number.isFinite(metricConfig.value)
                || !Number.isFinite(financials?.totalStoreCount)
        ) {
            return null;
        }

        return `
            <span class="investment-chart-tooltip__accent" style="background:${escapeHtml(item.color)}"></span>
            <strong class="investment-chart-tooltip__header">${escapeHtml(item.name)} — ${escapeHtml(pointData.period)}</strong>
            <span>Mağaza sayısı: ${escapeHtml(formatNumber(financials.totalStoreCount))}</span>
            <span>${escapeHtml(metricConfig.label)}: ${escapeHtml(formatTlMillion(metricConfig.value))} mn TL</span>
            <b class="investment-chart-tooltip__value">${escapeHtml(metricConfig.perStoreLabel)}: ${escapeHtml(formatUsdCompact(pointData.value))}</b>
            <span>Formül: ${escapeHtml(metricConfig.formula)}</span>
            ${createSourceMarkup(source, false)}
        `;
    }

    function createTooltipContent(item, pointData, options) {
        const source = resolvePointSource(pointData);
        const financialTooltip = pointData.quarterlyFinancials
            ? createFinancialTooltipContent(item, pointData, options, source)
            : null;

        if (financialTooltip) return financialTooltip;

        const safeColor = escapeHtml(item.color);
        const safeName = escapeHtml(item.name);
        const safePeriod = escapeHtml(pointData.period);
        const safeValue = escapeHtml(options.formatTooltipValue(pointData.value));
        const compactNote = getCompactTooltipNote(pointData.note);
        const noteMarkup = compactNote
            ? `<p class="investment-chart-tooltip__note">${escapeHtml(compactNote)}</p>`
            : "";
        const sourceMarkup = createSourceMarkup(source);

        return `
            <span class="investment-chart-tooltip__accent" style="background:${safeColor}"></span>
            <strong class="investment-chart-tooltip__header">${safeName}</strong>
            <span class="investment-chart-tooltip__period">${safePeriod}</span>
            <b class="investment-chart-tooltip__value">${safeValue}</b>
            ${noteMarkup}
            ${sourceMarkup}
        `;
    }

    function showTooltip(tooltip, content, point, chartConfig) {
        const [viewBoxWidth, viewBoxHeight] = chartConfig.viewBox.split(" ").slice(2).map(Number);
        const svg = tooltip.previousElementSibling;
        const chartWidth = svg?.clientWidth || tooltip.parentElement?.clientWidth || viewBoxWidth;
        const chartHeight = svg?.clientHeight || viewBoxHeight;
        const pointLeft = (point.x / viewBoxWidth) * chartWidth;
        const pointTop = (point.y / viewBoxHeight) * chartHeight;
        const safeGap = 8;

        tooltip.innerHTML = content;
        tooltip.style.transform = "none";
        tooltip.style.left = "0";
        tooltip.style.top = "0";
        tooltip.classList.add("is-visible");

        const tooltipWidth = tooltip.offsetWidth;
        const tooltipHeight = tooltip.offsetHeight;
        const maxLeft = Math.max(safeGap, chartWidth - tooltipWidth - safeGap);
        const maxTop = Math.max(safeGap, chartHeight - tooltipHeight - safeGap);
        const preferredTop = pointTop - tooltipHeight - safeGap;
        const fallbackTop = pointTop + safeGap;
        const top = preferredTop >= safeGap ? preferredTop : fallbackTop;

        tooltip.style.left = `${clampNumber(pointLeft - (tooltipWidth / 2), safeGap, maxLeft)}px`;
        tooltip.style.top = `${clampNumber(top, safeGap, maxTop)}px`;
    }

    function hideTooltip(tooltip) {
        tooltip.classList.remove("is-visible");
    }

    function createTooltipController(tooltip) {
        let hideTimer = null;

        function cancelHide() {
            window.clearTimeout(hideTimer);
            hideTimer = null;
        }

        function scheduleHide() {
            cancelHide();
            hideTimer = window.setTimeout(() => hideTooltip(tooltip), 180);
        }

        tooltip.addEventListener("mouseenter", cancelHide);
        tooltip.addEventListener("mouseleave", scheduleHide);

        return { cancelHide, scheduleHide };
    }

    function bindTooltipTrigger(trigger, tooltip, tooltipController, tooltipContent, point, chartConfig) {
        trigger.addEventListener("mouseenter", () => {
            tooltipController.cancelHide();
            showTooltip(tooltip, tooltipContent, point, chartConfig);
        });
        trigger.addEventListener("mouseleave", tooltipController.scheduleHide);
        trigger.addEventListener("focus", () => {
            tooltipController.cancelHide();
            showTooltip(tooltip, tooltipContent, point, chartConfig);
        });
        trigger.addEventListener("blur", tooltipController.scheduleHide);
    }

    function renderLineSeries(svg, chartConfig, tooltip, periods, series, options) {
        const tooltipController = createTooltipController(tooltip);

        series.forEach((item) => {
            const points = item.points.flatMap((pointData, index) => {
                if (!isValidMetricValue(pointData.value)) return [];

                const point = getPoint(index, pointData.value, periods, chartConfig);
                return [`${point.x},${point.y}`];
            });

            svg.appendChild(createSvgElement("polyline", {
                points: points.join(" "),
                fill: "none",
                stroke: item.color,
                "stroke-width": options.mode === "modal" ? "3.4" : "3",
                "stroke-linecap": "round",
                "stroke-linejoin": "round",
                class: "investment-chart-line",
                style: `--series-color: ${item.color}`
            }));

            item.points.forEach((pointData, index) => {
                if (!isValidMetricValue(pointData.value)) return;

                const point = getPoint(index, pointData.value, periods, chartConfig);
                const marker = createSvgElement("circle", {
                    cx: point.x,
                    cy: point.y,
                    r: options.mode === "modal" ? "5" : "4",
                    fill: item.color,
                    class: "investment-chart-point",
                    tabindex: "0",
                    "aria-label": `${item.name} ${pointData.period}: ${options.formatTooltipValue(pointData.value)}`
                });
                const tooltipContent = createTooltipContent(item, pointData, options);

                bindTooltipTrigger(marker, tooltip, tooltipController, tooltipContent, point, chartConfig);

                svg.appendChild(marker);

                if (options.showAllPointLabels) {
                    const label = renderAllPointLabel(svg, point, pointData.value, chartConfig, options.formatEndpointValue);
                    label.setAttribute("tabindex", "0");
                    label.setAttribute("aria-label", `${item.name} ${pointData.period}: ${options.formatTooltipValue(pointData.value)}`);
                    bindTooltipTrigger(label, tooltip, tooltipController, tooltipContent, point, chartConfig);
                }

                if (options.mode === "modal") {
                    const label = renderPointLabel(svg, item, point, pointData.value, index, options.formatEndpointValue);

                    if (label) {
                        label.setAttribute("tabindex", "0");
                        label.setAttribute("aria-label", `${item.name} ${pointData.period}: ${options.formatTooltipValue(pointData.value)}`);
                        bindTooltipTrigger(label, tooltip, tooltipController, tooltipContent, point, chartConfig);
                    }
                }
            });
        });
    }

    function getLineChartConfig(options, series) {
        const rawMax = Math.max(...series.flatMap((item) => item.values), 1);
        const rawMin = Math.min(...series.flatMap((item) => item.values), 0);
        const roundedMax = Math.ceil(rawMax / options.axisStep) * options.axisStep;
        const lowerPadding = (roundedMax - rawMin) * 0.04;
        const roundedMin = Math.max(0, Math.floor((rawMin - lowerPadding) / options.axisStep) * options.axisStep);

        if (options.mode === "modal") {
            return {
                left: 84,
                top: 34,
                width: 940,
                height: 430,
                minValue: roundedMin,
                maxValue: roundedMax,
                viewBox: "0 0 1100 540"
            };
        }

        if (options.variant === "wide") {
            return {
                left: 86,
                top: 32,
                width: 900,
                height: 330,
                minValue: roundedMin,
                maxValue: roundedMax,
                viewBox: "0 0 1080 430"
            };
        }

        return {
            left: 78,
            top: 30,
            width: 800,
            height: 320,
            minValue: roundedMin,
            maxValue: roundedMax,
            viewBox: "0 0 980 420"
        };
    }

    function renderLineChart(container, series, options) {
        const periods = options.periods;
        const chartConfig = getLineChartConfig(options, series);
        const titleId = `${options.mountId}-title`;
        const svg = createSvgElement("svg", {
            viewBox: chartConfig.viewBox,
            role: "img",
            "aria-labelledby": titleId
        });
        const title = createSvgElement("title", { id: titleId });
        const tooltip = document.createElement("div");

        title.textContent = options.title;
        tooltip.className = `investment-chart-tooltip${options.mode === "modal" ? " investment-chart-tooltip-large" : ""}`;

        svg.appendChild(title);
        renderLineGrid(svg, chartConfig, options.formatAxisValue);
        renderLineXAxis(svg, chartConfig, periods, options.mode);
        renderLineSeries(svg, chartConfig, tooltip, periods, series, options);

        container.textContent = "";
        container.append(svg, tooltip);
        renderLegend(container, series);
    }

    function buildSeries(metricKey, periods) {
        return getCompanies().map((company) => {
            const financialsByPeriod = new Map(
                (company.quarterlyFinancials ?? []).map((item) => [item.period, item])
            );
            const points = normalizeMetricPoints(company[metricKey], periods).map((point) => ({
                ...point,
                quarterlyFinancials: financialsByPeriod.get(point.period) ?? null
            }));

            return {
                key: company.key,
                name: company.name,
                color: company.color,
                points,
                values: points.map((point) => point.value).filter(isValidMetricValue)
            };
        });
    }

    function renderMetricChart(mountId, metricKey, options) {
        const mount = document.getElementById(mountId);
        const periods = getPeriods();
        const series = buildSeries(metricKey, periods).filter((item) => (
            item.points.length === periods.length
                && item.points.every((point) => isValidMetricValue(point.value) || isMissingMetricValue(point.value))
                && item.values.length
        ));

        if (!mount || !series.length || !periods.length) return;

        renderLineChart(mount, series, {
            ...options,
            mountId,
            metricKey,
            periods,
            axisStep: options.axisStep,
            mode: options.mode ?? "default",
            showEndpointLabels: options.showEndpointLabels ?? false
        });
    }

    function renderOperatingProfitPerStoreChart() {
        renderMetricChart(operatingProfitPerStoreChartMountId, "operatingProfitPerStoreUsd", {
            title: "BİM, ŞOK Marketler, Migros ve CarrefourSA mağaza başına operasyonel kâr çizgi grafiği",
            axisStep: 5000,
            variant: "wide",
            showAllPointLabels: true,
            formatAxisValue: formatUsdCompact,
            formatEndpointValue: formatUsdCompact,
            formatTooltipValue: (value) => `${formatUsdCompact(value)} mağaza başı operasyonel kâr`
        });
    }


    function parseLocalizedNumber(value) {
        const normalizedValue = String(value ?? "")
            .replace(/\s/g, "")
            .replace(",", ".");
        const numberValue = Number.parseFloat(normalizedValue);

        return Number.isFinite(numberValue) ? numberValue : 0;
    }

    function getCompoundFrequencyPerYear(frequency) {
        return {
            yearly: 1,
            monthly: 12,
            daily: 365
        }[frequency] ?? 12;
    }

    function getContributionFrequencyPerYear(frequency) {
        return frequency === "yearly" ? 1 : 12;
    }

    function formatTryCurrency(value) {
        const safeValue = Number.isFinite(value) ? value : 0;

        return safeValue.toLocaleString("tr-TR", {
            style: "currency",
            currency: "TRY",
            maximumFractionDigits: 0
        });
    }

    function formatCalculatorPeriod(index, contributionFrequency) {
        if (contributionFrequency === "yearly") {
            return `${index}. Yıl`;
        }

        const year = Math.floor((index - 1) / 12) + 1;
        const month = ((index - 1) % 12) + 1;

        return `${year}. Yıl / ${month}. Ay`;
    }

    function growCompoundValue(value, years, annualRate, compoundingPeriodsPerYear) {
        if (!Number.isFinite(value) || value <= 0 || years <= 0) {
            return Number.isFinite(value) ? Math.max(value, 0) : 0;
        }

        const periodRate = annualRate / compoundingPeriodsPerYear;
        const growthBase = 1 + periodRate;

        if (growthBase <= 0) return 0;

        const grownValue = value * (growthBase ** (compoundingPeriodsPerYear * years));

        return Number.isFinite(grownValue) ? Math.max(grownValue, 0) : 0;
    }

    function parseCalculatorInputs() {
        const getValue = (id) => document.getElementById(id)?.value;
        const principal = clampNumber(parseLocalizedNumber(getValue("compound-principal")), 0, 1000000000000);
        const regularContribution = clampNumber(parseLocalizedNumber(getValue("compound-contribution")), 0, 1000000000000);
        const annualRate = clampNumber(parseLocalizedNumber(getValue("compound-annual-rate")), -99, 1000) / 100;
        const totalYears = clampNumber(parseLocalizedNumber(getValue("compound-duration")), 0, 100);
        const inflationRate = clampNumber(parseLocalizedNumber(getValue("compound-inflation-rate")), 0, 1000) / 100;
        const taxRate = clampNumber(parseLocalizedNumber(getValue("compound-tax-rate")), 0, 100) / 100;
        const contributionFrequency = getValue("compound-contribution-frequency") === "yearly" ? "yearly" : "monthly";
        const compoundingFrequency = getValue("compound-compounding-frequency") || "monthly";
        const contributionTiming = getValue("compound-contribution-timing") === "end" ? "end" : "start";

        return {
            principal,
            regularContribution,
            annualRate,
            totalYears,
            inflationRate,
            taxRate,
            contributionFrequency,
            contributionFrequencyPerYear: getContributionFrequencyPerYear(contributionFrequency),
            compoundingFrequency,
            compoundingPeriodsPerYear: getCompoundFrequencyPerYear(compoundingFrequency),
            contributionTiming
        };
    }

    function getContributionTimes(inputs, elapsedYears = inputs.totalYears) {
        const contributionTimes = [];
        const periodLength = 1 / inputs.contributionFrequencyPerYear;
        const totalPeriods = Math.floor(elapsedYears * inputs.contributionFrequencyPerYear + 1e-8);
        const timingOffset = inputs.contributionTiming === "start" ? 0 : 1;

        for (let periodIndex = 0; periodIndex < totalPeriods; periodIndex += 1) {
            const contributionTime = (periodIndex + timingOffset) * periodLength;

            if (contributionTime <= elapsedYears + 1e-8) {
                contributionTimes.push(contributionTime);
            }
        }

        return contributionTimes;
    }

    function calculateCompoundInterest(inputs, elapsedYears = inputs.totalYears) {
        const finalPrincipal = growCompoundValue(
            inputs.principal,
            elapsedYears,
            inputs.annualRate,
            inputs.compoundingPeriodsPerYear
        );
        const contributionTimes = getContributionTimes(inputs, elapsedYears);
        const contributionFutureValue = contributionTimes.reduce((sum, contributionTime) => (
            sum + growCompoundValue(
                inputs.regularContribution,
                Math.max(elapsedYears - contributionTime, 0),
                inputs.annualRate,
                inputs.compoundingPeriodsPerYear
            )
        ), 0);
        const totalContributions = contributionTimes.length * inputs.regularContribution;
        const totalInvested = inputs.principal + totalContributions;
        const grossFinalAmount = finalPrincipal + contributionFutureValue;
        const grossProfit = grossFinalAmount - totalInvested;
        const tax = Math.max(grossProfit, 0) * inputs.taxRate;
        const netProfit = grossProfit - tax;
        const netFinalAmount = totalInvested + netProfit;
        const inflationBase = 1 + inputs.inflationRate;
        const realValue = inflationBase > 0
            ? netFinalAmount / (inflationBase ** elapsedYears)
            : netFinalAmount;

        return {
            grossFinalAmount: Number.isFinite(grossFinalAmount) ? grossFinalAmount : 0,
            totalInvested: Number.isFinite(totalInvested) ? totalInvested : 0,
            grossProfit: Number.isFinite(grossProfit) ? grossProfit : 0,
            tax: Number.isFinite(tax) ? tax : 0,
            netProfit: Number.isFinite(netProfit) ? netProfit : 0,
            netFinalAmount: Number.isFinite(netFinalAmount) ? netFinalAmount : 0,
            realValue: Number.isFinite(realValue) ? realValue : 0,
            totalContributions
        };
    }

    function buildBreakdownRows(inputs) {
        const rows = [];
        const periodLength = 1 / inputs.contributionFrequencyPerYear;
        const totalPeriods = Math.floor(inputs.totalYears * inputs.contributionFrequencyPerYear + 1e-8);
        let balance = inputs.principal;
        let totalInvested = inputs.principal;

        for (let index = 1; index <= totalPeriods; index += 1) {
            const startingBalance = balance;
            let contribution = 0;

            if (inputs.contributionTiming === "start") {
                contribution = inputs.regularContribution;
                totalInvested += contribution;
                balance += contribution;
            }

            const balanceBeforeGrowth = balance;
            balance = growCompoundValue(balance, periodLength, inputs.annualRate, inputs.compoundingPeriodsPerYear);

            if (inputs.contributionTiming === "end") {
                contribution = inputs.regularContribution;
                balance += contribution;
                totalInvested += contribution;
            }

            const periodReturn = balance - startingBalance - contribution;

            rows.push({
                period: formatCalculatorPeriod(index, inputs.contributionFrequency),
                startingBalance,
                contribution,
                periodReturn: Number.isFinite(periodReturn) ? periodReturn : 0,
                totalInvested,
                endingBalance: Number.isFinite(balance) ? balance : balanceBeforeGrowth
            });
        }

        return rows;
    }

    function buildGrowthSeries(inputs) {
        const yearCount = Math.ceil(inputs.totalYears);
        const points = [];

        for (let year = 0; year <= yearCount; year += 1) {
            const elapsedYears = Math.min(year, inputs.totalYears);
            const result = calculateCompoundInterest(inputs, elapsedYears);

            points.push({
                label: year === 0 ? "Başlangıç" : `${elapsedYears}. Yıl`,
                elapsedYears,
                invested: result.totalInvested,
                gain: Math.max(result.grossProfit, 0)
            });
        }

        if (!points.length || points[points.length - 1].elapsedYears !== inputs.totalYears) {
            const result = calculateCompoundInterest(inputs, inputs.totalYears);
            points.push({
                label: `${inputs.totalYears}. Yıl`,
                elapsedYears: inputs.totalYears,
                invested: result.totalInvested,
                gain: Math.max(result.grossProfit, 0)
            });
        }

        return points;
    }

    function renderCalculatorResults(results) {
        const container = document.querySelector("[data-compound-results]");

        if (!container) return;

        const cards = [
            ["Toplam Tutar", results.grossFinalAmount],
            ["Net Toplam Tutar", results.netFinalAmount],
            ["Toplam Yatırılan", results.totalInvested],
            ["Brüt Faiz Kazancı", results.grossProfit],
            ["Net Faiz Kazancı", results.netProfit],
            ["Enflasyona Göre Düzeltilmiş Tutar (Bugünkü Alım Gücü)", results.realValue]
        ];

        container.innerHTML = cards.map(([label, value]) => `
            <article class="compound-result-card">
                <span>${escapeHtml(label)}</span>
                <strong>${escapeHtml(formatTryCurrency(value))}</strong>
            </article>
        `).join("");
    }

    function getCompoundChartPoint(index, value, points, chartConfig) {
        const { left, top, width, height, maxValue } = chartConfig;
        const divisor = Math.max(points.length - 1, 1);
        const x = left + (index / divisor) * width;
        const y = top + height - (value / maxValue) * height;

        return { x, y };
    }

    function buildChartPath(points, key, chartConfig) {
        return points.map((point, index) => {
            const coordinates = getCompoundChartPoint(index, point[key], points, chartConfig);

            return `${index === 0 ? "M" : "L"}${coordinates.x.toFixed(2)} ${coordinates.y.toFixed(2)}`;
        }).join(" ");
    }

    function renderGrowthChart(points) {
    const mount = document.getElementById("compound-growth-chart");
    const summary = document.querySelector("[data-compound-chart-summary]");

    if (!mount) return;

    const width = 760;
    const height = 330;
    const chartConfig = {
        left: 68,
        top: 28,
        width: 650,
        height: 238,
        maxValue: Math.max(...points.flatMap((point) => [point.invested, point.gain]), 1)
    };

    const svg = createSvgElement("svg", {
        viewBox: `0 0 ${width} ${height}`,
        role: "presentation",
        focusable: "false"
    });

    for (let step = 0; step <= 4; step += 1) {
        const y = chartConfig.top + (step / 4) * chartConfig.height;
        const value = chartConfig.maxValue - (step / 4) * chartConfig.maxValue;

        svg.appendChild(createSvgElement("line", {
            class: "compound-chart-grid-line",
            x1: chartConfig.left,
            x2: chartConfig.left + chartConfig.width,
            y1: y,
            y2: y
        }));

        const label = createSvgElement("text", {
            class: "compound-chart-axis-label",
            x: chartConfig.left - 10,
            y: y + 4,
            "text-anchor": "end"
        });

        label.textContent = formatTryCurrency(value).replace(",00", "");
        svg.appendChild(label);
    }

    const investedPath = buildChartPath(points, "invested", chartConfig);
    const gainPath = buildChartPath(points, "gain", chartConfig);

    svg.appendChild(createSvgElement("path", {
        class: "compound-chart-line",
        d: investedPath,
        stroke: "#818cf8"
    }));

    svg.appendChild(createSvgElement("path", {
        class: "compound-chart-line",
        d: gainPath,
        stroke: "#c4b5fd"
    }));

    points.forEach((point, index) => {
        if (
            index !== 0 &&
            index !== points.length - 1 &&
            index % Math.ceil(points.length / 4) !== 0
        ) {
            return;
        }

        const x = getCompoundChartPoint(index, 0, points, chartConfig).x;

        const label = createSvgElement("text", {
            class: "compound-chart-axis-label",
            x,
            y: chartConfig.top + chartConfig.height + 32,
            "text-anchor": "middle"
        });

        label.textContent = point.label;
        svg.appendChild(label);
    });

    mount.textContent = "";
    mount.appendChild(svg);

    if (summary && points.length) {
        const lastPoint = points[points.length - 1];

        summary.textContent = `${lastPoint.label} sonunda yatırılan para ${formatTryCurrency(
            lastPoint.invested
        )}, bileşik getiri ${formatTryCurrency(lastPoint.gain)}.`;
    }
}

    function renderBreakdownTable(rows) {
        const body = document.querySelector("[data-compound-breakdown-body]");
        const note = document.querySelector("[data-compound-breakdown-note]");

        if (!body) return;

        const maxVisibleRows = 360;
        const visibleRows = rows.slice(0, maxVisibleRows);

        body.innerHTML = visibleRows.map((row) => `
            <tr>
                <td>${escapeHtml(row.period)}</td>
                <td>${escapeHtml(formatTryCurrency(row.startingBalance))}</td>
                <td>${escapeHtml(formatTryCurrency(row.contribution))}</td>
                <td>${escapeHtml(formatTryCurrency(row.periodReturn))}</td>
                <td>${escapeHtml(formatTryCurrency(row.totalInvested))}</td>
                <td>${escapeHtml(formatTryCurrency(row.endingBalance))}</td>
            </tr>
        `).join("");

        if (note) {
            note.textContent = rows.length > maxVisibleRows
                ? `Performans için ilk ${maxVisibleRows} dönem gösteriliyor; hesaplama tüm ${rows.length} dönem üzerinden yapıldı.`
                : `Seçilen katkı sıklığına göre ${rows.length} dönem gösteriliyor.`;
        }
    }

    function updateCompoundCalculator() {
        const inputs = parseCalculatorInputs();
        const results = calculateCompoundInterest(inputs);
        const growthSeries = buildGrowthSeries(inputs);
        const breakdownRows = buildBreakdownRows(inputs);

        renderCalculatorResults(results);
        renderGrowthChart(growthSeries);
        renderBreakdownTable(breakdownRows);
    }

    function updateSectorSelectorState(sectorKey) {
        document.querySelectorAll("[data-sector-key]").forEach((button) => {
            const isActive = button.dataset.sectorKey === sectorKey;

            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-pressed", String(isActive));
        });
    }

    function renderRetailSectorPanel() {
        const panel = document.getElementById("sector-analysis-panel");

        if (!panel) return;

        activeSectorKey = "retail";
        updateSectorSelectorState(activeSectorKey);
        panel.innerHTML = `
            <div class="investment-sector-block">
                <div class="investment-section-header investment-sector-header">
                    <div class="investment-sector-header__content">
                        <span class="investment-eyebrow">Sektör Analizleri</span>
                        <h2 id="retail-performance-title">Perakende Sektörü Mağaza Performansları</h2>
                        <p>
                            BİM, Migros, CarrefourSA ve benzeri perakende şirketlerinin mağaza başına
                            operasyonel kâr gelişimini çeyreklik bazda izlemek için hazırlanacak
                            analiz alanı.
                        </p>
                    </div>
                    <div class="investment-sector-header__action">
                        <a class="investment-sector-detail-button" href="investment-retail.html">
                            Detaylı İncele
                        </a>
                    </div>
                </div>

                <div class="investment-dashboard-grid investment-dashboard-grid-single">
                    <article class="investment-chart-card investment-chart-card-wide investment-operating-profit-card">
                        <div class="investment-chart-card-header">
                            <div>
                                <h3>Mağaza Başına Operasyonel Kâr ($)</h3>
                                <p>Çeyreklik mağaza başı operasyonel kâr</p>
                            </div>
                        </div>

                        <div
                            id="retail-operating-profit-per-store-chart"
                            class="investment-chart investment-chart-operating-profit-per-store"
                            aria-label="BİM, ŞOK Marketler, Migros ve CarrefourSA mağaza başına operasyonel kâr çizgi grafiği"
                        ></div>
                    </article>
                </div>
            </div>
        `;

        ensureSupermarketDatasetLoaded();
    }

    const placeholderSectorPanels = {
        airline: {
            titleId: "airline-performance-title",
            title: "Havayolu Sektörü Performans Analizleri",
            headerCopy:
                "Türk Hava Yolları, Pegasus ve benzeri havayolu şirketlerinin yolcu trafiği, doluluk oranı, filo büyüklüğü ve kârlılık metriklerini izlemek için hazırlanacak analiz alanı.",
            icon: "fa-plane-departure",
            placeholderTitle: "Havayolu metrikleri yakında eklenecek",
            placeholderCopy:
                "Yolcu trafiği, doluluk oranı, filo büyüklüğü ve faaliyet kârlılığı gibi metrikler kaynaklı veri setleriyle hazırlanacak.",
            tags: ["Yolcu Trafiği", "Doluluk Oranı", "Filo", "FAVÖK"],
            detailHref: "investment-airlines.html",
            tagsLabel: "Planlanan havayolu metrikleri"
        },
        automotive: {
            titleId: "automotive-performance-title",
            title: "Otomotiv Sektörü Performans Analizleri",
            headerCopy:
                "Otomotiv şirketlerini araç satışları, ihracat performansı, üretim kapasitesi ve kârlılık metrikleriyle izlemek için hazırlanacak analiz alanı.",
            icon: "fa-car-side",
            placeholderTitle: "Otomotiv analizleri yakında eklenecek",
            placeholderCopy:
                "Araç satış adetleri, ihracat performansı, üretim kapasitesi ve kârlılık metrikleriyle otomotiv şirketlerini izlemek için hazırlanacak analiz alanı.",
            tags: ["Satış Adedi", "İhracat", "Üretim", "Marjlar"],
            tagsLabel: "Planlanan otomotiv metrikleri"
        },
        steel: {
            titleId: "steel-performance-title",
            title: "Demir Çelik Sektörü Performans Analizleri",
            headerCopy:
                "Demir çelik şirketlerini üretim hacmi, kapasite kullanımı, emtia fiyatları ve faaliyet kârlılığı metrikleriyle izlemek için hazırlanacak analiz alanı.",
            icon: "fa-industry",
            placeholderTitle: "Demir çelik analizleri yakında eklenecek",
            placeholderCopy:
                "Üretim hacmi, kapasite kullanımı, emtia fiyatları ve faaliyet kârlılığı gibi metriklerle sektör performansını izlemek için hazırlanacak analiz alanı.",
            tags: ["Üretim Hacmi", "Kapasite", "Emtia Fiyatları", "FAVÖK"],
            tagsLabel: "Planlanan demir çelik metrikleri"
        }
    };

    function renderPlaceholderSectorPanel(sectorKey) {
        const panel = document.getElementById("sector-analysis-panel");
        const sector = placeholderSectorPanels[sectorKey];

        if (!panel || !sector) return;

        activeSectorKey = sectorKey;
        updateSectorSelectorState(activeSectorKey);
        panel.innerHTML = `
            <div class="investment-sector-block">
                <div class="investment-section-header investment-sector-header">
                    <div class="investment-sector-header__content">
                        <span class="investment-eyebrow">Sektör Analizleri</span>
                        <h2 id="${sector.titleId}">${sector.title}</h2>
                        <p>${sector.headerCopy}</p>
                    </div>
                    <div class="investment-sector-header__action">
                        ${
                            sector.detailHref
                                ? `<a class="investment-sector-detail-button" href="${sector.detailHref}">Detaylı İncele</a>`
                                : `<span class="investment-sector-detail-button investment-sector-detail-button--disabled" aria-disabled="true">Yakında</span>`
                        }
                    </div>
                </div>

                <div class="investment-sector-placeholder">
                    <div class="investment-sector-placeholder__icon" aria-hidden="true">
                        <i class="fas ${sector.icon}"></i>
                    </div>
                    <div>
                        <h3>${sector.placeholderTitle}</h3>
                        <p>${sector.placeholderCopy}</p>
                        <div class="investment-sector-placeholder__tags" aria-label="${sector.tagsLabel}">
                            ${sector.tags.map((tag) => `<span class="investment-sector-tag">${tag}</span>`).join("")}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function renderSectorPanel(sectorKey = defaultSectorKey) {
        if (sectorKey === "retail") {
            renderRetailSectorPanel();
            return;
        }

        if (placeholderSectorPanels[sectorKey]) {
            renderPlaceholderSectorPanel(sectorKey);
            return;
        }

        renderRetailSectorPanel();
    }

    function initSectorSelector() {
        const selectorButtons = document.querySelectorAll("[data-sector-key]");

        if (!selectorButtons.length) return;

        selectorButtons.forEach((button) => {
            button.addEventListener("click", () => {
                renderSectorPanel(button.dataset.sectorKey);
            });
        });

        renderSectorPanel(defaultSectorKey);
    }

    function initInvestmentSmoothScroll() {
        const supportedHashes = new Set([
            "#retail-store-performance",
            "#sector-analysis",
            "#stock-analysis",
            "#investment-calculators"
        ]);

        document.querySelectorAll('a[href^="#"]').forEach((link) => {
            link.addEventListener("click", (event) => {
                const hash = link.getAttribute("href");

                if (!supportedHashes.has(hash)) return;

                const target = document.querySelector(hash);

                if (!target) return;

                event.preventDefault();
                target.scrollIntoView({ behavior: "smooth", block: "start" });
                window.history.pushState(null, "", hash);
            });
        });
    }

    function initCompoundInterestCalculator() {
        const calculator = document.getElementById("compound-calculator");

        if (!calculator) return;

        calculator.querySelectorAll(".compound-calculator-input").forEach((input) => {
            input.addEventListener("input", updateCompoundCalculator);
            input.addEventListener("change", updateCompoundCalculator);
        });

        updateCompoundCalculator();
    }

    async function loadSupermarketDataset() {
        const response = await fetch(supermarketDatasetUrl);

        if (!response.ok) {
            throw new Error(`Supermarket dataset request failed: ${response.status}`);
        }

        supermarketDataset = await response.json();
        await applyDerivedPerStoreUsdValues();

        return supermarketDataset;
    }

    function ensureSupermarketDatasetLoaded() {
        const mount = document.getElementById(operatingProfitPerStoreChartMountId);

        if (supermarketDataset) {
            renderOperatingProfitPerStoreChart();
            return supermarketDatasetPromise ?? Promise.resolve(supermarketDataset);
        }

        if (mount) {
            mount.innerHTML = '<div class="investment-chart-loading">Perakende verileri yükleniyor...</div>';
        }

        if (!supermarketDatasetPromise) {
            supermarketDatasetPromise = loadSupermarketDataset().catch((error) => {
                supermarketDatasetPromise = null;
                console.error(error);
                showErrorState(
                    operatingProfitPerStoreChartMountId,
                    "Operasyonel kâr grafiği verisi yüklenemedi. Lütfen daha sonra tekrar deneyin."
                );
                return null;
            });
        }

        supermarketDatasetPromise.then(() => {
            if (activeSectorKey === "retail") {
                renderOperatingProfitPerStoreChart();
            }
        });

        return supermarketDatasetPromise;
    }

    document.addEventListener("DOMContentLoaded", () => {
        initInvestmentSmoothScroll();
        initSectorSelector();
        initCompoundInterestCalculator();
    });
})();

// Stage 4: Investment chatbot frontend controller with structured mock responses and safe source rendering.
(function () {
    const defaultAssistantResponse = "Bu özellik yakında kaynaklı finansal raporlar, şirket dokümanları ve sektör verileriyle çalışacak.";
    const assistantDisclaimer = "Bu yanıt yatırım tavsiyesi değildir; kaynaklı finansal asistan altyapısı geliştirme aşamasındadır.";
    const responseDelayMs = 650;
    let messageIdCounter = 0;
    let inMemorySessionId = null;

    function waitForMockDelay() {
        return new Promise((resolve) => {
            window.setTimeout(resolve, responseDelayMs);
        });
    }

    function normalizeMessageText(text) {
        return text
            .toLocaleLowerCase("tr-TR")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/ı/g, "i");
    }

    async function getMockInvestmentAssistantResponse(userMessage) {
        await waitForMockDelay();

        const normalizedMessage = normalizeMessageText(userMessage);

        if (normalizedMessage.includes("magaza basi kar")) {
            return "Mağaza başı kâr hesaplaması ileride FAVÖK, mağaza sayısı ve çeyrek ortalama USDTRY verileriyle kaynaklı şekilde açıklanacak.";
        }

        if (normalizedMessage.includes("migros")) {
            return "Migros için yanıtlar ileride faaliyet raporları, yatırımcı sunumları ve repo içindeki şirket dokümanları üzerinden kaynaklı üretilecek.";
        }

        if (normalizedMessage.includes("tupras")) {
            return "Tüpraş için yanıtlar ileride faaliyet raporları ve finansal sunumlar üzerinden kaynaklı üretilecek.";
        }

        return defaultAssistantResponse;
    }

    function getOrCreateInMemorySessionId() {
        if (!inMemorySessionId) {
            inMemorySessionId = `chat_session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        }

        return inMemorySessionId;
    }

    async function requestInvestmentAssistantResponse(userMessage, context = {}) {
        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message: userMessage,
                    sessionId: getOrCreateInMemorySessionId(),
                    page: "investment-analytics",
                    context: {
                        source: "investment-chatbot",
                        stage: "mock",
                        ...context
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Investment assistant API request failed: ${response.status}`);
            }

            const payload = await response.json();

            if (typeof payload === "string") {
                return payload;
            }

            if (!payload || typeof payload.answer !== "string") {
                throw new Error("Investment assistant API response was malformed.");
            }

            return payload;
        } catch {
            return {
                answer: await getMockInvestmentAssistantResponse(userMessage),
                sources: [],
                usedCache: false,
                modelTier: "local-mock",
                status: "fallback",
                disclaimer: assistantDisclaimer
            };
        }
    }


    // Stage 5: Safe chatbot query logging contract (metadata-only, no storage).
    function createSafeTextPreview(text) {
        const normalizedText = String(text ?? "")
            .replace(/[\r\n\t]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        const redactedText = normalizedText
            .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
            .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, "[redacted-phone]");

        return redactedText.slice(0, 160);
    }

    function inferBasicQueryMetadata(text) {
        const normalizedText = normalizeMessageText(String(text ?? ""));
        let detectedCompany = null;
        let detectedPeriod = null;
        let normalizedIntent = "unknown";

        if (/\b(mgros|migros)\b/.test(normalizedText)) {
            detectedCompany = "mgros";
        } else if (/\b(bim|bimas)\b/.test(normalizedText)) {
            detectedCompany = "bimas";
        } else if (/\b(sok|sokm)\b/.test(normalizedText)) {
            detectedCompany = "sokm";
        } else if (/\b(carrefour|carrefoursa|crfsa)\b/.test(normalizedText)) {
            detectedCompany = "crfsa";
        } else if (/\b(tupras|tuprs)\b/.test(normalizedText)) {
            detectedCompany = "tuprs";
        }

        const periodMatch = normalizedText.match(/\b(20\d{2})\s*(?:-|\/|\s)?\s*([1-4])\s*(?:c|ceyrek|q)\b|\b(20\d{2})\s*q\s*([1-4])\b/);

        if (periodMatch) {
            const year = periodMatch[1] || periodMatch[3];
            const quarter = periodMatch[2] || periodMatch[4];
            detectedPeriod = `${year} ${quarter}Ç`;
        }

        if (normalizedText.includes("magaza sayisi") || normalizedText.includes("store count")) {
            normalizedIntent = "store_count";
        } else if (normalizedText.includes("magaza basi kar") || normalizedText.includes("operasyonel kar")) {
            normalizedIntent = "profit_per_store";
        } else if (normalizedText.includes("magaza basi ciro") || normalizedText.includes("hasilat")) {
            normalizedIntent = "revenue_per_store";
        } else if (normalizedText.includes("faaliyet raporu") || normalizedText.includes("one cikanlar") || normalizedText.includes("rapor")) {
            normalizedIntent = "report_summary";
        }

        return {
            textPreview: createSafeTextPreview(text),
            textLength: String(text ?? "").length,
            normalizedIntent,
            detectedCompany,
            detectedPeriod
        };
    }

    function buildChatLogEvent(eventType, partialPayload = {}) {
        return {
            eventType,
            sessionId: getOrCreateInMemorySessionId(),
            page: "investment-analytics",
            timestamp: new Date().toISOString(),
            query: {
                textPreview: "",
                textLength: 0,
                normalizedIntent: "unknown",
                detectedCompany: null,
                detectedPeriod: null,
                ...(partialPayload.query ?? {})
            },
            response: {
                status: "mock",
                modelTier: "mock",
                usedCache: false,
                sourceCount: 0,
                latencyMs: 0,
                ...(partialPayload.response ?? {})
            },
            privacy: {
                containsPersonalData: false,
                loggingMode: "metadata_only",
                ...(partialPayload.privacy ?? {})
            },
            ...Object.fromEntries(
                Object.entries(partialPayload).filter(([key]) => !["query", "response", "privacy"].includes(key))
            )
        };
    }

    function sendChatLogEvent(eventPayload) {
        try {
            const body = JSON.stringify(eventPayload);

            if (body.length > 10000) {
                return;
            }

            if (window.navigator?.sendBeacon) {
                const beaconBody = new window.Blob([body], { type: "application/json" });

                if (window.navigator.sendBeacon("/api/chat-log", beaconBody)) {
                    return;
                }
            }

            fetch("/api/chat-log", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body,
                keepalive: true
            }).catch(() => {});
        } catch {
            // Logging is intentionally best-effort and must never affect chat UX.
        }
    }

    function trackChatMessageSent(message) {
        try {
            sendChatLogEvent(buildChatLogEvent("chat_message_sent", {
                messageId: message?.id,
                query: inferBasicQueryMetadata(message?.content)
            }));
        } catch {
            // Ignore logging failures.
        }
    }

    function trackChatResponseReceived(message, responsePayload, latencyMs) {
        try {
            const normalizedResponse = normalizeAssistantResponse(responsePayload);

            sendChatLogEvent(buildChatLogEvent("chat_response_received", {
                messageId: message?.id,
                answerId: responsePayload?.answerId,
                query: inferBasicQueryMetadata(message?.content),
                response: {
                    status: normalizedResponse.status || "mock",
                    modelTier: normalizedResponse.modelTier || "mock",
                    usedCache: normalizedResponse.usedCache === true,
                    sourceCount: normalizedResponse.sources.length,
                    latencyMs: Math.max(0, Math.round(Number(latencyMs) || 0))
                }
            }));
        } catch {
            // Ignore logging failures.
        }
    }

    function trackChatError(errorContext = {}) {
        try {
            const message = errorContext.message;

            sendChatLogEvent(buildChatLogEvent("chat_error", {
                messageId: message?.id,
                query: inferBasicQueryMetadata(message?.content),
                response: {
                    status: "error",
                    modelTier: "local-mock",
                    usedCache: false,
                    sourceCount: 0,
                    latencyMs: Math.max(0, Math.round(Number(errorContext.latencyMs) || 0))
                }
            }));
        } catch {
            // Ignore logging failures.
        }
    }

    function getSafeSourceUrl(url) {
        if (typeof url !== "string" || !url.trim()) {
            return null;
        }

        const sourceUrl = url.trim();
        const parser = document.createElement("a");
        parser.href = sourceUrl;

        if (!["http:", "https:"].includes(parser.protocol)) {
            return null;
        }

        return parser.href;
    }

    function getTrimmedText(value) {
        return typeof value === "string" ? value.trim() : "";
    }

    function normalizeSources(sources) {
        if (!Array.isArray(sources)) {
            return [];
        }

        return sources
            .map((source) => ({
                title: getTrimmedText(source?.title),
                url: getSafeSourceUrl(source?.url),
                page: getTrimmedText(source?.page),
                documentType: getTrimmedText(source?.documentType),
                period: getTrimmedText(source?.period)
            }))
            .filter((source) => source.title || source.url || source.page || source.documentType || source.period);
    }

    function normalizeAssistantResponse(response) {
        if (typeof response === "string") {
            return {
                answer: response,
                sources: [],
                disclaimer: "",
                usedCache: null,
                modelTier: "",
                status: ""
            };
        }

        if (response && typeof response.answer === "string") {
            return {
                answer: response.answer,
                sources: normalizeSources(response.sources),
                disclaimer: getTrimmedText(response.disclaimer),
                usedCache: typeof response.usedCache === "boolean" ? response.usedCache : null,
                modelTier: getTrimmedText(response.modelTier),
                status: getTrimmedText(response.status)
            };
        }

        return {
            answer: "",
            sources: [],
            disclaimer: "",
            usedCache: null,
            modelTier: "",
            status: ""
        };
    }

    function renderResponseMeta(responseMeta) {
        const metaItems = [];

        if (responseMeta.modelTier) {
            metaItems.push(`Model: ${responseMeta.modelTier}`);
        }

        if (responseMeta.status) {
            metaItems.push(`Durum: ${responseMeta.status}`);
        }

        if (typeof responseMeta.usedCache === "boolean") {
            metaItems.push(`Önbellek: ${responseMeta.usedCache ? "Evet" : "Hayır"}`);
        }

        if (!metaItems.length) {
            return null;
        }

        const metaElement = document.createElement("small");
        metaElement.className = "investment-chatbot__response-meta";
        metaElement.textContent = metaItems.join(" · ");

        return metaElement;
    }

    function renderSources(sources) {
        if (!sources.length) {
            return null;
        }

        const sourcesElement = document.createElement("div");
        sourcesElement.className = "investment-chatbot__sources";

        sources.forEach((source) => {
            const sourceElement = document.createElement("article");
            sourceElement.className = "investment-chatbot__source";

            const titleElement = document.createElement("strong");
            titleElement.className = "investment-chatbot__source-title";
            titleElement.textContent = source.title || "Kaynak";
            sourceElement.append(titleElement);

            const sourceMetaItems = [];

            if (source.page) {
                sourceMetaItems.push(`Sayfa: ${source.page}`);
            }

            if (source.period) {
                sourceMetaItems.push(`Dönem: ${source.period}`);
            }

            if (source.documentType) {
                sourceMetaItems.push(`Tür: ${source.documentType}`);
            }

            if (sourceMetaItems.length) {
                const sourceMetaElement = document.createElement("span");
                sourceMetaElement.className = "investment-chatbot__source-meta";
                sourceMetaElement.textContent = sourceMetaItems.join(" · ");
                sourceElement.append(sourceMetaElement);
            }

            if (source.url) {
                const sourceLink = document.createElement("a");
                sourceLink.className = "investment-chatbot__source-link";
                sourceLink.href = source.url;
                sourceLink.target = "_blank";
                sourceLink.rel = "noopener noreferrer";
                sourceLink.textContent = "Kaynağı Aç";
                sourceElement.append(sourceLink);
            }

            sourcesElement.append(sourceElement);
        });

        return sourcesElement;
    }

    function initInvestmentChatbot() {
        const chatbot = document.querySelector("[data-investment-chatbot]");

        if (!chatbot) return;

        const toggle = chatbot.querySelector("[data-chatbot-toggle]");
        const panel = chatbot.querySelector("[data-chatbot-panel]");
        const closeButton = chatbot.querySelector("[data-chatbot-close]");
        const input = chatbot.querySelector("[data-chatbot-input]");
        const sendButton = chatbot.querySelector("[data-chatbot-send]");
        const messages = chatbot.querySelector("[data-chatbot-messages]");
        const suggestionButtons = chatbot.querySelectorAll("[data-chatbot-suggestion]");

        if (!toggle || !panel || !input || !sendButton || !messages) return;

        const state = {
            isOpen: false,
            isSending: false,
            messages: []
        };

        function createMessage(role, content, status = "sent", responseMeta = null) {
            messageIdCounter += 1;

            return {
                id: `msg_${Date.now()}_${messageIdCounter}`,
                role,
                content,
                createdAt: new Date().toISOString(),
                status,
                responseMeta
            };
        }

        function scrollMessagesToBottom() {
            messages.scrollTop = messages.scrollHeight;
        }

        function renderMessage(message) {
            const messageElement = document.createElement("div");
            messageElement.className = [
                "investment-chatbot__message",
                `investment-chatbot__message--${message.role}`,
                `investment-chatbot__message--${message.status}`
            ].join(" ");
            messageElement.dataset.messageId = message.id;

            const normalizedContent = message.role === "assistant"
                ? normalizeAssistantResponse(message.responseMeta ?? message.content)
                : { answer: String(message.content ?? ""), sources: [], disclaimer: "" };

            const answerElement = document.createElement("span");
            answerElement.textContent = normalizedContent.answer;
            messageElement.append(answerElement);

            const sourcesElement = message.role === "assistant"
                ? renderSources(normalizedContent.sources)
                : null;

            if (sourcesElement) {
                messageElement.append(sourcesElement);
            }

            if (normalizedContent.disclaimer) {
                const disclaimerElement = document.createElement("small");
                disclaimerElement.className = "investment-chatbot__disclaimer";
                disclaimerElement.textContent = normalizedContent.disclaimer;
                messageElement.append(disclaimerElement);
            }

            const responseMetaElement = message.role === "assistant"
                ? renderResponseMeta(normalizedContent)
                : null;

            if (responseMetaElement) {
                messageElement.append(responseMetaElement);
            }

            if (message.status === "loading") {
                messageElement.setAttribute("aria-busy", "true");
            }

            return messageElement;
        }

        function appendMessage(message) {
            state.messages.push(message);
            messages.append(renderMessage(message));
            scrollMessagesToBottom();
        }

        function updateMessage(messageId, updates) {
            const message = state.messages.find((currentMessage) => currentMessage.id === messageId);

            if (!message) return;

            Object.assign(message, updates);

            const existingMessage = messages.querySelector(`[data-message-id="${messageId}"]`);
            const updatedMessage = renderMessage(message);

            if (existingMessage) {
                existingMessage.replaceWith(updatedMessage);
            } else {
                messages.append(updatedMessage);
            }

            scrollMessagesToBottom();
        }

        function setSendingState(isSending) {
            state.isSending = isSending;
            input.disabled = isSending;
            sendButton.disabled = isSending;
            messages.setAttribute("aria-busy", String(isSending));
        }

        function clearInput() {
            input.value = "";
        }

        function getInputValue() {
            return input.value.trim();
        }

        function focusInput() {
            if (state.isOpen && !state.isSending) {
                input.focus();
            }
        }

        function openChatbot() {
            state.isOpen = true;
            chatbot.classList.add("is-open");
            panel.setAttribute("aria-hidden", "false");
            toggle.setAttribute("aria-expanded", "true");
            toggle.setAttribute("aria-label", "Yatırım asistanını kapat");
            window.setTimeout(focusInput, 80);
        }

        function closeChatbot() {
            state.isOpen = false;
            chatbot.classList.remove("is-open");
            panel.setAttribute("aria-hidden", "true");
            toggle.setAttribute("aria-expanded", "false");
            toggle.setAttribute("aria-label", "Yatırım asistanını aç");
        }

        function toggleChatbot() {
            if (state.isOpen) {
                closeChatbot();
            } else {
                openChatbot();
            }
        }

        async function sendMessage(text = getInputValue()) {
            const trimmedText = text.trim();

            if (!trimmedText || state.isSending) return;

            const userMessage = createMessage("user", trimmedText);
            const loadingMessage = createMessage("assistant", "Yanıt hazırlanıyor...", "loading");

            appendMessage(userMessage);
            trackChatMessageSent(userMessage);
            clearInput();
            setSendingState(true);
            appendMessage(loadingMessage);

            const responseStartedAt = window.performance.now();

            try {
                const assistantResponse = await requestInvestmentAssistantResponse(trimmedText);
                const latencyMs = window.performance.now() - responseStartedAt;
                const normalizedAssistantResponse = normalizeAssistantResponse(assistantResponse);
                updateMessage(loadingMessage.id, {
                    content: normalizedAssistantResponse.answer,
                    responseMeta: typeof assistantResponse === "string" ? null : assistantResponse,
                    status: "sent"
                });
                trackChatResponseReceived(userMessage, assistantResponse, latencyMs);
            } catch (error) {
                const latencyMs = window.performance.now() - responseStartedAt;
                console.error("Investment assistant mock response failed:", error);
                updateMessage(loadingMessage.id, {
                    content: "Yanıt hazırlanırken bir sorun oluştu. Lütfen tekrar deneyin.",
                    responseMeta: null,
                    status: "error"
                });
                trackChatError({ message: userMessage, latencyMs });
            } finally {
                setSendingState(false);
                focusInput();
            }
        }

        toggle.addEventListener("click", toggleChatbot);
        closeButton?.addEventListener("click", closeChatbot);

        sendButton.addEventListener("click", () => {
            sendMessage();
        });

        input.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                sendMessage();
            }
        });

        suggestionButtons.forEach((button) => {
            button.addEventListener("click", () => {
                if (state.isSending) return;

                const suggestion = button.getAttribute("data-chatbot-suggestion") ?? button.textContent ?? "";
                input.value = suggestion;
                sendMessage(suggestion);
            });
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && state.isOpen) {
                closeChatbot();
                toggle.focus();
            }
        });

        document.addEventListener("click", (event) => {
            if (state.isOpen && !chatbot.contains(event.target)) {
                closeChatbot();
            }
        });
    }

    document.addEventListener("DOMContentLoaded", initInvestmentChatbot);
})();
