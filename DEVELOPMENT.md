# DEVELOPMENT

Detailed local development and deployment guidance now lives in [`docs/deployment/local-development.md`](docs/deployment/local-development.md).

## Quick commands

```bash
npm install
npm run format
npm run format:check
npm run lint:js
npm run lint:css
npm run check
```

## Notes

- The project currently runs as a static multi-page application.
- Use a local static server, such as VS Code Live Server, during development.
- Run `npm run check` before opening a PR.

## Architecture checks

Run these developer-facing architecture checks when working on migration readiness, public mirrors, or Dashboard route compatibility:

```bash
npm run check:architecture
npm run check:public-mirrors
npm run check:dashboard-routes
```

The final migration runbook and Phase 15B scorecard define the architecture migration gates for future runtime, wrapper, data/RAG, and archive cleanup PRs. Review [`docs/architecture/final-migration-runbook.md`](docs/architecture/final-migration-runbook.md) and [`docs/architecture/final-architecture-scorecard.md`](docs/architecture/final-architecture-scorecard.md) before architecture-governed migration work.
