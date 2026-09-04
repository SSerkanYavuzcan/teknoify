#!/usr/bin/env node
/**
 * verify.mjs — asserts that a built public artifact contains only permitted content and
 * everything the marketing site requires. Independent of build.mjs so it can run against any
 * directory (including a future framework's output).
 *
 * Usage: node scripts/public-artifact/verify.mjs [--dir=dist]
 */
import { promises as fs } from 'node:fs';
import { existsSync } from 'node:fs';
import path from 'node:path';
import {
    ROOT,
    readManifest,
    parseArgs,
    walk,
    forbiddenReason,
    isUnderAllowedRoot,
    isTextFile,
    isExternal,
    externalHost,
    resolveLocal,
    extractRefs,
    parseRedirects,
    parseHeaders,
    urlPathToFiles
} from './lib.mjs';

const args = parseArgs(process.argv.slice(2));
const manifest = await readManifest();
const DIR_REL = String(args.dir || manifest.outputDir || 'dist');
const DIR = path.resolve(ROOT, DIR_REL);
const failures = [];
const warnings = [];
const fail = (m) => failures.push(m);
const warn = (m) => warnings.push(m);

if (!existsSync(DIR)) {
    console.error(`Artifact directory not found: ${DIR_REL}`);
    process.exit(1);
}

const files = await walk(DIR);
const fileSet = new Set(files);
const overlayDir = path.join(ROOT, manifest.overlayDir || 'public');
const overlaySet = new Set(existsSync(overlayDir) ? await walk(overlayDir) : []);
const transitional = new Set([
    ...Object.keys(manifest.transitionalPages || {}),
    ...Object.keys(manifest.transitionalFiles || {})
].filter((k) => !k.startsWith('$')));

