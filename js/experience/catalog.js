/* The capability catalog: on wide viewports a tall section pins its viewport and native vertical scroll
   translates the card track horizontally while the rail stays anchored; the index reflects the active
   card and clicking an index entry moves the page to that card's progress. Below the breakpoint the
   track is a native horizontal scroll-snap area. Vignettes animate only while their card is in view,
   pause when the tab is hidden, and show their end state under reduced motion (CSS). */
import { viewport, scheduler, clamp } from './scroll.js';

export function initCatalog(section) {
    if (!section) return;
    const wrap = section.querySelector('[data-track-wrap]');
    const track = section.querySelector('[data-track]');
    const cards = Array.from(section.querySelectorAll('[data-card]'));
    const index = Array.from(section.querySelectorAll('[data-index]'));
    const status = section.querySelector('[data-catalog-status]');
    const wide = matchMedia('(min-width: 64rem)');
    const reduced = viewport.reduced;
    let max = 0, gap = 20, cardW = 400, lastActive = -1, lastTx = -1;

    function measure() {
        const cs = getComputedStyle(track);
        gap = parseFloat(cs.columnGap || cs.gap) || 20;
        cardW = cards[0].offsetWidth;
        if (!wide.matches) { track.style.transform = ''; max = 0; return; }
        const last = cards[cards.length - 1];
        const pad = parseFloat(cs.paddingRight) || 0;
        max = Math.max(0, last.offsetLeft + last.offsetWidth + pad - wrap.clientWidth);
        lastTx = -1; scheduler.invalidate();
    }
    function setActive(i) {
        if (i === lastActive) return;
        lastActive = i;
        cards.forEach((c, k) => c.classList.toggle('is-active', k === i));
        index.forEach((b, k) => { b.classList.toggle('is-active', k === i); b.setAttribute('aria-current', k === i ? 'true' : 'false'); });
        if (status) status.textContent = `${String(i + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
    }
    // vignettes run only while their card is in view
    const io = new IntersectionObserver((entries) => entries.forEach((e) => e.target.classList.toggle('is-in', e.isIntersecting)), { root: wide.matches ? null : wrap, threshold: 0.25 });
    cards.forEach((c) => io.observe(c));
    document.addEventListener('visibilitychange', () => section.classList.toggle('is-hidden-tab', document.hidden));

    scheduler.add(({ changed, H }) => {
        if (!changed || !wide.matches) return;
        const r = section.getBoundingClientRect();
        const p = clamp(-r.top / (r.height - H), 0, 1);
        const tx = max * p;
        if (Math.abs(tx - lastTx) < 0.2) return;
        lastTx = tx;
        track.style.transform = `translate3d(${(-tx).toFixed(1)}px, 0, 0)`;
        setActive(clamp(Math.round(tx / (cardW + gap)), 0, cards.length - 1));
    });
    // touch / narrow: active card follows the horizontal scroll position
    wrap.addEventListener('scroll', () => { if (wide.matches) return; const i = clamp(Math.round(wrap.scrollLeft / (cardW + gap)), 0, cards.length - 1); setActive(i); }, { passive: true });
    // index: move the page (wide) or the track (narrow) to a card
    index.forEach((b, i) => b.addEventListener('click', () => {
        if (wide.matches) {
            const p = clamp(i * (cardW + gap) / Math.max(1, max), 0, 1);
            const top = section.getBoundingClientRect().top + window.scrollY + p * (section.offsetHeight - viewport.H) + 2;
            window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
        } else {
            wrap.scrollTo({ left: i * (cardW + gap), behavior: reduced ? 'auto' : 'smooth' });
        }
    }));
    // keyboard on the narrow track: arrow keys move between cards
    wrap.addEventListener('keydown', (e) => { if (wide.matches) return; const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return; e.preventDefault(); const i = clamp(lastActive + d, 0, cards.length - 1); wrap.scrollTo({ left: i * (cardW + gap), behavior: reduced ? 'auto' : 'smooth' }); cards[i].focus(); });
    scheduler.onResize(measure);
    wide.addEventListener('change', () => { measure(); if (!wide.matches) { track.style.transform = ''; } });
    measure();
    setActive(0);
}
