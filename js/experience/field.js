/* The environmental field: a fixed canvas behind the page that reacts to the story.
   Modes: calm · chaos · order · lanes · pulse (blended continuously). Ported from the interaction
   north star with production constraints: DPR capped, cell size adaptive to the device and to the
   measured frame cost, no work while the document is hidden, and a static render under reduced motion. */
import { viewport, scheduler, clamp, lerp } from './scroll.js';

const MODES = {
    calm: { amp: 1.00, freq: 1.00, noise: 0, radial: 0, lanes: 0, speed: 1.9, glow: 0.62, warp: 8, shimmer: 0.55, spark: 0.55 },
    chaos: { amp: 1.35, freq: 2.10, noise: 1, radial: 0, lanes: 0, speed: 3.2, glow: 0.82, warp: 12, shimmer: 1.0, spark: 1.0 },
    order: { amp: 1.00, freq: 1.00, noise: 0, radial: 1, lanes: 0, speed: 1.6, glow: 0.66, warp: 6, shimmer: 0.30, spark: 0.25 },
    lanes: { amp: 0.90, freq: 1.15, noise: 0, radial: 0, lanes: 1, speed: 2.2, glow: 0.56, warp: 5, shimmer: 0.45, spark: 0.40 },
    pulse: { amp: 1.20, freq: 0.85, noise: 0, radial: 1, lanes: 0, speed: 2.6, glow: 1.0, warp: 10, shimmer: 0.50, spark: 0.85 },
};
const KEYS = Object.keys(MODES.calm);
const hash = (a, b) => { const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return v - Math.floor(v); };
const COLOR = '143, 227, 255';           // ion: the production accent
const BG = '#070a10';

