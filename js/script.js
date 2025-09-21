// ===========================================
// 0. GLOBAL INITIALIZATION
// ===========================================
document.addEventListener('DOMContentLoaded', () => {
    initHeader();
    initMobileMenu();
    initSmoothScrolling();
    initAnimations();
    initLightEffects();
  
    // CONTACT
    initCustomSelect();   // <- yeni: native <select> yerine koyu tema açılır liste
    initContactForm();    // <- güncel: yalnızca "Gönder"de doğrula
  });
  
  
  // ===========================================
  // 1. HEADER
  // ===========================================
  function initHeader() {
    const header = document.getElementById('header');
    if (!header) return;
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 100);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }
  
  // ===========================================
  // 2. MOBILE MENU
  // ===========================================
  function initMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu   = document.querySelector('.nav-menu');
    const navLinks  = document.querySelectorAll('.nav-link');
    if (!hamburger || !navMenu) return;
  
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      navMenu.classList.toggle('active');
      document.body.classList.toggle('menu-open');
    });
  
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
        document.body.classList.remove('menu-open');
      });
    });
  
    document.addEventListener('click', e => {
      if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
        document.body.classList.remove('menu-open');
      }
    });
  }
  
  // ===========================================
  // 3. SMOOTH SCROLLING (services ofsetli)
  // ===========================================
  function initSmoothScrolling() {
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
      link.addEventListener('click', function (e) {
        const hash = this.getAttribute('href');
        if (!hash || hash === '#') return;
        const targetElement = document.querySelector(hash);
        if (!targetElement) return;
        e.preventDefault();
  
        const headerEl = document.querySelector('.header');
        const headerHeight = headerEl ? headerEl.offsetHeight : 0;
  
        // Hizmetler için ekstra ofset (ilk 3 kart ekrana gelsin)
        let extra = 0;
        if (hash === '#services') extra = window.innerWidth >= 1024 ? 180 : 120;
  
        const top = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight - extra;
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      });
    });
  }
  
// ===========================================
// 4. LIGHT EFFECTS – Global yıldız overlay
// ===========================================
function initLightEffects() {
    const overlay = getOrCreateStarsOverlay();
    createLightParticles(overlay);      // tüm sayfaya, fixed overlay
    addScrollLightEffect(overlay);      // hafif parlaklık tepkisi
  
    // Ekran boyutu değişince yeniden oluştur (çok parçacık birikmesin)
    window.addEventListener('resize', throttle(() => {
      createLightParticles(overlay);
    }, 600));
  }
  
  // Overlay oluştur / getir
  function getOrCreateStarsOverlay() {
    let overlay = document.getElementById('stars-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'stars-overlay';
      overlay.setAttribute('aria-hidden', 'true');
      document.body.appendChild(overlay);
    }
    return overlay;
  }
  
  // Tüm sayfa için parçacıklar
  function createLightParticles(overlay) {
    // yeniden init edilirse birikmesin
    overlay.querySelectorAll('.light-particle').forEach(p => p.remove());
  
    // Ekran alanına göre sayıyı ölçekle
    const area = window.innerWidth * window.innerHeight;
    const COUNT = Math.max(36, Math.round(area / 28000)); // ~2k px² başına 1 parçacık
  
    for (let i = 0; i < COUNT; i++) {
      const particle = document.createElement('div');
      particle.className = 'light-particle';
  
      const size = (Math.random() * 2 + 2).toFixed(1);          // 2–4px
      const left = (Math.random() * 100).toFixed(2) + '%';       // 0–100%
      // Ekranın ALTINDAN başlat (105–140vh), yukarı doğru aksın
      const topStart = (105 + Math.random() * 35).toFixed(2) + 'vh';
  
      const duration = (18 + Math.random() * 18).toFixed(1);     // 18–36s
      // Negatif delay ile akışta dağınık başlat
      const delay    = (Math.random() * duration * -1).toFixed(1) + 's';
  
      particle.style.cssText = `
        position:absolute;
        width:${size}px;height:${size}px;
        left:${left}; top:${topStart};
        background: rgba(139,92,246, ${(0.25 + Math.random() * 0.35).toFixed(2)});
        border-radius:50%;
        pointer-events:none;
        will-change: transform, opacity;
        animation: float-particle ${duration}s linear infinite;
        animation-delay:${delay};
        filter: drop-shadow(0 0 6px rgba(139,92,246,0.35));
      `;
      overlay.appendChild(particle);
    }
  }
  
  // Parlaklığı scroll’a göre çok hafif değiştir
  function addScrollLightEffect(overlay) {
    if (!overlay) return;
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const p = h ? (window.pageYOffset / h) : 0;
      overlay.style.opacity = String(0.9 + p * 0.1); // 0.9 → 1.0
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }
  
