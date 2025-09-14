// ===========================================
// 0. GLOBAL INITIALIZATION
// ===========================================
document.addEventListener('DOMContentLoaded', function() {
    initHeader();
    initMobileMenu();
    initSmoothScrolling();
    initAnimations();
    initContactForm();
    initLightEffects();
    initPhilosophyAnimation();
  
    // Transparent globe (if three.js & globe.js loaded)
    if (typeof window.initHeroGlobe === 'function') {
      window.initHeroGlobe();
    }
  
    // NEW: AI Manifesto terminali başlat
    initHeroTerminalManifesto();
  });
  

// ===========================================
// 2. HEADER FUNCTIONALITY
// ===========================================
function initHeader() {
    const header = document.getElementById('header');
    if (!header) return;

    window.addEventListener('scroll', function() {
        header.classList.toggle('scrolled', window.scrollY > 100);
    });
}


// ===========================================
// 3. MOBILE MENU
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
// 4. SMOOTH SCROLLING
// ===========================================
function initSmoothScrolling() {
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetElement = document.querySelector(this.getAttribute('href'));
            if (!targetElement) return;

            const headerHeight = document.querySelector('.header').offsetHeight;
            const targetPos = targetElement.offsetTop - headerHeight;
            window.scrollTo({ top: targetPos, behavior: 'smooth' });
        });
    });
}


// ===========================================
// PHILOSOPHY ANIMATION (fixed for TR words)
// ===========================================
function initPhilosophyAnimation() {
    const words = [
      document.getElementById('innovate'),  // "Hayal edin."
      document.getElementById('integrate'), // "Tasarlayın."
      document.getElementById('inspire')    // "İlham verin."
    ];
    const vision = document.getElementById('vision');
    const actions = document.getElementById('hero-actions');
  
    // Base delays kelime sırasına göre (CSS harf gecikmelerini kapsıyor)
    const base = 500;
    const step = 1500;
  
    words.forEach((w, i) => {
      if (!w) return;
      setTimeout(() => {
        w.style.opacity = '1';
        w.style.transform = 'translateY(0)';
      }, base + i * step);
    });
  
    // Vision cümlesi ve buton
    setTimeout(() => {
      if (vision) {
        vision.style.opacity = '1';
        vision.style.transform = 'translateY(0)';
      }
    }, base + words.length * step + 400);
  
    setTimeout(() => {
      if (actions) {
        actions.style.opacity = '1';
        actions.style.transform = 'translateY(0)';
      }
    }, base + words.length * step + 900);
  }
  

// ===========================================
// 6. LIGHT EFFECTS
// ===========================================
function initLightEffects() {
    createLightParticles();     // Artık global overlay'e çizer
    addMouseFollowEffect();     // Hero üzerinde hafif iz efekti
    addScrollLightEffect();     // Işık yoğunluğu (opsiyonel)
  }
  
  // Global yıldız overlay'i yarat / getir
  function getOrCreateStarsOverlay() {
    let overlay = document.getElementById('stars-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'stars-overlay';
      document.body.appendChild(overlay);
    }
    return overlay;
  }
  
  // 6.1 Create floating light particles (GLOBAL overlay)
  function createLightParticles() {
    const overlay = getOrCreateStarsOverlay();
  
    // Önceki parçacıkları temizle (yeniden init edilirse birikmesin)
    overlay.querySelectorAll('.light-particle').forEach(p => p.remove());
  
    const COUNT = 48; // tüm sayfa için artırıldı
    for (let i = 0; i < COUNT; i++) {
      const particle = document.createElement('div');
      particle.className = 'light-particle';
  
      const size = (Math.random() * 2 + 2).toFixed(1);          // 2–4px
      const left = (Math.random() * 100).toFixed(2) + '%';       // 0–100%
      const top  = (105 + Math.random() * 35).toFixed(2) + '%';  // 105–140% (ekranın altı)
  
      const duration = (18 + Math.random() * 18).toFixed(1);     // 18–36s
      const delay    = (Math.random() * duration * -1).toFixed(1) + 's'; // bazıları ortadan başlar gibi
  
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
  
    // Hero içinde oluşturulmuş eski parçacıklar varsa temizle
    document.querySelectorAll('.hero .light-particle').forEach(p => p.remove());
  }
  
  // 6.2 Mouse follow light effect (hero alanında)
  function addMouseFollowEffect() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
  
    hero.addEventListener('mousemove', function(e) {
      const rect = hero.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
  
      const lightTrail = document.createElement('div');
      lightTrail.style.cssText = `
        position: absolute;
        width: 100px; height: 100px;
        background: radial-gradient(circle, rgba(99,102,241, 0.08) 0%, transparent 72%);
        left: ${x - 50}px; top: ${y - 50}px;
        pointer-events: none;
        animation: light-trail 1s ease-out forwards;
      `;
      hero.appendChild(lightTrail);
      setTimeout(() => lightTrail.remove(), 1000);
    });
  }
  
  // 6.3 Scroll-based light intensity (opsiyonel)
  function addScrollLightEffect() {
    window.addEventListener('scroll', function() {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const scrollProgress = maxScroll ? window.pageYOffset / maxScroll : 0;
      const lightRays = document.querySelector('.light-rays');
      if (lightRays) {
        lightRays.style.opacity = 0.8 + (scrollProgress * 0.2);
      }
    });
  }
  

