// ===========================================
// 0. GLOBAL INITIALIZATION
// ===========================================
document.addEventListener('DOMContentLoaded', () => {
    initHeader();
    initMobileMenu();
    initSmoothScrolling();
    initAnimations();
    initContactForm();
    initLightEffects();
    initAiTerminalLoop(); // Terminal kod akışı
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
    createLightParticles();   // hero yüzeyinde sabit "yıldız" efekti
    addScrollLightEffect();   // scroll'a göre yüzey opaklığı hafif değişsin
  }
  
  // Arkaplan yıldızları (.hero-surface içinde)
  function createLightParticles() {
    const host = document.querySelector('.hero-surface'); // çerçeve içinde kalsın
    if (!host) return;
  
    // yeniden init edilirse birikmesin
    host.querySelectorAll('.light-particle').forEach(p => p.remove());
  
    const COUNT = 32;
    for (let i = 0; i < COUNT; i++) {
      const p = document.createElement('div');
      p.className = 'light-particle';
      const size = (Math.random() * 3 + 1.5).toFixed(1);
      p.style.cssText = `
        position:absolute; z-index:0;
        width:${size}px; height:${size}px; border-radius:50%;
        left:${(Math.random()*100).toFixed(2)}%; top:${(Math.random()*100).toFixed(2)}%;
        background: rgba(139,92,246, ${(Math.random()*0.45+0.25).toFixed(2)});
        filter: drop-shadow(0 0 4px rgba(139,92,246,.45));
        pointer-events:none;
        animation: float-particle ${(Math.random()*12+14).toFixed(1)}s linear infinite;
        animation-delay:${(Math.random()*6).toFixed(1)}s;
      `;
      host.appendChild(p);
    }
  }
  
  // Scroll’a göre hero yüzeyinin opaklığını hafifçe değiştir
  function addScrollLightEffect() {
    const surface = document.querySelector('.hero-surface');
    if (!surface) return;
    window.addEventListener('scroll', () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const p = h ? (window.pageYOffset / h) : 0;
      surface.style.opacity = String(0.85 + p * 0.15);
    }, { passive: true });
  }
  
  // ===========================================
  // 5. ANIMATIONS (AOS + Stat sayaçları)
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
  
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      if (!validateForm(data, form)) return;
  
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gönderiliyor...';
      submitBtn.disabled = true;
  
      setTimeout(() => {
        showNotification('Mesajınız başarıyla gönderildi!', 'success');
        form.reset();
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }, 1200);
    });
  
    form.querySelectorAll('input, textarea, select').forEach(input => {
      input.addEventListener('blur', () => validateField(input));
      input.addEventListener('input', () => {
        if (input.classList.contains('error')) validateField(input);
      });
    });
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
  // 8. AI TERMINAL LOOP (kod döngüsü)
  // ===========================================
  function initAiTerminalLoop() {
    // DOĞRU HEDEF: hero'daki <pre id="heroTerminal">
    const container = document.querySelector('#heroTerminal');
    if (!container) return;
  
    // basit renklendirme
    const kw  = /\b(pipeline|fetch|validate|transform|publish|model|evals|serve|deploy|index|retriever|guardrails|autoscale|assert|for|in|if|return|with|import|from|as)\b/g;
    const fn  = /\b(gpt|embed|normalize|cleanse|warehouse|topk|compose|vector\.index|google_trends|run|search|scrape|groupby|agg|join|with_columns|bigquery|budget|recommend|non_negative)\b/g;
    const str = /(\".*?\"|\'.*?\')/g;
    const num = /\b(\d+(\.\d+)?)\b/g;
  
    const hl = (s) =>
      s.replace(str, '<span class="tok-str">$1</span>')
       .replace(fn,  '<span class="tok-fn">$1</span>')
       .replace(kw,  '<span class="tok-kw">$1</span>')
       .replace(num, '<span class="tok-num">$1</span>');
  
    // İstenen senaryo
    const SNIPPETS = [
      [
        '# Ingest → Google Trends (Shopping)',
        'trends   = fetch.google_trends(category="shopping", region="TR", window="7d")',
        'products = trends.topk(5, key="search_volume").name   # en çok aranan 5 ürün'
      ],
      [
        '# Crawl → Online Stores (fiyat toplama)',
        'stores = ["hepsiburada","trendyol","n11","amazon-tr"]',
        'offers = scrape.search(stores=stores, items=products)',
        'prices = transform.normalize(offers)',
        'prices = prices.groupby("item").agg(min="price", max="price", avg="price")'
      ],
      [
        '# Publish → BigQuery (piyasa fiyatları)',
        'publish.bigquery(prices, dataset="pricing", table="market_prices_daily")'
      ],
      [
        '# Internal Metrics → CTR / CVR / AvgPrice',
        'internal = fetch.warehouse(dataset="sales", tables=["orders","impressions","catalog"])',
        'joined   = transform.join(internal.orders, internal.impressions, on="sku")',
        'stats    = joined.with_columns(ctr=clicks/impressions, cvr=orders/clicks)',
        'stats    = stats.groupby("sku").agg(avg_price="mean(sale_price)", avg_ctr="mean(ctr)", avg_cvr="mean(cvr)")'
      ],
      [
        '# Merge → Piyasa + Geçmiş + Bütçe',
        'model_in = transform.join(stats, prices, on=("sku","item"), how="left")',
        'budget   = finance.budget("Q4")',
        'recos    = price.recommend(model_in, strategy="market+margin", budget=budget,',
        '            constraints={min_margin:0.12, step:1})'
      ],
      [
        '# Save & Evals',
        'publish.bigquery(recos, dataset="pricing", table="recommended_prices")',
        'checks = { sanity: rules.non_negative(["price"]), roi_expected: ">= 1.2" }',
        'assert(evals.run(recos, checks))'
      ]
    ];
  
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
  
    async function write(lines) {
      container.innerHTML = '';
      for (const raw of lines) {
        const line = document.createElement('span');
        line.className = 'line';
        line.innerHTML = hl(raw);
        container.appendChild(line);
        await wait(140);
      }
      const cursor = document.createElement('span');
      cursor.className = 'cursor';
      container.appendChild(cursor);
      await wait(1800);
    }
  
    (async () => {
      let i = 0;
      while (true) {
        await write(SNIPPETS[i]);
        i = (i + 1) % SNIPPETS.length;
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
  // 10. EXTRA STYLES (Injected)
  // ===========================================
  const style = document.createElement('style');
  style.textContent = `
    /* Yıldızlar için animasyon */
    @keyframes float-particle {
      0%   { transform: translateY(0) translateX(0); opacity:.9; }
      50%  { transform: translateY(-80px) translateX(15px); opacity:.78; }
      100% { transform: translateY(-160px) translateX(-10px); opacity:.9; }
    }
    .light-particle { will-change: transform, opacity; }
  `;
  document.head.appendChild(style);
  