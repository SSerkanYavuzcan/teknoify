/**
 * ================================================================
 * [PROJECT] TEKNOIFY v2.0 - DEBUG MODU (FIXED)
 * ================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log("🚀 1. Sayfa yüklendi, JS başladı.");
  App.init();
});

const App = {
  init: () => {
      console.log("⚙️ 2. App.init() çalışıyor...");
      
      // Session Manager Kontrolü
      let sessionMgr = null;
      
      // HATA DUZELTME: SessionManager sınıfını burada tanımlamıyoruz.
      // session-manager.js dosyasından gelip gelmediğini kontrol ediyoruz.
      if (typeof SessionManager !== 'undefined') {
          sessionMgr = new SessionManager();
          console.log("✅ SessionManager başarıyla yüklendi ve başlatıldı.");
      } else {
          console.error("❌ HATA: SessionManager BULUNAMADI! index.html dosyasında 'session-manager.js' script.js'den ÖNCE eklenmiş mi?");
      }
      
      new AuthSystem(sessionMgr);
      new UISystem();

      // Görsel efektler (200ms gecikmeli)
      setTimeout(() => {
          if (document.querySelector('#heroTerminal')) new TerminalEffect('#heroTerminal');
          if (document.querySelector('#stars-container')) new BackgroundFX('#stars-container');
      }, 200);
  }
};

class AuthSystem {
  constructor(sessionManager) {
      this.session = sessionManager;
      this.modal = document.getElementById('loginModal');
      this.triggers = document.querySelectorAll('#openLoginBtn, .trigger-login');
      
      console.log(`🔍 3. Login butonları aranıyor... Bulunan sayı: ${this.triggers.length}`);
      
      if (!this.modal) console.error("❌ HATA: 'loginModal' ID'li div bulunamadı!");
      
      // Başlangıçta oturum kontrolü
      if(this.session) this.checkAuthStatus();
      
      this.bindEvents();
  }

  bindEvents() {
      // Butonlara tıklama olayı
      this.triggers.forEach((btn, index) => {
          // Butonun davranışını görelim
          btn.addEventListener('click', (e) => {
              e.preventDefault();
              console.log("🖱️ Login butonuna tıklandı!");
              
              if(this.session && this.session.validateSession()) {
                 console.log("🔒 Kullanıcı zaten giriş yapmış. Çıkış/Profil işlemi.");
                 this.handleLogout();
              } else {
                 console.log("🔓 Kullanıcı giriş yapmamış. Modal açılıyor...");
                 this.open();
              }
          });
      });

      // Kapatma butonu
      const closeBtn = document.querySelector('.modal-close');
      if(closeBtn) {
          closeBtn.addEventListener('click', () => this.close());
      }

      // Overlay'e tıklayınca kapatma
      if(this.modal) {
          this.modal.addEventListener('click', (e) => {
              if (e.target === this.modal) this.close();
          });
      }
      
      // Form submit
      const form = document.getElementById('loginForm');
      if(form) form.addEventListener('submit', (e) => this.handleSubmit(e));
  }

  open() {
      if(this.modal) {
          this.modal.classList.add('active');
          document.body.style.overflow = 'hidden'; // Scrollu kilitle
          console.log("✅ Modal açıldı (active sınıfı eklendi).");
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
          console.log("👤 Aktif kullanıcı bulundu:", user.role);
          this.updateUIForLoggedInUser(user);
      }
  }

  handleSubmit(e) {
      e.preventDefault();
      console.log("📝 Form gönderiliyor...");
      
      const btn = document.querySelector('#loginForm button[type="submit"]');
      const emailVal = document.getElementById('email').value;
      
      if(btn) {
          btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
          btn.disabled = true;
      }

      // Backend Simülasyonu
      setTimeout(() => {
          alert("Giriş Başarılı! Dashboard'a yönlendiriliyorsunuz...");
          
          // Mock Data oluştur ve SessionManager'a kaydet
          let role = 'member';
          if(emailVal.includes('admin')) role = 'admin';
          
          if(this.session) {
              this.session.startSession({
                  email: emailVal,
                  role: role,
                  name: emailVal.split('@')[0]
              });
          }
          
          // Yönlendirme
          window.location.href = 'dashboard/index.html';
      }, 1000);
  }
  
  updateUIForLoggedInUser(user) {
      const loginBtn = document.getElementById('openLoginBtn');
      if(loginBtn) {
          loginBtn.innerHTML = `<i class="fas fa-user-circle"></i> ${user.name}`;
          loginBtn.classList.remove('btn-outline');
          loginBtn.classList.add('btn-secondary');
      }
  }
  
  handleLogout() {
      if(confirm("Çıkış yapmak istiyor musunuz?")) {
          if(this.session) this.session.destroySession();
          window.location.reload();
      }
  }
}

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
      if (window.scrollY > 50) this.header.classList.add('scrolled');
      else this.header.classList.remove('scrolled');
  }
  toggleMenu() {
      this.hamburger.classList.toggle('active');
      this.navMenu.classList.toggle('active');
  }
}

class TerminalEffect {
  constructor(selector) {
      this.container = document.querySelector(selector);
      if (!this.container) return;
      this.lines = [
          { type: 'comment', text: '# Teknoify Core v2.4 initialized' },
          { type: 'code', text: 'import automation_bot as bot' },
          { type: 'success', text: '>> System Ready' },
          { type: 'cursor', text: '_' }
      ];
      this.typeSpeed = 35; this.lineDelay = 450;
      this.start();
  }
  async start() {
      this.container.innerHTML = '';
      for (let line of this.lines) await this.typeLine(line);
  }
  typeLine(lineData) {
      return new Promise(resolve => {
          const lineEl = document.createElement('div');
          lineEl.textContent = lineData.text;
          // Basit stil atamaları (JS ile hızlı çözüm)
          if(lineData.type === 'comment') lineEl.style.color = '#666';
          if(lineData.type === 'success') lineEl.style.color = '#10b981';
          
          this.container.appendChild(lineEl);
          resolve();
      });
  }
}

class BackgroundFX {
  constructor(selector) {
      this.container = document.querySelector(selector);
      if (!this.container) return;
      this.init();
  }
  init() {
      // Yıldızlar
  }
}