// ===========================================
// 7. ANIMATIONS (AOS + Stats)
// ===========================================
function initAnimations() {
    if (typeof AOS !== 'undefined') {
      AOS.init({ duration: 800, easing: 'ease-in-out', once: true, offset: 100 });
    }
  
    // Parallax kaldırıldı: bölüm geçişinde siyah boşluk oluşmasın.
  
    // Stat numbers (0'dan hedefe)
    const stats = document.querySelectorAll('.stat-number');
    if (stats.length) {
      // Başlangıç görünümü
      stats.forEach(el => {
        const prefix = el.dataset.prefix || '';
        const suffix = el.dataset.suffix || '';
        el.textContent = `${prefix}0${suffix}`;
      });
  
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            animateNumber(entry.target);
            observer.unobserve(entry.target); // bir kez oynat
          }
        });
      }, { threshold: 0.5 });
  
      stats.forEach(stat => observer.observe(stat));
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
// 8. CONTACT FORM
// ===========================================
function initContactForm() {
    const form = document.querySelector('.contact-form');
    if (!form) return;
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form));
        if (validateForm(data)) {
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gönderiliyor...';
            submitBtn.disabled = true;
            setTimeout(() => {
                showNotification('Mesajınız başarıyla gönderildi!', 'success');
                form.reset();
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }, 2000);
        }
    });
    form.querySelectorAll('input, textarea, select').forEach(input => {
        input.addEventListener('blur', () => validateField(input));
        input.addEventListener('input', () => {
            if (input.classList.contains('error')) validateField(input);
        });
    });
}

// 8.1 Validation helpers
function validateForm(data) { /* ... */ }
function validateField(field) { /* ... */ }
function showFieldError(fieldName, message) { /* ... */ }
function isValidEmail(email) { /* ... */ }


// ===========================================
// 9. NOTIFICATIONS
// ===========================================
function showNotification(message, type = 'info') { /* ... */ }
function getNotificationIcon(type) { /* ... */ }


// ===========================================
// 10. UTILITY FUNCTIONS
// ===========================================
function debounce(func, wait) { /* ... */ }
function throttle(func, limit) { /* ... */ }


// ===========================================
// 11. PERFORMANCE OPTIMIZATIONS
// ===========================================
const optimizedScrollHandler = throttle(function() { /* ... */ }, 16);
window.addEventListener('scroll', optimizedScrollHandler);


// ===========================================
// 12. ACCESSIBILITY IMPROVEMENTS
// ===========================================
document.addEventListener('keydown', function(e) { /* ... */ });
function initFocusManagement() { /* ... */ }
initFocusManagement();


// ===========================================
// 13. EXTRA STYLES (Injected)
// ===========================================
const style = document.createElement('style');
style.textContent = `
  /* Global yıldız overlay: tüm sayfada görünür, tıklamayı engellemez */
  #stars-overlay{
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 2; /* içerik üstünde ama şeffaf; istersen 1 yapabilirsin */
  }

  @keyframes light-trail {
    0% { opacity:.3; transform:scale(.5); }
    50%{ opacity:.1; transform:scale(1); }
    100%{ opacity:0; transform:scale(1.5); }
  }

  /* Yıldızlar sürekli yukarı çıkar; tepeye gelince kaybolur */
  @keyframes float-particle {
    0%   { transform: translateY(0);       opacity: 0; }
    8%   { opacity: .6; }
    90%  { opacity: .6; }
    100% { transform: translateY(-120vh); opacity: 0; }
  }
`;
document.head.appendChild(style);



