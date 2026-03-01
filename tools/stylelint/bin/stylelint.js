#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

function walk(dir, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, out);
        else if (entry.isFile() && full.endsWith('.css')) out.push(full);
    }
    return out;
}

function hasBalancedBraces(content) {
    let depth = 0;
    for (const ch of content) {
        if (ch === '{') depth++;
        if (ch === '}') depth--;
        if (depth < 0) return false;
    }
    return depth === 0;
}

const files = walk(path.resolve(process.cwd(), 'css'));
let failed = false;
for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    if (!hasBalancedBraces(content)) {
        console.error(`${file}:1:1 Unexpected unmatched brace`);
        failed = true;
    }
}

if (failed) process.exit(2);
process.exit(0);
