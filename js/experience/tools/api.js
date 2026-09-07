/* API & Entegrasyon page: shared Tools page behaviour plus the hero routing vignette
   (source systems → Teknoify → destinations; a packet travels the route once per visit). */
import { mountToolsPage, oncePlayer } from '../tools.js';

mountToolsPage();

const root = document.querySelector('[data-vignette]');
if (root) {
    const sources = Array.from(root.querySelectorAll('[data-api-src] .api-node'));
    const targets = Array.from(root.querySelectorAll('[data-api-dst] .api-node'));
    const links = Array.from(root.querySelectorAll('.api-link'));
    const hub = root.querySelector('.api-hub');
    const states = Array.from(root.querySelectorAll('[data-api-states] li'));
    oncePlayer(root, {
        finish() {
            sources.concat(targets).forEach((n) => n.classList.add('is-on'));
            links.forEach((l) => { l.classList.remove('is-run'); l.classList.add('is-on'); });
            if (hub) hub.classList.add('is-on');
            states.forEach((s) => s.classList.add('is-on'));
        },
        play(at, finish) {
            let t = 400;
            sources.forEach((n) => { t += 260; at(t, () => n.classList.add('is-on')); });
            t += 300; at(t, () => states[0] && states[0].classList.add('is-on'));
            t += 500; at(t, () => { links[0].classList.add('is-run'); });
            t += 1000; at(t, () => { links[0].classList.add('is-on'); if (hub) hub.classList.add('is-on'); });
            t += 300; at(t, () => { links[1].classList.add('is-run'); });
            t += 1000; at(t, () => { links[1].classList.add('is-on'); });
            targets.forEach((n) => { t += 240; at(t, () => n.classList.add('is-on')); });
            t += 300; at(t, () => states[1] && states[1].classList.add('is-on'));
            t += 700; at(t, () => states[2] && states[2].classList.add('is-on'));
            t += 900; at(t, finish);
        },
    });
}
