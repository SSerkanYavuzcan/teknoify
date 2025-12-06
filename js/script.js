/**
 * ================================================================
 * [PROJECT] TEKNOIFY v2.0 - MAIN CONTROLLER
 * [FILE] js/script.js
 * [DESC] UI, Auth ve Animasyonları yöneten ana beyin.
 * ================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log("🚀 [System] Sayfa yüklendi, Uygulama başlatılıyor...");
  App.init();
});

/**
* [CONTROLLER] APP
* Tüm modülleri başlatan yönetici nesne.
*/
const App = {
  init: () => {
      // 1. Session Manager Kontrolü (Hata Önleyici)
      let sessionMgr = null;
      
      // SessionManager sınıfı js/session-manager.js dosyasından gelmeli.
      // Eğer o dosya yüklenmediyse site hata vermesin diye kontrol ediyoruz.
      if (typeof SessionManager !== 'undefined') {
          sessionMgr = new SessionManager();
          console.log("✅ [Auth] SessionManager aktif.");
      } else {
          console.error("❌ [Auth] HATA: SessionManager bulunamadı! Lütfen index.html'de script sıralamasını kontrol et.");
      }
      
      // 2. Sistemleri Başlat
      new AuthSystem(sessionMgr); // Giriş sistemi
      new UISystem();             // Menü ve arayüz sistemi

      // 3. Görsel Efektler (Sayfa açılışını yavaşlatmaması için 200ms bekletiyoruz)
      setTimeout(() => {
          if (document.querySelector('#heroTerminal')) new TerminalEffect('#heroTerminal');
          if (document.querySelector('#stars-container')) new BackgroundFX('#stars-container');
      }, 200);
  }
};

/**
* [MODULE 1] AUTH SYSTEM
* Giriş yapma, çıkış yapma ve modal pencerelerini yönetir.
*/
class AuthSystem {
  constructor(sessionManager) {
      this.session = sessionManager;
      this.modal = document.getElementById('loginModal');
      this.triggers = document.querySelectorAll('#openLoginBtn, .trigger-login'); // Header ve Hero butonları
      
      // Eğer kullanıcı zaten giriş yapmışsa UI'ı güncelle
      if(this.session) this.checkAuthStatus();
      
      this.bindEvents();
  }

  bindEvents() {
      // "Giriş Yap" butonlarına tıklama olayı
      this.triggers.forEach((btn) => {
          btn.addEventListener('click', (e) => {
              e.preventDefault();
              
              // Eğer oturum varsa -> Çıkış/Profil mantığı
              if(this.session && this.session.validateSession()) {
                 this.handleLogout(); // Veya profile git
              } 
              // Oturum yoksa -> Modalı aç
              else {
                 this.open();
              }
          });
      });

      // Modalı Kapatma (X butonu)
      const closeBtn = document.querySelector('.modal-close');
      if(closeBtn) {
          closeBtn.addEventListener('click', () => this.close());
      }

      // Modalı Kapatma (Siyah alana tıklama)
      if(this.modal) {
          this.modal.addEventListener('click', (e) => {
              if (e.target === this.modal) this.close();
          });
      }
      
      // Form Gönderimi (Submit)
      const form = document.getElementById('loginForm');
      if(form) form.addEventListener('submit', (e) => this.handleSubmit(e));
      
      // ESC tuşu ile kapatma
      document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape' && this.modal && this.modal.classList.contains('active')) {
              this.close();
          }
      });
  }

  // Modalı Aç
  open() {
      if(this.modal) {
          this.modal.classList.add('active');
          document.body.style.overflow = 'hidden'; // Arka plan scroll'unu kilitle
      }
  }

  // Modalı Kapat
  close() {
      if(this.modal) {
          this.modal.classList.remove('active');
          document.body.style.overflow = '';
      }
  }

  // Sayfa yüklendiğinde kullanıcıyı tanı
  checkAuthStatus() {
      const user = this.session.validateSession();
      if (user) {
          console.log(`👤 [Auth] Hoşgeldin: ${user.name} (${user.role})`);
          this.updateUIForLoggedInUser(user);
      }
  }

  // Giriş Formu Gönderildiğinde Çalışan Fonksiyon
  handleSubmit(e) {
      e.preventDefault();
      
      const btn = document.querySelector('#loginForm button[type="submit"]');
      const emailVal = document.getElementById('email').value.toLowerCase(); // Küçük harfe çevir
      
      // Butonu "Yükleniyor" moduna al
      if(btn) {
          const originalText = btn.innerHTML;
          btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Kontrol Ediliyor...';
          btn.disabled = true;
      }

      // Backend Simülasyonu (1 saniye beklet)
      setTimeout(() => {
          // 1. ROL BELİRLEME MANTIĞI
          // Veritabanı olmadığı için mail içeriğine bakıyoruz
          let role = 'member';        // Varsayılan rol
          let targetPage = 'member.html'; // Varsayılan sayfa

          if (emailVal.includes('admin')) {
              role = 'admin';
              targetPage = 'admin.html';
          } else if (emailVal.includes('premium')) {
              role = 'premium';
              targetPage = 'premium.html';
          }

          // 2. SESSION OLUŞTUR
          if(this.session) {
              this.session.startSession({
                  email: emailVal,
                  role: role,
                  name: emailVal.split('@')[0] // Mailin baş kısmını isim yap
              });
          }

          // 3. YÖNLENDİRME (Alert YOK!)
          // Direkt ilgili sayfaya postala
          console.log(`🚀 [Redirect] Yönlendiriliyor: dashboard/${targetPage}`);
          window.location.href = `dashboard/${targetPage}`;
          
      }, 1000);
  }
  
  // Kullanıcı giriş yapmışsa Header butonunu değiştir
  updateUIForLoggedInUser(user) {
      const loginBtn = document.getElementById('openLoginBtn');
      if(loginBtn) {
          loginBtn.innerHTML = `<i class="fas fa-user-circle"></i> ${user.name}`;
          loginBtn.classList.remove('btn-outline');
          loginBtn.classList.add('btn-secondary'); // Daha soft bir renk
          
          // Hero alanındaki "Hemen Başla" butonunu "Panele Git" yap
          const heroBtn = document.querySelector('.trigger-login');
          if(heroBtn) {
              heroBtn.textContent = "Panele Git";
              // Modalı açmasını engelle, direkt panele yönlendir
              heroBtn.classList.remove('trigger-login'); 
              heroBtn.onclick = (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Rolüne göre doğru sayfaya gönder
                  let target = 'member.html';
                  if(user.role === 'admin') target = 'admin.html';
                  if(user.role === 'premium') target = 'premium.html';
                  window.location.href = `dashboard/${target}`;
              };
          }
      }
  }
  
  // Çıkış Yapma
  handleLogout() {
      if(confirm("Güvenli çıkış yapmak istiyor musunuz?")) {
          if(this.session) this.session.destroySession();
          window.location.reload();
      }
  }
}

