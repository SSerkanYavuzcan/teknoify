/* Finansal İndikatör & Botlar page: shared Tools page behaviour plus the hero monitoring vignette
   (veri → indikatör → kural → sinyal), played once per visit. */
import { mountToolsPage, oncePlayer } from '../tools.js';
import { initMarket } from './market.js';

mountToolsPage();
initMarket(document.querySelector('[data-market]'));

const root = document.querySelector('[data-vignette]');
if (root) {
    const chart = root.querySelector('.fi-chart');
    const pipe = Array.from(root.querySelectorAll('.fi-pipe li'));
    const out = root.querySelector('[data-fi-out]');
    const states = ['s-data', 's-ind', 's-rule', 's-signal'];
    oncePlayer(root, {
        finish() {
            states.forEach((s) => chart.classList.add(s));
            pipe.forEach((li) => li.classList.add('is-on'));
            if (out) out.classList.add('is-on');
        },
        play(at, finish) {
            let t = 400;
            states.forEach((s, i) => {
                at(t, () => { chart.classList.add(s); if (pipe[i]) pipe[i].classList.add('is-on'); });
                t += i === 0 ? 1500 : 900;
            });
            t += 200; at(t, () => out && out.classList.add('is-on'));
            t += 900; at(t, finish);
        },
    });
}
