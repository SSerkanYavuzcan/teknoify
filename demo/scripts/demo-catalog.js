(function () {
    const DEMO_CATEGORIES = [
        'All Demos',
        'Web Scraping',
        'Automation',
        'AI Tools',
        'Analytics',
        'Integrations'
    ];

    const state = {
        demos: [],
        activeCategory: 'Web Scraping',
        selectedStore: '',
        competitorStore: ''
    };

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

    function getActivePanelConfig() {
        const isWebScraping = state.activeCategory === 'Web Scraping';
        const isAllDemos = state.activeCategory === 'All Demos';

        if (isWebScraping || isAllDemos) {
            return {
                eyebrow: isAllDemos ? 'Demo Control Center' : 'Live Module',
                title: 'Manage and explore Teknoify demos from one place.',
                description:
                    'Switch between demo modules from this developer-console style workspace and preview the Teknoify automation stack as each module goes live.',
                moduleTitle: 'Web Scraping Fiyat Karşılaştırma',
                moduleDescription:
                    'Compare competitor prices and preview live retail scraping outputs.',
                pills: ['Live Demo', 'Web Scraping', 'Retail Data'],
                code: [
                    'demo.module = "web-scraping"',
                    'status = "live"',
                    'source = "retail-price-comparison"'
                ],
                icon: 'fa-spider',
                isLive: true
            };
        }

        return {
            eyebrow: 'Module Queue',
            title: 'Manage and explore Teknoify demos from one place.',
            description:
                'Switch between demo modules from this developer-console style workspace and preview the Teknoify automation stack as each module goes live.',
            moduleTitle: `${state.activeCategory} demo module is being prepared`,
            moduleDescription:
                'This demo category is queued for launch. The control panel is already structured for future modules, datasets, and live previews.',
            pills: ['Coming Soon', state.activeCategory, 'Roadmap'],
            code: [
                `demo.module = "${state.activeCategory
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, '')}"`,
                'status = "preparing"',
                'source = "teknoify-demo-roadmap"'
            ],
            icon: 'fa-layer-group',
            isLive: false
        };
    }

    function renderDemoControlPanel() {
        const panel = document.querySelector('[data-demo-control-panel]');
        if (!panel) {
            return;
        }

        const config = getActivePanelConfig();
        panel.innerHTML = `
          <article class="demo-control-panel demo-glass-card" aria-label="Teknoify demo control panel">
            <div class="demo-control-chrome">
              <div class="demo-window-dots" aria-hidden="true">
                <span class="demo-window-dot demo-window-dot--red"></span>
                <span class="demo-window-dot demo-window-dot--yellow"></span>
                <span class="demo-window-dot demo-window-dot--green"></span>
              </div>
              <div class="demo-control-tabs" role="tablist" aria-label="Demo categories">
                ${DEMO_CATEGORIES.map(
                    (category) => `
                    <button
                      class="demo-control-tab${category === state.activeCategory ? ' is-active' : ''}"
                      type="button"
                      role="tab"
                      aria-selected="${category === state.activeCategory}"
                      data-demo-panel-tab="${escapeHtml(category)}"
                    >
                      ${escapeHtml(category)}
                    </button>`
                ).join('')}
              </div>
            </div>
            <div class="demo-control-body">
              <div class="demo-control-copy">
                <span class="demo-kicker">${escapeHtml(config.eyebrow)}</span>
                <h2>${escapeHtml(config.title)}</h2>
                <p>${escapeHtml(config.description)}</p>
                <div class="demo-module-card">
                  <span class="demo-module-icon"><i class="fa-solid ${escapeHtml(config.icon)}"></i></span>
                  <div>
                    <h3>${escapeHtml(config.moduleTitle)}</h3>
                    <p>${escapeHtml(config.moduleDescription)}</p>
                    <div class="demo-status-pills" aria-label="Demo metadata">
                      ${config.pills
                          .map(
                              (pill) => `<span class="demo-status-pill">${escapeHtml(pill)}</span>`
                          )
                          .join('')}
                    </div>
                  </div>
                </div>
              </div>
              <div class="demo-code-preview" aria-label="Selected demo configuration preview">
                <div class="demo-code-preview__header">
                  <span>${config.isLive ? 'live.config' : 'module.config'}</span>
                  <strong>${config.isLive ? 'online' : 'queued'}</strong>
                </div>
                <pre><code>${config.code.map(escapeHtml).join('\n')}</code></pre>
              </div>
            </div>
          </article>`;

        panel.querySelectorAll('[data-demo-panel-tab]').forEach((button) => {
            button.addEventListener('click', () => {
                state.activeCategory = button.dataset.demoPanelTab || 'Web Scraping';
                renderDemoControlPanel();
            });
        });
    }

    function renderPreview() {
        const preview = document.querySelector('[data-demo-preview]');
        if (!preview) {
            return;
        }

        const demo = getRetailDemo();

        preview.hidden = !demo;
        preview.innerHTML = demo ? renderRetailComparisonTable(demo) : '';
        bindRetailPreviewEvents();
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
