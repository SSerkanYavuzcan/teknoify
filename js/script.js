// Teknoify public marketing site: shared page behaviour (navigation, contact form, custom select,
// hero terminal and background effects). Authentication lives on https://platform.teknoify.com;
// this file intentionally initializes no Firebase, App Check, reCAPTCHA or session state.

// Review-only: ?motion=force previews the motion system under an OS reduced-motion setting. Never set for visitors.
(function () {
    const q = new URLSearchParams(window.location.search);
    if (q.get('motion') === 'force') document.documentElement.classList.add('force-motion');
    if (q.get('stage') === 'pre') document.documentElement.classList.add('review-pre');
    if (q.get('type') === 'b') { document.documentElement.classList.add('type-b'); const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Host+Grotesk:wght@500;600&display=swap'; document.head.appendChild(l); }
})();
document.addEventListener('DOMContentLoaded', () => {
    new UISystem();
    if (document.querySelector('[data-custom-select]')) {
        new CustomSelectSystem();
    }
    if (document.querySelector('.contact-form')) {
        new ContactSystem();
    }
    document.querySelectorAll('[data-signal-field]').forEach((el) => new SignalField(el));
    setTimeout(() => {
        if (document.querySelector('#heroTerminal')) new TerminalEffect('#heroTerminal');
        if (document.querySelector('#stars-container')) new BackgroundFX('#stars-container');
    }, 200);
});


class SignalField {
    constructor(root) {
        this.root = root;
        this.layers = root.querySelectorAll('.sf--stage .sf-layer, .sf--stage .sf-core');
        this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
        this.finePointer = window.matchMedia('(pointer: fine)');
        this.forced = document.documentElement.classList.contains('force-motion');
        this.hold = document.documentElement.classList.contains('review-pre');   // review-only: freeze the unresolved frame
        this.resolveMs = 8000;
        this.frame = null; this.target = { x: 0, y: 0 }; this.current = { x: 0, y: 0 };
        this.stages = (root.closest('.hero') || document).querySelectorAll('.hero-stage');
        if (this.reduced.matches && !this.forced) { root.classList.add('is-resolved'); this.setStage(3); return; }
        this.bindVisibility();
        const rect = root.getBoundingClientRect();
        if (rect.bottom > 0 && rect.top < window.innerHeight && rect.height > 0) { root.classList.add('is-live'); this.arm(); }
        if (this.finePointer.matches) this.bindPointer();
    }
    setStage(n) { this.stages.forEach((s, i) => s.classList.toggle('is-on', n === 0 ? false : i < n)); }
    arm() {
        if (this.armed || this.hold) return;
        this.armed = true;
        this.root.classList.add('is-armed');
        // legend follows the one-shot phases: gather 0-30%, understand 30-52%, act 52%+
        this.setStage(1);
        setTimeout(() => this.setStage(2), this.resolveMs * 0.3);
        setTimeout(() => this.setStage(3), this.resolveMs * 0.52);
        const finish = () => { if (this.root.classList.contains('is-resolved')) return; this.root.classList.remove('is-armed'); this.root.classList.add('is-resolved'); this.setStage(3); };
        const rail = this.root.querySelector('.sf-rail');
        if (rail) rail.addEventListener('animationend', finish, { once: true });
        setTimeout(finish, this.resolveMs + 400);
    }
    bindVisibility() {
        if (!('IntersectionObserver' in window)) { this.root.classList.add('is-live'); this.arm(); return; }
        const io = new IntersectionObserver((entries) => {
            entries.forEach((e) => { this.root.classList.toggle('is-live', e.isIntersecting); if (e.isIntersecting) this.arm(); });
        }, { threshold: 0.2 });
        io.observe(this.root);
        document.addEventListener('visibilitychange', () => { if (document.hidden) this.root.classList.remove('is-live'); });
    }
    bindPointer() {
        const hero = this.root.closest('.hero') || this.root;
        hero.addEventListener('pointermove', (e) => {
            const r = hero.getBoundingClientRect();
            this.target.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
            this.target.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
            if (!this.frame) this.frame = requestAnimationFrame(() => this.tick());
        }, { passive: true });
        hero.addEventListener('pointerleave', () => { this.target.x = 0; this.target.y = 0; if (!this.frame) this.frame = requestAnimationFrame(() => this.tick()); });
    }
    tick() {
        this.frame = null;
        this.current.x += (this.target.x - this.current.x) * 0.12;
        this.current.y += (this.target.y - this.current.y) * 0.12;
        const depth = [1, 2, 3, 2, 5, 3];   // ambient least, core most (max 5px)
        this.layers.forEach((layer, i) => {
            const d = depth[i % depth.length];
            layer.style.transform = `translate(${(this.current.x * d).toFixed(2)}px, ${(this.current.y * d).toFixed(2)}px)`;
        });
        if (Math.abs(this.target.x - this.current.x) > 0.005 || Math.abs(this.target.y - this.current.y) > 0.005) this.frame = requestAnimationFrame(() => this.tick());
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
        // Honeypot filled: silently drop the submission (no persistent client-side lockout).
        this.form.reset();
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
                visitor_id: "Web_Client"
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
            const open = this.hamburger.classList.toggle('active');
            this.navMenu.classList.toggle('active', open);
            this.hamburger.setAttribute('aria-expanded', String(open));
            this.hamburger.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
        }
    }
}

