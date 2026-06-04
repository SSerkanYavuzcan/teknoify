#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const publicPagePath = 'pages/rpa.html';
const mirrorPagePath = 'domains/corporate-automation/rpa/page.html';
const validFlags = new Set(['--from-public', '--from-domain', '--write']);

function normalizeContent(content) {
    return content
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map((line) => line.replace(/[ \t]+$/u, ''))
        .join('\n');
}

function toAbsolutePath(relativePath) {
    return path.join(process.cwd(), relativePath);
}

function readFile(relativePath) {
    return fs.readFileSync(toAbsolutePath(relativePath), 'utf8');
}

function readNormalizedFile(relativePath) {
    return normalizeContent(readFile(relativePath));
}

function findFirstDifferingLine(leftContent, rightContent) {
    const leftLines = leftContent.split('\n');
    const rightLines = rightContent.split('\n');
    const maxLines = Math.max(leftLines.length, rightLines.length);

    for (let index = 0; index < maxLines; index += 1) {
        if (leftLines[index] !== rightLines[index]) {
            return {
                lineNumber: index + 1,
                publicLine: leftLines[index],
                mirrorLine: rightLines[index]
            };
        }
    }

    return null;
}

function parseArguments(args) {
    const unknownFlags = args.filter((arg) => !validFlags.has(arg));
    const fromPublic = args.includes('--from-public');
    const fromDomain = args.includes('--from-domain');
    const write = args.includes('--write');
    const directionCount = Number(fromPublic) + Number(fromDomain);

    return {
        unknownFlags,
        fromPublic,
        fromDomain,
        write,
        directionCount
    };
}

function printUsage() {
    console.error(
        'Usage: node scripts/architecture/sync-rpa-page-mirror.js [--from-public|--from-domain] [--write]'
    );
    console.error('Default mode is dry-run/status only and never modifies files.');
}

function printStatus(publicContent, mirrorContent) {
    const isInParity = publicContent === mirrorContent;

    console.log('RPA page mirror sync status');
    console.log(`  - Parity: ${isInParity ? 'passed' : 'failed'}`);
    console.log(`  - Live served source today: ${publicPagePath}`);
    console.log(`  - Domain ownership mirror: ${mirrorPagePath}`);
    console.log('  - Current policy: domain mirror is not live; public route remains in pages/.');

    if (!isInParity) {
        const difference = findFirstDifferingLine(publicContent, mirrorContent);

        console.log('  - First normalized difference:');
        if (difference) {
            console.log(`    - Line: ${difference.lineNumber}`);
            console.log(
                `    - ${publicPagePath}: ${difference.publicLine === undefined ? '<missing line>' : difference.publicLine}`
            );
            console.log(
                `    - ${mirrorPagePath}: ${difference.mirrorLine === undefined ? '<missing line>' : difference.mirrorLine}`
            );
        } else {
            console.log('    - No line-level difference found.');
        }
    }
}

function printDirectionPlan(options) {
    console.log('  - Available sync directions:');
    console.log(`    - --from-public: ${publicPagePath} would be copied to ${mirrorPagePath}.`);
    console.log(`    - --from-domain: ${mirrorPagePath} would be copied to ${publicPagePath}.`);

    if (options.directionCount === 0) {
        console.log('  - Requested sync direction: none; reporting parity/status only.');
        console.log('  - Dry-run action: no file would be copied.');
        return;
    }

    if (options.fromPublic) {
        console.log('  - Requested sync direction: public route → domain mirror.');
        console.log(
            `  - Dry-run copy plan: ${publicPagePath} would be copied to ${mirrorPagePath}.`
        );
        return;
    }

    console.log('  - Requested sync direction: domain mirror → public route.');
    console.log(`  - Dry-run copy plan: ${mirrorPagePath} would be copied to ${publicPagePath}.`);
}

function validateArguments(options) {
    if (options.unknownFlags.length > 0) {
        console.error(`Unknown flag(s): ${options.unknownFlags.join(', ')}`);
        printUsage();
        return false;
    }

    if (options.directionCount > 1) {
        console.error('Choose exactly one direction flag at most: --from-public or --from-domain.');
        printUsage();
        return false;
    }

    if (options.write && options.directionCount !== 1) {
        console.error(
            '--write requires exactly one direction flag: --from-public or --from-domain.'
        );
        printUsage();
        return false;
    }

    return true;
}

function assertRequiredFilesExist() {
    [publicPagePath, mirrorPagePath].forEach((relativePath) => {
        if (!fs.existsSync(toAbsolutePath(relativePath))) {
            throw new Error(`Required file is missing: ${relativePath}`);
        }
    });
}

function copySelectedDirection(options) {
    const sourcePath = options.fromPublic ? publicPagePath : mirrorPagePath;
    const destinationPath = options.fromPublic ? mirrorPagePath : publicPagePath;

    console.warn('WARNING: --write was requested. This will modify an RPA page mirror file pair.');
    console.warn(
        'WARNING: Use write mode only in a dedicated, reviewed PR with parity and smoke gates.'
    );
    console.warn(`Copying ${sourcePath} to ${destinationPath}.`);

    fs.copyFileSync(toAbsolutePath(sourcePath), toAbsolutePath(destinationPath));
}

function assertParityAfterWrite() {
    const publicContent = readNormalizedFile(publicPagePath);
    const mirrorContent = readNormalizedFile(mirrorPagePath);

    if (publicContent !== mirrorContent) {
        throw new Error('Parity check failed after write.');
    }

    console.log(`Post-write parity check passed: ${mirrorPagePath} matches ${publicPagePath}.`);
}

function main() {
    const options = parseArguments(process.argv.slice(2));

    try {
        if (!validateArguments(options)) {
            process.exitCode = 1;
            return;
        }

        assertRequiredFilesExist();

        const publicContent = readNormalizedFile(publicPagePath);
        const mirrorContent = readNormalizedFile(mirrorPagePath);

        printStatus(publicContent, mirrorContent);
        printDirectionPlan(options);

        if (!options.write) {
            console.log('  - Mode: dry-run; no files were modified.');
            return;
        }

        copySelectedDirection(options);
        assertParityAfterWrite();
    } catch (error) {
        console.error('RPA page mirror sync failed.');
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    }
}

main();
