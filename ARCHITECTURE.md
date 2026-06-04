# ARCHITECTURE

This root document is a lightweight entrypoint for architecture documentation.

## Current direction

The current architectural direction is the domain-based platform structure documented in:

- [`docs/architecture/current-inventory.md`](docs/architecture/current-inventory.md)
- [`docs/architecture/folder-structure.md`](docs/architecture/folder-structure.md)
- [`docs/decisions/ADR-0001-domain-based-structure.md`](docs/decisions/ADR-0001-domain-based-structure.md)

## Historical context

Older static MPA notes remain useful historical context for understanding the existing site shape, but they are no longer the primary target architecture.

## Migration status

Runtime files have not been moved yet. The current phase only reorganizes documentation into the `docs/` subfolder structure created during the domain-based architecture refactor.
Phase 10A closes the current enterprise migration preparation cycle with the governance-only [`docs/architecture/enterprise-migration-closure-audit.md`](docs/architecture/enterprise-migration-closure-audit.md), which defines the readiness checker, final smoke-test gate, archive gate, and next runtime migration sequence.
Phase 14A adds the final all-checkers migration readiness entrypoint in [`docs/architecture/final-migration-readiness-report.md`](docs/architecture/final-migration-readiness-report.md), covering current completion state, no-go areas, smoke gates, and runtime move criteria.
Phase 14B adds the final developer migration runbook at [`docs/architecture/final-migration-runbook.md`](docs/architecture/final-migration-runbook.md). Run `npm run check:architecture` before future architecture-governed runtime migration, wrapper, data/RAG, or cleanup work.

