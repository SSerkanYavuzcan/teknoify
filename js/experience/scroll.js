/* Shared viewport state and one requestAnimationFrame scheduler for every scroll-linked write.
   Modules register a tick(frame) callback; frame = { now, dt, scrollY, changed, W, H }.
   The loop pauses while the document is hidden and never touches layout except one scrollY read. */
export const viewport = {
    W: 0, H: 0,
    reduced: matchMedia('(prefers-reduced-motion: reduce)').matches && !document.documentElement.classList.contains('force-motion'),
    fine: matchMedia('(pointer: fine)').matches && matchMedia('(hover: hover)').matches,
    touch: matchMedia('(hover: none)').matches,
    measure() { this.W = document.documentElement.clientWidth || innerWidth; this.H = document.documentElement.clientHeight || innerHeight; },
};
viewport.measure();

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
/** 0..1 progress of a tall pinned section: 0 when its top reaches the viewport top, 1 when its bottom reaches the viewport bottom */
export const pinProgress = (el, H) => { const r = el.getBoundingClientRect(); return clamp(-r.top / (r.height - H), 0, 1); };

const ticks = new Set();
const resizes = new Set();
let running = false, last = 0, lastY = -1;

function loop(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const scrollY = window.scrollY;
    const frame = { now, dt, scrollY, changed: scrollY !== lastY, W: viewport.W, H: viewport.H };
    lastY = scrollY;
    ticks.forEach((fn) => fn(frame));
    requestAnimationFrame(loop);
}
export const scheduler = {
    add(fn) { ticks.add(fn); return () => ticks.delete(fn); },
    onResize(fn) { resizes.add(fn); },
    start() { if (running) return; running = true; last = performance.now(); lastY = -1; requestAnimationFrame(loop); },
    stop() { running = false; },
    /** force the next frame to treat scroll as changed */
    invalidate() { lastY = -1; },
};
document.addEventListener('visibilitychange', () => { if (document.hidden) scheduler.stop(); else scheduler.start(); });
let rt = 0;
window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { viewport.measure(); resizes.forEach((fn) => fn()); scheduler.invalidate(); }, 80); }, { passive: true });
