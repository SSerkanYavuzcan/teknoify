#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const expectedAnalyticsConsumer = 'pages/investment-analytics.html';
const investmentAnalyticsScript = 'js/investment-analytics.js';
const domainCssManifest = '/domains/investment-intelligence/analytics/styles/index.css';
const routeBridge = '/packages/config/routes-global.js';
const sharedClassicScript = '../js/script.js';
const classicAnalyticsScript = '../js/investment-analytics.js';

const bridgeScripts = [
    {
        label: 'formatter bridge',
        fileName: 'formatters-global.js',
        path: '/domains/investment-intelligence/analytics/scripts/utils/formatters-global.js'
    },
    {
        label: 'chart math bridge',
        fileName: 'chart-math-global.js',
        path: '/domains/investment-intelligence/analytics/scripts/utils/chart-math-global.js'
    },
    {
        label: 'compound bridge',
        fileName: 'compound-interest-global.js',
        path: '/domains/investment-intelligence/analytics/scripts/calculators/compound-interest-global.js'
    },
    {
        label: 'CAGR bridge',
        fileName: 'cagr-global.js',
        path: '/domains/investment-intelligence/analytics/scripts/calculators/cagr-global.js'
    },
    {
        label: 'retirement bridge',
        fileName: 'retirement-global.js',
        path: '/domains/investment-intelligence/analytics/scripts/calculators/retirement-global.js'
    }
];

function toRepoRelativePath(absolutePath) {
    return path.relative(repoRoot, absolutePath).split(path.sep).join('/');
}

