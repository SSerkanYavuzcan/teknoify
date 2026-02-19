/**
 * ================================================================
 * [PROJECT] TEKNOIFY v3.0 - SECURE FIREBASE EDITION
 * [FILE] js/script.js
 * [SECURITY] Google Firebase Authentication & Global UI Logic
 * ================================================================
 */


// 1. FIREBASE KONFIGURASYONU (API Anahtarlarınız)
const firebaseConfig = {
    apiKey: "AIzaSyC1Id7kdU23_A7fEO1eDna0HKprvIM30E8",
    authDomain: "teknoify-9449c.firebaseapp.com",
    projectId: "teknoify-9449c",
    storageBucket: "teknoify-9449c.firebasestorage.app",
    messagingSenderId: "704314596026",
    appId: "1:704314596026:web:f63fff04c00b7a698ac083",
    measurementId: "G-1DZKJE7BXE"
};


// 2. FIREBASE'İ BAŞLAT
// Eğer daha önce başlatılmadıysa başlat (Global kontrol)
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
// Auth servisini değişkene ata
const auth = typeof firebase !== 'undefined' ? firebase.auth() : null;


// 3. SAYFA YÜKLENDİĞİNDE ÇALIŞACAK KODLAR
document.addEventListener('DOMContentLoaded', () => {
    
    // --- AUTH SİSTEMİ ---
    // Sadece Login Modalı sayfada varsa sistemi başlat
    if (document.getElementById('loginModal')) {
        new AuthSystem();
    }
   
    // --- UI SİSTEMİ ---
    // Menü, scroll efektleri vb.
    new UISystem();


    // --- İLETİŞİM SİSTEMİ ---
    // İletişim formu varsa başlat
    if (document.querySelector('.contact-form')) {
        new ContactSystem();
    }
   
    // --- GÖRSEL EFEKTLER (Global) ---
    // Performans için hafif gecikmeli başlat
    setTimeout(() => {
        // Ana sayfadaki terminal efekti (Varsa çalışır)
        if (document.querySelector('#heroTerminal')) new TerminalEffect('#heroTerminal');
        // Ana sayfadaki yıldız efekti (Varsa çalışır)
        if (document.querySelector('#stars-container')) new BackgroundFX('#stars-container');
    }, 200);
});


/**
 * [MODULE] AUTH SYSTEM (FIREBASE GİRİŞİ)
 * Kullanıcı giriş işlemlerini, modal açılıp kapanmasını ve yönlendirmeyi yönetir.
 */
class AuthSystem {
    constructor() {
        this.modal = document.getElementById('loginModal');
        this.form = document.getElementById('loginForm');
        this.triggers = document.querySelectorAll('#openLoginBtn, .trigger-login');
        this.profileMenu = null;

        this.bindEvents();
        this.checkCurrentUser();
    }


