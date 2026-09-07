// Review-only: ?motion=force previews the field motion under an OS reduced-motion setting (as on the marketing pages).
if (new URLSearchParams(window.location.search).get('motion') === 'force') document.documentElement.classList.add('force-motion');
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
        // canonical header: solid backdrop once the page scrolls (same rule as the marketing pages)
        const header = document.getElementById('header');
        if (header) { const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 50); onScroll(); window.addEventListener('scroll', onScroll, { passive: true }); }
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
