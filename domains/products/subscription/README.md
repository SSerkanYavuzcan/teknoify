# Subscription Product/Funnel Mirror

## Purpose

Future ownership area for the Subscription public product/funnel page.

## Phase 12D status

- `page.html` is an exact mirror of `pages/subscription.html`.
- The mirror is not a live public route.
- The current public source of truth remains `pages/subscription.html`.
- No public routing, navigation, CSS/JS path, auth, payment, premium, subscription, or funnel behavior has moved.

## Migration gate

Run the product/funnel parity checker before any wrapper, route, navigation, hosting, or runtime change:

```bash
node scripts/architecture/check-product-funnel-page-mirrors.js
```

Auth, payment, premium access, subscription, and funnel behavior must not change without separate manual smoke tests and rollback coverage.
