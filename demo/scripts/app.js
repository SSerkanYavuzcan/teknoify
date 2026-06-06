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

    function bootstrap() {
        const demos = window.TEKNOIFY_DEMOS || [];

        if (window.TeknoifySandboxSimulator) {
            window.TeknoifySandboxSimulator.init(demos);
        }

        if (window.TeknoifyDemoCatalog) {
            window.TeknoifyDemoCatalog.init(demos);
        }

        bindSmoothScroll();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }
})();
