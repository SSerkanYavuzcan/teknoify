# Teknoify Demo Lab

Static `/demo/` landing page for the canonical route `https://teknoify.com/demo/`.

The page intentionally contains no demo/project/example data for now. It reuses the main Teknoify site stylesheet as the visual baseline and adds only demo-page-specific layout refinements from `demo/styles/`.

## Current behavior

- `demo/data/demos.js` exposes an empty dataset with `window.TEKNOIFY_DEMOS = [];`.
- The catalog renders a premium empty state instead of demo cards.
- The sandbox renders a safe empty state instead of fake outputs or selected sample projects.
- Category filters stay hidden while there is no demo data.
- No real API calls are made and no local storage is required.

## Architecture

```text
demo/
├── index.html
├── README.md
├── data/
│   └── demos.js
├── scripts/
│   ├── app.js
│   ├── demo-catalog.js
│   └── sandbox-simulator.js
└── styles/
    ├── index.css
    ├── base.css
    ├── layout.css
    ├── components.css
    ├── demos.css
    └── responsive.css
```

## Asset loading

`index.html` loads the shared Teknoify design system first, then the local demo CSS manifest:

```html
<link rel="stylesheet" href="/css/style.css" /> <link rel="stylesheet" href="./styles/index.css" />
```

Local JavaScript is still loaded so the page remains ready for future data-driven demos, but every script handles an empty dataset safely.

## Validation

Recommended checks:

```bash
npx prettier --check demo/index.html demo/README.md demo/data/demos.js demo/scripts/app.js demo/scripts/demo-catalog.js demo/scripts/sandbox-simulator.js demo/styles/index.css demo/styles/base.css demo/styles/layout.css demo/styles/components.css demo/styles/demos.css demo/styles/responsive.css index.html
npx eslint demo/data/demos.js demo/scripts/app.js demo/scripts/demo-catalog.js demo/scripts/sandbox-simulator.js
npm run check
```
