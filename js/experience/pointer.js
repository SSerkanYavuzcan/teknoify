/* Pointer layer for the homepage field: pointer position for the field's lens and click ripples into
   the field. No custom cursor: the native cursor is the only one on the marketing site. */

export function initPointer(field) {
    window.addEventListener('pointermove', (e) => field.pointer(e.clientX, e.clientY), { passive: true });
    window.addEventListener('pointerdown', (e) => field.ripple(e.clientX, e.clientY), { passive: true });
    document.addEventListener('mouseleave', () => field.pointer(-1e4, -1e4));
}
