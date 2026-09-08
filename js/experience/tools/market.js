/* Finansal İndikatör & Botlar page: the embedded market screen. Series are generated deterministically
   (seeded walk per symbol and timeframe) so the screen is stable and representative; every derived value
   on the screen (EMA, RSI, MACD sign, levels, side, entry/stop/target) is computed from that series. */

const SYMBOLS = [
    { sym: 'BTC/USDT', venue: 'spot', base: 64200, vol: 0.012, dp: 0, seed: 11 },
    { sym: 'ETH/USDT', venue: 'spot', base: 3420, vol: 0.014, dp: 0, seed: 23 },
    { sym: 'USD/TRY', venue: 'kur', base: 34.18, vol: 0.0025, dp: 2, seed: 37 },
    { sym: 'XAU/USD', venue: 'ons', base: 2384, vol: 0.006, dp: 0, seed: 41 },
    { sym: 'EUR/USD', venue: 'parite', base: 1.084, vol: 0.003, dp: 4, seed: 53 },
];
const TIMEFRAMES = ['15m', '1h', '4h', '1D'];
const N = 44;

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function series(cfg, tf) {
    const r = rng(cfg.seed * 7919 + TIMEFRAMES.indexOf(tf) * 104729 + 17);
    const scale = { '15m': 0.35, '1h': 0.6, '4h': 1, '1D': 1.6 }[tf];
    const out = []; let close = cfg.base * (1 - cfg.vol * scale * 8);
    let drift = 0.25;
    for (let i = 0; i < N; i++) {
        const open = close;
        const step = (r() - 0.5 + drift * 0.18) * cfg.vol * scale * close;
        close = open + step;
        const hi = Math.max(open, close) + r() * cfg.vol * scale * close * 0.6;
        const lo = Math.min(open, close) - r() * cfg.vol * scale * close * 0.6;
        if (i % 11 === 10) drift = r() > 0.35 ? 0.3 : -0.2;
        out.push({ o: open, h: hi, l: lo, c: close });
    }
    return out;
}
const ema = (vals, n) => { const k = 2 / (n + 1); const out = []; let e = vals[0]; vals.forEach((v, i) => { e = i === 0 ? v : v * k + e * (1 - k); out.push(e); }); return out; };
function rsi(closes, n = 14) { let g = 0, l = 0; for (let i = closes.length - n; i < closes.length; i++) { const d = closes[i] - closes[i - 1]; if (d > 0) g += d; else l -= d; } if (l === 0) return 100; const rs = g / n / (l / n); return Math.round(100 - 100 / (1 + rs)); }
const fmt = (v, dp) => v.toLocaleString('tr-TR', { minimumFractionDigits: dp, maximumFractionDigits: dp });

