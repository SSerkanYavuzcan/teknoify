# RPA Page Mirror Sync Workflow

## 1. Title and purpose

Phase 15A defines a safe, dry-run-first sync workflow for the RPA public page and its domain ownership mirror.

The workflow exists to let maintainers inspect parity and understand a proposed copy direction before any file is modified. It does not promote the domain mirror, does not change public page content, does not change mirrored page content, and does not change runtime routing behavior.

## 2. Current policy

- `pages/rpa.html` remains the live served public route.
- `domains/corporate-automation/rpa/page.html` remains the ownership mirror.
- The domain mirror is not live.
- Phase 15A makes no route, navigation, static-hosting, wrapper, CSS, JavaScript, or content behavior changes.

## 3. Sync script

Run the status-only dry run from the repository root:

```bash
node scripts/architecture/sync-rpa-page-mirror.js
```

Dry-run direction examples:

```bash
node scripts/architecture/sync-rpa-page-mirror.js --from-public
node scripts/architecture/sync-rpa-page-mirror.js --from-domain
```

Future/manual-only write examples:

```bash
node scripts/architecture/sync-rpa-page-mirror.js --from-public --write
node scripts/architecture/sync-rpa-page-mirror.js --from-domain --write
```

Write mode must not be used casually. It should only be used in a dedicated PR after the dry-run output is understood, the affected direction is approved, parity gates are planned, and page smoke testing is ready.

The default mode is dry-run/status only and never modifies files. If neither direction flag is provided, the script reports current parity and source/mirror ownership status only.

## 4. Direction policy

| Direction                    | Meaning                                                                | When Allowed                                                                                    | Risk                                                                   | Notes                                                                                                 |
| ---------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Public → domain mirror       | Copy `pages/rpa.html` to `domains/corporate-automation/rpa/page.html`. | Safer while `pages/rpa.html` remains the served source and the mirror is ownership preparation. | Lower risk because the live public route is not the destination.       | Use when the live page is intentionally treated as the source of truth and the mirror needs catch-up. |
| Domain mirror → public route | Copy `domains/corporate-automation/rpa/page.html` to `pages/rpa.html`. | Only in a dedicated content/runtime-impacting PR with explicit review and smoke coverage.       | Higher risk because the destination is the live served public content. | Requires visual smoke testing, navigation/CTA smoke, console review, and rollback readiness.          |

Public → domain mirror is the safer direction while the public page remains the served source. Domain mirror → public route is a runtime-impacting content update and requires visual smoke testing.

## 5. Go / no-go

### Go

- Parity checker passes or any mismatch has a clear, reviewed explanation before write mode is considered.
- Dry-run output is understood.
- Affected page smoke test is planned.
- Only the RPA page pair is involved.

### No-go

- Unrelated files are staged.
- Parity mismatch is unexplained.
- Navigation changes are mixed in.
- Domain mirror is served directly.
- Public route changed unintentionally.

## 6. Relationship to existing docs

- [`rpa-page-domain-mirror.md`](rpa-page-domain-mirror.md)
- [`public-page-mirror-source-policy.md`](public-page-mirror-source-policy.md)
- [`public-page-wrapper-strategy.md`](public-page-wrapper-strategy.md)
- [`corporate-service-page-mirrors.md`](corporate-service-page-mirrors.md)
- [`final-migration-runbook.md`](final-migration-runbook.md)
- [`../../domains/corporate-automation/rpa/README.md`](../../domains/corporate-automation/rpa/README.md)
