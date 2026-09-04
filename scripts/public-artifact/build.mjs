#!/usr/bin/env node
/**
 * build.mjs — constructs the public web artifact for teknoify.com from an explicit allow-list.
 *
 * Principle: nothing enters the artifact unless it is (a) an entry/transitional page listed in
 * manifest.json, (b) a static file listed there, (c) an asset referenced (transitively) by one of
 * those pages, or (d) a file in the public/ overlay. A reference to a forbidden path fails the build.
 *
 * Zero dependencies. Node >= 18. Deterministic: no timestamps are written into the output.
 *
 * Usage: node scripts/public-artifact/build.mjs [--out=dist] [--report=.artifact-report.json] [--dry-run] [--quiet]
 */
import { promises as fs } from 'node:fs';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import {
    ROOT,
    readManifest,
    parseArgs,
    sha256,
    walk,
    forbiddenReason,
    isUnderAllowedRoot,
    isTextFile,
    isExternal,
    externalHost,
    resolveLocal,
    extractRefs,
    parseRedirects
} from './lib.mjs';

const args = parseArgs(process.argv.slice(2));
const manifest = await readManifest();
const OUT_REL = String(args.out || manifest.outputDir || 'dist');
const OUT = path.resolve(ROOT, OUT_REL);
const REPORT = args.report === undefined ? path.join(ROOT, '.artifact-report.json') : String(args.report);
const DRY = !!args['dry-run'];
const QUIET = !!args.quiet;

const log = (...m) => {
    if (!QUIET) console.log(...m);
};

if (!OUT.startsWith(ROOT + path.sep) || path.relative(ROOT, OUT).startsWith('..')) {
    console.error(`Refusing to build outside the repository: ${OUT}`);
    process.exit(2);
}
if (['', '.', 'pages', 'css', 'js', 'docs', 'public'].includes(path.relative(ROOT, OUT))) {
    console.error(`Refusing to use "${OUT_REL}" as the output directory.`);
    process.exit(2);
}

const errors = [];
const warnings = [];
const included = new Map(); // rel -> { origin, transitional, referrers:Set }
const navLinks = new Map(); // target rel -> Set(from)
const externalHosts = new Map(); // host -> Set(ctx)
const unresolved = []; // { from, spec }
const hintsNotIncluded = []; // { from, path }
const transitionalPages = manifest.transitionalPages || {};
const transitionalFiles = manifest.transitionalFiles || {};
const staticFiles = Object.keys(manifest.staticFiles || {}).filter((k) => !k.startsWith('$'));
const entryPages = manifest.entryPages || [];
const pageSet = new Set([...entryPages, ...Object.keys(transitionalPages).filter((k) => !k.startsWith('$'))]);

function existsRel(rel) {
    const abs = path.join(ROOT, rel);
    return existsSync(abs) && statSync(abs).isFile();
}

function include(rel, origin, from) {
    const reason = forbiddenReason(rel, manifest.forbidden || {});
    if (reason) {
        errors.push(`${from ? `${from} -> ` : ''}${rel}: ${reason}`);
        return false;
    }
    if (!isUnderAllowedRoot(rel, manifest.allowedRoots)) {
        errors.push(`${from ? `${from} -> ` : ''}${rel}: not under an allowed root`);
        return false;
    }
    if (!existsRel(rel)) {
        errors.push(`${from ? `${from} -> ` : ''}${rel}: listed but missing`);
        return false;
    }
    let entry = included.get(rel);
    if (!entry) {
        entry = {
            origin,
            transitional: rel in transitionalPages || rel in transitionalFiles,
            referrers: new Set()
        };
        included.set(rel, entry);
        queue.push(rel);
    }
    if (from) entry.referrers.add(from);
    return true;
}

const queue = [];
for (const p of entryPages) include(p, 'entry');
for (const p of Object.keys(transitionalPages)) if (!p.startsWith('$')) include(p, 'transitional');
for (const p of staticFiles) include(p, 'static');

const ASSET_FOLLOW = new Set(['.css', '.js', '.mjs', '.svg']);

while (queue.length) {
    const rel = queue.shift();
    if (!isTextFile(rel)) continue;
    const content = await fs.readFile(path.join(ROOT, rel), 'utf8');
    const { refs, hints } = extractRefs(rel, content);

    for (const { spec, ctx } of refs) {
        if (!spec || spec.startsWith('#')) continue;
        if (spec.includes('${') || spec.includes('{{')) {
            warnings.push(`${rel}: template reference skipped "${spec.slice(0, 60)}"`);
            continue;
        }
        if (isExternal(spec)) {
            const host = externalHost(spec);
            if (host) {
                if (!externalHosts.has(host)) externalHosts.set(host, new Set());
                externalHosts.get(host).add(ctx);
            }
            continue;
        }
        const { rel: target, outsideRoot } = resolveLocal(rel, spec);
        if (outsideRoot) {
            warnings.push(`${rel}: reference escapes repository root "${spec}"`);
            continue;
        }
        const isHtml = /\.html?$/i.test(target);
        if (ctx === 'link' || ctx === 'form' || (isHtml && ctx !== 'frame')) {
            // Navigation link: never auto-included; recorded for the link report.
            if (!navLinks.has(target)) navLinks.set(target, new Set());
            navLinks.get(target).add(rel);
            continue;
        }
        if (!existsRel(target)) {
            unresolved.push({ from: rel, spec, target });
            continue;
        }
        include(target, 'dependency', rel);
    }

    for (const h of hints) {
        const { rel: target } = resolveLocal(rel, h);
        if (existsRel(target) && !included.has(target)) hintsNotIncluded.push({ from: rel, path: target });
    }
}

