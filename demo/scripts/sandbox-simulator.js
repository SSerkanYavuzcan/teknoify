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

    function renderProgress(activeIndex) {
        const progress = getElement(selectors.progress);
        if (!progress) {
            return;
        }

        progress.innerHTML = progressLabels
            .map((label, index) => {
                const stateClass = index <= activeIndex ? 'is-complete' : '';
                const runningClass = index === activeIndex ? 'is-active' : '';
                return `<li class="progress-step ${stateClass} ${runningClass}"><span>${index + 1}</span>${label}</li>`;
            })
            .join('');
    }

    function tableOutput() {
        return `
      <div class="output-table-wrap">
        <table class="output-table">
          <thead><tr><th>Ürün</th><th>Eski Fiyat</th><th>Yeni Fiyat</th><th>Değişim</th></tr></thead>
          <tbody>
            <tr><td>Akıllı Saat X</td><td>₺3.249</td><td>₺3.099</td><td class="positive">-₺150</td></tr>
            <tr><td>Kablosuz Kulaklık</td><td>₺1.899</td><td>₺2.049</td><td class="negative">+₺150</td></tr>
            <tr><td>USB-C Dock</td><td>₺2.420</td><td>₺2.299</td><td class="positive">-₺121</td></tr>
          </tbody>
        </table>
      </div>`;
    }

    function scorecardsOutput() {
        const cards = [
            ['SEO Score', '84', 'Başlık ve meta açıklama güçlü'],
            ['Performance', '78', 'Görsel sıkıştırma önerilir'],
            ['Accessibility', '91', 'Kontrast ve etiketler iyi'],
            ['Best Practices', '88', 'HTTPS ve güvenlik başlıkları aktif']
        ];
        return `<div class="output-score-grid">${cards
            .map(
                ([label, score, note]) =>
                    `<article class="output-score-card"><strong>${score}</strong><span>${label}</span><p>${note}</p></article>`
            )
            .join('')}</div>`;
    }

    function chatOutput() {
        return `
      <div class="chat-output">
        <div class="chat-bubble user"><span>Kullanıcı sorusu</span>“Siparişim gecikti, ne zaman gelir?”</div>
        <div class="chat-bubble ai"><span>AI sınıflandırması</span>Kategori: Kargo gecikmesi · Öncelik: Orta</div>
        <div class="chat-bubble ai"><span>Önerilen yanıt</span>Merhaba, siparişinizi kontrol ettik. Kargo hareketi gecikmiş görünüyor; takip bağlantısını ve yeni teslim tahminini paylaşıyoruz.</div>
      </div>`;
    }

    function beforeAfterOutput() {
        return `
      <div class="before-after-grid">
        <div><h4>Önce</h4><table class="mini-table"><tr><td>urun_ad</td><td> fiyat </td><td>kategori?</td></tr><tr><td>Mouse Pro</td><td>1299</td><td></td></tr></table></div>
        <div><h4>Sonra</h4><table class="mini-table"><tr><td>Ürün Adı</td><td>Fiyat</td><td>Kategori</td></tr><tr><td>Mouse Pro</td><td>₺1.299</td><td>Aksesuar</td></tr></table></div>
      </div>`;
    }

    function checklistOutput() {
        const issues = ['Eksik fiyat', 'Stok uyarısı', 'Kategori uyumsuzluğu'];
        return `<div class="issue-grid">${issues
            .map(
                (issue, index) =>
                    `<article class="issue-card"><i class="fa-solid fa-triangle-exclamation"></i><strong>${issue}</strong><span>${index + 2} kayıt etkilendi</span></article>`
            )
            .join('')}</div>`;
    }

    function signalsOutput() {
        const signals = [
            ['Trend', 'Pozitif', 'Gelir büyümesi istikrarlı'],
            ['Risk', 'Orta', 'Volatilite izlenmeli'],
            ['Momentum', 'Güçlü', 'Son 30 gün hacim artışı'],
            ['İzleme', 'Aktif', 'Eşik alarmı kuruldu']
        ];
        return `<div class="signal-grid">${signals
            .map(
                ([label, value, note]) =>
                    `<article class="signal-card"><span>${label}</span><strong>${value}</strong><p>${note}</p></article>`
            )
            .join('')}</div>`;
    }

    function timelineOutput() {
        const steps = ['DNS', 'TLS', 'Response', 'Status Code', 'Latency'];
        return `<ol class="timeline-output">${steps
            .map(
                (step, index) =>
                    `<li><span>${step}</span><strong>${index === 3 ? '200 OK' : index === 4 ? '128 ms' : 'Passed'}</strong></li>`
            )
            .join('')}</ol>`;
    }

    function notificationOutput() {
        return `
      <div class="slack-preview">
        <div class="slack-header"><span># operasyon-alerts</span><em>Teknoify Bot</em></div>
        <strong>⚡ Eşik aşıldı: Sepet terk oranı %18</strong>
        <p>Son 30 dakikada normal seviyenin üzerinde artış algılandı. Kontrol panelinde kampanya ve ödeme adımlarını inceleyin.</p>
      </div>`;
    }

    function summaryOutput() {
        const summaries = [
            ['Özet', 'Satış verisinde hafta sonu yükselişi ve iade oranında düşüş var.'],
            [
                'Risk',
                'Stok azalan ürünlerde teslimat gecikmesi müşteri memnuniyetini etkileyebilir.'
            ],
            ['Aksiyon', 'En çok talep gören 5 ürün için otomatik stok uyarısı kurun.']
        ];
        return `<div class="summary-grid">${summaries
            .map(
                ([label, text]) =>
                    `<article class="summary-card"><span>${label}</span><p>${text}</p></article>`
            )
            .join('')}</div>`;
    }

    function renderOutput(demo) {
        const output = getElement(selectors.output);
        if (!output || !demo) {
            return;
        }

        const renderers = {
            table: tableOutput,
            scorecards: scorecardsOutput,
            chat: chatOutput,
            beforeAfter: beforeAfterOutput,
            checklist: checklistOutput,
            signals: signalsOutput,
            timeline: timelineOutput,
            notification: notificationOutput,
            summary: summaryOutput
        };

        const renderer = renderers[demo.outputType] || summaryOutput;
        output.innerHTML = `<div class="output-heading"><span>${escapeHtml(demo.outputType)}</span><strong>Simüle Örnek Çıktı</strong></div>${renderer()}`;
    }

    function renderPlaceholder() {
        const output = getElement(selectors.output);
        if (!output || !state.selectedDemo) {
            return;
        }

        output.innerHTML = `
      <div class="output-placeholder">
        <i class="fa-solid ${escapeHtml(state.selectedDemo.icon)}"></i>
        <strong>${escapeHtml(state.selectedDemo.title)} hazır</strong>
        <p>Simülasyonu başlatmak için “Demoyu Çalıştır” butonuna basın veya katalogdan “Örnek Çıktı” seçin.</p>
      </div>`;
    }

    function renderSelected(showOutput) {
        if (!state.selectedDemo) {
            return;
        }

        const title = getElement(selectors.title);
        const category = getElement(selectors.category);
        const status = getElement(selectors.status);
        const metric = getElement(selectors.metric);

        if (title) title.textContent = state.selectedDemo.title;
        if (category) category.textContent = state.selectedDemo.category;
        if (status) status.textContent = state.selectedDemo.status;
        if (metric) metric.textContent = state.selectedDemo.primaryMetric;

        document.querySelectorAll('[data-sandbox-demo]').forEach((button) => {
            const isActive = button.dataset.sandboxDemo === state.selectedDemo.id;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
        });

        renderProgress(showOutput ? 3 : 0);

        if (showOutput) {
            renderOutput(state.selectedDemo);
        } else {
            renderPlaceholder();
        }
    }

    function selectDemo(id, options) {
        const selected = state.demos.find((demo) => demo.id === id) || state.demos[0];
        if (!selected) {
            return;
        }

        state.selectedDemo = selected;
        renderSelected(Boolean(options && options.showOutput));
    }

    function renderList() {
        const list = getElement(selectors.list);
        if (!list) {
            return;
        }

        list.innerHTML = state.demos
            .map(
                (demo) => `
          <button class="sandbox-demo-button" type="button" data-sandbox-demo="${escapeHtml(demo.id)}" aria-pressed="false">
            <span><i class="fa-solid ${escapeHtml(demo.icon)}"></i>${escapeHtml(demo.title)}</span>
            <small>${escapeHtml(demo.category)} · ${escapeHtml(demo.time)}</small>
          </button>`
            )
            .join('');

        list.querySelectorAll('[data-sandbox-demo]').forEach((button) => {
            button.addEventListener('click', () => selectDemo(button.dataset.sandboxDemo));
        });
    }

    function simulateRun() {
        const runButton = getElement(selectors.run);
        if (!state.selectedDemo || state.running) {
            return;
        }

        state.running = true;
        if (runButton) {
            runButton.disabled = true;
            runButton.textContent = 'Çalışıyor...';
        }

        let step = 0;
        renderProgress(step);
        clearInterval(state.timer);
        state.timer = setInterval(() => {
            step += 1;
            renderProgress(step);
            if (step >= progressLabels.length - 1) {
                clearInterval(state.timer);
                renderOutput(state.selectedDemo);
                state.running = false;
                if (runButton) {
                    runButton.disabled = false;
                    runButton.textContent = 'Demoyu Çalıştır';
                }
            }
        }, 520);
    }

    function init(demos) {
        state.demos = Array.isArray(demos) ? demos : [];
        renderList();
        selectDemo(state.demos[0] && state.demos[0].id);

        const runButton = getElement(selectors.run);
        if (runButton) {
            runButton.addEventListener('click', simulateRun);
        }
    }

    window.TeknoifySandboxSimulator = {
        init,
        selectDemo,
        renderOutput
    };
})();
