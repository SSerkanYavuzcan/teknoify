# AI Assistant Product Tool Mirror

## Purpose

Future ownership area for the AI Assistant public product/tool page.

## Phase 12D status

- `page.html` is an exact mirror of `pages/ai-assistant.html`.
- The mirror is not a live public route.
- The current public source of truth remains `pages/ai-assistant.html`.
- No public routing, navigation, CSS/JS path, shared runtime, Firebase/session, or product tool behavior has moved.

## Migration gate

Run the product/funnel parity checker before any wrapper, route, navigation, hosting, or runtime change:

```bash
node scripts/architecture/check-product-funnel-page-mirrors.js
```

AI Assistant product tool behavior must not change without separate manual smoke tests and rollback coverage.
