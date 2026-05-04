/**
 * ================================================================
 * [MAIN] TEKNOIFY GLOBAL SCRIPT (ULTIMATE SECURITY VERSION)
 * Katmanlı Savunma: Honeypot, Anti-Flood, Firebase App Check
 * ================================================================
 */

const firebaseConfig = {
    apiKey: "AIzaSyC1Id7kdU23_A7fEO1eDna0HKprvIM30E8",
    authDomain: "teknoify-9449c.firebaseapp.com",
    projectId: "teknoify-9449c",
    storageBucket: "teknoify-9449c.firebasestorage.app",
    messagingSenderId: "704314596026",
    appId: "1:704314596026:web:f63fff04c00b7a698ac083",
    measurementId: "G-1DZKJE7BXE"
};

// 1. Firebase Çekirdeğini Başlat
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// 2. App Check Entegrasyonu (reCAPTCHA v3 arka planda çalışır)
// Not: HTML'de firebase-appcheck.js SDK'sının yüklü olduğundan emin ol.
if (typeof firebase !== 'undefined' && firebase.appCheck) {
    const appCheck = firebase.appCheck();
    appCheck.activate(
        // Kendi reCAPTCHA v3 Site Key'ini buraya giriyorsun
        new firebase.appCheck.ReCaptchaV3Provider('6LetmtgsAAAAAHOxEkJG4sa29oKLNnAZjQZ1dAwk'),
        true // Token'ın otomatik yenilenmesini sağlar
    );
}

const auth = typeof firebase !== 'undefined' ? firebase.auth() : null;
const db = typeof firebase !== 'undefined' ? firebase.firestore() : null;

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('loginModal')) {
        new AuthSystem();
    }
    
    new UISystem();
    
    if (document.querySelector('.contact-form')) {
        new ContactSystem();
    }
    
    setTimeout(() => {
        if (document.querySelector('#heroTerminal')) new TerminalEffect('#heroTerminal');
        if (document.querySelector('#stars-container')) new BackgroundFX('#stars-container');
    }, 200);
});

/* ---------------------------------------------------------
   1. AUTH SYSTEM (Giriş & Güvenlik)
--------------------------------------------------------- */
class AuthSystem {
    constructor() {
        this.modal = document.getElementById('loginModal');
        this.form = document.getElementById('loginForm');
        this.triggers = document.querySelectorAll('#openLoginBtn, .trigger-login');
        
        this.bindEvents();
        this.checkCurrentUser();
    }

    bindEvents() {
        this.triggers.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const user = auth ? auth.currentUser : null;
                if (user) {
                    window.location.href = '../dashboard/index.html'; 
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
        
        if(this.form) this.form.addEventListener('submit', (e) => this.handleLogin(e));
        
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

    handleLogin(e) {
        e.preventDefault();
        const btn = this.form.querySelector('button[type="submit"]');
        const emailInput = document.getElementById('email').value.trim();
        const passInput = document.getElementById('password').value.trim();

        if (!auth) {
            if (typeof showToast === "function") showToast("Hata", "Güvenlik sistemi başlatılamadı.");
            return;
        }

        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Kontrol Ediliyor...';
        btn.disabled = true;

        // App Check arka planda güvenliği sağladığı için manuel grecaptcha.execute kaldırıldı.
        auth.signInWithEmailAndPassword(emailInput, passInput)
            .then((userCredential) => {
                localStorage.setItem('session_start_time', Date.now());
                btn.innerHTML = '<i class="fas fa-check"></i> Giriş Başarılı';
                btn.style.backgroundColor = '#10b981';
                setTimeout(() => { window.location.href = '../dashboard/index.html'; }, 1000);
            })
            .catch((error) => {
                console.error("Giriş Hatası:", error);
                let msg = "Giriş başarısız. Bilgilerinizi kontrol edin.";
                if (error.code === 'auth/too-many-requests') msg = "Çok fazla deneme yaptınız. Biraz bekleyin.";
                if (typeof showToast === "function") showToast("Giriş Başarısız", msg);
                else alert(msg);
                
                btn.innerHTML = originalText;
                btn.disabled = false;
                btn.style.backgroundColor = '';
            });
    }

    checkCurrentUser() {
        if (!auth) return;
        auth.onAuthStateChanged((user) => {
            if (user) {
                const loginBtn = document.getElementById('openLoginBtn');
                if(loginBtn) {
                    const displayName = user.displayName || user.email.split('@')[0];
                    loginBtn.innerHTML = `<i class="fas fa-user-circle"></i> ${displayName}`;
                    loginBtn.classList.remove('btn-outline');
                    loginBtn.classList.add('btn-secondary');
                }
            }
        });
    }
}

/* ---------------------------------------------------------
   2. CONTACT SYSTEM (Katmanlı Savunma)
--------------------------------------------------------- */
class ContactSystem {
    constructor() {
        this.form = document.querySelector('.contact-form');
        this.submitBtn = this.form ? this.form.querySelector('button[type="submit"]') : null;
        this.honeypot = document.getElementById('tk_hp_field');
        
        if (this.form) this.bindEvents();
    }

    bindEvents() {
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // 1. KATMAN: HONEYPOT (Ballı Tuzak)
            if (this.honeypot && this.honeypot.value) {
                console.warn("Spam Bot detected.");
                return; // Sessizce iptal et
            }

            // 2. KATMAN: ANTI-FLOOD (Hız Sınırlaması)
            const lastSuccess = localStorage.getItem('tk_last_success');
            if (lastSuccess && (Date.now() - lastSuccess < 60000)) { // 1 dakika kilit
                if (typeof showToast === "function") 
                    showToast("Uyarı", "Kısa sürede çok fazla istek gönderdiniz. Lütfen bekleyin.");
                return;
            }

            if (this.validateInput()) {
                // App Check güvenliği üstlendiği için doğrudan formu gönderiyoruz
                this.sendFormData();
            }
        });
    }

