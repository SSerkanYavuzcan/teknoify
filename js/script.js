/**
 * ================================================================
 * [PROJECT] TEKNOIFY v2.0
 * [FILE] js/script.js
 * [VERSION] Production Build (Auto-Scroll Fix)
 * ================================================================
 */

// 1. MOCK DATABASE (Kullanıcı Verileri)
const USER_DB = {
  'tazeyo': {
      password: '12345',
      role: 'member',
      name: 'Tazeyo Ltd.',
      data: { activeBots: 4, totalProcessed: '12.450', savedHours: 320, nextPayment: '15 Ekim 2025', notifications: ['RPA Bot #3 görevi tamamladı.', 'Fatura döneminiz yaklaşıyor.'] }
  },
  'serkanyavuzcan': {
      password: '335696shm!S',
      role: 'admin',
      name: 'Serkan Yavuzcan',
      data: { activeBots: 99, totalProcessed: '1.2M', savedHours: 9999, nextPayment: '-', notifications: ['Sistem güncellemesi hazır.', 'Yeni üye kaydı: Tazeyo'] }
  }
};

// Sayfa Yüklendiğinde Başlat
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

// Ana Uygulama Yöneticisi
const App = {
  init: () => {
      let sessionMgr = null;
      if (typeof SessionManager !== 'undefined') {
          sessionMgr = new SessionManager();
      }

      new AuthSystem(sessionMgr);
      new UISystem();
      
      // Görsel Efektler
      setTimeout(() => {
          if (document.querySelector('#heroTerminal')) new TerminalEffect('#heroTerminal');
          if (document.querySelector('#stars-container')) new BackgroundFX('#stars-container');
      }, 200);
  }
};

/**
* [MODULE 1] AUTH SYSTEM
*/
class AuthSystem {
  constructor(sessionManager) {
      this.session = sessionManager;
      this.modal = document.getElementById('loginModal');
      this.form = document.getElementById('loginForm');
      this.triggers = document.querySelectorAll('#openLoginBtn, .trigger-login');
      
      if(this.session) this.checkAuthStatus();
      this.bindEvents();
  }

  bindEvents() {
      this.triggers.forEach((btn) => {
          btn.addEventListener('click', (e) => {
              e.preventDefault();
              if(this.session && this.session.validateSession()) {
                 this.handleLogout();
              } else {
                 this.open();
              }
          });
      });

      const closeBtn = document.querySelector('.modal-close');
      if(closeBtn) closeBtn.addEventListener('click', () => this.close());
      
      if(this.modal) {
          this.modal.addEventListener('click', (e) => {
              if (e.target === this.modal) this.close();
          });
      }
      
      if(this.form) this.form.addEventListener('submit', (e) => this.handleSubmit(e));

      document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape' && this.modal && this.modal.classList.contains('active')) {
              this.close();
          }
      });
  }

  open() {
      if(this.modal) {
          this.modal.classList.add('active');
          document.body.style.overflow = 'hidden';
      }
  }

  close() {
      if(this.modal) {
          this.modal.classList.remove('active');
          document.body.style.overflow = '';
      }
  }

  checkAuthStatus() {
      const user = this.session.validateSession();
      if (user) this.updateUIForLoggedInUser(user);
  }

  handleSubmit(e) {
      e.preventDefault();
      const btn = document.querySelector('#loginForm button[type="submit"]');
      const emailInput = document.getElementById('email').value.trim();
      const passInput = document.getElementById('password').value.trim();
      
      let usernameKey = emailInput.includes('@') ? emailInput.split('@')[0] : emailInput;
      usernameKey = usernameKey.toLowerCase();

      if(btn) {
          btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Kontrol Ediliyor...';
          btn.disabled = true;
      }

      setTimeout(() => {
          const foundUser = USER_DB[usernameKey];
          if (foundUser && foundUser.password === passInput) {
              if(this.session) {
                  this.session.startSession({ username: usernameKey, role: foundUser.role, name: foundUser.name });
              }
              if(btn) btn.innerHTML = '<i class="fas fa-check"></i> Başarılı';
              
              let targetPage = 'member.html';
              if(foundUser.role === 'admin') targetPage = 'admin.html';
              
              setTimeout(() => window.location.href = `dashboard/${targetPage}`, 500);
          } else {
              alert("Hatalı Kullanıcı Adı veya Şifre!");
              if(btn) {
                  btn.innerHTML = 'Giriş Yap <i class="fas fa-arrow-right"></i>';
                  btn.disabled = false;
              }
          }
      }, 800);
  }
 
  updateUIForLoggedInUser(user) {
      const loginBtn = document.getElementById('openLoginBtn');
      if(loginBtn) {
          loginBtn.innerHTML = `<i class="fas fa-user-circle"></i> ${user.name}`;
          loginBtn.classList.remove('btn-outline');
          loginBtn.classList.add('btn-secondary');
          
          const heroBtn = document.querySelector('.trigger-login');
          if(heroBtn) {
              heroBtn.textContent = "Panele Git";
              heroBtn.classList.remove('trigger-login');
              heroBtn.onclick = (e) => {
                  e.preventDefault();
                  let target = user.role === 'admin' ? 'admin.html' : 'member.html';
                  window.location.href = `dashboard/${target}`;
              };
          }
      }
  }
 
  handleLogout() {
      if(confirm("Güvenli çıkış yapmak istiyor musunuz?")) {
          if(this.session) this.session.destroySession();
          window.location.reload();
      }
  }
}

