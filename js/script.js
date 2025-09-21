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
// 5. ANIMATIONS — terminal döngüsünü garantile  [GÜNCELLENDİ]
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

  // Terminal kod akışı
  try { initAiTerminalLoop(); } catch (e) { /* sessizce geç */ }
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
// 6. CONTACT FORM (submit & hata gösterimi)  [GÜNCELLENDİ]
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

  if (phoneEl) phoneEl.placeholder = 'Telefon Numaranız (isteğe bağlı)';

  const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());

  const clearError = (el) => {
    if (!el) return;
    el.classList.remove('error');

    // custom-select içindeki hata mesajını sil
    const wrap = el.closest('.custom-select');
    const hintInCustom = wrap?.querySelector('.field-error');
    if (hintInCustom) hintInCustom.remove();

    const hint = el.parentElement.querySelector('.field-error');
    if (hint) hint.remove();
  };

  const setError = (el, msg) => {
    if (!el) return;
    clearError(el);
    el.classList.add('error');

    // custom-select içindeyse, mesaji wrapper içine yaz
    const wrap = el.closest('.custom-select');
    if (wrap) {
      const hint = document.createElement('small');
      hint.className = 'field-error';
      hint.textContent = msg;
      wrap.appendChild(hint);
      return;
    }

    const hint = document.createElement('small');
    hint.className = 'field-error';
    hint.textContent = msg;
    el.parentElement.appendChild(hint);
  };

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
      setError(nameEl, 'Bu alan zorunludur'); ok = false;
    }

    if (emailEl) {
      const v = String(emailEl.value).trim();
      if (!v) { setError(emailEl, 'Bu alan zorunludur'); ok = false; }
      else if (!isValidEmail(v)) { setError(emailEl, 'Geçerli bir e-posta girin'); ok = false; }
    }

    if (serviceEl && !String(serviceEl.value).trim()) {
      setError(serviceEl, 'Bir hizmet seçiniz'); ok = false;
    }

    if (msgEl && !String(msgEl.value).trim()) {
      setError(msgEl, 'Bu alan zorunludur'); ok = false;
    }

    if (!ok) return;

    // Gönderim simülasyonu
    const btn = form.querySelector('button[type="submit"]');
    const orig = btn ? btn.innerHTML : null;
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gönderiliyor...'; }

    setTimeout(() => {
      form.reset();

      // Custom select etiketini placeholder’a döndür (".cs-value")
      const csValue = document.querySelector('.custom-select .cs-value');
      const placeholder = document.querySelector('.custom-select .cs-option.is-placeholder');
      if (csValue && placeholder) csValue.textContent = placeholder.textContent.trim();

      if (btn && orig) { btn.disabled = false; btn.innerHTML = orig; }
      showNotification('Mesajınız başarıyla gönderildi!', 'success');
    }, 900);
  });
}

  
// ===========================================
// 8. CUSTOM SELECT — sağlam kurulum (gerekirse sıfırdan oluşturur)  [GÜNCELLENDİ]
// ===========================================
function initCustomSelect() {
  const native = document.querySelector('select#service');
  if (!native) return;

  // 1) Eğer custom wrapper yoksa, native <select>'ten yeniden oluştur
  let wrap = native.closest('.custom-select');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'custom-select';
    wrap.dataset.name = 'service';

    // Trigger
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'cs-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');

    const valSpan = document.createElement('span');
    valSpan.className = 'cs-value';
    valSpan.textContent = native.options[0]?.textContent || 'Hizmet Seçiniz';

    const chevron = document.createElement('i');
    chevron.className = 'fas fa-chevron-down';

    trigger.appendChild(valSpan);
    trigger.appendChild(chevron);

    // Liste
    const list = document.createElement('ul');
    list.className = 'cs-list';
    list.setAttribute('role', 'listbox');

    Array.from(native.options).forEach((opt, i) => {
      const li = document.createElement('li');
      li.className = 'cs-option' + (opt.value === '' ? ' is-placeholder' : '');
      li.dataset.value = opt.value;
      li.textContent = opt.textContent;
      list.appendChild(li);
    });

    // Yerleştir: native'i içine al
    native.parentElement.insertBefore(wrap, native);
    wrap.appendChild(trigger);
    wrap.appendChild(list);
    wrap.appendChild(native);
  }

  // 2) Ortak referanslar
  const trigger = wrap.querySelector('.cs-trigger');
  const valueEl = wrap.querySelector('.cs-value');
  const list    = wrap.querySelector('.cs-list');
  const options = Array.from(wrap.querySelectorAll('.cs-option'));

  if (!trigger || !list || !options.length) return;

  // Native'i gizle (formda kullanılmaya devam eder)
  native.hidden = true;
  native.style.display = 'none';
  native.setAttribute('aria-hidden', 'true');
  native.tabIndex = -1;

  // Yardımcılar
  const open  = () => { wrap.classList.add('open');  trigger.setAttribute('aria-expanded', 'true'); };
  const close = () => { wrap.classList.remove('open'); trigger.setAttribute('aria-expanded', 'false'); };

  // Dışa tıklayınca kapan
  document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) close(); });

  // Aç/Kapat
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    wrap.classList.contains('open') ? close() : open();
  });

  // Seçim
  function selectOption(opt) {
    const val = opt.getAttribute('data-value') || '';
    const txt = opt.textContent.trim();

    options.forEach(o => o.classList.toggle('is-selected', o === opt));
    if (valueEl) valueEl.textContent = txt;

    native.value = val;
    native.dispatchEvent(new Event('change', { bubbles: true }));

    close();
  }

  options.forEach((opt) => {
    opt.setAttribute('role', 'option');
    opt.tabIndex = 0;
    opt.addEventListener('click', (e) => { e.preventDefault(); selectOption(opt); });
    opt.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectOption(opt); }
    });
  });

  // Klavye navigasyonu (trigger odaktayken)
  let activeIndex = Math.max(0, options.findIndex(o => o.classList.contains('is-selected')));
  trigger.addEventListener('keydown', (e) => {
    if (!wrap.classList.contains('open') && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault(); open(); options[activeIndex]?.focus(); return;
    }
    if (!wrap.classList.contains('open')) return;
    if (e.key === 'Escape') { close(); trigger.focus(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); activeIndex = Math.min(options.length - 1, activeIndex + 1); options[activeIndex].focus(); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); activeIndex = Math.max(0, activeIndex - 1); options[activeIndex].focus(); }
    if (e.key === 'Enter')     { e.preventDefault(); selectOption(options[activeIndex]); }
  });

  // Placeholder etiketi
  const placeholder = options.find(o => o.classList.contains('is-placeholder'));
  if (placeholder && valueEl) valueEl.textContent = placeholder.textContent.trim();
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
// 8. CUSTOM SELECT — açılır liste kontrolü  [GÜNCELLENDİ]
// ===========================================
function initCustomSelect() {
  const wrappers = document.querySelectorAll('.custom-select');
  if (!wrappers.length) return;

  // Tüm bileşenler için kurulumu yap
  wrappers.forEach((wrap) => {
    const trigger = wrap.querySelector('.cs-trigger');
    const valueEl = wrap.querySelector('.cs-value');
    const list    = wrap.querySelector('.cs-list');
    const options = Array.from(wrap.querySelectorAll('.cs-option'));
    const native  = wrap.querySelector('select#service'); // gizli native select

    if (!trigger || !list || !options.length || !native) return;

    // Aria
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    list.setAttribute('role', 'listbox');

    // Aç / Kapat
    const open  = () => { wrap.classList.add('open');  trigger.setAttribute('aria-expanded', 'true'); };
    const close = () => { wrap.classList.remove('open'); trigger.setAttribute('aria-expanded', 'false'); };

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      wrap.classList.contains('open') ? close() : open();
    });

    // Dışa tıkla kapat
    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) close();
    });

    // Seçim yap
    function selectOption(opt) {
      const val = opt.getAttribute('data-value') || '';
      const txt = opt.textContent.trim();

      // selected görselleri
      options.forEach(o => o.classList.toggle('is-selected', o === opt));

      // gizli select senkronizasyonu
      native.value = val;
      native.dispatchEvent(new Event('change', { bubbles: true }));

      // etiket
      if (valueEl) valueEl.textContent = txt;

      close();
    }

    options.forEach((opt, idx) => {
      opt.setAttribute('role', 'option');
      opt.addEventListener('click', (e) => {
        e.preventDefault();
        selectOption(opt);
      });
      // Keyboard: Enter/Space
      opt.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectOption(opt);
        }
      });
    });

    // Trigger için klavye navigasyonu
    let activeIndex = options.findIndex(o => o.classList.contains('is-selected'));
    if (activeIndex < 0) activeIndex = 0;

    trigger.addEventListener('keydown', (e) => {
      if (!wrap.classList.contains('open') && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault(); open(); return;
      }
      if (!wrap.classList.contains('open')) return;

      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = Math.min(options.length - 1, activeIndex + 1);
        options[activeIndex].focus();
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = Math.max(0, activeIndex - 1);
        options[activeIndex].focus();
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        selectOption(options[activeIndex]);
      }
    });

    // Varsayılan etiket (placeholder)
    const placeholder = options.find(o => o.classList.contains('is-placeholder'));
    if (placeholder && valueEl) valueEl.textContent = placeholder.textContent.trim();
  });
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

