/**
 * ================================================================
 * [PROJECT] TEKNOIFY v2.0
 * [FILE] js/script.js
 * [VERSION] Full Production Build (No placeholders)
 * ================================================================
 */

// 1. MOCK DATABASE (Kullanıcı Verileri Burada Tanımlı)
const USER_DB = {
  // Member Kullanıcısı (Tazeyo)
  'tazeyo': {
      password: '85T!1s', // Özel Şifre
      role: 'member',
      name: 'Tazeyo Ltd.',
      // Kişiye Özel Dashboard Verileri
      data: {
          activeBots: 4,
          totalProcessed: '12.450',
          savedHours: 320,
          nextPayment: '15 Ekim 2025',
          notifications: [
              'RPA Bot #3 görevi tamamladı.',
              'Fatura döneminiz yaklaşıyor.'
          ]
      }
  },
  // Admin Kullanıcısı (Serkan)
  'serkanyavuzcan': {
      password: '335696shm!S', // Özel Şifre
      role: 'admin',
      name: 'Serkan Yavuzcan',
      data: {
          activeBots: 99, // Admin her şeyi görür
          totalProcessed: '1.2M',
          savedHours: 9999,
          nextPayment: '-',
          notifications: ['Sistem güncellemesi hazır.', 'Yeni üye kaydı: Tazeyo']
      }
  }
};

// Sayfa Yüklendiğinde Başlat
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

// Ana Uygulama Yöneticisi
const App = {
  init: () => {
      // Session Manager Kontrolü (Hata vermemesi için)
      let sessionMgr = null;
      if (typeof SessionManager !== 'undefined') {
          sessionMgr = new SessionManager();
      } else {
          console.warn("SessionManager bulunamadı. Login çalışmayabilir.");
      }

      // Sistemleri Başlat
      new AuthSystem(sessionMgr);
      new UISystem();
      
      // Görsel Efektler (Performans için gecikmeli)
      setTimeout(() => {
          if (document.querySelector('#heroTerminal')) new TerminalEffect('#heroTerminal');
          if (document.querySelector('#stars-container')) new BackgroundFX('#stars-container');
      }, 200);
  }
};

/**
* [MODULE 1] AUTH SYSTEM
* Giriş, Çıkış ve Modal Yönetimi
*/
class AuthSystem {
  constructor(sessionManager) {
      this.session = sessionManager;
      this.modal = document.getElementById('loginModal');
      this.form = document.getElementById('loginForm');
      this.triggers = document.querySelectorAll('#openLoginBtn, .trigger-login');
      
      // Eğer kullanıcı zaten giriş yapmışsa arayüzü güncelle
      if(this.session) this.checkAuthStatus();
      
      this.bindEvents();
  }

  bindEvents() {
      // Login butonları
      this.triggers.forEach((btn) => {
          btn.addEventListener('click', (e) => {
              e.preventDefault();
              // Oturum varsa çıkış/profil, yoksa modal aç
              if(this.session && this.session.validateSession()) {
                 this.handleLogout();
              } else {
                 this.open();
              }
          });
      });

      // Modal Kapatma Butonu
      const closeBtn = document.querySelector('.modal-close');
      if(closeBtn) {
          closeBtn.addEventListener('click', () => this.close());
      }
      
      // Overlay Tıklama (Modal dışına tıklayınca kapat)
      if(this.modal) {
          this.modal.addEventListener('click', (e) => {
              if (e.target === this.modal) this.close();
          });
      }
      
      // Form Submit
      if(this.form) {
          this.form.addEventListener('submit', (e) => this.handleSubmit(e));
      }

      // ESC Tuşu ile Kapatma
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
      if (user) {
          this.updateUIForLoggedInUser(user);
      }
  }

