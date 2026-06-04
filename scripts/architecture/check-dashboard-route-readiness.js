#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();

const inspectTargets = [
    'dashboard',
    'packages/config/routes.js',
    'packages/auth/roles.js',
    'packages/auth/premium-access.js',
    'js/lib/auth.js',
    'apps/dashboard'
];

const routeNames = ['admin', 'premium', 'member'];

function toRepoPath(filePath) {
    return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function readTextIfFile(relativePath) {
    const absolutePath = path.join(repoRoot, relativePath);
    if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
        return '';
    }
    return fs.readFileSync(absolutePath, 'utf8');
}

function walkFiles(relativeDir) {
    const absoluteDir = path.join(repoRoot, relativeDir);
    if (!fs.existsSync(absoluteDir) || !fs.statSync(absoluteDir).isDirectory()) {
        return [];
    }

    const entries = fs.readdirSync(absoluteDir, { withFileTypes: true });
    return entries.flatMap((entry) => {
        const entryPath = path.join(absoluteDir, entry.name);
        if (entry.isDirectory()) {
            return walkFiles(toRepoPath(entryPath));
        }
        if (entry.isFile()) {
            return [toRepoPath(entryPath)];
        }
        return [];
    });
}

function findMatches(files, patterns) {
    return files.flatMap((file) => {
        const text = readTextIfFile(file);
        return patterns
            .filter(({ pattern }) => pattern.test(text))
            .map(({ label }) => ({ file, label }));
    });
}

