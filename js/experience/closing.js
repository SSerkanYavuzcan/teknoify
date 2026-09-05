/* Closing sections (Neden Teknoify, Güven, final CTA): one authored entrance per block, driven by a
   single IntersectionObserver that adds .is-in once. No loop, no scroll work. Under reduced motion the
   CSS already shows every end state, so the observer is skipped and the classes are set immediately. */
import { viewport } from './scroll.js';

export function initClosing(root = document) {
    const targets = Array.from(root.querySelectorAll('[data-reveal]'));
    if (!targets.length) return;
    if (viewport.reduced || typeof IntersectionObserver === 'undefined') {
        targets.forEach((el) => el.classList.add('is-in'));
        return;
    }
    const io = new IntersectionObserver((entries) => {
        for (const e of entries) {
            if (!e.isIntersecting) continue;
            e.target.classList.add('is-in');
            io.unobserve(e.target);
        }
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
    targets.forEach((el) => io.observe(el));
}