// ===========================================
// 5. ANIMATIONS (AOS + Stat sayaçları)  [GÜNCELLENDİ]
// ===========================================
function initAnimations() {
  if (typeof AOS !== 'undefined') {
    AOS.init({ duration: 800, easing: 'ease-in-out', once: true, offset: 100 });
  }

  // Stat başlangıç değerleri
  const stats = document.querySelectorAll('.stat-number');
  stats.forEach(el => {
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    el.textContent = `${prefix}0${suffix}`;
  });

  if (stats.length) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateNumber(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.25 });
    stats.forEach(el => io.observe(el));
  }

  // --- Terminal kod döngüsünü başlat ---
  initAiTerminalLoop();
}

  
  function animateNumber(el) {
    // hem data-stat hem data-target destekle
    const target   = Number(el.dataset.stat ?? el.dataset.target ?? 0);
    const duration = Number(el.dataset.duration || 1500);
    const decimals = Number(el.dataset.decimals || 0);
    const prefix   = el.dataset.prefix || '';
    const suffix   = el.dataset.suffix || '';
  
    const start = 0;
    const t0 = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
  
    function frame(now) {
      const p = Math.min((now - t0) / duration, 1);
      const v = start + (target - start) * ease(p);
      el.textContent = prefix + (decimals ? v.toFixed(decimals) : Math.round(v)) + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  
  // ===========================================
  // 6. CONTACT FORM (hafif doğrulama + toast)
  // ===========================================
  function initContactForm() {
    const form = document.querySelector('.contact-form');
    if (!form) return;
  
    const $ = (sel) => form.querySelector(sel);
  
    const nameEl    = $('#name')    || form.querySelector('input[name="name"]');
    const emailEl   = $('#email')   || form.querySelector('input[type="email"]');
    const phoneEl   = $('#phone')   || form.querySelector('input[type="tel"]');
    const serviceEl = $('#service') || form.querySelector('select[name="service"]');
    const msgEl     = $('#message') || form.querySelector('textarea[name="message"]');
  
    // Telefon alanı isteğe bağlı placeholder
    if (phoneEl) {
      phoneEl.placeholder = 'Telefon Numaranız (isteğe bağlı)';
    }
  
    const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());
  
    const clearError = (el) => {
      if (!el) return;
      el.classList.remove('error');
  
      // service için hata, custom-select içine yazılıyor olabilir
      if (el.id === 'service' && el.nextElementSibling?.classList?.contains('custom-select')) {
        const cs = el.nextElementSibling;
        const hint = cs.querySelector('.field-error');
        if (hint) hint.remove();
      }
  
      const hint = el.parentElement.querySelector('.field-error');
      if (hint) hint.remove();
    };
  
    const setError = (el, msg) => {
      if (!el) return;
  
      // Önce temizle
      clearError(el);
      el.classList.add('error');
  
      // Service için hatayı custom-select içine koy
      if (el.id === 'service' && el.nextElementSibling?.classList?.contains('custom-select')) {
        const cs = el.nextElementSibling;               // .custom-select
        const hint = document.createElement('small');
        hint.className = 'field-error';
        hint.textContent = msg;
        cs.appendChild(hint);
        return;
      }
  
      const hint = document.createElement('small');
      hint.className = 'field-error';
      hint.textContent = msg;
      el.parentElement.appendChild(hint);
    };
  
    // Yazarken hata temizle (blur’da uyarı YOK)
    [nameEl, emailEl, phoneEl, msgEl].forEach(el => {
      if (!el) return;
      el.addEventListener('input', () => clearError(el));
    });
    if (serviceEl) {
      serviceEl.addEventListener('change', () => clearError(serviceEl));
    }
  
    form.addEventListener('submit', (e) => {
      e.preventDefault();
  
      let ok = true;
  
      if (nameEl && !String(nameEl.value).trim()) {
        setError(nameEl, 'Bu alan zorunludur');
        ok = false;
      }
  
      if (emailEl) {
        const v = String(emailEl.value).trim();
        if (!v) { setError(emailEl, 'Bu alan zorunludur'); ok = false; }
        else if (!isValidEmail(v)) { setError(emailEl, 'Geçerli bir e-posta girin'); ok = false; }
      }
  
      // Telefon ZORUNLU DEĞİL — hiçbir kontrol yok
  
      if (serviceEl && !String(serviceEl.value).trim()) {
        setError(serviceEl, 'Bir hizmet seçiniz');
        ok = false;
      }
  
      if (msgEl && !String(msgEl.value).trim()) {
        setError(msgEl, 'Bu alan zorunludur');
        ok = false;
      }
  
      if (!ok) return;
  
      // Gönderim simülasyonu
      const btn = form.querySelector('button[type="submit"]');
      const orig = btn ? btn.innerHTML : null;
      if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gönderiliyor...'; }
  
      setTimeout(() => {
        form.reset();
        // Custom select etiketini placeholder’a döndür
        const csLabel = document.querySelector('.custom-select .cs-label');
        if (csLabel) csLabel.textContent = 'Hizmet Seçiniz';
  
        if (btn && orig) { btn.disabled = false; btn.innerHTML = orig; }
        showNotification('Mesajınız başarıyla gönderildi!', 'success');
      }, 900);
    });
  }
  
// ===========================================
// 8. CUSTOM SELECT — devre dışı, native'i görünür bırak
// ===========================================
function initCustomSelect() {
  const native = document.querySelector('#service');
  if (!native) return;

  // Varsa custom wrapper'ı temizle
  const maybeCustom = native.nextElementSibling;
  if (maybeCustom && maybeCustom.classList?.contains('custom-select')) {
    maybeCustom.remove();
  }

  // Native'i normal hâline getir
  native.dataset.enhanced = '0';
  native.style.display = '';
  native.style.position = '';
  native.style.left = '';
  native.style.width = '';
  native.style.height = '';
  native.style.opacity = '';
  native.style.pointerEvents = '';
  native.removeAttribute('aria-hidden');
  native.tabIndex = 0;
}
  
  function validateForm(data, form) {
    let ok = true;
    ['name','email','service','message'].forEach(name => {
      const field = form.querySelector(`[name="${name}"]`);
      if (!validateField(field)) ok = false;
    });
    return ok;
  }
  
  function validateField(field) {
    if (!field) return true;
    let valid = true;
    const v = String(field.value || '').trim();
  
    if (!v) valid = false;
    if (valid && field.type === 'email') valid = isValidEmail(v);
  
    field.classList.toggle('error', !valid);
    field.style.borderColor = valid ? '' : 'var(--error-color)';
    if (!valid) {
      showFieldError(field, field.type === 'email' ? 'Geçerli bir e-posta girin' : 'Bu alan zorunludur');
    }
    return valid;
  }
  
  function showFieldError(field, message) {
    let hint = field.parentElement.querySelector('.field-error');
    if (!hint) {
      hint = document.createElement('small');
      hint.className = 'field-error';
      hint.style.cssText = 'color:#ef4444;margin-top:6px;';
      field.parentElement.appendChild(hint);
    }
    hint.textContent = message;
  }
  
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
  
  // ===========================================
  // 7. NOTIFICATION (toast)
  // ===========================================
  function showNotification(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <div style="
        position:fixed;right:20px;bottom:20px;z-index:2000;
        background:rgba(17,24,39,.98);color:#fff;padding:12px 16px;
        border-radius:12px;border:1px solid rgba(255,255,255,.08);
        box-shadow:0 10px 30px rgba(0,0,0,.35);display:flex;gap:10px;align-items:center;
      ">
        <i class="${getNotificationIcon(type)}"></i>
        <span>${message}</span>
      </div>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }
  
  function getNotificationIcon(type) {
    switch (type) {
      case 'success': return 'fas fa-check-circle';
      case 'error':   return 'fas fa-times-circle';
      case 'warning': return 'fas fa-exclamation-triangle';
      default:        return 'fas fa-info-circle';
    }
  }
  
// ===========================================
// 8. AI TERMINAL LOOP (insan hızıyla yazım)  [GÜNCELLENDİ]
// ===========================================
function initAiTerminalLoop() {
  const container = document.querySelector('#heroTerminal');
  if (!container) return;

  // Basit renklendirme
  const kw  = /\b(pipeline|fetch|validate|transform|publish|model|evals|serve|deploy|index|retriever|guardrails|autoscale|assert|for|in|if|return|with|import|from|as)\b/g;
  const fn  = /\b(gpt|embed|normalize|cleanse|warehouse|topk|compose|vector\.index|google_trends|run|search|scrape|groupby|agg|join|with_columns|bigquery|budget|recommend|non_negative|excel|csv)\b/g;
  const str = /(\".*?\"|\'.*?\')/g;
  const num = /\b(\d+(\.\d+)?)\b/g;

  const highlight = (s) =>
    s.replace(str, '<span class="tok-str">$1</span>')
     .replace(fn,  '<span class="tok-fn">$1</span>')
     .replace(kw,  '<span class="tok-kw">$1</span>')
     .replace(num, '<span class="tok-num">$1</span>');

  // Tek akış: Google Trends -> e-ticaret -> Excel -> Analiz -> Öneri
  const LINES = [
    '# Ingest → Google Trends (Shopping, TR)',
    'trends   = fetch.google_trends(category="shopping", region="TR", window="7d")',
    'products = trends.topk(10, key="search_volume").name',
    '',
    '# Crawl → e-ticaret siteleri (fiyat toplama)',
    'stores = ["x","y","z","w"]',
    'offers = scrape.search(stores=stores, items=products)',
    'prices = transform.normalize(offers)  # para birimi, KDV, varyant temizliği',
    'prices = prices.groupby("item").agg(min="price", max="price", avg="price", count="n")',
    '',
    '# Export → Excel/CSV (rapor)',
    'publish.excel(prices, path="exports/market_prices.xlsx")',
    'publish.csv(prices,   path="exports/market_prices.csv")',
    '',
    '# Internal → Geçmiş satış & görünürlük',
    'sales  = fetch.warehouse(dataset="sales", tables=["orders","impressions","catalog"])',
    'joined = transform.join(sales.orders, sales.impressions, on="sku")',
    'stats  = joined.with_columns(ctr=clicks/impressions, cvr=orders/clicks)',
    'stats  = stats.groupby("sku").agg(avg_sale_price="mean(sale_price)", avg_ctr="mean(ctr)", avg_cvr="mean(cvr)")',
    '',
    '# Merge → Piyasa fiyatı + iç metrikler',
    'model_in = transform.join(stats, prices, on=("sku","item"), how="left")',
    'policy   = { min_margin:0.12, step:1, match_market:"avg±5%" }',
    'recos    = price.recommend(model_in, strategy="market+margin", policy=policy)',
    '',
    '# Save & Evals',
    'publish.bigquery(recos, dataset="pricing", table="recommended_prices")',
    'checks = { sanity: rules.non_negative(["price"]), roi_expected: ">= 1.2" }',
    'assert(evals.run(recos, checks))',
  ];

  // Ortalama insan yazım hızı ~ 35–45 wpm ≈ 3–4 karakter/sn -> görsel için biraz hızlandırıp doğal duraksama ekledik
  const charDelay = () => 60 + Math.random() * 70;     // 60–130ms/karakter
  const extraPause = (ch) => (/[.,;:)]/.test(ch) ? 180 : /[\n]/.test(ch) ? 220 : 0);

  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  // Cursor
  let cursor;
  const ensureCursor = () => {
    if (!cursor) {
      cursor = document.createElement('span');
      cursor.className = 'cursor';
      container.appendChild(cursor);
    }
  };

  async function typeLine(text) {
    // Her satır için ayrı span; içerik her karakterde renklendirilir
    const lineEl = document.createElement('span');
    lineEl.className = 'line';
    container.appendChild(lineEl);
    ensureCursor();

    let buffer = '';
    for (let i = 0; i < text.length; i++) {
      buffer += text[i];
      lineEl.innerHTML = highlight(buffer);
      container.appendChild(lineEl);
      container.appendChild(cursor);
      container.scrollTop = container.scrollHeight;

      await wait(charDelay() + extraPause(text[i]));
    }
    // Satır sonu (yeni satır karakteri gibi)
    container.appendChild(document.createTextNode('\n'));
    container.scrollTop = container.scrollHeight;
    await wait(160);
  }

  (async () => {
    while (true) {
      container.innerHTML = '';
      cursor = null;
      for (const ln of LINES) {
        await typeLine(ln);
      }
      // Tur bittiğinde kısa bekleyip baştan
      await wait(800);
    }
  })();
}

  
  // küçük yardımcı
  function wait(ms){ return new Promise(res => setTimeout(res, ms)); }
  
  // ===========================================
  // 9. UTILS
  // ===========================================
  function debounce(fn, wait = 200) {
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), wait); };
  }
  function throttle(fn, limit = 100) {
    let inThrottle, lastFn, lastTime;
    return function () {
      const context = this, args = arguments;
      if (!inThrottle) {
        fn.apply(context, args);
        lastTime = Date.now();
        inThrottle = true;
      } else {
        clearTimeout(lastFn);
        lastFn = setTimeout(function () {
          if ((Date.now() - lastTime) >= limit) {
            fn.apply(context, args);
            lastTime = Date.now();
          }
        }, Math.max(limit - (Date.now() - lastTime), 0));
      }
    };
  }
  
// ===========================================
// 10. EXTRA STYLES (Injected) – keyframes
// ===========================================
const style = document.createElement('style');
style.textContent = `
  /* Parçacıklar ekranın altından yukarı akar */
  @keyframes float-particle {
    0%   { transform: translateY(0) translateX(0); opacity:.95; }
    50%  { transform: translateY(-60vh) translateX(8px); opacity:.8; }
    100% { transform: translateY(-120vh) translateX(-6px); opacity:.95; }
  }
`;
document.head.appendChild(style);

