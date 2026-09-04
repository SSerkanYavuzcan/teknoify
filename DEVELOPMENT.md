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

## Public artifact

Production publishes the verified `dist/` artifact, not the repository root:

```bash
npm run check:public
```

This builds `dist/` from the allow-list in `scripts/public-artifact/manifest.json` and verifies it (no repository internals, no browser-side authentication, required Netlify files present). Run it before opening a PR. See `docs/marketing-rebuild/` for the boundary, cutover and legacy-cleanup records.