  handleSubmit(e) {
      e.preventDefault();
      
      const btn = document.querySelector('#loginForm button[type="submit"]');
      const emailInput = document.getElementById('email').value.trim();
      const passInput = document.getElementById('password').value.trim();
      
      // Kullanıcı adını al (mailin @ işaretinden önceki kısmı) ve küçük harfe çevir
      // Örn: Tazeyo@gmail.com -> tazeyo
      let usernameKey = emailInput;
      if (emailInput.includes('@')) {
          usernameKey = emailInput.split('@')[0];
      }
      usernameKey = usernameKey.toLowerCase();

      // UI: Yükleniyor
      if(btn) {
          const originalText = btn.innerHTML;
          btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Kontrol Ediliyor...';
          btn.disabled = true;
      }

      setTimeout(() => {
          // 1. KULLANICI KONTROLÜ (DATABASE)
          const foundUser = USER_DB[usernameKey];

          // Kullanıcı bulundu mu VE şifre doğru mu?
          if (foundUser && foundUser.password === passInput) {
              
              // GİRİŞ BAŞARILI
              if(this.session) {
                  this.session.startSession({
                      username: usernameKey, // Veriyi çekmek için anahtar
                      role: foundUser.role,
                      name: foundUser.name
                  });
              }

              // Buton Başarılı
              if(btn) btn.innerHTML = '<i class="fas fa-check"></i> Başarılı';

              // Yönlendirme
              let targetPage = 'member.html';
              if(foundUser.role === 'admin') targetPage = 'admin.html';
              if(foundUser.role === 'premium') targetPage = 'premium.html';
              
              // 500ms sonra yönlendir
              setTimeout(() => {
                  window.location.href = `dashboard/${targetPage}`;
              }, 500);

          } else {
              // HATA: Yanlış Bilgi
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
          
          // Hero alanındaki butonu güncelle
          const heroBtn = document.querySelector('.trigger-login');
          if(heroBtn) {
              heroBtn.textContent = "Panele Git";
              heroBtn.classList.remove('trigger-login'); 
              heroBtn.onclick = (e) => {
                  e.preventDefault();
                  // Rolüne göre yönlendir
                  let target = 'member.html';
                  if(user.role === 'admin') target = 'admin.html';
                  if(user.role === 'premium') target = 'premium.html';
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
* Navbar, Scroll ve Mobil Menü
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
      // Scroll Efekti
      window.addEventListener('scroll', () => this.handleScroll(), { passive: true });

      // Hamburger Menü
      if(this.hamburger) {
          this.hamburger.addEventListener('click', (e) => {
              e.stopPropagation();
              this.toggleMenu();
          });
      }

      // Link Tıklama (Menüyü Kapat)
      this.navLinks.forEach(link => {
          link.addEventListener('click', () => {
              if(this.navMenu && this.navMenu.classList.contains('active')) {
                  this.toggleMenu();
              }
          });
      });

      // Dışarı Tıklama (Menüyü Kapat)
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
      if (window.scrollY > 50) {
          this.header.classList.add('scrolled');
      } else {
          this.header.classList.remove('scrolled');
      }
  }

  toggleMenu() {
      this.hamburger.classList.toggle('active');
      this.navMenu.classList.toggle('active');
  }
}

/**
* [MODULE 3] TERMINAL EFFECT
* Hero alanındaki kod yazma simülasyonu
*/
class TerminalEffect {
  constructor(selector) {
      this.container = document.querySelector(selector);
      if (!this.container) return;

      this.lines = [
          { type: 'comment', text: '# Teknoify Core v2.4 initialized' },
          { type: 'code', text: 'import automation_bot as bot' },
          { type: 'code', text: 'data = bot.scrape(target="market_prices")' },
          { type: 'output', text: '>> Processing 1.2M data points...' },
          { type: 'success', text: '>> Optimization Complete: +42% ROI' },
          { type: 'cursor', text: '_' }
      ];
      
      this.typeSpeed = 30; 
      this.lineDelay = 400;
      this.start();
  }

  async start() {
      this.container.innerHTML = '';
      for (let line of this.lines) {
          await this.typeLine(line);
      }
  }

  typeLine(lineData) {
      return new Promise(resolve => {
          const lineEl = document.createElement('div');
          lineEl.textContent = lineData.text;
          lineEl.style.fontFamily = "'Fira Code', monospace";
          lineEl.style.marginBottom = "4px";

          // Renklendirme
          if (lineData.type === 'comment') lineEl.style.color = '#6b7280';
          if (lineData.type === 'code') lineEl.style.color = '#e2e8f0';
          if (lineData.type === 'success') lineEl.style.color = '#10b981';
          if (lineData.type === 'output') lineEl.style.color = '#fbbf24';
          
          this.container.appendChild(lineEl);

          if (lineData.type === 'cursor') {
              lineEl.classList.add('blink-cursor');
              lineEl.textContent = lineData.text;
              resolve();
              return;
          }

          let i = 0;
          const interval = setInterval(() => {
              lineEl.textContent += lineData.text.charAt(i);
              i++;
              if (i >= lineData.text.length) {
                  clearInterval(interval);
                  setTimeout(resolve, this.lineDelay);
              }
          }, this.typeSpeed);
      });
  }
}

/**
* [MODULE 4] BACKGROUND FX
* Arka plan yıldız efekti
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
              position: absolute;
              width: ${size}px;
              height: ${size}px;
              background: rgba(255,255,255, ${Math.random() * 0.4 + 0.1});
              left: ${Math.random() * 100}%;
              top: ${Math.random() * 100}%;
              border-radius: 50%;
              pointer-events: none;
              animation: floatParticle ${10 + Math.random() * 20}s linear infinite;
              animation-delay: -${Math.random() * 20}s;
          `;
          frag.appendChild(star);
      }
      this.container.appendChild(frag);
  }
}