    bindEvents() {
        // Modal Açma Butonları
        this.triggers.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                // Oturum kontrolü
                const user = auth ? auth.currentUser : null;
                if (user) {
                    // Zaten giriş yapmışsa direkt panele yönlendir
                    window.location.href = '../dashboard/index.html'; // Yol yapınıza göre ayarlayın
                } else {
                    this.open();
                }
            });
        });


        // Modal Kapatma Butonu (X ikonu)
        const closeBtn = document.querySelector('.modal-close');
        if(closeBtn) closeBtn.addEventListener('click', () => this.close());
       
        // Modal Dışına Tıklayınca Kapatma
        if(this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) this.close();
            });
        }
       
        // Giriş Formu Submit Olayı
        if(this.form) this.form.addEventListener('submit', (e) => this.handleLogin(e));


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
            document.body.style.overflow = 'hidden'; // Sayfa kaydırmayı engelle
        }
    }


    close() {
        if(this.modal) {
            this.modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }


    // --- GÜVENLİ GİRİŞ İŞLEMİ (FIREBASE) ---
    handleLogin(e) {
        e.preventDefault();
       
        // Form elemanlarını seç
        const btn = this.form.querySelector('button[type="submit"]');
        const emailInput = document.getElementById('email').value.trim();
        const passInput = document.getElementById('password').value.trim();


        // Firebase Auth kontrolü
        if (!auth) {
            alert("Güvenlik sistemi başlatılamadı. Lütfen sayfayı yenileyin.");
            return;
        }


        // Buton Durumunu Değiştir (Yükleniyor)
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Kontrol Ediliyor...';
        btn.disabled = true;


        // Firebase ile Giriş Yap
        auth.signInWithEmailAndPassword(emailInput, passInput)
            .then((userCredential) => {
                // --- BAŞARILI GİRİŞ ---
                console.log("Giriş Başarılı:", userCredential.user.email);
               
                btn.innerHTML = '<i class="fas fa-check"></i> Giriş Başarılı';
                btn.style.backgroundColor = '#10b981'; // Yeşil renk
               
                // Kısa bir gecikmeyle yönlendir
                setTimeout(() => {
                    // Kullanıcıyı dashboard'a yönlendir
                    // Not: Klasör yapınıza göre burayı '../dashboard/index.html' yapmanız gerekebilir.
                    window.location.href = '../dashboard/index.html'; 
                }, 1000);
            })
            .catch((error) => {
                // --- GİRİŞ HATASI ---
                console.error("Giriş Hatası:", error);
               
                let msg = "Giriş başarısız. Lütfen bilgilerinizi kontrol edin.";
               
                // Hata kodlarını Türkçeleştirme
                switch (error.code) {
                    case 'auth/user-not-found':
                    case 'auth/invalid-credential':
                        msg = "Böyle bir kullanıcı bulunamadı veya şifre yanlış.";
                        break;
                    case 'auth/wrong-password':
                        msg = "Hatalı şifre girdiniz.";
                        break;
                    case 'auth/invalid-email':
                        msg = "Geçersiz e-posta formatı.";
                        break;
                    case 'auth/too-many-requests':
                        msg = "Çok fazla deneme yaptınız. Lütfen biraz bekleyin.";
                        break;
                    case 'auth/network-request-failed':
                        msg = "Bağlantı hatası. İnternetinizi kontrol edin.";
                        break;
                }
               
                alert(msg);
               
                // Butonu eski haline getir
                btn.innerHTML = originalText;
                btn.disabled = false;
                btn.style.backgroundColor = '';
            });
    }


    ensureProfileDropdown() {
        const loginBtn = document.getElementById('openLoginBtn');
        if (!loginBtn) return;

        const host = loginBtn.closest('.nav-login-btn');
        if (!host) return;

        host.style.position = 'relative';

        let menu = host.querySelector('#profile-hover-menu');
        if (!menu) {
            menu = document.createElement('div');
            menu.id = 'profile-hover-menu';
            menu.setAttribute('role', 'menu');
            menu.style.cssText = [
                'position:absolute',
                'top:calc(100% + 10px)',
                'right:0',
                'min-width:170px',
                'padding:8px',
                'border-radius:12px',
                'background:rgba(7,10,22,.96)',
                'border:1px solid rgba(96,165,250,.35)',
                'box-shadow:0 16px 35px rgba(0,0,0,.45)',
                'display:none',
                'z-index:1200'
            ].join(';');
            host.appendChild(menu);
        }

        let hideTimer = null;

        const showMenu = () => {
            if (hideTimer) {
                window.clearTimeout(hideTimer);
                hideTimer = null;
            }
            menu.style.display = 'block';
        };

        const hideMenu = () => {
            hideTimer = window.setTimeout(() => {
                menu.style.display = 'none';
            }, 120);
        };

        host.addEventListener('mouseenter', showMenu);
        host.addEventListener('mouseleave', hideMenu);
        loginBtn.addEventListener('focus', showMenu);
        loginBtn.addEventListener('blur', hideMenu);

        this.profileMenu = menu;
    }

    renderProfileDropdown(user) {
        if (!this.profileMenu) return;

        const signedIn = Boolean(user);
        const entryStyle = 'display:block;width:100%;padding:9px 10px;margin:2px 0;border-radius:8px;background:transparent;border:none;color:#e5e7eb;text-align:left;font-size:14px;cursor:pointer;text-decoration:none';

        this.profileMenu.innerHTML = signedIn
            ? `
                <a href="../dashboard/index.html" style="${entryStyle}" onmouseover="this.style.background='rgba(59,130,246,.18)'" onmouseout="this.style.background='transparent'">Panele Git</a>
                <button type="button" id="profile-menu-logout" style="${entryStyle}" onmouseover="this.style.background='rgba(239,68,68,.18)'" onmouseout="this.style.background='transparent'">Çıkış Yap</button>
              `
            : `
                <button type="button" id="profile-menu-login" style="${entryStyle}" onmouseover="this.style.background='rgba(59,130,246,.18)'" onmouseout="this.style.background='transparent'">Giriş Yap</button>
              `;

        const loginItem = document.getElementById('profile-menu-login');
        if (loginItem) {
            loginItem.addEventListener('click', () => {
                this.open();
            });
        }

        const logoutItem = document.getElementById('profile-menu-logout');
        if (logoutItem) {
            logoutItem.addEventListener('click', () => {
                auth.signOut();
            });
        }
    }

    // Oturum Durumunu Kontrol Et ve UI Güncelle
    checkCurrentUser() {
        if (!auth) return;

        this.ensureProfileDropdown();

        auth.onAuthStateChanged((user) => {
            const loginBtn = document.getElementById('openLoginBtn');
            if(!loginBtn) return;

            if (user) {
                const displayName = user.displayName || user.email.split('@')[0];
                loginBtn.innerHTML = `<i class="fas fa-user-circle"></i> ${displayName}`;
                loginBtn.classList.remove('btn-outline');
                loginBtn.classList.add('btn-secondary');
            } else {
                loginBtn.innerHTML = '<i class="fas fa-user"></i> Giriş Yap';
                loginBtn.classList.add('btn-outline');
                loginBtn.classList.remove('btn-secondary');
            }

            this.renderProfileDropdown(user);
        });
    }
}


