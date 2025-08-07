// ===========================================
// TEKNOIFY - LIGHT THEME & ANIMATIONS
// ===========================================

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all functionality
    initLoader();
    initHeader();
    initMobileMenu();
    initSmoothScrolling();
    initAnimations();
    initContactForm();
    initLightEffects();
    initPhilosophyAnimation();
});

// ===========================================
// LOADING SCREEN
// ===========================================
function initLoader() {
    const loader = document.getElementById('loader');
    
    if (loader) {
        // Hide loader after page load
        window.addEventListener('load', function() {
            setTimeout(() => {
                loader.classList.add('fade-out');
                setTimeout(() => {
                    loader.style.display = 'none';
                }, 500);
            }, 1000);
        });
    }
}

// ===========================================
// HEADER FUNCTIONALITY
// ===========================================
function initHeader() {
    const header = document.getElementById('header');
    
    if (header) {
        // Sticky header on scroll
        window.addEventListener('scroll', function() {
            if (window.scrollY > 100) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    }
}

// ===========================================
// MOBILE MENU
// ===========================================
function initMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');
    
    if (hamburger && navMenu) {
        // Toggle mobile menu
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
            document.body.classList.toggle('menu-open');
        });
        
        // Close menu when clicking on a link
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
                document.body.classList.remove('menu-open');
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
                document.body.classList.remove('menu-open');
            }
        });
    }
}

// ===========================================
// SMOOTH SCROLLING
// ===========================================
function initSmoothScrolling() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                const headerHeight = document.querySelector('.header').offsetHeight;
                const targetPosition = targetElement.offsetTop - headerHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ===========================================
// PHILOSOPHY ANIMATION
// ===========================================
function initPhilosophyAnimation() {
    // Trigger philosophy animation after page load
    setTimeout(() => {
        const innovate = document.getElementById('innovate');
        const integrate = document.getElementById('integrate');
        const inspire = document.getElementById('inspire');
        const vision = document.getElementById('vision');
        const actions = document.getElementById('hero-actions');
        
        if (innovate) {
            innovate.style.opacity = '1';
            innovate.style.transform = 'translateY(0)';
        }
        
        // Animate integrate after innovate
        setTimeout(() => {
            if (integrate) {
                integrate.style.opacity = '1';
                integrate.style.transform = 'translateY(0)';
            }
        }, 1500);
        
        // Animate inspire after integrate
        setTimeout(() => {
            if (inspire) {
                inspire.style.opacity = '1';
                inspire.style.transform = 'translateY(0)';
            }
        }, 3000);
        
        // Animate vision after inspire
        setTimeout(() => {
            if (vision) {
                vision.style.opacity = '1';
                vision.style.transform = 'translateY(0)';
            }
        }, 4500);
        
        // Animate actions after vision
        setTimeout(() => {
            if (actions) {
                actions.style.opacity = '1';
                actions.style.transform = 'translateY(0)';
            }
        }, 5500);
    }, 500);
}

// ===========================================
// LIGHT EFFECTS
// ===========================================
function initLightEffects() {
    // Create dynamic light particles
    createLightParticles();
    
    // Add mouse follow effect
    addMouseFollowEffect();
    
    // Add scroll-based light intensity
    addScrollLightEffect();
}

// Create floating light particles
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

// Mouse follow light effect
function addMouseFollowEffect() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    
    hero.addEventListener('mousemove', function(e) {
        const rect = hero.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Create light trail effect
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
        
        // Remove trail after animation
        setTimeout(() => {
            if (lightTrail.parentNode) {
                lightTrail.remove();
            }
        }, 1000);
    });
}

// Scroll-based light intensity
function addScrollLightEffect() {
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const scrollProgress = scrolled / maxScroll;
        
        // Adjust light intensity based on scroll
        const lightRays = document.querySelector('.light-rays');
        if (lightRays) {
            lightRays.style.opacity = 0.8 + (scrollProgress * 0.2);
        }
    });
}

// ===========================================
// ANIMATIONS
// ===========================================
function initAnimations() {
    // Initialize AOS (Animate On Scroll)
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            easing: 'ease-in-out',
            once: true,
            offset: 100
        });
    }
    
    // Parallax effect for hero section
    const hero = document.querySelector('.hero');
    if (hero) {
        window.addEventListener('scroll', function() {
            const scrolled = window.pageYOffset;
            const rate = scrolled * -0.5;
            hero.style.transform = `translateY(${rate}px)`;
        });
    }
    
    // Animate stats on scroll
    const stats = document.querySelectorAll('.stat-number');
    if (stats.length > 0) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateNumber(entry.target);
                }
            });
        }, { threshold: 0.5 });
        
        stats.forEach(stat => observer.observe(stat));
    }
}

