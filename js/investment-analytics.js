(function () {
    const supermarketDatasetUrl = "../data/investment-analytics/supermarket_dataset.json";
    const storeCountChartMountId = "retail-store-count-chart";
    const revenuePerStoreChartMountId = "retail-revenue-per-store-chart";
    const operatingProfitPerStoreChartMountId = "retail-operating-profit-per-store-chart";
    const modalChartMountId = "retail-store-count-chart-modal";
    const modalId = "retail-store-count-modal";
    const svgNamespace = "http://www.w3.org/2000/svg";
    let supermarketDataset = null;

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
                sourceRef: null
            };
        }

        return {
            period: rawPoint?.period ?? periods[index] ?? "",
            value: rawPoint?.value,
            note: rawPoint?.note ?? null,
            sourceTitle: rawPoint?.sourceTitle ?? null,
            sourceUrl: rawPoint?.sourceUrl ?? null,
            sourceRef: rawPoint?.sourceRef ?? null
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

    function resolvePointSource(pointData) {
        const referencedSource = pointData.sourceRef
            ? supermarketDataset?.sourceRefs?.[pointData.sourceRef]
            : null;

        return {
            title: pointData.sourceTitle ?? referencedSource?.title ?? null,
            url: pointData.sourceUrl ?? referencedSource?.url ?? null
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

    function createTooltipContent(item, pointData, options) {
        const source = resolvePointSource(pointData);
        const safeColor = escapeHtml(item.color);
        const safeName = escapeHtml(item.name);
        const safePeriod = escapeHtml(pointData.period);
        const safeValue = escapeHtml(options.formatTooltipValue(pointData.value));
        const noteMarkup = pointData.note
            ? `<p class="investment-chart-tooltip__note">${escapeHtml(pointData.note)}</p>`
            : "";
        const sourceTitleMarkup = source.title
            ? `<span class="investment-chart-tooltip__source-title">Kaynak: ${escapeHtml(source.title)}</span>`
            : "";
        const sourceLinkMarkup = source.url
            ? `<a class="investment-chart-tooltip__source-link" href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">Kaynağı Aç</a>`
            : "";
        const sourceMarkup = sourceTitleMarkup || sourceLinkMarkup
            ? `<div class="investment-chart-tooltip__source">${sourceTitleMarkup}${sourceLinkMarkup}</div>`
            : "";

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

        tooltip.innerHTML = content;
        tooltip.style.left = `${(point.x / viewBoxWidth) * 100}%`;
        tooltip.style.top = `${(point.y / viewBoxHeight) * 100}%`;
        tooltip.classList.add("is-visible");
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
            const points = normalizeMetricPoints(company[metricKey], periods);

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
