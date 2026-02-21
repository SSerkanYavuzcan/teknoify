/**
 * shared/engine.js
 * Core render/chart/filter/export engine.
 * Reads PROJECT_CONFIG (must be loaded before this script).
 */

// ─── Global State ─────────────────────────────────────────────────────────────
let ALL_DATA = [];
let CURRENT_PROCESSED_DATA = { rows: [], competitorNames: [] };
let GRAPH_FILTERED_DATA = null;
let activeCategoryFilter = null;
let flatpickrInstance;
let SELECTED_BRANCHES = ['all'];
let SELECTED_CATEGORIES = ['all'];
let chartCategory = null;
let chartPie = null;

// ─── DOM refs (set after DOMContentLoaded) ────────────────────────────────────
let topScrollWrapper, topScrollContent, tableScrollContainer, mainTable;

document.addEventListener('DOMContentLoaded', function () {
    topScrollWrapper = document.getElementById('top-scroll-wrapper');
    topScrollContent = document.getElementById('top-scroll-content');
    tableScrollContainer = document.getElementById('table-scroll-container');
    mainTable = document.getElementById('main-table');

    if (topScrollWrapper && tableScrollContainer) {
        topScrollWrapper.addEventListener('scroll', function () {
            if (tableScrollContainer.scrollLeft !== topScrollWrapper.scrollLeft)
                tableScrollContainer.scrollLeft = topScrollWrapper.scrollLeft;
        });
        tableScrollContainer.addEventListener('scroll', function () {
            if (topScrollWrapper.scrollLeft !== tableScrollContainer.scrollLeft)
                topScrollWrapper.scrollLeft = tableScrollContainer.scrollLeft;
        });
    }
    window.addEventListener('resize', updateTopScrollWidth);
});

function updateTopScrollWidth() {
    if (mainTable && topScrollContent)
        topScrollContent.style.width = mainTable.scrollWidth + 'px';
}

// ─── Category Mapping Helper ──────────────────────────────────────────────────
function getMainCategory(l2Name) {
    if (!l2Name) return 'Diğer';
    const name = l2Name.trim();
    const map = (typeof PROJECT_CONFIG !== 'undefined') ? PROJECT_CONFIG.categoryMapping : {};
    return map[name] || 'Diğer';
}

function getAllowedStoresSet() {
    const stores = Array.isArray(window.USER_ALLOWED_STORES) ? window.USER_ALLOWED_STORES : [];
    const normalized = stores.map((s) => String(s || '').trim()).filter(Boolean);
    return new Set(normalized);
}

// ─── Calendar ─────────────────────────────────────────────────────────────────
function initCalendar() {
    const today = new Date();
    const pastDate = new Date();
    pastDate.setDate(today.getDate() - 6);
    flatpickrInstance = flatpickr('#date-range', {
        mode: 'range',
        dateFormat: 'Y-m-d',
        locale: 'tr',
        theme: 'dark',
        defaultDate: [pastDate, today],
        placeholder: 'Tarih Aralığı Seçiniz'
    });
}

// ─── API Data Loading ────────────────────────────────────────────────────────
// initData artık PROJECT_CONFIG.apiEndpoint'e POST atar.
// Tarih parametreleri flatpickr'dan alınır; branch/category filtresi client-side yapılır.
async function initData(startDate, endDate) {
    const cfg = PROJECT_CONFIG;
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '<tr><td colspan="100%" style="text-align:center;padding:30px;color:#aaa;"><i class="fas fa-spinner fa-spin" style="font-size:1.5rem;display:block;margin-bottom:10px;"></i>BigQuery\'den veriler çekiliyor...</td></tr>';

    try {
        const user = typeof auth !== 'undefined' ? auth.currentUser : null;
        if (!user) throw new Error('Kullanıcı oturumu bulunamadı.');

        const idToken = await user.getIdToken();
        const endpoint = cfg.apiEndpoint;
        if (!endpoint || endpoint.includes('REGION')) {
            throw new Error('config.js içindeki apiEndpoint henüz ayarlanmamış. Cloud Function deploy edilip URL girilmeli.');
        }

        const response = await fetch(`${endpoint}/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`,
            },
            body: JSON.stringify({
                project_id: cfg.projectId,
                start_date: _isoDate(startDate),
                end_date: _isoDate(endDate),
                effective_uid: window.USER_EFFECTIVE_UID || null,
            }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || `Sunucu hatası: HTTP ${response.status}`);
        }

        const result = await response.json();
        ALL_DATA = (result.data || []).filter(
            row => row[cfg.fields.storeField] && row[cfg.fields.productField]
        );
        populateFilters();
        _renderFilteredData();
    } catch (err) {
        console.error('API Hatası:', err);
        tbody.innerHTML = `<tr><td colspan="100%" style="color:#ef4444;text-align:center;padding:30px;"><i class="fas fa-exclamation-triangle" style="font-size:1.5rem;display:block;margin-bottom:10px;"></i>${err.message || 'Veri çekilemedi.'}</td></tr>`;
    }
}