// Overlay
const overlayDir = path.join(ROOT, manifest.overlayDir || 'public');
const overlayFiles = existsSync(overlayDir) ? await walk(overlayDir) : [];

// Redirect rules from the overlay, used to explain navigation links that leave the artifact.
const redirectRules = overlayFiles.includes('_redirects')
    ? parseRedirects(await fs.readFile(path.join(overlayDir, '_redirects'), 'utf8'))
    : [];
function redirectFor(targetRel) {
    const candidates = new Set([`/${targetRel}`, `/${targetRel.replace(/\.html$/, '')}`, `/${targetRel.replace(/index\.html$/, '')}`]);
    for (const r of redirectRules) {
        if (!r.from || r.from.startsWith('http')) continue;
        if (r.from.endsWith('/*')) {
            const prefix = r.from.slice(0, -1);
            if ([...candidates].some((c) => c.startsWith(prefix))) return r.line;
        } else if (candidates.has(r.from)) return r.line;
    }
    return null;
}

// Navigation links to HTML pages that are neither in the artifact nor expected to be.
const navReport = [];
for (const [target, froms] of navLinks) {
    if (included.has(target)) continue;
    navReport.push({ target, exists: existsRel(target), redirect: redirectFor(target), from: [...froms].sort() });
}
navReport.sort((a, b) => (a.target < b.target ? -1 : 1));
const unexplainedNav = navReport.filter((n) => !n.redirect);
for (const f of overlayFiles) {
    if (included.has(f)) errors.push(`overlay file "${f}" collides with a repository file selected for the artifact`);
}

if (errors.length) {
    console.error('\nPUBLIC ARTIFACT BUILD FAILED');
    for (const e of errors) console.error(`  ✗ ${e}`);
    process.exit(1);
}

// Write output
const files = [];
if (!DRY) {
    await fs.rm(OUT, { recursive: true, force: true });
    await fs.mkdir(OUT, { recursive: true });
}
for (const rel of [...included.keys()].sort()) {
    const buf = await fs.readFile(path.join(ROOT, rel));
    const meta = included.get(rel);
    files.push({
        path: rel,
        bytes: buf.length,
        sha256: sha256(buf),
        origin: meta.origin,
        transitional: meta.transitional,
        referrers: [...meta.referrers].sort()
    });
    if (!DRY) {
        await fs.mkdir(path.dirname(path.join(OUT, rel)), { recursive: true });
        await fs.writeFile(path.join(OUT, rel), buf);
    }
}
for (const rel of overlayFiles) {
    const buf = await fs.readFile(path.join(overlayDir, rel));
    files.push({ path: rel, bytes: buf.length, sha256: sha256(buf), origin: 'overlay', transitional: false, referrers: [] });
    if (!DRY) {
        await fs.mkdir(path.dirname(path.join(OUT, rel)), { recursive: true });
        await fs.writeFile(path.join(OUT, rel), buf);
    }
}
files.sort((a, b) => (a.path < b.path ? -1 : 1));
const artifactHash = sha256(files.map((f) => `${f.path} ${f.sha256}`).join('\n'));

const report = {
    outputDir: OUT_REL,
    dryRun: DRY,
    artifactHash,
    fileCount: files.length,
    totalBytes: files.reduce((s, f) => s + f.bytes, 0),
    files,
    transitional: files.filter((f) => f.transitional).map((f) => f.path),
    externalHosts: Object.fromEntries([...externalHosts.entries()].sort().map(([h, s]) => [h, [...s].sort()])),
    navigationLinksOutsideArtifact: navReport,
    unresolvedReferences: unresolved,
    assetLikeStringsNotIncluded: hintsNotIncluded,
    warnings
};
if (REPORT && REPORT !== 'false') await fs.writeFile(REPORT, `${JSON.stringify(report, null, 2)}\n`);

log(`Public artifact ${DRY ? '(dry run) ' : ''}-> ${OUT_REL}`);
log(`  files: ${report.fileCount}  bytes: ${report.totalBytes}  hash: ${artifactHash.slice(0, 16)}`);
log(`  entry pages: ${entryPages.length}  transitional: ${report.transitional.length}  overlay: ${overlayFiles.length}`);
if (report.transitional.length) log(`  transitional (scheduled for removal): ${report.transitional.join(', ')}`);
if (unresolved.length) {
    log(`  unresolved references (${unresolved.length}):`);
    for (const u of unresolved) log(`    - ${u.from} -> ${u.spec}`);
}
if (navReport.length) {
    log(`  navigation links to pages outside the artifact (${navReport.length}, ${unexplainedNav.length} without a redirect rule):`);
    for (const n of navReport) {
        const how = n.redirect ? `redirected by "${n.redirect}"` : 'NO REDIRECT RULE';
        log(`    - ${n.target}${n.exists ? '' : ' (missing in repo)'}  <- ${n.from.join(', ')}  [${how}]`);
    }
}
if (hintsNotIncluded.length) {
    log(`  asset-like strings in JS not auto-included (${hintsNotIncluded.length}):`);
    for (const h of hintsNotIncluded) log(`    - ${h.from} mentions ${h.path}`);
}
log(`  external hosts: ${[...externalHosts.keys()].sort().join(', ')}`);
for (const w of warnings) log(`  ! ${w}`);
if (REPORT && REPORT !== 'false') log(`  report: ${path.relative(ROOT, REPORT) || REPORT}`);
