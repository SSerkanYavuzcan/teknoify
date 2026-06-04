# Archive Readiness Freeze

## Phase 16A note

- Phase 16A adds the final enterprise readiness seal, and the archive freeze remains active after that seal. No archive/delete work is allowed until smoke, consumers, compatibility, and rollback paths are verified in a dedicated PR.

## 1. Title and purpose

Phase 15B freezes the current archive/delete readiness state for the enterprise architecture migration effort. This is not an archive/delete PR, does not remove files, and does not move runtime, data, workflow, API, package, page, mirror, JS, or CSS behavior.

The purpose is to preserve a clear line between candidates that may become safe after gates and areas that must remain untouched until consumers, smoke tests, compatibility paths, and rollback plans are proven.

## 2. Archive freeze policy

- No archive/delete work should happen until relevant consumers are verified.
- No rollback files should be deleted before smoke tests.
- No protected route files should be archived before route replacements are live and tested.
- No source/generated data should be archived before producer/consumer compatibility is proven.

Archive work must stay separate from runtime migration work. If a future PR changes behavior, routes, source data, generated data, package scripts, workflows, or compatibility wrappers, it is not an archive-only PR.

## 3. Do-not-archive-yet table

| Path / Area                          | Why Not Yet                                                                                    | Required Gate                                                                                                                         |
| ------------------------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `css/investment-analytics.css`       | Still acts as a public compatibility surface and rollback path for Investment styling.         | Investment visual smoke, consumer verification, manifest compatibility proof, and rollback documentation.                             |
| `css/06-pages/investment-analytics/` | Domain-owned CSS partials remain part of the active Investment stylesheet boundary.            | Visual smoke across Investment Analytics and affected shared consumers before any move/delete.                                        |
| `js/investment-analytics.js`         | Legacy orchestrator still provides runtime behavior and compatibility for helper bridges.      | Module-loading compatibility, bridge smoke, helper conversion plan, and full Investment runtime smoke.                                |
| `dashboard/`                         | Protected dashboard route files remain live and access-sensitive.                              | Replacement routes live behind compatibility paths plus admin, premium, member, redirect, Firebase/App Check, and unauthorized smoke. |
| `pages/*.html`                       | Live public static routes still serve from `pages/`, including mirrored service/product pages. | Wrapper/static-hosting strategy, mirror parity, public route smoke, navigation proof, and rollback path.                              |
| `domains/**/page.html`               | Domain mirrors are ownership preparation and parity references, not disposable duplicates.     | Build/wrapper strategy that defines the serving source and preserves mirror/source policy.                                            |
| `data/stock/turkey/`                 | Source data paths may still be consumed by scripts, pages, or generated outputs.               | Producer/consumer compatibility proof, path smoke, and rollback plan.                                                                 |
| RAG generated outputs                | Generated artifacts may be consumed by search/catalog/RAG flows and caches.                    | Compatibility-path migration, freshness checks, consumer proof, and command/search smoke.                                             |
| API contract docs                    | Contract docs preserve integration expectations and migration boundaries.                      | Replacement/index links verified and consumers of the contract documentation notified.                                                |
| Auth/config/data-access packages     | Package boundaries are part of the enterprise helper model and future migrations.              | Consumer migration proof, package checker passes, and rollback path for any public contract change.                                   |
| Architecture audit scripts           | Scripts enforce readiness gates used by the current migration process.                         | Replacement checker coverage, package script compatibility, and full `npm run check` pass.                                            |

## 4. Archive candidates after gates

| Candidate                             | Gate Before Archive                                                                                     | Earliest Safe Phase                                  | Notes                                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Legacy public manifest                | Visual smoke and consumer verification prove no live page needs the legacy compatibility surface.       | Future cleanup PR after Investment CSS smoke.        | Keep rollback available until all visual and consumer checks are recorded.                 |
| Duplicated public/domain page content | Build/wrapper strategy defines a single serving source and public routes are smoke-tested.              | Future wrapper/static-hosting phase after RPA proof. | RPA should remain the low-risk proving ground before high-risk product/funnel pages.       |
| Duplicated helper fallback code       | Bridge smoke and module conversion prove helper consumers no longer require fallback code.              | Future Investment JS module cleanup phase.           | Do not remove fallback code in the same PR that first introduces risky runtime conversion. |
| Old generated outputs                 | Compatibility-path migration proves producers and consumers no longer read old output locations.        | Future Data/RAG compatibility phase.                 | Preserve rollback and freshness evidence before removing generated artifacts.              |
| Old dashboard route files             | Protected route replacement is live, route compatibility passes, and manual access smoke is documented. | Future protected route migration phase.              | Access-sensitive files require the strictest smoke and rollback evidence.                  |
| Stale docs                            | Architecture indexes and inbound links are updated and no active runbook references the stale doc.      | Future docs cleanup phase.                           | Documentation cleanup can proceed only after link and index checks.                        |

## 5. Required archive PR checklist

- Relevant checker passes.
- Manual smoke passes.
- Consumers searched.
- Rollback path documented.
- No runtime migration mixed into archive PR.
- No data loss risk.
- No unrelated files staged.
- Package scripts still pass.

## 6. Relationship to existing docs

- [`archive-cleanup-candidates.md`](archive-cleanup-candidates.md)
- [`final-architecture-scorecard.md`](final-architecture-scorecard.md)
- [`final-migration-runbook.md`](final-migration-runbook.md)
- [`enterprise-migration-closure-audit.md`](enterprise-migration-closure-audit.md)
