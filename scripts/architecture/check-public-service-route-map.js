const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SCAN_TARGETS = [
    'pages',
    'index.html',
    'domains/corporate-automation',
    'apps/web',
    'domains/products',
    'domains/services'
];
const KEYWORDS = [
    'rpa',
    'webscraping',
    'web scraping',
    'api',
    'automation',
    'training',
    'consulting',
    'subscription',
    'pricing',
    'service',
    'product',
    'ai assistant',
    'google sheets',
    'python automation'
];
const SERVICE_HREF_KEYWORDS = [
    'rpa',
    'webscraping',
    'api',
    'training-consulting',
    'subscription',
    'pricing',
    'service',
    'product',
    'ai-assistant'
];
const BINARY_EXTENSIONS = new Set([
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.ico',
    '.pdf',
    '.zip',
    '.gz',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot'
]);
const MAX_TEXT_BYTES = 512 * 1024;

function toPosix(filePath) {
    return filePath.split(path.sep).join('/');
}

function exists(relativePath) {
    return fs.existsSync(path.join(ROOT, relativePath));
}

function isDirectory(relativePath) {
    return exists(relativePath) && fs.statSync(path.join(ROOT, relativePath)).isDirectory();
}

function walk(relativeDirectory, files) {
    const entries = fs.readdirSync(path.join(ROOT, relativeDirectory), { withFileTypes: true });

    for (const entry of entries) {
        const relativeEntry = toPosix(path.join(relativeDirectory, entry.name));
        if (entry.name === '.git' || entry.name === 'node_modules') continue;

        if (entry.isDirectory()) {
            walk(relativeEntry, files);
        } else if (entry.isFile()) {
            files.push(relativeEntry);
        }
    }
}

function collectFiles() {
    const files = [];

    for (const target of SCAN_TARGETS) {
        if (!exists(target)) continue;
        if (isDirectory(target)) {
            walk(target, files);
        } else {
            files.push(target);
        }
    }

    return files.sort();
}

function readText(relativePath) {
    if (BINARY_EXTENSIONS.has(path.extname(relativePath).toLowerCase())) return '';

    const absolutePath = path.join(ROOT, relativePath);
    const handle = fs.openSync(absolutePath, 'r');
    try {
        const stat = fs.fstatSync(handle);
        const bytesToRead = Math.min(stat.size, MAX_TEXT_BYTES);
        const buffer = Buffer.alloc(bytesToRead);
        fs.readSync(handle, buffer, 0, bytesToRead, 0);
        if (buffer.includes(0)) return '';
        return buffer.toString('utf8');
    } finally {
        fs.closeSync(handle);
    }
}

