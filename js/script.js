/* ===========================================================
  Teknoify – Main Script (full)
  - Header (sticky + dropdown hizası)
  - Mobile menu
  - Smooth scroll (header ofsetli)
  - Global yıldız overlay (fare izi YOK)
  - Hero sayaçları
  - Terminal v2: sabit boyutlu, typist döngü
  - Dil seçici (TR/EN) + hero başlık/altbaşlık metinleri
  - Küçük yardımcılar
=========================================================== */

document.addEventListener('DOMContentLoaded', () => {
    initHeader();
    initMobileMenu();
    initSmoothScrolling();
    initStarsOverlay();
    initCounters();
    initTerminalTyping();
    initLanguageSwitch();
    initNavDropdowns();   // Hizmetler menüsünün solda açılma sorununu da çözüyor
  });
  
  /* ===========================================================
     1) HEADER
  =========================================================== */
  function initHeader() {
    const header = document.getElementById('header') || document.querySelector('.header');
    if (!header) return;
  
    const onScroll = throttle(() => {
      header.classList.toggle('scrolled', window.scrollY > 10);
    }, 16);
  
    onScroll();
    window.addEventListener('scroll', onScroll);
  }
  
  /* ===========================================================
     2) MOBILE MENU
  =========================================================== */
  function initMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu   = document.querySelector('.nav-menu');
  
    if (!hamburger || !navMenu) return;
  
    const close = () => {
      hamburger.classList.remove('active');
      navMenu.classList.remove('active');
      document.body.classList.remove('menu-open');
    };
  
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      navMenu.classList.toggle('active');
      document.body.classList.toggle('menu-open');
    });
  
    navMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
  
    document.addEventListener('click', (e) => {
      if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) close();
    });
  }
  
  /* ===========================================================
     3) SMOOTH SCROLL (Header yüksekliği kadar ofset)
  =========================================================== */
  function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const id = anchor.getAttribute('href');
        if (!id || id === '#') return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
  
        const header = document.getElementById('header') || document.querySelector('.header');
        const offset = header ? header.offsetHeight : 0;
        const top = target.getBoundingClientRect().top + window.pageYOffset - offset - 6;
  
        window.scrollTo({ top, behavior: 'smooth' });
      });
    });
  }
  
  /* ===========================================================
     4) GLOBAL YILDIZ OVERLAY (fare izi KALDIRILDI)
  =========================================================== */
  function initStarsOverlay() {
    // tek bir overlay kullan, tekrar init'te birikmesin
    let overlay = document.getElementById('stars-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'stars-overlay';
      Object.assign(overlay.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '0',
        pointerEvents: 'none',
        overflow: 'hidden'
      });
      document.body.appendChild(overlay);
    } else {
      overlay.innerHTML = '';
    }
  
    const COUNT = 56;
    for (let i = 0; i < COUNT; i++) {
      const p = document.createElement('div');
      p.className = 'light-particle';
      const size = (Math.random() * 2 + 1.6).toFixed(1); // 1.6–3.6px
      const left = (Math.random() * 100).toFixed(3) + '%';
      const top  = (105 + Math.random() * 40).toFixed(3) + '%'; // ekran altından başlasın
      const duration = (20 + Math.random() * 18).toFixed(1);     // 20–38s
      const delay = (-1 * Math.random() * duration).toFixed(1) + 's';
  
      p.style.cssText = `
        position:absolute; width:${size}px; height:${size}px; border-radius:50%;
        left:${left}; top:${top};
        background: rgba(99,102,241, ${(0.22 + Math.random() * 0.25).toFixed(2)});
        filter: drop-shadow(0 0 6px rgba(99,102,241,0.28));
        will-change: transform, opacity;
        animation: float-particle ${duration}s linear infinite;
        animation-delay: ${delay};
      `;
      overlay.appendChild(p);
    }
  
    // gerekli animasyon tanımı yoksa enjekte et
    injectOnce('stars-keyframes', `
      @keyframes float-particle{
        0%   { transform: translateY(0)   translateX(0);    opacity:.9; }
        50%  { transform: translateY(-50vh) translateX(8px); opacity:.85; }
        100% { transform: translateY(-100vh) translateX(-10px); opacity:.0; }
      }
    `);
  }
  
  /* ===========================================================
     5) HERO SAYAÇLARI
     .stat-number (veya [data-stat]) içindeki sayıları 0'dan hedefe say
  =========================================================== */
  function initCounters() {
    const stats = document.querySelectorAll('.stat-number, [data-stat]');
    if (!stats.length) return;
  
    const toInt = (el) => parseInt((el.dataset.stat || el.textContent).replace(/\D/g, ''), 10) || 0;
    const suffix = (el) => (el.dataset.suffix !== undefined ? el.dataset.suffix : el.textContent.replace(/\d/g, ''));
  
    const animate = (el) => {
      const target = toInt(el);
      const suf = suffix(el);
      let cur = 0;
      const inc = Math.max(1, Math.floor(target / 50));
      const t = setInterval(() => {
        cur += inc;
        if (cur >= target) { cur = target; clearInterval(t); }
        el.textContent = cur + suf;
      }, 26);
    };
  
    const obs = new IntersectionObserver((ents) => {
      ents.forEach(e => { if (e.isIntersecting) { animate(e.target); obs.unobserve(e.target); } });
    }, { threshold: 0.5 });
  
    stats.forEach(s => obs.observe(s));
  }
  
  /* ===========================================================
     6) TERMINAL v2 – typist döngü (SABİT BOYUTLU KART)
  =========================================================== */
  function initTerminalTyping() {
    const term = document.querySelector('.hero-terminal.terminal-v2 .term-body.v2');
    if (!term) return;
  
    // Kod sahneleri – Türkçe etiketli, renkli token <span>’leri ile
    const SCENES = [
      // 1) Google Trends → Top5 ürün
      [
        line('# Ingest → Google Trends'),
        line(`${kw('data')} = ${fn('fetch')}.${fn('google_trends')}(${str('["ai","automation"]')}, ${kw('region')}=${str('"TR"')}, ${kw('window')}=${str('"7d"')})`)
      ],
      // 2) Online mağazalardan fiyat topla
      [
        line('# Crawl → Online Mağazalar'),
        line(`${kw('prices')} = ${fn('shop')}.${fn('search_many')}(${kw('data')}.${fn('top')}( ${num('5')} ), ${kw('sources')}=${str('["hepsiburada","trendyol","n11"]')})`)
      ],
      // 3) BigQuery’ye yaz
      [
        line('# Publish → BigQuery'),
        line(`${fn('publish')}.${fn('warehouse')}(${kw('prices')}, ${kw('dest')}=${str('"bigquery"')}, ${kw('table')}=${str('"trends_ai_daily"')})`)
      ],
      // 4) Geçmiş satış + CTR + CVR ile birleştir
      [
        line('# Join → Geçmiş Satış + CTR + CVR'),
        line(`${kw('facts')} = ${fn('table')}(${str('"sales_facts"')}).${fn('select')}(${str('"sku"')}, ${str('"qty"')}, ${str('"revenue"')}, ${str('"ctr"')}, ${str('"cvr"')})`),
        line(`${kw('hist')}  = ${fn('transform')}.${fn('join')}(${kw('prices')}, ${kw('facts')}, ${kw('on')}=${str('"sku"')}, ${kw('how')}=${str('"left"')})`)
      ],
      // 5) Bütçe + Pazar fiyatı + marj kısıtı ile fiyat öner
      [
        line('# Model → Bütçe & Pazar Fiyatı ile Optimum Fiyat'),
        line(`${kw('budget')} = ${fn('finance')}.${fn('budget')}(${str('"Q4"')})`),
        line(`${kw('reco')}   = ${fn('price')}.${fn('recommend')}(${kw('hist')}, ${kw('budget')}=${kw('budget')}, ${kw('strategy')}=${str('"market+margin"')}, ${kw('constraints')}={${kw('min_margin')}:${num('0.12')}})`)
      ],
      // 6) Evals
      [
        line('# Evals'),
        line(`${kw('metrics')} = { ${kw('latency_p95_ms')}: < ${num('450')}, ${kw('accuracy_em')}: >= ${num('0.82')}, ${kw('freshness_h')}: <= ${num('1')} }`),
        line(`${fn('assert')}(${fn('evals')}.${fn('run')}(${kw('reco')}, ${kw('metrics')}))`)
      ]
    ];
  
    // Yazma hızı
    const CHAR_DELAY = 10;
    const LINE_DELAY = 420;
    const SCENE_DELAY = 900;
  
    let sceneIndex = 0;
  
    const runScene = async () => {
      term.innerHTML = ''; // sabit yükseklik, içeriği sıfırla
      const lines = SCENES[sceneIndex];
  
      for (const html of lines) {
        await typeLine(term, html, CHAR_DELAY);
        await wait(LINE_DELAY);
      }
  
      sceneIndex = (sceneIndex + 1) % SCENES.length;
      await wait(SCENE_DELAY);
      runScene();
    };
  
    // Başlat
    runScene();
  }
  
  // satıra yazım (sabit genişliği bozmayacak şekilde)
  async function typeLine(container, html, charDelay) {
    return new Promise(resolve => {
      const lineEl = document.createElement('span');
      lineEl.className = 'line';
      container.appendChild(lineEl);
  
      // html string’ini karakter karakter yazmak için düz metne çevirme hilesi:
      // önce bir temp div’e koy, sonra textContent’ini kullan
      const temp = document.createElement('div');
      temp.innerHTML = html;
      const flatText = temp.textContent || '';
  
      let i = 0;
      const cursor = document.createElement('span');
      cursor.className = 'cursor';
      lineEl.appendChild(cursor);
  
      const t = setInterval(() => {
        // mevcut text + yeni karakteri tekrar "renklendir" (tokenizer basit)
        const next = flatText.slice(0, ++i);
        lineEl.innerHTML = colorize(next) + '<span class="cursor"></span>';
  
        if (i >= flatText.length) {
          clearInterval(t);
          resolve();
        }
      }, charDelay);
    });
  }
  
  // Token renklendirme – basit/highlight amaçlı
  function colorize(text) {
    // anahtar kelime, sayı, string, fonksiyon isimlerini çok basitçe boyar
    // (gelişmiş bir parser yerine görsel amaçlıdır)
    let out = text
      .replace(/(#.*)$/gm, '<span class="tok-cmt">$1</span>')
      .replace(/\b(const|let|var|return|async|await|if|else|for|in|of|true|false|null)\b/g, '<span class="tok-kw">$1</span>')
      .replace(/"([^"]*)"/g, '<span class="tok-str">"$1"</span>')
      .replace(/'([^']*)'/g, "<span class='tok-str'>'$1'</span>")
      .replace(/\b(\d+(\.\d+)?)\b/g, '<span class="tok-num">$1</span>')
      .replace(/\b([a-z_][a-z0-9_]*)\s*(?=\()/gi, '<span class="tok-fn">$1</span>');
    return out;
  }
  
  // Kısa helper’lar – terminal sahnelerinde okunaklı HTML üretmek için:
  const kw  = (s) => `<span class="tok-kw">${s}</span>`;
  const fn  = (s) => `<span class="tok-fn">${s}</span>`;
  const str = (s) => `<span class="tok-str">${s}</span>`;
  const num = (s) => `<span class="tok-num">${s}</span>`;
  const line = (s) => s;
  
  /* ===========================================================
     7) DİL SEÇİCİ – TR/EN ve hero metinlerini güncelle
     (Markup beklenen: #langToggle butonu + #langMenu menüsü)
  =========================================================== */
  function initLanguageSwitch() {
    const btn  = document.getElementById('langToggle');
    const menu = document.getElementById('langMenu');
    if (!btn || !menu) return;
  
    const currentCodeEl = btn.querySelector('[data-lang-current]');
    let current = (currentCodeEl?.textContent || 'TR').trim().toLowerCase();
  
    const strings = {
      tr: {
        title: 'Daha az çabayla Hayalinizi inşa edin',
        subtitle: 'Teknoify, AI destekli otomasyon, veri analizi ve akıllı çözümlerle işinizi büyütmek ve hayalinizi inşa etmek için çalışır.'
      },
      en: {
        title: 'Build your vision with less effort',
        subtitle: 'Teknoify helps you grow your business and build your vision with AI-powered automation, data analytics, and smart solutions.'
      }
    };
  
    const titleEl = document.getElementById('heroTitle') || document.querySelector('.hero-title');
    const subEl   = document.getElementById('heroSubtitle') || document.querySelector('.hero-subtitle');
  
    const apply = (code) => {
      const t = strings[code] || strings.tr;
      if (titleEl) titleEl.textContent = t.title;
      if (subEl)   subEl.textContent   = t.subtitle;
      if (currentCodeEl) currentCodeEl.textContent = code.toUpperCase();
      current = code;
    };
  
    // toggle
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('open');
      // menüyü butonun altına hizala
      const rect = btn.getBoundingClientRect();
      Object.assign(menu.style, {
        position: 'absolute',
        top: `${rect.bottom + window.scrollY + 10}px`,
        left: `${rect.left + window.scrollX}px`
      });
    });
  
    // seçim
    menu.querySelectorAll('[data-lang]').forEach(item => {
      item.addEventListener('click', () => {
        const code = (item.getAttribute('data-lang') || 'tr').toLowerCase();
        apply(code);
        menu.classList.remove('open');
      });
    });
  
    // dışarı tıkla kapat
    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target) && !btn.contains(e.target)) {
        menu.classList.remove('open');
      }
    });
  
    // ilk uygulama
    apply(current);
  }
  
  /* ===========================================================
     8) NAV DROPDOWNS (Hizmetler menüsü solda açılmasın)
     Markup: .nav-item.has-dropdown > .dropdown-menu
  =========================================================== */
  function initNavDropdowns() {
    const items = document.querySelectorAll('.nav-item.has-dropdown');
    items.forEach(item => {
      const trigger = item.querySelector('.nav-link, button, a') || item;
      const dd = item.querySelector('.dropdown-menu');
      if (!dd || !trigger) return;
  
      // hover veya fokus ile aç/kapat
      let openTimer, closeTimer;
  
      const open = () => {
        clearTimeout(closeTimer);
        openTimer = setTimeout(() => {
          dd.classList.add('open');
  
          // Konumu parent’a göre hizala
          const rect = trigger.getBoundingClientRect();
          const left = rect.left + window.scrollX;
          dd.style.left = left + 'px';
          dd.style.top  = (rect.bottom + window.scrollY + 8) + 'px';
        }, 60);
      };
  
      const close = () => {
        clearTimeout(openTimer);
        closeTimer = setTimeout(() => dd.classList.remove('open'), 120);
      };
  
      trigger.addEventListener('mouseenter', open);
      trigger.addEventListener('focus', open);
      item.addEventListener('mouseleave', close);
      trigger.addEventListener('blur', close);
    });
  }
  
  /* ===========================================================
     UTILITIES
  =========================================================== */
  function wait(ms) {
    return new Promise(res => setTimeout(res, ms));
  }
  function throttle(fn, limit = 100) {
    let inThrottle, lastFn, lastTime;
    return function () {
      const context = this, args = arguments;
      if (!inThrottle) {
        fn.apply(context, args);
        lastTime = Date.now();
        inThrottle = true;
        setTimeout(() => { inThrottle = false; }, limit);
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
  function injectOnce(id, cssText) {
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = cssText;
    document.head.appendChild(style);
  }
  