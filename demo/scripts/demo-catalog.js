(function () {
    const state = {
        demos: [],
        activeCategory: 'Tümü',
        selectedStore: '',
        competitorStore: ''
    };

    function hasDemos() {
        return state.demos.length > 0;
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function getFilteredDemos() {
        if (state.activeCategory === 'Tümü') {
            return state.demos;
        }

        return state.demos.filter((demo) => demo.category === state.activeCategory);
    }

    function renderEmptyState(isFiltered) {
        const title = isFiltered ? 'Bu kategoride demo bulunamadı' : 'Demo akışları hazırlanıyor';
        const description = isFiltered
            ? 'Farklı bir kategori seçerek yayınlanan demo akışlarını görüntüleyebilirsiniz.'
            : 'Teknoify Demo Lab yakında ücretsiz otomasyon ön izlemeleriyle açılacak. İlk demo akışları hazır olduğunda bu alanda listelenecek.';

        return `
      <article class="empty-state demo-empty-state">
        <span class="empty-state__icon"><i class="fa-solid fa-wand-magic-sparkles"></i></span>
        <span class="demo-kicker">${isFiltered ? 'Filtre' : 'Yakında'}</span>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(description)}</p>
      </article>`;
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
            `${selectedStore} Fiyatı`,
            `${selectedStore} İndirimli Fiyat`,
            `${competitorStore} Fiyatı`,
            `${competitorStore} İndirimli Fiyat`,
            'Fiyat Farkı %',
            'Ürün Kategorisi'
        ];
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
                  class="retail-segment${isActive ? ' is-active' : ''}${isPassive ? ' is-passive' : ''}"
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
        const columns = getRetailColumns(selectedStore, competitorStore);

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
            <thead>
              <tr>
                ${columns.map((column) => `<th scope="col">${escapeHtml(column)}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${
                  rows.length > 0
                      ? rows
                            .map(
                                (row) => `
                <tr>
                  ${getVisibleRowCells(row, selectedStore, competitorStore)
                      .map((cell) => `<td>${escapeHtml(cell)}</td>`)
                      .join('')}
                </tr>`
                            )
                            .join('')
                      : `
                <tr>
                  <td class="retail-empty-cell" colspan="${columns.length}">
                    Veriler Google Sheets bağlantısı kurulduktan sonra burada listelenecektir.
                  </td>
                </tr>`
              }
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

    function renderPreview() {
        const preview = document.querySelector('[data-demo-preview]');
        if (!preview) {
            return;
        }

        const demos = getFilteredDemos();
        const demo = demos.find((item) => item.outputType === 'retailComparisonTable');

        preview.hidden = !demo;
        preview.innerHTML = demo ? renderRetailComparisonTable(demo) : '';
        bindRetailPreviewEvents();
    }

    function renderFilters() {
        const filterBar = document.querySelector('[data-category-filters]');
        if (!filterBar) {
            return;
        }

        filterBar.hidden = !hasDemos();
        if (!hasDemos()) {
            filterBar.innerHTML = '';
            return;
        }

        const categories = [
            'Tümü',
            ...new Set(state.demos.map((demo) => demo.category).filter(Boolean))
        ];
        filterBar.innerHTML = categories
            .map(
                (category) => `
          <button
            class="category-filter${category === state.activeCategory ? ' is-active' : ''}"
            type="button"
            data-category-filter="${escapeHtml(category)}"
            aria-pressed="${category === state.activeCategory}"
          >
            ${escapeHtml(category)}
          </button>`
            )
            .join('');

        filterBar.querySelectorAll('[data-category-filter]').forEach((button) => {
            button.addEventListener('click', () => {
                state.activeCategory = button.dataset.categoryFilter || 'Tümü';
                renderFilters();
                renderCards();
                renderPreview();
            });
        });
    }

    function renderCards() {
        const grid = document.querySelector('[data-demo-grid]');
        if (!grid) {
            return;
        }

        if (!hasDemos()) {
            grid.innerHTML = renderEmptyState(false);
            return;
        }

        const demos = getFilteredDemos();
        if (demos.length === 0) {
            grid.innerHTML = renderEmptyState(true);
            return;
        }

        grid.innerHTML = demos
            .map(
                (demo) => `
          <article class="demo-card demo-glass-card" data-demo-card="${escapeHtml(demo.id)}">
            <div class="demo-card-topline">
              <span class="demo-icon"><i class="fa-solid ${escapeHtml(demo.icon || 'fa-cube')}"></i></span>
              <span class="demo-category">${escapeHtml(demo.category || 'Demo')}</span>
            </div>
            <h3>${escapeHtml(demo.title)}</h3>
            <p>${escapeHtml(demo.description)}</p>
          </article>`
            )
            .join('');
    }

    function init(demos) {
        state.demos = Array.isArray(demos) ? demos : [];
        state.activeCategory = 'Tümü';
        renderFilters();
        renderCards();
        renderPreview();
    }

    window.TeknoifyDemoCatalog = {
        init,
        renderCards,
        renderPreview
    };
})();