/* 1. Structural guards on every file */
for (const rel of files) {
    const reason = forbiddenReason(rel, manifest.forbidden || {});
    if (reason) fail(`forbidden content in artifact: ${rel} (${reason})`);
    if (!overlaySet.has(rel) && !isUnderAllowedRoot(rel, manifest.allowedRoots)) {
        fail(`file outside allowed roots and not an overlay file: ${rel}`);
    }
    if (/^(dashboard|api|services|scripts|docs|\.github)\//.test(rel)) fail(`legacy/internal directory present: ${rel}`);
    if (/^domains\//.test(rel) && /\.html?$/i.test(rel)) fail(`domain mirror page present: ${rel}`);
}

/* 2. Required files */
for (const req of manifest.requiredFiles || []) {
    if (!fileSet.has(req)) fail(`required file missing: ${req}`);
}

/* 3. Content markers and internal reference integrity */
const externalByCtx = new Map(); // host -> Set(ctx)
for (const rel of files) {
    const abs = path.join(DIR, rel);
    const buf = await fs.readFile(abs);
    for (const marker of manifest.contentMarkers?.forbidden || []) {
        if (buf.includes(marker)) fail(`forbidden content marker "${marker}" found in ${rel}`);
    }
    if (!isTextFile(rel)) continue;
    const text = buf.toString('utf8');
    const { refs } = extractRefs(rel, text);
    for (const { spec, ctx } of refs) {
        if (!spec || spec.startsWith('#') || spec.includes('${')) continue;
        if (isExternal(spec)) {
            const host = externalHost(spec);
            if (host) {
                if (!externalByCtx.has(host)) externalByCtx.set(host, new Set());
                externalByCtx.get(host).add(ctx);
            }
            continue;
        }
        if (ctx === 'link' || ctx === 'form' || ctx === 'connect') continue; // navigation / runtime, checked separately
        const { rel: target } = resolveLocal(rel, spec);
        // resolveLocal consults the repo tree for directories; re-check against the artifact.
        const candidates = target.endsWith('index.html') ? [target] : [target];
        if (!candidates.some((c) => fileSet.has(c))) {
            // Missing asset references are a warning unless they are in the overlay or the 404 page.
            if (rel === '404.html' || overlaySet.has(rel)) fail(`${rel} references a file missing from the artifact: ${spec}`);
            else warn(`${rel} references a file missing from the artifact: ${spec}`);
        }
    }
}

/* 4. robots.txt */
const origin = manifest.siteOrigin || 'https://teknoify.com';
if (fileSet.has('robots.txt')) {
    const robots = await fs.readFile(path.join(DIR, 'robots.txt'), 'utf8');
    if (!robots.includes(`Sitemap: ${origin}/sitemap.xml`)) fail('robots.txt does not reference the sitemap');
    for (const line of robots.split(/\r?\n/)) {
        const m = line.match(/^Disallow:\s*(\S+)/i);
        if (!m) continue;
        const p = m[1];
        if (/^\/(docs|services|scripts|api|data|tools|apps|packages|domains|\.github)\b/.test(p)) {
            warn(`robots.txt reveals an internal path that should simply not exist: ${p}`);
        }
    }
}

/* 5. sitemap.xml */
if (fileSet.has('sitemap.xml')) {
    const xml = await fs.readFile(path.join(DIR, 'sitemap.xml'), 'utf8');
    const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
    if (!locs.length) fail('sitemap.xml contains no <loc> entries');
    for (const loc of locs) {
        if (!loc.startsWith(`${origin}/`) && loc !== `${origin}/`) fail(`sitemap loc not on ${origin}: ${loc}`);
        const urlPath = loc.slice(origin.length) || '/';
        const candidates = urlPathToFiles(urlPath);
        const found = candidates.find((c) => fileSet.has(c));
        if (!found) fail(`sitemap loc has no file in the artifact: ${loc}`);
        else if (transitional.has(found)) fail(`sitemap lists a transitional page: ${loc}`);
        else if (found === '404.html') fail('sitemap lists 404.html');
    }
    const entryPages = new Set(manifest.entryPages || []);
    for (const loc of locs) {
        const found = urlPathToFiles(loc.slice(origin.length) || '/').find((c) => fileSet.has(c));
        if (found && !entryPages.has(found)) warn(`sitemap lists a page that is not an entry page: ${loc}`);
    }
}

/* 6. _redirects */
if (fileSet.has('_redirects')) {
    const rules = parseRedirects(await fs.readFile(path.join(DIR, '_redirects'), 'utf8'));
    if (!rules.length) fail('_redirects has no rules');
    for (const r of rules) {
        if (!r.from || !r.to) {
            fail(`_redirects malformed line: ${r.line}`);
            continue;
        }
        if (/^http:\/\//i.test(r.to)) fail(`_redirects target is not https: ${r.line}`);
        if (!/^(200|301|302|303|307|308|404|410)!?$/.test(r.status)) fail(`_redirects unsupported status: ${r.line}`);
        if (!r.from.startsWith('http') && !r.force && !r.from.includes('*')) {
            const shadowed = urlPathToFiles(r.from).find((c) => fileSet.has(c));
            if (shadowed) fail(`_redirects rule for ${r.from} is shadowed by artifact file ${shadowed} (Netlify serves files before non-forced redirects)`);
        }
        if (r.status.startsWith('404') && r.to !== '/404.html') warn(`_redirects 404 rule does not point at /404.html: ${r.line}`);
    }
}

/* 7. _headers */
if (fileSet.has('_headers')) {
    const blocks = parseHeaders(await fs.readFile(path.join(DIR, '_headers'), 'utf8'));
    const global = blocks.find((b) => b.path === '/*');
    if (!global) fail('_headers has no /* block');
    else {
        const h = Object.fromEntries(Object.entries(global.headers).map(([k, v]) => [k.toLowerCase(), v]));
        for (const name of ['x-content-type-options', 'referrer-policy', 'permissions-policy', 'strict-transport-security']) {
            if (!h[name]) fail(`_headers /* lacks ${name}`);
        }
        const csp = h['content-security-policy-report-only'] || h['content-security-policy'];
        if (!csp) fail('_headers /* lacks a Content-Security-Policy(-Report-Only)');
        else {
            if (!/frame-ancestors/.test(csp) && !h['x-frame-options']) fail('no frame-ancestors / X-Frame-Options protection');
            const cspHosts = csp.match(/https?:\/\/[^\s;]+/g) || [];
            const covered = (host) =>
                cspHosts.some((c) => {
                    const ch = c.replace(/^https?:\/\//, '');
                    if (ch === host) return true;
                    if (ch.startsWith('*.')) return host.endsWith(ch.slice(1)) || host === ch.slice(2);
                    return false;
                });
            const selfHost = new URL(origin).host;
            for (const [host, ctxs] of externalByCtx) {
                if (host === selfHost) continue; // 'self'
                const loaded = [...ctxs].some((c) => ['script', 'style', 'font', 'img', 'frame', 'module', 'media', 'worker', 'manifest'].includes(c));
                if (!covered(host)) {
                    if (loaded) fail(`CSP does not cover a host that pages load resources from: ${host} (${[...ctxs].join(', ')})`);
                    else warn(`CSP does not mention host referenced only as a link/connect target: ${host} (${[...ctxs].join(', ')})`);
                }
            }
        }
    }
}

/* 8. Transitional inventory (informational, always shown) */
const presentTransitional = files.filter((f) => transitional.has(f));

/* Report */
console.log(`Public artifact verification: ${DIR_REL} (${files.length} files)`);
if (presentTransitional.length) console.log(`  transitional files present: ${presentTransitional.join(', ')}`);
for (const w of warnings) console.log(`  ! ${w}`);
if (failures.length) {
    console.error('\nVERIFICATION FAILED');
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
}
console.log('  ✓ no forbidden paths, extensions, basenames or content markers');
console.log('  ✓ every file is under an allowed root or comes from the overlay');
console.log('  ✓ required files present; robots/sitemap/_redirects/_headers consistent with the artifact');