/**
 * [MODULE] UI SYSTEM (Menü, Scroll vb.)
 * Arayüz etkileşimlerini yönetir.
 */
class UISystem {
    constructor() {
        this.header = document.getElementById('header');
        this.hamburger = document.querySelector('.hamburger');
        this.navMenu = document.querySelector('.nav-menu'); // id="navMenu" yerine class="nav-menu" kullanmıştık HTML'de
        this.navLinks = document.querySelectorAll('.nav-link');
        this.bindEvents();
    }


    bindEvents() {
        // Scroll Efekti (Header Background)
        window.addEventListener('scroll', () => {
            if (!this.header) return;
            // 50px aşağı inince 'scrolled' sınıfı ekle
            window.scrollY > 50 ? this.header.classList.add('scrolled') : this.header.classList.remove('scrolled');
        }, { passive: true });


        // Hamburger Menü Tıklama
        if(this.hamburger) {
            this.hamburger.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleMenu();
            });
        }
       
        // Linklere Tıklayınca Menüyü Kapat (Mobil için)
        this.navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if(this.navMenu && this.navMenu.classList.contains('active')) this.toggleMenu();
            });
        });
       
        // Menü Dışına Tıklayınca Kapat
        document.addEventListener('click', (e) => {
            if (this.navMenu && this.navMenu.classList.contains('active')) {
                if (!this.navMenu.contains(e.target) && !this.hamburger.contains(e.target)) {
                    this.toggleMenu();
                }
            }
        });
    }


    toggleMenu() {
        if(this.hamburger && this.navMenu) {
            this.hamburger.classList.toggle('active');
            this.navMenu.classList.toggle('active');
        }
    }
}


/**
 * [MODULE] CONTACT SYSTEM (Mail Gönderimi)
 * Formspree API kullanarak iletişim formunu yönetir.
 */
class ContactSystem {
    constructor() {
        this.formId = "xvgeborr"; // Formspree ID'niz
        this.form = document.querySelector('.contact-form');
        this.inputName = document.getElementById('fullname');
        this.inputContact = document.getElementById('contact_info');
        this.inputService = document.getElementById('service_type');
        this.inputMessage = document.getElementById('message');
        this.errorMsg = document.getElementById('contact-error');
        this.submitBtn = this.form ? this.form.querySelector('button[type="submit"]') : null;
       
        if (this.form) {
            this.bindEvents();
        }
    }