export function createField(canvas) {
    const ctx = canvas.getContext('2d', { alpha: false });
    const reduced = viewport.reduced;
    const MS = reduced ? 0 : 1, WS = reduced ? 0 : 1, SPARK = reduced ? 0 : 1;
    const cur = Object.assign({}, MODES.calm), target = Object.assign({}, MODES.calm);
    const mouse = { x: -1e4, y: -1e4, tx: -1e4, ty: -1e4 };
    const ripples = [];
    let W = 0, H = 0, cell = 48, cols = 0, rows = 0, asp = 1, Z, PX, PY, PH, WV, SP, phase = 0;
    let extra = 0;                                                    // adaptive cell growth when frames are expensive
    const lowPower = (navigator.deviceMemory && navigator.deviceMemory < 4) || (navigator.connection && navigator.connection.saveData);
    if (lowPower) extra = 12;
    let dirty = true, costAvg = 0;

    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        W = viewport.W; H = viewport.H; asp = W / H;
        canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
        canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cell = (W < 640 ? 34 : W < 1100 ? 42 : 48) + extra;
        cols = Math.ceil(W * 1.3 / cell) + 3; rows = Math.ceil(H / cell) + 3;
        const n = cols * rows;
        Z = new Float32Array(n); PX = new Float32Array(n); PY = new Float32Array(n);
        const cw = cols - 1, nc = cw * (rows - 1);
        PH = new Float32Array(nc); WV = new Float32Array(nc); SP = new Float32Array(nc);
        for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cw; i++) { const c = j * cw + i; PH[c] = hash(i * 1.31, j * 2.17) * 6.2832; WV[c] = 1.2 + hash(i * 3.7 + 1, j * 1.9 + 2) * 3.4; SP[c] = hash(i * 5.3 + 3, j * 7.1 + 4); }
        dirty = true;
    }
    function compute(dt, nowS) {
        phase += dt * cur.speed;
        const t = phase, f = cur.freq, base = 0.34 * (1 - 0.62 * cur.radial - 0.62 * cur.lanes) * cur.amp;
        const mx = mouse.x, my = mouse.y, sig2 = 2 * 170 * 170, x0 = W / 2 - (cols / 2) * cell;
        for (let j = 0; j < rows; j++) {
            const y = (j - 1) * cell, ny = (y / H) * 2 - 1, yn = clamp(y / H, 0, 1), sx = 0.8 + 0.3 * yn, py0 = y * (0.86 + 0.14 * yn);
            for (let i = 0; i < cols; i++) {
                const x = x0 + i * cell, nx = (x / W) * 2 - 1, k = j * cols + i;
                let z = (Math.sin(nx * 3.2 * f + t * 0.9) + Math.sin(ny * 2.6 * f - t * 0.7) + Math.sin((nx * 1.7 + ny * 2.1) * f + t * 0.5)) * base;
                if (cur.radial > 0.01) { const r = Math.hypot(nx * asp, ny); z += cur.radial * Math.sin(r * 7 * f - t * 1.8) * 0.85 * Math.exp(-r * 0.3) * cur.amp; }
                if (cur.lanes > 0.01) z += cur.lanes * Math.sin(nx * asp * 4.2 * f - t * 2.1 + (j % 4) * 1.5) * 0.7 * cur.amp;
                if (cur.noise > 0.01) z += cur.noise * 0.55 * Math.sin(i * 1.3 + t * 5.1) * Math.cos(j * 1.7 - t * 4.3) * Math.sin((i + j) * 0.9 + t * 2.9);
                let px = W / 2 + (x - W / 2) * sx, py = py0;
                const dx = px - mx, dy = py - my, d2 = dx * dx + dy * dy;
                if (d2 < sig2 * 4) { const m = Math.exp(-d2 / sig2), d = Math.sqrt(d2) + 1; z += m * 0.9 * Math.sin(t * 3.2 - d * 0.028); px += dx / d * m * 16 * WS; py += dy / d * m * 16 * WS; }
                for (let r = 0; r < ripples.length; r++) { const rp = ripples[r], age = nowS - rp.t0, rdx = px - rp.x, rdy = py - rp.y, dd = Math.sqrt(rdx * rdx + rdy * rdy), ring = dd - age * 380; z += Math.exp(-ring * ring / 3200) * Math.exp(-age * 1.3) * 1.3; }
                Z[k] = z; PX[k] = px; PY[k] = py + z * cur.warp * WS;
            }
        }
    }
    function draw(nowS) {
        ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
        const glow = cur.glow, shim = cur.shimmer, spark = cur.spark * SPARK, mx = mouse.x, my = mouse.y, sig2 = 2 * 120 * 120, cw = cols - 1;
        for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cw; i++) {
            const k = j * cols + i, k1 = k + 1, k2 = k + cols, k3 = k + cols + 1, c = j * cw + i;
            let z = (Z[k] + Z[k1] + Z[k2] + Z[k3]) * 0.25; if (z > 1.2) z = 1.2;
            const v = z * 0.8 + Math.sin(nowS * WV[c] + PH[c]) * 0.5 * shim;
            let a = v > 0 ? v * v * glow * 0.42 : 0;
            if (spark > 0) { const cyc = nowS * 0.8 + SP[c] * 9, idx = Math.floor(cyc), fr = cyc - idx; if (hash(idx * 1.37 + i * 0.53, j * 0.71 + SP[c] * 11) > 0.94) a += spark * 0.4 * Math.exp(-fr * 7); }
            const cx = (PX[k] + PX[k3]) * 0.5, cy = (PY[k] + PY[k3]) * 0.5, dx = cx - mx, dy = cy - my;
            a += Math.exp(-(dx * dx + dy * dy) / sig2) * 0.12;
            if (a < 0.02) continue; if (a > 0.75) a = 0.75;
            ctx.fillStyle = `rgba(${COLOR},${a.toFixed(2)})`;
            ctx.beginPath(); ctx.moveTo(PX[k], PY[k]); ctx.lineTo(PX[k1], PY[k1]); ctx.lineTo(PX[k3], PY[k3]); ctx.lineTo(PX[k2], PY[k2]); ctx.closePath(); ctx.fill();
        }
        ctx.strokeStyle = `rgba(${COLOR},.11)`; ctx.lineWidth = 1; ctx.beginPath();
        for (let j = 0; j < rows; j++) { const k0 = j * cols; ctx.moveTo(PX[k0], PY[k0]); for (let i = 1; i < cols; i++) { const k = k0 + i; ctx.lineTo(PX[k], PY[k]); } }
        for (let i = 0; i < cols; i++) { ctx.moveTo(PX[i], PY[i]); for (let j = 1; j < rows; j++) { const k = j * cols + i; ctx.lineTo(PX[k], PY[k]); } }
        ctx.stroke();
    }
    function tick({ now, dt }) {
        const nowS = now / 1000;
        let moving = false;
        for (const k of KEYS) { const n = lerp(cur[k], target[k], 0.04); if (Math.abs(n - cur[k]) > 1e-4) moving = true; cur[k] = n; }
        mouse.x = lerp(mouse.x, mouse.tx, 0.14); mouse.y = lerp(mouse.y, mouse.ty, 0.14);
        while (ripples.length && nowS - ripples[0].t0 > 2.6) ripples.shift();
        if (reduced) { if (!dirty && !moving) return; dirty = false; compute(0, 0); draw(0); return; }   // reduced motion: a still field, redrawn only when the story changes it
        const t0 = performance.now();
        compute(dt * MS, nowS); draw(nowS * MS);
        costAvg = costAvg * 0.9 + (performance.now() - t0) * 0.1;
        if (costAvg > 9 && extra < 24) { extra += 6; resize(); costAvg = 0; }                             // self-throttle: coarser grid instead of dropped frames
    }
    resize();
    scheduler.onResize(resize);
    scheduler.add(tick);
    return {
        set(name) { const m = MODES[name] || MODES.calm; for (const k of KEYS) target[k] = m[k]; dirty = true; },
        blend(a, b, t) { const A = MODES[a], B = MODES[b]; for (const k of KEYS) target[k] = lerp(A[k], B[k], t); dirty = true; },
        pointer(x, y) { mouse.tx = x; mouse.ty = y; },
        ripple(x, y) { if (reduced) return; ripples.push({ x, y, t0: performance.now() / 1000 }); if (ripples.length > 5) ripples.shift(); },
    };
}