function _isoDate(d) {
    // Date → YYYY-MM-DD string (BigQuery DATE formatı)
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function showNoDataState() {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '<tr><td colspan="100%" style="text-align:center;padding:40px;color:#aaa;"><i class="fas fa-database" style="font-size:2rem;margin-bottom:10px;display:block;"></i>Veri kaynağı hazır değil veya erişim yetkisi yok.</td></tr>';
}

// ─── Filters ──────────────────────────────────────────────────────────────────
function populateFilters() {
    const cfg = PROJECT_CONFIG;
    const branchSet = new Set();
    const catSet = new Set();
    const allowedStores = getAllowedStoresSet();

    ALL_DATA.forEach(row => {
        const storeName = row[cfg.fields.storeField] ? row[cfg.fields.storeField].trim() : '';
        if (allowedStores.size > 0 && !allowedStores.has(storeName)) return;

        if (storeName) branchSet.add(storeName);
        if (row[cfg.fields.categoryField]) catSet.add(row[cfg.fields.categoryField].trim());
    });

    renderMultiSelectOptions('menu-branch', Array.from(branchSet).sort(), 'branch');
    updateTriggerText('branch', 'Tüm Şubeler');
    renderMultiSelectOptions('menu-category', Array.from(catSet).sort(), 'category');
    updateTriggerText('category', 'Tüm Kategoriler');
}

function renderMultiSelectOptions(menuId, items, type) {
    const menu = document.getElementById(menuId);
    menu.innerHTML = '';

    const searchContainer = document.createElement('div');
    searchContainer.style.cssText = 'padding:8px;border-bottom:1px solid rgba(255,255,255,0.05);';
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Ara...';
    searchInput.style.cssText = 'width:100%;padding:8px 12px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);background:rgba(0,0,0,0.3);color:#fff;font-size:0.85rem;outline:none;';
    const scrollContainer = document.createElement('div');
    scrollContainer.style.cssText = 'max-height:200px;overflow-y:auto;';
    searchInput.addEventListener('input', e => {
        const term = e.target.value.toLowerCase();
        scrollContainer.querySelectorAll('.multi-option').forEach(opt => {
            opt.style.display = opt.querySelector('span').textContent.toLowerCase().includes(term) ? 'flex' : 'none';
        });
    });
    searchInput.onclick = e => e.stopPropagation();
    searchContainer.appendChild(searchInput);

    const fixedHeader = document.createElement('div');
    fixedHeader.style.cssText = 'padding:4px;border-bottom:1px solid rgba(255,255,255,0.05);margin-bottom:4px;';
    const allDiv = document.createElement('div');
    allDiv.className = 'multi-option all-option selected';
    allDiv.onclick = () => selectOption(type, 'all', allDiv);
    allDiv.innerHTML = '<span>Tümü</span><div class="option-checkbox"></div>';
    fixedHeader.appendChild(allDiv);

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'multi-option';
        div.onclick = () => selectOption(type, item, div);
        div.innerHTML = `<span>${item}</span><div class="option-checkbox"></div>`;
        scrollContainer.appendChild(div);
    });

    menu.appendChild(searchContainer);
    menu.appendChild(fixedHeader);
    menu.appendChild(scrollContainer);
}

function selectOption(type, value, element) {
    let selectedArray = (type === 'branch') ? SELECTED_BRANCHES : SELECTED_CATEGORIES;
    const menuId = (type === 'branch') ? 'menu-branch' : 'menu-category';
    const menu = document.getElementById(menuId);
    const allOption = menu.querySelector('.all-option');

    if (value === 'all') {
        selectedArray.length = 0; selectedArray.push('all');
        menu.querySelectorAll('.multi-option').forEach(c => c.classList.remove('selected'));
        allOption.classList.add('selected');
    } else {
        if (selectedArray.includes('all')) {
            selectedArray.splice(selectedArray.indexOf('all'), 1);
            allOption.classList.remove('selected');
        }
        if (selectedArray.includes(value)) {
            selectedArray.splice(selectedArray.indexOf(value), 1);
            element.classList.remove('selected');
        } else {
            selectedArray.push(value);
            element.classList.add('selected');
        }
        if (selectedArray.length === 0) { selectedArray.push('all'); allOption.classList.add('selected'); }
    }

    if (type === 'branch') SELECTED_BRANCHES = selectedArray;
    else SELECTED_CATEGORIES = selectedArray;
    updateTriggerText(type);
}

function updateTriggerText(type) {
    const arr = (type === 'branch') ? SELECTED_BRANCHES : SELECTED_CATEGORIES;
    const textId = (type === 'branch') ? 'text-branch' : 'text-category';
    const label = document.getElementById(textId);
    if (!label) return;
    if (arr.includes('all')) label.textContent = (type === 'branch') ? 'Tüm Şubeler' : 'Tüm Kategoriler';
    else if (arr.length === 1) label.textContent = arr[0];
    else label.textContent = `${arr.length} ${type === 'branch' ? 'Şube' : 'Kategori'} Seçildi`;
}