function resolveScriptPath(htmlFile, scriptSource) {
    if (/^(?:https?:)?\/\//.test(scriptSource)) return null;
    const cleanSource = scriptSource.split('?')[0].split('#')[0];
    if (!cleanSource || cleanSource.startsWith('data:')) return null;
    const resolvedPath = cleanSource.startsWith('/')
        ? cleanSource.slice(1)
        : path.posix.normalize(path.posix.join(path.posix.dirname(htmlFile), cleanSource));
    return resolvedPath.endsWith('.js') ? resolvedPath : null;
}

function discoverLinkedScripts(htmlFiles) {
    return htmlFiles.flatMap((htmlFile) => {
        const text = readTextIfFile(htmlFile);
        const matches = [...text.matchAll(/<script[^>]+src=["']([^"']+)["'][^>]*>/gi)];
        return matches
            .map((match) => resolveScriptPath(htmlFile, match[1]))
            .filter((scriptPath) => scriptPath && fs.existsSync(path.join(repoRoot, scriptPath)));
    });
}

function discoverRouteConstants(routesText) {
    return routeNames.map((routeName) => {
        const regex = new RegExp(`${routeName}:\\s*['\"]([^'\"]+)['\"]`);
        const match = routesText.match(regex);
        return {
            role: routeName,
            route: match ? match[1] : 'needs-review'
        };
    });
}

function main() {
    const missingTargets = inspectTargets.filter(
        (target) => !fs.existsSync(path.join(repoRoot, target))
    );
    const dashboardFiles = walkFiles('dashboard');
    const appsDashboardFiles = walkFiles('apps/dashboard');
    const dashboardHtmlFiles = dashboardFiles.filter((file) => file.endsWith('.html')).sort();
    const linkedDashboardScripts = discoverLinkedScripts(dashboardHtmlFiles);
    const readableDashboardFiles = [...dashboardFiles, ...linkedDashboardScripts]
        .filter((file) => /\.(html|js|md)$/.test(file))
        .filter((file, index, files) => files.indexOf(file) === index)
        .sort();
    const readableFiles = [
        ...readableDashboardFiles,
        ...appsDashboardFiles.filter((file) => /\.(js|md)$/.test(file)),
        'packages/config/routes.js',
        'packages/auth/roles.js',
        'packages/auth/premium-access.js',
        'js/lib/auth.js'
    ].filter((file, index, files) => files.indexOf(file) === index);

    const routesText = readTextIfFile('packages/config/routes.js');
    const rolesText = readTextIfFile('packages/auth/roles.js');
    const authText = readTextIfFile('js/lib/auth.js');
    const routeConstants = discoverRouteConstants(routesText);

    const routeReferencePatterns = routeNames.map((role) => ({
        label: `${role} route reference`,
        pattern: new RegExp(
            `dashboard/(?:[^'\"\\s)]*/)?${role}(?:\\.html|/|['\"\\s)]|$)|DASHBOARD_ROUTES\\.${role}|${role}:\\s*['\"]`,
            'i'
        )
    }));

    const authGuardUsage = findMatches(readableFiles, [
        { label: 'requireAuth usage', pattern: /requireAuth\s*\(/ },
        { label: 'allowedRoles usage', pattern: /allowedRoles/ }
    ]).sort((a, b) => a.file.localeCompare(b.file) || a.label.localeCompare(b.label));

    const routeReferences = findMatches(readableFiles, routeReferencePatterns).sort(
        (a, b) => a.file.localeCompare(b.file) || a.label.localeCompare(b.label)
    );

    const needsReview = [];
    if (missingTargets.length > 0) {
        needsReview.push(`Missing inspect targets: ${missingTargets.join(', ')}`);
    }
    routeConstants.forEach(({ role, route }) => {
        if (route === 'needs-review') {
            needsReview.push(`Missing DASHBOARD_ROUTES mapping for ${role}`);
        }
    });
    if (!/getDashboardRouteForRole\s*\(/.test(routesText)) {
        needsReview.push(
            'getDashboardRouteForRole helper was not found in packages/config/routes.js'
        );
    }
    if (!/isRoleAllowed\s*\(/.test(rolesText)) {
        needsReview.push('isRoleAllowed helper was not found in packages/auth/roles.js');
    }
    if (!/allowedRoles\s*=\s*\[\]/.test(authText)) {
        needsReview.push('Default allowedRoles behavior in js/lib/auth.js needs manual review');
    }
    if (
        !authGuardUsage.some(
            (item) => item.file.startsWith('dashboard/') || item.file.startsWith('js/')
        )
    ) {
        needsReview.push('No dashboard auth guard usage was discovered');
    }

    console.log('Dashboard Route Readiness Audit');
    console.log('================================');
    console.log('\nInspect targets:');
    inspectTargets.forEach((target) => console.log(`- ${target}`));

    console.log('\nDiscovered dashboard HTML files:');
    dashboardHtmlFiles.forEach((file) => console.log(`- ${file}`));
    if (dashboardHtmlFiles.length === 0) console.log('- none');

    console.log('\nDiscovered role route constants:');
    routeConstants.forEach(({ role, route }) => console.log(`- ${role}: ${route}`));
    console.log(
        `- getDashboardRouteForRole: ${/getDashboardRouteForRole\s*\(/.test(routesText) ? 'found' : 'needs-review'}`
    );

    console.log('\nDiscovered dashboard-linked scripts:');
    linkedDashboardScripts
        .filter((file, index, files) => files.indexOf(file) === index)
        .sort()
        .forEach((file) => console.log(`- ${file}`));
    if (linkedDashboardScripts.length === 0) console.log('- none');

    console.log('\nDiscovered admin/premium/member route references:');
    routeReferences.forEach(({ file, label }) => console.log(`- ${file}: ${label}`));
    if (routeReferences.length === 0) console.log('- none');

    console.log('\nDiscovered auth guard usage:');
    authGuardUsage.forEach(({ file, label }) => console.log(`- ${file}: ${label}`));
    if (authGuardUsage.length === 0) console.log('- none');

    console.log('\nNeeds-review items:');
    if (needsReview.length === 0) {
        console.log('- Manual smoke testing still required before any protected route move.');
    } else {
        needsReview.forEach((item) => console.log(`- ${item}`));
    }

    console.log('\nResult: readiness audit completed without enforcing route moves.');
}

try {
    main();
} catch (error) {
    console.error('Dashboard route readiness audit failed.');
    console.error(error);
    process.exitCode = 1;
}
