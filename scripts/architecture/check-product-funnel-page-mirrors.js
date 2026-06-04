#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const mirrorPairs = [
    {
        productArea: 'Subscription',
        publicPagePath: 'pages/subscription.html',
        mirrorPagePath: 'domains/products/subscription/page.html'
    },
    {
        productArea: 'AI Assistant',
        publicPagePath: 'pages/ai-assistant.html',
        mirrorPagePath: 'domains/products/ai-assistant/page.html'
    }
];

function normalizeContent(content) {
    return content
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map((line) => line.replace(/[ \t]+$/u, ''))
        .join('\n');
}

function readNormalizedFile(relativePath) {
    const absolutePath = path.join(process.cwd(), relativePath);
    const content = fs.readFileSync(absolutePath, 'utf8');

    return normalizeContent(content);
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

function printMismatchDiagnostics(pair, publicContent, mirrorContent) {
    const difference = findFirstDifferingLine(publicContent, mirrorContent);

    console.error(`${pair.productArea} page mirror parity check failed.`);
    console.error(`Expected ${pair.mirrorPagePath} to match ${pair.publicPagePath}.`);
    console.error(
        'Do not proceed to wrapper, route, or static-hosting changes until parity is restored.'
    );

    if (difference) {
        console.error(`First differing line: ${difference.lineNumber}`);
        console.error(
            `${pair.publicPagePath}: ${difference.publicLine === undefined ? '<missing line>' : difference.publicLine}`
        );
        console.error(
            `${pair.mirrorPagePath}: ${difference.mirrorLine === undefined ? '<missing line>' : difference.mirrorLine}`
        );
    }
}

function checkMirrorPair(pair) {
    const publicContent = readNormalizedFile(pair.publicPagePath);
    const mirrorContent = readNormalizedFile(pair.mirrorPagePath);

    if (publicContent !== mirrorContent) {
        printMismatchDiagnostics(pair, publicContent, mirrorContent);
        return false;
    }

    console.log(
        `${pair.productArea} page mirror parity check passed: ${pair.mirrorPagePath} matches ${pair.publicPagePath}.`
    );
    return true;
}

function main() {
    try {
        const results = mirrorPairs.map((pair) => checkMirrorPair(pair));
        const allMirrorsMatch = results.every(Boolean);

        if (!allMirrorsMatch) {
            process.exitCode = 1;
        }
    } catch (error) {
        console.error('Product/funnel page mirror parity check failed due to a runtime error.');
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    }
}

main();
