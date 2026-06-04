#!/usr/bin/env node

const childProcess = require('node:child_process');

const repoRoot = process.cwd();

const checkGroups = [
    {
        title: 'Enterprise architecture checks',
        checks: [
            {
                label: 'Architecture readiness',
                command: ['npm', 'run', 'check:architecture']
            }
        ]
    },
    {
        title: 'Investment runtime checks',
        checks: [
            {
                label: 'Investment runtime readiness',
                command: ['npm', 'run', 'check:investment-runtime']
            }
        ]
    },
    {
        title: 'Public mirror checks',
        checks: [
            {
                label: 'Public mirror readiness',
                command: ['npm', 'run', 'check:public-mirrors']
            }
        ]
    },
    {
        title: 'Dashboard route checks',
        checks: [
            {
                label: 'Dashboard route readiness',
                command: ['npm', 'run', 'check:dashboard-routes']
            }
        ]
    },
    {
        title: 'RPA first-candidate checks',
        checks: [
            {
                label: 'RPA page mirror parity',
                command: ['node', 'scripts/architecture/check-rpa-page-mirror-parity.js']
            },
            {
                label: 'RPA page mirror sync dry-run',
                command: ['node', 'scripts/architecture/sync-rpa-page-mirror.js']
            }
        ]
    }
];

function printGroup(title) {
    console.log('\n' + '='.repeat(title.length));
    console.log(title);
    console.log('='.repeat(title.length));
}

function runCheck(check) {
    console.log(`\n$ ${check.command.join(' ')}`);

    const result = childProcess.spawnSync(check.command[0], check.command.slice(1), {
        cwd: repoRoot,
        encoding: 'utf8',
        shell: process.platform === 'win32'
    });

    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);

    if (result.error) {
        console.error(`${check.label} failed to start: ${result.error.message}`);
        return false;
    }

    if (result.status !== 0) {
        console.error(`${check.label} failed with exit code ${result.status}.`);
        return false;
    }

    console.log(`${check.label} passed.`);
    return true;
}

function main() {
    let allChecksPassed = true;

    checkGroups.forEach((group) => {
        printGroup(group.title);

        group.checks.forEach((check) => {
            if (!runCheck(check)) {
                allChecksPassed = false;
            }
        });
    });

    if (!allChecksPassed) {
        console.error('\nEnterprise readiness seal check failed.');
        process.exitCode = 1;
        return;
    }

    console.log('\nEnterprise readiness seal check passed.');
}

main();