function unique(values) {
    return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function extractAttributeValues(content, tagName, attributeName) {
    const pattern = new RegExp(
        `<${tagName}\\b[^>]*\\s${attributeName}=["']([^"']+)["'][^>]*>`,
        'gi'
    );
    const values = [];
    let match = pattern.exec(content);

    while (match) {
        values.push(match[1]);
        match = pattern.exec(content);
    }

    return unique(values);
}

function extractStylesheets(content) {
    return extractAttributeValues(content, 'link', 'href').filter((href) => href.includes('.css'));
}

function extractScripts(content) {
    return extractAttributeValues(content, 'script', 'src');
}

function extractServiceHrefs(content) {
    return extractAttributeValues(content, 'a', 'href').filter((href) => {
        const lowerHref = href.toLowerCase();
        return SERVICE_HREF_KEYWORDS.some((keyword) => lowerHref.includes(keyword));
    });
}

function likelyPublicUrl(relativePath) {
    if (relativePath === 'index.html') return '/';
    if (relativePath.startsWith('pages/') && relativePath.endsWith('.html')) {
        return `/${relativePath}`;
    }
    return 'not-public-route';
}

function findKeywordMatches(relativePath, content) {
    const haystack = `${relativePath}\n${content}`.toLowerCase();
    return KEYWORDS.filter((keyword) => haystack.includes(keyword));
}

function suggestedFutureOwner(relativePath, content) {
    const haystack = `${relativePath}\n${content}`.toLowerCase();

    if (relativePath === 'index.html' || relativePath.startsWith('apps/web/')) {
        return 'apps/web/';
    }
    if (
        relativePath === 'pages/rpa.html' ||
        relativePath.startsWith('domains/corporate-automation/rpa/')
    ) {
        return 'domains/corporate-automation/rpa/';
    }
    if (
        relativePath === 'pages/webscraping.html' ||
        relativePath.startsWith('domains/corporate-automation/web-scraping/')
    ) {
        return 'domains/corporate-automation/web-scraping/';
    }
    if (
        relativePath === 'pages/api.html' ||
        relativePath.startsWith('domains/corporate-automation/api-automation/')
    ) {
        return 'domains/corporate-automation/api-automation/';
    }
    if (
        relativePath === 'pages/training-consulting.html' ||
        relativePath.startsWith('domains/corporate-automation/training-consulting/')
    ) {
        return 'domains/corporate-automation/training-consulting/';
    }
    if (
        relativePath === 'pages/subscription.html' ||
        relativePath.startsWith('domains/products/')
    ) {
        return 'domains/products/';
    }
    if (relativePath === 'pages/ai-assistant.html') {
        return 'domains/products/';
    }
    if (
        relativePath === 'pages/financial-indicators.html' ||
        relativePath.startsWith('pages/investment-')
    ) {
        return 'domains/investment-intelligence/';
    }
    if (relativePath.startsWith('domains/corporate-automation/')) {
        return 'domains/corporate-automation/';
    }
    if (relativePath.startsWith('domains/services/')) return 'domains/services/';

    if (haystack.includes('subscription') || haystack.includes('pricing')) {
        return 'domains/products/';
    }
    if (haystack.includes('ai assistant') || haystack.includes('chatbot')) {
        return 'domains/products/';
    }

    return 'needs-review';
}

function riskLevel(relativePath, stylesheets, scripts, serviceHrefs, owner) {
    if (!relativePath.endsWith('.html')) return 'low';
    if (owner === 'needs-review') return 'needs-review';
    if (relativePath.includes('subscription')) return 'high';
    if (
        scripts.some(
            (script) => script.includes('firestore') || script.includes('premium-content-gate')
        )
    ) {
        return 'high';
    }
    if (scripts.length > 4 || serviceHrefs.length > 4 || stylesheets.length > 2) return 'medium';
    return 'low';
}

function reasonFor(relativePath, matches, risk, owner) {
    if (owner === 'needs-review') {
        return `matched ${matches.join(', ')} through shared navigation or generic content; ownership needs review`;
    }
    if (risk === 'high') {
        return `matched ${matches.join(', ')}; auth, payment, subscription, Firestore, or premium-access coupling may exist`;
    }
    if (risk === 'medium') {
        return `matched ${matches.join(', ')}; static route has shared CSS/JS and service navigation dependencies`;
    }
    return `matched ${matches.join(', ')}; ownership skeleton exists and runtime coupling appears limited`;
}

function incrementMap(counter, values) {
    for (const value of values) {
        counter.set(value, (counter.get(value) || 0) + 1);
    }
}

function printCounter(title, counter) {
    console.log(`\n${title}`);
    console.log('-'.repeat(title.length));
    if (counter.size === 0) {
        console.log('None detected.');
        return;
    }

    for (const [key, count] of [...counter.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        console.log(`${key}: ${count}`);
    }
}

function main() {
    const results = [];

    for (const file of collectFiles()) {
        const content = readText(file);
        const matches = findKeywordMatches(file, content);
        if (matches.length === 0) continue;

        const stylesheets = extractStylesheets(content);
        const scripts = extractScripts(content);
        const serviceHrefs = extractServiceHrefs(content);
        const owner = suggestedFutureOwner(file, content);
        const risk = riskLevel(file, stylesheets, scripts, serviceHrefs, owner);
        results.push({
            path: file,
            publicUrl: likelyPublicUrl(file),
            stylesheets,
            scripts,
            serviceHrefs,
            owner,
            risk,
            reason: reasonFor(file, matches, risk, owner)
        });
    }

    const cssDependencies = new Map();
    const jsDependencies = new Map();
    const ownerCounts = new Map();
    for (const result of results) {
        incrementMap(cssDependencies, result.stylesheets);
        incrementMap(jsDependencies, result.scripts);
        incrementMap(ownerCounts, [result.owner]);
    }

    console.log('Public Service + Corporate Automation Route Map Audit');
    console.log('=======================================================');
    console.log(`Scanned targets: ${SCAN_TARGETS.filter(exists).join(', ')}`);
    console.log(`Discovered matched items: ${results.length}`);

    console.log('\nDiscovered service pages and ownership candidates');
    console.log('--------------------------------------------------');
    for (const result of results) {
        console.log(`${result.path}`);
        console.log(`  likely public URL: ${result.publicUrl}`);
        console.log(`  CSS dependencies: ${result.stylesheets.join(', ') || 'none'}`);
        console.log(`  JS dependencies: ${result.scripts.join(', ') || 'none'}`);
        console.log(`  service/product nav hrefs: ${result.serviceHrefs.join(', ') || 'none'}`);
        console.log(`  suggested future owner: ${result.owner}`);
        console.log(`  risk: ${result.risk}`);
        console.log(`  reason: ${result.reason}`);
    }

    printCounter('CSS dependencies', cssDependencies);
    printCounter('JS dependencies', jsDependencies);
    printCounter('Suggested future owners', ownerCounts);

    const needsReview = results.filter((result) => result.risk === 'needs-review');
    console.log('\nNeeds-review items');
    console.log('------------------');
    if (needsReview.length === 0) {
        console.log('None detected.');
    } else {
        for (const result of needsReview) {
            console.log(`${result.path} -> ${result.owner}: ${result.reason}`);
        }
    }
}

try {
    main();
} catch (error) {
    console.error('Public service route map audit failed.');
    console.error(error);
    process.exitCode = 1;
}
