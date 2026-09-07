/* Robotik Süreç Otomasyonu page: shared Tools page behaviour plus the hero workflow vignette
   (four steps executing in order with a run record), played once per visit. */
import { mountToolsPage, oncePlayer, stageSteps } from '../tools.js';

mountToolsPage();

const root = document.querySelector('[data-vignette]');
if (root) {
    const steps = Array.from(root.querySelectorAll('.rpa-step'));
    const log = Array.from(root.querySelectorAll('[data-rpa-log] li'));
    const out = root.querySelector('[data-rpa-out]');
    oncePlayer(root, {
        finish() {
            steps.forEach((s) => { s.classList.remove('is-active'); s.classList.add('is-done'); });
            log.forEach((li) => li.classList.add('is-on'));
            if (out) out.classList.add('is-on');
        },
        play(at, finish) {
            let t = 400;
            // each step activates, writes its record line, then completes
            steps.forEach((s, i) => {
                at(t, () => stageSteps(steps, i));
                t += 520; at(t, () => log[i] && log[i].classList.add('is-on'));
                t += 620;
            });
            at(t, () => stageSteps(steps, steps.length));
            t += 300; at(t, () => log[4] && log[4].classList.add('is-on'));
            t += 500; at(t, () => out && out.classList.add('is-on'));
            t += 900; at(t, finish);
        },
    });
}
