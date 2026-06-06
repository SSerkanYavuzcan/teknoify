(function () {
    const categories = [
        'Tümü',
        'Web Scraping',
        'AI',
        'API',
        'Finans',
        'Operasyon',
        'Google Sheets'
    ];

    const state = {
        demos: [],
        activeCategory: 'Tümü'
    };

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function scrollToSandbox() {
        const sandbox = document.querySelector('#sandbox');
        if (sandbox) {
            sandbox.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    function selectDemo(id, showOutput) {
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

        filterBar.innerHTML = categories
            .map(
                (category) => `
          <button class="category-filter ${category === state.activeCategory ? 'is-active' : ''}" type="button" data-category="${escapeHtml(category)}" aria-pressed="${category === state.activeCategory}">
            ${escapeHtml(category)}
          </button>`
            )
            .join('');

        filterBar.querySelectorAll('[data-category]').forEach((button) => {
            button.addEventListener('click', () => {
                state.activeCategory = button.dataset.category;
                renderFilters();
                renderCards();
            });
        });
    }

    function getFilteredDemos() {
        if (state.activeCategory === 'Tümü') {
            return state.demos;
        }

        return state.demos.filter((demo) => demo.category === state.activeCategory);
    }

    function renderCards() {
        const grid = document.querySelector('[data-demo-grid]');
        if (!grid) {
            return;
        }

        const filteredDemos = getFilteredDemos();
        grid.innerHTML = filteredDemos
            .map(
                (demo) => `
          <article class="demo-card" data-demo-card="${escapeHtml(demo.id)}">
            <div class="demo-card-topline">
              <span class="demo-icon"><i class="fa-solid ${escapeHtml(demo.icon)}"></i></span>
              <span class="demo-category">${escapeHtml(demo.category)}</span>
            </div>
            <h3>${escapeHtml(demo.title)}</h3>
            <p>${escapeHtml(demo.description)}</p>
            <div class="demo-meta-row">
              <span class="demo-badge">${escapeHtml(demo.level)}</span>
              <span class="demo-badge">${escapeHtml(demo.time)}</span>
              <span class="demo-badge status">${escapeHtml(demo.status)}</span>
            </div>
            <div class="demo-actions">
              <button class="btn btn-primary btn-small" type="button" data-open-demo="${escapeHtml(demo.id)}">Demoyu Aç</button>
              <button class="btn btn-ghost btn-small" type="button" data-output-demo="${escapeHtml(demo.id)}">Örnek Çıktı</button>
            </div>
          </article>`
            )
            .join('');

        grid.querySelectorAll('[data-open-demo]').forEach((button) => {
            button.addEventListener('click', () => selectDemo(button.dataset.openDemo, false));
        });

        grid.querySelectorAll('[data-output-demo]').forEach((button) => {
            button.addEventListener('click', () => selectDemo(button.dataset.outputDemo, true));
        });
    }

    function init(demos) {
        state.demos = Array.isArray(demos) ? demos : [];
        renderFilters();
        renderCards();
    }

    window.TeknoifyDemoCatalog = {
        init,
        renderCards
    };
})();
