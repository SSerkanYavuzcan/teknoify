(function () {
    const progressLabels = [
        'Demo seçildi',
        'Girdi doğrulandı',
        'Otomasyon çalıştı',
        'Çıktı üretildi'
    ];

    const state = {
        demos: [],
        selectedDemo: null,
        running: false,
        timer: null
    };

    const selectors = {
        list: '[data-sandbox-list]',
        title: '[data-sandbox-title]',
        category: '[data-sandbox-category]',
        status: '[data-sandbox-status]',
        metric: '[data-sandbox-metric]',
        output: '[data-sandbox-output]',
        progress: '[data-sandbox-progress]',
        run: '[data-run-demo]'
    };

    function getElement(selector) {
        return document.querySelector(selector);
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function hasDemos() {
        return state.demos.length > 0;
    }

    function setText(selector, value) {
        const element = getElement(selector);
        if (element) {
            element.textContent = value;
        }
    }

    function renderProgress(activeIndex) {
        const progress = getElement(selectors.progress);
        if (!progress) {
            return;
        }

        progress.innerHTML = progressLabels
            .map((label, index) => {
                const stateClass = index <= activeIndex ? 'is-complete' : '';
                const activeClass = index === activeIndex ? 'is-active' : '';
                return `<li class="progress-step ${stateClass} ${activeClass}"><span>${index + 1}</span>${label}</li>`;
            })
            .join('');
    }

    function renderRetailComparisonTable(demo) {
        const output = demo.sampleOutput || {};
        const columns = Array.isArray(output.columns) ? output.columns : [];
        const rows = Array.isArray(output.rows) ? output.rows : [];

        return `
      <div class="output-heading retail-output-heading">
        <div>
          <span class="demo-kicker">Statik Örnek Çıktı</span>
          <h4>${escapeHtml(demo.title)}</h4>
        </div>
        <strong>${escapeHtml(demo.primaryMetric || `${rows.length} satır`)}</strong>
      </div>
      <div class="retail-table-scroll" role="region" aria-label="Perakende fiyat karşılaştırma tablosu" tabindex="0">
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
      <p class="output-note">Bu tablo yalnızca demo sayfası için hazırlanmış statik örnek veridir; gerçek scraping, API veya fiyat sorgusu çalıştırılmaz.</p>`;
    }

    function renderDemoOutput(demo) {
        if (demo.outputType === 'retailComparisonTable') {
            return renderRetailComparisonTable(demo);
        }

        return `
      <div class="output-placeholder">
        <i class="fa-solid ${escapeHtml(demo.icon || 'fa-cube')}"></i>
        <strong>${escapeHtml(demo.title)} hazır</strong>
        <p>Bu demo için örnek çıktı yakında yayınlanacak.</p>
      </div>`;
    }

    function renderSandboxEmptyState() {
        setText(selectors.title, 'Demo seçin');
        setText(selectors.category, 'Sandbox');
        setText(selectors.status, 'Ön izleme');
        setText(selectors.metric, 'Bekleme listesi');

        const list = getElement(selectors.list);
        if (list) {
            list.innerHTML = `
        <div class="sandbox-empty-note">
          <i class="fa-solid fa-layer-group"></i>
          <strong>Henüz seçilebilir demo yok</strong>
          <span>İlk demo akışları eklendiğinde burada görünecek.</span>
        </div>`;
        }

        const runButton = getElement(selectors.run);
        if (runButton) {
            runButton.disabled = true;
            runButton.textContent = 'Demo akışı bekleniyor';
        }

        renderProgress(-1);

        const output = getElement(selectors.output);
        if (output) {
            output.innerHTML = `
        <div class="output-placeholder output-placeholder--empty">
          <i class="fa-solid fa-terminal"></i>
          <strong>Demo seçin</strong>
          <p>Yayınlanan demo akışlarından birini seçtiğinizde statik örnek çıktı burada görünecek.</p>
        </div>`;
        }
    }

    function renderSelected(showOutput) {
        if (!state.selectedDemo) {
            renderSandboxEmptyState();
            return;
        }

        setText(selectors.title, state.selectedDemo.title);
        setText(selectors.category, state.selectedDemo.category);
        setText(selectors.status, state.selectedDemo.status || 'Hazır');
        setText(selectors.metric, state.selectedDemo.primaryMetric || 'Ön izleme');

        document.querySelectorAll('[data-sandbox-demo]').forEach((button) => {
            const isActive = button.dataset.sandboxDemo === state.selectedDemo.id;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
        });

        const runButton = getElement(selectors.run);
        if (runButton) {
            runButton.disabled = false;
            runButton.textContent = 'Demoyu Çalıştır';
        }

        renderProgress(showOutput ? 3 : 0);

        const output = getElement(selectors.output);
        if (output) {
            output.innerHTML = showOutput
                ? renderDemoOutput(state.selectedDemo)
                : `
        <div class="output-placeholder">
          <i class="fa-solid ${escapeHtml(state.selectedDemo.icon || 'fa-cube')}"></i>
          <strong>${escapeHtml(state.selectedDemo.title)} seçildi</strong>
          <p>“Demoyu Çalıştır” veya katalogdaki “Örnek Çıktı” düğmesi ile statik tablo çıktısını görüntüleyebilirsiniz.</p>
        </div>`;
        }
    }

    function selectDemo(id, options) {
        if (!hasDemos()) {
            renderSandboxEmptyState();
            return;
        }

        state.selectedDemo = state.demos.find((demo) => demo.id === id) || state.demos[0];
        renderSelected(Boolean(options && options.showOutput));
    }

    function renderList() {
        const list = getElement(selectors.list);
        if (!list) {
            return;
        }

        if (!hasDemos()) {
            renderSandboxEmptyState();
            return;
        }

        list.innerHTML = state.demos
            .map(
                (demo) => `
          <button class="sandbox-demo-button" type="button" data-sandbox-demo="${escapeHtml(demo.id)}" aria-pressed="false">
            <span><i class="fa-solid ${escapeHtml(demo.icon || 'fa-cube')}"></i>${escapeHtml(demo.title)}</span>
            <small>${escapeHtml(demo.category || 'Demo')} · ${escapeHtml(demo.time || 'Ön izleme')}</small>
          </button>`
            )
            .join('');

        list.querySelectorAll('[data-sandbox-demo]').forEach((button) => {
            button.addEventListener('click', () => selectDemo(button.dataset.sandboxDemo));
        });
    }

    function simulateRun() {
        if (!state.selectedDemo || state.running) {
            renderSandboxEmptyState();
            return;
        }

        state.running = true;
        const runButton = getElement(selectors.run);
        if (runButton) {
            runButton.disabled = true;
            runButton.textContent = 'Demo hazırlanıyor...';
        }

        let activeStep = 0;
        renderProgress(activeStep);
        state.timer = setInterval(() => {
            activeStep += 1;
            renderProgress(activeStep);
            if (activeStep >= 3) {
                clearInterval(state.timer);
                state.running = false;
                if (runButton) {
                    runButton.disabled = false;
                    runButton.textContent = 'Demoyu Çalıştır';
                }
                renderSelected(true);
            }
        }, 350);
    }

    function bindRunButton() {
        const runButton = getElement(selectors.run);
        if (runButton) {
            runButton.addEventListener('click', simulateRun);
        }
    }

    function init(demos) {
        state.demos = Array.isArray(demos) ? demos : [];
        state.selectedDemo = state.demos[0] || null;
        renderList();
        bindRunButton();
        renderSelected(false);
    }

    window.TeknoifySandboxSimulator = {
        init,
        selectDemo
    };
})();
