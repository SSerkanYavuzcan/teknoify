// ===========================================
// 0. GLOBAL INITIALIZATION
// ===========================================

document.addEventListener('DOMContentLoaded', function() {
    initHeader();              // 2. Header Functionality
    initMobileMenu();          // 3. Mobile Menu
    initSmoothScrolling();     // 4. Smooth Scrolling
    initAnimations();          // 5. Animations
    initContactForm();         // 6. Contact Form
    initLightEffects();        // 7. Light Effects
    initPhilosophyAnimation(); // 8. Philosophy Animation
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
// 5. PHILOSOPHY ANIMATION
// ===========================================
function initPhilosophyAnimation() {
    const sequence = [
        'innovate', 'integrate', 'inspire', 'vision', 'hero-actions'
    ];
    let delay = 500;
    sequence.forEach((id, index) => {
        setTimeout(() => {
            const el = document.getElementById(id);
            if (el) {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }
        }, delay + index * 1500);
    });
}


// ===========================================
// 6. LIGHT EFFECTS
// ===========================================
function initLightEffects() {
    createLightParticles();
    addMouseFollowEffect();
    addScrollLightEffect();
}

// 6.1 Create floating light particles
function createLightParticles() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'light-particle';
        particle.style.cssText = `
            position: absolute;
            width: ${Math.random() * 4 + 2}px;
            height: ${Math.random() * 4 + 2}px;
            background: rgba(99, 102, 241, ${Math.random() * 0.5 + 0.3});
            border-radius: 50%;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation: float-particle ${Math.random() * 10 + 10}s linear infinite;
            animation-delay: ${Math.random() * 5}s;
            pointer-events: none;
        `;
        hero.appendChild(particle);
    }
}

// 6.2 Mouse follow light effect
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
            width: 100px;
            height: 100px;
            background: radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%);
            left: ${x - 50}px;
            top: ${y - 50}px;
            pointer-events: none;
            animation: light-trail 1s ease-out forwards;
        `;
        hero.appendChild(lightTrail);
        setTimeout(() => lightTrail.remove(), 1000);
    });
}

// 6.3 Scroll-based light intensity
function addScrollLightEffect() {
    window.addEventListener('scroll', function() {
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const scrollProgress = window.pageYOffset / maxScroll;
        const lightRays = document.querySelector('.light-rays');
        if (lightRays) {
            lightRays.style.opacity = 0.8 + (scrollProgress * 0.2);
        }
    });
}


// ===========================================
// 7. ANIMATIONS (AOS + Parallax + Stats)
// ===========================================
function initAnimations() {
    if (typeof AOS !== 'undefined') {
        AOS.init({ duration: 800, easing: 'ease-in-out', once: true, offset: 100 });
    }
    const hero = document.querySelector('.hero');
    if (hero) {
        window.addEventListener('scroll', () => {
            hero.style.transform = `translateY(${window.pageYOffset * -0.5}px)`;
        });
    }
    const stats = document.querySelectorAll('.stat-number');
    if (stats.length) {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) animateNumber(entry.target);
            });
        }, { threshold: 0.5 });
        stats.forEach(stat => observer.observe(stat));
    }
}

function animateNumber(element) {
    const target = parseInt(element.textContent.replace(/\D/g, ''));
    const suffix = element.textContent.replace(/\d/g, '');
    let current = 0;
    const increment = target / 50;
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) { current = target; clearInterval(timer); }
        element.textContent = Math.floor(current) + suffix;
    }, 30);
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
    @keyframes light-trail { 0%{opacity:.3;transform:scale(.5);} 50%{opacity:.1;transform:scale(1);} 100%{opacity:0;transform:scale(1.5);} }
    @keyframes float-particle { 0%{transform:translateY(0px);} 100%{transform:translateY(-100px);} }
`;
document.head.appendChild(style);