function renderChart(svg, candles, cfg, compact) {
    const W = compact ? 380 : 640, H = compact ? 300 : 260, padL = 8, padR = compact ? 54 : 62, padT = 14, padB = 22;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.style.aspectRatio = `${W} / ${H}`;
    const closes = candles.map((c) => c.c);
    const e20 = ema(closes, 20), e50 = ema(closes, 50);
    const lows = candles.map((c) => c.l), highs = candles.map((c) => c.h);
    const min = Math.min(...lows), max = Math.max(...highs), span = max - min || 1;
    const x = (i) => padL + (i + 0.5) * ((W - padL - padR) / N);
    const y = (v) => padT + (1 - (v - min) / span) * (H - padT - padB);
    const cw = ((W - padL - padR) / N) * 0.56;
    const support = Math.min(...lows.slice(-18)), resist = Math.max(...highs.slice(-18));
    const path = (arr) => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const grid = [0, 0.25, 0.5, 0.75, 1].map((t) => { const v = min + t * span; const yy = y(v).toFixed(1); return `<line class="mk-grid" x1="${padL}" y1="${yy}" x2="${W - padR}" y2="${yy}"/><text class="mk-axis" x="${W - padR + 8}" y="${(+yy + 4).toFixed(1)}">${fmt(v, cfg.dp)}</text>`; }).join('');
    const bars = candles.map((c, i) => { const up = c.c >= c.o; const top = y(Math.max(c.o, c.c)), bot = y(Math.min(c.o, c.c)); return `<g class="mk-candle ${up ? 'is-up' : 'is-down'}" style="--i:${i}"><line x1="${x(i).toFixed(1)}" y1="${y(c.h).toFixed(1)}" x2="${x(i).toFixed(1)}" y2="${y(c.l).toFixed(1)}"/><rect x="${(x(i) - cw / 2).toFixed(1)}" y="${top.toFixed(1)}" width="${cw.toFixed(1)}" height="${Math.max(1.5, bot - top).toFixed(1)}" rx="1"/></g>`; }).join('');
    const area = `M${x(0).toFixed(1)},${H - padB} ` + e20.map((v, i) => `L${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ') + ` L${x(N - 1).toFixed(1)},${H - padB} Z`;
    svg.innerHTML = `<defs><linearGradient id="mk-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5945d2" stop-opacity="0.28"/><stop offset="1" stop-color="#5945d2" stop-opacity="0"/></linearGradient></defs>
        ${grid}
        <path class="mk-area" d="${area}"/>
        <line class="mk-level mk-level--r" x1="${padL}" y1="${y(resist).toFixed(1)}" x2="${W - padR}" y2="${y(resist).toFixed(1)}"/><text class="mk-lvl-label" x="${padL + 6}" y="${(y(resist) - 5).toFixed(1)}">direnç ${fmt(resist, cfg.dp)}</text>
        <line class="mk-level mk-level--s" x1="${padL}" y1="${y(support).toFixed(1)}" x2="${W - padR}" y2="${y(support).toFixed(1)}"/><text class="mk-lvl-label" x="${padL + 6}" y="${(y(support) + 13).toFixed(1)}">destek ${fmt(support, cfg.dp)}</text>
        <g class="mk-bars">${bars}</g>
        <path class="mk-ema mk-ema--50" d="${path(e50)}"/><path class="mk-ema mk-ema--20" d="${path(e20)}"/>
        <line class="mk-last" x1="${padL}" y1="${y(closes[N - 1]).toFixed(1)}" x2="${W - padR}" y2="${y(closes[N - 1]).toFixed(1)}"/><rect class="mk-last-tag" x="${W - padR + 2}" y="${(y(closes[N - 1]) - 9).toFixed(1)}" width="${padR - 4}" height="18" rx="3"/><text class="mk-last-text" x="${W - padR + 8}" y="${(y(closes[N - 1]) + 4).toFixed(1)}">${fmt(closes[N - 1], cfg.dp)}</text>`;
    return { closes, e20, e50, support, resist, min, max, y, padT, padB, H };
}

export function initMarket(root) {
    if (!root) return;
    const svg = root.querySelector('[data-chart]');
    const q = (k) => root.querySelector(`[data-m="${k}"]`);
    const tfBtns = Array.from(root.querySelectorAll('[data-tf]'));
    const watch = Array.from(root.querySelectorAll('[data-sym]'));
    let cur = { sym: 0, tf: '1h' };
    let geo = null, cfg = SYMBOLS[0];
    const compactMq = matchMedia('(max-width: 47.99rem)');
    function render() {
        cfg = SYMBOLS[cur.sym];
        const candles = series(cfg, cur.tf);
        geo = renderChart(svg, candles, cfg, compactMq.matches);
        const { closes, e20, e50, support, resist } = geo;
        const last = closes[N - 1], first = closes[0];
        const chg = ((last - first) / first) * 100;
        const long = e20[N - 1] >= e50[N - 1];
        const stop = long ? support : resist;
        const risk = Math.abs(last - stop) || last * 0.01;
        const target = long ? last + 2 * risk : last - 2 * risk;
        const rsiV = rsi(closes);
        const macdPos = e20[N - 1] - e50[N - 1] > e20[N - 2] - e50[N - 2];
        q('symbol').textContent = cfg.sym; q('venue').textContent = cfg.venue + ' · temsilî seri';
        q('last').textContent = fmt(last, cfg.dp);
        const c = q('chg'); c.textContent = (chg >= 0 ? '+' : '−') + Math.abs(chg).toFixed(1).replace('.', ',') + '%'; c.dataset.dir = chg >= 0 ? 'up' : 'down';
        const side = q('side'); side.textContent = long ? 'LONG' : 'SHORT'; side.dataset.side = long ? 'long' : 'short';
        q('rule').textContent = long ? 'EMA 20, EMA 50 üzerinde · yukarı kesişim' : 'EMA 20, EMA 50 altında · aşağı kesişim';
        q('entry').textContent = fmt(last, cfg.dp); q('stop').textContent = fmt(stop, cfg.dp); q('target').textContent = fmt(target, cfg.dp);
        q('rsi').textContent = String(rsiV); q('rsi').dataset.zone = rsiV >= 70 ? 'hot' : rsiV <= 30 ? 'cold' : 'mid';
        q('macd').textContent = macdPos ? 'pozitif' : 'negatif';
        q('trend').textContent = long ? 'yukarı' : 'aşağı';
        q('levels').textContent = `${fmt(support, cfg.dp)} / ${fmt(resist, cfg.dp)}`;
        root.dataset.side = long ? 'long' : 'short';
        tfBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tf === cur.tf)));
        watch.forEach((b, i) => b.setAttribute('aria-pressed', String(i === cur.sym)));
        svg.classList.remove('is-drawn'); void svg.getBoundingClientRect(); svg.classList.add('is-drawn');
    }
    // watchlist rows: each symbol's own 1D sketch and change
    watch.forEach((b, i) => {
        const s = SYMBOLS[i]; const cs = series(s, '1D').map((c) => c.c); const chg = ((cs[N - 1] - cs[0]) / cs[0]) * 100;
        const min = Math.min(...cs), max = Math.max(...cs), span = max - min || 1;
        b.querySelector('[data-w="price"]').textContent = fmt(cs[N - 1], s.dp);
        const w = b.querySelector('[data-w="chg"]'); w.textContent = (chg >= 0 ? '+' : '−') + Math.abs(chg).toFixed(1).replace('.', ',') + '%'; w.dataset.dir = chg >= 0 ? 'up' : 'down';
        const p = b.querySelector('path'); if (p) p.setAttribute('d', cs.map((v, k) => `${k ? 'L' : 'M'}${((k / (N - 1)) * 76 + 2).toFixed(1)},${(20 - ((v - min) / span) * 16).toFixed(1)}`).join(' '));
        b.addEventListener('click', () => { cur.sym = i; render(); });
    });
    tfBtns.forEach((b) => b.addEventListener('click', () => { cur.tf = b.dataset.tf; render(); }));
    compactMq.addEventListener('change', render);
    // crosshair with the price at the pointer (fine pointers only)
    const cross = root.querySelector('[data-cross]');
    if (cross && matchMedia('(hover: hover) and (pointer: fine)').matches) {
        const box = svg.parentElement;
        box.addEventListener('pointermove', (e) => {
            if (!geo) return;
            const r = svg.getBoundingClientRect(); const yy = ((e.clientY - r.top) / r.height) * geo.H;
            if (yy < geo.padT || yy > geo.H - geo.padB) { cross.hidden = true; return; }
            const v = geo.max - ((yy - geo.padT) / (geo.H - geo.padT - geo.padB)) * (geo.max - geo.min);
            cross.hidden = false; cross.style.top = `${e.clientY - r.top}px`; cross.style.left = `${e.clientX - r.left}px`;
            cross.querySelector('[data-cross-price]').textContent = fmt(v, cfg.dp);
        });
        box.addEventListener('pointerleave', () => { cross.hidden = true; });
    }
    render();
}
