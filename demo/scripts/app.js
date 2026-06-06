(function () {
    function bindSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
            anchor.addEventListener('click', (event) => {
                const targetId = anchor.getAttribute('href');
                if (!targetId || targetId === '#') {
                    return;
                }

                const target = document.querySelector(targetId);
                if (!target) {
                    return;
                }

                event.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });
    }

    function bindMobileMenu() {
        const hamburger = document.querySelector('.hamburger');
        const navMenu = document.querySelector('#navMenu');
        if (!hamburger || !navMenu) {
            return;
        }

        hamburger.addEventListener('click', () => {
            const isOpen = navMenu.classList.toggle('active');
            hamburger.classList.toggle('active', isOpen);
            hamburger.setAttribute('aria-expanded', String(isOpen));
        });
    }

    function bootstrap() {
        const demos = Array.isArray(window.TEKNOIFY_DEMOS) ? window.TEKNOIFY_DEMOS : [];

        if (window.TeknoifyDemoCatalog) {
            window.TeknoifyDemoCatalog.init(demos);
        }

        bindSmoothScroll();
        bindMobileMenu();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }
})();
