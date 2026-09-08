# demo.teknoify.com — retired destination

`demo/` is still the publish directory of the separate Netlify site that serves `demo.teknoify.com` (`demo/netlify.toml`, Package directory `demo`, no build). Since 2026-09-08 it no longer hosts the Demo Lab: it publishes one branded "wrong place" page.

- `index.html`: the single screen. The message is `Güzel deneme ama sanırım yanlış geldin.`, a restrained supporting line, and one link back to `https://teknoify.com/`. `noindex`. No navigation, no CTA and no link points at `demo.teknoify.com` itself.
- `styles/shell.css`, `scripts/shell/{scroll,field,shell}.js`: GENERATED copies of the shared design system and the purple field renderer (`scripts/shell/sync-shell.mjs`). Never edit them here.
- `styles/index.css`: the page's own composition on top of the shared system.
- `images/`: favicon and logo assets for the isolated deploy.

The marketing site no longer links to the demo (header, footers, homepage lists, sitemap). The same page is still reachable at `https://teknoify.com/demo/` because the marketing artifact publishes `demo/` (doc 05); it carries `noindex` there too. The former demo application (catalog, sandbox, comparison exports) was removed in doc 19; the comparison idea now lives inside the Web Scraping page.
