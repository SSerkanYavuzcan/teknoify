#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const scanRoots = [
    'data',
    'docs/rag',
    'docs/api-contracts',
    'scripts',
    'services/rag-workers',
    'api',
    '.github/workflows'
];
const ignoredDirectories = new Set(['.git', 'node_modules']);
const maxContentBytes = 64 * 1024;
const pathKeywords = [
    'stock',
    'investment',
    'invest',
    'rag',
    'retrieval',
    'embedding',
    'document',
    'catalog',
    'chatbot',
    'chat-log',
    'chat',
    'company',
    'sector',
    'financial',
    'turkey',
    'borsa',
    'pdf'
];
const contentKeywords = [
    'stock',
    'investment',
    'rag',
    'retrieval',
    'embedding',
    'document index',
    'chatbot',
    'chat-log',
    'chat',
    'financial',
    'finansal',
    'bist',
    'company',
    'sector'
];
const binaryExtensions = new Set([
    '.pdf',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.ico',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot',
    '.zip',
    '.gz',
    '.br'
]);

function toRepoRelativePath(absolutePath) {
    return path.relative(repoRoot, absolutePath).split(path.sep).join('/');
}

function pathExists(absolutePath) {
    return fs.existsSync(absolutePath);
}

function isBinaryPath(filePath) {
    return binaryExtensions.has(path.extname(filePath).toLowerCase());
}

function walkDirectory(absoluteDirectory) {
    const files = [];
    const entries = fs.readdirSync(absoluteDirectory, { withFileTypes: true });

    entries.forEach((entry) => {
        if (ignoredDirectories.has(entry.name)) {
            return;
        }

        const absoluteEntryPath = path.join(absoluteDirectory, entry.name);

        if (entry.isDirectory()) {
            files.push(...walkDirectory(absoluteEntryPath));
            return;
        }

        if (entry.isFile()) {
            files.push(absoluteEntryPath);
        }
    });

    return files;
}

function collectFiles() {
    const files = [];

    scanRoots.forEach((scanRoot) => {
        const absoluteScanRoot = path.join(repoRoot, scanRoot);

        if (!pathExists(absoluteScanRoot)) {
            return;
        }

        const scanRootStat = fs.statSync(absoluteScanRoot);

        if (scanRootStat.isDirectory()) {
            files.push(...walkDirectory(absoluteScanRoot));
        } else if (scanRootStat.isFile()) {
            files.push(absoluteScanRoot);
        }
    });

    return [...new Set(files)].sort((a, b) =>
        toRepoRelativePath(a).localeCompare(toRepoRelativePath(b))
    );
}

function readContentSample(absolutePath) {
    const fileStat = fs.statSync(absolutePath);
    const bytesToRead = Math.min(fileStat.size, maxContentBytes);

    if (bytesToRead === 0 || isBinaryPath(absolutePath)) {
        return '';
    }

    const buffer = Buffer.alloc(bytesToRead);
    const fileDescriptor = fs.openSync(absolutePath, 'r');

    try {
        fs.readSync(fileDescriptor, buffer, 0, bytesToRead, 0);
    } finally {
        fs.closeSync(fileDescriptor);
    }

    return buffer.toString('utf8');
}

function findKeywordMatches(value, keywords) {
    const normalizedValue = value.toLowerCase();

    return keywords.filter((keyword) => normalizedValue.includes(keyword.toLowerCase()));
}

function categorizeFile(relativePath) {
    if (relativePath.startsWith('.github/workflows/')) {
        return 'workflow';
    }

    if (relativePath.startsWith('api/')) {
        return 'api';
    }

    if (relativePath.startsWith('services/rag-workers/')) {
        return 'worker';
    }

    if (relativePath.startsWith('docs/rag/')) {
        return 'rag-doc';
    }

    if (relativePath.startsWith('docs/api-contracts/')) {
        return 'api-contract';
    }

    if (relativePath.startsWith('scripts/')) {
        return 'script';
    }

    if (relativePath.startsWith('data/')) {
        if (
            relativePath.includes('/extracted-text/') ||
            relativePath.endsWith('/document-catalog.json') ||
            relativePath.endsWith('/text-extraction-catalog.json')
        ) {
            return 'generated-data';
        }

        return 'source-data';
    }

    return 'unknown';
}

function suggestFutureOwner(relativePath, category) {
    if (category === 'rag-doc') {
        return 'docs/rag/';
    }

    if (category === 'api-contract') {
        return 'docs/api-contracts/';
    }

    if (category === 'worker') {
        return 'services/rag-workers/stock-documents/';
    }

    if (category === 'api' || category === 'workflow') {
        return 'keep-current';
    }

    if (category === 'script') {
        if (relativePath.startsWith('scripts/rag/')) {
            return 'scripts/rag/';
        }

        if (relativePath.includes('stock-document') || relativePath.includes('rag')) {
            return 'services/rag-workers/stock-documents/';
        }

        return 'needs-review';
    }

    if (category === 'generated-data' || category === 'source-data') {
        if (
            relativePath.startsWith('data/stock/turkey/') ||
            relativePath.startsWith('data/investment/')
        ) {
            return 'data/investment/turkey/';
        }
    }

    return 'needs-review';
}

