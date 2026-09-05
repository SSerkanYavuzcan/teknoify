/* Homepage experience v2: wires the environmental field, the hero, the manifesto, the pinned product
   journey, the audience split, the capability catalog and the pointer layer to one scheduler. Sections declare the field state they own with
   data-field; the manifesto blends chaos → order with its own progress. */
import { viewport, scheduler, clamp } from './scroll.js';
import { createField } from './field.js';
import { initHero } from './hero.js';
import { initManifesto } from './manifesto.js';
import { initJourney } from './journey.js';
import { initPointer } from './pointer.js';
import { initAudience } from './audience.js';
import { initCatalog } from './catalog.js';

const canvas = document.querySelector('[data-field]');
const field = canvas ? createField(canvas) : { set() {}, blend() {}, pointer() {}, ripple() {} };
initHero(document.querySelector('[data-hero]'));
initManifesto(document.querySelector('[data-manifesto]'), field);
initJourney(document.querySelector('[data-journey]'));
initPointer(field);
initAudience(document.querySelector('[data-audience]'));
initCatalog(document.querySelector('[data-catalog]'));

const owners = Array.from(document.querySelectorAll('[data-field-mode]'));
const progress = document.querySelector('[data-scroll-progress]');
let lastOwner = null;
scheduler.add(({ scrollY, changed, H }) => {
    if (!changed) return;
    const docH = document.documentElement.scrollHeight - H;
    if (progress) progress.style.transform = `scaleX(${clamp(scrollY / docH, 0, 1).toFixed(4)})`;
    const probe = H * 0.55;
    let active = null;
    for (const s of owners) { const r = s.getBoundingClientRect(); if (r.top <= probe && r.bottom > probe) { active = s; break; } }
    if (!active) return;
    const mode = active.dataset.fieldMode;
    if (mode === 'chaos-order') field.blend('chaos', 'order', Number(active.dataset.blend || 0));
    else if (active !== lastOwner) field.set(mode);
    lastOwner = active;
});
scheduler.start();