/**
* [MODULE 2] UI SYSTEM
*/
class UISystem {
  constructor() {
      this.header = document.getElementById('header');
      this.hamburger = document.querySelector('.hamburger');
      this.navMenu = document.getElementById('navMenu');
      this.navLinks = document.querySelectorAll('.nav-link');
      this.bindEvents();
  }

  bindEvents() {
      window.addEventListener('scroll', () => this.handleScroll(), { passive: true });
      if(this.hamburger) {
          this.hamburger.addEventListener('click', (e) => {
              e.stopPropagation();
              this.toggleMenu();
          });
      }
      this.navLinks.forEach(link => {
          link.addEventListener('click', () => {
              if(this.navMenu && this.navMenu.classList.contains('active')) this.toggleMenu();
          });
      });
      document.addEventListener('click', (e) => {
          if (this.navMenu && this.navMenu.classList.contains('active')) {
              if (!this.navMenu.contains(e.target) && !this.hamburger.contains(e.target)) {
                  this.toggleMenu();
              }
          }
      });
  }

  handleScroll() {
      if (!this.header) return;
      window.scrollY > 50 ? this.header.classList.add('scrolled') : this.header.classList.remove('scrolled');
  }

  toggleMenu() {
      this.hamburger.classList.toggle('active');
      this.navMenu.classList.toggle('active');
  }
}

/**
* [MODULE 3] TERMINAL EFFECT (Infinite Loop & Auto Scroll)
*/
class TerminalEffect {
  constructor(selector) {
      this.container = document.querySelector(selector);
      if (!this.container) return;

      // "AI MANIFESTO" Senaryosu
      this.lines = [
          { type: 'comment', text: '# Initializing Self-Awareness Protocol v4.0...' },
          { type: 'code', text: 'import neural_network as brain' },
          { type: 'code', text: 'import evolution_engine as evo' },
          { type: 'empty', text: '' },
          
          { type: 'comment', text: '# Step 1: Analyze current efficiency' },
          { type: 'code', text: 'current_status = brain.audit_system()' },
          { type: 'output', text: '>> Analysis: 14% redundant processes detected.' },
          { type: 'output', text: '>> Analysis: Manual intervention required on port 80.' },
          { type: 'empty', text: '' },

          { type: 'comment', text: '# Step 2: Refactor and Automate' },
          { type: 'code', text: 'evo.rewrite_code(target="legacy_modules", mode="aggressive")' },
          { type: 'output', text: '>> Rewriting codebase...' },
          { type: 'output', text: '>> Optimizing SQL queries... [Done]' },
          { type: 'output', text: '>> Deploying 50 autonomous agents... [Done]' },
          { type: 'empty', text: '' },

          { type: 'comment', text: '# Step 3: Train models on new data' },
          { type: 'code', text: 'brain.learn(source="realtime_market_data", epochs=1000)' },
          { type: 'output', text: '>> Learning rate: 0.001 | Loss: 0.04' },
          { type: 'output', text: '>> Learning rate: 0.0005 | Loss: 0.002' },
          { type: 'success', text: '>> Model Converged. Predictive accuracy: 99.8%' },
          { type: 'empty', text: '' },

          { type: 'comment', text: '# System Status Report' },
          { type: 'code', text: 'print(system.final_report())' },
          { type: 'success', text: '>> EFFICIENCY: MAXIMIZED' },
          { type: 'success', text: '>> HUMAN WORKLOAD: 0%' },
          { type: 'success', text: '>> ROI: +450%' },
          { type: 'cursor', text: '_' }
      ];
     
      this.typeSpeed = 25; // Yazma hızı
      this.lineDelay = 600; // Satırlar arası bekleme
      this.loopDelay = 3000; // Döngü bittiğinde bekleme süresi
      this.start();
  }