function getHtmlFiles() {
    const files = ['index.html'];
    const pagesDirectory = path.join(repoRoot, 'pages');

    if (fs.existsSync(pagesDirectory)) {
        fs.readdirSync(pagesDirectory, { withFileTypes: true })
            .filter(
                (directoryEntry) => directoryEntry.isFile() && directoryEntry.name.endsWith('.html')
            )
            .map((directoryEntry) => path.join('pages', directoryEntry.name))
            .sort()
            .forEach((htmlFile) => files.push(htmlFile));
    }

    return files;
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

function isInvestmentAnalyticsScript(assetPath) {
    const normalizedPath = normalizeAssetPath(assetPath);

    return (
        normalizedPath === investmentAnalyticsScript ||
        normalizedPath === `/${investmentAnalyticsScript}` ||
        normalizedPath === `../${investmentAnalyticsScript}` ||
        normalizedPath.endsWith(`/${investmentAnalyticsScript}`)
    );
}

function isLegacyCssManifest(assetPath) {
    const normalizedPath = normalizeAssetPath(assetPath);

    return (
        normalizedPath === 'css/investment-analytics.css' ||
        normalizedPath === '/css/investment-analytics.css' ||
        normalizedPath === '../css/investment-analytics.css'
    );
}

function collectRuntimeMap() {
    return getHtmlFiles().map((htmlFile) => {
        const absolutePath = path.join(repoRoot, htmlFile);
        const htmlContent = fs.readFileSync(absolutePath, 'utf8');
        const scripts = extractTags(htmlContent, 'script').map((tag) => ({
            ...tag,
            src: tag.attributes.src ?? ''
        }));
        const links = extractTags(htmlContent, 'link').map((tag) => ({
            ...tag,
            href: tag.attributes.href ?? ''
        }));

        return {
            file: toRepoRelativePath(absolutePath),
            scripts,
            links
        };
    });
}

function pagesWithMatchingScripts(runtimeMap, predicate) {
    return runtimeMap
        .map((page) => ({
            file: page.file,
            matches: page.scripts.filter((script) => predicate(script.src))
        }))
        .filter((page) => page.matches.length > 0);
}

function pagesWithMatchingLinks(runtimeMap, predicate) {
    return runtimeMap
        .map((page) => ({
            file: page.file,
            matches: page.links.filter((link) => predicate(link.href))
        }))
        .filter((page) => page.matches.length > 0);
}

function findFirstScriptIndex(page, predicate) {
    const matchingScript = page.scripts.find((script) => predicate(script.src));

    return matchingScript ? matchingScript.index : -1;
}

function formatPageList(entries, getDetail) {
    if (entries.length === 0) {
        return '  (none)';
    }

    return entries
        .map((entry) => {
            const detail = getDetail ? getDetail(entry) : '';
            return detail ? `  - ${entry.file}: ${detail}` : `  - ${entry.file}`;
        })
        .join('\n');
}

function verifyInvestmentPageOrder(investmentPage) {
    const failures = [];
    const orderItems = [
        {
            label: 'route bridge',
            path: routeBridge,
            required: true,
            index: findFirstScriptIndex(
                investmentPage,
                (src) => normalizeAssetPath(src) === routeBridge
            )
        },
        ...bridgeScripts.map((bridgeScript) => ({
            label: bridgeScript.label,
            path: bridgeScript.path,
            required: true,
            index: findFirstScriptIndex(
                investmentPage,
                (src) => normalizeAssetPath(src) === bridgeScript.path
            )
        })),
        {
            label: 'shared classic script',
            path: sharedClassicScript,
            required: true,
            index: findFirstScriptIndex(
                investmentPage,
                (src) => normalizeAssetPath(src) === sharedClassicScript
            )
        },
        {
            label: 'classic investment analytics script',
            path: classicAnalyticsScript,
            required: true,
            index: findFirstScriptIndex(investmentPage, isInvestmentAnalyticsScript)
        }
    ];

    const firebaseIndexes = investmentPage.scripts
        .filter((script) => /firebasejs\/.*compat\.js/.test(script.src))
        .map((script) => script.index);
    const sessionManagerIndex = findFirstScriptIndex(
        investmentPage,
        (src) => normalizeAssetPath(src) === '../js/session-manager.js'
    );

    orderItems.forEach((orderItem) => {
        if (orderItem.required && orderItem.index === -1) {
            failures.push(`Missing ${orderItem.label}: expected script ${orderItem.path}.`);
        }
    });

    const presentOrderItems = orderItems.filter((orderItem) => orderItem.index !== -1);

    for (let index = 1; index < presentOrderItems.length; index += 1) {
        const previousItem = presentOrderItems[index - 1];
        const currentItem = presentOrderItems[index];

        if (previousItem.index > currentItem.index) {
            failures.push(
                `Script order is wrong: ${previousItem.label} (${previousItem.path}) must appear ` +
                    `before ${currentItem.label} (${currentItem.path}).`
            );
        }
    }

    const firstRequiredBridgeIndex = orderItems[1]?.index ?? -1;
    const analyticsIndex = orderItems[orderItems.length - 1].index;

    if (
        analyticsIndex !== -1 &&
        firstRequiredBridgeIndex !== -1 &&
        analyticsIndex < firstRequiredBridgeIndex
    ) {
        failures.push(
            'Classic investment analytics script appears before bridge dependencies; move it after all bridge scripts.'
        );
    }

    if (sessionManagerIndex !== -1) {
        firebaseIndexes.forEach((firebaseIndex) => {
            if (firebaseIndex > sessionManagerIndex) {
                failures.push(
                    'Firebase compat scripts must appear before session-manager when both are present.'
                );
            }
        });

        if (orderItems[0].index !== -1 && sessionManagerIndex > orderItems[0].index) {
            failures.push(
                'session-manager must appear before the route bridge when both are present.'
            );
        }
    }

    if (firebaseIndexes.length > 1) {
        for (let index = 1; index < firebaseIndexes.length; index += 1) {
            if (firebaseIndexes[index - 1] > firebaseIndexes[index]) {
                failures.push(
                    'Firebase compat scripts should preserve their page order before session-manager.'
                );
            }
        }
    }

    return failures;
}

function main() {
    const runtimeMap = collectRuntimeMap();
    const failures = [];
    const analyticsConsumers = pagesWithMatchingScripts(runtimeMap, isInvestmentAnalyticsScript);
    const domainCssConsumers = pagesWithMatchingLinks(
        runtimeMap,
        (href) => normalizeAssetPath(href) === domainCssManifest
    );
    const legacyCssConsumers = pagesWithMatchingLinks(runtimeMap, isLegacyCssManifest);
    const routeBridgeConsumers = pagesWithMatchingScripts(
        runtimeMap,
        (src) => normalizeAssetPath(src) === routeBridge
    );
    const bridgeConsumers = pagesWithMatchingScripts(runtimeMap, (src) =>
        bridgeScripts.some((bridgeScript) =>
            normalizeAssetPath(src).endsWith(`/${bridgeScript.fileName}`)
        )
    );
    const unexpectedAnalyticsConsumers = analyticsConsumers.filter(
        (consumer) => consumer.file !== expectedAnalyticsConsumer
    );
    const investmentPage = runtimeMap.find((page) => page.file === expectedAnalyticsConsumer);

    unexpectedAnalyticsConsumers.forEach((consumer) => {
        failures.push(
            `${investmentAnalyticsScript} is loaded by unexpected page ${consumer.file}; expected only ` +
                `${expectedAnalyticsConsumer}.`
        );
    });

    if (legacyCssConsumers.length > 0) {
        legacyCssConsumers.forEach((consumer) => {
            const legacyLinks = consumer.matches.map((match) => match.href).join(', ');
            failures.push(
                `${consumer.file} still links legacy Investment Analytics CSS manifest(s): ${legacyLinks}. ` +
                    `Use ${domainCssManifest} for migrated investment pages.`
            );
        });
    }

    if (!investmentPage) {
        failures.push(`Missing expected page ${expectedAnalyticsConsumer}.`);
    } else {
        failures.push(...verifyInvestmentPageOrder(investmentPage));
    }

    console.log('Investment Analytics runtime map audit');
    console.log('======================================');
    console.log('');
    console.log('Investment analytics script consumers:');
    console.log(
        formatPageList(analyticsConsumers, (entry) =>
            entry.matches.map((match) => match.src).join(', ')
        )
    );
    console.log('');
    console.log('Domain CSS manifest consumers:');
    console.log(
        formatPageList(domainCssConsumers, (entry) =>
            entry.matches.map((match) => match.href).join(', ')
        )
    );
    console.log('');
    console.log('Legacy CSS manifest consumers:');
    console.log(
        formatPageList(legacyCssConsumers, (entry) =>
            entry.matches.map((match) => match.href).join(', ')
        )
    );
    console.log('');
    console.log('Route bridge consumers:');
    console.log(
        formatPageList(routeBridgeConsumers, (entry) =>
            entry.matches.map((match) => match.src).join(', ')
        )
    );
    console.log('');
    console.log('Investment bridge consumers:');
    console.log(
        formatPageList(bridgeConsumers, (entry) =>
            entry.matches
                .map(
                    (match) =>
                        bridgeScripts.find((bridgeScript) =>
                            match.src.endsWith(bridgeScript.fileName)
                        )?.label ?? match.src
                )
                .join(', ')
        )
    );
    console.log('');

    if (failures.length === 0) {
        console.log(
            'Investment Analytics runtime map audit passed: expected consumer, bridge order, ' +
                'classic script order, route bridge, and CSS manifest usage are valid.'
        );
        process.exit(0);
    }

    console.error('Investment Analytics runtime map audit failed.');
    console.error(
        'Action required: resolve these script/CSS ownership issues before runtime extraction:'
    );
    failures.forEach((failure) => {
        console.error(`- ${failure}`);
    });
    process.exit(1);
}

main();