/**
* [MODULE 2] UI SYSTEM
* Navbar, Scroll ve Mobil Menü işlemleri.
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
      // Scroll olunca header'ı karart
      window.addEventListener('scroll', () => this.handleScroll(), { passive: true });

      // Hamburger menü tıklama
      if(this.hamburger) {
          this.hamburger.addEventListener('click', (e) => {
              e.stopPropagation();
              this.toggleMenu();
          });
      }

      // Linke tıklayınca menüyü kapat (Mobil için)
      this.navLinks.forEach(link => {
          link.addEventListener('click', () => {
              if(this.navMenu && this.navMenu.classList.contains('active')) this.toggleMenu();
          });
      });

      // Menü dışına tıklayınca kapat
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
* Hero alanındaki kod yazma simülasyonu.
*/
class TerminalEffect {
  constructor(selector) {
      this.container = document.querySelector(selector);
      if (!this.container) return;

      // Ekrana yazılacak senaryo
      this.lines = [
          { type: 'comment', text: '# Teknoify Core v2.4 initialized' },
          { type: 'code', text: 'import automation_bot as bot' },
          { type: 'code', text: 'data = bot.scrape(target="market_prices")' },
          { type: 'output', text: '>> Processing 1.2M data points...' },
          { type: 'success', text: '>> Optimization Complete: +42% ROI' },
          { type: 'cursor', text: '_' }
      ];
      
      this.typeSpeed = 30; // Yazma hızı
      this.lineDelay = 400; // Satır bekleme süresi
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
              lineEl.classList.add('blink-cursor'); // CSS'te yanıp sönme efekti var
              lineEl.textContent = lineData.text;
              resolve();
              return;
          }

          // Harf harf yazma efekti
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
* Arka plan yıldız efekti (Performanslı).
*/
class BackgroundFX {
  constructor(selector) {
      this.container = document.querySelector(selector);
      if (!this.container) return;
      
      // Mobilde az, masaüstünde çok yıldız
      this.starCount = window.innerWidth < 768 ? 20 : 50; 
      this.init();
  }

  init() {
      this.container.innerHTML = '';
      const frag = document.createDocumentFragment();

      for (let i = 0; i < this.starCount; i++) {
          const star = document.createElement('div');
          const size = Math.random() * 2 + 1; // 1px ile 3px arası
          
          star.style.cssText = `
              position: absolute;
              width: ${size}px;
              height: ${size}px;
              background: rgba(255,255,255, ${Math.random() * 0.4 + 0.1});
              left: ${Math.random() * 100}%;
              top: ${Math.random() * 100}%;
              border-radius: 50%;
              pointer-events: none;
              /* style.css'teki floatParticle animasyonunu kullanır */
              animation: floatParticle ${10 + Math.random() * 20}s linear infinite;
              animation-delay: -${Math.random() * 20}s;
          `;
          frag.appendChild(star);
      }
      this.container.appendChild(frag);
  }
}


