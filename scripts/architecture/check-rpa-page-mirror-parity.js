#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const publicPagePath = 'pages/rpa.html';
const mirrorPagePath = 'domains/corporate-automation/rpa/page.html';

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

function printMismatchDiagnostics(publicContent, mirrorContent) {
    const difference = findFirstDifferingLine(publicContent, mirrorContent);

    console.error('RPA page mirror parity check failed.');
    console.error(`Expected ${mirrorPagePath} to match ${publicPagePath}.`);
    console.error('Do not proceed to wrapper or static-hosting changes until parity is restored.');

    if (difference) {
        console.error(`First differing line: ${difference.lineNumber}`);
        console.error(
            `${publicPagePath}: ${difference.publicLine === undefined ? '<missing line>' : difference.publicLine}`
        );
        console.error(
            `${mirrorPagePath}: ${difference.mirrorLine === undefined ? '<missing line>' : difference.mirrorLine}`
        );
    }
}

function main() {
    try {
        const publicContent = readNormalizedFile(publicPagePath);
        const mirrorContent = readNormalizedFile(mirrorPagePath);

        if (publicContent !== mirrorContent) {
            printMismatchDiagnostics(publicContent, mirrorContent);
            process.exitCode = 1;
            return;
        }

        console.log(
            `RPA page mirror parity check passed: ${mirrorPagePath} matches ${publicPagePath}.`
        );
    } catch (error) {
        console.error('RPA page mirror parity check failed due to a runtime error.');
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    }
}

main();
