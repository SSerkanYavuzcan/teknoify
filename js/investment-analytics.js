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
    const svgNamespace = "http://www.w3.org/2000/svg";
    const series = [
        { key: "bim", label: "BİM", color: "#60a5fa" },
        { key: "sok", label: "ŞOK Marketler", color: "#22d3ee" },
        { key: "migros", label: "Migros", color: "#a78bfa" },
        { key: "carrefoursa", label: "CarrefourSA", color: "#34d399" }
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

    function renderXAxis(svg, chartConfig) {
        const { left, top, width, height } = chartConfig;

        retailStoreCountData.forEach((dataPoint, index) => {
            if (!dataPoint.period.endsWith("4Ç")) return;

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

    function renderSeries(svg, chartConfig, tooltip) {
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
                    "stroke-width": "3",
                    "stroke-linecap": "round",
                    "stroke-linejoin": "round",
                    class: "investment-chart-line"
                })
            );

            retailStoreCountData.forEach((dataPoint, index) => {
                const point = getPoint(index, dataPoint[item.key], chartConfig);
                const marker = createSvgElement("circle", {
                    cx: point.x,
                    cy: point.y,
                    r: "4",
                    fill: item.color,
                    class: "investment-chart-point",
                    tabindex: "0"
                });
                const tooltipText = `${dataPoint.period} · ${item.label}: ${formatStoreCount(dataPoint[item.key])}`;

                marker.addEventListener("mouseenter", () => showTooltip(tooltip, tooltipText, point));
                marker.addEventListener("mouseleave", () => hideTooltip(tooltip));
                marker.addEventListener("focus", () => showTooltip(tooltip, tooltipText, point));
                marker.addEventListener("blur", () => hideTooltip(tooltip));

                svg.appendChild(marker);
            });
        });
    }

    function showTooltip(tooltip, text, point) {
        tooltip.textContent = text;
        tooltip.style.left = `${point.x}px`;
        tooltip.style.top = `${point.y}px`;
        tooltip.classList.add("is-visible");
    }

    function hideTooltip(tooltip) {
        tooltip.classList.remove("is-visible");
    }

    function renderRetailStoreCountChart() {
        const mount = document.getElementById(chartMountId);
        if (!mount || !retailStoreCountData.length) return;

        const chartConfig = {
            left: 72,
            top: 24,
            width: 640,
            height: 280,
            maxValue: 15000
        };
        const svg = createSvgElement("svg", {
            viewBox: "0 0 760 360",
            role: "img",
            "aria-labelledby": "retail-store-count-chart-title"
        });
        const title = createSvgElement("title", { id: "retail-store-count-chart-title" });
        const tooltip = document.createElement("div");

        title.textContent = "BİM, ŞOK Marketler, Migros ve CarrefourSA mağaza sayısı çizgi grafiği";
        tooltip.className = "investment-chart-tooltip";

        svg.appendChild(title);
        renderGrid(svg, chartConfig);
        renderXAxis(svg, chartConfig);
        renderSeries(svg, chartConfig, tooltip);

        mount.textContent = "";
        mount.append(svg, tooltip);
        renderLegend(mount);
    }

    document.addEventListener("DOMContentLoaded", renderRetailStoreCountChart);
})();
