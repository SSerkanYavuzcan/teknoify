# Products Domain

## Purpose

Future ownership area for public product, access, subscription, and funnel pages after route preservation, parity checks, and smoke tests are proven.

## Phase 12D status

- `subscription/` owns the high-risk Subscription product/funnel mirror for future migration planning.
- `ai-assistant/` owns the high-risk AI Assistant product/tool mirror for future migration planning.
- Current live public routes remain in `pages/`.
- No runtime behavior, public route, navigation link, CSS path, JavaScript path, auth flow, payment flow, premium gate, subscription behavior, or product tool behavior has moved yet.

## Migration gate

The product/funnel mirrors are source ownership preparation only. Run the product/funnel mirror parity checker before any wrapper, route, navigation, hosting, or runtime move:

```bash
node scripts/architecture/check-product-funnel-page-mirrors.js
```

Do not serve these mirrors directly or reduce the corresponding `pages/*.html` files until parity and page-specific smoke tests pass.
