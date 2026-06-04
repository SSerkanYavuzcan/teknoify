#!/usr/bin/env node

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const CURRENT_POLICY_MODE =
    'Current mode: live public pages remain in pages/, domain mirrors are parity ownership preparation.';

const requiredPublicPages = [
    'pages/rpa.html',
    'pages/webscraping.html',
    'pages/api.html',
    'pages/training-consulting.html',
    'pages/subscription.html',
    'pages/ai-assistant.html'
];

const requiredDomainMirrors = [
    'domains/corporate-automation/rpa/page.html',
    'domains/corporate-automation/web-scraping/page.html',
    'domains/corporate-automation/api-automation/page.html',
    'domains/corporate-automation/training-consulting/page.html',
    'domains/products/subscription/page.html',
    'domains/products/ai-assistant/page.html'
];

const policyChecks = [
    {
        label: 'RPA page mirror parity',
        command: 'node',
        args: ['scripts/architecture/check-rpa-page-mirror-parity.js']
    },
    {
        label: 'Corporate service page mirror parity',
        command: 'node',
        args: ['scripts/architecture/check-corporate-service-page-mirrors.js']
    },
    {
        label: 'Product/funnel page mirror parity',
        command: 'node',
        args: ['scripts/architecture/check-product-funnel-page-mirrors.js']
    },
    {
        label: 'Public page wrapper readiness',
        command: 'node',
        args: ['scripts/architecture/check-public-page-wrapper-readiness.js']
    }
];

function toAbsolutePath(relativePath) {
    return path.join(ROOT, relativePath);
}

function pathExists(relativePath) {
    return fs.existsSync(toAbsolutePath(relativePath));
}

function runPolicyChecks() {
    return policyChecks.map((check) => {
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
            exitCode: result.status,
            signal: result.signal,
            status: result.status === 0 ? 'passed' : 'failed'
        };
    });
}

function listHtmlFiles(directoryPath) {
    const absoluteDirectoryPath = toAbsolutePath(directoryPath);

    return fs
        .readdirSync(absoluteDirectoryPath, { withFileTypes: true })
        .filter(
            (directoryEntry) => directoryEntry.isFile() && directoryEntry.name.endsWith('.html')
        )
        .map((directoryEntry) => path.join(directoryPath, directoryEntry.name).replace(/\\/gu, '/'))
        .sort((left, right) => left.localeCompare(right));
}

function findMirrorLinkViolations() {
    const publicHtmlFiles = listHtmlFiles('pages');
    const violations = [];

    publicHtmlFiles.forEach((publicHtmlFile) => {
        const content = fs.readFileSync(toAbsolutePath(publicHtmlFile), 'utf8');

        requiredDomainMirrors.forEach((mirrorPath) => {
            if (content.includes(mirrorPath)) {
                violations.push({
                    publicHtmlFile,
                    mirrorPath
                });
            }
        });
    });

    return violations;
}

function printCheckSummary(results) {
    console.log('\nParity/readiness status:');
    results.forEach((result) => {
        const detail = result.signal ? `signal ${result.signal}` : `exit ${result.exitCode}`;
        console.log(`  - ${result.label}: ${result.status} (${detail})`);
    });
}

function printExistenceSummary(label, relativePaths, missingPaths) {
    console.log(`\n${label}:`);
    relativePaths.forEach((relativePath) => {
        const status = missingPaths.includes(relativePath) ? 'missing' : 'present';
        console.log(`  - ${relativePath}: ${status}`);
    });
}

function printNavigationSummary(violations) {
    console.log('\nNavigation-to-mirror violations:');

    if (violations.length === 0) {
        console.log('  - none');
        return;
    }

    violations.forEach((violation) => {
        console.log(`  - ${violation.publicHtmlFile} links to ${violation.mirrorPath}`);
    });
}

function main() {
    try {
        const results = runPolicyChecks();
        const missingPublicPages = requiredPublicPages.filter(
            (relativePath) => !pathExists(relativePath)
        );
        const missingDomainMirrors = requiredDomainMirrors.filter(
            (relativePath) => !pathExists(relativePath)
        );
        const mirrorLinkViolations = findMirrorLinkViolations();

        printCheckSummary(results);
        printExistenceSummary(
            'Public source page existence status',
            requiredPublicPages,
            missingPublicPages
        );
        printExistenceSummary(
            'Domain mirror existence status',
            requiredDomainMirrors,
            missingDomainMirrors
        );
        printNavigationSummary(mirrorLinkViolations);
        console.log(`\nCurrent policy mode: ${CURRENT_POLICY_MODE}`);

        const allPolicyChecksPassed = results.every((result) => result.status === 'passed');
        const allRequiredFilesExist =
            missingPublicPages.length === 0 && missingDomainMirrors.length === 0;
        const hasNoMirrorLinkViolations = mirrorLinkViolations.length === 0;

        if (!allPolicyChecksPassed || !allRequiredFilesExist || !hasNoMirrorLinkViolations) {
            process.exitCode = 1;
            return;
        }

        console.log('\nPublic page mirror source policy check passed.');
    } catch (error) {
        console.error('Public page mirror source policy check failed due to a runtime error.');
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    }
}

main();
