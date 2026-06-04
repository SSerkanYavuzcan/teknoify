# Corporate Service Page Mirrors

## 1. Title and purpose

Phase 12C creates domain-owned mirrors for the remaining lower-risk Corporate Automation public service pages without changing live public routes. The mirrors prepare future source ownership under `domains/corporate-automation/` while the current public routes and source pages stay in `pages/`.

This phase does not change navigation, CSS/JS paths, page content, deployment behavior, or runtime route ownership.

## 2. Scope

In scope:

- RPA mirror from Phase 12B.
- Web scraping mirror.
- API automation mirror.
- Training/consulting mirror.
- Combined corporate service mirror parity checker.
- Public route preservation for all mirrored pages.

Out of scope:

- Subscription page mirror.
- AI assistant page mirror.
- Changing public route URLs.
- Changing navigation links.
- Changing page content.
- Changing CSS/JS paths.
- Changing deployment/build behavior.
- Deleting or reducing `pages/*.html`.

## 3. Mirror status table

| Service Area        | Public Source Page               | Domain Mirror                                                | Live Route Changed? | Parity Status               | Notes                                                                                 |
| ------------------- | -------------------------------- | ------------------------------------------------------------ | ------------------- | --------------------------- | ------------------------------------------------------------------------------------- |
| RPA                 | `pages/rpa.html`                 | `domains/corporate-automation/rpa/page.html`                 | No                  | Covered by combined checker | Created in Phase 12B; included in the Phase 12C mirror group.                         |
| Web scraping        | `pages/webscraping.html`         | `domains/corporate-automation/web-scraping/page.html`        | No                  | Covered by combined checker | Source ownership mirror only; public source remains `pages/webscraping.html`.         |
| API automation      | `pages/api.html`                 | `domains/corporate-automation/api-automation/page.html`      | No                  | Covered by combined checker | Source ownership mirror only; public source remains `pages/api.html`.                 |
| Training/consulting | `pages/training-consulting.html` | `domains/corporate-automation/training-consulting/page.html` | No                  | Covered by combined checker | Source ownership mirror only; public source remains `pages/training-consulting.html`. |

## 4. Parity requirement

Run the combined parity checker from the repository root:

```bash id="3yjjqz"
node scripts/architecture/check-corporate-service-page-mirrors.js
```

All mirrors must match their public source pages. If parity fails, do not proceed to wrapper or static-hosting changes. Restore the mismatched mirror to match the corresponding `pages/*.html` source, rerun the checker, and keep public pages as the source of truth until a later wrapper/static-hosting strategy is implemented.

## 5. Static hosting warning

Domain mirrors are source ownership mirrors only. They may contain relative paths inherited from the current public pages, including stylesheet links, script links, form targets, anchors, and shared assets.

The mirrors are not expected to work as standalone public routes yet. Do not serve them directly until the path strategy, static-hosting behavior, route compatibility, and smoke-test expectations are reviewed.

## 6. Future wrapper strategy

Future public route migration should:

- Keep `pages/*.html` as compatibility wrappers while the legacy public URLs remain supported.
- Use domain mirrors as ownership sources only after parity and smoke tests pass.
- Update navigation only after route mapping is proven and rollback behavior is documented.
- Use the combined parity checker before and after wrapper changes to prove the public page and domain source remain compatible.

## 7. Smoke checklist

Initial results are `Not run` because Phase 12C creates mirrors and a parity checker only; it does not make the mirrors live.

| Service Area        | Desktop Layout | Mobile Layout | Navigation | CTA Buttons | Forms/Contact | Shared JS | CSS     | Result  | Notes                                                    |
| ------------------- | -------------- | ------------- | ---------- | ----------- | ------------- | --------- | ------- | ------- | -------------------------------------------------------- |
| RPA                 | Not run        | Not run       | Not run    | Not run     | Not run       | Not run   | Not run | Not run | Run before any wrapper, route, or static-hosting change. |
| Web scraping        | Not run        | Not run       | Not run    | Not run     | Not run       | Not run   | Not run | Not run | Run before any wrapper, route, or static-hosting change. |
| API automation      | Not run        | Not run       | Not run    | Not run     | Not run       | Not run   | Not run | Not run | Run before any wrapper, route, or static-hosting change. |
| Training/consulting | Not run        | Not run       | Not run    | Not run     | Not run       | Not run   | Not run | Not run | Run before any wrapper, route, or static-hosting change. |

## 8. Rollback plan

If a future wrapper, route relink, navigation relink, or static-hosting mapping fails, restore the affected public page as the live full page in `pages/`. Keep mirrors unused until parity and smoke tests pass again.

Do not delete public pages yet. The current `pages/*.html` files remain the stable rollback targets until a later compatibility strategy explicitly replaces them.

## 9. Explicitly deferred pages

`pages/subscription.html` is deferred because it may involve product, access, payment, and funnel concerns.

`pages/ai-assistant.html` is deferred because it may involve product tool behavior.

Both pages need separate mirrors and migration plans before any public route or domain ownership change.

## 10. Relationship to existing docs

- [`rpa-page-domain-mirror.md`](rpa-page-domain-mirror.md)
- [`public-service-route-compatibility-map.md`](public-service-route-compatibility-map.md)
- [`dashboard-corporate-automation-migration-audit.md`](dashboard-corporate-automation-migration-audit.md)
- [`enterprise-migration-closure-audit.md`](enterprise-migration-closure-audit.md)
- [`../../domains/corporate-automation/rpa/README.md`](../../domains/corporate-automation/rpa/README.md)
- [`../../domains/corporate-automation/web-scraping/README.md`](../../domains/corporate-automation/web-scraping/README.md)
- [`../../domains/corporate-automation/api-automation/README.md`](../../domains/corporate-automation/api-automation/README.md)
- [`../../domains/corporate-automation/training-consulting/README.md`](../../domains/corporate-automation/training-consulting/README.md)
- [`../../domains/corporate-automation/README.md`](../../domains/corporate-automation/README.md)
- [`../../apps/web/README.md`](../../apps/web/README.md)

## Phase 12D product/funnel separation note

Subscription and AI Assistant are handled in the separate product/funnel mirror document, not in the Corporate Automation service mirror scope. Their mirrors live under `domains/products/`, public routes remain in `pages/`, and their high-risk auth/payment/product-tool migration gates are tracked by `docs/architecture/product-funnel-page-mirrors.md`.

## Phase 13A wrapper readiness strategy note

Phase 13A covers this mirror group with the public page wrapper readiness strategy and the combined readiness checker at `scripts/architecture/check-public-page-wrapper-readiness.js`. The mirrors remain source ownership preparation only; no public route, navigation, CSS/JS path, or runtime behavior changes in this phase.