    validateInput() {
        const contactVal = document.getElementById('contact_info').value.trim();
        const isEmail = contactVal.includes('@') && contactVal.includes('.');
        const isPhone = contactVal.replace(/\D/g, '').length >= 10;
        
        if (!isEmail && !isPhone) {
            if (typeof showToast === "function") showToast("Hata", "Geçerli bir E-posta veya Telefon giriniz.");
            return false;
        }
        return true;
    }

    sanitizeUrl(url) {
        if (!url || url === "Direct") return url;
        try { const u = new URL(url); return u.origin + u.pathname; } catch(e) { return "Invalid"; }
    }

    async sendFormData() {
        if (!this.submitBtn || !db) return;
        
        const origHtml = this.submitBtn.innerHTML;
        this.submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Gönderiliyor...';
        this.submitBtn.disabled = true;

        try {
            const formData = {
                fullname: document.getElementById('fullname').value.trim(),
                contact_info: document.getElementById('contact_info').value.trim(),
                service_type: document.getElementById('service_type').value,
                message: document.getElementById('message').value.trim(),
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                source: "Web Home",
                fingerprint: {
                    url: this.sanitizeUrl(window.location.href),
                    res: `${window.screen.width}x${window.screen.height}`
                }
            };

            // EĞER BOT İSE VEYA APP CHECK BAŞARISIZ OLURSA, BURASI OTOMATİK HATA FIRLATIR.
            await db.collection("contact_requests").add(formData);
            
            localStorage.setItem('tk_last_success', Date.now());
            
            if (typeof showToast === "function") showToast("Başarılı", "Mesajınız iletildi.");
            this.form.reset();

        } catch (err) {
            console.error("Firebase Güvenlik/Yazma Hatası:", err);
            if (typeof showToast === "function") showToast("Hata", "Güvenlik politikası gereği işleminiz reddedildi veya bağlantı koptu.");
        } finally {
            setTimeout(() => {
                this.submitBtn.innerHTML = origHtml;
                this.submitBtn.disabled = false;
            }, 3000);
        }
    }
}

/* ---------------------------------------------------------
   3. UI & EFFECTS
--------------------------------------------------------- */
class UISystem {
    constructor() {
        this.header = document.getElementById('header');
        this.hamburger = document.querySelector('.hamburger');
        this.navMenu = document.querySelector('.nav-menu'); 
        this.navLinks = document.querySelectorAll('.nav-link');
        this.bindEvents();
    }

    bindEvents() {
        window.addEventListener('scroll', () => {
            if (!this.header) return;
            window.scrollY > 50 ? this.header.classList.add('scrolled') : this.header.classList.remove('scrolled');
        }, { passive: true });
        
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

    toggleMenu() {
        if(this.hamburger && this.navMenu) {
            this.hamburger.classList.toggle('active');
            this.navMenu.classList.toggle('active');
        }
    }
}

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
        this.typeSpeed = 25; this.lineDelay = 600; this.loopDelay = 5000; this.start();
    }

    scrollToBottom() { this.container.scrollTop = this.container.scrollHeight; }
    
    async start() {
        while (true) {
            this.container.innerHTML = '';
            for (let line of this.lines) {
                if (line.type === 'cursor') await this.addCursor(line);
                else await this.typeLine(line);
            }
            await new Promise(resolve => setTimeout(resolve, this.loopDelay));
        }
    }

    typeLine(lineData) {
        return new Promise(resolve => {
            const lineEl = document.createElement('div');
            lineEl.style.fontFamily = "'Fira Code', monospace";
            lineEl.style.marginBottom = "4px";
            if (lineData.type === 'comment') lineEl.style.color = '#6b7280';
            if (lineData.type === 'code') lineEl.style.color = '#e2e8f0';
            if (lineData.type === 'success') lineEl.style.color = '#10b981';
            if (lineData.type === 'output') lineEl.style.color = '#fbbf24';
            if (lineData.type === 'empty') lineEl.innerHTML = '&nbsp;';
            this.container.appendChild(lineEl);
            this.scrollToBottom();
            if (lineData.type === 'empty') { setTimeout(resolve, 100); return; }
            let i = 0;
            const interval = setInterval(() => {
                lineEl.textContent += lineData.text.charAt(i); i++; this.scrollToBottom();
                if (i >= lineData.text.length) { clearInterval(interval); setTimeout(resolve, this.lineDelay); }
            }, this.typeSpeed);
        });
    }

    addCursor(lineData) {
        return new Promise(resolve => {
            const lineEl = document.createElement('div');
            lineEl.classList.add('blink-cursor'); lineEl.textContent = lineData.text; lineEl.style.color = '#fff';
            this.container.appendChild(lineEl); this.scrollToBottom(); setTimeout(resolve, 2000);
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