function toggleMultiSelect(menuId) {
    const menu = document.getElementById(menuId);
    const isVisible = menu.classList.contains('show');
    document.querySelectorAll('.multi-select-menu').forEach(m => m.classList.remove('show'));
    if (!isVisible) {
        menu.classList.add('show');
        const input = menu.querySelector('input');
        if (input) setTimeout(() => input.focus(), 100);
    }
}

// ─── Apply Filters ────────────────────────────────────────────────────────────
// Tarih değişince API'yi çağır (server-side date filter).
// Branch/kategori değişince sadece client-side filtrele (_renderFilteredData).
function applyFilters() {
    clearGraphFilters();
    const dateRange = flatpickrInstance ? flatpickrInstance.selectedDates : [];
    if (dateRange.length < 1) { showToast('Lütfen bir tarih aralığı seçiniz.'); return; }

    const startDate = new Date(dateRange[0]); startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(dateRange[1] || dateRange[0]); endDate.setHours(23, 59, 59, 999);

    initData(startDate, endDate);   // BigQuery API çağrısı
}

// Tarih değişmeden sadece branch/kategori filtresi uygulanınca:
function _renderFilteredData() {
    const cfg = PROJECT_CONFIG;
    const tbody = document.getElementById('table-body');
    const limitMsg = document.getElementById('limit-msg');
    const btnDl = document.getElementById('btn-download');

    // Client-side branch & kategori filtresi
    const allowedStores = getAllowedStoresSet();
    const filteredData = ALL_DATA.filter(row => {
        const storeName = (row[cfg.fields.storeField] || '').trim();
        const catName = (row[cfg.fields.categoryField] || '').trim();
        const storeEntitlementMatch = allowedStores.size === 0 || allowedStores.has(storeName);
        const branchMatch = SELECTED_BRANCHES.includes('all') || SELECTED_BRANCHES.includes(storeName);
        const catMatch = SELECTED_CATEGORIES.includes('all') || SELECTED_CATEGORIES.includes(catName);
        return storeEntitlementMatch && branchMatch && catMatch;
    });

    const aggregatedResult = aggregateData(filteredData);
    CURRENT_PROCESSED_DATA = aggregatedResult;

    if (aggregatedResult.rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="100%" style="text-align:center;padding:20px;">Bu kriterlere uygun veri bulunamadı.</td></tr>';
        if (btnDl) btnDl.classList.add('btn-disabled');
        if (limitMsg) limitMsg.style.display = 'none';
        if (chartCategory) chartCategory.updateSeries([{ data: [] }]);
        if (chartPie) chartPie.updateSeries([0, 0, 0]);
        const kpi = document.getElementById('kpi-competition');
        if (kpi) kpi.innerText = '-';
        return;
    }

    if (btnDl) btnDl.classList.remove('btn-disabled');
    updateDashboard(aggregatedResult.rows);
    const displayData = aggregatedResult.rows.slice(0, 250);
    if (limitMsg) limitMsg.style.display = (aggregatedResult.rows.length > 250) ? 'block' : 'none';
    renderTable(displayData, aggregatedResult.competitorNames);
}

// ─── Filter by Graph Click ────────────────────────────────────────────────────
function filterTableByGraph(filterType, filterValue) {
    if (!CURRENT_PROCESSED_DATA || CURRENT_PROCESSED_DATA.rows.length === 0) return;
    const cfg = PROJECT_CONFIG;
    const banner = document.getElementById('active-filter-banner');
    const text = document.getElementById('active-filter-text');
    banner.style.display = 'flex';
    let filteredRows = [];

    if (filterType === 'CATEGORY') {
        text.innerHTML = `Filtrelenen Kategori: <strong>${filterValue}</strong>`;
        filteredRows = CURRENT_PROCESSED_DATA.rows.filter(row =>
            getMainCategory(row[cfg.fields.categoryField]) === filterValue
        );
    } else if (filterType === 'POSITION') {
        text.innerHTML = `Pazar Konumu: <strong>${filterValue}</strong>`;
        filteredRows = CURRENT_PROCESSED_DATA.rows.filter(row => {
            const bizPrice = row.our_price_dsc > 0 ? row.our_price_dsc : row.our_price_org;
            let minComp = Infinity; let hasComp = false;
            Object.values(row.competitors).forEach(c => {
                const p = c.dsc > 0 ? c.dsc : c.org;
                if (p > 0 && p < minComp) { minComp = p; hasComp = true; }
            });
            if (bizPrice > 0 && hasComp && minComp < Infinity) {
                if (filterValue === 'Daha Ucuzuz') return bizPrice < minComp;
                if (filterValue === 'Daha Pahalıyız') return bizPrice > minComp;
                if (filterValue === 'Eşit') return bizPrice === minComp;
            }
            return false;
        });
    }

    GRAPH_FILTERED_DATA = filteredRows;
    renderTable(filteredRows.slice(0, 250), CURRENT_PROCESSED_DATA.competitorNames);
    const limitMsg = document.getElementById('limit-msg');
    if (limitMsg) limitMsg.style.display = (filteredRows.length > 250) ? 'block' : 'none';
}

