// Shared helpers for the public-artifact build and verify scripts. Zero dependencies.
import { promises as fs } from 'node:fs';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..', '..');
export const MANIFEST_PATH = path.join(HERE, 'manifest.json');

export function toPosix(p) {
    return p.split(path.sep).join('/');
}

export async function readManifest() {
    const raw = await fs.readFile(MANIFEST_PATH, 'utf8');
    return JSON.parse(raw);
}

export function parseArgs(argv) {
    const args = { _: [] };
    for (const a of argv) {
        const m = a.match(/^--([^=]+)(?:=(.*))?$/);
        if (m) args[m[1]] = m[2] === undefined ? true : m[2];
        else args._.push(a);
    }
    return args;
}

export function sha256(buf) {
    return crypto.createHash('sha256').update(buf).digest('hex');
}

export async function walk(dir, base = dir, out = []) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) await walk(full, base, out);
        else if (e.isFile()) out.push(toPosix(path.relative(base, full)));
    }
    return out;
}

/** Returns a reason string when `rel` violates a forbidden rule, otherwise null. */
export function forbiddenReason(rel, forbidden) {
    const lower = rel.toLowerCase();
    for (const p of forbidden.prefixes || []) {
        if (lower.startsWith(p.toLowerCase())) return `forbidden prefix "${p}"`;
    }
    for (const re of forbidden.patterns || []) {
        if (new RegExp(re).test(rel)) return `forbidden pattern ${re}`;
    }
    const base = path.posix.basename(rel);
    for (const b of forbidden.basenames || []) {
        if (base === b) return `forbidden basename "${b}"`;
    }
    for (const ext of forbidden.extensions || []) {
        if (lower.endsWith(ext.toLowerCase())) return `forbidden extension "${ext}"`;
    }
    return null;
}

export function isUnderAllowedRoot(rel, allowedRoots) {
    return (allowedRoots || []).some((r) => (r.endsWith('/') ? rel.startsWith(r) : rel === r));
}

const TEXT_EXT = new Set(['.html', '.htm', '.css', '.js', '.mjs', '.svg', '.xml', '.txt', '.json', '.webmanifest']);
const TEXT_BASENAMES = new Set(['_headers', '_redirects']);
export function isTextFile(rel) {
    return TEXT_EXT.has(path.posix.extname(rel).toLowerCase()) || TEXT_BASENAMES.has(path.posix.basename(rel));
}

export function isExternal(spec) {
    return /^(?:[a-z][a-z0-9+.\-]*:|\/\/)/i.test(spec);
}

export function externalHost(spec) {
    try {
        const u = new URL(spec.startsWith('//') ? `https:${spec}` : spec);
        return /^https?:$/.test(u.protocol) ? u.host : null;
    } catch {
        return null;
    }
}

/** Strip query and hash from a local reference. */
export function cleanLocal(spec) {
    return spec.replace(/[?#].*$/, '');
}

/**
 * Resolve a local reference found in `fromRel` to a repository-relative POSIX path.
 * Returns { rel, outsideRoot }.
 */
export function resolveLocal(fromRel, spec) {
    const clean = cleanLocal(spec);
    let rel;
    if (clean.startsWith('/')) rel = path.posix.normalize(clean.slice(1));
    else rel = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), clean));
    if (rel === '.' || rel === '') rel = 'index.html';
    const outsideRoot = rel.startsWith('../') || rel === '..';
    if (!outsideRoot) {
        const abs = path.join(ROOT, rel);
        if (existsSync(abs) && statSync(abs).isDirectory()) rel = path.posix.join(rel, 'index.html');
        else if (rel.endsWith('/')) rel = path.posix.join(rel, 'index.html');
    }
    return { rel, outsideRoot };
}

/* ------------------------------------------------------------------ */
/* Reference extraction                                                */
/* ------------------------------------------------------------------ */