function detectRisk(relativePath, category, owner) {
    if (category === 'api' || category === 'workflow') {
        return 'high';
    }

    if (category === 'generated-data') {
        return 'high';
    }

    if (category === 'source-data' && relativePath.endsWith('.pdf')) {
        return 'high';
    }

    if (category === 'source-data' && relativePath.startsWith('data/investment-analytics/')) {
        return 'high';
    }

    if (category === 'source-data') {
        return 'medium';
    }

    if (owner === 'needs-review') {
        return 'needs-review';
    }

    if (category === 'script' || category === 'worker') {
        return 'medium';
    }

    if (category === 'rag-doc' || category === 'api-contract') {
        return 'low';
    }

    return 'needs-review';
}

function buildReason(relativePath, pathMatches, contentMatches, category, owner, risk) {
    const evidence = [];

    if (pathMatches.length > 0) {
        evidence.push(`path keywords: ${pathMatches.join(', ')}`);
    }

    if (contentMatches.length > 0) {
        evidence.push(`content keywords: ${contentMatches.slice(0, 6).join(', ')}`);
    }

    if (category === 'generated-data') {
        evidence.push('generated output or derived catalog path');
    }

    if (risk === 'high') {
        evidence.push('defer moves until producer/consumer compatibility is verified');
    }

    if (owner === 'needs-review') {
        evidence.push('future owner cannot be inferred safely');
    }

    if (evidence.length === 0) {
        evidence.push(`matched ${relativePath}`);
    }

    return evidence.join('; ');
}

function analyzeFile(absolutePath) {
    const relativePath = toRepoRelativePath(absolutePath);
    const pathMatches = findKeywordMatches(relativePath, pathKeywords);
    const contentSample = readContentSample(absolutePath);
    const contentMatches = findKeywordMatches(contentSample, contentKeywords);

    if (pathMatches.length === 0 && contentMatches.length === 0) {
        return null;
    }

    const category = categorizeFile(relativePath);
    const owner = suggestFutureOwner(relativePath, category);
    const risk = detectRisk(relativePath, category, owner);

    return {
        path: relativePath,
        category,
        owner,
        risk,
        reason: buildReason(relativePath, pathMatches, contentMatches, category, owner, risk)
    };
}

function countBy(items, propertyName) {
    return items.reduce((counts, item) => {
        counts[item[propertyName]] = (counts[item[propertyName]] ?? 0) + 1;
        return counts;
    }, {});
}

function printCounts(title, counts) {
    console.log(`\n${title}`);
    console.log('-'.repeat(title.length));

    Object.entries(counts)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .forEach(([key, count]) => {
            console.log(`${key}: ${count}`);
        });
}

function printTable(items) {
    console.log('\nMatched Investment Data + RAG assets');
    console.log('------------------------------------');

    if (items.length === 0) {
        console.log('(none)');
        return;
    }

    items.forEach((item) => {
        console.log(`- ${item.path}`);
        console.log(`  category: ${item.category}`);
        console.log(`  suggestedFutureOwner: ${item.owner}`);
        console.log(`  risk: ${item.risk}`);
        console.log(`  reason: ${item.reason}`);
    });
}

function printReviewItems(items) {
    const reviewItems = items.filter(
        (item) => item.risk === 'high' || item.risk === 'needs-review'
    );

    console.log('\nHigh-risk / needs-review items');
    console.log('------------------------------');

    if (reviewItems.length === 0) {
        console.log('(none)');
        return;
    }

    reviewItems.forEach((item) => {
        console.log(`- ${item.path} [${item.risk}] ${item.reason}`);
    });
}

function main() {
    const files = collectFiles();
    const matchedItems = files.map(analyzeFile).filter(Boolean);

    console.log('Investment Data + RAG Migration Map Audit');
    console.log('========================================');
    console.log(`Repository root: ${repoRoot}`);
    console.log(`Scanned files: ${files.length}`);
    console.log(`Matched files: ${matchedItems.length}`);
    console.log(
        'Note: needs-review/high-risk findings are informational and do not fail this script.'
    );

    printCounts('Counts by category', countBy(matchedItems, 'category'));
    printCounts('Counts by suggested future owner', countBy(matchedItems, 'owner'));
    printTable(matchedItems);
    printReviewItems(matchedItems);
}

try {
    main();
} catch (error) {
    console.error('Investment Data + RAG map audit failed.');
    console.error(error);
    process.exit(1);
}
