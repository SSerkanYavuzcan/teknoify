(function () {
    const DEMO_CATEGORIES = [
        { key: 'Demo Projects', label: 'Demo Projeleri' },
        { key: 'Web Scraping', label: 'Web Scraping' },
        { key: 'Automation', label: 'Otomasyon' },
        { key: 'AI Tools', label: 'AI Araçları' },
        { key: 'Analytics', label: 'Analitik' },
        { key: 'Integrations', label: 'Entegrasyonlar' }
    ];

    const LIVE_LOG_MESSAGES = [
        'Migros sitesine giriş yapılıyor...',
        'Kategori ve ürün bilgileri alınıyor...',
        'Demo amacıyla ilk 100 ürün bilgisi toplandı.',
        'CarrefourSA sitesine giriş yapılıyor...',
        'Kategori ve ürün bilgileri alınıyor...',
        'Demo amacıyla ilk 100 ürün bilgisi toplandı.',
        'Ürün eşleştirmeleri gerçekleşiyor...',
        'Ürün eşleşmeleri tamamlandı. 95 benzer ürün tespit edildi.',
        'Data analizi gerçekleştiriliyor...',
        'Analiz tamamlandı.',
        'Teknoify Demo alanına verileri aktarılıyor...',
        'Veri aktarımı başarılı.'
    ];

    const LIVE_LOG_INTERVAL_MS = 2500;

    const state = {
        demos: [],
        activeCategory: 'Web Scraping',
        selectedStore: '',
        competitorStore: '',
        liveLogVisibleCount: 0,
        liveLogTimer: null
    };

    function getCategoryLabel(categoryKey) {
        const category = DEMO_CATEGORIES.find((item) => item.key === categoryKey);
        return category ? category.label : categoryKey;
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function getRetailDemo() {
        return state.demos.find((item) => item.outputType === 'retailComparisonTable');
    }

    function getRetailOutput() {
        const demo = getRetailDemo();
        return demo && demo.sampleOutput ? demo.sampleOutput : {};
    }

    function getStores(output) {
        const stores = Array.isArray(output.stores) ? output.stores.filter(Boolean) : [];
        return stores.length >= 2 ? stores : ['CarrefourSA', 'Migros'];
    }

    function getFallbackCompetitor(stores, selectedStore) {
        return stores.find((store) => store !== selectedStore) || stores[0] || '';
    }

    function ensureRetailSelections() {
        const output = getRetailOutput();
        const stores = getStores(output);
        const selectedStore = stores.includes(state.selectedStore)
            ? state.selectedStore
            : output.selectedStore || stores[0] || '';
        const competitorStore =
            stores.includes(state.competitorStore) && state.competitorStore !== selectedStore
                ? state.competitorStore
                : output.competitorStore !== selectedStore &&
                    stores.includes(output.competitorStore)
                  ? output.competitorStore
                  : getFallbackCompetitor(stores, selectedStore);

        state.selectedStore = selectedStore;
        state.competitorStore = competitorStore;

        return {
            selectedStore,
            competitorStore,
            stores
        };
    }

    function getRetailColumns(selectedStore, competitorStore) {
        return [
            'Ürün Barkodu',
            'Ürün Adı',
            `${selectedStore} Fiyat`,
            `${selectedStore} İndirimli Fiyat`,
            `${competitorStore} Fiyat`,
            `${competitorStore} İndirimli Fiyat`,
            'Fiyat Farkı %',
            'Ürün Kategorisi'
        ];
    }

    function renderRetailTableHeader(selectedStore, competitorStore) {
        return `
              <tr>
                <th scope="col" rowspan="2">Ürün Barkodu</th>
                <th scope="col" rowspan="2">Ürün Adı</th>
                <th class="retail-store-header retail-store-header--${escapeHtml(getStoreClassName(selectedStore))}" scope="colgroup" colspan="2">${escapeHtml(selectedStore)}</th>
                <th class="retail-store-header retail-store-header--${escapeHtml(getStoreClassName(competitorStore))}" scope="colgroup" colspan="2">${escapeHtml(competitorStore)}</th>
                <th scope="col" rowspan="2">Fiyat Farkı %</th>
                <th scope="col" rowspan="2">Ürün Kategorisi</th>
              </tr>
              <tr>
                <th scope="col">Fiyat</th>
                <th scope="col">İndirimli Fiyat</th>
                <th scope="col">Fiyat</th>
                <th scope="col">İndirimli Fiyat</th>
              </tr>`;
    }

    function hydrateComparisonRows(output) {
        // Future: hydrate rows from Google Sheets data source.
        return Array.isArray(output.rows) ? output.rows : [];
    }

    function getStoreSlug(store) {
        return String(store)
            .replace(/[^a-z0-9]/gi, '')
            .replace(/^./, (letter) => letter.toLowerCase());
    }

    function getStoreClassName(store) {
        return String(store)
            .replace(/[^a-z0-9]/gi, '')
            .toLowerCase();
    }

    function getStoreValue(row, store, field) {
        const slug = getStoreSlug(store);
        const storeValues = row.prices && row.prices[store] ? row.prices[store] : {};
        return (
            storeValues[field] ||
            row[`${slug}${field === 'discountedPrice' ? 'DiscountedPrice' : 'Price'}`] ||
            ''
        );
    }

    function getVisibleRowCells(row, selectedStore, competitorStore) {
        return [
            row.barcode || '',
            row.name || '',
            getStoreValue(row, selectedStore, 'price'),
            getStoreValue(row, selectedStore, 'discountedPrice'),
            getStoreValue(row, competitorStore, 'price'),
            getStoreValue(row, competitorStore, 'discountedPrice'),
            row.priceDifferencePercent || row.priceDifference || '',
            row.category || ''
        ];
    }

    function renderSegmentedControl({ legend, name, stores, activeStore, passiveStore }) {
        return `
          <fieldset class="retail-selector-group">
            <legend>${escapeHtml(legend)}</legend>
            <div class="retail-segmented-control" role="group" aria-label="${escapeHtml(legend)}">
              ${stores
                  .map((store) => {
                      const isActive = store === activeStore;
                      const isPassive = store === passiveStore;
                      return `
                <button
                  class="retail-segment retail-segment--${escapeHtml(getStoreClassName(store))}${isActive ? ' is-active' : ''}${isPassive ? ' is-passive' : ''}"
                  type="button"
                  data-${name}-store="${escapeHtml(store)}"
                  aria-pressed="${isActive}"
                >
                  ${escapeHtml(store)}
                </button>`;
                  })
                  .join('')}
            </div>
          </fieldset>`;
    }

    function renderExportMenu() {
        return `
          <div class="retail-export" data-retail-export>
            <button
              class="retail-export-button"
              type="button"
              data-export-toggle
              aria-expanded="false"
              aria-haspopup="true"
            >
              Export <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
            </button>
            <div class="retail-export-menu" data-export-menu hidden>
              <button type="button" data-export-format="csv">CSV</button>
              <button type="button" data-export-format="excel">Excel</button>
            </div>
          </div>`;
    }

    function renderRetailComparisonTable(demo) {
        const output = demo.sampleOutput || {};
        const { selectedStore, competitorStore, stores } = ensureRetailSelections();
        const rows = hydrateComparisonRows(output);

        return `
      <article class="demo-glass-card demo-preview-card" aria-label="${escapeHtml(demo.title)} gerçek zamanlı veri ön izlemesi">
        <div class="retail-output-heading output-heading">
          <div>
            <h3>${escapeHtml(demo.title)}</h3>
            <p class="output-note output-note--live">Veriler gerçek zamanlıdır.</p>
          </div>
          ${renderExportMenu()}
        </div>
        <div class="retail-selectors" aria-label="Mağaza karşılaştırma seçimleri">
          ${renderSegmentedControl({
              legend: 'Mağazanızı Seçiniz',
              name: 'selected',
              stores,
              activeStore: selectedStore,
              passiveStore: ''
          })}
          ${renderSegmentedControl({
              legend: 'Rakip Seçiniz',
              name: 'competitor',
              stores,
              activeStore: competitorStore,
              passiveStore: selectedStore
          })}
        </div>
        <div class="retail-table-scroll" tabindex="0" aria-label="Web Scraping fiyat karşılaştırma tablosu">
          <table class="retail-comparison-table">
            <thead>${renderRetailTableHeader(selectedStore, competitorStore)}
            </thead>
            <tbody>
              ${rows
                  .map(
                      (row) => `
                <tr>
                  ${getVisibleRowCells(row, selectedStore, competitorStore)
                      .map((cell) => `<td>${escapeHtml(cell)}</td>`)
                      .join('')}
                </tr>`
                  )
                  .join('')}
            </tbody>
          </table>
        </div>
      </article>`;
    }

    function getExportPayload() {
        const output = getRetailOutput();
        const { selectedStore, competitorStore } = ensureRetailSelections();
        const columns = getRetailColumns(selectedStore, competitorStore);
        const rows = hydrateComparisonRows(output).map((row) =>
            getVisibleRowCells(row, selectedStore, competitorStore)
        );

        return {
            columns,
            rows
        };
    }

    function downloadBlob(content, type, filename) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    function escapeCsvCell(value) {
        const normalized = String(value).replace(/"/g, '""');
        return `"${normalized}"`;
    }

    function exportCsv() {
        const { columns, rows } = getExportPayload();
        const csvRows = [columns, ...rows].map((row) => row.map(escapeCsvCell).join(','));
        downloadBlob(
            csvRows.join('\n'),
            'text/csv;charset=utf-8;',
            'teknoify-price-comparison.csv'
        );
    }

    function exportExcel() {
        const { columns, rows } = getExportPayload();
        const tableRows = [columns, ...rows]
            .map(
                (row, rowIndex) => `
          <tr>${row
              .map(
                  (cell) =>
                      `${rowIndex === 0 ? '<th>' : '<td>'}${escapeHtml(cell)}${rowIndex === 0 ? '</th>' : '</td>'}`
              )
              .join('')}</tr>`
            )
            .join('');
        const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><table>${tableRows}</table></body></html>`;
        downloadBlob(
            html,
            'application/vnd.ms-excel;charset=utf-8;',
            'teknoify-price-comparison.xls'
        );
    }

    function bindRetailPreviewEvents() {
        const preview = document.querySelector('[data-demo-preview]');
        if (!preview) {
            return;
        }

        preview.querySelectorAll('[data-selected-store]').forEach((button) => {
            button.addEventListener('click', () => {
                const selectedStore = button.dataset.selectedStore;
                const output = getRetailOutput();
                const stores = getStores(output);

                state.selectedStore = selectedStore;
                state.competitorStore = getFallbackCompetitor(stores, selectedStore);
                renderPreview();
            });
        });

        preview.querySelectorAll('[data-competitor-store]').forEach((button) => {
            button.addEventListener('click', () => {
                const competitorStore = button.dataset.competitorStore;

                if (competitorStore === state.selectedStore) {
                    state.selectedStore = state.competitorStore;
                    state.competitorStore = competitorStore;
                } else {
                    state.competitorStore = competitorStore;
                }

                renderPreview();
            });
        });

        const exportToggle = preview.querySelector('[data-export-toggle]');
        const exportMenu = preview.querySelector('[data-export-menu]');
        if (exportToggle && exportMenu) {
            exportToggle.addEventListener('click', () => {
                const isExpanded = exportToggle.getAttribute('aria-expanded') === 'true';
                exportToggle.setAttribute('aria-expanded', String(!isExpanded));
                exportMenu.hidden = isExpanded;
            });
        }

        preview.querySelectorAll('[data-export-format]').forEach((button) => {
            button.addEventListener('click', () => {
                if (button.dataset.exportFormat === 'csv') {
                    exportCsv();
                } else {
                    exportExcel();
                }

                if (exportToggle && exportMenu) {
                    exportToggle.setAttribute('aria-expanded', 'false');
                    exportMenu.hidden = true;
                }
            });
        });
    }

    function getModuleSlug(category) {
        return String(category)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }

    function getActivePanelConfig() {
        const isWebScraping = state.activeCategory === 'Web Scraping';

        if (isWebScraping) {
            return {
                eyebrow: 'Canlı Modül',
                title: 'Web Scraping Fiyat Karşılaştırma',
                description:
                    'Rakip fiyatlarını karşılaştırın, mağaza eşleşmelerini değiştirin ve canlı perakende scraping çıktılarını demo alanından inceleyin.',
                pills: ['Canlı Demo', 'Web Scraping', 'Perakende Verisi'],
                code: LIVE_LOG_MESSAGES,
                icon: 'fa-spider',
                status: 'AKTİF',
                isLive: true
            };
        }

        return {
            eyebrow: 'Yakında',
            title: `${getCategoryLabel(state.activeCategory)} demoları hazırlanıyor`,
            description:
                'Bu alan yaklaşan Teknoify demo modülleri, veri setleri, otomasyon akışları ve canlı ön izlemeler için hazırlanıyor.',
            pills: ['Yakında', getCategoryLabel(state.activeCategory), 'Yol Haritası'],
            code: [
                `demo.modul = "${getModuleSlug(state.activeCategory)}"`,
                'durum = "hazırlanıyor"',
                'kaynak = "teknoify-demo-yol-haritasi"'
            ],
            icon: 'fa-layer-group',
            status: 'Sırada',
            isLive: false
        };
    }

    function getVisibleLogLines(config) {
        if (!config.isLive) {
            return config.code;
        }

        return config.code.slice(0, state.liveLogVisibleCount);
    }

    function renderLogLine(line, index, totalCount) {
        const isSuccess = index === totalCount - 1 && line === 'Veri aktarımı başarılı.';

        return `<span class="demo-log-line${isSuccess ? ' demo-log-line--success' : ''}">${escapeHtml(line)}</span>`;
    }

    function renderCodePreview(config) {
        const visibleLines = getVisibleLogLines(config);
        const isRunning = config.isLive && state.liveLogVisibleCount < config.code.length;

        return `
          <div class="demo-code-preview${config.isLive ? ' demo-code-preview--live' : ''}" aria-label="Seçili demo durum ön izlemesi">
            <div class="demo-code-preview__header">
              <span>${config.isLive ? 'Canlı Log' : 'Modül Durumu'}</span>
              <strong class="${isRunning ? 'is-running' : ''}">${escapeHtml(config.status)}</strong>
            </div>
            <pre data-live-log-feed role="log" aria-live="polite" aria-relevant="additions"><code>${visibleLines
                .map((line, index) => renderLogLine(line, index, config.code.length))
                .join('')}</code></pre>
          </div>`;
    }

    function stopLiveLog() {
        if (state.liveLogTimer) {
            window.clearInterval(state.liveLogTimer);
            state.liveLogTimer = null;
        }
    }

    function scrollLiveLogToBottom(container) {
        if (!container) {
            return;
        }

        container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
        });
    }

    function appendNextLiveLogLine() {
        if (state.activeCategory !== 'Web Scraping') {
            stopLiveLog();
            return;
        }

        if (state.liveLogVisibleCount >= LIVE_LOG_MESSAGES.length) {
            stopLiveLog();
            return;
        }

        state.liveLogVisibleCount += 1;

        const feed = document.querySelector('[data-live-log-feed]');
        const code = feed ? feed.querySelector('code') : null;

        if (!feed || !code) {
            return;
        }

        const lineIndex = state.liveLogVisibleCount - 1;
        code.insertAdjacentHTML('beforeend', renderLogLine(LIVE_LOG_MESSAGES[lineIndex], lineIndex, LIVE_LOG_MESSAGES.length));
        scrollLiveLogToBottom(feed);

        if (state.liveLogVisibleCount >= LIVE_LOG_MESSAGES.length) {
            stopLiveLog();
            const status = document.querySelector('.demo-code-preview--live .demo-code-preview__header strong');
            if (status) {
                status.classList.remove('is-running');
            }
        }
    }

    function startLiveLog() {
        if (state.activeCategory !== 'Web Scraping') {
            stopLiveLog();
            return;
        }

        const feed = document.querySelector('[data-live-log-feed]');
        scrollLiveLogToBottom(feed);

        if (state.liveLogVisibleCount >= LIVE_LOG_MESSAGES.length || state.liveLogTimer) {
            return;
        }

        if (state.liveLogVisibleCount === 0) {
            appendNextLiveLogLine();
        }

        if (state.liveLogVisibleCount < LIVE_LOG_MESSAGES.length) {
            state.liveLogTimer = window.setInterval(appendNextLiveLogLine, LIVE_LOG_INTERVAL_MS);
        }
    }

    function renderWorkspaceIntro(config) {
        return `
          <div class="demo-workspace-intro">
            <div class="demo-control-copy">
              <span class="demo-kicker">${escapeHtml(config.eyebrow)}</span>
              <h3>${escapeHtml(config.title)}</h3>
              <p>${escapeHtml(config.description)}</p>
              <div class="demo-status-pills" aria-label="Demo meta bilgileri">
                ${config.pills.map((pill) => `<span class="demo-status-pill">${escapeHtml(pill)}</span>`).join('')}
              </div>
            </div>
            ${renderCodePreview(config)}
          </div>`;
    }

    function renderPlaceholderPanel(config) {
        return `
          <div class="demo-placeholder-panel" role="tabpanel" aria-label="${escapeHtml(state.activeCategory)} coming soon">
            <div class="demo-placeholder-icon"><i class="fa-solid ${escapeHtml(config.icon)}"></i></div>
            <span class="demo-kicker">${escapeHtml(config.eyebrow)}</span>
            <h3>${escapeHtml(config.title)}</h3>
            <p>${escapeHtml(config.description)}</p>
            <div class="demo-status-pills" aria-label="Demo meta bilgileri">
              ${config.pills.map((pill) => `<span class="demo-status-pill">${escapeHtml(pill)}</span>`).join('')}
            </div>
            ${renderCodePreview(config)}
          </div>`;
    }

    function renderWorkspaceContent(config) {
        if (!config.isLive) {
            return renderPlaceholderPanel(config);
        }

        const demo = getRetailDemo();

        return `
          <div class="demo-workspace-live" role="tabpanel" aria-label="Web Scraping demo alanı">
            ${renderWorkspaceIntro(config)}
            <div class="demo-preview-area" data-demo-preview>
              ${demo ? renderRetailComparisonTable(demo) : ''}
            </div>
          </div>`;
    }

    function bindWorkspaceEvents(panel) {
        panel.querySelectorAll('[data-demo-panel-tab]').forEach((button) => {
            button.addEventListener('click', () => {
                state.activeCategory = button.dataset.demoPanelTab || 'Web Scraping';
                renderDemoControlPanel();
            });
        });

        bindRetailPreviewEvents();
    }

    function renderDemoControlPanel() {
        const panel = document.querySelector('[data-demo-control-panel]');
        if (!panel) {
            return;
        }

        const config = getActivePanelConfig();
        panel.innerHTML = `
          <article class="demo-control-panel demo-glass-card" aria-label="Teknoify demo alanı">
            <div class="demo-control-chrome">
              <div class="demo-window-dots" aria-hidden="true">
                <span class="demo-window-dot demo-window-dot--red"></span>
                <span class="demo-window-dot demo-window-dot--yellow"></span>
                <span class="demo-window-dot demo-window-dot--green"></span>
              </div>
              <div class="demo-control-tabs" role="tablist" aria-label="Demo alanı modülleri">
                ${DEMO_CATEGORIES.map(
                    (category) => `
                    <button
                      class="demo-control-tab${category.key === state.activeCategory ? ' is-active' : ''}"
                      type="button"
                      role="tab"
                      aria-selected="${category.key === state.activeCategory}"
                      data-demo-panel-tab="${escapeHtml(category.key)}"
                    >
                      ${escapeHtml(category.label)}
                    </button>`
                ).join('')}
              </div>
            </div>
            <div class="demo-control-body">
              ${renderWorkspaceContent(config)}
            </div>
          </article>`;

        bindWorkspaceEvents(panel);

        if (config.isLive) {
            startLiveLog();
        } else {
            stopLiveLog();
        }
    }

    function renderPreview() {
        renderDemoControlPanel();
    }

    function init(demos) {
        state.demos = Array.isArray(demos) ? demos : [];
        state.activeCategory = 'Web Scraping';
        renderDemoControlPanel();
        renderPreview();
    }

    window.TeknoifyDemoCatalog = {
        init,
        renderPreview
    };
})();
