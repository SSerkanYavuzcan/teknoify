/* Optional pointer layer: a small custom cursor with a hover ring (fine pointers, motion allowed,
   shown only after the first real pointer movement so the native cursor is never hidden early),
   pointer position for the field's lens, and click ripples into the field. */
import { viewport, scheduler, lerp } from './scroll.js';

export function initPointer(field) {
    window.addEventListener('pointermove', (e) => field.pointer(e.clientX, e.clientY), { passive: true });
    window.addEventListener('pointerdown', (e) => field.ripple(e.clientX, e.clientY), { passive: true });
    document.addEventListener('mouseleave', () => field.pointer(-1e4, -1e4));
    if (!viewport.fine || viewport.reduced) return;
    const dot = document.querySelector('[data-cursor]'), ring = document.querySelector('[data-cursor-ring]');
    if (!dot || !ring) return;
    let rx = -100, ry = -100, tx = -100, ty = -100, armed = false;
    window.addEventListener('mousemove', (e) => {
        tx = e.clientX; ty = e.clientY;
        dot.style.transform = `translate(${e.clientX - 3.5}px, ${e.clientY - 3.5}px)`;
        if (!armed) { armed = true; document.documentElement.classList.add('has-cursor'); }
    }, { passive: true });
    document.addEventListener('mouseleave', () => { dot.classList.add('is-out'); ring.classList.add('is-out'); });
    document.addEventListener('mouseenter', () => { dot.classList.remove('is-out'); ring.classList.remove('is-out'); });
    document.addEventListener('mouseover', (e) => { ring.classList.toggle('is-hover', !!(e.target.closest && e.target.closest('a, button, [data-hover]'))); });
    scheduler.add(() => { if (!armed) return; rx = lerp(rx, tx, 0.16); ry = lerp(ry, ty, 0.16); ring.style.transform = `translate(${(rx - 17).toFixed(1)}px, ${(ry - 17).toFixed(1)}px)`; });
}