function clearGraphFilters() {
    const banner = document.getElementById('active-filter-banner');
    if (banner) banner.style.display = 'none';
    GRAPH_FILTERED_DATA = null;
    activeCategoryFilter = null;
    if (!CURRENT_PROCESSED_DATA.rows.length) return;
    renderTable(CURRENT_PROCESSED_DATA.rows.slice(0, 250), CURRENT_PROCESSED_DATA.competitorNames);
    const limitMsg = document.getElementById('limit-msg');
    if (limitMsg) limitMsg.style.display = (CURRENT_PROCESSED_DATA.rows.length > 250) ? 'block' : 'none';
}

// ─── Data Aggregation ────────────────────────────────────────────────────────
function aggregateData(data) {
    const cfg = PROJECT_CONFIG;
    const f = cfg.fields;
    const grouped = {};
    const allComps = new Set();

    data.forEach(row => {
        const productKey = row[f.skuField] || row[f.productField];
        if (!productKey) return;
        const uniqueKey = `${row[f.dateField]}_${productKey}`;
        const rawComp = row[f.compStoreName];
        const compName = rawComp ? rawComp.trim() : 'Bilinmeyen';
        if (compName && compName !== 'Bilinmeyen') allComps.add(compName);

        if (!grouped[uniqueKey]) {
            grouped[uniqueKey] = {
                ...row,
                our_price_org: parsePrice(row[f.ourOrgPrice]),
                our_price_dsc: parsePrice(row[f.ourDscPrice]),
                competitors: {}
            };
        }
        grouped[uniqueKey].competitors[compName] = {
            org: parsePrice(row[f.compOrgPrice]),
            dsc: parsePrice(row[f.compDscPrice])
        };
    });

    const sortOrder = cfg.competitorSortOrder || [];
    const sortedCompetitors = Array.from(allComps).sort((a, b) => {
        const aL = a.toLowerCase(); const bL = b.toLowerCase();
        let idxA = sortOrder.findIndex(k => aL.includes(k));
        let idxB = sortOrder.findIndex(k => bL.includes(k));
        if (idxA === -1) idxA = 99;
        if (idxB === -1) idxB = 99;
        if (idxA !== idxB) return idxA - idxB;
        return a.localeCompare(b);
    });

    const sortedRows = Object.values(grouped).sort((a, b) => {
        // ISO date (YYYY-MM-DD) veya Türkçe format (DD.MM.YYYY) ikisini de destekler
        const dateA = _parseRowDate(a[f.dateField]);
        const dateB = _parseRowDate(b[f.dateField]);
        return dateB - dateA;
    });

    return { rows: sortedRows, competitorNames: sortedCompetitors };
}

// ─── Dashboard KPIs ──────────────────────────────────────────────────────────
function updateDashboard(dataRows) {
    const cfg = PROJECT_CONFIG;
    let totalBiz = 0, totalComp = 0;
    let discountCountBiz = 0;
    let totalDiscountDepth = 0, depthCount = 0;
    let categoryStats = {};
    let countCheaper = 0, countEqual = 0, countExpensive = 0;

    dataRows.forEach(row => {
        const bizPrice = row.our_price_dsc > 0 ? row.our_price_dsc : row.our_price_org;
        let minComp = Infinity; let hasComp = false;
        Object.values(row.competitors).forEach(c => {
            const p = c.dsc > 0 ? c.dsc : c.org;
            if (p > 0 && p < minComp) { minComp = p; hasComp = true; }
        });

        if (bizPrice > 0 && hasComp && minComp < Infinity) {
            totalBiz += bizPrice;
            totalComp += minComp;
            const cat = getMainCategory(row[cfg.fields.categoryField]);
            if (!categoryStats[cat]) categoryStats[cat] = { biz: 0, comp: 0, count: 0 };
            categoryStats[cat].biz += bizPrice;
            categoryStats[cat].comp += minComp;
            categoryStats[cat].count++;
            if (bizPrice < minComp) countCheaper++;
            else if (bizPrice > minComp) countExpensive++;
            else countEqual++;
        }

        if (row.our_price_dsc > 0 && row.our_price_dsc < row.our_price_org) {
            discountCountBiz++;
            totalDiscountDepth += ((row.our_price_org - row.our_price_dsc) / row.our_price_org) * 100;
            depthCount++;
        }
    });

    const compElem = document.getElementById('kpi-competition');
    const compSub = document.getElementById('kpi-competition-sub');
    if (totalBiz > 0 && totalComp > 0) {
        if (totalBiz < totalComp) {
            const diff = ((totalComp - totalBiz) / totalComp) * 100;
            compElem.innerHTML = `%${diff.toFixed(1)} <span style="font-size:0.6em;color:#10b981;">DAHA UCUZ</span>`;
            compSub.innerHTML = `<span class="trend-up"><i class="fas fa-check"></i> Avantajlı</span> Pazar Konumu`;
        } else {
            const diff = ((totalBiz - totalComp) / totalBiz) * 100;
            compElem.innerHTML = `%${diff.toFixed(1)} <span style="font-size:0.6em;color:#ef4444;">DAHA PAHALI</span>`;
            compSub.innerHTML = `<span class="trend-down"><i class="fas fa-exclamation-triangle"></i> Kritik</span> Pazar Konumu`;
        }
    } else {
        compElem.innerHTML = '-';
        compSub.innerHTML = 'Veri Yetersiz';
    }

    document.getElementById('kpi-disc-us').innerText = discountCountBiz;
    const avgDepth = depthCount > 0 ? (totalDiscountDepth / depthCount) : 0;
    document.getElementById('kpi-depth').innerText = `%${avgDepth.toFixed(1)}`;
    document.getElementById('kpi-depth-bar').style.width = `${Math.min(avgDepth, 100)}%`;

    let bestCat = '-'; let maxDiff = -Infinity;
    for (const [cat, stats] of Object.entries(categoryStats)) {
        if (stats.comp <= 0) continue;
        const d = ((stats.comp - stats.biz) / stats.comp) * 100;
        if (d > maxDiff) { maxDiff = d; bestCat = cat; }
    }
    document.getElementById('kpi-best-cat').innerText = bestCat;
    document.getElementById('kpi-best-cat-sub').innerHTML = maxDiff > -Infinity
        ? (maxDiff > 0
            ? `<span class="trend-up">+%${maxDiff.toFixed(1)} Avantaj</span>`
            : `<span class="trend-down">%${maxDiff.toFixed(1)} Dezavantaj</span>`)
        : '-';

    renderCategoryChart(categoryStats);
    renderPieChart(countCheaper, countEqual, countExpensive);
}