const ATTR_RE = /\b(href|src|srcset|data-src|poster|xlink:href)\s*=\s*("([^"]*)"|'([^']*)')/gi;
const TAG_RE = /<([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g;
const INLINE_SCRIPT_RE = /<script\b(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi;
const INLINE_STYLE_RE = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;

function contextForTag(tag, attrs, attrName) {
    const t = tag.toLowerCase();
    const rel = (attrs.match(/\brel\s*=\s*["']([^"']+)["']/i) || [])[1]?.toLowerCase() || '';
    const asAttr = (attrs.match(/\bas\s*=\s*["']([^"']+)["']/i) || [])[1]?.toLowerCase() || '';
    if (t === 'script') return 'script';
    if (t === 'link') {
        if (rel.includes('stylesheet')) return 'style';
        if (rel.includes('icon')) return 'img';
        if (rel.includes('preload') || rel.includes('modulepreload')) return asAttr || 'other';
        if (rel.includes('preconnect') || rel.includes('dns-prefetch')) return 'preconnect';
        if (rel.includes('manifest')) return 'manifest';
        return 'other';
    }
    if (t === 'img' || t === 'source' || t === 'picture') return 'img';
    if (t === 'video' || t === 'audio' || t === 'track') return 'media';
    if (t === 'iframe' || t === 'frame') return 'frame';
    if (t === 'a' || t === 'area') return 'link';
    if (t === 'form') return 'form';
    if (t === 'use' || t === 'image') return 'img';
    if (t === 'object' || t === 'embed') return 'object';
    return attrName === 'src' ? 'other' : 'link';
}

export function extractFromJs(js) {
    const refs = [];
    const hints = [];
    const push = (spec, ctx) => refs.push({ spec, ctx });
    for (const m of js.matchAll(/\bfrom\s*["']([^"']+)["']/g)) push(m[1], 'module');
    for (const m of js.matchAll(/(?:^|[;\n])\s*import\s*["']([^"']+)["']/g)) push(m[1], 'module');
    for (const m of js.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)) push(m[1], 'module');
    for (const m of js.matchAll(/\bfetch\(\s*["']([^"']+)["']/g)) push(m[1], 'connect');
    for (const m of js.matchAll(/\bnew\s+URL\(\s*["']([^"']+)["']/g)) push(m[1], 'connect');
    for (const m of js.matchAll(/\bsendBeacon\(\s*["']([^"']+)["']/g)) push(m[1], 'connect');
    for (const m of js.matchAll(/\bnew\s+Worker\(\s*["']([^"']+)["']/g)) push(m[1], 'worker');
    // String literals that look like local asset paths (not followed automatically).
    const hintRe =
        /["'`]((?:\.\.?\/|\/)?(?:data|images|assets|css|js|packages|domains|demo)\/[^"'`\s?#$]+\.(?:json|js|mjs|css|png|jpe?g|svg|webp|gif|ico|woff2?|ttf|geojson|pdf))(?:[?#][^"'`]*)?["'`]/g;
    for (const m of js.matchAll(hintRe)) hints.push(m[1]);
    // External URLs embedded as plain strings (connect targets, redirects). XML namespaces are not requests.
    for (const m of js.matchAll(/["'`](https?:\/\/[^"'`\s<>)]+)["'`]/g)) {
        if (/^https?:\/\/www\.w3\.org\//.test(m[1])) continue;
        push(m[1], 'connect');
    }
    return { refs, hints };
}

export function extractFromCss(css) {
    const refs = [];
    for (const m of css.matchAll(/@import\s+(?:url\(\s*)?["']?([^"')\s;]+)["']?\s*\)?/g)) refs.push({ spec: m[1], ctx: 'style' });
    for (const m of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
        const spec = m[1].trim();
        const ctx = /\.(woff2?|ttf|otf|eot)(\?|$)/i.test(spec) ? 'font' : 'img';
        refs.push({ spec, ctx });
    }
    return { refs, hints: [] };
}

export function extractFromHtml(html) {
    const refs = [];
    const hints = [];
    for (const tm of html.matchAll(TAG_RE)) {
        const tag = tm[1];
        const attrs = tm[2];
        for (const am of attrs.matchAll(ATTR_RE)) {
            const name = am[1].toLowerCase();
            const value = am[3] !== undefined ? am[3] : am[4];
            if (!value) continue;
            const ctx = contextForTag(tag, attrs, name);
            if (name === 'srcset') {
                for (const cand of value.split(',')) {
                    const spec = cand.trim().split(/\s+/)[0];
                    if (spec) refs.push({ spec, ctx: 'img' });
                }
            } else refs.push({ spec: value.trim(), ctx });
        }
    }
    for (const m of html.matchAll(INLINE_SCRIPT_RE)) {
        const r = extractFromJs(m[1]);
        refs.push(...r.refs);
        hints.push(...r.hints);
    }
    for (const m of html.matchAll(INLINE_STYLE_RE)) refs.push(...extractFromCss(m[1]).refs);
    return { refs, hints };
}

export function extractRefs(rel, content) {
    const ext = path.posix.extname(rel).toLowerCase();
    if (ext === '.html' || ext === '.htm') return extractFromHtml(content);
    if (ext === '.css') return extractFromCss(content);
    if (ext === '.js' || ext === '.mjs') return extractFromJs(content);
    if (ext === '.svg') return { refs: extractFromHtml(content).refs, hints: [] };
    return { refs: [], hints: [] };
}

/** Parse a Netlify _redirects file into rules. */
export function parseRedirects(text) {
    const rules = [];
    for (const raw of text.split(/\r?\n/)) {
        const line = raw.trim();
        if (!line || line.startsWith('#')) continue;
        const parts = line.split(/\s+/);
        const [from, to, status] = parts;
        rules.push({ from, to, status: status || '301', force: /!$/.test(status || ''), line });
    }
    return rules;
}

/** Parse a Netlify _headers file into { path, headers: {name: value} } blocks. */
export function parseHeaders(text) {
    const blocks = [];
    let current = null;
    for (const raw of text.split(/\r?\n/)) {
        if (!raw.trim() || raw.trim().startsWith('#')) continue;
        if (!/^\s/.test(raw)) {
            current = { path: raw.trim(), headers: {} };
            blocks.push(current);
        } else if (current) {
            const idx = raw.indexOf(':');
            if (idx > 0) current.headers[raw.slice(0, idx).trim()] = raw.slice(idx + 1).trim();
        }
    }
    return blocks;
}

/** Map a site URL path to a candidate list of artifact file paths. */
export function urlPathToFiles(urlPath) {
    let p = decodeURIComponent(urlPath.replace(/[?#].*$/, ''));
    if (!p.startsWith('/')) p = `/${p}`;
    const rel = p.slice(1);
    if (rel === '' || rel.endsWith('/')) return [`${rel}index.html`];
    if (path.posix.extname(rel)) return [rel];
    return [`${rel}.html`, `${rel}/index.html`];
}
