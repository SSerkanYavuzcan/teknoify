#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const inspectTargets = [
    'dashboard',
    'packages/config/routes.js',
    'js/lib/auth.js',
    'apps/dashboard'
];
const roleRoutes = Object.freeze({
    admin: '/dashboard/admin.html',
    premium: '/dashboard/premium.html',
    member: '/dashboard/member.html'
});

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

    return fs
        .readdirSync(absoluteDir, { withFileTypes: true })
        .flatMap((entry) => {
            const entryPath = path.join(absoluteDir, entry.name);
            if (entry.isDirectory()) {
                return walkFiles(toRepoPath(entryPath));
            }
            if (entry.isFile()) {
                return [toRepoPath(entryPath)];
            }
            return [];
        })
        .sort();
}

function cleanAssetReference(assetReference) {
    return assetReference.split('?')[0].split('#')[0].trim();
}

function isExternalReference(assetReference) {
    return /^(?:https?:)?\/\//.test(assetReference);
}

function resolveLocalReference(htmlFile, assetReference) {
    const cleanReference = cleanAssetReference(assetReference);
    if (
        !cleanReference ||
        cleanReference.startsWith('data:') ||
        isExternalReference(cleanReference)
    ) {
        return null;
    }

    if (cleanReference.startsWith('/')) {
        return cleanReference.slice(1);
    }

    return path.posix.normalize(path.posix.join(path.posix.dirname(htmlFile), cleanReference));
}

