#!/usr/bin/env node

const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = process.cwd();

const requiredChecks = [
    {
        label: 'CSS manifest parity',
        command: ['node', 'scripts/architecture/check-investment-css-manifest-parity.js']
    },
    {
        label: 'Investment runtime map',
        command: ['node', 'scripts/architecture/check-investment-runtime-map.js']
    },
    {
        label: 'Investment Data/RAG map',
        command: ['node', 'scripts/architecture/check-investment-data-rag-map.js']
    },
    {
        label: 'Dashboard/Corporate Automation map',
        command: ['node', 'scripts/architecture/check-dashboard-automation-map.js']
    }
];

const legacyInvestmentCssLinks = [
    '../css/investment-analytics.css',
    '/css/investment-analytics.css',
    'css/investment-analytics.css'
];

function toRepoRelativePath(absolutePath) {
    return path.relative(repoRoot, absolutePath).split(path.sep).join('/');
}

function printGroup(title) {
    console.log('\n' + '='.repeat(title.length));
    console.log(title);
    console.log('='.repeat(title.length));
}

function runRequiredCheck(check) {
    printGroup(check.label);
    console.log(`$ ${check.command.join(' ')}`);

    const result = childProcess.spawnSync(check.command[0], check.command.slice(1), {
        cwd: repoRoot,
        encoding: 'utf8'
    });

    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);

    if (result.error) {
        console.error(`${check.label} failed to start: ${result.error.message}`);
        return false;
    }

    if (result.status !== 0) {
        console.error(`${check.label} failed with exit code ${result.status}.`);
        return false;
    }

    console.log(`${check.label} passed.`);
    return true;
}

function getHtmlFiles() {
    const files = [];
    const rootIndex = path.join(repoRoot, 'index.html');
    const pagesDirectory = path.join(repoRoot, 'pages');

    if (fs.existsSync(rootIndex)) files.push(rootIndex);

    if (fs.existsSync(pagesDirectory)) {
        fs.readdirSync(pagesDirectory, { withFileTypes: true })
            .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
            .map((entry) => path.join(pagesDirectory, entry.name))
            .sort()
            .forEach((htmlFile) => files.push(htmlFile));
    }

    return files;
}

function normalizeAssetPath(assetPath) {
    return assetPath.trim().split('?')[0].split('#')[0];
}

function extractAttributeValues(content, tagName, attributeName) {
    const tagPattern = new RegExp(`<${tagName}\\b[^>]*>`, 'gi');
    const attributePattern = new RegExp(
        `${attributeName}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s"'>]+))`,
        'i'
    );
    const values = [];
    let tagMatch;

    while ((tagMatch = tagPattern.exec(content)) !== null) {
        const attributeMatch = attributePattern.exec(tagMatch[0]);
        if (attributeMatch) {
            values.push(attributeMatch[2] ?? attributeMatch[3] ?? attributeMatch[4] ?? '');
        }
    }

    return values;
}

function collectHtmlRuntimeMap() {
    return getHtmlFiles().map((absolutePath) => {
        const content = fs.readFileSync(absolutePath, 'utf8');

        return {
            file: toRepoRelativePath(absolutePath),
            links: extractAttributeValues(content, 'link', 'href'),
            scripts: extractAttributeValues(content, 'script', 'src')
        };
    });
}

function findLegacyInvestmentCssConsumers(runtimeMap) {
    return runtimeMap
        .map((page) => ({
            file: page.file,
            matches: page.links.filter((href) =>
                legacyInvestmentCssLinks.includes(normalizeAssetPath(href))
            )
        }))
        .filter((page) => page.matches.length > 0);
}

function findInvestmentAnalyticsJsConsumers(runtimeMap) {
    return runtimeMap
        .map((page) => ({
            file: page.file,
            matches: page.scripts.filter((src) => {
                const normalizedPath = normalizeAssetPath(src);

                return (
                    normalizedPath === 'js/investment-analytics.js' ||
                    normalizedPath === '/js/investment-analytics.js' ||
                    normalizedPath === '../js/investment-analytics.js' ||
                    normalizedPath.endsWith('/js/investment-analytics.js')
                );
            })
        }))
        .filter((page) => page.matches.length > 0);
}

function getTrackedFiles() {
    const result = childProcess.spawnSync('git', ['ls-files', '-z'], {
        cwd: repoRoot,
        encoding: 'utf8'
    });

    if (result.error || result.status !== 0) {
        const detail = result.error ? result.error.message : result.stderr.trim();
        throw new Error(`Could not list tracked files: ${detail}`);
    }

    return result.stdout
        .split('\0')
        .filter(Boolean)
        .filter((file) => !file.startsWith('.git/') && !file.startsWith('node_modules/'));
}

