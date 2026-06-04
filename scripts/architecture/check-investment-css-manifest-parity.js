#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();

const manifests = [
    {
        label: 'Public manifest',
        path: 'css/investment-analytics.css'
    },
    {
        label: 'Domain manifest',
        path: 'domains/investment-intelligence/analytics/styles/index.css'
    }
];

function toRepoRelativePath(absolutePath) {
    return path.relative(repoRoot, absolutePath).split(path.sep).join('/');
}

function stripCssComments(cssContent) {
    return cssContent.replace(/\/\*[\s\S]*?\*\//g, '');
}

function extractImports(manifest) {
    const absoluteManifestPath = path.resolve(repoRoot, manifest.path);
    const manifestDirectory = path.dirname(absoluteManifestPath);
    const cssContent = fs.readFileSync(absoluteManifestPath, 'utf8');
    const contentWithoutComments = stripCssComments(cssContent);
    const importPattern =
        /@import\s+(?:url\(\s*)?(?:"([^"]+)"|'([^']+)'|([^'")\s;]+))\s*\)?[^;]*;/g;
    const imports = [];
    let match;

    while ((match = importPattern.exec(contentWithoutComments)) !== null) {
        const importPath = match[1] || match[2] || match[3];
        const resolvedPath = path.resolve(manifestDirectory, importPath);

        imports.push({
            source: importPath,
            normalizedPath: toRepoRelativePath(resolvedPath),
            exists: fs.existsSync(resolvedPath)
        });
    }

    const nonImportContent = contentWithoutComments.replace(importPattern, '').trim();

    return {
        ...manifest,
        imports,
        nonImportContent
    };
}

function formatImportList(label, imports) {
    const lines = [`${label}:`];

    if (imports.length === 0) {
        lines.push('  (no imports found)');
        return lines.join('\n');
    }

    imports.forEach((importItem, index) => {
        const existenceLabel = importItem.exists ? 'exists' : 'missing';
        lines.push(`  ${index + 1}. ${importItem.normalizedPath} (${existenceLabel})`);
    });

    return lines.join('\n');
}

function compareManifests(publicManifest, domainManifest) {
    const failures = [];

    if (publicManifest.imports.length !== domainManifest.imports.length) {
        failures.push(
            `Import count mismatch: public manifest has ${publicManifest.imports.length}, ` +
                `domain manifest has ${domainManifest.imports.length}.`
        );
    }

    const maxImportCount = Math.max(publicManifest.imports.length, domainManifest.imports.length);

    for (let index = 0; index < maxImportCount; index += 1) {
        const publicImport = publicManifest.imports[index];
        const domainImport = domainManifest.imports[index];

        if (!publicImport || !domainImport) {
            continue;
        }

        if (publicImport.normalizedPath !== domainImport.normalizedPath) {
            failures.push(
                `Import ${index + 1} target mismatch: public manifest resolves to ` +
                    `${publicImport.normalizedPath}, domain manifest resolves to ` +
                    `${domainImport.normalizedPath}.`
            );
        }
    }

    manifestsWithMissingImports([publicManifest, domainManifest]).forEach(
        ({ label, missingImports }) => {
            const missingPaths = missingImports
                .map((importItem) => importItem.normalizedPath)
                .join(', ');
            failures.push(`${label} imports missing files: ${missingPaths}.`);
        }
    );

    if (domainManifest.nonImportContent.length > 0) {
        failures.push(
            'Domain manifest contains non-import CSS content. Keep it import-only until relinking is reviewed.'
        );
    }

    return failures;
}

function manifestsWithMissingImports(manifestResults) {
    return manifestResults
        .map((manifest) => ({
            label: manifest.label,
            missingImports: manifest.imports.filter((importItem) => !importItem.exists)
        }))
        .filter((manifest) => manifest.missingImports.length > 0);
}

function main() {
    const [publicManifest, domainManifest] = manifests.map(extractImports);
    const failures = compareManifests(publicManifest, domainManifest);

    if (failures.length === 0) {
        console.log(
            'Investment Analytics CSS manifest parity check passed: import count, order, ' +
                'normalized target paths, and imported file existence match.'
        );
        process.exit(0);
    }

    console.error('Investment Analytics CSS manifest parity check failed.');
    console.error(
        'Action required: keep page stylesheet links unchanged until these issues are resolved.'
    );
    failures.forEach((failure) => {
        console.error(`- ${failure}`);
    });
    console.error('');
    console.error(formatImportList(publicManifest.label, publicManifest.imports));
    console.error('');
    console.error(formatImportList(domainManifest.label, domainManifest.imports));
    process.exit(1);
}

main();