// ─── Charts ───────────────────────────────────────────────────────────────────
function renderCategoryChart(categoryStats) {
    const categories = Object.keys(categoryStats);
    const seriesData = categories.map(cat => {
        const s = categoryStats[cat];
        return s.comp === 0 ? 0 : parseFloat(((s.comp - s.biz) / s.comp * 100).toFixed(1));
    });

    const options = {
        series: [{ name: 'Fiyat Avantajı (%)', data: seriesData }],
        chart: {
            type: 'bar', height: 280, toolbar: { show: false },
            background: 'transparent', fontFamily: 'Inter Tight, sans-serif',
            events: {
                click: function (event, ctx, config) {
                    if (config.dataPointIndex !== undefined && config.dataPointIndex > -1) {
                        const sel = categories[config.dataPointIndex];
                        if (activeCategoryFilter === sel) { clearGraphFilters(); }
                        else { activeCategoryFilter = sel; filterTableByGraph('CATEGORY', sel); }
                    }
                }
            }
        },
        plotOptions: {
            bar: {
                colors: { ranges: [{ from: -100, to: -0.1, color: '#ef4444' }, { from: 0, to: 100, color: '#10b981' }] },
                columnWidth: '60%', borderRadius: 4
            }
        },
        dataLabels: { enabled: false },
        xaxis: {
            categories,
            labels: { style: { colors: '#888', fontSize: '11px', fontWeight: 500 }, rotate: -45, trim: true },
            axisBorder: { show: false }, axisTicks: { show: false }, tooltip: { enabled: false }
        },
        yaxis: {
            labels: { style: { colors: '#888', fontFamily: 'Fira Code, monospace' }, formatter: v => `%${v}` },
            axisBorder: { show: false }
        },
        grid: {
            borderColor: '#333', strokeDashArray: 4,
            yaxis: { lines: { show: true } }, xaxis: { lines: { show: false } },
            padding: { top: 0, right: 0, bottom: 0, left: 10 }
        },
        tooltip: {
            theme: 'dark', intersect: false, shared: true, style: { fontSize: '12px' },
            x: { show: true }, y: { formatter: v => '%' + v }
        }
    };

    if (chartCategory) chartCategory.destroy();
    chartCategory = new ApexCharts(document.querySelector('#chart-category'), options);
    chartCategory.render();
}

function renderPieChart(cheaper, equal, expensive) {
    const total = cheaper + equal + expensive;
    if (total === 0) return;
    const options = {
        series: [cheaper, equal, expensive],
        chart: {
            type: 'donut', height: 280, background: 'transparent',
            events: {
                dataPointSelection: function (e, ctx, config) {
                    const labels = ['Daha Ucuzuz', 'Eşit', 'Daha Pahalıyız'];
                    filterTableByGraph('POSITION', labels[config.dataPointIndex]);
                }
            }
        },
        labels: ['Daha Ucuzuz', 'Eşit', 'Daha Pahalıyız'],
        colors: ['#10b981', '#fbbf24', '#ef4444'],
        plotOptions: {
            pie: {
                donut: {
                    size: '70%', labels: {
                        show: true,
                        name: { color: '#888' },
                        value: { color: '#fff', fontSize: '20px', fontWeight: 700 },
                        total: { show: true, showAlways: true, label: 'Toplam Ürün', color: '#888', formatter: () => total }
                    }
                }
            }
        },
        dataLabels: { enabled: false },
        legend: { position: 'bottom', labels: { colors: '#ccc' } },
        stroke: { show: false }, theme: { mode: 'dark' }
    };
    if (chartPie) chartPie.destroy();
    chartPie = new ApexCharts(document.querySelector('#chart-pie'), options);
    chartPie.render();
}

