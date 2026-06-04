# Product/Funnel Page Mirrors

## 1. Title and purpose

Phase 12D creates domain-owned mirrors for high-risk public product/funnel pages without changing live public routes. The Subscription and AI Assistant pages remain served from `pages/`; the new `domains/products/` mirrors are ownership preparation only.

This phase adds a dedicated product/funnel parity checker so future wrapper or static-hosting work has a clear migration gate before any route, navigation, auth, payment, premium, or product behavior changes are attempted.

## 2. Scope

In scope for Phase 12D:

- Subscription mirror under product ownership.
- AI Assistant mirror under product ownership.
- Product/funnel parity checker.
- Current public route preservation.
- High-risk migration gates for later wrapper/static-hosting work.

Out of scope for Phase 12D:

- Changing public route URLs.
- Changing navigation links.
- Changing page content.
- Changing CSS/JS paths.
- Changing auth behavior.
- Changing payment/subscription/funnel behavior.
- Changing premium gate behavior.
- Changing AI Assistant/product tool behavior.
- Changing deployment/build behavior.
- Deleting or reducing `pages/*.html`.

## 3. Mirror status table

| Product/Funnel Area | Public Source Page        | Domain Mirror                             | Live Route Changed? | Parity Status                     | Risk Level | Notes                                                                                                     |
| ------------------- | ------------------------- | ----------------------------------------- | ------------------- | --------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------- |
| Subscription        | `pages/subscription.html` | `domains/products/subscription/page.html` | No                  | Covered by product/funnel checker | High       | Source ownership mirror only; public source remains `pages/subscription.html`.                            |
| AI Assistant        | `pages/ai-assistant.html` | `domains/products/ai-assistant/page.html` | No                  | Covered by product/funnel checker | High       | Source ownership mirror only; public source remains `pages/ai-assistant.html`; product behavior is gated. |

## 4. Parity requirement

Run the product/funnel parity checker from the repository root:

```bash
node scripts/architecture/check-product-funnel-page-mirrors.js
```

All mirrors must match their public source pages. If parity fails, do not proceed to wrapper or static-hosting changes. Restore the mismatched mirror to match the corresponding `pages/*.html` source, rerun the checker, and keep the public pages as the source of truth until a later wrapper/static-hosting strategy is implemented.

## 5. High-risk behavior inventory

Manual checks are intentionally `Not run` or `needs-review` in Phase 12D because this phase creates mirrors and a parity gate only.

| Page         | Risk Area                                            | What to Verify Before Runtime Move                                                  | Current Status | Notes                                                              |
| ------------ | ---------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------ |
| Subscription | Subscription CTA behavior                            | Verify every plan, upgrade, subscribe, cancel, and contact CTA target and outcome.  | Not run        | Required before any wrapper, route, navigation, or hosting change. |
| Subscription | Subscription auth/access/premium behavior if present | Verify session state, access checks, premium messaging, redirects, and fallbacks.   | needs-review   | Do not combine with wrapper changes.                               |
| Subscription | Subscription payment/funnel behavior if present      | Verify payment handoff, funnel analytics, plan selection, and error states.         | needs-review   | Keep payment/funnel behavior unchanged in mirror phases.           |
| AI Assistant | AI Assistant UI behavior                             | Verify initial rendering, panels, controls, loading states, and empty states.       | Not run        | Required before any wrapper, route, navigation, or hosting change. |
| AI Assistant | AI Assistant form/input behavior if present          | Verify prompts, validation, submit behavior, keyboard behavior, and responses.      | needs-review   | Product tool behavior remains unchanged.                           |
| Both         | Shared JS behavior                                   | Verify shared public scripts load in the same order and expose the same globals.    | needs-review   | Do not alter script paths during mirror-only phases.               |
| Both         | Firebase/session-manager behavior if present         | Verify auth/session initialization, Firebase dependencies, and unauthenticated use. | needs-review   | Keep auth-sensitive behavior out of wrapper-only changes.          |
| Both         | Route bridge behavior                                | Verify route constants and compatibility helpers resolve current public URLs.       | needs-review   | Navigation remains pointed at current public routes.               |
| Both         | CSS ownership                                        | Verify stylesheet order, inherited relative paths, responsive rules, and assets.    | needs-review   | Do not relink CSS until static path strategy is reviewed.          |
| Both         | Mobile layout                                        | Verify mobile navigation, spacing, CTA visibility, forms, and tool interactions.    | Not run        | Must pass before any live route conversion.                        |

## 6. Static hosting warning

Domain mirrors are source ownership mirrors only. They may contain relative paths inherited from public pages, including stylesheet links, script links, assets, anchors, form targets, and shared runtime dependencies.

The mirrors are not expected to work as standalone public routes yet. Do not serve them directly until path strategy, static-hosting behavior, route compatibility, shared runtime loading, auth/payment/product behavior, and smoke-test expectations are reviewed.

## 7. Future wrapper strategy

Future public product/funnel migration should:

- Keep `pages/*.html` as compatibility wrappers while current public URLs remain supported.
- Use domain mirrors as ownership sources only after parity and smoke tests pass.
- Update navigation only after route mapping is proven and rollback behavior is documented.
- Use the product/funnel parity checker before and after wrapper changes to prove the public page and domain source remain compatible.
- Avoid making Subscription and AI Assistant the first wrapper conversions unless page-specific smoke tests are complete.

## 8. Smoke checklist

Initial results are `Not run` because Phase 12D creates mirrors and a parity checker only; it does not make the mirrors live.

| Page         | Desktop Layout | Mobile Layout | Navigation | CTA Buttons | Forms/Inputs | Auth/Premium | Product Behavior | Shared JS | CSS     | Result  | Notes                                                         |
| ------------ | -------------- | ------------- | ---------- | ----------- | ------------ | ------------ | ---------------- | --------- | ------- | ------- | ------------------------------------------------------------- |
| Subscription | Not run        | Not run       | Not run    | Not run     | Not run      | Not run      | Not run          | Not run   | Not run | Not run | Run before any wrapper, route, navigation, or hosting change. |
| AI Assistant | Not run        | Not run       | Not run    | Not run     | Not run      | Not run      | Not run          | Not run   | Not run | Not run | Run before any wrapper, route, navigation, or hosting change. |

## 9. Rollback plan

If a future wrapper, relink, route mapping, navigation update, or static-hosting change fails, restore the affected public page as the live full page in `pages/`. Keep mirrors unused until parity and smoke tests pass again.

Do not delete public pages yet. Do not change payment, auth, subscription, premium, funnel, or product tool behavior together with wrapper changes.

## 10. Relationship to existing docs

- [`public-service-route-compatibility-map.md`](public-service-route-compatibility-map.md)
- [`corporate-service-page-mirrors.md`](corporate-service-page-mirrors.md)
- [`enterprise-migration-closure-audit.md`](enterprise-migration-closure-audit.md)
- [`../../apps/web/README.md`](../../apps/web/README.md)
- [`../../domains/products/README.md`](../../domains/products/README.md)
- [`../../domains/products/subscription/README.md`](../../domains/products/subscription/README.md)
- [`../../domains/products/ai-assistant/README.md`](../../domains/products/ai-assistant/README.md)
