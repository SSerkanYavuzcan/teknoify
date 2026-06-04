#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = process.cwd();

const requiredCurrentPaths = [
    'dashboard',
    'dashboard/index.html',
    'dashboard/admin.html',
    'dashboard/premium.html',
    'dashboard/member.html',
    'dashboard/shared/auth.js',
    'dashboard/shared/config.js',
    'dashboard/web-scraping',
    'dashboard/bim-istekleri'
];

const requiredTargetSkeletons = [
    'apps/dashboard',
    'domains/corporate-automation',
    'services/scraping-workers',
    'services/api',
    'docs/product'
];

const dashboardRuntimePrefixes = ['dashboard/'];
const corporateAutomationRuntimePrefixes = [
    'dashboard/web-scraping/',
    'dashboard/bim-istekleri/',
    'pages/enterprise',
    'pages/corporate'
];

function toRepoRelativePath(absolutePath) {
    return path.relative(repoRoot, absolutePath).split(path.sep).join('/');
}

function pathExists(relativePath) {
    return fs.existsSync(path.join(repoRoot, relativePath));
}

function walkFiles(relativeDirectory) {
    const absoluteDirectory = path.join(repoRoot, relativeDirectory);
    const files = [];

    if (!fs.existsSync(absoluteDirectory)) {
        return files;
    }

    fs.readdirSync(absoluteDirectory, { withFileTypes: true }).forEach((entry) => {
        const absoluteEntryPath = path.join(absoluteDirectory, entry.name);

        if (entry.name === 'node_modules' || entry.name === '.git') {
            return;
        }

        if (entry.isDirectory()) {
            files.push(...walkFiles(toRepoRelativePath(absoluteEntryPath)));
            return;
        }

        if (entry.isFile()) {
            files.push(toRepoRelativePath(absoluteEntryPath));
        }
    });

    return files.sort();
}

function countByExtension(files) {
    return files.reduce((counts, file) => {
        const extension = path.extname(file) || '(no extension)';
        counts[extension] = (counts[extension] || 0) + 1;
        return counts;
    }, {});
}

function printCounts(label, counts) {
    console.log(label);

    Object.keys(counts)
        .sort()
        .forEach((key) => {
            console.log(`  - ${key}: ${counts[key]}`);
        });
}

function classifyCorporateAutomationFiles(files) {
    return files.filter((file) =>
        corporateAutomationRuntimePrefixes.some((prefix) => file.startsWith(prefix))
    );
}

function main() {
    const missingCurrentPaths = requiredCurrentPaths.filter(
        (relativePath) => !pathExists(relativePath)
    );
    const missingTargetSkeletons = requiredTargetSkeletons.filter(
        (relativePath) => !pathExists(relativePath)
    );
    const dashboardFiles = dashboardRuntimePrefixes.flatMap(walkFiles).sort();
    const corporateAutomationFiles = classifyCorporateAutomationFiles(dashboardFiles);
    const failures = [];

    if (missingCurrentPaths.length > 0) {
        failures.push(
            `Dashboard/Corporate Automation current runtime paths missing: ${missingCurrentPaths.join(', ')}`
        );
    }

    if (missingTargetSkeletons.length > 0) {
        failures.push(
            `Dashboard/Corporate Automation target skeletons missing: ${missingTargetSkeletons.join(', ')}`
        );
    }

    console.log('Dashboard + Corporate Automation migration map audit');
    console.log(`Dashboard runtime files audited: ${dashboardFiles.length}`);
    console.log(`Corporate Automation candidate files audited: ${corporateAutomationFiles.length}`);
    printCounts('Dashboard runtime extension counts:', countByExtension(dashboardFiles));
    printCounts(
        'Corporate Automation candidate extension counts:',
        countByExtension(corporateAutomationFiles)
    );
    console.log('Protected dashboard runtime migration status: audited, not moved.');
    console.log('Corporate automation runtime migration status: audited, not moved.');

    if (failures.length === 0) {
        console.log('Dashboard + Corporate Automation map check passed.');
        process.exit(0);
    }

    console.error('Dashboard + Corporate Automation map check failed.');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
}

main();
