/* Shared behaviour of the canonical Araçlar pages (main.tools-page). Mounts the shared field through
   shell.js (one canvas, one scheduler), lets each section own a field mode exactly as the homepage
   does, reuses the closing reveal observer, and provides the once-per-visit player every page's
   signature visualisation uses. No animation loop of its own; page modules only schedule timers. */
import { viewport, scheduler } from './scroll.js';
import { shellField as field } from './shell.js';
import { initClosing } from './closing.js';

export { viewport, field };

/** hero entrance, reveals, field ownership: call once per page */
export function mountToolsPage() {
    const hero = document.querySelector('[data-tp-hero]');
    if (hero) requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add('is-ready')));
    initClosing(document);
    const owners = Array.from(document.querySelectorAll('section[data-field-mode]'));
    if (field && owners.length) {
        let lastOwner = null;
        scheduler.add(({ changed, H }) => {
            if (!changed) return;
            const probe = H * 0.55;
            let active = null;
            for (const s of owners) { const r = s.getBoundingClientRect(); if (r.top <= probe && r.bottom > probe) { active = s; break; } }
            if (!active || active === lastOwner) return;
            field.set(active.dataset.fieldMode);
            lastOwner = active;
        });
    }
}

/**
 * Once-per-visit player for a signature visualisation.
 *   play(at)  schedules the authored sequence with at(ms, fn); must end by calling finish()
 *   finish()  sets the completed state (idempotent; must be safe to call at any time)
 * The first time `threshold` of the root is in view the run starts; leaving early or hiding the tab
 * jumps to the end; scrolling back never restarts it; reduced motion shows the end state at once.
 * In-memory only, never persisted. Returns { finish }.
 */
export function oncePlayer(root, { play, finish, threshold = 0.3 }) {
    if (!root) return null;
    let timers = [];
    let hasPlayed = false;
    let io = null;
    const clear = () => { timers.forEach(clearTimeout); timers = []; };
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    const done = () => { clear(); hasPlayed = true; if (io) { io.disconnect(); io = null; } finish(); };
    if (viewport.reduced || typeof IntersectionObserver === 'undefined') { done(); return { finish: done }; }
    io = new IntersectionObserver((entries) => {
        for (const e of entries) {
            if (e.isIntersecting) { if (!hasPlayed) { hasPlayed = true; play(at, done); } }
            else if (hasPlayed) done();
        }
    }, { threshold });
    io.observe(root);
    document.addEventListener('visibilitychange', () => { if (document.hidden && hasPlayed) done(); });
    return { finish: done };
}

/** toggles a step list: index i active, everything before it done */
export function stageSteps(steps, i) {
    steps.forEach((s, k) => { s.classList.toggle('is-active', k === i); s.classList.toggle('is-done', k < i); });
}

/**
 * Generic stepped vignette (.tp-run): steps [data-rv] resolve in order; inside each step a typed line
 * ([data-rv-typed][data-text]), checklist items ([data-rv-plan] li), chips ([data-rv-tools] li) and
 * dataset rows ([data-rv-rows] tr) light up one by one; the result ([data-rv-out]) ends the run.
 */
export function playRunVignette(root) {
    if (!root) return null;
    const steps = Array.from(root.querySelectorAll('[data-rv]'));
    const out = root.querySelector('[data-rv-out]');
    const itemsOf = (step) => [
        ...Array.from(step.querySelectorAll('[data-rv-plan] li')).map((el) => ({ el, gap: 360 })),
        ...Array.from(step.querySelectorAll('[data-rv-tools] li')).map((el) => ({ el, gap: 400 })),
        ...Array.from(step.querySelectorAll('[data-rv-rows] tr')).map((el) => ({ el, gap: 300 })),
    ];
    const stage = (i) => { stageSteps(steps, i); root.dataset.stage = String(i); };
    return oncePlayer(root, {
        finish() {
            steps.forEach((s) => { s.classList.remove('is-active'); s.classList.add('is-done'); const ty = s.querySelector('[data-rv-typed]'); if (ty) ty.textContent = ty.dataset.text; itemsOf(s).forEach(({ el }) => el.classList.add('is-on')); });
            if (out) out.classList.add('is-on');
            root.dataset.stage = String(steps.length);
        },
        play(at, finish) {
            let t = 420;
            steps.forEach((s, i) => {
                at(t, () => stage(i));
                const ty = s.querySelector('[data-rv-typed]');
                if (ty) { const text = ty.dataset.text; for (let k = 1; k <= text.length; k++) { const n = k; at(t, () => { ty.textContent = text.slice(0, n); }); t += 26 + (k % 4) * 8; } }
                itemsOf(s).forEach(({ el, gap }) => { t += gap; at(t, () => el.classList.add('is-on')); });
                t += 640;
            });
            if (out) { at(t, () => out.classList.add('is-on')); t += 900; }
            at(t, finish);
        },
    });
}