    bindEvents() {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (this.validateInput()) {
                this.sendMail();
            }
        });


        if(this.inputContact) {
            this.inputContact.addEventListener('input', () => this.clearError());
        }
    }


    validateInput() {
        const val = this.inputContact.value.trim();
        // Basit telefon veya e-posta kontrolü
        const phoneDigits = val.replace(/\D/g, '');
        const isPhone = phoneDigits.length >= 10;
        const isEmail = val.includes('@') && val.includes('.');


        if (!isPhone && !isEmail) {
            this.showError("Lütfen geçerli bir E-posta adresi veya Telefon numarası giriniz.");
            return false;
        }
        this.clearError();
        return true;
    }


    showError(message) {
        if(this.errorMsg) {
            this.errorMsg.textContent = message;
            this.errorMsg.style.display = 'block';
        }
        this.inputContact.classList.add('input-error');
    }


    clearError() {
        if(this.errorMsg) this.errorMsg.style.display = 'none';
        this.inputContact.classList.remove('input-error');
    }


    async sendMail() {
        if (!this.submitBtn) return;


        const originalText = this.submitBtn.innerHTML;
        const originalColor = this.submitBtn.style.backgroundColor;


        this.submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Gönderiliyor...';
        this.submitBtn.disabled = true;
        this.submitBtn.style.opacity = "0.8";


        const formData = new FormData();
        formData.append("Ad Soyad", this.inputName.value);
        formData.append("İletişim", this.inputContact.value);
        formData.append("Hizmet", this.inputService ? this.inputService.value : "Belirtilmedi");
        formData.append("Mesaj", this.inputMessage.value);


        try {
            const response = await fetch(`https://formspree.io/f/${this.formId}`, {
                method: "POST",
                body: formData,
                headers: { 'Accept': 'application/json' }
            });


            if (response.ok) {
                this.submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> Mesajınız Gönderildi';
                this.submitBtn.style.backgroundColor = '#10b981';
                this.submitBtn.style.opacity = "1";
               
                this.form.reset();


                setTimeout(() => {
                    this.submitBtn.innerHTML = originalText;
                    this.submitBtn.style.backgroundColor = originalColor;
                    this.submitBtn.disabled = false;
                }, 5000);
            } else {
                throw new Error("Gönderim başarısız");
            }
        } catch (error) {
            console.error(error);
            this.submitBtn.innerHTML = '<i class="fas fa-times-circle"></i> Bir Hata Oluştu';
            this.submitBtn.style.backgroundColor = '#ef4444';
           
            setTimeout(() => {
                this.submitBtn.innerHTML = originalText;
                this.submitBtn.style.backgroundColor = originalColor;
                this.submitBtn.disabled = false;
            }, 3000);
           
            alert("Mesaj gönderilirken bir sorun oluştu.");
        }
    }
}


/**
 * [MODULE] VISUAL EFFECTS (Ana Sayfa İçin)
 * Bu efektler elemanlar varsa çalışır, yoksa hata vermez.
 */
class TerminalEffect {
    constructor(selector) {
        this.container = document.querySelector(selector);
        if (!this.container) return;


        this.lines = [
            { type: 'comment', text: '# Initializing Self-Awareness Protocol v4.0...' },
            { type: 'code', text: 'import neural_network as brain' },
            { type: 'empty', text: '' },
            { type: 'comment', text: '# Step 1: Analyze current efficiency' },
            { type: 'output', text: '>> Analysis: 14% redundant processes detected.' },
            { type: 'empty', text: '' },
            { type: 'comment', text: '# Step 2: Refactor and Automate' },
            { type: 'code', text: 'evo.rewrite_code(target="legacy_modules")' },
            { type: 'output', text: '>> Optimizing SQL queries... [Done]' },
            { type: 'success', text: '>> Model Converged. Predictive accuracy: 99.8%' },
            { type: 'empty', text: '' },
            { type: 'success', text: '>> EFFICIENCY: MAXIMIZED' },
            { type: 'cursor', text: '_' }
        ];
       
        this.typeSpeed = 25;
        this.lineDelay = 600;
        this.loopDelay = 5000; 
        this.start();
    }


    scrollToBottom() {
        this.container.scrollTop = this.container.scrollHeight;
    }


    async start() {
        while (true) {
            this.container.innerHTML = '';
            for (let line of this.lines) {
                if (line.type === 'cursor') {
                    await this.addCursor(line);
                } else {
                    await this.typeLine(line);
                }
            }
            await new Promise(resolve => setTimeout(resolve, this.loopDelay));
        }
    }


    typeLine(lineData) {
        return new Promise(resolve => {
            const lineEl = document.createElement('div');
            lineEl.style.fontFamily = "'Fira Code', monospace";
            lineEl.style.marginBottom = "4px";


            // Renk Ayarları
            if (lineData.type === 'comment') lineEl.style.color = '#6b7280';
            if (lineData.type === 'code') lineEl.style.color = '#e2e8f0';
            if (lineData.type === 'success') lineEl.style.color = '#10b981';
            if (lineData.type === 'output') lineEl.style.color = '#fbbf24';
            if (lineData.type === 'empty') lineEl.innerHTML = '&nbsp;';


            this.container.appendChild(lineEl);
            this.scrollToBottom();


            if (lineData.type === 'empty') {
                setTimeout(resolve, 100);
                return;
            }


            let i = 0;
            const interval = setInterval(() => {
                lineEl.textContent += lineData.text.charAt(i);
                i++;
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
            lineEl.style.color = '#fff';
            this.container.appendChild(lineEl);
            this.scrollToBottom();
            setTimeout(resolve, 2000);
        });
    }
}


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



