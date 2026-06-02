# Local Development

## Requirements

- Node.js 18+
- npm 9+
- Use npm-based commands (`npm run ...`) for cross-platform consistency.

## Installation

```bash
npm install
```

## Code quality commands

```bash
npm run format
npm run format:check
npm run lint:js
npm run lint:css
npm run check
```

Run `npm run check` before opening a PR because it combines the repository's required formatting and lint checks.

## Local development

Teknoify currently runs as a static multi-page application. HTML files can be served directly, but using a local static server is recommended during development, for example VS Code Live Server.

## Deployment notes

- Preserve the current route and filename structure.
- Root pages such as `index.html` and `reset-password.html` are deployed directly.
- Nested page folders such as `pages/*` and `dashboard/*` are deployed as static routes.
- Do not change public routes as part of documentation or architecture migration work.

## Maintenance rules

- Do not add new CSS directly to `css/style.css`; add it to the relevant CSS layer file instead.
- Run lint and format checks before committing.
- Keep documentation migrations separate from runtime refactors.
- Do not move runtime files until the relevant architecture phase explicitly calls for it.
