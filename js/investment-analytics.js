const retailStoreCountData = [
    { period: "2021 1Ç", bim: 9812, sok: 8524, migros: 2383, carrefoursa: 710 },
    { period: "2021 2Ç", bim: 10152, sok: 8874, migros: 2450, carrefoursa: 722 },
    { period: "2021 3Ç", bim: 10334, sok: 9074, migros: 2518, carrefoursa: 738 },
    { period: "2021 4Ç", bim: 10489, sok: 9247, migros: 2565, carrefoursa: 754 },

    { period: "2022 1Ç", bim: 10787, sok: 9435, migros: 2620, carrefoursa: 782 },
    { period: "2022 2Ç", bim: 11064, sok: 9682, migros: 2695, carrefoursa: 825 },
    { period: "2022 3Ç", bim: 11272, sok: 9870, migros: 2784, carrefoursa: 851 },
    { period: "2022 4Ç", bim: 11525, sok: 10141, migros: 2927, carrefoursa: 895 },

    { period: "2023 1Ç", bim: 11692, sok: 10220, migros: 3003, carrefoursa: 915 },
    { period: "2023 2Ç", bim: 11968, sok: 10415, migros: 3102, carrefoursa: 960 },
    { period: "2023 3Ç", bim: 12181, sok: 10602, migros: 3225, carrefoursa: 1002 },
    { period: "2023 4Ç", bim: 12421, sok: 10281, migros: 3363, carrefoursa: 1047 },

    { period: "2024 1Ç", bim: 12652, sok: 10320, migros: 3415, carrefoursa: 1095 },
    { period: "2024 2Ç", bim: 13011, sok: 10512, migros: 3488, carrefoursa: 1150 },
    { period: "2024 3Ç", bim: 13254, sok: 10690, migros: 3560, carrefoursa: 1185 },
    { period: "2024 4Ç", bim: 13583, sok: 10981, migros: 3621, carrefoursa: 1225 },

    { period: "2025 1Ç", bim: 13784, sok: 10825, migros: 3665, carrefoursa: 1240 },
    { period: "2025 2Ç", bim: 14075, sok: 10940, migros: 3712, carrefoursa: 1248 },
    { period: "2025 3Ç", bim: 14310, sok: 11010, migros: 3748, carrefoursa: 1252 },
    { period: "2025 4Ç", bim: 14580, sok: 11074, migros: 3792, carrefoursa: 1265 }
];