// ─── Table Rendering ─────────────────────────────────────────────────────────
function renderTable(dataRows, competitorNames) {
    const cfg = PROJECT_CONFIG;
    const f = cfg.fields;
    const theadTop = document.getElementById('header-row-top');
    const theadBot = document.getElementById('header-row-bottom');
    const tbody = document.getElementById('table-body');

    tbody.innerHTML = ''; theadTop.innerHTML = ''; theadBot.innerHTML = '';

    // ── Top header row ──
    let topHtml = '<th class="th-fixed-corner">Ürün</th>';
    topHtml += `<th colspan="${cfg.detailColumns.length}" class="th-scrollable-group">Ürün Detayları</th>`;

    const myLabel = (dataRows.length > 0 && dataRows[0][f.storeField]) ? dataRows[0][f.storeField] : 'Bizim Fiyatlar';
    topHtml += `<th colspan="2" class="th-group-tazeyo">${myLabel}</th>`;

    competitorNames.forEach(compName => {
        const color = getBrandColor(compName);
        const bg = hexToRgba(color, 0.08);
        topHtml += `<th colspan="2" style="color:${color};background-color:${bg};border-bottom:1px solid #333;border-left:2px solid #444;">${compName}</th>`;
    });
    topHtml += '<th colspan="2" style="background:#14161c;border-left:2px solid #444;color:#fff;">En Ucuz Kanal</th>';
    theadTop.innerHTML = topHtml;

    // ── Bottom header row ──
    let botHtml = '<th class="sticky-product">Ürün Adı</th>';
    cfg.detailColumns.forEach(col => { botHtml += `<th>${col.label}</th>`; });
    botHtml += '<th>Price</th><th>Discount Price</th>';
    competitorNames.forEach(() => { botHtml += '<th class="border-left-light">Price</th><th>Discount Price</th>'; });
    botHtml += '<th class="border-left-light col-analysis-status">Durum</th><th>Fark</th>';
    theadBot.innerHTML = botHtml;

    // ── Data rows ──
    dataRows.forEach(row => {
        const tr = document.createElement('tr');
        let html = `<td class="sticky-product" title="${row[f.productField]}">${row[f.productField]}</td>`;
        cfg.detailColumns.forEach(col => { html += `<td>${row[col.key] || '-'}</td>`; });

        const t_org = row.our_price_org;
        const t_dsc = row.our_price_dsc;
        const bizPrice = t_dsc > 0 ? t_dsc : t_org;
        html += `<td class="price-cell">₺${formatMoney(t_org)}</td>`;
        html += `<td class="price-cell">${t_dsc > 0 ? '₺' + formatMoney(t_dsc) : '-'}</td>`;

        let minComp = Infinity; let minCompName = '';
        competitorNames.forEach(compName => {
            const cd = row.competitors[compName];
            if (cd) {
                const rakip = cd.dsc > 0 ? cd.dsc : cd.org;
                if (rakip > 0 && rakip < minComp) { minComp = rakip; minCompName = compName; }
                html += `<td class="price-cell" style="border-left:1px solid #333;">₺${formatMoney(cd.org)}</td>`;
                html += `<td class="price-cell">${cd.dsc > 0 ? '₺' + formatMoney(cd.dsc) : '-'}</td>`;
            } else {
                html += '<td colspan="2" style="border-left:1px solid #333;text-align:center;color:#444;font-size:0.8em;">Veri Yok</td>';
            }
        });

        let badgeHtml = '<span class="badge" style="background:#333;color:#aaa;">-</span>';
        let farkYuzde = 0; let farkClass = '';
        if (bizPrice > 0 && minComp !== Infinity) {
            if (bizPrice < minComp) {
                const ownLabel = PROJECT_CONFIG.ourStoreLabel || 'Biz';
                badgeHtml = `<span class="badge badge-tazeyo">${ownLabel}</span>`;
                farkYuzde = ((minComp - bizPrice) / minComp) * 100;
                farkClass = 'diff-negative';
            } else if (bizPrice > minComp) {
                const shortName = cleanName(minCompName);
                const brandColor = getBrandColor(minCompName);
                const bgRgba = hexToRgba(brandColor, 0.2);
                const bdRgba = hexToRgba(brandColor, 0.3);
                badgeHtml = `<span class="badge badge-market" style="background-color:${bgRgba};color:${brandColor};border:1px solid ${bdRgba};" title="${minCompName}">${shortName}</span>`;
                farkYuzde = ((bizPrice - minComp) / bizPrice) * 100;
                farkClass = 'diff-positive';
            } else {
                badgeHtml = '<span class="badge" style="background:#555;">EŞİT</span>';
            }
        }

        html += `<td style="border-left:2px solid #444;text-align:center;">${badgeHtml}</td>`;
        html += `<td class="${farkClass}">${farkYuzde > 0 ? '%' + farkYuzde.toFixed(1) : '-'}</td>`;
        tr.innerHTML = html;
        tbody.appendChild(tr);
    });

    updateTopScrollWidth();
}