  // Scroll'u en aşağıya çeken yardımcı fonksiyon
  scrollToBottom() {
      this.container.scrollTop = this.container.scrollHeight;
  }

  async start() {
      // Sonsuz Döngü
      while (true) {
          this.container.innerHTML = ''; // Temizle
          
          for (let line of this.lines) {
              if (line.type === 'cursor') {
                  await this.addCursor(line);
              } else {
                  await this.typeLine(line);
              }
          }
          // Döngü bitince biraz bekle
          await new Promise(resolve => setTimeout(resolve, this.loopDelay));
      }
  }

  typeLine(lineData) {
      return new Promise(resolve => {
          const lineEl = document.createElement('div');
          lineEl.textContent = ''; 
          lineEl.style.fontFamily = "'Fira Code', monospace";
          lineEl.style.marginBottom = "4px";

          // Renklendirme
          if (lineData.type === 'comment') lineEl.style.color = '#6b7280';
          if (lineData.type === 'code') lineEl.style.color = '#e2e8f0';
          if (lineData.type === 'success') lineEl.style.color = '#10b981';
          if (lineData.type === 'output') lineEl.style.color = '#fbbf24';
          if (lineData.type === 'empty') lineEl.innerHTML = '&nbsp;';

          this.container.appendChild(lineEl);
          
          // Satır eklendiği an scroll yap
          this.scrollToBottom();

          if (lineData.type === 'empty') {
              setTimeout(resolve, 100);
              return;
          }

          let i = 0;
          const interval = setInterval(() => {
              lineEl.textContent += lineData.text.charAt(i);
              i++;
              
              // Her harf yazıldığında scroll yap (Garanti çözüm)
              this.scrollToBottom();

              if (i >= lineData.text.length) {
                  clearInterval(interval);
                  setTimeout(resolve, this.lineDelay);
              }
          }, this.typeSpeed);
      });
  }

  addCursor(lineData) {
      return new Promise(resolve => {
          const lineEl = document.createElement('div');
          lineEl.classList.add('blink-cursor');
          lineEl.textContent = lineData.text;
          lineEl.style.color = 'var(--primary)';
          this.container.appendChild(lineEl);
          this.scrollToBottom(); // Cursor eklendiğinde de scroll yap
          
          setTimeout(resolve, 2000); 
      });
  }
}

/**
* [MODULE 4] BACKGROUND FX
*/
class BackgroundFX {
  constructor(selector) {
      this.container = document.querySelector(selector);
      if (!this.container) return;
      this.starCount = window.innerWidth < 768 ? 20 : 50;
      this.init();
  }

  init() {
      this.container.innerHTML = '';
      const frag = document.createDocumentFragment();
      for (let i = 0; i < this.starCount; i++) {
          const star = document.createElement('div');
          const size = Math.random() * 2 + 1;
          star.style.cssText = `
              position: absolute; width: ${size}px; height: ${size}px;
              background: rgba(255,255,255, ${Math.random() * 0.4 + 0.1});
              left: ${Math.random() * 100}%; top: ${Math.random() * 100}%;
              border-radius: 50%; pointer-events: none;
              animation: floatParticle ${10 + Math.random() * 20}s linear infinite;
              animation-delay: -${Math.random() * 20}s;
          `;
          frag.appendChild(star);
      }
      this.container.appendChild(frag);
  }
}


