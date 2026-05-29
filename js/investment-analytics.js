(function () {
    const supermarketDatasetUrl = "../data/investment-analytics/supermarket_dataset.json";
    const usdTryRatesUrl = "../data/currency/usd_try_rates.json";
    const storeCountChartMountId = "retail-store-count-chart";
    const revenuePerStoreChartMountId = "retail-revenue-per-store-chart";
    const operatingProfitPerStoreChartMountId = "retail-operating-profit-per-store-chart";
    const modalChartMountId = "retail-store-count-chart-modal";
    const modalId = "retail-store-count-modal";
    const svgNamespace = "http://www.w3.org/2000/svg";
    let supermarketDataset = null;
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

    function renderRetailStoreCountChart(mountId, mode = "default") {
        renderMetricChart(mountId, "storeCounts", {
            title: "BİM, ŞOK Marketler, Migros ve CarrefourSA mağaza sayısı çizgi grafiği",
            axisStep: 1000,
            mode,
            formatAxisValue: formatNumber,
            formatEndpointValue: formatNumber,
            formatTooltipValue: (value) => `${formatNumber(value)} mağaza`
        });
    }

    function renderRevenuePerStoreChart() {
        renderMetricChart(revenuePerStoreChartMountId, "revenuePerStoreUsd", {
            title: "BİM, ŞOK Marketler, Migros ve CarrefourSA mağaza başı ortalama ciro çizgi grafiği",
            axisStep: 100000,
            formatAxisValue: formatUsdCompact,
            formatEndpointValue: formatUsdCompact,
            formatTooltipValue: (value) => `${formatUsdCompact(value)} mağaza başı ciro`
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

    function setupRetailStoreCountModal() {
        const modal = document.getElementById(modalId);
        const openButtons = document.querySelectorAll("[data-retail-store-modal-open]");
        const closeButtons = document.querySelectorAll("[data-retail-store-modal-close]");
        let lastFocusedElement = null;

        if (!modal || !openButtons.length) return;

        function openModal() {
            lastFocusedElement = document.activeElement;
            modal.classList.add("is-open");
            modal.setAttribute("aria-hidden", "false");
            document.body.classList.add("investment-modal-open");
            renderRetailStoreCountChart(modalChartMountId, "modal");
            modal.querySelector(".investment-chart-modal__close")?.focus();
        }

        function closeModal() {
            modal.classList.remove("is-open");
            modal.setAttribute("aria-hidden", "true");
            document.body.classList.remove("investment-modal-open");
            if (lastFocusedElement) {
                lastFocusedElement.focus();
            }
        }

        openButtons.forEach((button) => {
            button.addEventListener("click", openModal);
        });

        closeButtons.forEach((button) => {
            button.addEventListener("click", closeModal);
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && modal.classList.contains("is-open")) {
                closeModal();
            }
        });
    }

    async function loadSupermarketDataset() {
        try {
            const response = await fetch(supermarketDatasetUrl);

            if (!response.ok) {
                throw new Error(`Supermarket dataset request failed: ${response.status}`);
            }

            supermarketDataset = await response.json();
            await applyDerivedPerStoreUsdValues();

            renderRetailStoreCountChart(storeCountChartMountId);
            renderRevenuePerStoreChart();
            renderOperatingProfitPerStoreChart();
        } catch (error) {
            console.error(error);
            showErrorState(storeCountChartMountId, "Grafik verisi yüklenemedi. Lütfen daha sonra tekrar deneyin.");
            showErrorState(revenuePerStoreChartMountId, "Ciro grafiği verisi yüklenemedi. Lütfen daha sonra tekrar deneyin.");
            showErrorState(operatingProfitPerStoreChartMountId, "Operasyonel kâr grafiği verisi yüklenemedi. Lütfen daha sonra tekrar deneyin.");
            showErrorState(modalChartMountId, "Detay grafiği verisi yüklenemedi.");
        }
    }

    document.addEventListener("DOMContentLoaded", () => {
        setupRetailStoreCountModal();
        loadSupermarketDataset();
    });
})();

// Stage 2: Investment chatbot frontend controller only. No backend, API, AI, RAG, or logging is connected.
(function () {
    const defaultAssistantResponse = "Bu özellik yakında kaynaklı finansal raporlar, şirket dokümanları ve sektör verileriyle çalışacak.";
    const responseDelayMs = 650;
    let messageIdCounter = 0;

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

    // Stage 2: mock frontend adapter only. Real /api/chat integration will be added in Stage 3.
    async function requestInvestmentAssistantResponse(userMessage, context = {}) {
        void context;
        return getMockInvestmentAssistantResponse(userMessage);
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

        function createMessage(role, content, status = "sent") {
            messageIdCounter += 1;

            return {
                id: `msg_${Date.now()}_${messageIdCounter}`,
                role,
                content,
                createdAt: new Date().toISOString(),
                status
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
            messageElement.textContent = message.content;

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
            clearInput();
            setSendingState(true);
            appendMessage(loadingMessage);

            try {
                const assistantResponse = await requestInvestmentAssistantResponse(trimmedText);
                updateMessage(loadingMessage.id, {
                    content: assistantResponse,
                    status: "sent"
                });
            } catch (error) {
                console.error("Investment assistant mock response failed:", error);
                updateMessage(loadingMessage.id, {
                    content: "Yanıt hazırlanırken bir sorun oluştu. Lütfen tekrar deneyin.",
                    status: "error"
                });
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
