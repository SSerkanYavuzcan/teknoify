/* Web Scraping page: the embedded price-comparison experience (one product, two sources).
   Static example records for now; the render() contract is the seam for a live source later. */

const SOURCES = [
    { key: 'pazaryeri', label: 'Pazaryeri', domain: 'pazaryeri-a.com' },
    { key: 'marka', label: 'Marka mağazası', domain: 'marka-magazasi.com' },
];

/* prices in TRY; spark = last 7 daily closes; promo/delivery are display strings */
const PRODUCTS = [
    {
        name: 'Kablosuz kulaklık · ANC', code: 'SKU 4471',
        sources: [
            { price: 2499, prev: 2699, stock: 'Stokta', promo: 'Sepette %10', delivery: 'Yarın kargoda', seller: 'Yetkili satıcı', spark: [2699, 2699, 2649, 2649, 2599, 2499, 2499] },
            { price: 2349, prev: 2349, stock: 'Son 4 ürün', promo: 'Ücretsiz kargo', delivery: '2–3 iş günü', seller: 'Marka mağazası', spark: [2399, 2399, 2349, 2349, 2349, 2349, 2349] },
        ],
    },
    {
        name: 'Robot süpürge · 4000 Pa', code: 'SKU 2180',
        sources: [
            { price: 8990, prev: 9490, stock: 'Stokta', promo: '—', delivery: 'Bugün kargoda', seller: 'Yetkili satıcı', spark: [9490, 9490, 9490, 9290, 9290, 8990, 8990] },
            { price: 9190, prev: 9190, stock: 'Stokta', promo: '3 taksit', delivery: '1–2 iş günü', seller: 'Marka mağazası', spark: [9190, 9190, 9190, 9190, 9190, 9190, 9190] },
        ],
    },
    {
        name: 'Akıllı saat · 45 mm', code: 'SKU 9034',
        sources: [
            { price: 4199, prev: 3999, stock: 'Tükendi', promo: '—', delivery: '—', seller: 'Yetkili satıcı', spark: [3999, 3999, 3999, 4099, 4099, 4199, 4199] },
            { price: 4099, prev: 4199, stock: 'Stokta', promo: 'Hediye kayış', delivery: 'Yarın kargoda', seller: 'Marka mağazası', spark: [4199, 4199, 4199, 4149, 4099, 4099, 4099] },
        ],
    },
];

const fmt = (n) => n.toLocaleString('tr-TR') + ' ₺';
const pct = (price, prev) => { if (!prev || prev === price) return { text: '—', dir: 'flat' }; const d = Math.round(((price - prev) / prev) * 100); return { text: (d > 0 ? '+' : '−') + Math.abs(d) + '%', dir: d > 0 ? 'up' : 'down' }; };
function sparkPath(values, w = 120, h = 32) {
    const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
    return values.map((v, i) => `${i === 0 ? 'M' : 'L'}${((i / (values.length - 1)) * (w - 4) + 2).toFixed(1)},${(h - 4 - ((v - min) / span) * (h - 8)).toFixed(1)}`).join(' ');
}

export function initCompare(root) {
    if (!root) return;
    const tabs = Array.from(root.querySelectorAll('[data-product]'));
    const cards = Array.from(root.querySelectorAll('[data-src]'));
    const diff = root.querySelector('[data-cmp-diff]');
    const set = (card, key, value) => { const el = card.querySelector(`[data-f="${key}"]`); if (el) el.textContent = value; };
    function render(i) {
        const p = PRODUCTS[i];
        const best = p.sources[0].price <= p.sources[1].price ? 0 : 1;
        cards.forEach((card, k) => {
            const s = p.sources[k], src = SOURCES[k];
            set(card, 'source', src.label); set(card, 'domain', src.domain);
            set(card, 'name', p.name); set(card, 'code', p.code); set(card, 'seller', s.seller);
            set(card, 'price', fmt(s.price)); set(card, 'prev', s.prev !== s.price ? fmt(s.prev) : '');
            const d = pct(s.price, s.prev); const delta = card.querySelector('[data-f="delta"]'); if (delta) { delta.textContent = d.text; delta.dataset.dir = d.dir; }
            set(card, 'stock', s.stock); set(card, 'promo', s.promo); set(card, 'delivery', s.delivery);
            const path = card.querySelector('[data-f="spark"]'); if (path) path.setAttribute('d', sparkPath(s.spark));
            card.classList.toggle('is-best', k === best);
            card.classList.toggle('is-out', /tükendi/i.test(s.stock));
            const stockEl = card.querySelector('[data-f="stock"]'); if (stockEl) stockEl.dataset.state = /tükendi/i.test(s.stock) ? 'out' : /son/i.test(s.stock) ? 'low' : 'ok';
        });
        const a = p.sources[0].price, b = p.sources[1].price;
        if (diff) diff.textContent = a === b ? 'İki kaynakta aynı fiyat.' : `${SOURCES[best].label} ${fmt(Math.abs(a - b))} daha uygun.`;
        tabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
        root.dataset.product = String(i);
    }
    tabs.forEach((t, i) => {
        t.addEventListener('click', () => render(i));
        t.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); const n = (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length; render(n); tabs[n].focus(); } });
    });
    // row mirroring: pointing at a field on one source highlights the same field on the other (fine pointers only)
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
        root.querySelectorAll('[data-row]').forEach((row) => {
            const key = row.dataset.row;
            row.addEventListener('pointerenter', () => root.querySelectorAll(`[data-row="${key}"]`).forEach((r) => r.classList.add('is-hot')));
            row.addEventListener('pointerleave', () => root.querySelectorAll(`[data-row="${key}"]`).forEach((r) => r.classList.remove('is-hot')));
        });
    }
    render(0);
}
