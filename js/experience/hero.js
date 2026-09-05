/* Hero: staged entrance, the library-search window that fills with real entries, pointer tilt
   (fine pointers only), and parallax + fade as the visitor leaves. No artificial loader: the
   entrance starts as soon as the document is ready. */
import { viewport, scheduler, clamp } from './scroll.js';

const QUERY = 'ürün fiyat';
export function initHero(root) {
    if (!root) return;
    const inner = root.querySelector('[data-hero-inner]');
    const win = root.querySelector('[data-hero-window]');
    const input = root.querySelector('[data-hero-query]');
    const rows = Array.from(root.querySelectorAll('[data-hero-row]'));
    const status = root.querySelector('[data-hero-status]');
    const count = root.querySelector('[data-hero-count]');
    const reduced = viewport.reduced;
    let timers = [];
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));

    function ready() {
        document.body.classList.add('is-ready');
        if (reduced) { if (input) input.textContent = QUERY; rows.forEach((r) => r.classList.add('is-on')); if (status) status.classList.add('is-on'); if (count) count.textContent = `${rows.length} sonuç`; return; }
        let i = 0;
        const type = () => { i++; if (input) input.textContent = QUERY.slice(0, i); if (i < QUERY.length) at(55 + Math.random() * 70, type); else { at(260, () => rows.forEach((r, k) => at(k * 160, () => { r.classList.add('is-on'); if (count) count.textContent = `${k + 1} sonuç`; }))); at(260 + rows.length * 160 + 300, () => status && status.classList.add('is-on')); } };
        at(900, type);
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(ready, ready); else ready();
    setTimeout(() => { if (!document.body.classList.contains('is-ready')) ready(); }, 900);   // never wait on fonts for long

    // tilt toward the pointer (fine pointers, motion allowed)
    if (viewport.fine && !reduced && win) {
        root.addEventListener('pointermove', (e) => { win.style.setProperty('--ty', ((e.clientX / viewport.W) - 0.5) * 6 + 'deg'); win.style.setProperty('--tx', -((e.clientY / viewport.H) - 0.5) * 6 + 'deg'); }, { passive: true });
        root.addEventListener('pointerleave', () => { win.style.setProperty('--tx', '0deg'); win.style.setProperty('--ty', '0deg'); });
    }
    // parallax + fade while leaving
    scheduler.add(({ scrollY, changed, H }) => {
        if (!changed || !inner) return;
        const hp = clamp(scrollY / H, 0, 1);
        if (!reduced) inner.style.transform = `translate3d(0, ${(scrollY * 0.22).toFixed(1)}px, 0)`;
        inner.style.opacity = clamp(1 - hp * 1.25, 0, 1).toFixed(3);
    });
    window.addEventListener('pagehide', () => timers.forEach(clearTimeout));
}
