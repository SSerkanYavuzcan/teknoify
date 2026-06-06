(function () {
    const state = {
        demos: []
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

    function renderEmptyState() {
        return `
      <article class="empty-state demo-empty-state">
        <span class="empty-state__icon"><i class="fa-solid fa-wand-magic-sparkles"></i></span>
        <span class="demo-kicker">Yakında</span>
        <h3>Demo akışları hazırlanıyor</h3>
        <p>Teknoify Demo Lab yakında ücretsiz otomasyon ön izlemeleriyle açılacak. İlk demo akışları hazır olduğunda bu alanda listelenecek.</p>
        <a class="btn btn-primary" href="mailto:info@teknoify.com?subject=Teknoify%20Demo%20Request">
          <i class="fa-solid fa-paper-plane"></i> Demo Talep Et
        </a>
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

        filterBar.innerHTML = '';
        filterBar.hidden = !hasDemos();
    }

    function renderCards() {
        const grid = document.querySelector('[data-demo-grid]');
        if (!grid) {
            return;
        }

        if (!hasDemos()) {
            grid.innerHTML = renderEmptyState();
            return;
        }

        grid.innerHTML = state.demos
            .map(
                (demo) => `
          <article class="demo-card" data-demo-card="${escapeHtml(demo.id)}">
            <div class="demo-card-topline">
              <span class="demo-icon"><i class="fa-solid ${escapeHtml(demo.icon)}"></i></span>
              <span class="demo-category">${escapeHtml(demo.category)}</span>
            </div>
            <h3>${escapeHtml(demo.title)}</h3>
            <p>${escapeHtml(demo.description)}</p>
            <div class="demo-actions">
              <button class="btn btn-primary btn-sm" type="button" data-open-demo="${escapeHtml(demo.id)}">Demoyu Aç</button>
            </div>
          </article>`
            )
            .join('');

        grid.querySelectorAll('[data-open-demo]').forEach((button) => {
            button.addEventListener('click', () => selectDemo(button.dataset.openDemo, false));
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
