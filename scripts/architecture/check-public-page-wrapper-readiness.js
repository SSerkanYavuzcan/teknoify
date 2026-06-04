#!/usr/bin/env node

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

const parityChecks = [
    {
        label: 'Dedicated RPA mirror parity',
        command: 'node',
        args: ['scripts/architecture/check-rpa-page-mirror-parity.js']
    },
    {
        label: 'Corporate service mirror parity',
        command: 'node',
        args: ['scripts/architecture/check-corporate-service-page-mirrors.js']
    },
    {
        label: 'Product/funnel mirror parity',
        command: 'node',
        args: ['scripts/architecture/check-product-funnel-page-mirrors.js']
    }
];

const pagePairs = [
    {
        name: 'RPA',
        publicPagePath: 'pages/rpa.html',
        mirrorPagePath: 'domains/corporate-automation/rpa/page.html',
        riskLevel: 'lower',
        candidateType: 'lower-risk wrapper candidate'
    },
    {
        name: 'Web scraping',
        publicPagePath: 'pages/webscraping.html',
        mirrorPagePath: 'domains/corporate-automation/web-scraping/page.html',
        riskLevel: 'lower/medium',
        candidateType: 'lower-risk wrapper candidate after RPA'
    },
    {
        name: 'API automation',
        publicPagePath: 'pages/api.html',
        mirrorPagePath: 'domains/corporate-automation/api-automation/page.html',
        riskLevel: 'medium',
        candidateType: 'medium-risk candidate after lower-risk pages'
    },
    {
        name: 'Training/consulting',
        publicPagePath: 'pages/training-consulting.html',
        mirrorPagePath: 'domains/corporate-automation/training-consulting/page.html',
        riskLevel: 'lower/medium',
        candidateType: 'lower-risk wrapper candidate after RPA'
    },
    {
        name: 'Subscription',
        publicPagePath: 'pages/subscription.html',
        mirrorPagePath: 'domains/products/subscription/page.html',
        riskLevel: 'high',
        candidateType: 'high-risk page; defer wrapper first-use'
    },
    {
        name: 'AI Assistant',
        publicPagePath: 'pages/ai-assistant.html',
        mirrorPagePath: 'domains/products/ai-assistant/page.html',
        riskLevel: 'high',
        candidateType: 'high-risk page; defer wrapper first-use'
    }
];