function isLikelyTextFile(absolutePath) {
    const sample = fs.readFileSync(absolutePath);
    return !sample.includes(0);
}

function findConflictMarkerWarnings() {
    const warnings = [];
    const markerPattern = /^(<<<<<<<(?: .*)?|=======$|>>>>>>>(?: .*)?)$/;

    for (const file of getTrackedFiles()) {
        const absolutePath = path.join(repoRoot, file);
        if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) continue;
        if (!isLikelyTextFile(absolutePath)) continue;

        const lines = fs.readFileSync(absolutePath, 'utf8').split(/\r?\n/);
        lines.forEach((line, index) => {
            if (markerPattern.test(line)) {
                warnings.push(`${file}:${index + 1}: ${line}`);
            }
        });
    }

    return warnings;
}

function runStaticChecks() {
    printGroup('Lightweight static readiness checks');

    const failures = [];
    const warnings = [];
    const runtimeMap = collectHtmlRuntimeMap();
    const legacyCssConsumers = findLegacyInvestmentCssConsumers(runtimeMap);
    const financialIndicatorsPage = runtimeMap.find(
        (page) => page.file === 'pages/financial-indicators.html'
    );
    const investmentAnalyticsJsConsumers = findInvestmentAnalyticsJsConsumers(runtimeMap);

    if (legacyCssConsumers.length > 0) {
        failures.push(
            'Legacy Investment Analytics CSS HTML consumers remain:\n' +
                legacyCssConsumers
                    .map((page) => `  - ${page.file}: ${page.matches.join(', ')}`)
                    .join('\n')
        );
    } else {
        console.log('No legacy Investment Analytics CSS HTML consumers found.');
    }

    if (
        !financialIndicatorsPage ||
        !financialIndicatorsPage.links.some(
            (href) => normalizeAssetPath(href) === '../css/financial-indicators.css'
        )
    ) {
        failures.push(
            'pages/financial-indicators.html does not load ../css/financial-indicators.css.'
        );
    } else {
        console.log('pages/financial-indicators.html keeps ../css/financial-indicators.css.');
    }

    if (
        investmentAnalyticsJsConsumers.length !== 1 ||
        investmentAnalyticsJsConsumers[0].file !== 'pages/investment-analytics.html'
    ) {
        failures.push(
            'js/investment-analytics.js must be loaded only by pages/investment-analytics.html. Found:\n' +
                (investmentAnalyticsJsConsumers.length === 0
                    ? '  (none)'
                    : investmentAnalyticsJsConsumers
                          .map((page) => `  - ${page.file}: ${page.matches.join(', ')}`)
                          .join('\n'))
        );
    } else {
        console.log(
            'pages/investment-analytics.html is the only js/investment-analytics.js consumer.'
        );
    }

    warnings.push(...findConflictMarkerWarnings());
    if (warnings.length > 0) {
        console.warn('Potential conflict marker lines found. Review these as warnings:');
        warnings.forEach((warning) => console.warn(`  - ${warning}`));
    } else {
        console.log('No tracked-file conflict marker lines found outside ignored paths.');
    }

    if (failures.length > 0) {
        console.error('\nStatic readiness checks failed.');
        failures.forEach((failure) => console.error(`- ${failure}`));
        return { passed: false, warnings };
    }

    console.log('Static readiness checks passed.');
    return { passed: true, warnings };
}

function main() {
    const results = requiredChecks.map((check) => ({
        label: check.label,
        passed: runRequiredCheck(check)
    }));
    const staticResult = runStaticChecks();
    const allRequiredChecksPassed = results.every((result) => result.passed) && staticResult.passed;

    printGroup('Enterprise migration readiness summary');
    results.forEach((result) => {
        console.log(`${result.passed ? 'PASS' : 'FAIL'} - ${result.label}`);
    });
    console.log(`${staticResult.passed ? 'PASS' : 'FAIL'} - Lightweight static readiness checks`);
    console.log(`WARN - Conflict marker review warnings: ${staticResult.warnings.length}`);

    if (!allRequiredChecksPassed) {
        console.error(
            '\nEnterprise migration readiness failed. Resolve failing checks before runtime moves.'
        );
        process.exit(1);
    }

    console.log(
        '\nEnterprise migration readiness passed. Runtime moves remain gated by targeted PRs and smoke tests.'
    );
    process.exit(0);
}

try {
    main();
} catch (error) {
    console.error('Enterprise migration readiness check failed unexpectedly.');
    console.error(error);
    process.exit(1);
}
