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
  
    // Terminalde döngü halinde AI kodu akıt
    initAiTerminalLoop();
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
    createLightParticles();     // tüm sayfaya fixed overlay
    addMouseFollowEffect();     // hero içinde hafif iz efekti
  }
  
  // Overlay oluştur / getir
  function getOrCreateStarsOverlay() {
    let overlay = document.getElementById('stars-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'stars-overlay';
      document.body.appendChild(overlay);
    }
    return overlay;
  }
  
  // Yıldızlar (global)
  function createLightParticles() {
    const overlay = getOrCreateStarsOverlay();
  
    // yeniden init edilirse birikmesin
    overlay.querySelectorAll('.light-particle').forEach(p => p.remove());
  
    const COUNT = 48; // tüm sayfa için
    for (let i = 0; i < COUNT; i++) {
      const particle = document.createElement('div');
      particle.className = 'light-particle';
  
      const size = (Math.random() * 2 + 2).toFixed(1);          // 2–4px
      const left = (Math.random() * 100).toFixed(2) + '%';       // 0–100%
      const top  = (105 + Math.random() * 35).toFixed(2) + '%';  // ekranın altından başlasın
  
      const duration = (18 + Math.random() * 18).toFixed(1);     // 18–36s
      const delay    = (Math.random() * duration * -1).toFixed(1) + 's';
  
      particle.style.cssText = `
        position:absolute;
        width:${size}px; height:${size}px;
        left:${left}; top:${top};
        background: rgba(99,102,241, ${(0.22 + Math.random() * 0.25).toFixed(2)});
        border-radius:50%;
        pointer-events:none;
        will-change: transform, opacity;
        animation: float-particle ${duration}s linear infinite;
        animation-delay:${delay};
        filter: drop-shadow(0 0 6px rgba(99,102,241,0.28));
      `;
      overlay.appendChild(particle);
    }
  }
  
  function addMouseFollowEffect() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
  
    hero.addEventListener('mousemove', function (e) {
      const rect = hero.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
  
      const lightTrail = document.createElement('div');
      lightTrail.style.cssText = `
        position:absolute;
        width:100px;height:100px;
        background: radial-gradient(circle, rgba(99,102,241, 0.08) 0%, transparent 72%);
        left:${x - 50}px; top:${y - 50}px;
        pointer-events:none;
        animation: light-trail 1s ease-out forwards;
      `;
      hero.appendChild(lightTrail);
      setTimeout(() => lightTrail.remove(), 1000);
    });
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
      }, { threshold: 0.5 });
      stats.forEach(el => io.observe(el));
    }
  }
  
  function animateNumber(el) {
    const target   = Number(el.dataset.target || 0);
    const duration = Number(el.dataset.duration || 1500);
    const decimals = Number(el.dataset.decimals || 0);
    const prefix   = el.dataset.prefix || '';
    const suffix   = el.dataset.suffix || '';
  
    const start = 0;
    const startTime = performance.now();
    const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  
    function frame(now) {
      const elapsed  = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased    = easeOutCubic(progress);
      const value    = start + (target - start) * eased;
  
      el.textContent = prefix + (decimals ? value.toFixed(decimals) : Math.round(value)) + suffix;
      if (progress < 1) requestAnimationFrame(frame);
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
      case 'error': return 'fas fa-times-circle';
      case 'warning': return 'fas fa-exclamation-triangle';
      default: return 'fas fa-info-circle';
    }
  }
  
  // ===========================================
  // 8. AI TERMINAL LOOP (kod döngüsü)
  // ===========================================
  function initAiTerminalLoop(){
    const container = document.querySelector('#ai-manifesto code');
    if(!container) return;
  
    // Basit sözdizimi renklendirme
    const kw = /\b(pipeline|fetch|validate|transform|publish|model|evals|serve|deploy|index|retriever|guardrails|autoscale|assert|for|in|if|return|with|import|from|as)\b/g;
    const fn = /\b(gpt|embed|normalize|cleanse|warehouse|topk|compose|vector\.index|google_trends|run)\b/g;
    const str = /(\".*?\"|\'.*?\')/g;
    const num = /\b(\d+(\.\d+)?)\b/g;
  
    function highlight(line){
      return line
        .replace(str, '<span class="tok-str">$1</span>')
        .replace(fn, '<span class="tok-fn">$1</span>')
        .replace(kw, '<span class="tok-kw">$1</span>')
        .replace(num, '<span class="tok-num">$1</span>');
    }
  
    const SNIPPETS = [
      [
        '# Ingest → Google Trends',
        'data = fetch.google_trends(["ai","automation"], region="TR", window="7d")',
        'data = validate.schema(data, rules=["non_empty","dedupe","unicode_norm"])',
        'docs = transform.etl.cleanse(data) | nlp.normalize() | embed(model="text-embedding-3-large")',
        'publish.warehouse(docs, dest="bigquery", table="trends_ai_daily")'
      ],
      [
        '# Retrieval-Augmented Generation',
        'index = vector.index(docs, metric="cosine")',
        'query = "RPA ile verimlilik nasıl artar?"',
        'ctx = retriever.topk(index, query, k=5)',
        'answer = gpt("gpt-4.1-mini", prompt=compose(query, ctx), guardrails={pii:false,toxicity:"<0.02"})',
        'print(answer)'
      ],
      [
        '# Evals',
        'metrics = { latency_p95_ms: < 450, accuracy_em: >= 0.82, freshness_h: <= 1 }',
        'assert(evals.run(answer, metrics))'
      ],
      [
        '# Serve & Deploy',
        'serve.api = "gpt-service"; serve.workers = 3; serve.scheduler = "cron-service"',
        'deploy(cluster="teknoify-prod", api="gpt-service", autoscale={min:2, max:10})'
      ]
    ];
  
    let i = 0;
  
    async function writeSnippet(lines){
      container.innerHTML = ''; // temizle
      for (const raw of lines){
        const line = document.createElement('span');
        line.className = 'line';
        line.innerHTML = highlight(raw);
        container.appendChild(line);
        await wait(140); // satır arası hız
      }
      const cursor = document.createElement('span');
      cursor.className = 'cursor';
      container.appendChild(cursor);
      await wait(1800);
    }
  
    async function loop(){
      while(true){
        await writeSnippet(SNIPPETS[i]);
        i = (i + 1) % SNIPPETS.length;
      }
    }
  
    loop().catch(()=>{ /* sessizce geç */ });
  }
  
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
    /* Global yıldız overlay: çerçevenin altında kalsın */
    #stars-overlay{
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 0; /* .page-frame z-index:1, yani yıldızlar dış alanda görünür */
    }
  
    @keyframes light-trail {
      0% { opacity:.3; transform:scale(.5); }
      50%{ opacity:.1; transform:scale(1); }
      100%{ opacity:0; transform:scale(1.5); }
    }
  
    /* Yıldızlar sürekli yukarı */
    @keyframes float-particle {
      0%   { transform: translateY(0);       opacity: 0; }
      8%   { opacity: .6; }
      90%  { opacity: .6; }
      100% { transform: translateY(-120vh); opacity: 0; }
    }
  
    .contact-form .error { border-color: #ef4444 !important; }
  `;
  document.head.appendChild(style);
  