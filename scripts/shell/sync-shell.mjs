#!/usr/bin/env node
/**
 * Shell sync: stamps the canonical header into the homepage and every secondary marketing page, stamps the
 * environmental-field layers into the secondary pages and the retired demo page (field only, no header), and
 * generates the demo's copies of the shared stylesheet and field renderer. The header's design is the
 * homepage's; its markup lives once, in scripts/shell/header.template.html, so the public navigation
 * (Araçlar taxonomy, destinations, active states) cannot drift between pages.
 *
 *   node scripts/shell/sync-shell.mjs          write the stamped pages and generated files
 *   node scripts/shell/sync-shell.mjs --check  exit 1 if any page or generated file differs (CI guard)
 *
 * Pages carry marker pairs:
 *   <!-- shell:header --> ... <!-- /shell:header -->   the canonical header markup (every page)
 *   <!-- shell:field -->  ... <!-- /shell:field -->    the fixed field canvas and its veil (not the homepage,
 *                                                       whose field is owned by js/experience/index.js)
 *   <!-- shell:footer --> ... <!-- /shell:footer -->   the canonical footer (scripts/shell/footer.template.html:
 *                                                       the homepage footer with destination placeholders);
 *                                                       opt-in, only pages carrying the markers receive it
 *
 * The demo deploys from demo/ alone (demo/netlify.toml, Package directory "demo"), so it cannot reach
 * css/ or js/ of the marketing root. Its copies are GENERATED here from the canonical sources:
 *   demo/styles/shell.css        = css/style.css with every @import inlined into its cascade layer
 *   demo/scripts/shell/*.js      = js/experience/{scroll,field,shell}.js verbatim
 * Never edit those copies by hand; edit the canonical files and re-run this script.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CHECK = process.argv.includes('--check');

/** origin → how the template's destinations resolve there */
const ORIGINS = {
    // the homepage: in-page anchors, relative page paths (as the rest of index.html)
    home: { home: '#home', katalog: '#katalog', contact: '#contact', pages: 'pages/' },
    // secondary marketing pages: root-relative (same origin, works on the local preview too)
    marketing: { home: '/', katalog: '/#katalog', contact: '/#contact', pages: '/pages/' },
    // the demo lives on demo.teknoify.com and must point at the canonical marketing origin
    demo: { home: 'https://teknoify.com/', katalog: 'https://teknoify.com/#katalog', contact: 'https://teknoify.com/#contact', pages: 'https://teknoify.com/pages/' },
};

const HOME_PAGE = { file: 'index.html', origin: 'home', active: 'home', field: false };
const MARKETING_PAGES = [
    // product / capability pages: the Araçlar dropdown (six items, in this order) …
    { file: 'pages/ai-agent.html', active: 'araclar' },
    { file: 'pages/api.html', active: 'araclar' },
    { file: 'pages/rpa.html', active: 'araclar' },
    { file: 'pages/financial-indicators.html', active: 'araclar' },
    { file: 'pages/webscraping.html', active: 'araclar' },
    { file: 'pages/training-consulting.html', active: 'araclar' },
    // … and the legacy routes that left the dropdown but keep the shell (still reachable by URL)
    { file: 'pages/ai-assistant.html', active: 'araclar' },
    { file: 'pages/investment-analytics.html', active: 'araclar' },
    // legal pages linked from the homepage footer
    { file: 'pages/kvkk.html', active: null },
    { file: 'pages/gizlilik.html', active: null },
    { file: 'pages/kullanim-sartlari.html', active: null },
    { file: 'pages/hizmet-sozlesmesi.html', active: null },
].map((p) => ({ ...p, origin: 'marketing', field: true }));
// demo.teknoify.com is a retired destination: one branded "wrong place" page that keeps the field but carries no header
const DEMO_PAGE = { file: 'demo/index.html', origin: 'demo', active: null, field: true, header: false };

const FIELD_MARKUP = `<canvas class="field" data-field data-field-mode="hero" aria-hidden="true"></canvas>
<div class="field-veil" aria-hidden="true"></div>`;

const read = (rel) => fs.readFile(path.join(ROOT, rel), 'utf8');
const normalize = (s) => s.replace(/\r\n/g, '\n');

function renderHeader(template, page) {
    const o = ORIGINS[page.origin];
    // the dropdown entry of the page being rendered is the current page (aria-current on that link)
    const self = path.posix.basename(page.file);
    const withCurrent = template.replace(`href="{{pages}}${self}"`, `href="{{pages}}${self}" aria-current="page"`);
    return withCurrent
        .replace(/\{\{home\}\}/g, o.home)
        .replace(/\{\{katalog\}\}/g, o.katalog)
        .replace(/\{\{contact\}\}/g, o.contact)
        .replace(/\{\{pages\}\}/g, o.pages)
        .replace(/\{\{active_home\}\}/g, page.active === 'home' ? ' aria-current="page"' : '')
        .replace(/\{\{active_araclar\}\}/g, page.active === 'araclar' ? ' is-active' : '')
        .replace(/\{\{active_demo\}\}/g, page.active === 'demo' ? ' aria-current="page"' : '');
}