(function () {
    const chartMountId = "retail-store-count-chart";
    const modalChartMountId = "retail-store-count-chart-modal";
    const modalId = "retail-store-count-modal";
    const svgNamespace = "http://www.w3.org/2000/svg";
    const chartTitle = "BİM, ŞOK Marketler, Migros ve CarrefourSA mağaza sayısı çizgi grafiği";
    const series = [
        { key: "bim", label: "BİM", color: "#ef4444" },
        { key: "carrefoursa", label: "CarrefourSA", color: "#3b82f6" },
        { key: "migros", label: "Migros", color: "#facc15" },
        { key: "sok", label: "ŞOK Marketler", color: "#f97316" }
    ];

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

    function getPoint(index, value, chartConfig) {
        const { left, top, width, height, maxValue } = chartConfig;
        const x = left + (index / (retailStoreCountData.length - 1)) * width;
        const y = top + height - (value / maxValue) * height;

        return { x, y };
    }

    function renderLegend(container) {
        const legend = document.createElement("div");
        legend.className = "investment-chart-legend";

        series.forEach((item) => {
            const legendItem = document.createElement("span");
            const marker = document.createElement("span");
            marker.style.backgroundColor = item.color;
            marker.style.color = item.color;

            legendItem.append(marker, item.label);
            legend.appendChild(legendItem);
        });

        container.appendChild(legend);
    }

    function renderGrid(svg, chartConfig) {
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

    function renderXAxis(svg, chartConfig, mode) {
        const { left, top, width, height } = chartConfig;

        retailStoreCountData.forEach((dataPoint, index) => {
            const shouldShowLabel = mode === "modal"
                ? dataPoint.period.endsWith("2Ç") || dataPoint.period.endsWith("4Ç")
                : dataPoint.period.endsWith("4Ç");

            if (!shouldShowLabel) return;

            const x = left + (index / (retailStoreCountData.length - 1)) * width;

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
            ).textContent = dataPoint.period;
        });
    }

    function renderEndpointLabel(svg, item, point, value, chartConfig) {
        const labelGroup = createSvgElement("g", {
            class: "investment-chart-endpoint-label",
            transform: `translate(${point.x + 12}, ${point.y - 10})`
        });
        const labelText = formatStoreCount(value);
        const textWidth = Math.max(48, labelText.length * 8.6);
        const labelX = point.x + 12 + textWidth > chartConfig.left + chartConfig.width ? -textWidth - 18 : 0;

        labelGroup.setAttribute("transform", `translate(${point.x + 12 + labelX}, ${point.y - 10})`);
        labelGroup.appendChild(
            createSvgElement("rect", {
                x: "0",
                y: "-17",
                width: String(textWidth),
                height: "24",
                rx: "12",
                fill: item.color,
                opacity: "0.16",
                stroke: item.color,
                "stroke-width": "1"
            })
        );
        labelGroup.appendChild(
            createSvgElement("text", {
                x: String(textWidth / 2),
                y: "0",
                "text-anchor": "middle",
                fill: item.color,
                class: "investment-chart-value-label"
            })
        ).textContent = labelText;

        svg.appendChild(labelGroup);
    }

    function renderPointLabel(svg, item, point, value, index) {
        if (index % 4 !== 3) return;

        svg.appendChild(
            createSvgElement("text", {
                x: point.x,
                y: point.y - 12,
                "text-anchor": "middle",
                fill: item.color,
                class: "investment-chart-point-label"
            })
        ).textContent = formatStoreCount(value);
    }

    function createTooltipContent(item, dataPoint) {
        return `
            <span class="investment-chart-tooltip__accent" style="background:${item.color}"></span>
            <strong>${item.label}</strong>
            <span>${dataPoint.period}</span>
            <b>${formatStoreCount(dataPoint[item.key])} mağaza</b>
        `;
    }

    function renderSeries(svg, chartConfig, tooltip, mode) {
        series.forEach((item) => {
            const points = retailStoreCountData.map((dataPoint, index) => {
                const point = getPoint(index, dataPoint[item.key], chartConfig);
                return `${point.x},${point.y}`;
            });

            svg.appendChild(
                createSvgElement("polyline", {
                    points: points.join(" "),
                    fill: "none",
                    stroke: item.color,
                    "stroke-width": mode === "modal" ? "3.4" : "3",
                    "stroke-linecap": "round",
                    "stroke-linejoin": "round",
                    class: "investment-chart-line",
                    style: `--series-color: ${item.color}`
                })
            );

            retailStoreCountData.forEach((dataPoint, index) => {
                const value = dataPoint[item.key];
                const point = getPoint(index, value, chartConfig);
                const marker = createSvgElement("circle", {
                    cx: point.x,
                    cy: point.y,
                    r: mode === "modal" ? "5" : "4",
                    fill: item.color,
                    class: "investment-chart-point",
                    tabindex: "0"
                });

                marker.addEventListener("mouseenter", () => showTooltip(tooltip, createTooltipContent(item, dataPoint), point));
                marker.addEventListener("mouseleave", () => hideTooltip(tooltip));
                marker.addEventListener("focus", () => showTooltip(tooltip, createTooltipContent(item, dataPoint), point));
                marker.addEventListener("blur", () => hideTooltip(tooltip));

                svg.appendChild(marker);

                if (mode === "modal") {
                    renderPointLabel(svg, item, point, value, index);
                }

                if (index === retailStoreCountData.length - 1) {
                    renderEndpointLabel(svg, item, point, value, chartConfig);
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

    function getChartConfig(mode) {
        if (mode === "modal") {
            return {
                left: 84,
                top: 34,
                width: 940,
                height: 430,
                maxValue: 15000,
                viewBox: "0 0 1100 540"
            };
        }

        return {
            left: 78,
            top: 28,
            width: 820,
            height: 320,
            maxValue: 15000,
            viewBox: "0 0 980 420"
        };
    }

    function renderRetailStoreCountChart(mountId, mode) {
        const mount = document.getElementById(mountId);
        if (!mount || !retailStoreCountData.length) return;

        const chartConfig = getChartConfig(mode);
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
        renderGrid(svg, chartConfig);
        renderXAxis(svg, chartConfig, mode);
        renderSeries(svg, chartConfig, tooltip, mode);

        mount.textContent = "";
        mount.append(svg, tooltip);
        renderLegend(mount);
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

    document.addEventListener("DOMContentLoaded", () => {
        renderRetailStoreCountChart(chartMountId, "default");
        setupRetailStoreCountModal();
    });
})();