function discoverLinkedAssets(htmlFiles) {
    return htmlFiles.flatMap((htmlFile) => {
        const text = readTextIfFile(htmlFile);
        const scriptMatches = [...text.matchAll(/<script[^>]+src=["']([^"']+)["'][^>]*>/gi)].map(
            (match) => ({ htmlFile, type: 'script', reference: match[1] })
        );
        const styleMatches = [...text.matchAll(/<link[^>]+href=["']([^"']+)["'][^>]*>/gi)]
            .filter((match) => /rel=["']stylesheet["']/i.test(match[0]))
            .map((match) => ({ htmlFile, type: 'style', reference: match[1] }));

        return [...scriptMatches, ...styleMatches].map((asset) => {
            const resolvedPath = resolveLocalReference(asset.htmlFile, asset.reference);
            return {
                ...asset,
                resolvedPath,
                exists: resolvedPath ? fs.existsSync(path.join(repoRoot, resolvedPath)) : null,
                moveRisk: resolvedPath !== null && !asset.reference.startsWith('/')
            };
        });
    });
}

function discoverRoleRouteConstants(routesText) {
    return Object.entries(roleRoutes).map(([role, expectedRoute]) => {
        const regex = new RegExp(`${role}:\\s*['\"]([^'\"]+)['\"]`);
        const match = routesText.match(regex);
        return {
            role,
            expectedRoute,
            discoveredRoute: match ? match[1] : 'missing',
            compatible: match ? match[1] === expectedRoute : false
        };
    });
}

function discoverGetDashboardRouteMapping(routesText) {
    return Object.keys(roleRoutes).map((role) => {
        const regex = new RegExp(
            role === 'member'
                ? `return\\s+DASHBOARD_ROUTES\\.${role}`
                : `roleType\\s*===\\s*['\"]${role}['\"][^;]+return\\s+DASHBOARD_ROUTES\\.${role}`,
            's'
        );
        return {
            role,
            found: regex.test(routesText)
        };
    });
}

function discoverAuthRedirectReferences(authText) {
    const references = [];
    if (/getDashboardRouteForRole\s*\(/.test(authText)) {
        references.push('getDashboardRouteForRole() used for role dashboard redirects');
    }
    if (/PUBLIC_ROUTES\.home/.test(authText)) {
        references.push('PUBLIC_ROUTES.home used for login/home redirect');
    }
    Object.values(roleRoutes).forEach((route) => {
        if (authText.includes(route)) {
            references.push(`${route} literal referenced in js/lib/auth.js`);
        }
    });
    return references;
}

function collectMoveRiskNotes(htmlFiles, linkedAssets, routesText, authText) {
    const notes = [];
    const relativeAssets = linkedAssets.filter((asset) => asset.moveRisk);
    const missingLocalAssets = linkedAssets.filter(
        (asset) =>
            asset.resolvedPath && asset.exists === false && !asset.reference.startsWith('http')
    );

    if (htmlFiles.length > 0) {
        notes.push(
            'Existing dashboard/*.html and nested dashboard HTML files are public/protected route contracts.'
        );
    }
    if (relativeAssets.length > 0) {
        notes.push(
            `${relativeAssets.length} linked local script/style references are relative and would resolve differently under apps/dashboard/.`
        );
    }
    if (missingLocalAssets.length > 0) {
        notes.push(
            `${missingLocalAssets.length} linked local script/style references do not resolve from the current static tree and need manual review before any move.`
        );
    }
    if (/getDashboardRouteForRole\s*\(/.test(routesText)) {
        notes.push(
            'getDashboardRouteForRole() is present and must keep returning public /dashboard/*.html URLs.'
        );
    }
    if (/getDashboardPath\s*\(|window\.location\.href\s*=\s*getDashboardPath/.test(authText)) {
        notes.push('Auth redirect behavior depends on role dashboard route helper compatibility.');
    }

    return notes;
}

function printSection(title, rows) {
    console.log(`\n${title}:`);
    if (rows.length === 0) {
        console.log('- none');
        return;
    }
    rows.forEach((row) => console.log(`- ${row}`));
}

function main() {
    const missingTargets = inspectTargets.filter(
        (target) => !fs.existsSync(path.join(repoRoot, target))
    );
    const dashboardFiles = walkFiles('dashboard');
    const dashboardHtmlFiles = dashboardFiles.filter((file) => file.endsWith('.html'));
    const appsDashboardFiles = walkFiles('apps/dashboard');
    const routesText = readTextIfFile('packages/config/routes.js');
    const authText = readTextIfFile('js/lib/auth.js');
    const roleRouteConstants = discoverRoleRouteConstants(routesText);
    const routeMappings = discoverGetDashboardRouteMapping(routesText);
    const linkedAssets = discoverLinkedAssets(dashboardHtmlFiles);
    const localLinkedAssets = linkedAssets.filter((asset) => asset.resolvedPath);
    const externalLinkedAssets = linkedAssets.filter((asset) => !asset.resolvedPath);
    const moveRiskNotes = collectMoveRiskNotes(
        dashboardHtmlFiles,
        linkedAssets,
        routesText,
        authText
    );

    console.log('Dashboard Route Compatibility Audit');
    console.log('===================================');
    printSection('Inspect targets', inspectTargets);
    printSection('Missing inspect targets', missingTargets);

    printSection('Discovered dashboard route files', dashboardHtmlFiles);

    printSection(
        'Role route constants',
        roleRouteConstants.map(
            ({ role, expectedRoute, discoveredRoute, compatible }) =>
                `${role}: ${discoveredRoute} (${compatible ? 'compatible' : `expected ${expectedRoute}`})`
        )
    );

    printSection(
        'getDashboardRouteForRole mapping',
        routeMappings.map(({ role, found }) => `${role}: ${found ? 'found' : 'needs-review'}`)
    );

    printSection('Auth redirect references', discoverAuthRedirectReferences(authText));

    printSection(
        'Linked local script/style dependencies',
        localLinkedAssets.map(
            ({ htmlFile, type, reference, resolvedPath, exists, moveRisk }) =>
                `${htmlFile} -> ${type} ${reference} (${resolvedPath}; ${exists ? 'found' : 'needs-review'}; ${
                    moveRisk ? 'relative-move-risk' : 'absolute-path'
                })`
        )
    );

    printSection(
        'Linked external script/style dependencies',
        externalLinkedAssets.map(
            ({ htmlFile, type, reference }) => `${htmlFile} -> ${type} ${reference}`
        )
    );

    printSection('apps/dashboard ownership files', appsDashboardFiles);
    printSection('Move-risk notes', moveRiskNotes);

    console.log(
        '\nResult: compatibility audit completed without modifying files or enforcing moves.'
    );
}

try {
    main();
} catch (error) {
    console.error('Dashboard route compatibility audit failed.');
    console.error(error);
    process.exitCode = 1;
}