// ─── Brand Color Helpers ──────────────────────────────────────────────────────
function getBrandColor(fullName) {
    if (!fullName) return PROJECT_CONFIG.defaultBrandColor || '#f97316';
    const lower = fullName.toLowerCase();
    const colors = PROJECT_CONFIG.brandColors || {};
    for (const [key, val] of Object.entries(colors)) {
        if (lower.includes(key)) return val;
    }
    return PROJECT_CONFIG.defaultBrandColor || '#f97316';
}

function hexToRgba(hex, alpha) {
    let c;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
        c = hex.substring(1).split('');
        if (c.length === 3) c = [c[0], c[0], c[1], c[1], c[2], c[2]];
        c = '0x' + c.join('');
        return `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${alpha})`;
    }
    return hex;
}

// ─── Utility ─────────────────────────────────────────────────────────────────
function cleanName(name) { return name ? name.split('(')[0].trim() : ''; }

// Hem ISO (YYYY-MM-DD) hem Türkçe (DD.MM.YYYY) formatındaki tarihleri Date'e çevirir
function _parseRowDate(dateStr) {
    if (!dateStr) return new Date(0);
    const s = String(dateStr);
    if (s.includes('-')) return new Date(s);   // ISO
    const p = s.split('.');
    return p.length === 3 ? new Date(p[2], p[1] - 1, p[0]) : new Date(s);
}

