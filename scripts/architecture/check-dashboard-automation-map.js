const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SCAN_ROOTS = [
    'dashboard',
    'pages',
    'js',
    'css',
    'api',
    'data',
    'docs',
    'apps',
    'domains',
    'services',
    'packages'
];
const IGNORED_DIRS = new Set(['.git', 'node_modules']);
const MAX_TEXT_BYTES = 256 * 1024;
const KEYWORDS = [
    'dashboard',
    'admin',
    'member',
    'premium',
    'auth',
    'firebase',
    'login',
    'role',
    'allowedRoles',
    'impersonat',
    'settings',
    'server',
    'automation',
    'automations',
    'rpa',
    'webscraping',
    'web-scraping',
    'web scraping',
    'api',
    'projects',
    'products',
    'services',
    'training',
    'consulting',
    'subscription',
    'corporate',
    'google sheets',
    'python automation'
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

function toPosix(filePath) {
    return filePath.split(path.sep).join('/');
}

function existsDirectory(relativePath) {
    try {
        return fs.statSync(path.join(ROOT, relativePath)).isDirectory();
    } catch (_error) {
        return false;
    }
}

function isIgnored(relativePath) {
    return relativePath.split('/').some((part) => IGNORED_DIRS.has(part));
}

function walkDirectory(relativeDirectory, files) {
    const absoluteDirectory = path.join(ROOT, relativeDirectory);
    const entries = fs.readdirSync(absoluteDirectory, { withFileTypes: true });

    for (const entry of entries) {
        const relativeEntry = toPosix(path.join(relativeDirectory, entry.name));
        if (isIgnored(relativeEntry)) continue;

        if (entry.isDirectory()) {
            walkDirectory(relativeEntry, files);
        } else if (entry.isFile()) {
            files.push(relativeEntry);
        }
    }
}

function readTextSample(relativePath) {
    const extension = path.extname(relativePath).toLowerCase();
    if (BINARY_EXTENSIONS.has(extension)) return '';

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

function findKeywordMatches(relativePath, content) {
    const haystack = `${relativePath}\n${content}`.toLowerCase();
    return KEYWORDS.filter((keyword) => haystack.includes(keyword.toLowerCase()));
}

function includesAny(value, needles) {
    return needles.some((needle) => value.includes(needle));
}

function classifyFile(relativePath, content, matches) {
    const lowerPath = relativePath.toLowerCase();
    const lowerContent = content.toLowerCase();
    const combined = `${lowerPath}\n${lowerContent}`;

    const isDashboardPath = lowerPath.startsWith('dashboard/');
    const isPagePath = lowerPath.startsWith('pages/');
    const isDashboardJsPath =
        lowerPath === 'js/pages/admin.js' ||
        lowerPath === 'js/pages/dashboard.js' ||
        lowerPath === 'js/pages/member.js';
    const isAuthConfigPath =
        lowerPath === 'js/lib/auth.js' ||
        lowerPath === 'js/lib/firebase.js' ||
        lowerPath.startsWith('dashboard/shared/') ||
        lowerPath.startsWith('packages/auth/') ||
        lowerPath.startsWith('packages/config/');
    const isAuthSensitiveJs = [
        'js/pages/login.js',
        'js/pages/unauthorized.js',
        'js/impersonate.js',
        'js/premium-content-gate.js',
        'js/session-manager.js'
    ].includes(lowerPath);
    const isCorporateAutomation = includesAny(combined, [
        'automation',
        'rpa',
        'webscraping',
        'web-scraping',
        'web scraping',
        'google sheets',
        'python automation',
        'training-consulting',
        'training consulting'
    ]);
    const isPublicServicePage =
        isPagePath &&
        includesAny(lowerPath, [
            'rpa',
            'webscraping',
            'api',
            'training-consulting',
            'subscription',
            'ai-assistant',
            'financial-indicators'
        ]);

    if (isDashboardPath && lowerPath.endsWith('.html')) {
        return {
            category: 'dashboard-route',
            owner: 'apps/dashboard/',
            risk: 'high',
            reason: `dashboard HTML route; matched ${matches.join(', ')}`
        };
    }

    if (isDashboardJsPath) {
        return {
            category: 'dashboard-js',
            owner: 'apps/dashboard/',
            risk: 'high',
            reason: `dashboard page JavaScript with auth/access coupling; matched ${matches.join(', ')}`
        };
    }

    if (isAuthConfigPath || isAuthSensitiveJs) {
        let owner = 'packages/config/';
        if (
            lowerPath.startsWith('packages/auth/') ||
            isAuthSensitiveJs ||
            lowerPath === 'js/lib/auth.js' ||
            lowerPath === 'js/lib/firebase.js'
        ) {
            owner = 'packages/auth/';
        }
        return {
            category: 'auth-config',
            owner,
            risk: 'high',
            reason: `shared auth/config source or future package helper; matched ${matches.join(', ')}`
        };
    }

    if (isPublicServicePage) {
        const owner = lowerPath.includes('subscription')
            ? 'domains/products/'
            : 'domains/corporate-automation/';
        return {
            category: 'public-service-page',
            owner,
            risk: 'medium',
            reason: `public product/service route; matched ${matches.join(', ')}`
        };
    }

    if (isPagePath) {
        return {
            category: 'unknown',
            owner: 'needs-review',
            risk: 'needs-review',
            reason: `public page matched dashboard/auth/service keywords through path or shared page content; matched ${matches.join(', ')}`
        };
    }

    if (lowerPath.startsWith('api/')) {
        return {
            category: 'api',
            owner: 'keep-current',
            risk: 'high',
            reason: `API runtime touchpoint; matched ${matches.join(', ')}`
        };
    }

    if (lowerPath.startsWith('data/')) {
        return {
            category: 'data',
            owner: 'packages/data-access/',
            risk: 'medium',
            reason: `data source or data contract candidate; matched ${matches.join(', ')}`
        };
    }

    if (lowerPath.startsWith('docs/')) {
        return {
            category: 'docs',
            owner: 'docs/architecture/',
            risk: 'low',
            reason: `documentation reference; matched ${matches.join(', ')}`
        };
    }

    if (lowerPath.startsWith('apps/')) {
        return {
            category: 'app-skeleton',
            owner: lowerPath.startsWith('apps/web/') ? 'apps/web/' : 'apps/dashboard/',
            risk: 'low',
            reason: `future app ownership skeleton; matched ${matches.join(', ')}`
        };
    }

    if (lowerPath.startsWith('domains/')) {
        const owner = lowerPath.includes('product')
            ? 'domains/products/'
            : 'domains/corporate-automation/';
        return {
            category: 'domain-skeleton',
            owner,
            risk: 'low',
            reason: `future domain ownership skeleton; matched ${matches.join(', ')}`
        };
    }

    if (lowerPath.startsWith('packages/')) {
        return {
            category: 'package',
            owner: lowerPath.startsWith('packages/data-access/')
                ? 'packages/data-access/'
                : 'packages/config/',
            risk: 'low',
            reason: `future shared package source or README; matched ${matches.join(', ')}`
        };
    }

    if (lowerPath.startsWith('services/')) {
        return {
            category: isCorporateAutomation ? 'corporate-automation' : 'unknown',
            owner: isCorporateAutomation ? 'services/automation-workers/' : 'needs-review',
            risk: isCorporateAutomation ? 'medium' : 'needs-review',
            reason: `service/worker ownership candidate; matched ${matches.join(', ')}`
        };
    }

    if (isDashboardPath) {
        return {
            category: isCorporateAutomation ? 'corporate-automation' : 'dashboard-route',
            owner: isCorporateAutomation ? 'services/automation-workers/' : 'apps/dashboard/',
            risk: 'high',
            reason: `dashboard runtime asset or backend-adjacent dashboard file; matched ${matches.join(', ')}`
        };
    }

    if (isCorporateAutomation) {
        return {
            category: 'corporate-automation',
            owner: lowerPath.startsWith('css/')
                ? 'domains/corporate-automation/'
                : 'services/automation-workers/',
            risk: lowerPath.startsWith('css/') ? 'medium' : 'needs-review',
            reason: `corporate automation/service/product signal; matched ${matches.join(', ')}`
        };
    }

    return {
        category: 'unknown',
        owner: 'needs-review',
        risk: 'needs-review',
        reason: `matched ${matches.join(', ')}, but ownership is ambiguous`
    };
}

function incrementCounter(counter, key) {
    counter.set(key, (counter.get(key) || 0) + 1);
}

function printCounter(title, counter) {
    console.log(`\n${title}`);
    console.log('-'.repeat(title.length));
    for (const [key, count] of [...counter.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        console.log(`${key}: ${count}`);
    }
}

function main() {
    const files = [];
    for (const scanRoot of SCAN_ROOTS) {
        if (existsDirectory(scanRoot)) walkDirectory(scanRoot, files);
    }

    const results = [];
    for (const file of files.sort()) {
        const content = readTextSample(file);
        const matches = findKeywordMatches(file, content);
        if (matches.length === 0) continue;

        const classification = classifyFile(file, content, matches);
        results.push({ path: file, ...classification });
    }

    const categoryCounts = new Map();
    const ownerCounts = new Map();
    for (const result of results) {
        incrementCounter(categoryCounts, result.category);
        incrementCounter(ownerCounts, result.owner);
    }

    console.log('Dashboard + Corporate Automation Migration Map');
    console.log('================================================');
    console.log(`Scanned roots: ${SCAN_ROOTS.filter(existsDirectory).join(', ')}`);
    console.log(`Matched files: ${results.length}`);

    printCounter('Counts by category', categoryCounts);
    printCounter('Counts by suggested future owner', ownerCounts);

    console.log('\nMatched files');
    console.log('-------------');
    for (const result of results) {
        console.log(`${result.path}`);
        console.log(`  category: ${result.category}`);
        console.log(`  suggested future owner: ${result.owner}`);
        console.log(`  risk: ${result.risk}`);
        console.log(`  reason: ${result.reason}`);
    }

    const risky = results.filter(
        (result) => result.risk === 'high' || result.risk === 'needs-review'
    );
    console.log('\nHigh-risk / needs-review items');
    console.log('------------------------------');
    if (risky.length === 0) {
        console.log('None detected.');
    } else {
        for (const result of risky) {
            console.log(`${result.path} [${result.risk}] -> ${result.owner}: ${result.reason}`);
        }
    }
}

try {
    main();
} catch (error) {
    console.error('Dashboard automation map check failed.');
    console.error(error);
    process.exitCode = 1;
}
