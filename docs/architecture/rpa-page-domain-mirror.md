# RPA Page Domain Mirror

## 1. Title and purpose

Phase 12B creates a domain-owned mirror of the RPA public service page without changing the live public route. The live RPA public page remains `pages/rpa.html`; the new mirror at `domains/corporate-automation/rpa/page.html` prepares future domain ownership only.

This phase does not move runtime ownership, change navigation, update shared assets, or alter page behavior.

## 2. Scope

In scope:

- `pages/rpa.html` remains the current public source of truth and live public route.
- `domains/corporate-automation/rpa/page.html` mirrors the current public page for domain ownership preparation.
- `scripts/architecture/check-rpa-page-mirror-parity.js` checks conservative content parity between the public page and mirror.
- Current public route preservation remains mandatory.

Out of scope:

- Changing the public route URL.
- Changing navigation links.
- Changing page content.
- Changing CSS/JS paths.
- Changing deployment/build behavior.
- Deleting or reducing `pages/rpa.html`.

## 3. Current route and mirror status

| Item              | Path                                         | Role                                                  | Live Route? | Status    | Notes                                                                                            |
| ----------------- | -------------------------------------------- | ----------------------------------------------------- | ----------- | --------- | ------------------------------------------------------------------------------------------------ |
| Public RPA page   | `pages/rpa.html`                             | Current public source of truth and runtime HTML page. | Yes         | Preserved | Do not change or reduce until a later compatibility wrapper/static-hosting strategy is approved. |
| RPA domain mirror | `domains/corporate-automation/rpa/page.html` | Domain-owned source ownership mirror.                 | No          | Mirrored  | Not a live route and not expected to work as a standalone public URL yet.                        |

## 4. Parity requirement

The domain mirror must match `pages/rpa.html` before any future wrapper, static-hosting, route, or navigation changes proceed.

Run the parity checker from the repository root:

```bash
node scripts/architecture/check-rpa-page-mirror-parity.js
```

If parity fails, do not proceed to wrapper/static hosting changes. Restore the mirror to match `pages/rpa.html`, rerun the checker, and keep the public page as the source of truth until the compatibility strategy changes.

## 5. Static hosting warning

`domains/corporate-automation/rpa/page.html` is a source ownership mirror only. It may contain relative links, scripts, forms, anchors, and stylesheet paths inherited from `pages/rpa.html`.

The mirror is not expected to work as a standalone public route yet. Do not serve it directly until the path strategy, static-hosting behavior, and asset loading assumptions are reviewed.

## 6. Future wrapper strategy

Possible future options include:

- Keep `pages/rpa.html` as a compatibility wrapper while domain-owned content is introduced behind it.
- Move route ownership only after static hosting support exists for the domain source path.
- Update navigation only after smoke tests prove the public route, links, styles, shared scripts, and forms remain stable.
- Use the parity checker before and after wrapper changes to prove the current public page and future domain source remain compatible.

## 7. Smoke checklist

Initial results are `Not run` because Phase 12B creates a mirror and parity checker only; it does not make the mirror live.

| Check                            | Public Page      | Domain Mirror                                | Result  | Notes                                                                      |
| -------------------------------- | ---------------- | -------------------------------------------- | ------- | -------------------------------------------------------------------------- |
| Desktop layout                   | `pages/rpa.html` | `domains/corporate-automation/rpa/page.html` | Not run | Run before any wrapper or static-hosting change.                           |
| Mobile layout                    | `pages/rpa.html` | `domains/corporate-automation/rpa/page.html` | Not run | Include responsive navigation and content sections.                        |
| Navigation                       | `pages/rpa.html` | `domains/corporate-automation/rpa/page.html` | Not run | Public navigation must keep existing links until explicitly changed later. |
| CTA buttons                      | `pages/rpa.html` | `domains/corporate-automation/rpa/page.html` | Not run | Include internal anchors and external/contact CTAs.                        |
| Contact/form behavior if present | `pages/rpa.html` | `domains/corporate-automation/rpa/page.html` | Not run | Verify any inherited form or contact behavior before serving a wrapper.    |
| Shared JS behavior               | `pages/rpa.html` | `domains/corporate-automation/rpa/page.html` | Not run | Verify shared scripts load and preserve existing behavior.                 |
| CSS loading                      | `pages/rpa.html` | `domains/corporate-automation/rpa/page.html` | Not run | Verify inherited stylesheet paths before serving from another directory.   |
| Route link behavior              | `pages/rpa.html` | `domains/corporate-automation/rpa/page.html` | Not run | Confirm route links still point to current public URLs.                    |

## 8. Rollback plan

If a future wrapper, static-hosting mapping, or navigation relink fails, restore `pages/rpa.html` as the live full page. Keep the domain mirror unused until parity and smoke tests pass again.

Do not delete the public page yet. The existing `pages/rpa.html` route remains the stable rollback target until a later compatibility strategy explicitly replaces it.

## 9. Relationship to existing docs

- [`public-service-route-compatibility-map.md`](public-service-route-compatibility-map.md)
- [`dashboard-corporate-automation-migration-audit.md`](dashboard-corporate-automation-migration-audit.md)
- [`enterprise-migration-closure-audit.md`](enterprise-migration-closure-audit.md)
- [`../../domains/corporate-automation/rpa/README.md`](../../domains/corporate-automation/rpa/README.md)
- [`../../domains/corporate-automation/README.md`](../../domains/corporate-automation/README.md)
- [`../../apps/web/README.md`](../../apps/web/README.md)

## Phase 12C combined mirror checker note

Phase 12C includes the RPA mirror in the combined Corporate Automation service mirror parity checker at `scripts/architecture/check-corporate-service-page-mirrors.js`. The dedicated RPA parity checker remains available, and `pages/rpa.html` remains the public source of truth until a later wrapper/static-hosting strategy is proven.

## Phase 13A public wrapper strategy note

Phase 13A identifies RPA as the first public wrapper candidate because it is lower-risk and has dedicated mirror parity. This does not change the live `pages/rpa.html` route yet; runtime wrapper work remains gated by static-hosting strategy, smoke testing, and rollback planning.

## Phase 13B source policy note

The RPA mirror remains parity-owned under `domains/corporate-automation/rpa/page.html`, but public `pages/rpa.html` stays the served source until a wrapper or build/deploy generation strategy exists and passes the required parity, smoke, and rollback gates.

## Phase 15A dry-run sync workflow note

Phase 15A adds a dedicated RPA dry-run sync workflow for comparing `pages/rpa.html` with `domains/corporate-automation/rpa/page.html` and previewing either sync direction before files are changed.

The public route remains unchanged and continues to be served from `pages/rpa.html`. Write mode is available in `scripts/architecture/sync-rpa-page-mirror.js` for future/manual use, but it was not used in Phase 15A.
