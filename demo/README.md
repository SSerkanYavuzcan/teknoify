# Teknoify Demo Lab

Static `/demo/` landing page for the canonical route `https://teknoify.com/demo/`.

The page reuses the main Teknoify site stylesheet as the visual baseline and adds only demo-page-specific layout refinements from `demo/styles/`. Demo content is data-driven through `demo/data/demos.js`.

## Current behavior

- `demo/data/demos.js` exposes one static demo in `window.TEKNOIFY_DEMOS`: **Web Scraping Fiyat Karşılaştırma**.
- The catalog renders the Web Scraping demo card and category filters from the data array.
- The sandbox defaults to the first demo and can render its static retail comparison table output.
- Empty catalog states only appear when there is no demo data or a selected category has zero matching demos.
- No real scraping, API calls, local storage, or authentication flow is required.

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

Local JavaScript initializes the catalog and sandbox from `window.TEKNOIFY_DEMOS`, while every script still handles an empty dataset safely.

## Validation

Recommended checks:

```bash
npx prettier --check demo/index.html demo/README.md demo/data/demos.js demo/scripts/app.js demo/scripts/demo-catalog.js demo/scripts/sandbox-simulator.js demo/styles/index.css demo/styles/base.css demo/styles/layout.css demo/styles/components.css demo/styles/demos.css demo/styles/responsive.css index.html
npx eslint demo/data/demos.js demo/scripts/app.js demo/scripts/demo-catalog.js demo/scripts/sandbox-simulator.js
npm run check
```
