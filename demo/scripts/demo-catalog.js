(function () {
    const state = {
        demos: [],
        activeCategory: 'Tümü'
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

    function renderRetailComparisonTable(demo) {
        const output = demo.sampleOutput || {};
        const columns = Array.isArray(output.columns) ? output.columns : [];
        const rows = Array.isArray(output.rows) ? output.rows : [];

        if (columns.length === 0 || rows.length === 0) {
            return `
        <article class="demo-glass-card demo-preview-card">
          <span class="demo-kicker">Statik Ön İzleme</span>
          <h3>${escapeHtml(demo.title)}</h3>
          <p class="output-note">Bu demo için ön izleme verisi hazırlanıyor.</p>
        </article>`;
        }

        return `
      <article class="demo-glass-card demo-preview-card" aria-label="${escapeHtml(demo.title)} tablo ön izlemesi">
        <div class="retail-output-heading output-heading">
          <div>
            <span class="demo-kicker">Statik Ön İzleme</span>
            <h3>${escapeHtml(demo.title)}</h3>
          </div>
          <strong>${escapeHtml(demo.primaryMetric || `${rows.length} kayıt`)}</strong>
        </div>
        <div class="retail-table-scroll" tabindex="0" aria-label="Web Scraping fiyat karşılaştırma tablosu">
          <table class="retail-comparison-table">
            <thead>
              <tr>
                ${columns.map((column) => `<th scope="col">${escapeHtml(column)}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${rows
                  .map(
                      (row) => `
                <tr>
                  <td>${escapeHtml(row.barcode)}</td>
                  <td>${escapeHtml(row.name)}</td>
                  <td>${escapeHtml(row.carrefourPrice)}</td>
                  <td>${escapeHtml(row.migrosPrice)}</td>
                  <td>${escapeHtml(row.category)}</td>
                </tr>`
                  )
                  .join('')}
            </tbody>
          </table>
        </div>
        <p class="output-note">Bu tablo gerçek zamanlı işlem yapmadan, demo verisinden oluşturulan statik bir fiyat karşılaştırma ön izlemesidir.</p>
      </article>`;
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
            <dl class="demo-card-meta" aria-label="Demo detayları">
              <div>
                <dt>Seviye</dt>
                <dd>${escapeHtml(demo.level || 'Başlangıç')}</dd>
              </div>
              <div>
                <dt>Süre</dt>
                <dd>${escapeHtml(demo.time || 'Ön izleme')}</dd>
              </div>
              <div>
                <dt>Durum</dt>
                <dd>${escapeHtml(demo.status || 'Hazır')}</dd>
              </div>
            </dl>
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
