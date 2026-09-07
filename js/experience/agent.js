/* AI Agent product page (pages/ai-agent.html). Mounts the shared field through shell.js (one canvas,
   one scheduler), lets each section own a field mode exactly as the homepage does, reuses the closing
   reveal observer, and runs the hero's execution vignette: a timer-driven state progression
   (istek → plan → araçlar → sonuç) with no animation loop. Reduced motion shows the final state. */
import { viewport, scheduler } from './scroll.js';
import { shellField as field } from './shell.js';
import { initClosing } from './closing.js';

/* ---- hero entrance ---- */
const hero = document.querySelector('[data-agent-hero]');
if (hero) requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add('is-ready')));

/* ---- authored reveals (same observer as the homepage closing sections) ---- */
initClosing(document);

/* ---- field ownership: the section under the probe line sets the field mode ---- */
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

/* ---- execution vignette: plays once per page visit ---- */
function initVignette(root) {
    if (!root) return;
    const steps = Array.from(root.querySelectorAll('[data-rv]'));
    const typed = root.querySelector('[data-rv-typed]');
    const text = typed ? typed.dataset.text : '';
    const plan = Array.from(root.querySelectorAll('[data-rv-plan] li'));
    const tools = Array.from(root.querySelectorAll('[data-rv-tools] li'));
    const out = root.querySelector('[data-rv-out]');
    let timers = [];
    let hasPlayed = false;   // in-memory only: one authored run per page visit, never persisted
    let io = null;
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    const clear = () => { timers.forEach(clearTimeout); timers = []; };
    const stage = (i) => {
        steps.forEach((s, k) => { s.classList.toggle('is-active', k === i); s.classList.toggle('is-done', k < i); });
        root.dataset.stage = String(i);
    };
    /** the completed state; idempotent, ends any running sequence for good */
    const finish = () => {
        clear(); hasPlayed = true;
        if (io) { io.disconnect(); io = null; }
        steps.forEach((s) => { s.classList.remove('is-active'); s.classList.add('is-done'); });
        if (typed) typed.textContent = text;
        plan.forEach((li) => li.classList.add('is-on'));
        tools.forEach((li) => li.classList.add('is-on'));
        if (out) out.classList.add('is-on');
        root.dataset.stage = '4';
    };
    const play = () => {
        hasPlayed = true; stage(0);
        let t = 420;
        for (let i = 1; i <= text.length; i++) { const n = i; at(t, () => { typed.textContent = text.slice(0, n); }); t += 26 + (i % 4) * 8; }
        t += 620; at(t, () => stage(1));
        plan.forEach((li) => { t += 360; at(t, () => li.classList.add('is-on')); });
        t += 640; at(t, () => stage(2));
        tools.forEach((li) => { t += 400; at(t, () => li.classList.add('is-on')); });
        t += 700; at(t, () => stage(3));
        t += 420; at(t, () => out.classList.add('is-on'));
        t += 900; at(t, finish);
    };
    if (viewport.reduced || typeof IntersectionObserver === 'undefined') { finish(); return; }
    // first meaningful entry starts the one run; leaving early or hiding the tab jumps to the end.
    // Scrolling back never restarts it. The observer is released when the run finishes.
    io = new IntersectionObserver((entries) => {
        for (const e of entries) {
            if (e.isIntersecting) { if (!hasPlayed) play(); }
            else if (hasPlayed) finish();
        }
    }, { threshold: 0.3 });
    io.observe(root);
    document.addEventListener('visibilitychange', () => { if (document.hidden && hasPlayed) finish(); });
}
initVignette(document.querySelector('[data-vignette]'));
