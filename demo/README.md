# Teknoify Demo Lab

Standalone static-first mini-site for `https://teknoify.com/demo/`.

Teknoify Demo Lab is a polished demo platform where visitors can explore free automation demos, filter categories, select a demo in a sandbox, run simulated workflows, preview example outputs, and request a custom automation scenario.

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

## Data-driven demos

Demo cards are rendered from `window.TEKNOIFY_DEMOS` in `data/demos.js`. The catalog supports category filtering and connects each card action to the sandbox.

## Static sandbox behavior

All sandbox behavior is simulated in the browser by `scripts/sandbox-simulator.js`:

- No real API calls are made.
- “Demoyu Çalıştır” uses a lightweight timeout-based progress simulation.
- Output renderers are static previews for tables, scorecards, chat, before/after tables, checklists, signals, timelines, notifications, and AI summaries.

## Asset loading

`index.html` loads the local demo CSS manifest and local JavaScript files:

```html
<link rel="stylesheet" href="./styles/index.css" />

<script src="./data/demos.js" defer></script>
<script src="./scripts/demo-catalog.js" defer></script>
<script src="./scripts/sandbox-simulator.js" defer></script>
<script src="./scripts/app.js" defer></script>
```

Shared fonts and Font Awesome follow the current Teknoify site convention.

## Validation

Recommended checks:

```bash
npx prettier --check demo/index.html demo/README.md demo/data/demos.js demo/scripts/app.js demo/scripts/demo-catalog.js demo/scripts/sandbox-simulator.js demo/styles/index.css demo/styles/base.css demo/styles/layout.css demo/styles/components.css demo/styles/demos.css demo/styles/responsive.css
npx eslint demo/data/demos.js demo/scripts/app.js demo/scripts/demo-catalog.js demo/scripts/sandbox-simulator.js
npm run check
```