// ===========================================
// 14. AI MANIFESTO TERMINAL (looping typewriter)
// ===========================================
function initHeroTerminalManifesto() {
    const pre  = document.getElementById('ai-manifesto');
    if (!pre) return;
    const code = pre.querySelector('code') || pre;
  
    const LINES = [
      "/*",
      "  TEKNOIFY :: AI MANIFESTO",
      "  Build AI that is: Useful · Reliable · Respectful · Measurable",
      "*/",
      "",
      "#!/usr/bin/env teknoify",
      "spec.version = \"0.1.1\"",
      "spec.tagline = \"Innovate · Integrate · Inspire\"",
      "",
      "principles = [",
      "  \"Human-in-the-loop\",",
      "  \"Safety-first\",",
      "  \"Transparency\",",
      "  \"Data minimization\",",
      "  \"Reproducibility\"",
      "]",
      "",
      "layers = {",
      "  ingestion:  [\"sheets\", \"sftp\", \"apis\", \"web\"],",
      "  storage:    [\"bigquery\", \"warehouse\"],",
      "  retrieval:  [\"bm25\", \"vector\", \"hybrid\"],",
      "  orchestration: [\"workflows\", \"schedulers\", \"slas\"],",
      "  governance: { pii_scanner: true, audit_log: true, red_team: true }",
      "}",
      "",
      "class Assistant:",
      "  def __init__(self, tools, memory, policy):",
      "    self.tools  = tools",
      "    self.mem    = memory",
      "    self.policy = policy",
      "",
      "  def route(self, intent):",
      "    if intent in [\"scrape\", \"clean\", \"export\"]: return \"pipeline\"",
      "    if intent in [\"ask\", \"summarize\", \"decide\"]: return \"reason\"",
      "    return \"fallback\"",
      "",
      "  def reason(self, query):",
      "    context = retrieve(query)",
      "    plan    = draft_plan(query, context)",
      "    return execute(plan)",
      "",
      "  def pipeline(self, job):",
      "    stage(\"fetch\",  connectors.pull(job.sources))",
      "    stage(\"validate\",validators.schema(job.rules))",
      "    stage(\"transform\",etl.cleanse(job.transforms))",
      "    stage(\"publish\", sinks.to(job.dest))",
      "",
      "  def evals(self):",
      "    metrics = {",
      "      latency_ms: p95(),",
      "      accuracy:   exact_match(),",
      "      grounding:  cite_ratio(),",
      "      safety:     red_flag_rate(),",
      "    }",
      "    return metrics",
      "",
      "policy = {",
      "  privacy:  { minimize_data: true, encrypt_at_rest: true },",
      "  safety:   { refuse_harm: true, traceability: \"full\" },",
      "  style:    { tone: \"clear\", cite: \"when_external\" }",
      "}",
      "",
      "// Data Source — Google Trends",
      "trends = TrendsClient(auth=\"service-account\")",
      "",
      "// Trends job (weekly monitoring)",
      "job.trends_monitor = {",
      "  topics:   [\"e-ticaret\", \"yapay zeka\", \"robotik\"],",
      "  geo:      \"TR\",",
      "  interval: \"now 7-d\",",
      "  metrics:  [\"interest_over_time\", \"top_queries\", \"rising_queries\"],",
      "  dest:     \"sheets://TrendsWeekly\"",
      "}",
      "",
      "// Pipeline plan for trends",
      "def build_trends_pipeline(job):",
      "  data   = trends.fetch(topics=job.topics, geo=job.geo, interval=job.interval, metrics=job.metrics)",
      "  clean  = etl.cleanse([\"normalize.whitespace\", \"dedupe.rows\"])(data)",
      "  norms  = normalize(clean.interest_over_time, method=\"zscore\")",
      "  spikes = detect_spikes(series=norms, sigma=2.0)",
      "  report = compose_report(data, spikes)",
      "  return sinks.to(job.dest)(report)",
      "",
      "// Action",
      "run(build_trends_pipeline(job.trends_monitor))",
      "-> analyze.trendshift(threshold=0.25)",
      "-> notify.email(to=\"ops@teknoify.com\", subject=\"Weekly Trends Report\")",
      "",
      "// Guardrails",
      "assert(PII.scan(input)   == false)",
      "assert(prompt.jailbreaks == blocked)",
      "assert(secrets.leak      == none)",
      "",
      "// Observability",
      "trace.enable(); metrics.push({stage:\"retrieval\", took_ms: 58})",
      "metrics.push({stage:\"reason\",    tokens: 1024, cites: 3})",
      "",
      "// Human Feedback",
      "hxl.loop(sample=10%) -> label { helpfulness, harmlessness, groundedness }",
      "",
      "// Deployment",
      "containers = docker.build({",
      "  api: \"gpt-service\",",
      "  worker: \"etl-service\",",
      "  scheduler: \"cron-service\"",
      "})",
      "deploy(cluster=\"teknoify-prod\", replicas=3)",
      "",
      "// Final Check",
      "ok = all([tests.pass, evals.above(0.9), budgets.within])",
      "if ok: ship(tag=\"v0.1.1\") else: rollback()",
      "",
      "/* ——— End of pass. Rebuilding from scratch (loop) ——— */",
      ""
    ];
  
    const CHAR_DELAY = 14;   // karakter arası (ms)
    const LINE_DELAY = 260;  // satır arası bekleme (ms)
    const LOOP_DELAY = 1200; // tüm blok bitince bekleme (ms)
  
    let li = 0, ci = 0;
  
    function writeNext() {
      if (li >= LINES.length) {
        setTimeout(() => { code.textContent = ""; li = 0; ci = 0; writeNext(); }, LOOP_DELAY);
        return;
      }
      const line = LINES[li];
  
      if (ci === 0 && li > 0) code.textContent += "\n";
      code.textContent += line.charAt(ci);
      ci++;
  
      pre.scrollTop = pre.scrollHeight;
  
      if (ci < line.length) {
        setTimeout(writeNext, CHAR_DELAY);
      } else {
        li++; ci = 0;
        setTimeout(writeNext, LINE_DELAY);
      }
    }
  
    writeNext();
  }
  