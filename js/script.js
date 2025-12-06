/**
 * ================================================================
 * [PROJECT] TEKNOIFY v2.0
 * [FILE] script.js
 * [ARCH] Component-Based / Class-Driven (Python-like Structure)
 * ================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // Tüm sistemleri başlat
  App.init();
});

/**
* [CONTROLLER] APP
* Tüm alt modülleri yöneten ana kumanda merkezi.
*/
const App = {
  init: () => {
      // 1. Kritik Sistemler (Önce yüklenmeli)
      new AuthSystem();  // Login işlemleri
      new UISystem();    // Menü ve Scroll işlemleri

      // 2. Görsel/Yan Sistemler (Sayfa açıldıktan sonra çalışabilir)
      // Performans için küçük bir gecikmeyle başlatıyoruz
      setTimeout(() => {
          new TerminalEffect('#heroTerminal');
          new BackgroundFX('#stars-container');
      }, 100);
  }
};

/**
* [MODULE 1] AUTH SYSTEM
* Login modalı ve giriş işlemlerini yönetir.
*/
class AuthSystem {
  constructor() {
      // DOM Elemanlarını Seç
      this.modal = document.getElementById('loginModal');
      this.closeBtn = document.querySelector('.modal-close');
      this.form = document.getElementById('loginForm');
      
      // Tetikleyiciler (Hem header butonu hem hero butonu)
      this.triggers = document.querySelectorAll('#openLoginBtn, .trigger-login');
      
      this.bindEvents();
  }

  bindEvents() {
      // Açma butonları
      this.triggers.forEach(btn => {
          btn.addEventListener('click', (e) => {
              e.preventDefault();
              this.open();
          });
      });

      // Kapatma butonu
      if(this.closeBtn) {
          this.closeBtn.addEventListener('click', () => this.close());
      }

      // Dışarı tıklayınca kapatma (Overlay)
      if(this.modal) {
          this.modal.addEventListener('click', (e) => {
              if (e.target === this.modal) this.close();
          });
      }

      // Form Gönderimi (Simülasyon)
      if(this.form) {
          this.form.addEventListener('submit', (e) => this.handleSubmit(e));
      }

      // Klavye ile kapatma (ESC)
      document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape' && this.modal.classList.contains('active')) {
              this.close();
          }
      });
  }

  open() {
      this.modal.classList.add('active');
      document.body.style.overflow = 'hidden'; // Arka plan scroll'unu kilitle
  }

  close() {
      this.modal.classList.remove('active');
      document.body.style.overflow = ''; // Scroll kilidini aç
  }

  handleSubmit(e) {
      e.preventDefault();
      const btn = this.form.querySelector('button[type="submit"]');
      const originalText = btn.innerHTML;

      // Yükleniyor efekti
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Kontrol Ediliyor...';

      // Backend simülasyonu (1.5 saniye sonra)
      setTimeout(() => {
          alert('Giriş Başarılı! (Demo Modu)');
          btn.innerHTML = '<i class="fas fa-check"></i> Başarılı';
          btn.classList.add('btn-success'); // CSS'te yeşil yapılabilir
          
          setTimeout(() => {
              this.close();
              btn.disabled = false;
              btn.innerHTML = originalText;
              this.form.reset();
          }, 1000);
      }, 1500);
  }
}

/**
* [MODULE 2] UI SYSTEM
* Genel kullanıcı arayüzü, mobil menü ve header efektleri.
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
      // Scroll Efekti (Header'ı karart)
      window.addEventListener('scroll', () => this.handleScroll(), { passive: true });

      // Mobil Menü Toggle
      if(this.hamburger) {
          this.hamburger.addEventListener('click', () => this.toggleMenu());
      }

      // Menü linkine tıklanınca kapanması
      this.navLinks.forEach(link => {
          link.addEventListener('click', () => {
              if(this.navMenu.classList.contains('active')) {
                  this.toggleMenu();
              }
          });
      });
  }

  handleScroll() {
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
* Optimize edildi: Sadece görünür olduğunda çalışır.
*/
class TerminalEffect {
  constructor(selector) {
      this.container = document.querySelector(selector);
      if (!this.container) return;

      this.lines = [
          { type: 'comment', text: '# Teknoify Core System v2.0' },
          { type: 'code', text: 'import ai_module as brain' },
          { type: 'code', text: 'system = brain.Optimizer(target="business")' },
          { type: 'output', text: '>> Analysing workflow...' },
          { type: 'success', text: '>> Efficiency increased by %300' },
          { type: 'cursor', text: '_' }
      ];
      
      this.typeSpeed = 40; // Yazma hızı (ms)
      this.lineDelay = 400; // Satır arası bekleme (ms)
      
      this.start();
  }

  async start() {
      for (let line of this.lines) {
          await this.typeLine(line);
      }
  }

  typeLine(lineData) {
      return new Promise(resolve => {
          const lineEl = document.createElement('div');
          
          // Renklendirme sınıfları (CSS ile stillendirilecek)
          if (lineData.type === 'comment') lineEl.style.color = '#6b7280';
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
* Hafif yıldız efekti (Canvas yerine DOM kullanıldı, daha basit)
*/
class BackgroundFX {
  constructor(selector) {
      this.container = document.querySelector(selector);
      if (!this.container) return;
      
      // Mobil cihazlarda sayıyı azalt (Performans için)
      this.starCount = window.innerWidth < 768 ? 20 : 50; 
      this.init();
  }

  init() {
      for (let i = 0; i < this.starCount; i++) {
          const star = document.createElement('div');
          star.style.position = 'absolute';
          star.style.width = Math.random() * 2 + 'px';
          star.style.height = star.style.width;
          star.style.background = 'rgba(255,255,255,' + (Math.random() * 0.5 + 0.1) + ')';
          star.style.left = Math.random() * 100 + '%';
          star.style.top = Math.random() * 100 + '%';
          star.style.borderRadius = '50%';
          star.style.pointerEvents = 'none';
          
          // CSS Animasyonu Ekle (style.css'te tanımlanabilir veya buraya inline)
          star.style.transition = 'opacity 2s ease-in-out';
          
          this.container.appendChild(star);
      }
  }
}


