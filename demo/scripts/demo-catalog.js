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

    function scrollToSandbox() {
        const sandbox = document.querySelector('#sandbox');
        if (sandbox) {
            sandbox.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    function selectDemo(id, showOutput) {
        if (!hasDemos()) {
            return;
        }

        if (window.TeknoifySandboxSimulator) {
            window.TeknoifySandboxSimulator.selectDemo(id, { showOutput });
        }
        scrollToSandbox();
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
            <div class="demo-actions">
              <button class="btn btn-primary btn-sm" type="button" data-open-demo="${escapeHtml(demo.id)}">Demoyu Aç</button>
              <button class="btn btn-secondary btn-sm" type="button" data-preview-demo="${escapeHtml(demo.id)}">Örnek Çıktı</button>
            </div>
          </article>`
            )
            .join('');

        grid.querySelectorAll('[data-open-demo]').forEach((button) => {
            button.addEventListener('click', () => selectDemo(button.dataset.openDemo, false));
        });

        grid.querySelectorAll('[data-preview-demo]').forEach((button) => {
            button.addEventListener('click', () => selectDemo(button.dataset.previewDemo, true));
        });
    }

    function init(demos) {
        state.demos = Array.isArray(demos) ? demos : [];
        state.activeCategory = 'Tümü';
        renderFilters();
        renderCards();
    }

    window.TeknoifyDemoCatalog = {
        init,
        renderCards
    };
})();
