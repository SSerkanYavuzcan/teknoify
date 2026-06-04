#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = process.cwd();

const groupedChecks = [
    {
        label: 'CSS manifest parity',
        script: 'scripts/architecture/check-investment-css-manifest-parity.js'
    },
    {
        label: 'Investment runtime map',
        script: 'scripts/architecture/check-investment-runtime-map.js'
    },
    {
        label: 'Investment Data/RAG map',
        script: 'scripts/architecture/check-investment-data-rag-map.js'
    },
    {
        label: 'Dashboard/Corporate Automation map',
        script: 'scripts/architecture/check-dashboard-automation-map.js'
    }
];

const legacyInvestmentCssPaths = [
    '../css/investment-analytics.css',
    '/css/investment-analytics.css',
    'css/investment-analytics.css'
];

function toRepoRelativePath(absolutePath) {
    return path.relative(repoRoot, absolutePath).split(path.sep).join('/');
}

function readTextFile(relativePath) {
    return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function printHeader(label) {
    console.log('');
    console.log(`== ${label} ==`);
}

function getHtmlFiles() {
    const htmlFiles = [];
    const indexPath = path.join(repoRoot, 'index.html');
    const pagesDirectory = path.join(repoRoot, 'pages');

    if (fs.existsSync(indexPath)) {
        htmlFiles.push('index.html');
    }

    if (fs.existsSync(pagesDirectory)) {
        fs.readdirSync(pagesDirectory, { withFileTypes: true })
            .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
            .map((entry) => `pages/${entry.name}`)
            .sort()
            .forEach((htmlFile) => htmlFiles.push(htmlFile));
    }

    return htmlFiles;
}

function parseAttributes(attributeText) {
    const attributes = {};
    const attributePattern = /([\w:-]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
    let match;

    while ((match = attributePattern.exec(attributeText)) !== null) {
        attributes[match[1].toLowerCase()] = match[3] ?? match[4] ?? match[5] ?? '';
    }

    return attributes;
}

function extractTags(htmlContent, tagName) {
    const tagPattern = new RegExp(`<${tagName}\\b([^>]*)>`, 'gi');
    const tags = [];
    let match;

    while ((match = tagPattern.exec(htmlContent)) !== null) {
        tags.push({
            index: match.index,
            attributes: parseAttributes(match[1])
        });
    }

    return tags;
}

function normalizeAssetPath(assetPath) {
    return assetPath.split('?')[0].split('#')[0];
}

function isLegacyInvestmentCssPath(assetPath) {
    const normalizedPath = normalizeAssetPath(assetPath);

    return legacyInvestmentCssPaths.includes(normalizedPath);
}

function isInvestmentAnalyticsScript(assetPath) {
    const normalizedPath = normalizeAssetPath(assetPath);

    return (
        normalizedPath === 'js/investment-analytics.js' ||
        normalizedPath === '/js/investment-analytics.js' ||
        normalizedPath === '../js/investment-analytics.js'
    );
}

function formatList(items) {
    if (items.length === 0) {
        return '  (none)';
    }

    return items.map((item) => `  - ${item}`).join('\n');
}

function runGroupedAuditChecks() {
    const failures = [];

    groupedChecks.forEach((check) => {
        printHeader(check.label);
        const scriptPath = path.join(repoRoot, check.script);

        if (!fs.existsSync(scriptPath)) {
            console.error(`Missing required audit script: ${check.script}`);
            failures.push(`${check.label}: missing ${check.script}`);
            return;
        }

        const result = spawnSync(process.execPath, [check.script], {
            cwd: repoRoot,
            encoding: 'utf8',
            stdio: 'inherit'
        });

        if (result.status !== 0) {
            failures.push(
                `${check.label}: ${check.script} exited with ${result.status ?? 'signal'}`
            );
        }
    });

    return failures;
}

function checkLegacyCssConsumers() {
    const failures = [];

    getHtmlFiles().forEach((htmlFile) => {
        const htmlContent = readTextFile(htmlFile);
        const links = extractTags(htmlContent, 'link');

        links
            .map((tag) => tag.attributes.href ?? '')
            .filter(isLegacyInvestmentCssPath)
            .forEach((href) =>
                failures.push(`${htmlFile} links legacy Investment Analytics CSS: ${href}`)
            );
    });

    return failures;
}

function checkFinancialIndicatorsStylesheet() {
    const htmlFile = 'pages/financial-indicators.html';
    const absolutePath = path.join(repoRoot, htmlFile);

    if (!fs.existsSync(absolutePath)) {
        return [`${htmlFile} is missing.`];
    }

    const htmlContent = readTextFile(htmlFile);
    const links = extractTags(htmlContent, 'link').map((tag) => tag.attributes.href ?? '');

    if (!links.some((href) => normalizeAssetPath(href) === '../css/financial-indicators.css')) {
        return [`${htmlFile} no longer links ../css/financial-indicators.css.`];
    }

    return [];
}

function checkInvestmentAnalyticsScriptConsumers() {
    const consumers = [];

    getHtmlFiles().forEach((htmlFile) => {
        const htmlContent = readTextFile(htmlFile);
        const scripts = extractTags(htmlContent, 'script').map((tag) => tag.attributes.src ?? '');

        if (scripts.some(isInvestmentAnalyticsScript)) {
            consumers.push(htmlFile);
        }
    });

    if (consumers.length === 1 && consumers[0] === 'pages/investment-analytics.html') {
        return [];
    }

    return [
        'Expected pages/investment-analytics.html to be the only HTML consumer of js/investment-analytics.js; found: ' +
            (consumers.length > 0 ? consumers.join(', ') : '(none)')
    ];
}

function getTrackedFiles() {
    const result = spawnSync('git', ['ls-files', '-z'], {
        cwd: repoRoot,
        encoding: 'utf8'
    });

    if (result.status !== 0) {
        throw new Error('Unable to list tracked files with git ls-files.');
    }

    return result.stdout.split('\0').filter(Boolean);
}

function isLikelyTextFile(fileContent) {
    return !fileContent.includes('\0');
}

function findConflictMarkers() {
    const markerPattern = /^(<<<<<<<(?:\s|$)|=======$|>>>>>>>(?:\s|$))/;
    const failures = [];
    const warnings = [];

    getTrackedFiles().forEach((trackedFile) => {
        if (trackedFile.startsWith('.git/') || trackedFile.startsWith('node_modules/')) {
            return;
        }

        const absolutePath = path.join(repoRoot, trackedFile);

        if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
            return;
        }

        const fileBuffer = fs.readFileSync(absolutePath);
        const fileContent = fileBuffer.toString('utf8');

        if (!isLikelyTextFile(fileContent)) {
            return;
        }

        fileContent.split(/\r?\n/).forEach((line, index) => {
            if (!markerPattern.test(line)) {
                return;
            }

            const marker = `${trackedFile}:${index + 1}: ${line}`;

            if (trackedFile.endsWith('.md')) {
                warnings.push(marker);
            } else {
                failures.push(marker);
            }
        });
    });

    return { failures, warnings };
}

function runStaticReadinessChecks() {
    printHeader('Static readiness checks');

    const failures = [
        ...checkLegacyCssConsumers(),
        ...checkFinancialIndicatorsStylesheet(),
        ...checkInvestmentAnalyticsScriptConsumers()
    ];
    const conflictMarkers = findConflictMarkers();

    failures.push(...conflictMarkers.failures);

    if (conflictMarkers.warnings.length > 0) {
        console.warn('Potential markdown conflict-marker examples found; review manually:');
        console.warn(formatList(conflictMarkers.warnings));
    }

    if (failures.length === 0) {
        console.log('Static readiness checks passed.');
        console.log('- No HTML pages link the legacy Investment Analytics CSS manifest.');
        console.log(
            '- pages/financial-indicators.html still uses ../css/financial-indicators.css.'
        );
        console.log(
            '- pages/investment-analytics.html is the only HTML consumer of js/investment-analytics.js.'
        );
        console.log(
            '- No unresolved non-markdown conflict markers were found in tracked text files.'
        );
        return [];
    }

    console.error('Static readiness checks failed:');
    console.error(formatList(failures));
    return failures;
}

function main() {
    console.log('Enterprise migration readiness checker');
    console.log(`Repository root: ${repoRoot}`);

    const auditFailures = runGroupedAuditChecks();
    const staticFailures = runStaticReadinessChecks();
    const failures = [...auditFailures, ...staticFailures];

    printHeader('Final readiness summary');

    if (failures.length === 0) {
        console.log('PASS: Enterprise migration readiness checks passed.');
        console.log(
            'Controlled runtime moves may proceed only through targeted PRs with smoke tests.'
        );
        process.exit(0);
    }

    console.error('FAIL: Enterprise migration readiness checks failed.');
    console.error(formatList(failures));
    process.exit(1);
}

main();
