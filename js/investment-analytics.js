(function () {
    const supermarketDatasetUrl = "../data/investment-analytics/supermarket_dataset.json";
    const chartMountId = "retail-store-count-chart";
    const revenueChartMountId = "retail-revenue-per-store-chart";
    const modalChartMountId = "retail-store-count-chart-modal";
    const modalId = "retail-store-count-modal";
    const svgNamespace = "http://www.w3.org/2000/svg";
    const chartTitle = "BİM, ŞOK Marketler, Migros ve CarrefourSA mağaza sayısı çizgi grafiği";
    let supermarketDataset = null;
    let selectedRevenuePeriod = "2025 4Ç";

    // Excel source files can be converted to this JSON format in a later step.

    function createSvgElement(tagName, attributes) {
        const element = document.createElementNS(svgNamespace, tagName);

        Object.entries(attributes).forEach(([name, value]) => {
            element.setAttribute(name, value);
        });

        return element;
    }

    function formatStoreCount(value) {
        return value.toLocaleString("tr-TR");
    }

    function formatUsdCompact(value) {
        return `$${Math.round(value / 1000).toLocaleString("tr-TR")}K`;
    }

    function getCompanies() {
        return supermarketDataset?.companies ?? [];
    }

    function getPeriods(metricKey) {
        return getCompanies()[0]?.[metricKey]?.map((item) => item.period) ?? [];
    }

    function getValueForPeriod(company, metricKey, period) {
        return company[metricKey]?.find((item) => item.period === period)?.value ?? 0;
    }

    function getMaxValue(metricKey) {
        const values = getCompanies().flatMap((company) => company[metricKey]?.map((item) => item.value) ?? []);
        return Math.max(...values, 1);
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

    function getPoint(index, value, periods, chartConfig) {
        const { left, top, width, height, maxValue } = chartConfig;
        const divisor = Math.max(periods.length - 1, 1);
        const x = left + (index / divisor) * width;
        const y = top + height - (value / maxValue) * height;

        return { x, y };
    }

    function renderLegend(container, companies) {
        const legend = document.createElement("div");
        legend.className = "investment-chart-legend";

        companies.forEach((company) => {
            const legendItem = document.createElement("span");
            const marker = document.createElement("span");
            marker.style.backgroundColor = company.color;
            marker.style.color = company.color;

            legendItem.append(marker, company.name);
            legend.appendChild(legendItem);
        });

        container.appendChild(legend);
    }

    function renderLineGrid(svg, chartConfig) {
        const { left, top, width, height, maxValue } = chartConfig;
        const gridSteps = 4;

        for (let step = 0; step <= gridSteps; step += 1) {
            const y = top + (height / gridSteps) * step;
            const value = maxValue - (maxValue / gridSteps) * step;

            svg.appendChild(
                createSvgElement("line", {
                    x1: left,
                    y1: y,
                    x2: left + width,
                    y2: y,
                    class: "investment-chart-grid-line"
                })
            );
            svg.appendChild(
                createSvgElement("text", {
                    x: left - 14,
                    y: y + 4,
                    "text-anchor": "end",
                    class: "investment-chart-axis-label"
                })
            ).textContent = formatStoreCount(Math.round(value));
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

            svg.appendChild(
                createSvgElement("line", {
                    x1: x,
                    y1: top,
                    x2: x,
                    y2: top + height,
                    class: "investment-chart-grid-line investment-chart-grid-line-vertical"
                })
            );
            svg.appendChild(
                createSvgElement("text", {
                    x,
                    y: top + height + 32,
                    "text-anchor": "middle",
                    class: "investment-chart-axis-label"
                })
            ).textContent = period;
        });
    }

    function renderEndpointLabel(svg, company, point, value, chartConfig) {
        const labelText = formatStoreCount(value);
        const textWidth = Math.max(48, labelText.length * 8.6);
        const labelX = point.x + 12 + textWidth > chartConfig.left + chartConfig.width ? -textWidth - 18 : 0;
        const labelGroup = createSvgElement("g", {
            class: "investment-chart-endpoint-label",
            transform: `translate(${point.x + 12 + labelX}, ${point.y - 10})`
        });

        labelGroup.appendChild(
            createSvgElement("rect", {
                x: "0",
                y: "-17",
                width: String(textWidth),
                height: "24",
                rx: "12",
                fill: company.color,
                opacity: "0.16",
                stroke: company.color,
                "stroke-width": "1"
            })
        );
        labelGroup.appendChild(
            createSvgElement("text", {
                x: String(textWidth / 2),
                y: "0",
                "text-anchor": "middle",
                fill: company.color,
                class: "investment-chart-value-label"
            })
        ).textContent = labelText;

        svg.appendChild(labelGroup);
    }

    function renderPointLabel(svg, company, point, value, index) {
        if (index % 4 !== 3) return;

        svg.appendChild(
            createSvgElement("text", {
                x: point.x,
                y: point.y - 12,
                "text-anchor": "middle",
                fill: company.color,
                class: "investment-chart-point-label"
            })
        ).textContent = formatStoreCount(value);
    }

    function createStoreTooltipContent(company, dataPoint) {
        return `
            <span class="investment-chart-tooltip__accent" style="background:${company.color}"></span>
            <strong>${company.name}</strong>
            <span>${dataPoint.period}</span>
            <b>${formatStoreCount(dataPoint.value)} mağaza</b>
        `;
    }

    function renderLineSeries(svg, chartConfig, tooltip, periods, companies, mode) {
        companies.forEach((company) => {
            const points = company.storeCounts.map((dataPoint, index) => {
                const point = getPoint(index, dataPoint.value, periods, chartConfig);
                return `${point.x},${point.y}`;
            });

            svg.appendChild(
                createSvgElement("polyline", {
                    points: points.join(" "),
                    fill: "none",
                    stroke: company.color,
                    "stroke-width": mode === "modal" ? "3.4" : "3",
                    "stroke-linecap": "round",
                    "stroke-linejoin": "round",
                    class: "investment-chart-line",
                    style: `--series-color: ${company.color}`
                })
            );

            company.storeCounts.forEach((dataPoint, index) => {
                const point = getPoint(index, dataPoint.value, periods, chartConfig);
                const marker = createSvgElement("circle", {
                    cx: point.x,
                    cy: point.y,
                    r: mode === "modal" ? "5" : "4",
                    fill: company.color,
                    class: "investment-chart-point",
                    tabindex: "0"
                });

                marker.addEventListener("mouseenter", () => showTooltip(tooltip, createStoreTooltipContent(company, dataPoint), point));
                marker.addEventListener("mouseleave", () => hideTooltip(tooltip));
                marker.addEventListener("focus", () => showTooltip(tooltip, createStoreTooltipContent(company, dataPoint), point));
                marker.addEventListener("blur", () => hideTooltip(tooltip));

                svg.appendChild(marker);

                if (mode === "modal") {
                    renderPointLabel(svg, company, point, dataPoint.value, index);
                }

                if (index === company.storeCounts.length - 1) {
                    renderEndpointLabel(svg, company, point, dataPoint.value, chartConfig);
                }
            });
        });
    }

    function showTooltip(tooltip, content, point) {
        tooltip.innerHTML = content;
        tooltip.style.left = `${point.x}px`;
        tooltip.style.top = `${point.y}px`;
        tooltip.classList.add("is-visible");
    }

    function hideTooltip(tooltip) {
        tooltip.classList.remove("is-visible");
    }

    function getLineChartConfig(mode) {
        if (mode === "modal") {
            return {
                left: 84,
                top: 34,
                width: 940,
                height: 430,
                maxValue: Math.ceil(getMaxValue("storeCounts") / 1000) * 1000,
                viewBox: "0 0 1100 540"
            };
        }

        return {
            left: 78,
            top: 28,
            width: 820,
            height: 320,
            maxValue: Math.ceil(getMaxValue("storeCounts") / 1000) * 1000,
            viewBox: "0 0 980 420"
        };
    }

    function renderRetailStoreCountChart(mountId, mode) {
        const mount = document.getElementById(mountId);
        const companies = getCompanies();
        const periods = getPeriods("storeCounts");
        if (!mount || !companies.length || !periods.length) return;

        const chartConfig = getLineChartConfig(mode);
        const titleId = `${mountId}-title`;
        const svg = createSvgElement("svg", {
            viewBox: chartConfig.viewBox,
            role: "img",
            "aria-labelledby": titleId
        });
        const title = createSvgElement("title", { id: titleId });
        const tooltip = document.createElement("div");

        title.textContent = chartTitle;
        tooltip.className = `investment-chart-tooltip${mode === "modal" ? " investment-chart-tooltip-large" : ""}`;

        svg.appendChild(title);
        renderLineGrid(svg, chartConfig);
        renderLineXAxis(svg, chartConfig, periods, mode);
        renderLineSeries(svg, chartConfig, tooltip, periods, companies, mode);

        mount.textContent = "";
        mount.append(svg, tooltip);
        renderLegend(mount, companies);
    }

    function renderRevenueChartControls(mount, periods) {
        const controls = document.createElement("div");
        const label = document.createElement("label");
        const select = document.createElement("select");

        controls.className = "investment-chart-controls";
        label.setAttribute("for", "retail-revenue-period-select");
        label.textContent = "Dönem";
        select.id = "retail-revenue-period-select";
        select.className = "investment-chart-select";

        periods.forEach((period) => {
            const option = document.createElement("option");
            option.value = period;
            option.textContent = period;
            option.selected = period === selectedRevenuePeriod;
            select.appendChild(option);
        });

        select.addEventListener("change", (event) => {
            selectedRevenuePeriod = event.target.value;
            renderRevenuePerStoreChart();
        });

        controls.append(label, select);
        mount.appendChild(controls);
    }

    function renderRevenuePerStoreChart() {
        const mount = document.getElementById(revenueChartMountId);
        const companies = getCompanies();
        const periods = getPeriods("revenuePerStoreUsd");
        if (!mount || !companies.length || !periods.length) return;

        if (!periods.includes(selectedRevenuePeriod)) {
            selectedRevenuePeriod = periods[periods.length - 1];
        }

        const chartConfig = {
            left: 74,
            top: 34,
            width: 720,
            height: 280,
            maxValue: Math.ceil(getMaxValue("revenuePerStoreUsd") / 100000) * 100000,
            viewBox: "0 0 880 390"
        };
        const titleId = `${revenueChartMountId}-title`;
        const svg = createSvgElement("svg", {
            viewBox: chartConfig.viewBox,
            role: "img",
            "aria-labelledby": titleId
        });
        const title = createSvgElement("title", { id: titleId });
        const gridSteps = 4;
        const barGap = 34;
        const barWidth = Math.min(94, (chartConfig.width - barGap * (companies.length - 1)) / companies.length);
        const groupWidth = barWidth * companies.length + barGap * (companies.length - 1);
        const startX = chartConfig.left + (chartConfig.width - groupWidth) / 2;

        title.textContent = `${selectedRevenuePeriod} mağaza başı ortalama ciro kolon grafiği`;
        svg.appendChild(title);

        for (let step = 0; step <= gridSteps; step += 1) {
            const y = chartConfig.top + (chartConfig.height / gridSteps) * step;
            const value = chartConfig.maxValue - (chartConfig.maxValue / gridSteps) * step;

            svg.appendChild(createSvgElement("line", {
                x1: chartConfig.left,
                y1: y,
                x2: chartConfig.left + chartConfig.width,
                y2: y,
                class: "investment-chart-grid-line"
            }));
            svg.appendChild(createSvgElement("text", {
                x: chartConfig.left - 14,
                y: y + 4,
                "text-anchor": "end",
                class: "investment-chart-axis-label"
            })).textContent = formatUsdCompact(value);
        }

        companies.forEach((company, index) => {
            const value = getValueForPeriod(company, "revenuePerStoreUsd", selectedRevenuePeriod);
            const barHeight = (value / chartConfig.maxValue) * chartConfig.height;
            const x = startX + index * (barWidth + barGap);
            const y = chartConfig.top + chartConfig.height - barHeight;
            const labelX = x + barWidth / 2;

            svg.appendChild(createSvgElement("rect", {
                x,
                y,
                width: barWidth,
                height: barHeight,
                rx: "14",
                fill: company.color,
                class: "investment-revenue-bar",
                style: `--series-color: ${company.color}`
            }));
            svg.appendChild(createSvgElement("text", {
                x: labelX,
                y: y - 12,
                "text-anchor": "middle",
                fill: company.color,
                class: "investment-chart-value-label investment-revenue-value-label"
            })).textContent = formatUsdCompact(value);
            svg.appendChild(createSvgElement("text", {
                x: labelX,
                y: chartConfig.top + chartConfig.height + 30,
                "text-anchor": "middle",
                class: "investment-chart-axis-label investment-revenue-company-label"
            })).textContent = company.name;
        });

        mount.textContent = "";
        renderRevenueChartControls(mount, periods);
        mount.appendChild(svg);
        renderLegend(mount, companies);
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
            const revenuePeriods = getPeriods("revenuePerStoreUsd");
            selectedRevenuePeriod = supermarketDataset.meta?.periodEnd ?? revenuePeriods[revenuePeriods.length - 1] ?? selectedRevenuePeriod;
            renderRetailStoreCountChart(chartMountId, "default");
            renderRevenuePerStoreChart();
        } catch (error) {
            console.error(error);
            showErrorState(chartMountId, "Grafik verisi yüklenemedi. Lütfen daha sonra tekrar deneyin.");
            showErrorState(revenueChartMountId, "Ciro grafiği verisi yüklenemedi. Lütfen daha sonra tekrar deneyin.");
            showErrorState(modalChartMountId, "Detay grafiği verisi yüklenemedi.");
        }
    }

    document.addEventListener("DOMContentLoaded", () => {
        setupRetailStoreCountModal();
        loadSupermarketDataset();
    });
})();
