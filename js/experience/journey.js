/* The pinned product journey: four steps (Keşfet · Seç · Bağla · Çalıştır) driven by native scroll.
   Each step owns a quarter of the pinned range; the device window changes panel; a scripted cursor
   demonstrates the step (time-based inside a scroll-owned step) and every control also answers real
   clicks. Content is the Product Discover flow as it exists on the platform, labelled temsilî demo. */
import { viewport, scheduler, pinProgress, clamp, easeOut } from './scroll.js';

export function initJourney(section) {
    if (!section) return;
    const $ = (s, c = section) => c.querySelector(s), $$ = (s, c = section) => Array.from(c.querySelectorAll(s));
    const reduced = viewport.reduced;
    const tabs = $$('[role="tab"]'), bars = $$('.journey-tab__bar'), panels = $$('.journey-panel'), title = $('[data-device-title]');
    const TITLES = ['kütüphane', 'product-discover', 'kaynaklar', 'çalışıyor'];
    const body = $('.device__body'), fcur = $('[data-fcur]');
    const chips = $$('[data-chip]'), tiles = $$('[data-tile]'), tileMain = $('[data-tile-main]'), countEl = $('[data-count]');
    const btnSel = $('[data-btn-select]'), perm = $('[data-perm]'), toast = $('[data-toast]');
    const hub = $('[data-hub]'), hubSvg = $('[data-hub-lines]'), lines = $$('line', hubSvg), nodes = {};
    $$('[data-node]', hub).forEach((n) => { nodes[n.dataset.node] = n; });
    const btnRun = $('[data-btn-run]'), statusEl = $('[data-status]'), statusText = $('[data-status-text]'), logItems = $$('[data-log] li'), counters = $$('[data-counter]');
    let timers = [], countRaf = 0, lastStep = -1, lastIn = false;
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    const clearDemo = () => { timers.forEach(clearTimeout); timers = []; cancelAnimationFrame(countRaf); fcur.classList.remove('is-on'); };
    const curTo = (el, dx = 0, dy = 0) => { const s = body.getBoundingClientRect(), r = el.getBoundingClientRect(); fcur.style.transform = `translate(${(r.left - s.left + r.width / 2 + dx).toFixed(1)}px, ${(r.top - s.top + r.height / 2 + dy).toFixed(1)}px)`; };
    const curPark = () => { const s = body.getBoundingClientRect(); fcur.style.transform = `translate(${(s.width * 0.3).toFixed(1)}px, ${(s.height * 0.9).toFixed(1)}px)`; };
    const curClick = (el) => { fcur.classList.add('is-click'); setTimeout(() => fcur.classList.remove('is-click'), 320); if (el) { el.classList.add('is-press'); setTimeout(() => el.classList.remove('is-press'), 180); } };
    function setFilter(cat) { chips.forEach((c) => c.classList.toggle('is-on', c.dataset.chip === cat)); let n = 0; tiles.forEach((t) => { const hide = cat !== 'all' && t.dataset.tile !== cat; t.classList.toggle('is-hidden', hide); if (!hide) n++; }); countEl.textContent = `${n} sonuç`; chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.chip === cat))); }
    function selectAgent() { btnSel.classList.remove('is-hover'); btnSel.classList.add('is-done'); btnSel.textContent = 'Eklendi'; }
    function connect(name) { const n = nodes[name]; if (!n) return; n.classList.add('is-on'); n.querySelector('.node__btn').textContent = 'Bağlı'; const l = lines.find((x) => x.dataset.to === name); if (l) l.classList.add('is-on'); }
    function startRun() { statusEl.classList.add('is-on'); statusText.textContent = 'Çalışıyor'; btnRun.classList.add('is-done'); btnRun.textContent = 'Çalışıyor'; }
    function runCounters(dur) { cancelAnimationFrame(countRaf); const t0 = performance.now(); (function f(now) { const e = easeOut(clamp((now - t0) / dur, 0, 1)); counters.forEach((c) => { c.textContent = Math.round(+c.dataset.counter * e); }); if (e < 1) countRaf = requestAnimationFrame(f); })(t0); }
    function layoutHub() {
        const r = hub.getBoundingClientRect(); if (!r.width) return;
        hubSvg.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
        const core = nodes.core.firstElementChild.getBoundingClientRect(), cx = core.left - r.left + core.width / 2, cy = core.top - r.top + core.height / 2;
        lines.forEach((l) => { const n = nodes[l.dataset.to]; const c = n && n.firstElementChild.getBoundingClientRect(); if (!c || !c.width) { l.style.display = 'none'; return; } l.style.display = ''; l.setAttribute('x1', cx); l.setAttribute('y1', cy); l.setAttribute('x2', c.left - r.left + c.width / 2); l.setAttribute('y2', c.top - r.top + c.height / 2); });
    }
    function resetPanels() {
        setFilter('all'); tiles.forEach((t) => t.classList.remove('is-sel', 'is-hover'));
        btnSel.classList.remove('is-done', 'is-hover'); btnSel.textContent = 'Ekle'; toast.classList.remove('is-on');
        Object.values(nodes).forEach((n) => n.classList.remove('is-on')); $$('.node__btn', hub).forEach((b) => { b.textContent = 'Bağlan'; }); lines.forEach((l) => l.classList.remove('is-on'));
        statusEl.classList.remove('is-on'); statusText.textContent = 'Hazır'; btnRun.classList.remove('is-done'); btnRun.textContent = 'Çalıştır';
        logItems.forEach((l) => l.classList.remove('is-on')); counters.forEach((c) => { c.textContent = '0'; });
    }
    function finalState(k) {
        if (k === 0) { setFilter('urun'); tileMain.classList.add('is-sel'); }
        if (k === 1) selectAgent();
        if (k === 2) { layoutHub(); ['store', 'market', 'workspace'].forEach(connect); }
        if (k === 3) { startRun(); logItems.forEach((l) => l.classList.add('is-on')); counters.forEach((c) => { c.textContent = c.dataset.counter; }); }
    }
    function runDemo(k) {
        clearDemo(); resetPanels();
        if (reduced) { finalState(k); return; }
        fcur.style.transition = 'none'; curPark(); void fcur.offsetWidth; fcur.style.transition = '';
        at(350, () => fcur.classList.add('is-on'));
        if (k === 0) { const chip = chips.find((c) => c.dataset.chip === 'urun'); at(500, () => curTo(chip)); at(1350, () => { curClick(chip); setFilter('urun'); }); at(2300, () => curTo(tileMain)); at(2700, () => tileMain.classList.add('is-hover')); at(3200, () => { curClick(tileMain); tileMain.classList.add('is-sel'); }); at(4300, curPark); }
        if (k === 1) { at(500, () => curTo(perm, 0, 14)); at(1700, () => curTo(btnSel)); at(2000, () => btnSel.classList.add('is-hover')); at(2500, () => { curClick(btnSel); selectAgent(); }); at(2900, () => toast.classList.add('is-on')); at(3600, curPark); at(5400, () => toast.classList.remove('is-on')); }
        if (k === 2) { layoutHub(); ['store', 'market', 'workspace'].forEach((name, i) => { const b = nodes[name].querySelector('.node__btn'), t = 600 + i * 1500; at(t, () => curTo(b)); at(t + 850, () => { curClick(b); connect(name); }); }); at(5300, curPark); }
        if (k === 3) { at(500, () => curTo(btnRun)); at(1300, () => { curClick(btnRun); startRun(); }); logItems.forEach((l, i) => at(1700 + i * 520, () => l.classList.add('is-on'))); at(1800, () => runCounters(2800)); at(2100, curPark); }
    }
    // the demo also answers real input
    chips.forEach((c) => c.addEventListener('click', () => setFilter(c.dataset.chip)));
    tiles.forEach((t) => t.addEventListener('click', () => { tiles.forEach((o) => o.classList.remove('is-sel')); t.classList.add('is-sel'); }));
    btnSel.addEventListener('click', () => { selectAgent(); toast.classList.add('is-on'); setTimeout(() => toast.classList.remove('is-on'), 2500); });
    $$('.node__btn', hub).forEach((b) => b.addEventListener('click', () => connect(b.parentElement.dataset.node)));
    btnRun.addEventListener('click', () => { if (btnRun.classList.contains('is-done')) return; startRun(); logItems.forEach((l, i) => setTimeout(() => l.classList.add('is-on'), 300 + i * 500)); runCounters(2800); });
    // tabs scroll to their step inside the pinned range (native scroll, smooth unless reduced)
    tabs.forEach((t, i) => t.addEventListener('click', () => { const top = section.getBoundingClientRect().top + window.scrollY + (i / 4 + 0.04) * (section.offsetHeight - viewport.H); window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' }); }));
    tabs.forEach((t, i) => t.addEventListener('keydown', (e) => { const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return; e.preventDefault(); const n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); n.click(); }));

    scheduler.add(({ changed, H }) => {
        if (!changed) return;
        const r = section.getBoundingClientRect();
        const p = clamp(-r.top / (r.height - H), 0, 0.9999);
        const step = Math.floor(p * 4), within = p * 4 - step;
        const inView = r.top < H * 0.5 && r.bottom > H * 0.5;
        if (step !== lastStep || inView !== lastIn) {
            if (step !== lastStep) { tabs.forEach((t, i) => { t.classList.toggle('is-active', i === step); t.setAttribute('aria-selected', String(i === step)); t.tabIndex = i === step ? 0 : -1; }); panels.forEach((pn, i) => { pn.classList.toggle('is-active', i === step); pn.hidden = i !== step; }); title.textContent = TITLES[step]; }
            lastStep = step; lastIn = inView;
            if (inView) runDemo(step); else clearDemo();
        }
        bars.forEach((b, i) => { b.style.transform = `scaleX(${i < step ? 1 : i === step ? within.toFixed(3) : 0})`; });
    });
    scheduler.onResize(layoutHub);
    document.addEventListener('visibilitychange', () => { if (document.hidden) clearDemo(); else if (lastIn) runDemo(lastStep); });
}