function readFile(relativePath) {
    return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function unique(values) {
    return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function extractAttributeValues(content, tagName, attributeName) {
    const pattern = new RegExp(
        `<${tagName}\\b[^>]*\\s${attributeName}=["']([^"']+)["'][^>]*>`,
        'giu'
    );
    const values = [];
    let match = pattern.exec(content);

    while (match) {
        values.push(match[1]);
        match = pattern.exec(content);
    }

    return unique(values);
}

function isRelativeUrl(value) {
    return (
        value &&
        !value.startsWith('/') &&
        !value.startsWith('#') &&
        !value.startsWith('mailto:') &&
        !value.startsWith('tel:') &&
        !value.startsWith('http://') &&
        !value.startsWith('https://') &&
        !value.startsWith('data:') &&
        !value.startsWith('javascript:')
    );
}

function inspectHtml(content) {
    const stylesheetLinks = extractAttributeValues(content, 'link', 'href').filter((href) =>
        href.toLowerCase().includes('.css')
    );
    const scriptLinks = extractAttributeValues(content, 'script', 'src');
    const anchorLinks = extractAttributeValues(content, 'a', 'href');
    const formActions = extractAttributeValues(content, 'form', 'action');
    const relativeLinks = unique(
        [...stylesheetLinks, ...scriptLinks, ...anchorLinks, ...formActions].filter(isRelativeUrl)
    );
    const lowerContent = content.toLowerCase();

    return {
        stylesheetLinks,
        scriptLinks,
        relativeLinks,
        formCount: (content.match(/<form\b/giu) || []).length,
        formActions,
        hasFirebaseCompat: scriptLinks.some(
            (src) => src.toLowerCase().includes('firebase') && src.toLowerCase().includes('compat')
        ),
        hasSessionManager: lowerContent.includes('session-manager'),
        hasRouteBridge:
            lowerContent.includes('route-bridge') || lowerContent.includes('teknoify_routes')
    };
}

function countSummary(values) {
    return values.length === 0 ? 'none' : String(values.length);
}

function printList(label, values) {
    if (values.length === 0) {
        console.log(`  - ${label}: none`);
        return;
    }

    console.log(`  - ${label}: ${values.join(', ')}`);
}

function runParityChecks() {
    return parityChecks.map((check) => {
        console.log(`\nRunning ${check.label}: ${check.command} ${check.args.join(' ')}`);
        const result = childProcess.spawnSync(check.command, check.args, {
            cwd: ROOT,
            encoding: 'utf8',
            stdio: 'pipe'
        });

        if (result.stdout) process.stdout.write(result.stdout);
        if (result.stderr) process.stderr.write(result.stderr);

        return {
            ...check,
            status: result.status === 0 ? 'passed' : 'failed',
            exitCode: result.status,
            signal: result.signal
        };
    });
}

function inspectPagePair(pair) {
    const publicInspection = inspectHtml(readFile(pair.publicPagePath));
    const mirrorInspection = inspectHtml(readFile(pair.mirrorPagePath));
    const combinedRelativeLinks = unique([
        ...publicInspection.relativeLinks,
        ...mirrorInspection.relativeLinks
    ]);

    return {
        ...pair,
        publicInspection,
        mirrorInspection,
        combinedRelativeLinks
    };
}

function printReadinessSummary(parityResults, inspections) {
    const allParityPassed = parityResults.every((result) => result.status === 'passed');
    const lowerRiskCandidates = inspections.filter((inspection) => inspection.riskLevel !== 'high');
    const highRiskPages = inspections.filter((inspection) => inspection.riskLevel === 'high');

    console.log('\nPublic page wrapper readiness summary');
    console.log('====================================');
    console.log(`Parity status: ${allParityPassed ? 'passed' : 'failed'}`);

    for (const result of parityResults) {
        console.log(
            `- ${result.label}: ${result.status}${
                result.status === 'failed'
                    ? ` (exit ${result.exitCode}, signal ${result.signal || 'none'})`
                    : ''
            }`
        );
    }

    console.log('\nLower-risk wrapper candidates');
    for (const inspection of lowerRiskCandidates) {
        console.log(`- ${inspection.name}: ${inspection.riskLevel}; ${inspection.candidateType}`);
    }

    console.log('\nHigh-risk pages');
    for (const inspection of highRiskPages) {
        console.log(
            `- ${inspection.name}: ${inspection.riskLevel}; defer as first wrapper candidate`
        );
    }

    console.log('\nPer-page path-risk notes');
    for (const inspection of inspections) {
        console.log(`- ${inspection.name}`);
        console.log(
            `  - public styles/scripts/forms: ${countSummary(
                inspection.publicInspection.stylesheetLinks
            )} stylesheets, ${countSummary(inspection.publicInspection.scriptLinks)} scripts, ${
                inspection.publicInspection.formCount
            } forms`
        );
        console.log(
            `  - mirror styles/scripts/forms: ${countSummary(
                inspection.mirrorInspection.stylesheetLinks
            )} stylesheets, ${countSummary(inspection.mirrorInspection.scriptLinks)} scripts, ${
                inspection.mirrorInspection.formCount
            } forms`
        );
        console.log(
            `  - Firebase compat/session-manager/route bridge: ${
                inspection.publicInspection.hasFirebaseCompat ||
                inspection.mirrorInspection.hasFirebaseCompat
                    ? 'firebase-compat present'
                    : 'firebase-compat not found'
            }, ${
                inspection.publicInspection.hasSessionManager ||
                inspection.mirrorInspection.hasSessionManager
                    ? 'session-manager present'
                    : 'session-manager not found'
            }, ${
                inspection.publicInspection.hasRouteBridge ||
                inspection.mirrorInspection.hasRouteBridge
                    ? 'route bridge present'
                    : 'route bridge not found'
            }`
        );
        printList('relative links requiring path review', inspection.combinedRelativeLinks);
    }

    console.log('\nReadiness decision');
    console.log('- Phase 13A does not implement runtime wrappers.');
    console.log(
        '- RPA remains the recommended first wrapper candidate after static-hosting strategy is proven.'
    );
    console.log(
        '- Subscription and AI Assistant remain high-risk and should not be first wrapper candidates.'
    );
    console.log(
        '- Do not replace public pages until parity, path review, smoke testing, and rollback are confirmed.'
    );
}

function main() {
    try {
        const parityResults = runParityChecks();
        const inspections = pagePairs.map((pair) => inspectPagePair(pair));

        printReadinessSummary(parityResults, inspections);

        if (!parityResults.every((result) => result.status === 'passed')) {
            process.exitCode = 1;
        }
    } catch (error) {
        console.error('Public page wrapper readiness audit failed due to a runtime error.');
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    }
}

main();