class TerminalEffect {
    constructor(selector) {
        this.container = document.querySelector(selector);
        if (!this.container) return;
        this.lines = [

            { type: 'comment', text: '# intelligence is not automation alone' },
            { type: 'empty', text: '' },

            { type: 'code', text: 'from teknoify.core import Human, Data, Skill, Agent' },
            { type: 'code', text: 'from teknoify.memory import Context, FeedbackLoop' },
            { type: 'empty', text: '' },

            { type: 'comment', text: '# Principle 01: understand before action' },
            { type: 'code', text: 'context = Context.collect(signals=["data", "process", "goal"])' },
            { type: 'code', text: 'intent = Agent.read(context, mode="deep_attention")' },
            { type: 'empty', text: '' },

            { type: 'comment', text: '# Principle 02: skills are the new interface' },
            { type: 'code', text: 'skills = Skill.registry(["analyze", "automate", "predict", "explain"])' },
            { type: 'code', text: 'agent = Agent.compose(skills, memory=True, tools=True)' },
            { type: 'empty', text: '' },

            { type: 'comment', text: '# Principle 03: every output must create leverage' },
            { type: 'code', text: 'decision = agent.reason(goal="reduce_workload")' },
            { type: 'code', text: 'workflow = agent.build(decision, human_in_the_loop=True)' },
            { type: 'empty', text: '' },

            { type: 'output', text: '>> attention_layer: ACTIVE' },
            { type: 'output', text: '>> skill_graph: CONNECTED' },
            { type: 'output', text: '>> feedback_loop: LEARNING' },
            { type: 'success', text: '>> MANIFESTO: BUILD SYSTEMS THAT AMPLIFY HUMANS' },
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

        this.gridConfig = {
            minorGridSize: 40,
            majorGridSize: 160,
            desktopWaveAmplitude: 5.5,
            mobileWaveAmplitude: 4,
            desktopDepthAmplitude: 24,
            mobileDepthAmplitude: 16,
            perspectiveStrength: 0.42,
            verticalDepthLift: 0.22,
            cameraFocalLength: 1100,
            gridOverscan: 140,
            waveCycleDuration: 10000,
            sampleStep: 20,
            targetFrameInterval: 1000 / 30
        };
        this.starCount = window.innerWidth < 768 ? 12 : 24;
        this.reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        this.prefersReducedMotion = this.reducedMotionQuery.matches;
        this.canvas = null;
        this.ctx = null;
        this.pixelRatio = 1;
        this.width = 0;
        this.height = 0;
        this.animationFrame = null;
        this.animationStartTime = 0;
        this.lastFrameTime = 0;
        this.boundAnimate = this.animateQuantumGrid.bind(this);
        this.boundResize = this.resizeQuantumGrid.bind(this);
        this.boundVisibilityChange = this.handleVisibilityChange.bind(this);
        this.boundReducedMotionChange = this.handleReducedMotionChange.bind(this);
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
                animation: ${this.prefersReducedMotion ? 'none' : `floatParticle ${14 + Math.random() * 18}s linear infinite`};
                animation-delay: -${Math.random() * 20}s;
            `;
            frag.appendChild(star);
        }
        this.container.appendChild(frag);

        this.bindReducedMotionListener();

        if (!this.prefersReducedMotion) {
            this.initQuantumGrid();
        }
    }

    bindReducedMotionListener() {
        if (typeof this.reducedMotionQuery.addEventListener === 'function') {
            this.reducedMotionQuery.addEventListener('change', this.boundReducedMotionChange);
        } else if (typeof this.reducedMotionQuery.addListener === 'function') {
            this.reducedMotionQuery.addListener(this.boundReducedMotionChange);
        }
    }

    handleReducedMotionChange(event) {
        this.prefersReducedMotion = event.matches;
        Array.from(this.container.children).forEach((child) => {
            if (!child.classList.contains('quantum-grid-canvas')) {
                child.style.animationPlayState = this.prefersReducedMotion ? 'paused' : '';
            }
        });

        if (this.prefersReducedMotion) {
            this.destroyQuantumGrid();
            return;
        }

        this.initQuantumGrid();
    }

    initQuantumGrid() {
        if (this.canvas || this.prefersReducedMotion) return;

        this.canvas = document.createElement('canvas');
        this.canvas.className = 'quantum-grid-canvas';
        this.canvas.setAttribute('aria-hidden', 'true');
        this.ctx = this.canvas.getContext('2d');

        if (!this.ctx) {
            this.canvas = null;
            return;
        }

        this.container.prepend(this.canvas);
        this.animationStartTime = window.performance.now();
        this.lastFrameTime = 0;

        if (!this.resizeQuantumGrid(this.animationStartTime)) {
            this.destroyQuantumGrid();
            return;
        }

        this.container.classList.add('has-quantum-grid');
        window.addEventListener('resize', this.boundResize, { passive: true });
        document.addEventListener('visibilitychange', this.boundVisibilityChange);
        this.animationFrame = window.requestAnimationFrame(this.boundAnimate);
    }

    destroyQuantumGrid() {
        if (this.animationFrame) {
            window.cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        window.removeEventListener('resize', this.boundResize);
        document.removeEventListener('visibilitychange', this.boundVisibilityChange);
        this.container.classList.remove('has-quantum-grid');

        if (this.canvas) {
            this.canvas.remove();
        }

        this.canvas = null;
        this.ctx = null;
        this.lastFrameTime = 0;
        this.animationStartTime = 0;
    }

    resizeQuantumGrid(timestamp = window.performance.now()) {
        if (!this.canvas || !this.ctx) return false;

        this.pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = Math.ceil(this.width * this.pixelRatio);
        this.canvas.height = Math.ceil(this.height * this.pixelRatio);
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;
        this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
        return this.drawQuantumGrid(timestamp);
    }

    handleVisibilityChange() {
        if (document.hidden) {
            if (this.animationFrame) {
                window.cancelAnimationFrame(this.animationFrame);
                this.animationFrame = null;
            }
            return;
        }

        this.lastFrameTime = 0;
        if (!this.animationFrame && !this.prefersReducedMotion) {
            this.animationFrame = window.requestAnimationFrame(this.boundAnimate);
        }
    }

    animateQuantumGrid(timestamp) {
        if (document.hidden || this.prefersReducedMotion) {
            this.animationFrame = null;
            return;
        }

        if (!this.lastFrameTime || timestamp - this.lastFrameTime >= this.gridConfig.targetFrameInterval) {
            this.drawQuantumGrid(timestamp);
            this.lastFrameTime = timestamp;
        }

        this.animationFrame = window.requestAnimationFrame(this.boundAnimate);
    }

    getQuantumDisplacement(worldX, worldY, elapsed) {
        const amplitude = window.innerWidth < 768 ? this.gridConfig.mobileWaveAmplitude : this.gridConfig.desktopWaveAmplitude;
        const phase = (elapsed / this.gridConfig.waveCycleDuration) * Math.PI * 2;
        const waveA = Math.sin(worldY * 0.010 + phase) * amplitude;
        const waveB = Math.sin((worldX + worldY) * 0.006 - phase * 0.92) * (amplitude * 0.58);
        const waveC = Math.sin(worldX * 0.009 - phase * 1.08) * (amplitude * 0.82);
        const waveD = Math.sin((worldX - worldY) * 0.005 + phase * 0.78) * (amplitude * 0.5);

        return {
            x: waveA + waveB,
            y: waveC + waveD
        };
    }

    getQuantumDepth(worldX, worldY, elapsed) {
        const amplitude = window.innerWidth < 768 ? this.gridConfig.mobileDepthAmplitude : this.gridConfig.desktopDepthAmplitude;
        const phase = (elapsed / this.gridConfig.waveCycleDuration) * Math.PI * 2;
        const depthWaveA = Math.sin((worldX * 0.0028) + (worldY * 0.0036) + phase * 0.84) * (amplitude * 0.46);
        const depthWaveB = Math.sin((worldX * -0.0034) + (worldY * 0.0024) - phase * 0.72) * (amplitude * 0.34);
        const depthWaveC = Math.sin((worldX + worldY) * 0.0019 + phase * 0.52) * (amplitude * 0.20);

        return depthWaveA + depthWaveB + depthWaveC;
    }

    projectQuantumPoint(worldX, worldY, elapsed, scrollX, scrollY) {
        const displacement = this.getQuantumDisplacement(worldX, worldY, elapsed);
        const z = this.getQuantumDepth(worldX, worldY, elapsed);
        const depthAmplitude = window.innerWidth < 768 ? this.gridConfig.mobileDepthAmplitude : this.gridConfig.desktopDepthAmplitude;
        const normalizedDepth = Math.max(-1, Math.min(1, z / depthAmplitude));
        const viewportX = worldX - scrollX + displacement.x;
        const viewportY = worldY - scrollY + displacement.y;
        const originX = this.width * 0.5;
        const originY = this.height * 0.48;
        const focalLength = this.gridConfig.cameraFocalLength;
        const perspectiveZ = z * this.gridConfig.perspectiveStrength;
        const scale = focalLength / (focalLength - perspectiveZ);

        return {
            x: originX + (viewportX - originX) * scale,
            y: originY + (viewportY - originY) * scale - z * this.gridConfig.verticalDepthLift,
            normalizedDepth
        };
    }

    drawQuantumGrid(timestamp) {
        if (!this.ctx) return false;

        const { minorGridSize, majorGridSize, sampleStep, gridOverscan } = this.gridConfig;
        const ctx = this.ctx;
        const elapsed = Math.max(0, timestamp - this.animationStartTime);
        const scrollX = window.scrollX || window.pageXOffset || 0;
        const scrollY = window.scrollY || window.pageYOffset || 0;
        const overscan = gridOverscan + minorGridSize;
        const firstX = Math.floor((scrollX - overscan) / minorGridSize) * minorGridSize;
        const lastX = scrollX + this.width + overscan;
        const firstY = Math.floor((scrollY - overscan) / minorGridSize) * minorGridSize;
        const lastY = scrollY + this.height + overscan;
        const depthBands = this.createQuantumDepthBands();

        ctx.clearRect(0, 0, this.width, this.height);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let x = firstX; x <= lastX; x += minorGridSize) {
            this.drawQuantumLine(depthBands, x, firstY, x, lastY, true, x % majorGridSize === 0, elapsed, sampleStep, scrollX, scrollY);
        }

        for (let y = firstY; y <= lastY; y += minorGridSize) {
            this.drawQuantumLine(depthBands, firstX, y, lastX, y, false, y % majorGridSize === 0, elapsed, sampleStep, scrollX, scrollY);
        }

        this.strokeQuantumDepthBands(ctx, depthBands);

        return true;
    }

    createQuantumDepthBands() {
        return {
            minor: [new Path2D(), new Path2D(), new Path2D()],
            major: [new Path2D(), new Path2D(), new Path2D()]
        };
    }

    getQuantumDepthBand(normalizedDepth) {
        if (normalizedDepth < -0.24) return 0;
        if (normalizedDepth > 0.24) return 2;
        return 1;
    }

    drawQuantumLine(depthBands, startX, startY, endX, endY, isVertical, isMajor, elapsed, sampleStep, scrollX, scrollY) {
        const length = isVertical ? endY - startY : endX - startX;
        const steps = Math.max(2, Math.ceil(length / sampleStep));
        const paths = isMajor ? depthBands.major : depthBands.minor;
        let previousPoint = null;

        for (let i = 0; i <= steps; i++) {
            const progress = i / steps;
            const worldX = isVertical ? startX : startX + length * progress;
            const worldY = isVertical ? startY + length * progress : startY;
            const point = this.projectQuantumPoint(worldX, worldY, elapsed, scrollX, scrollY);

            if (previousPoint) {
                const path = paths[this.getQuantumDepthBand((previousPoint.normalizedDepth + point.normalizedDepth) * 0.5)];
                path.moveTo(previousPoint.x, previousPoint.y);
                path.lineTo(point.x, point.y);
            }

            previousPoint = point;
        }
    }

    strokeQuantumDepthBands(ctx, depthBands) {
        const bandStyles = [
            { minorAlpha: 0.052, majorAlpha: 0.092, minorWidth: 0.9, majorWidth: 1.12 },
            { minorAlpha: 0.066, majorAlpha: 0.118, minorWidth: 0.99, majorWidth: 1.24 },
            { minorAlpha: 0.084, majorAlpha: 0.152, minorWidth: 1.08, majorWidth: 1.38 }
        ];

        bandStyles.forEach((style, index) => {
            ctx.strokeStyle = `rgba(255, 255, 255, ${style.minorAlpha})`;
            ctx.lineWidth = style.minorWidth;
            ctx.stroke(depthBands.minor[index]);

            ctx.strokeStyle = `rgba(99, 102, 241, ${style.majorAlpha})`;
            ctx.lineWidth = style.majorWidth;
            ctx.stroke(depthBands.major[index]);
        });
    }
}
