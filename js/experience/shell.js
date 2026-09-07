/* Secondary-page shell: mounts the same environmental field the homepage uses, in one restrained state,
   behind a page that keeps its own content. One fixed canvas per page, the shared scheduler (which stops
   while the document is hidden), the field's own DPR cap, adaptive density and reduced-motion still
   render, plus the pointer lens and click ripples. No custom cursor: secondary pages keep the native one.
   The canvas declares its state with data-field-mode (default: the hero state). */
import { scheduler } from './scroll.js';
import { createField } from './field.js';

export function mountShell(root = document) {
    const canvas = root.querySelector('[data-field]');
    if (!canvas || canvas.dataset.mounted) return null;
    canvas.dataset.mounted = '1';
    const field = createField(canvas);
    field.set(canvas.dataset.fieldMode || 'hero');
    window.addEventListener('pointermove', (e) => field.pointer(e.clientX, e.clientY), { passive: true });
    window.addEventListener('pointerdown', (e) => field.ripple(e.clientX, e.clientY), { passive: true });
    document.addEventListener('mouseleave', () => field.pointer(-1e4, -1e4));
    scheduler.start();
    return field;
}

/** the page's field (null when the page has no [data-field] or it was mounted by another module) */
export const shellField = mountShell();
