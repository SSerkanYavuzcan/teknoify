/* Audience split (Kimin için): two balanced halves; on fine pointers hovering a half expands it and the
   other recedes, keyboard focus and click/tap do the same, and every list stays in the document for
   assistive technology. Below the desktop breakpoint both lists are simply open. */
export function initAudience(root) {
    if (!root) return;
    const halves = Array.from(root.querySelectorAll('[data-half]'));
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const set = (id) => {
        root.dataset.open = id || '';
        halves.forEach((h) => {
            const on = h.dataset.half === id;
            h.classList.toggle('is-open', on);
            h.classList.toggle('is-recede', !!id && !on);
            const btn = h.querySelector('[data-half-toggle]');
            if (btn) btn.setAttribute('aria-expanded', String(on));
        });
    };
    halves.forEach((h) => {
        const id = h.dataset.half, btn = h.querySelector('[data-half-toggle]');
        if (btn) btn.addEventListener('click', () => set(root.dataset.open === id && !fine ? null : id));
        h.addEventListener('focusin', () => set(id));
        if (fine) { h.addEventListener('pointerenter', () => set(id)); }
    });
    if (fine) root.addEventListener('pointerleave', () => { if (!root.contains(document.activeElement)) set(null); });
    root.addEventListener('focusout', (e) => { if (!root.contains(e.relatedTarget)) set(null); });
    root.addEventListener('keydown', (e) => { if (e.key === 'Escape') { set(null); } });
}