// Animate number counting
function animateNumber(element) {
    const target = parseInt(element.textContent.replace(/\D/g, ''));
    const suffix = element.textContent.replace(/\d/g, '');
    let current = 0;
    const increment = target / 50;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current) + suffix;
    }, 30);
}

// ===========================================
// CONTACT FORM
// ===========================================
function initContactForm() {
    const form = document.querySelector('.contact-form');
    
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);
            
            // Validate form
            if (validateForm(data)) {
                // Show loading state
                const submitBtn = form.querySelector('button[type="submit"]');
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gönderiliyor...';
                submitBtn.disabled = true;
                
                // Simulate form submission
                setTimeout(() => {
                    showNotification('Mesajınız başarıyla gönderildi!', 'success');
                    form.reset();
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }, 2000);
            }
        });
        
        // Real-time validation
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('blur', function() {
                validateField(this);
            });
            
            input.addEventListener('input', function() {
                if (this.classList.contains('error')) {
                    validateField(this);
                }
            });
        });
    }
}

// Form validation
function validateForm(data) {
    let isValid = true;
    
    // Required fields
    const requiredFields = ['name', 'email', 'message'];
    requiredFields.forEach(field => {
        if (!data[field] || data[field].trim() === '') {
            showFieldError(field, 'Bu alan zorunludur');
            isValid = false;
        }
    });
    
    // Email validation
    if (data.email && !isValidEmail(data.email)) {
        showFieldError('email', 'Geçerli bir e-posta adresi giriniz');
        isValid = false;
    }
    
    return isValid;
}

// Field validation
function validateField(field) {
    const value = field.value.trim();
    const fieldName = field.name;
    
    // Remove existing error
    field.classList.remove('error');
    const existingError = field.parentNode.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Check if required
    if (field.hasAttribute('required') && !value) {
        showFieldError(fieldName, 'Bu alan zorunludur');
        return false;
    }
    
    // Email validation
    if (fieldName === 'email' && value && !isValidEmail(value)) {
        showFieldError(fieldName, 'Geçerli bir e-posta adresi giriniz');
        return false;
    }
    
    return true;
}

// Show field error
function showFieldError(fieldName, message) {
    const field = document.querySelector(`[name="${fieldName}"]`);
    if (field) {
        field.classList.add('error');
        
        // Remove existing error message
        const existingError = field.parentNode.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        // Add new error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.color = 'var(--error-color)';
        errorDiv.style.fontSize = 'var(--font-size-sm)';
        errorDiv.style.marginTop = 'var(--spacing-xs)';
        
        field.parentNode.appendChild(errorDiv);
    }
}

// Email validation helper
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// ===========================================
// NOTIFICATIONS
// ===========================================
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--bg-card);
        color: var(--gray-900);
        padding: var(--spacing-md) var(--spacing-lg);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-xl);
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        max-width: 400px;
        transform: translateX(100%);
        transition: transform var(--transition-normal);
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Close button functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Get notification icon
function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ===========================================
// PERFORMANCE OPTIMIZATIONS
// ===========================================

// Optimize scroll events
const optimizedScrollHandler = throttle(function() {
    // Header scroll effect
    const header = document.getElementById('header');
    if (header) {
        if (window.scrollY > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }
    
    // Parallax effect
    const hero = document.querySelector('.hero');
    if (hero) {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;
        hero.style.transform = `translateY(${rate}px)`;
    }
}, 16); // ~60fps

window.addEventListener('scroll', optimizedScrollHandler);

// ===========================================
// ACCESSIBILITY IMPROVEMENTS
// ===========================================

// Keyboard navigation for mobile menu
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const hamburger = document.querySelector('.hamburger');
        const navMenu = document.querySelector('.nav-menu');
        
        if (hamburger && navMenu && navMenu.classList.contains('active')) {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
            document.body.classList.remove('menu-open');
        }
    }
});

// Focus management for mobile menu
function initFocusManagement() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            if (navMenu.classList.contains('active')) {
                // Focus first menu item when opening
                const firstLink = navMenu.querySelector('.nav-link');
                if (firstLink) {
                    setTimeout(() => firstLink.focus(), 100);
                }
            }
        });
    }
}

// Initialize focus management
initFocusManagement();

// Add CSS for light trail animation
const style = document.createElement('style');
style.textContent = `
    @keyframes light-trail {
        0% {
            opacity: 0.3;
            transform: scale(0.5);
        }
        50% {
            opacity: 0.1;
            transform: scale(1);
        }
        100% {
            opacity: 0;
            transform: scale(1.5);
        }
    }
    
    @keyframes float-particle {
        0% { transform: translateY(0px); }
        100% { transform: translateY(-100px); }
    }
`;
document.head.appendChild(style);