function parsePrice(val) {
    if (!val) return 0;
    let clean = val.toString().replace(/["'₺\s]/g, '');
    if (clean.indexOf(',') > -1 && clean.indexOf('.') === -1) clean = clean.replace(',', '.');
    else if (clean.indexOf(',') > -1 && clean.indexOf('.') > -1) clean = clean.replace(/\./g, '').replace(',', '.');
    return parseFloat(clean) || 0;
}

function formatMoney(num) {
    return num === 0 ? '0,00' : new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(num);
}

function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-message').textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function toggleDownloadMenu() { document.getElementById('download-menu').classList.toggle('show'); }

function getActiveDataForExport() {
    return {
        rows: (GRAPH_FILTERED_DATA && GRAPH_FILTERED_DATA.length > 0) ? GRAPH_FILTERED_DATA : CURRENT_PROCESSED_DATA.rows,
        competitorNames: CURRENT_PROCESSED_DATA.competitorNames
    };
}

// ─── CSV Export ───────────────────────────────────────────────────────────────
function downloadCSV() {
    const { rows, competitorNames } = getActiveDataForExport();
    if (!rows || rows.length === 0) { showToast('İndirilecek veri bulunamadı.'); return; }
    const cfg = PROJECT_CONFIG;
    const out = [];

    rows.forEach(row => {
        const bizOrg = row.our_price_org;
        const bizDsc = row.our_price_dsc;
        const bizPrice = bizDsc > 0 ? bizDsc : bizOrg;
        let minComp = Infinity; let minCompName = '';
        competitorNames.forEach(comp => {
            const cd = row.competitors[comp];
            if (!cd) return;
            const rs = cd.dsc > 0 ? cd.dsc : cd.org;
            if (rs > 0 && rs < minComp) { minComp = rs; minCompName = comp; }
        });
        let durumText = '-'; let farkText = '-';
        if (bizPrice > 0 && minComp !== Infinity) {
            if (bizPrice < minComp) { durumText = PROJECT_CONFIG.ourStoreLabel || 'Biz'; farkText = '%' + (((minComp - bizPrice) / minComp) * 100).toFixed(1); }
            else if (bizPrice > minComp) { durumText = cleanName(minCompName); farkText = '%' + (((bizPrice - minComp) / bizPrice) * 100).toFixed(1); }
            else { durumText = 'EŞİT'; farkText = '%0.0'; }
        }
        const base = { 'Product Name': row[cfg.fields.productField] || '', 'Report Date': row[cfg.fields.dateField] || '', 'Store Name': row[cfg.fields.storeField] || '', 'SKU': row[cfg.fields.skuField] || '', 'Biz Original Price': bizOrg || '', 'Biz Discount Price': bizDsc || '' };
        cfg.detailColumns.forEach(col => { base[col.label] = row[col.key] || ''; });
        competitorNames.forEach(comp => {
            const cd = row.competitors[comp];
            base[`${comp} Original Price`] = cd ? cd.org : '';
            base[`${comp} Discount Price`] = cd ? cd.dsc : '';
        });
        base['Status'] = durumText; base['Diff'] = farkText;
        out.push(base);
    });

    const csv = Papa.unparse(out, { quotes: true, delimiter: ',' });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = flatpickrInstance?.selectedDates?.[0] ? flatpickrInstance.selectedDates[0].toLocaleDateString('tr-TR') : 'rapor';
    a.download = `${cfg.exportFileName}_${dateStr}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    document.getElementById('download-menu').classList.remove('show');
}

// ─── Excel Export ─────────────────────────────────────────────────────────────
function downloadExcel() {
    const { rows, competitorNames } = getActiveDataForExport();
    if (!rows || rows.length === 0) { showToast('İndirilecek veri bulunamadı.'); return; }
    const cfg = PROJECT_CONFIG;
    const exRows = [];
    const merges = [];

    const row1 = ['Ürün Bilgileri', ...Array(cfg.detailColumns.length - 1).fill(''),
        rows[0][cfg.fields.storeField] || 'Bizim Fiyatlar', ''];
    competitorNames.forEach(c => row1.push(c, ''));
    row1.push('En Ucuz Kanal', '');
    exRows.push(row1);

    const row2 = ['Ürün Adı', ...cfg.detailColumns.map(c => c.label), 'Fiyat', 'İndirimli Fiyat'];
    competitorNames.forEach(() => row2.push('Fiyat', 'İndirimli Fiyat'));
    row2.push('Durum', 'Fark');
    exRows.push(row2);

    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: cfg.detailColumns.length } });
    let ci = cfg.detailColumns.length + 1;
    merges.push({ s: { r: 0, c: ci }, e: { r: 0, c: ci + 1 } }); ci += 2;
    competitorNames.forEach(() => { merges.push({ s: { r: 0, c: ci }, e: { r: 0, c: ci + 1 } }); ci += 2; });
    merges.push({ s: { r: 0, c: ci }, e: { r: 0, c: ci + 1 } });

    rows.forEach(row => {
        const bizOrg = row.our_price_org;
        const bizDsc = row.our_price_dsc;
        const bizPrice = bizDsc > 0 ? bizDsc : bizOrg;
        const rowData = [row[cfg.fields.productField], ...cfg.detailColumns.map(c => row[c.key] || '-'), bizOrg || '', bizDsc || ''];
        let minComp = Infinity; let minCompName = '';
        competitorNames.forEach(comp => {
            const cd = row.competitors[comp];
            if (cd) { const rs = cd.dsc > 0 ? cd.dsc : cd.org; if (rs > 0 && rs < minComp) { minComp = rs; minCompName = comp; } rowData.push(cd.org || '', cd.dsc || ''); }
            else rowData.push('', '');
        });
        let durumText = '-'; let farkText = '-';
        if (bizPrice > 0 && minComp !== Infinity) {
            if (bizPrice < minComp) { durumText = PROJECT_CONFIG.ourStoreLabel || 'Biz'; farkText = '%' + (((minComp - bizPrice) / minComp) * 100).toFixed(1); }
            else if (bizPrice > minComp) { durumText = cleanName(minCompName); farkText = '%' + (((bizPrice - minComp) / bizPrice) * 100).toFixed(1); }
            else { durumText = 'EŞİT'; farkText = '%0.0'; }
        }
        rowData.push(durumText, farkText);
        exRows.push(rowData);
    });

    const ws = XLSX.utils.aoa_to_sheet(exRows);
    ws['!merges'] = merges;
    const range = XLSX.utils.decode_range(ws['!ref']);
    const wscols = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
        let maxLen = 10;
        for (let R = range.s.r; R <= Math.min(range.e.r, 50); ++R) {
            const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
            if (cell && cell.v) { const l = cell.v.toString().length; if (l > maxLen) maxLen = l; }
        }
        wscols.push({ wch: maxLen + 2 });
    }
    ws['!cols'] = wscols;
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const a1 = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!ws[a1]) ws[a1] = { t: 's', v: '' };
        const styleObj = { fill: { fgColor: { rgb: '1F232C' } }, font: { color: { rgb: 'FFFFFF' }, bold: true }, alignment: { horizontal: 'center', vertical: 'center' }, border: { bottom: { style: 'thin', color: { rgb: '555555' } }, right: { style: 'thin', color: { rgb: '555555' } } } };
        ws[a1].s = { ...styleObj, font: { ...styleObj.font, sz: 12 } };
        const a2 = XLSX.utils.encode_cell({ r: 1, c: C });
        if (ws[a2]) ws[a2].s = styleObj;
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fiyat Analizi');
    const dateStr = flatpickrInstance.selectedDates[0] ? flatpickrInstance.selectedDates[0].toLocaleDateString('tr-TR') : 'rapor';
    const filterSuffix = activeCategoryFilter ? `_${activeCategoryFilter.replace(/\s/g, '')}` : '';
    XLSX.writeFile(wb, `${cfg.exportFileName}_${dateStr}${filterSuffix}.xlsx`);
    document.getElementById('download-menu').classList.remove('show');
}
