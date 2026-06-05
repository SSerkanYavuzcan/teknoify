const firebaseConfig = {
    apiKey: "AIzaSyC1Id7kdU23_A7fEO1eDna0HKprvIM30E8", 
    authDomain: "teknoify-9449c.firebaseapp.com",
    projectId: "teknoify-9449c",
    storageBucket: "teknoify-9449c.firebasestorage.app",
    messagingSenderId: "704314596026",
    appId: "1:704314596026:web:f63fff04c00b7a698ac083",
    measurementId: "G-1DZKJE7BXE"
};

if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

if (typeof firebase !== 'undefined' && firebase.appCheck) {
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
        self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    
    const appCheck = firebase.appCheck();
    appCheck.activate(
        '6LetmtgsAAAAAHOxEkJG4sa29oKLNnAZjQZ1dAwk', 
        true 
    );
}

const auth = (typeof firebase !== 'undefined' && typeof firebase.auth === 'function') ? firebase.auth() : null;
const db = (typeof firebase !== 'undefined' && typeof firebase.firestore === 'function') ? firebase.firestore() : null;

function consumePostLoginRedirect() {
    let redirectPath = null;

    try {
        redirectPath = sessionStorage.getItem('tk_post_login_redirect');
        if (redirectPath) sessionStorage.removeItem('tk_post_login_redirect');
    } catch (error) {
        console.warn('Post-login yönlendirmesi okunamadı.', error.message);
    }

    return redirectPath && redirectPath.startsWith('/') ? redirectPath : null;
}

function getLegacyDashboardRouteFallback(roleType) {
    if (roleType === 'admin') {
        return '/dashboard/admin.html';
    }
    if (roleType === 'premium') {
        return '/dashboard/premium.html';
    }
    return '/dashboard/member.html';
}

function isLegacyDashboardRouteForRole(route, roleType) {
    return typeof route === 'string' && route === getLegacyDashboardRouteFallback(roleType);
}

function getLegacyDashboardRoute(roleType) {
    const fallbackRoute = getLegacyDashboardRouteFallback(roleType);
    const routeKey = roleType === 'admin' || roleType === 'premium' ? roleType : 'member';

    try {
        const routes = window.TEKNOIFY_ROUTES;

        if (routes && typeof routes.getDashboardRouteForRole === 'function') {
            const resolvedRoute = routes.getDashboardRouteForRole(roleType);
            if (isLegacyDashboardRouteForRole(resolvedRoute, roleType)) {
                return resolvedRoute;
            }
        }

        const dashboardRoutes = routes && routes.dashboard;
        if (dashboardRoutes && typeof dashboardRoutes === 'object') {
            const dashboardRoute = dashboardRoutes[routeKey];
            if (isLegacyDashboardRouteForRole(dashboardRoute, roleType)) {
                return dashboardRoute;
            }
        }
    } catch {
        return fallbackRoute;
    }

    return fallbackRoute;
}

function redirectAfterLogin(isAdmin, isPremium) {
    const postLoginRedirect = consumePostLoginRedirect();

    if (postLoginRedirect) {
        window.location.href = postLoginRedirect;
    } else if (isAdmin) {
        window.location.href = getLegacyDashboardRoute('admin');
    } else if (isPremium) {
        window.location.href = getLegacyDashboardRoute('premium');
    } else {
        window.location.href = getLegacyDashboardRoute('member');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('loginModal')) {
        new AuthSystem();
    }
    new UISystem();
    if (document.querySelector('[data-custom-select]')) {
        new CustomSelectSystem();
    }
    if (document.querySelector('.contact-form')) {
        new ContactSystem();
    }
    setTimeout(() => {
        if (document.querySelector('#heroTerminal')) new TerminalEffect('#heroTerminal');
        if (document.querySelector('#stars-container')) new BackgroundFX('#stars-container');
    }, 200);
});

class AuthSystem {
    constructor() {
        this.modal = document.getElementById('loginModal');
        this.form = document.getElementById('loginForm');
        this.triggers = document.querySelectorAll('#openLoginBtn, .trigger-login');
        window.teknoifyAuthSystem = this;
        this.bindEvents();
        this.checkCurrentUser();
    }

