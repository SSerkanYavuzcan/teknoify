/* Manifesto: a sticky statement revealed word by word by scroll progress while the field behind it
   moves from chaos toward order. Reduced motion: every word fully visible, field static. */
import { viewport, scheduler, pinProgress, clamp, easeOut } from './scroll.js';

export function initManifesto(section, field) {
    if (!section) return;
    const text = section.querySelector('[data-manifesto-text]');
    const raw = text.textContent.trim().split(/\s+/);
    text.textContent = '';
    const words = raw.map((w, i) => { const s = document.createElement('span'); s.className = 'manifesto__w'; s.textContent = w; text.appendChild(s); if (i < raw.length - 1) text.appendChild(document.createTextNode(' ')); return s; });
    if (viewport.reduced) { words.forEach((w) => { w.style.opacity = '1'; }); }
    let lastP = -1;
    scheduler.add(({ changed, H }) => {
        if (!changed) return;
        const p = pinProgress(section, H);
        if (p === lastP) return; lastP = p;
        if (!viewport.reduced) { const v = clamp(p * 1.3, 0, 1) * (words.length + 3); for (let i = 0; i < words.length; i++) words[i].style.opacity = clamp((v - i) / 3, 0.12, 1).toFixed(2); }
        section.dataset.blend = easeOut(p).toFixed(3);                     // read by the section owner to blend chaos → order
    });
}
