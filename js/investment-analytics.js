(function () {
    const supermarketDatasetUrl = "../data/investment-analytics/supermarket_dataset.json";
    const usdTryRatesUrl = "../data/currency/usd_try_rates.json";
    const operatingProfitPerStoreChartMountId = "retail-operating-profit-per-store-chart";
    const svgNamespace = "http://www.w3.org/2000/svg";
    const defaultSectorKey = "retail";
    let supermarketDataset = null;
    let supermarketDatasetPromise = null;
    let activeSectorKey = defaultSectorKey;
    let sectorPanelHasRendered = false;
    let calculatorPanelHasRendered = false;
    let usdTryRatesPromise = null;

    function createSvgElement(tagName, attributes = {}) {
        const element = document.createElementNS(svgNamespace, tagName);

        Object.entries(attributes).forEach(([name, value]) => {
            element.setAttribute(name, value);
        });

        return element;
    }

    function getInvestmentFormatter(formatterName) {
        try {
            const formatter = window.TEKNOIFY_INVESTMENT_UTILS?.formatters?.[formatterName];

            return typeof formatter === "function" ? formatter : null;
        } catch (error) {
            console.warn(`Investment formatter bridge lookup failed for ${formatterName}; using local fallback.`, error);

            return null;
        }
    }

    function callInvestmentFormatter(formatterName, fallback, args) {
        const formatter = getInvestmentFormatter(formatterName);

        if (formatter) {
            try {
                return formatter(...args);
            } catch (error) {
                console.warn(`Investment formatter bridge failed for ${formatterName}; using local fallback.`, error);
            }
        }

        return fallback(...args);
    }

    function formatNumber(value) {
        return callInvestmentFormatter(
            "formatNumber",
            (fallbackValue) => Math.round(fallbackValue).toLocaleString("tr-TR"),
            [value]
        );
    }

    function formatUsdCompact(value) {
        return callInvestmentFormatter(
            "formatUsdCompact",
            (fallbackValue) => `$${Math.round(fallbackValue / 1000).toLocaleString("tr-TR")}K`,
            [value]
        );
    }

    function formatTlMillionCompactForTooltip(value) {
        const numericValue = Number(value);

        if (!Number.isFinite(numericValue)) {
            return "-";
        }

        const absoluteValue = Math.abs(numericValue);
        const formatCompactNumber = (displayValue, maximumFractionDigits = 1) => displayValue.toLocaleString("tr-TR", {
            minimumFractionDigits: 0,
            maximumFractionDigits
        });

        if (absoluteValue >= 1000) {
            return `${formatCompactNumber(numericValue / 1000)} mlr TL`;
        }

        if (absoluteValue >= 100) {
            return `${formatCompactNumber(numericValue, 0)} mn TL`;
        }

        if (absoluteValue >= 1) {
            return `${formatCompactNumber(numericValue)} mn TL`;
        }

        return `${formatCompactNumber(numericValue * 1000, 0)} bin TL`;
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

    function doesHashTargetElement(target) {
        const hash = window.location.hash;

        if (!hash || hash === "#") return false;

        const targetId = hash.slice(1);

        if (!targetId) return false;

        try {
            const hashTarget = document.getElementById(decodeURIComponent(targetId));

            return hashTarget === target || Boolean(hashTarget && target.contains(hashTarget));
        } catch {
            return false;
        }
    }

    function runWhenNearViewport(target, callback, options = {}) {
        if (!target || typeof callback !== "function") return;

        let didRun = false;
        let observer = null;

        const run = () => {
            if (didRun) return;

            didRun = true;
            observer?.disconnect();
            window.removeEventListener("hashchange", handleHashChange);
            callback();
        };

        function handleHashChange() {
            if (doesHashTargetElement(target)) {
                run();
            }
        }

        if (doesHashTargetElement(target)) {
            run();
            return;
        }

        if (!("IntersectionObserver" in window)) {
            run();
            return;
        }

        observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                run();
            }
        }, {
            rootMargin: options.rootMargin || "600px 0px",
            threshold: options.threshold ?? 0.01
        });

        window.addEventListener("hashchange", handleHashChange, { passive: true });
        observer.observe(target);
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


    function getSeriesKey(item) {
        return item.key || item.name;
    }

    function renderLegend(legend, series, visibleSeriesKeys, onToggleSeries) {
        legend.textContent = "";

        series.forEach((item) => {
            const seriesKey = getSeriesKey(item);
            const isAllVisible = !visibleSeriesKeys;
            const isActive = isAllVisible || visibleSeriesKeys.has(seriesKey);
            const legendItem = document.createElement("button");
            const marker = document.createElement("span");

            legendItem.type = "button";
            legendItem.className = `investment-chart-legend-button${isActive ? " is-active" : " is-muted"}`;
            legendItem.setAttribute("aria-pressed", String(isActive));
            legendItem.setAttribute("aria-label", `${item.name} serisini göster/gizle`);
            legendItem.addEventListener("click", () => onToggleSeries(seriesKey));

            marker.className = "investment-chart-legend-marker";
            marker.style.backgroundColor = item.color;
            marker.style.color = item.color;

            legendItem.append(marker, item.name);
            legend.appendChild(legendItem);
        });
    }

    function getInvestmentChartMathHelper(helperName) {
        const utilsChartMath = window.TEKNOIFY_INVESTMENT_UTILS?.chartMath;
        const standaloneChartMath = window.TEKNOIFY_INVESTMENT_CHART_MATH;
        const helper = utilsChartMath?.[helperName] || standaloneChartMath?.[helperName];

        return typeof helper === "function" ? helper : null;
    }

    function callInvestmentChartMathHelper(helperName, fallback, args) {
        const helper = getInvestmentChartMathHelper(helperName);

        if (helper) {
            try {
                return helper(...args);
            } catch (error) {
                console.warn(`Investment chart math bridge failed for ${helperName}; using local fallback.`, error);
            }
        }

        return fallback(...args);
    }

    function getPoint(index, value, periods, chartConfig) {
        return callInvestmentChartMathHelper(
            "getPoint",
            (fallbackIndex, fallbackValue, fallbackPeriods, fallbackChartConfig) => {
                const { left, top, width, height, maxValue, minValue } = fallbackChartConfig;
                const divisor = Math.max(fallbackPeriods.length - 1, 1);
                const valueRange = Math.max(maxValue - minValue, 1);
                const x = left + (fallbackIndex / divisor) * width;
                const y = top + height - ((fallbackValue - minValue) / valueRange) * height;

                return { x, y };
            },
            [index, value, periods, chartConfig]
        );
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

    function getSourceUrl(source) {
        return String(source?.url ?? "").trim();
    }

    function createSourceMarkup(source) {
        const sourceUrl = getSourceUrl(source);

        return sourceUrl
            ? `<div class="investment-chart-tooltip__source"><a class="investment-chart-tooltip__source-link" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">Kaynağı Aç</a></div>`
            : "";
    }

    function createFinancialTooltipContent(item, pointData, options, source) {
        const financials = pointData.quarterlyFinancials;
        const metricConfig = {
            revenuePerStoreUsd: {
                label: "Hasılat",
                value: financials?.revenueTlMillion
            },
            operatingProfitPerStoreUsd: {
                label: "FAVÖK",
                value: financials?.ebitdaTlMillion
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
            <div class="investment-chart-tooltip__header">
                <strong class="investment-chart-tooltip__company">${escapeHtml(item.name)}</strong>
                <span class="investment-chart-tooltip__period">${escapeHtml(pointData.period)}</span>
            </div>
            <span class="investment-chart-tooltip__divider" aria-hidden="true"></span>
            <div class="investment-chart-tooltip__body investment-chart-tooltip__rows">
                <div class="investment-chart-tooltip__row">
                    <span class="investment-chart-tooltip__label">Mağaza</span>
                    <span class="investment-chart-tooltip__metric">${escapeHtml(formatNumber(financials.totalStoreCount))}</span>
                </div>
                <div class="investment-chart-tooltip__row">
                    <span class="investment-chart-tooltip__label">${escapeHtml(metricConfig.label)}</span>
                    <span class="investment-chart-tooltip__metric">${escapeHtml(formatTlMillionCompactForTooltip(metricConfig.value))}</span>
                </div>
            </div>
            ${createSourceMarkup(source)}
        `;
    }

    function createTooltipContent(item, pointData, options) {
        const source = resolvePointSource(pointData);

        if (!getSourceUrl(source)) return null;

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
            <div class="investment-chart-tooltip__header">
                <strong class="investment-chart-tooltip__company">${safeName}</strong>
                <span class="investment-chart-tooltip__period">${safePeriod}</span>
            </div>
            <span class="investment-chart-tooltip__divider" aria-hidden="true"></span>
            <div class="investment-chart-tooltip__body investment-chart-tooltip__rows">
                <div class="investment-chart-tooltip__row investment-chart-tooltip__row--stacked">
                    <span class="investment-chart-tooltip__label">Değer</span>
                    <b class="investment-chart-tooltip__value">${safeValue}</b>
                </div>
                ${noteMarkup}
            </div>
            ${sourceMarkup}
        `;
    }

    function showTooltip(tooltip, content, point, chartConfig) {
        if (!content) return;

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
        if (!tooltipContent) return;

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

    function renderLineSeries(svg, chartConfig, tooltip, tooltipController, periods, series, options) {
        series.forEach((item, seriesIndex) => {
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

            svg.appendChild(createSvgElement("polyline", {
                points: points.join(" "),
                fill: "none",
                stroke: item.color,
                "stroke-width": options.mode === "modal" ? "5.2" : "4.8",
                "stroke-linecap": "round",
                "stroke-linejoin": "round",
                class: "investment-chart-line-glint",
                style: `--series-color: ${item.color}; --line-glint-delay: ${seriesIndex * 0.55}s`
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
        return callInvestmentChartMathHelper(
            "getLineChartConfig",
            (fallbackOptions, fallbackSeries) => {
                const rawMax = Math.max(...fallbackSeries.flatMap((item) => item.values), 1);
                const rawMin = Math.min(...fallbackSeries.flatMap((item) => item.values), 0);
                const roundedMax = Math.ceil(rawMax / fallbackOptions.axisStep) * fallbackOptions.axisStep;
                const lowerPadding = (roundedMax - rawMin) * 0.04;
                const roundedMin = Math.max(0, Math.floor((rawMin - lowerPadding) / fallbackOptions.axisStep) * fallbackOptions.axisStep);

                if (fallbackOptions.mode === "modal") {
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

                if (fallbackOptions.variant === "wide") {
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
            },
            [options, series]
        );
    }

    function renderLineChart(container, series, options) {
        const periods = options.periods;
        const chartConfig = getLineChartConfig(options, series);
        const svg = createSvgElement("svg", {
            viewBox: chartConfig.viewBox,
            role: "img",
            "aria-label": options.title
        });
        const tooltip = document.createElement("div");
        const legend = document.createElement("div");
        const tooltipController = createTooltipController(tooltip);
        let visibleSeriesKeys = null;

        tooltip.className = `investment-chart-tooltip${options.mode === "modal" ? " investment-chart-tooltip-large" : ""}`;
        legend.className = "investment-chart-legend";
        legend.setAttribute("role", "group");
        legend.setAttribute("aria-label", "Grafik serileri");

        function getVisibleSeries() {
            return visibleSeriesKeys
                ? series.filter((item) => visibleSeriesKeys.has(getSeriesKey(item)))
                : series;
        }

        function drawChart() {
            const visibleSeries = getVisibleSeries();

            hideTooltip(tooltip);
            tooltip.innerHTML = "";
            svg.textContent = "";
            renderLineGrid(svg, chartConfig, options.formatAxisValue);
            renderLineXAxis(svg, chartConfig, periods, options.mode);
            renderLineSeries(svg, chartConfig, tooltip, tooltipController, periods, visibleSeries, options);
            renderLegend(legend, series, visibleSeriesKeys, toggleSeries);
        }

        function toggleSeries(seriesKey) {
            if (!visibleSeriesKeys) {
                visibleSeriesKeys = new Set([seriesKey]);
            } else if (visibleSeriesKeys.has(seriesKey)) {
                visibleSeriesKeys.delete(seriesKey);

                if (!visibleSeriesKeys.size) {
                    visibleSeriesKeys = null;
                }
            } else {
                visibleSeriesKeys.add(seriesKey);

                if (visibleSeriesKeys.size === series.length) {
                    visibleSeriesKeys = null;
                }
            }

            drawChart();
        }

        container.textContent = "";
        container.append(svg, tooltip, legend);
        drawChart();
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
        return callInvestmentFormatter(
            "parseLocalizedNumber",
            (fallbackValue) => {
                const normalizedValue = String(fallbackValue ?? "")
                    .replace(/\s/g, "")
                    .replace(",", ".");
                const numberValue = Number.parseFloat(normalizedValue);

                return Number.isFinite(numberValue) ? numberValue : 0;
            },
            [value]
        );
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

    function formatUsdCurrency(value) {
        return callInvestmentFormatter(
            "formatUsdCurrency",
            (fallbackValue) => {
                const safeValue = Number.isFinite(fallbackValue) ? fallbackValue : 0;

                return safeValue.toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                    maximumFractionDigits: 0
                });
            },
            [value]
        );
    }

    function formatCalculatorPeriod(index, contributionFrequency) {
        if (contributionFrequency === "yearly") {
            return `${index}. Yıl`;
        }

        const year = Math.floor((index - 1) / 12) + 1;
        const month = ((index - 1) % 12) + 1;

        return `${year}. Yıl / ${month}. Ay`;
    }

    function getCompoundInterestHelper(helperName) {
        try {
            const compoundFromUtils = window.TEKNOIFY_INVESTMENT_UTILS?.calculators?.compoundInterest;
            const helperFromUtils = compoundFromUtils?.[helperName];

            if (typeof helperFromUtils === "function") {
                return helperFromUtils;
            }

            const standaloneCompound = window.TEKNOIFY_INVESTMENT_COMPOUND_INTEREST;
            const standaloneHelper = standaloneCompound?.[helperName];

            return typeof standaloneHelper === "function" ? standaloneHelper : null;
        } catch (error) {
            console.warn(`Investment compound bridge lookup failed for ${helperName}; using local fallback.`, error);

            return null;
        }
    }

    function callCompoundInterestHelper(helperName, fallback, args) {
        const helper = getCompoundInterestHelper(helperName);

        if (helper) {
            try {
                return helper(...args);
            } catch (error) {
                console.warn(`Investment compound bridge failed for ${helperName}; using local fallback.`, error);
            }
        }

        return fallback(...args);
    }

    function growCompoundValue(value, years, annualRate, compoundingPeriodsPerYear) {
        return callCompoundInterestHelper(
            "growCompoundValue",
            (value, years, annualRate, compoundingPeriodsPerYear) => {
                if (!Number.isFinite(value) || value <= 0 || years <= 0) {
                    return Number.isFinite(value) ? Math.max(value, 0) : 0;
                }

                const periodRate = annualRate / compoundingPeriodsPerYear;
                const growthBase = 1 + periodRate;

                if (growthBase <= 0) return 0;

                const grownValue = value * (growthBase ** (compoundingPeriodsPerYear * years));

                return Number.isFinite(grownValue) ? Math.max(grownValue, 0) : 0;
            },
            [value, years, annualRate, compoundingPeriodsPerYear]
        );
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
                <strong>${escapeHtml(formatUsdCurrency(value))}</strong>
            </article>
        `).join("");
    }

    function getCompoundChartPoint(index, value, points, chartConfig) {
        return callInvestmentChartMathHelper(
            "getCompoundChartPoint",
            (fallbackIndex, fallbackValue, fallbackPoints, fallbackChartConfig) => {
                const { left, top, width, height, maxValue } = fallbackChartConfig;
                const divisor = Math.max(fallbackPoints.length - 1, 1);
                const x = left + (fallbackIndex / divisor) * width;
                const y = top + height - (fallbackValue / maxValue) * height;

                return { x, y };
            },
            [index, value, points, chartConfig]
        );
    }

    function buildChartPath(points, key, chartConfig) {
        return callInvestmentChartMathHelper(
            "buildChartPath",
            (fallbackPoints, fallbackKey, fallbackChartConfig) => fallbackPoints.map((point, index) => {
                const coordinates = getCompoundChartPoint(index, point[fallbackKey], fallbackPoints, fallbackChartConfig);

                return `${index === 0 ? "M" : "L"}${coordinates.x.toFixed(2)} ${coordinates.y.toFixed(2)}`;
            }).join(" "),
            [points, key, chartConfig]
        );
    }

    function shouldShowChartValueLabel(index, totalPoints) {
        return callInvestmentChartMathHelper(
            "shouldShowChartValueLabel",
            (fallbackIndex, fallbackTotalPoints) => {
                if (fallbackTotalPoints <= 14) return true;
                if (fallbackIndex === 0 || fallbackIndex === fallbackTotalPoints - 1) return true;

                return fallbackIndex % Math.ceil(fallbackTotalPoints / 6) === 0;
            },
            [index, totalPoints]
        );
    }

    function appendSvgTitle(element, text) {
        const title = createSvgElement("title");
        title.textContent = text;
        element.appendChild(title);
    }

    function appendChartPointMarker(svg, options) {
        const group = createSvgElement("g", {
            class: "compound-chart-point-group",
            tabindex: "0",
            role: "img",
            "aria-label": options.ariaLabel
        });
        const marker = createSvgElement("circle", {
            class: options.className,
            cx: options.x,
            cy: options.y,
            r: options.radius ?? 4.4
        });
        const tooltipLines = options.tooltip.split("\n");
        const tooltipWidth = 196;
        const tooltipHeight = 46;
        const tooltipX = options.x > 560 ? options.x - tooltipWidth - 12 : options.x + 12;
        const tooltipY = Math.max(8, options.y - tooltipHeight - 12);
        const tooltip = createSvgElement("g", {
            class: "compound-chart-tooltip",
            transform: `translate(${tooltipX.toFixed(2)} ${tooltipY.toFixed(2)})`,
            "aria-hidden": "true"
        });
        const tooltipText = createSvgElement("text", { x: 12, y: 18 });

        appendSvgTitle(group, options.tooltip);
        tooltip.appendChild(createSvgElement("rect", {
            width: tooltipWidth,
            height: tooltipHeight,
            rx: 12,
            ry: 12
        }));
        tooltipLines.slice(0, 2).forEach((line, index) => {
            const tspan = createSvgElement("tspan", { x: 12, dy: index === 0 ? 0 : 17 });
            tspan.textContent = line;
            tooltipText.appendChild(tspan);
        });
        tooltip.appendChild(tooltipText);
        group.appendChild(marker);
        group.appendChild(tooltip);
        svg.appendChild(group);

        return marker;
    }

    function appendChartValueLabel(svg, options) {
        const label = createSvgElement("text", {
            class: options.className ?? "compound-chart-value-label",
            x: options.x,
            y: options.y,
            "text-anchor": options.textAnchor ?? "middle"
        });

        label.textContent = options.text;
        svg.appendChild(label);
    }

    function renderGrowthChart(points) {
        const mount = document.getElementById("compound-growth-chart");
        const summary = document.querySelector("[data-compound-chart-summary]");

        if (!mount) return;

        const width = 760;
        const height = 330;
        const chartConfig = {
            left: 68,
            top: 34,
            width: 650,
            height: 226,
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

            label.textContent = formatUsdCurrency(value).replace(",00", "");
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
            const investedCoordinates = getCompoundChartPoint(index, point.invested, points, chartConfig);
            const gainCoordinates = getCompoundChartPoint(index, point.gain, points, chartConfig);
            const showValueLabel = shouldShowChartValueLabel(index, points.length);

            appendChartPointMarker(svg, {
                className: "compound-chart-point compound-chart-point--invested",
                x: investedCoordinates.x,
                y: investedCoordinates.y,
                ariaLabel: `${point.label}: Toplam yatırılan para ${formatUsdCurrency(point.invested)}`,
                tooltip: `${point.label}\nToplam Yatırılan Para: ${formatUsdCurrency(point.invested)}`
            });
            appendChartPointMarker(svg, {
                className: "compound-chart-point compound-chart-point--gain",
                x: gainCoordinates.x,
                y: gainCoordinates.y,
                ariaLabel: `${point.label}: Bileşik getiri ${formatUsdCurrency(point.gain)}`,
                tooltip: `${point.label}\nBileşik Getiri / Kazanç: ${formatUsdCurrency(point.gain)}`
            });

            if (showValueLabel) {
                appendChartValueLabel(svg, {
                    x: investedCoordinates.x,
                    y: Math.max(chartConfig.top + 12, investedCoordinates.y - 10),
                    text: formatUsdCompact(point.invested),
                    className: "compound-chart-value-label compound-chart-value-label--invested"
                });
                appendChartValueLabel(svg, {
                    x: gainCoordinates.x,
                    y: Math.min(chartConfig.top + chartConfig.height - 8, gainCoordinates.y + 18),
                    text: formatUsdCompact(point.gain),
                    className: "compound-chart-value-label compound-chart-value-label--gain"
                });
            }
        });

        points.forEach((point, index) => {
            if (!shouldShowChartValueLabel(index, points.length)) return;

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

            summary.textContent = `${lastPoint.label} sonunda USD olarak yatırılan para ${formatUsdCurrency(
                lastPoint.invested
            )}, bileşik getiri ${formatUsdCurrency(lastPoint.gain)}. Her yıllık noktanın üzerine gelerek veya odağa alarak değerleri inceleyebilirsiniz.`;
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
                <td>${escapeHtml(formatUsdCurrency(row.startingBalance))}</td>
                <td>${escapeHtml(formatUsdCurrency(row.contribution))}</td>
                <td>${escapeHtml(formatUsdCurrency(row.periodReturn))}</td>
                <td>${escapeHtml(formatUsdCurrency(row.totalInvested))}</td>
                <td>${escapeHtml(formatUsdCurrency(row.endingBalance))}</td>
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

        sectorPanelHasRendered = true;
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

        sectorPanelHasRendered = true;
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
        const sectorSection = document.getElementById("retail-store-performance");

        if (!selectorButtons.length) return;

        selectorButtons.forEach((button) => {
            button.addEventListener("click", () => {
                renderSectorPanel(button.dataset.sectorKey);
            });
        });

        runWhenNearViewport(sectorSection, () => {
            if (!sectorPanelHasRendered) {
                renderSectorPanel(defaultSectorKey);
            }
        });
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

                if ((hash === "#retail-store-performance" || hash === "#sector-analysis") && !sectorPanelHasRendered) {
                    renderSectorPanel(defaultSectorKey);
                }

                if (hash === "#investment-calculators" && !calculatorPanelHasRendered) {
                    renderCalculatorPanel(defaultCalculatorKey);
                }

                target.scrollIntoView({ behavior: "smooth", block: "start" });
                window.history.pushState(null, "", hash);
            });
        });
    }

    const defaultCalculatorKey = "compound";
    let activeCalculatorKey = defaultCalculatorKey;

    function formatPercent(value) {
        const safeValue = Number.isFinite(value) ? value : 0;

        return `${(safeValue * 100).toLocaleString("tr-TR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}%`;
    }

    function formatDurationYears(totalYears) {
        if (!Number.isFinite(totalYears) || totalYears < 0) return "-";

        const years = Math.floor(totalYears);
        const months = Math.round((totalYears - years) * 12);
        const normalizedYears = years + Math.floor(months / 12);
        const normalizedMonths = months % 12;

        if (normalizedYears === 0 && normalizedMonths === 0) return "0 ay";
        if (normalizedMonths === 0) return `${normalizedYears} yıl`;
        if (normalizedYears === 0) return `${normalizedMonths} ay`;

        return `${normalizedYears} yıl ${normalizedMonths} ay`;
    }

    function getCagrFieldNumber(id) {
        return parseLocalizedNumber(document.getElementById(id)?.value);
    }

    function updateCalculatorSelectorState(calculatorKey) {
        document.querySelectorAll("[data-calculator-key]").forEach((button) => {
            const isActive = button.dataset.calculatorKey === calculatorKey;
            const label = button.querySelector("small");

            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-pressed", String(isActive));

            if (label && !button.disabled) {
                const inactiveLabels = {
                    cagr: "Yıllık bileşik büyüme",
                    retirement: "Finansal yol haritası",
                    compound: "Bileşik getiri senaryosu"
                };

                label.textContent = isActive ? "Aktif hesaplayıcı" : inactiveLabels[button.dataset.calculatorKey] ?? "Bileşik getiri senaryosu";
            }
        });
    }

    function renderCompoundCalculatorPanel() {
        const panel = document.getElementById("calculator-panel");
        const template = document.getElementById("compound-calculator-template");

        if (!panel || !template) return;

        panel.innerHTML = template.innerHTML;
        initCompoundInterestCalculator();
    }

    function renderCagrCalculatorPanel() {
        const panel = document.getElementById("calculator-panel");

        if (!panel) return;

        panel.innerHTML = `
            <article id="cagr-calculator" class="cagr-calculator" aria-labelledby="cagr-calculator-title">
                <div class="cagr-calculator__input-panel">
                    <div class="compound-calculator__panel-header">
                        <h3 id="cagr-calculator-title">CAGR Hesaplayıcı</h3>
                        <p>Başlangıç ve bitiş USD değerleri arasındaki yıllık bileşik büyüme oranını hesaplayın.</p>
                    </div>

                    <div class="compound-calculator__fields">
                        <div class="compound-field">
                            <label for="cagr-beginning-value">Başlangıç Tutarı / Değeri (USD)</label>
                            <input id="cagr-beginning-value" class="cagr-calculator-input" type="number" min="0" step="100" value="10000" inputmode="decimal">
                        </div>
                        <div class="compound-field cagr-ending-field" data-cagr-ending-field>
                            <label for="cagr-ending-value">Bitiş Tutarı / Değeri (USD)</label>
                            <input id="cagr-ending-value" class="cagr-calculator-input" type="number" min="0" step="100" value="25000" inputmode="decimal">
                        </div>
                    </div>

                    <fieldset class="cagr-duration-mode" aria-label="Süre seçimi">
                        <legend>Süre Seçimi</legend>
                        <div class="cagr-mode-toggle">
                            <button type="button" class="is-active" data-cagr-duration-mode="duration" aria-pressed="true">Süre Bazlı</button>
                            <button type="button" data-cagr-duration-mode="dates" aria-pressed="false">Tarih Bazlı</button>
                        </div>
                    </fieldset>

                    <div class="compound-calculator__fields cagr-duration-fields" data-cagr-duration-fields>
                        <div class="compound-field">
                            <label for="cagr-years">Yıl</label>
                            <input id="cagr-years" class="cagr-calculator-input" type="number" min="0" step="1" value="5" inputmode="decimal">
                        </div>
                        <div class="compound-field">
                            <label for="cagr-months">Ay</label>
                            <input id="cagr-months" class="cagr-calculator-input" type="number" min="0" max="11" step="1" value="0" inputmode="decimal">
                        </div>
                    </div>

                    <div class="compound-calculator__fields cagr-date-fields" data-cagr-date-fields hidden>
                        <div class="compound-field">
                            <label for="cagr-start-date">Başlangıç Tarihi</label>
                            <input id="cagr-start-date" class="cagr-calculator-input" type="date" value="2021-01-01">
                        </div>
                        <div class="compound-field">
                            <label for="cagr-end-date">Bitiş Tarihi</label>
                            <input id="cagr-end-date" class="cagr-calculator-input" type="date" value="2026-01-01">
                        </div>
                    </div>

                    <details class="cagr-advanced-settings compound-advanced-settings">
                        <summary><span>Gelişmiş Seçenekler</span><i class="fas fa-chevron-down" aria-hidden="true"></i></summary>
                        <div class="compound-calculator__fields compound-calculator__fields--advanced">
                            <div class="compound-field">
                                <label for="cagr-inflation-rate">Enflasyon Oranı (%)</label>
                                <input id="cagr-inflation-rate" class="cagr-calculator-input" type="number" step="0.1" value="0" inputmode="decimal">
                            </div>
                            <div class="compound-field">
                                <label for="cagr-target-rate">Hedef CAGR (%)</label>
                                <input id="cagr-target-rate" class="cagr-calculator-input" type="number" step="0.1" value="12" inputmode="decimal">
                            </div>
                            <div class="compound-field">
                                <label for="cagr-calculation-mode">Hesaplama Modu</label>
                                <select id="cagr-calculation-mode" class="cagr-calculator-input">
                                    <option value="cagr" selected>CAGR Hesapla</option>
                                    <option value="ending">Bitiş Değeri Hesapla</option>
                                    <option value="duration">Gereken Süreyi Hesapla</option>
                                </select>
                            </div>
                        </div>
                    </details>
                </div>

                <div class="cagr-calculator__result-panel compound-calculator__result-panel">
                    <div class="cagr-validation-message" data-cagr-validation role="status" aria-live="polite"></div>
                    <div class="cagr-results-grid" data-cagr-results aria-live="polite"></div>

                    <div class="cagr-growth-chart compound-chart-card">
                        <div class="compound-chart-card__header">
                            <div>
                                <h3>Pürüzsüz Büyüme Eğrisi</h3>
                                <p data-cagr-chart-summary>USD bazında tutarlı CAGR varsayımıyla büyüme eğrisi.</p>
                            </div>
                        </div>
                        <div id="cagr-growth-chart" class="compound-growth-chart" role="img" aria-label="USD bazında CAGR ile pürüzsüz yatırım büyüme eğrisi"></div>
                    </div>

                    <div class="cagr-projection-table compound-breakdown-card">
                        <div class="compound-breakdown-card__header">
                            <div>
                                <h3>Yıllık İzdüşüm Tablosu</h3>
                                <p data-cagr-table-note>Yıllık dönemlere göre değer değişimi.</p>
                            </div>
                        </div>
                        <div class="compound-breakdown-table-wrap">
                            <table class="compound-breakdown-table">
                                <thead>
                                    <tr>
                                        <th>Dönem</th>
                                        <th>Dönem Başı Değer</th>
                                        <th>Yıllık Değer Değişimi</th>
                                        <th>Dönem Sonu Değer</th>
                                        <th>Toplam Getiri %</th>
                                    </tr>
                                </thead>
                                <tbody data-cagr-projection-body></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </article>
        `;

        initCagrCalculator();
    }

    function getRetirementHelper(helperName) {
        try {
            const retirementFromUtils = window.TEKNOIFY_INVESTMENT_UTILS?.calculators?.retirement;
            const standaloneRetirement = window.TEKNOIFY_INVESTMENT_RETIREMENT;
            const helper = retirementFromUtils?.[helperName] || standaloneRetirement?.[helperName];

            return typeof helper === "function" ? helper : null;
        } catch (error) {
            console.warn(`Investment retirement bridge lookup failed for ${helperName}; using local fallback.`, error);

            return null;
        }
    }

    function callRetirementHelper(helperName, fallback, args) {
        const helper = getRetirementHelper(helperName);

        if (helper) {
            try {
                return helper(...args);
            } catch (error) {
                console.warn(`Investment retirement bridge failed for ${helperName}; using local fallback.`, error);
            }
        }

        return fallback(...args);
    }

    function safeMoney(value) {
        return callRetirementHelper(
            "safeMoney",
            (fallbackValue) => Number.isFinite(fallbackValue) ? Math.max(fallbackValue, 0) : 0,
            [value]
        );
    }

    function getMonthlyRate(annualRate) {
        if (!Number.isFinite(annualRate)) return 0;
        return Math.max((Math.max(1 + annualRate, 0) ** (1 / 12)) - 1, -1);
    }

    function discountToToday(value, inflationRate, years) {
        const discountBase = Math.max(1 + inflationRate, 0.01) ** Math.max(years, 0);
        const discounted = value / discountBase;

        return Number.isFinite(discounted) ? discounted : 0;
    }

    function getRetirementFieldNumber(id) {
        return parseLocalizedNumber(document.getElementById(id)?.value);
    }

    function renderRetirementCalculatorPanel() {
        const panel = document.getElementById("calculator-panel");

        if (!panel) return;

        panel.innerHTML = `
            <article id="retirement-calculator" class="retirement-calculator" aria-labelledby="retirement-calculator-title">
                <div class="retirement-calculator__input-panel">
                    <div class="compound-calculator__panel-header">
                        <h3 id="retirement-calculator-title">Emeklilik Hesaplayıcı</h3>
                        <p>Mevcut yaşınız, USD birikiminiz, aylık katkınız ve emeklilikte hedeflediğiniz gelir üzerinden finansal yol haritanızı hesaplayın.</p>
                    </div>

                    <div class="compound-calculator__fields">
                        <div class="compound-field">
                            <label for="retirement-current-age">Mevcut Yaş</label>
                            <input id="retirement-current-age" class="retirement-calculator-input" type="number" min="18" max="100" step="1" value="30" inputmode="decimal">
                        </div>
                        <div class="compound-field">
                            <label for="retirement-target-age">Hedeflenen Emeklilik Yaşı</label>
                            <input id="retirement-target-age" class="retirement-calculator-input" type="number" min="19" max="120" step="1" value="60" inputmode="decimal">
                        </div>
                        <div class="compound-field">
                            <label for="retirement-life-expectancy">Yaşam Beklentisi</label>
                            <small>Kaç yaşına kadar finansal planlama yapılacağı</small>
                            <input id="retirement-life-expectancy" class="retirement-calculator-input" type="number" min="20" max="130" step="1" value="85" inputmode="decimal">
                        </div>
                        <div class="compound-field">
                            <label for="retirement-current-savings">Mevcut Emeklilik Birikimi (USD)</label>
                            <input id="retirement-current-savings" class="retirement-calculator-input" type="number" min="0" step="1000" value="25000" inputmode="decimal">
                        </div>
                        <div class="compound-field">
                            <label for="retirement-monthly-contribution">Aylık Katkı Payı (USD)</label>
                            <small>Emekli olana kadar her ay kenara ayrılacak tutar</small>
                            <input id="retirement-monthly-contribution" class="retirement-calculator-input" type="number" min="0" step="500" value="500" inputmode="decimal">
                        </div>
                    </div>

                    <details class="retirement-advanced-settings compound-advanced-settings">
                        <summary><span>Gelişmiş Seçenekler</span><i class="fas fa-chevron-down" aria-hidden="true"></i></summary>
                        <div class="compound-calculator__fields compound-calculator__fields--advanced">
                            <div class="compound-field">
                                <label for="retirement-pre-return">Emeklilik Öncesi Yıllık Getiri Oranı (%)</label>
                                <input id="retirement-pre-return" class="retirement-calculator-input" type="number" step="0.1" value="10" inputmode="decimal">
                            </div>
                            <div class="compound-field">
                                <label for="retirement-post-return">Emeklilik Sonrası Yıllık Getiri Oranı (%)</label>
                                <input id="retirement-post-return" class="retirement-calculator-input" type="number" step="0.1" value="5" inputmode="decimal">
                            </div>
                            <div class="compound-field">
                                <label for="retirement-inflation-rate">Yıllık Enflasyon Oranı (%)</label>
                                <input id="retirement-inflation-rate" class="retirement-calculator-input" type="number" min="-99" step="0.1" value="3" inputmode="decimal">
                            </div>
                            <div class="compound-field">
                                <label for="retirement-desired-income">Emeklilikte İstenen Aylık Gelir (USD, Bugünün Alım Gücüyle)</label>
                                <input id="retirement-desired-income" class="retirement-calculator-input" type="number" min="0" step="1000" value="3000" inputmode="decimal">
                            </div>
                            <div class="compound-field">
                                <label for="retirement-contribution-growth">Maaş / Katkı Artış Oranı (%)</label>
                                <input id="retirement-contribution-growth" class="retirement-calculator-input" type="number" step="0.1" value="5" inputmode="decimal">
                            </div>
                        </div>
                    </details>
                </div>

                <div class="retirement-calculator__result-panel compound-calculator__result-panel">
                    <div class="retirement-validation-message" data-retirement-validation role="status" aria-live="polite"></div>
                    <div class="retirement-results-grid" data-retirement-results aria-live="polite"></div>

                    <div class="retirement-growth-chart compound-chart-card">
                        <div class="compound-chart-card__header">
                            <div>
                                <h3>Birikim ve Harcama Eğrisi</h3>
                                <p data-retirement-chart-summary>Yaşa göre USD emeklilik fonu yaşam döngüsü.</p>
                            </div>
                        </div>
                        <div id="retirement-growth-chart" class="compound-growth-chart retirement-growth-chart__mount" role="img" aria-label="Mevcut yaştan yaşam beklentisine kadar USD birikim ve harcama eğrisi"></div>
                    </div>

                    <div class="retirement-breakdown-table compound-breakdown-card">
                        <div class="compound-breakdown-card__header">
                            <div>
                                <h3>Yaş Bazlı Döküm Tablosu</h3>
                                <p data-retirement-table-note>Her yaş için eklenen/çekilen tutar ve getiri özeti.</p>
                            </div>
                        </div>
                        <div class="compound-breakdown-table-wrap">
                            <table class="compound-breakdown-table retirement-breakdown-table__table">
                                <thead>
                                    <tr>
                                        <th>Yaş</th>
                                        <th>Yıl Başı Bakiyesi</th>
                                        <th>O Yıl Eklenen / Çekilen Tutar</th>
                                        <th>Kazanılan Faiz</th>
                                        <th>Yıl Sonu Bakiyesi</th>
                                    </tr>
                                </thead>
                                <tbody data-retirement-breakdown-body></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </article>
        `;

        initRetirementCalculator();
    }

    function parseRetirementInputs() {
        return {
            currentAge: getRetirementFieldNumber("retirement-current-age"),
            retirementAge: getRetirementFieldNumber("retirement-target-age"),
            lifeExpectancy: getRetirementFieldNumber("retirement-life-expectancy"),
            currentSavings: getRetirementFieldNumber("retirement-current-savings"),
            monthlyContribution: getRetirementFieldNumber("retirement-monthly-contribution"),
            preRetirementReturn: getRetirementFieldNumber("retirement-pre-return") / 100,
            postRetirementReturn: getRetirementFieldNumber("retirement-post-return") / 100,
            inflationRate: getRetirementFieldNumber("retirement-inflation-rate") / 100,
            desiredMonthlyIncome: getRetirementFieldNumber("retirement-desired-income"),
            contributionGrowthRate: getRetirementFieldNumber("retirement-contribution-growth") / 100
        };
    }

    function validateRetirementInputs(inputs) {
        if (inputs.currentAge < 18 || inputs.currentAge > 100) return "Mevcut yaş 18 ile 100 arasında olmalıdır.";
        if (inputs.retirementAge <= inputs.currentAge) return "Hedeflenen emeklilik yaşı mevcut yaştan büyük olmalıdır.";
        if (inputs.lifeExpectancy <= inputs.retirementAge) return "Yaşam beklentisi emeklilik yaşından büyük olmalıdır.";
        if (inputs.currentSavings < 0) return "Mevcut emeklilik birikimi negatif olamaz.";
        if (inputs.monthlyContribution < 0) return "Aylık katkı payı negatif olamaz.";
        if (inputs.desiredMonthlyIncome < 0) return "Emeklilikte istenen aylık gelir negatif olamaz.";
        if (inputs.inflationRate < -0.99) return "Enflasyon oranı -99%'dan düşük olmamalıdır.";
        if (!Object.values(inputs).every(Number.isFinite)) return "Lütfen tüm alanlara geçerli sayısal değerler girin.";

        return "";
    }

    function simulateRetirementAccumulation(inputs, extraMonthlyContribution = 0) {
        const rows = [];
        const monthlyReturn = getMonthlyRate(inputs.preRetirementReturn);
        let balance = Math.max(inputs.currentSavings, 0);
        let monthlyContribution = Math.max(inputs.monthlyContribution + extraMonthlyContribution, 0);
        const years = Math.max(Math.round(inputs.retirementAge - inputs.currentAge), 0);

        for (let yearIndex = 0; yearIndex < years; yearIndex += 1) {
            const startingBalance = balance;
            let contribution = 0;
            let interest = 0;

            for (let month = 0; month < 12; month += 1) {
                const beforeReturn = balance;
                balance = safeMoney(balance * (1 + monthlyReturn));
                interest += balance - beforeReturn;
                balance = safeMoney(balance + monthlyContribution);
                contribution += monthlyContribution;
            }

            rows.push({
                age: inputs.currentAge + yearIndex,
                phase: "accumulation",
                startingBalance,
                cashFlow: contribution,
                interest,
                endingBalance: balance
            });

            monthlyContribution = Math.max(monthlyContribution * (1 + inputs.contributionGrowthRate), 0);
        }

        return { fundAtRetirement: balance, rows };
    }

    function simulateRetirementDrawdown(inputs, initialFund, options = {}) {
        const rows = [];
        const monthlyReturn = getMonthlyRate(inputs.postRetirementReturn);
        const yearsToRetirement = Math.max(inputs.retirementAge - inputs.currentAge, 0);
        const retirementYears = Math.max(Math.round(inputs.lifeExpectancy - inputs.retirementAge), 0);
        let balance = Math.max(initialFund, 0);
        let monthlyWithdrawal = Math.max(inputs.desiredMonthlyIncome, 0) * (Math.max(1 + inputs.inflationRate, 0.01) ** yearsToRetirement);
        let depletionAge = null;

        for (let yearIndex = 0; yearIndex < retirementYears; yearIndex += 1) {
            const startingBalance = balance;
            let withdrawals = 0;
            let interest = 0;

            for (let month = 0; month < 12; month += 1) {
                if (balance <= 0) {
                    balance = 0;
                    continue;
                }

                const beforeReturn = balance;
                balance = safeMoney(balance * (1 + monthlyReturn));
                interest += balance - beforeReturn;
                const withdrawal = Math.min(balance, monthlyWithdrawal);
                balance = safeMoney(balance - withdrawal);
                withdrawals += withdrawal;

                if (balance <= 0 && depletionAge === null) {
                    depletionAge = inputs.retirementAge + yearIndex + ((month + 1) / 12);
                }
            }

            rows.push({
                age: inputs.retirementAge + yearIndex,
                phase: "drawdown",
                startingBalance,
                cashFlow: -withdrawals,
                interest,
                endingBalance: balance
            });

            monthlyWithdrawal = Math.max(monthlyWithdrawal * (1 + inputs.inflationRate), 0);
        }

        return {
            rows,
            endingBalance: balance,
            depletionAge,
            supportsPlan: depletionAge === null || options.allowZeroAtEnd === true
        };
    }

    function calculateProjectedRetirementFund(inputs, extraMonthlyContribution = 0) {
        return simulateRetirementAccumulation(inputs, extraMonthlyContribution).fundAtRetirement;
    }

    function calculateRetirementTargetFund(inputs) {
        if (inputs.desiredMonthlyIncome === 0) return 0;

        let lower = 0;
        let upper = Math.max(inputs.desiredMonthlyIncome * 12 * Math.max(inputs.lifeExpectancy - inputs.retirementAge, 1), 1);
        let guard = 0;

        while (!simulateRetirementDrawdown(inputs, upper).supportsPlan && guard < 80) {
            upper *= 2;
            guard += 1;
        }

        if (!Number.isFinite(upper)) return 0;

        for (let index = 0; index < 70; index += 1) {
            const middle = (lower + upper) / 2;
            if (simulateRetirementDrawdown(inputs, middle).supportsPlan) {
                upper = middle;
            } else {
                lower = middle;
            }
        }

        return upper;
    }

    function calculateRequiredAdditionalMonthlyContribution(inputs, targetFund, projectedFund) {
        if (projectedFund >= targetFund) return 0;

        let lower = 0;
        let upper = Math.max(inputs.monthlyContribution || 1000, 1000);
        let guard = 0;

        while (calculateProjectedRetirementFund(inputs, upper) < targetFund && guard < 60) {
            upper *= 2;
            guard += 1;
        }

        if (guard >= 60 || !Number.isFinite(upper)) return null;

        for (let index = 0; index < 60; index += 1) {
            const middle = (lower + upper) / 2;
            if (calculateProjectedRetirementFund(inputs, middle) >= targetFund) {
                upper = middle;
            } else {
                lower = middle;
            }
        }

        return upper;
    }

    function buildRetirementLifecycleRows(inputs) {
        const accumulation = simulateRetirementAccumulation(inputs);
        const drawdown = simulateRetirementDrawdown(inputs, accumulation.fundAtRetirement);

        return {
            rows: [...accumulation.rows, ...drawdown.rows],
            projectedFund: accumulation.fundAtRetirement,
            depletionAge: drawdown.depletionAge,
            endingBalance: drawdown.endingBalance
        };
    }

    function buildRetirementChartPoints(inputs, rows) {
        const points = [{ age: inputs.currentAge, value: inputs.currentSavings }];

        rows.forEach((row) => {
            points.push({ age: row.age + 1, value: row.endingBalance });
        });

        return points;
    }

    function calculateRetirementPlan(inputs) {
        const targetFund = calculateRetirementTargetFund(inputs);
        const lifecycle = buildRetirementLifecycleRows(inputs);
        const fundingGap = lifecycle.projectedFund - targetFund;
        const yearsToRetirement = Math.max(inputs.retirementAge - inputs.currentAge, 0);
        const realProjectedFund = discountToToday(lifecycle.projectedFund, inputs.inflationRate, yearsToRetirement);
        const realTargetFund = discountToToday(targetFund, inputs.inflationRate, yearsToRetirement);
        const realPreRetirementReturn = ((1 + inputs.preRetirementReturn) / Math.max(1 + inputs.inflationRate, 0.01)) - 1;
        const realPostRetirementReturn = ((1 + inputs.postRetirementReturn) / Math.max(1 + inputs.inflationRate, 0.01)) - 1;
        const additionalMonthlyContribution = fundingGap < 0
            ? calculateRequiredAdditionalMonthlyContribution(inputs, targetFund, lifecycle.projectedFund)
            : 0;

        return {
            ...lifecycle,
            targetFund,
            fundingGap,
            realProjectedFund,
            realTargetFund,
            realPreRetirementReturn,
            realPostRetirementReturn,
            additionalMonthlyContribution,
            chartPoints: buildRetirementChartPoints(inputs, lifecycle.rows)
        };
    }

    function renderRetirementResults(results) {
        const container = document.querySelector("[data-retirement-results]");
        if (!container) return;

        const gapDescription = results.fundingGap < 0
            ? `Hedefinize ulaşmak için yaklaşık ${formatUsdCurrency(Math.abs(results.fundingGap))} ek fona ihtiyacınız var.${results.additionalMonthlyContribution === null ? "" : ` Aylık katkınızı yaklaşık ${formatUsdCurrency(results.additionalMonthlyContribution)} artırmanız gerekebilir.`}`
            : `Tahmini birikiminiz hedefinizi yaklaşık ${formatUsdCurrency(results.fundingGap)} aşıyor.`;
        const depletionText = results.depletionAge === null
            ? "Planlanan yaşa kadar yeterli"
            : `${results.depletionAge.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} yaş`;
        const cards = [
            ["Hedeflenen Emeklilik Fonu Büyüklüğü", formatUsdCurrency(results.targetFund), `Nominal • Bugünkü alım gücüyle ${formatUsdCurrency(results.realTargetFund)}`],
            ["Tahmini Birikecek Toplam Fon", formatUsdCurrency(results.projectedFund), `Nominal • Bugünkü alım gücüyle ${formatUsdCurrency(results.realProjectedFund)}`],
            ["Durum Özeti / Fark", formatUsdCurrency(results.fundingGap), gapDescription],
            ["Fonun Tükeneceği Yaş", depletionText, results.depletionAge === null ? "Fon yaşam beklentisine kadar tükenmiyor." : "Projeksiyona göre fon bu yaşta sıfırlanır."],
            ["Reel Emeklilik Fonu", formatUsdCurrency(results.realProjectedFund), `Reel getiri: emeklilik öncesi ${formatPercent(results.realPreRetirementReturn)}, sonrası ${formatPercent(results.realPostRetirementReturn)}`]
        ];

        container.innerHTML = cards.map(([label, value, description]) => `
            <div class="retirement-result-card compound-result-card">
                <span>${escapeHtml(label)}</span>
                <strong>${escapeHtml(value)}</strong>
                <small>${escapeHtml(description)}</small>
            </div>
        `).join("");
    }

    function renderRetirementGrowthChart(points) {
        const mount = document.getElementById("retirement-growth-chart");
        const summary = document.querySelector("[data-retirement-chart-summary]");

        if (!mount || points.length < 2) return;

        const width = 780;
        const height = 330;
        const maxValue = Math.max(...points.map((point) => point.value), 1);
        const chartConfig = { left: 68, top: 34, width: 650, height: 226, maxValue: maxValue * 1.1 };
        const divisor = Math.max(points.length - 1, 1);
        const getPoint = (point, index) => ({
            x: chartConfig.left + (index / divisor) * chartConfig.width,
            y: chartConfig.top + chartConfig.height - ((point.value / chartConfig.maxValue) * chartConfig.height)
        });
        const path = points.map((point, index) => {
            const coordinates = getPoint(point, index);
            return `${index === 0 ? "M" : "L"}${coordinates.x.toFixed(2)} ${coordinates.y.toFixed(2)}`;
        }).join(" ");
        const areaPath = `${path} L${chartConfig.left + chartConfig.width} ${chartConfig.top + chartConfig.height} L${chartConfig.left} ${chartConfig.top + chartConfig.height} Z`;
        const svg = createSvgElement("svg", { viewBox: `0 0 ${width} ${height}`, role: "presentation", focusable: "false" });

        for (let step = 0; step <= 4; step += 1) {
            const y = chartConfig.top + (step / 4) * chartConfig.height;
            const value = chartConfig.maxValue - (step / 4) * chartConfig.maxValue;
            svg.appendChild(createSvgElement("line", { class: "compound-chart-grid-line", x1: chartConfig.left, x2: chartConfig.left + chartConfig.width, y1: y, y2: y }));
            const label = createSvgElement("text", { class: "compound-chart-axis-label", x: chartConfig.left - 10, y: y + 4, "text-anchor": "end" });
            label.textContent = formatUsdCurrency(value).replace(",00", "");
            svg.appendChild(label);
        }

        svg.appendChild(createSvgElement("path", { class: "compound-chart-area retirement-chart-area", d: areaPath, fill: "#8b5cf6" }));
        svg.appendChild(createSvgElement("path", { class: "compound-chart-line retirement-chart-line", d: path, stroke: "#c4b5fd" }));

        points.forEach((point, index) => {
            const coordinates = getPoint(point, index);
            const ageLabel = `${point.age.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} yaş`;
            const phaseLabel = index > 0 && points[index - 1]?.age < point.age && point.age > points[0].age ? "Yıl sonu bakiye" : "Başlangıç bakiye";

            appendChartPointMarker(svg, {
                className: "compound-chart-point retirement-chart-point",
                x: coordinates.x,
                y: coordinates.y,
                ariaLabel: `${ageLabel}: ${formatUsdCurrency(point.value)}`,
                tooltip: `${ageLabel}\n${phaseLabel}: ${formatUsdCurrency(point.value)}`
            });

            if (shouldShowChartValueLabel(index, points.length)) {
                appendChartValueLabel(svg, {
                    x: coordinates.x,
                    y: Math.max(chartConfig.top + 12, coordinates.y - 10),
                    text: formatUsdCompact(point.value)
                });
            }
        });

        points.forEach((point, index) => {
            if (!shouldShowChartValueLabel(index, points.length)) return;

            const coordinates = getPoint(point, index);
            const label = createSvgElement("text", { class: "compound-chart-axis-label", x: coordinates.x, y: chartConfig.top + chartConfig.height + 32, "text-anchor": index === 0 ? "start" : index === points.length - 1 ? "end" : "middle" });
            label.textContent = `${point.age.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} yaş`;
            svg.appendChild(label);
        });

        mount.textContent = "";
        mount.appendChild(svg);

        if (summary) {
            const peak = points.reduce((highest, point) => point.value > highest.value ? point : highest, points[0]);
            summary.textContent = `Eğri ${peak.age.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} yaş civarında ${formatUsdCurrency(peak.value)} nominal USD tepe fonu gösteriyor. Her yaş/yıl noktası odaklanabilir ve değer etiketi veya ipucu sunar.`;
        }
    }

    function renderRetirementBreakdownTable(rows) {
        const body = document.querySelector("[data-retirement-breakdown-body]");
        const note = document.querySelector("[data-retirement-table-note]");

        if (!body) return;

        body.innerHTML = rows.map((row) => `
            <tr>
                <td>${escapeHtml(`${row.age.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} yaş`)}</td>
                <td>${escapeHtml(formatUsdCurrency(row.startingBalance))}</td>
                <td class="${row.cashFlow < 0 ? "is-negative" : "is-positive"}">${escapeHtml(formatUsdCurrency(row.cashFlow))}</td>
                <td>${escapeHtml(formatUsdCurrency(row.interest))}</td>
                <td>${escapeHtml(formatUsdCurrency(row.endingBalance))}</td>
            </tr>
        `).join("");

        if (note) {
            note.textContent = `${rows.length} yaş/yıl satırı gösteriliyor; negatif değerler emeklilik dönemi çekişlerini ifade eder.`;
        }
    }

    function updateRetirementCalculator() {
        const inputs = parseRetirementInputs();
        const validationMessage = validateRetirementInputs(inputs);
        const validation = document.querySelector("[data-retirement-validation]");

        if (validation) validation.textContent = validationMessage;

        if (validationMessage) {
            document.querySelector("[data-retirement-results]").innerHTML = "";
            document.getElementById("retirement-growth-chart").textContent = "";
            document.querySelector("[data-retirement-breakdown-body]").innerHTML = "";
            return;
        }

        const results = calculateRetirementPlan(inputs);
        renderRetirementResults(results);
        renderRetirementGrowthChart(results.chartPoints);
        renderRetirementBreakdownTable(results.rows);
    }

    function initRetirementCalculator() {
        const calculator = document.getElementById("retirement-calculator");

        if (!calculator) return;

        calculator.querySelectorAll(".retirement-calculator-input").forEach((input) => {
            input.addEventListener("input", updateRetirementCalculator);
            input.addEventListener("change", updateRetirementCalculator);
        });

        updateRetirementCalculator();
    }

    function renderCalculatorPanel(calculatorKey = defaultCalculatorKey) {
        calculatorPanelHasRendered = true;
        activeCalculatorKey = ["cagr", "retirement"].includes(calculatorKey) ? calculatorKey : "compound";
        updateCalculatorSelectorState(activeCalculatorKey);

        if (activeCalculatorKey === "cagr") {
            renderCagrCalculatorPanel();
            return;
        }

        if (activeCalculatorKey === "retirement") {
            renderRetirementCalculatorPanel();
            return;
        }

        renderCompoundCalculatorPanel();
    }

    function parseCagrInputs() {
        const mode = document.getElementById("cagr-calculation-mode")?.value ?? "cagr";
        const durationMode = document.querySelector("[data-cagr-duration-mode].is-active")?.dataset.cagrDurationMode ?? "duration";
        const beginningValue = getCagrFieldNumber("cagr-beginning-value");
        const endingValue = getCagrFieldNumber("cagr-ending-value");
        const inflationRate = getCagrFieldNumber("cagr-inflation-rate") / 100;
        const targetCagr = getCagrFieldNumber("cagr-target-rate") / 100;
        let durationYears = 0;
        let validationMessage = "";

        if (durationMode === "dates") {
            const start = new Date(document.getElementById("cagr-start-date")?.value ?? "");
            const end = new Date(document.getElementById("cagr-end-date")?.value ?? "");
            const dayDifference = (end.getTime() - start.getTime()) / 86400000;

            if (!Number.isFinite(dayDifference) || dayDifference <= 0) {
                validationMessage = "Bitiş tarihi, başlangıç tarihinden sonra olmalıdır.";
            } else {
                durationYears = dayDifference / 365;
            }
        } else {
            const years = Math.max(getCagrFieldNumber("cagr-years"), 0);
            const months = Math.max(getCagrFieldNumber("cagr-months"), 0);
            durationYears = years + (months / 12);
        }

        return { mode, durationMode, beginningValue, endingValue, durationYears, inflationRate, targetCagr, validationMessage };
    }

    function getCagrHelper(helperName) {
        try {
            const cagrFromUtils = window.TEKNOIFY_INVESTMENT_UTILS?.calculators?.cagr;
            const standaloneCagr = window.TEKNOIFY_INVESTMENT_CAGR;
            const helper = cagrFromUtils?.[helperName] || standaloneCagr?.[helperName];

            return typeof helper === "function" ? helper : null;
        } catch (error) {
            console.warn(`Investment CAGR bridge lookup failed for ${helperName}; using local fallback.`, error);

            return null;
        }
    }

    function callCagrHelper(helperName, fallback, args) {
        const helper = getCagrHelper(helperName);

        if (helper) {
            try {
                return helper(...args);
            } catch (error) {
                console.warn(`Investment CAGR bridge failed for ${helperName}; using local fallback.`, error);
            }
        }

        return fallback(...args);
    }

    function getCagrBaseResult(inputs, cagr, endingValue, durationYears, titleValue = "CAGR") {
        return callCagrHelper(
            "getCagrBaseResult",
            (inputs, cagr, endingValue, durationYears, titleValue = "CAGR") => {
                const totalReturn = (endingValue / inputs.beginningValue) - 1;
                const absoluteGain = endingValue - inputs.beginningValue;
                const realCagr = ((1 + cagr) / (1 + inputs.inflationRate)) - 1;

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
            },
            [inputs, cagr, endingValue, durationYears, titleValue]
        );
    }

    function calculateCagr(inputs) {
        return callCagrHelper(
            "calculateCagr",
            (inputs) => {
                if (inputs.validationMessage) return { valid: false, message: inputs.validationMessage };
                if (inputs.beginningValue <= 0) return { valid: false, message: "Başlangıç değeri 0'dan büyük olmalıdır." };
                if (inputs.endingValue <= 0) return { valid: false, message: "Bitiş değeri 0'dan büyük olmalıdır." };
                if (inputs.durationYears <= 0) return { valid: false, message: "Süre 0'dan büyük olmalıdır." };

                const cagr = (inputs.endingValue / inputs.beginningValue) ** (1 / inputs.durationYears) - 1;

                if (!Number.isFinite(cagr)) return { valid: false, message: "Bu değerlerle CAGR hesaplanamadı." };

                return getCagrBaseResult(inputs, cagr, inputs.endingValue, inputs.durationYears);
            },
            [inputs]
        );
    }

    function calculateCagrEndingValue(inputs) {
        if (inputs.validationMessage) return { valid: false, message: inputs.validationMessage };
        if (inputs.beginningValue <= 0) return { valid: false, message: "Başlangıç değeri 0'dan büyük olmalıdır." };
        if (inputs.targetCagr <= -1) return { valid: false, message: "Hedef CAGR -100%'den büyük olmalıdır." };
        if (inputs.durationYears <= 0) return { valid: false, message: "Süre 0'dan büyük olmalıdır." };

        const endingValue = inputs.beginningValue * ((1 + inputs.targetCagr) ** inputs.durationYears);

        if (!Number.isFinite(endingValue) || endingValue <= 0) return { valid: false, message: "Bu hedef CAGR ile bitiş değeri hesaplanamadı." };

        return getCagrBaseResult(inputs, inputs.targetCagr, endingValue, inputs.durationYears, "Hesaplanan Bitiş Değeri");
    }

    function calculateCagrRequiredDuration(inputs) {
        if (inputs.beginningValue <= 0) return { valid: false, message: "Başlangıç değeri 0'dan büyük olmalıdır." };
        if (inputs.endingValue <= 0) return { valid: false, message: "Bitiş değeri 0'dan büyük olmalıdır." };
        if (inputs.targetCagr <= -1) return { valid: false, message: "Hedef CAGR -100%'den büyük olmalıdır." };

        if (inputs.targetCagr === 0) {
            if (inputs.endingValue === inputs.beginningValue) {
                return getCagrBaseResult(inputs, 0, inputs.endingValue, 0);
            }
            return { valid: false, message: "Bu hedef CAGR ile hedef değere ulaşılamaz." };
        }

        const durationYears = Math.log(inputs.endingValue / inputs.beginningValue) / Math.log(1 + inputs.targetCagr);

        if (!Number.isFinite(durationYears) || durationYears < 0) {
            return { valid: false, message: "Bu hedef CAGR ile hedef değere ulaşılamaz." };
        }

        return getCagrBaseResult(inputs, inputs.targetCagr, inputs.endingValue, durationYears);
    }

    function buildCagrGrowthSeries(result) {
        const totalYears = Math.max(result.durationYears, 0);
        const wholeYears = Math.floor(totalYears);
        const hasPartialYear = totalYears - wholeYears > 1e-6;
        const points = [];

        for (let year = 0; year <= wholeYears; year += 1) {
            const value = result.beginningValue * ((1 + result.cagr) ** year);

            points.push({ elapsedYears: year, value: Number.isFinite(value) ? value : result.beginningValue });
        }

        if (hasPartialYear || points.length < 2) {
            const value = result.beginningValue * ((1 + result.cagr) ** totalYears);

            points.push({ elapsedYears: totalYears, value: Number.isFinite(value) ? value : result.beginningValue });
        }

        return points;
    }

    function buildCagrProjectionRows(result) {
        const rows = [];
        const maxRows = 120;
        const wholeYears = Math.floor(result.durationYears);
        const hasPartial = result.durationYears - wholeYears > 1e-6;
        const totalRows = wholeYears + (hasPartial ? 1 : 0);
        const visibleRows = Math.min(totalRows, maxRows);

        for (let index = 1; index <= visibleRows; index += 1) {
            const periodStart = index - 1;
            const periodEnd = index === totalRows ? result.durationYears : index;
            const startingValue = result.beginningValue * ((1 + result.cagr) ** periodStart);
            const endingValue = result.beginningValue * ((1 + result.cagr) ** periodEnd);

            rows.push({
                period: hasPartial && index === totalRows ? "Son Dönem" : `${index}. Yıl`,
                startingValue,
                change: endingValue - startingValue,
                endingValue,
                totalReturn: (endingValue / result.beginningValue) - 1,
                capped: totalRows > maxRows
            });
        }

        return rows;
    }

    function renderCagrResults(result) {
        const container = document.querySelector("[data-cagr-results]");
        const validation = document.querySelector("[data-cagr-validation]");

        if (!container) return;

        if (!result.valid) {
            if (validation) validation.textContent = result.message;
            container.innerHTML = "";
            renderCagrGrowthChart([]);
            renderCagrProjectionTable([]);
            return;
        }

        if (validation) validation.textContent = "";

        const cards = [
            [result.titleValue, result.titleValue === "Hesaplanan Bitiş Değeri" ? formatUsdCurrency(result.endingValue) : formatPercent(result.cagr), "Yıllık Bileşik Büyüme Oranı"],
            ["Toplam Getiri", formatPercent(result.totalReturn), "Başlangıçtan bitişe toplam değişim"],
            ["Mutlak Kazanç", formatUsdCurrency(result.absoluteGain), "Bitiş değeri - başlangıç değeri"],
            ["Reel CAGR", formatPercent(result.realCagr), "Enflasyon etkisi düşülmüş büyüme"],
            ["Süre", formatDurationYears(result.durationYears), `${result.durationYears.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} yıl`]
        ];

        container.innerHTML = cards.map(([label, value, description]) => `
            <article class="cagr-result-card compound-result-card">
                <span>${escapeHtml(label)}</span>
                <strong>${escapeHtml(value)}</strong>
                <small>${escapeHtml(description)}</small>
            </article>
        `).join("");
    }

    function renderCagrGrowthChart(points) {
        const mount = document.getElementById("cagr-growth-chart");
        const summary = document.querySelector("[data-cagr-chart-summary]");

        if (!mount) return;
        if (!points.length) {
            mount.innerHTML = '<div class="investment-chart-error">Geçerli değer girildiğinde grafik güncellenecek.</div>';
            if (summary) summary.textContent = "Geçerli değer girildiğinde grafik güncellenecek.";
            return;
        }

        const width = 760;
        const height = 330;
        const values = points.map((point) => point.value);
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        const range = Math.max(maxValue - minValue, Math.abs(maxValue) * 0.08, 1);
        const chartConfig = { left: 68, top: 34, width: 650, height: 226, minValue: minValue - range * 0.08, maxValue: maxValue + range * 0.08 };
        const getPoint = (point, index) => {
            const divisor = Math.max(points.length - 1, 1);
            const x = chartConfig.left + (index / divisor) * chartConfig.width;
            const y = chartConfig.top + chartConfig.height - ((point.value - chartConfig.minValue) / (chartConfig.maxValue - chartConfig.minValue)) * chartConfig.height;

            return { x, y };
        };
        const path = points.map((point, index) => {
            const coordinates = getPoint(point, index);

            return `${index === 0 ? "M" : "L"}${coordinates.x.toFixed(2)} ${coordinates.y.toFixed(2)}`;
        }).join(" ");
        const areaPath = `${path} L${chartConfig.left + chartConfig.width} ${chartConfig.top + chartConfig.height} L${chartConfig.left} ${chartConfig.top + chartConfig.height} Z`;
        const svg = createSvgElement("svg", { viewBox: `0 0 ${width} ${height}`, role: "presentation", focusable: "false" });

        for (let step = 0; step <= 4; step += 1) {
            const y = chartConfig.top + (step / 4) * chartConfig.height;
            const value = chartConfig.maxValue - (step / 4) * (chartConfig.maxValue - chartConfig.minValue);

            svg.appendChild(createSvgElement("line", { class: "compound-chart-grid-line", x1: chartConfig.left, x2: chartConfig.left + chartConfig.width, y1: y, y2: y }));
            const label = createSvgElement("text", { class: "compound-chart-axis-label", x: chartConfig.left - 10, y: y + 4, "text-anchor": "end" });
            label.textContent = formatUsdCurrency(value).replace(",00", "");
            svg.appendChild(label);
        }

        svg.appendChild(createSvgElement("path", { class: "compound-chart-area cagr-chart-area", d: areaPath, fill: "#818cf8" }));
        svg.appendChild(createSvgElement("path", { class: "compound-chart-line cagr-chart-line", d: path, stroke: "#a78bfa" }));

        points.forEach((point, index) => {
            const coordinates = getPoint(point, index);
            const periodLabel = index === 0 ? "Başlangıç" : `${point.elapsedYears.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}. yıl`;

            appendChartPointMarker(svg, {
                className: "compound-chart-point cagr-chart-point",
                x: coordinates.x,
                y: coordinates.y,
                ariaLabel: `${periodLabel}: ${formatUsdCurrency(point.value)}`,
                tooltip: `${periodLabel}\nDeğer: ${formatUsdCurrency(point.value)}`
            });

            if (shouldShowChartValueLabel(index, points.length)) {
                appendChartValueLabel(svg, {
                    x: coordinates.x,
                    y: Math.max(chartConfig.top + 12, coordinates.y - 10),
                    text: formatUsdCompact(point.value)
                });
            }
        });

        points.forEach((point, index) => {
            if (!shouldShowChartValueLabel(index, points.length)) return;

            const coordinates = getPoint(point, index);
            const label = createSvgElement("text", { class: "compound-chart-axis-label", x: coordinates.x, y: chartConfig.top + chartConfig.height + 32, "text-anchor": index === 0 ? "start" : index === points.length - 1 ? "end" : "middle" });
            label.textContent = index === 0 ? "Başlangıç" : `${point.elapsedYears.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}. yıl`;
            svg.appendChild(label);
        });

        mount.textContent = "";
        mount.appendChild(svg);

        if (summary) {
            const lastPoint = points[points.length - 1];
            summary.textContent = `Son USD değeri ${formatUsdCurrency(lastPoint.value)}; eğri ${points[0].value > lastPoint.value ? "aşağı" : "yukarı"} yönlü. Her yıllık nokta işaretlenir ve odak/hover ile değeri gösterir.`;
        }
    }

    function renderCagrProjectionTable(rows) {
        const body = document.querySelector("[data-cagr-projection-body]");
        const note = document.querySelector("[data-cagr-table-note]");

        if (!body) return;

        body.innerHTML = rows.map((row) => `
            <tr>
                <td>${escapeHtml(row.period)}</td>
                <td>${escapeHtml(formatUsdCurrency(row.startingValue))}</td>
                <td>${escapeHtml(formatUsdCurrency(row.change))}</td>
                <td>${escapeHtml(formatUsdCurrency(row.endingValue))}</td>
                <td>${escapeHtml(formatPercent(row.totalReturn))}</td>
            </tr>
        `).join("");

        if (note) {
            note.textContent = rows.some((row) => row.capped)
                ? "Performans için ilk 120 dönem gösteriliyor; hesaplama tam süreye göre yapıldı."
                : `${rows.length} yıllık/ara dönem gösteriliyor.`;
        }
    }

    function updateCagrCalculator() {
        const inputs = parseCagrInputs();
        const result = inputs.mode === "ending"
            ? calculateCagrEndingValue(inputs)
            : inputs.mode === "duration"
                ? calculateCagrRequiredDuration(inputs)
                : calculateCagr(inputs);

        const endingField = document.querySelector("[data-cagr-ending-field]");
        if (endingField) {
            endingField.classList.toggle("is-calculated", inputs.mode === "ending");
            endingField.querySelector("input")?.toggleAttribute("disabled", inputs.mode === "ending");
        }

        renderCagrResults(result);

        if (result.valid) {
            renderCagrGrowthChart(buildCagrGrowthSeries(result));
            renderCagrProjectionTable(buildCagrProjectionRows(result));
        }
    }

    function initCagrCalculator() {
        const calculator = document.getElementById("cagr-calculator");

        if (!calculator) return;

        calculator.querySelectorAll(".cagr-calculator-input").forEach((input) => {
            input.addEventListener("input", updateCagrCalculator);
            input.addEventListener("change", updateCagrCalculator);
        });

        calculator.querySelectorAll("[data-cagr-duration-mode]").forEach((button) => {
            button.addEventListener("click", () => {
                calculator.querySelectorAll("[data-cagr-duration-mode]").forEach((modeButton) => {
                    const isActive = modeButton === button;
                    modeButton.classList.toggle("is-active", isActive);
                    modeButton.setAttribute("aria-pressed", String(isActive));
                });

                const isDateMode = button.dataset.cagrDurationMode === "dates";
                calculator.querySelector("[data-cagr-duration-fields]").hidden = isDateMode;
                calculator.querySelector("[data-cagr-date-fields]").hidden = !isDateMode;
                updateCagrCalculator();
            });
        });

        updateCagrCalculator();
    }

    function initCalculatorSelector() {
        const buttons = document.querySelectorAll("[data-calculator-key]");
        const calculatorSection = document.getElementById("investment-calculators");

        if (!buttons.length) return;

        buttons.forEach((button) => {
            button.addEventListener("click", () => {
                renderCalculatorPanel(button.dataset.calculatorKey);
            });
        });

        runWhenNearViewport(calculatorSection, () => {
            if (!calculatorPanelHasRendered) {
                renderCalculatorPanel(defaultCalculatorKey);
            }
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
        initCalculatorSelector();
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