    bindEvents() {
        this.triggers.forEach((btn) => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const user = auth ? auth.currentUser : null;
                if (user) {
                    try {
                        const idTokenResult = await user.getIdTokenResult();
                        let isAdmin = !!idTokenResult.claims.admin;
                        let isPremium = !!idTokenResult.claims.premium;

                        if (!isAdmin && db) {
                            const userDoc = await db.collection('users').doc(user.uid).get();
                            if (userDoc.exists) {
                                const data = userDoc.data();
                                isAdmin = (data.role && data.role.type === 'admin') || data.role === 'admin';
                                isPremium = (data.role && data.role.type === 'premium') || data.role === 'premium';
                            }
                        }

                        redirectAfterLogin(isAdmin, isPremium);
                    } catch (error) {
                        console.warn("Kullanıcı rolü kontrol edilemedi, standart üyeye yönlendiriliyor.", error.message);
                        window.location.href = '/dashboard/member.html';
                    }
                } else {
                    this.open();
                }
            });
        });

        const closeBtn = document.querySelector('.modal-close');
        if (closeBtn) closeBtn.addEventListener('click', () => this.close());
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) this.close();
            });
        }
        if (this.form) this.form.addEventListener('submit', (e) => this.handleLogin(e));
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal && this.modal.classList.contains('active')) {
                this.close();
            }
        });
    }

    open() {
        if (this.modal) {
            this.modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    close() {
        if (this.modal) {
            this.modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    handleLogin(e) {
        e.preventDefault();
        const btn = this.form.querySelector('button[type="submit"]');
        const emailInput = document.getElementById('email').value.trim();
        const passInput = document.getElementById('password').value.trim();
        if (!auth) return;
        
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Kontrol Ediliyor...';
        btn.disabled = true;

        auth.signInWithEmailAndPassword(emailInput, passInput)
            .then(async (userCredential) => {
                const user = userCredential.user;
                try {

                    await new Promise(resolve => setTimeout(resolve, 600));

                    const idTokenResult = await user.getIdTokenResult(true);
                    let isAdmin = !!idTokenResult.claims.admin;
                    let isPremium = !!idTokenResult.claims.premium;

                    if (!isAdmin && db) {
                        const userDoc = await db.collection('users').doc(user.uid).get();
                        if (userDoc.exists) {
                            const data = userDoc.data();
                            const roleType = (typeof data.role === 'object' && data.role !== null) ? data.role.type : data.role;
                            isAdmin = roleType === 'admin';
                            isPremium = roleType === 'premium';
                        }
                    }

                    localStorage.setItem('session_start_time', Date.now());
                    
                    btn.innerHTML = '<i class="fas fa-check"></i> Giriş Başarılı';
                    btn.style.backgroundColor = '#10b981';
                    
                    setTimeout(() => {
                        redirectAfterLogin(isAdmin, isPremium);
                    }, 500);
                } catch (dbError) {
                    console.warn("--- YETKİ KONTROL UYARISI ---", dbError.message);
                    btn.innerHTML = '<i class="fas fa-check"></i> Giriş Başarılı';
                    btn.style.backgroundColor = '#10b981';
                    setTimeout(() => { redirectAfterLogin(false, false); }, 1000);
                }
            })
            .catch((error) => {
                console.error("Giriş Hatası:", error);
                let msg = "Giriş başarısız. Bilgilerinizi kontrol edin.";
                if (error.code === 'auth/too-many-requests') msg = "Çok fazla deneme yaptınız.";
                if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') msg = "E-posta adresi veya şifre hatalı.";
                if (typeof showToast === "function") showToast("Erişim Reddedildi", msg, "error");
                
                btn.innerHTML = originalText;
                btn.disabled = false;
            });
    }

    checkCurrentUser() {
        if (!auth) return;
        auth.onAuthStateChanged((user) => {
            if (user) {
                const loginBtn = document.getElementById('openLoginBtn');
                if (loginBtn) {
                    const displayName = user.displayName || user.email.split('@')[0];
                    loginBtn.innerHTML = '<i class="fas fa-user-circle"></i> ' + displayName;
                    loginBtn.classList.remove('btn-outline');
                    loginBtn.classList.add('btn-secondary');
                }
            }
        });
    }
}


class CustomSelectSystem {
    constructor() {
        this.selects = document.querySelectorAll('[data-custom-select]');
        this.selects.forEach((select) => this.initSelect(select));
    }

    initSelect(select) {
        const wrapper = select.closest('.input-wrapper');
        const nativeSelect = wrapper ? wrapper.querySelector('select') : null;
        const trigger = select.querySelector('.custom-select-trigger');
        const valueLabel = select.querySelector('.custom-select-value');
        const menu = select.querySelector('.custom-select-menu');
        const options = Array.from(select.querySelectorAll('[role="option"]'));

        if (!nativeSelect || !trigger || !valueLabel || !menu || !options.length) return;

        const state = {
            focusedIndex: Math.max(options.findIndex((option) => option.dataset.value === nativeSelect.value), 0),
            menu,
            nativeSelect,
            options,
            select,
            trigger,
            valueLabel,
            placeholder: valueLabel.textContent.trim()
        };

        this.syncFromNative(state);

        trigger.addEventListener('click', () => this.toggleSelect(state));
        trigger.addEventListener('keydown', (event) => this.handleTriggerKeydown(event, state));

        options.forEach((option, index) => {
            option.id = option.id || `${nativeSelect.id}-option-${index}`;
            option.addEventListener('click', () => this.selectOption(state, option));
            option.addEventListener('mouseenter', () => this.setFocusedOption(state, index));
        });

        nativeSelect.addEventListener('change', () => {
            this.syncFromNative(state);
            select.classList.remove('has-error');
        });

        if (nativeSelect.form) {
            nativeSelect.form.addEventListener('reset', () => {
                window.setTimeout(() => this.syncFromNative(state), 0);
            });
        }

        document.addEventListener('click', (event) => {
            if (!select.contains(event.target)) this.closeSelect(state);
        });
    }

    toggleSelect(state) {
        if (state.select.classList.contains('is-open')) {
            this.closeSelect(state);
        } else {
            this.openSelect(state);
        }
    }

    openSelect(state) {
        state.select.classList.add('is-open');
        state.trigger.setAttribute('aria-expanded', 'true');
        const selectedIndex = state.options.findIndex((option) => option.getAttribute('aria-selected') === 'true');
        this.setFocusedOption(state, selectedIndex >= 0 ? selectedIndex : state.focusedIndex);
    }

    closeSelect(state) {
        state.select.classList.remove('is-open');
        state.trigger.setAttribute('aria-expanded', 'false');
        state.trigger.removeAttribute('aria-activedescendant');
    }

    handleTriggerKeydown(event, state) {
        const isOpen = state.select.classList.contains('is-open');

        if (event.key === 'Escape') {
            this.closeSelect(state);
            return;
        }

        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            if (!isOpen) this.openSelect(state);
            const direction = event.key === 'ArrowDown' ? 1 : -1;
            this.moveFocus(state, direction);
            return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (!isOpen) {
                this.openSelect(state);
                return;
            }
            this.selectOption(state, state.options[state.focusedIndex]);
        }
    }

    moveFocus(state, direction) {
        const nextIndex = (state.focusedIndex + direction + state.options.length) % state.options.length;
        this.setFocusedOption(state, nextIndex);
    }

    setFocusedOption(state, index) {
        state.options.forEach((option) => option.classList.remove('is-focused'));
        state.focusedIndex = Math.max(0, Math.min(index, state.options.length - 1));
        const focusedOption = state.options[state.focusedIndex];
        focusedOption.classList.add('is-focused');
        state.trigger.setAttribute('aria-activedescendant', focusedOption.id);
        if (state.select.classList.contains('is-open')) {
            focusedOption.scrollIntoView({ block: 'nearest' });
        }
    }

    selectOption(state, option) {
        if (!option) return;

        state.nativeSelect.value = option.dataset.value;
        state.nativeSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
        this.closeSelect(state);
        state.trigger.focus();
    }

    syncFromNative(state) {
        const selectedOption = state.options.find((option) => option.dataset.value === state.nativeSelect.value);

        state.options.forEach((option) => {
            option.setAttribute('aria-selected', selectedOption === option ? 'true' : 'false');
        });

        if (selectedOption) {
            state.valueLabel.textContent = selectedOption.textContent.trim();
            state.select.classList.add('has-value');
            this.setFocusedOption(state, state.options.indexOf(selectedOption));
        } else {
            state.valueLabel.textContent = state.placeholder;
            state.select.classList.remove('has-value');
            this.setFocusedOption(state, 0);
        }
    }
}

class ContactSystem {
    constructor() {
        this.form = document.querySelector('.contact-form');
        this.submitBtn = this.form ? this.form.querySelector('button[type="submit"]') : null;
        this.honeypot = document.getElementById('tk_hp_field');
        this.apiUrl = "https://api.teknoify.com/submitContactForm";
        if (this.form) this.bindEvents();
    }

    bindEvents() {
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (this.honeypot && this.honeypot.value) {
                this.banAndLogBot();
                return;
            }
            const lastSuccess = localStorage.getItem('tk_last_success');
            if (lastSuccess && (Date.now() - lastSuccess < 60000)) {
                if (typeof showToast === "function") showToast("Uyarı", "Lütfen bir dakika bekleyip tekrar deneyin.", "error");
                return;
            }
            if (this.validateInput()) {
                this.sendToIP();
            }
        });
    }

    validateInput() {
        const contactVal = document.getElementById('contact_info').value.trim();
        const serviceSelect = document.getElementById('service_type');
        const customSelect = document.querySelector('[data-custom-select]');
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactVal);
        const isPhone = contactVal.replace(/\D/g, '').length >= 10;

        if (!isEmail && !isPhone) {
            if (typeof showToast === "function") showToast("Hata", "Geçerli bir E-posta veya Telefon giriniz.", "error");
            return false;
        }

        if (!serviceSelect || !serviceSelect.value) {
            if (customSelect) customSelect.classList.add('has-error');
            if (typeof showToast === "function") showToast("Eksik Bilgi", "Lütfen ilgilendiğiniz hizmeti seçin.", "error");
            return false;
        }

        if (customSelect) customSelect.classList.remove('has-error');
        return true;
    }

    async banAndLogBot() {
        localStorage.setItem('tk_access_denied', 'true');
        location.reload();
    }

    async sendToIP() {
        if (!this.submitBtn) return;
        const origHtml = this.submitBtn.innerHTML;
        this.submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Gönderiliyor...';
        this.submitBtn.disabled = true;
        try {
            const payload = {
                fullname: document.getElementById('fullname').value.trim(),
                contact_info: document.getElementById('contact_info').value.trim(),
                service_type: document.getElementById('service_type').value,
                message: document.getElementById('message').value.trim(),
                visitor_id: localStorage.getItem('tk_visitor_id') || "Web_Client"
            };
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                mode: 'cors',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json().catch(() => ({ error: "Sunucudan geçersiz yanıt alındı." }));
            if (response.ok && result.success) {
                localStorage.setItem('tk_last_success', Date.now());
                if (typeof showToast === "function") showToast("Başarılı", "Mesajınız güvenli katmanlardan geçerek iletildi.", "success");
                this.form.reset();
            } else {
                throw new Error(result.error || "İşlem reddedildi.");
            }
        } catch (err) {
            if (typeof showToast === "function") showToast("Sistem Mesajı", err.message || "Bağlantı hatası oluştu.", "error");
        } finally {
            setTimeout(() => {
                this.submitBtn.innerHTML = origHtml;
                this.submitBtn.disabled = false;
            }, 1500);
        }
    }
}

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
        if (this.hamburger) {
            this.hamburger.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleMenu();
            });
        }
        this.navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (this.navMenu && this.navMenu.classList.contains('active')) this.toggleMenu();
            });
        });
        document.addEventListener('click', (e) => {
            if (this.navMenu && this.navMenu.classList.contains('active')) {
                if (!this.navMenu.contains(e.target) && !this.hamburger.contains(e.target)) this.toggleMenu();
            }
        });
    }

    toggleMenu() {
        if (this.hamburger && this.navMenu) {
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
            { type: 'comment', text: '# Security: LOAD_BALANCER_ACTIVE' },
            { type: 'code', text: 'shield.connect("api.teknoify.com")' },
            { type: 'empty', text: '' },
            { type: 'comment', text: '# Initializing Cloud Armor...' },
            { type: 'output', text: '>> WAF Protocol: ENABLED' },
            { type: 'output', text: '>> Origin IP: HIDDEN' },
            { type: 'success', text: '>> VERIFIED: Teknoify Secure IP' },
            { type: 'empty', text: '' },
            { type: 'success', text: '>> STATUS: PROTECTED' },
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
        this.starCount = window.innerWidth < 768 ? 20 : 48;
        this.init();
    }

    init() {
        this.container.innerHTML = '';
        const frag = document.createDocumentFragment();
        for (let i = 0; i < this.starCount; i++) {
            const star = document.createElement('div');
            const size = Math.random() * 1 + 0.6;
            star.style.cssText = `
                position: absolute; width: ${size}px; height: ${size}px;
                background: rgba(255,255,255, ${Math.random() * 0.12 + 0.05});
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