function stamp(html, name, content, optional = false) {
    const open = `<!-- shell:${name} -->`, close = `<!-- /shell:${name} -->`;
    const a = html.indexOf(open), b = html.indexOf(close);
    if (a < 0 && b < 0 && optional) return html;
    if (a < 0 || b < 0 || b < a) throw new Error(`missing ${open} … ${close} markers`);
    return html.slice(0, a + open.length) + '\n' + content.trim() + '\n' + html.slice(b);
}

/** the canonical footer (the homepage footer with destination placeholders); the page's own Araçlar entry is current */
function renderFooter(template, page) {
    const o = ORIGINS[page.origin];
    const self = path.posix.basename(page.file);
    return template
        .replace(`href="{{pages}}${self}"`, `href="{{pages}}${self}" aria-current="page"`)
        .replace(/\{\{home\}\}/g, o.home)
        .replace(/\{\{katalog\}\}/g, o.katalog)
        .replace(/\{\{contact\}\}/g, o.contact)
        .replace(/\{\{pages\}\}/g, o.pages);
}

/** css/style.css with every layered @import inlined into an @layer block, so one file carries the system */
async function flattenStylesheet() {
    const src = normalize(await read('css/style.css'));
    const lines = src.split('\n');
    const out = ['/* GENERATED by scripts/shell/sync-shell.mjs from css/style.css and its imports. Do not edit; edit the canonical files. */'];
    for (const line of lines) {
        const m = line.match(/^@import url\("\.\/([^"?]+)(?:\?[^"]*)?"\) layer\((\w+)\);/);
        if (!m) { out.push(line); continue; }
        const body = normalize(await read(path.posix.join('css', m[1]))).trim();
        out.push(`@layer ${m[2]} {\n/* ---- ${m[1]} ---- */\n${body}\n}`);
    }
    return out.join('\n') + '\n';
}

async function generatedDemoFiles() {
    const files = new Map();
    files.set('demo/styles/shell.css', await flattenStylesheet());
    for (const name of ['scroll.js', 'field.js', 'shell.js']) {
        const body = normalize(await read(`js/experience/${name}`));
        files.set(`demo/scripts/shell/${name}`, `/* GENERATED copy of js/experience/${name} (scripts/shell/sync-shell.mjs). Do not edit here. */\n${body}`);
    }
    return files;
}

async function main() {
    const template = normalize(await read('scripts/shell/header.template.html'));
    const footer = normalize(await read('scripts/shell/footer.template.html'));
    if (/\{\{(?!home|katalog|contact|pages|active_home|active_araclar|active_demo)\w+\}\}/.test(template + footer)) throw new Error('a shell template uses an unknown placeholder');
    const drift = [];
    const writes = [];
    const pages = [HOME_PAGE, ...MARKETING_PAGES, DEMO_PAGE];
    for (const page of pages) {
        const current = await read(page.file);
        let next = normalize(current);
        if (page.header !== false) next = stamp(next, 'header', renderHeader(template, page));
        if (page.field) next = stamp(next, 'field', FIELD_MARKUP);
        next = stamp(next, 'footer', renderFooter(footer, page), true);   // opt-in: canonical Araçlar pages carry the markers
        if (next !== normalize(current)) { drift.push(page.file); writes.push([page.file, next]); }
    }
    for (const [rel, content] of await generatedDemoFiles()) {
        let current = null;
        try { current = normalize(await read(rel)); } catch { current = null; }
        if (current !== content) { drift.push(rel); writes.push([rel, content]); }
    }
    if (CHECK) {
        if (drift.length) { console.error('shell out of sync:\n  ' + drift.join('\n  ') + '\nrun: node scripts/shell/sync-shell.mjs'); process.exit(1); }
        console.log(`shell in sync (${pages.length} pages, demo copies current)`);
        return;
    }
    for (const [rel, content] of writes) {
        await fs.mkdir(path.dirname(path.join(ROOT, rel)), { recursive: true });
        await fs.writeFile(path.join(ROOT, rel), content, 'utf8');
    }
    console.log(writes.length ? `shell written:\n  ${writes.map(([r]) => r).join('\n  ')}` : 'shell already in sync');
}

main().catch((e) => { console.error(e.message); process.exit(1); });
