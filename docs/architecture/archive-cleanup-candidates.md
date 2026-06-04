# Archive/Cleanup Candidates

## 1. Title and purpose

This Phase 10A document lists candidates for future archive or cleanup after the enterprise architecture migration preparation cycle. It is not an instruction to delete, move, rewrite, or archive these files now.

The purpose is to make cleanup reviewable by separating candidate identification from deletion. Every future archive PR must prove consumer compatibility, smoke-test coverage, and rollback safety before removing or relocating old paths.

## 2. Archive principles

- Archive only after consumers are verified.
- Prefer deprecation notes before deletion.
- Keep rollback paths until smoke tests pass.
- Do not archive generated/source data without producer/consumer proof.
- Do not archive protected dashboard files before route smoke tests.

## 3. Candidate table

| Candidate Path / Area                                                                    | Why Candidate                                                                     | Current Consumer Risk                                                          | Archive Priority              | Required Gate Before Archive                                                    | Notes                                                                |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `css/investment-analytics.css`                                                           | Legacy public manifest after investment pages relinked to the domain manifest.    | Medium: rollback path for visual regressions.                                  | Do-not-archive-yet            | Investment visual smoke tests and consumer search.                              | Keep as rollback until visual smoke closes.                          |
| `css/06-pages/investment-analytics/`                                                     | Page-specific partials may eventually move under domain style ownership.          | Medium: imported by public and domain manifests.                               | Do-not-archive-yet            | Manifest parity, visual smoke, and import path compatibility.                   | Do not move partials in cleanup-only PRs.                            |
| Legacy public investment stylesheet links, if any remain                                 | Old HTML consumers would indicate incomplete relink.                              | High: pages may depend on old manifest path.                                   | Candidate-after-smoke         | Readiness checker confirms no legacy HTML consumers.                            | Future cleanup may add deprecation notes only after searches pass.   |
| Old duplicated formatter/chart/calculator fallback logic in `js/investment-analytics.js` | Bridge helpers may eventually replace local fallback logic.                       | High: classic page boot still depends on guarded fallbacks.                    | Candidate-after-compatibility | Formatter/chart/calculator bridge smoke tests and module boot plan.             | Do not remove until bridge globals and fallback behavior are proven. |
| `data/stock/turkey/` old/generated locations                                             | Future data ownership may move source/generated assets under domain/data folders. | High: scripts, RAG, and frontend consumers may be path-sensitive.              | Do-not-archive-yet            | Producer/consumer path map, compatibility constants, and data/RAG smoke checks. | Treat source and generated data separately.                          |
| RAG generated text/catalog outputs                                                       | Generated outputs may move under RAG worker ownership later.                      | High: retrieval/index consumers can drift.                                     | Do-not-archive-yet            | Generator ownership, schema compatibility, retrieval checks, and rollback plan. | Do not edit generated outputs by hand.                               |
| Dashboard current runtime folders                                                        | Future dashboard app ownership may relocate protected routes.                     | High: auth, role, subscription, and Firebase/App Check behavior are sensitive. | Candidate-after-route-move    | Protected route smoke tests and compatibility routing.                          | Keep current protected routes until replacements are verified.       |
| Public service page current locations                                                    | Corporate automation public routes may move after route mapping.                  | Medium: static public URLs and CSS/JS assets must remain stable.               | Candidate-after-route-move    | Public route smoke tests and redirect/wrapper proof.                            | Safer than protected dashboard, but still route-sensitive.           |
| One-off scripts                                                                          | Some audit or migration helper scripts may become obsolete after phases close.    | Medium: scripts may be referenced by docs or manual runbooks.                  | needs-review                  | Search docs/package/workflows and prove no active consumer.                     | Do not remove scripts used by architecture docs.                     |
| Docs that became index-only entrypoints                                                  | Some docs may later become historical once migration records consolidate.         | Low to medium: docs may be external references.                                | needs-review                  | Link audit, replacement doc, and deprecation note.                              | Prefer short entrypoint notes over deletion.                         |
| Needs-review areas from audits                                                           | Audit scripts can classify ambiguous ownership areas.                             | Medium to high depending on area.                                              | needs-review                  | Area-specific smoke test and owner decision.                                    | Keep candidates documented until ownership is clear.                 |

## 4. Explicit do-not-archive-yet list

- `css/investment-analytics.css`
- `css/06-pages/investment-analytics/`
- `js/investment-analytics.js`
- `dashboard/`
- `data/stock/turkey/`
- RAG generated outputs
- API contract docs
- Auth/config packages

## 5. Future archive PR checklist

- [ ] All consumers searched.
- [ ] Audit script passes.
- [ ] Smoke tests passed.
- [ ] Rollback path identified.
- [ ] PR includes before/after notes.
- [ ] No generated/source data accidentally deleted.
- [ ] No protected route removed before replacement.

## Phase 15B archive readiness freeze note

Phase 15B freezes archive readiness. No archive/delete work should happen before the documented consumer, smoke, compatibility, rollback, and package-script gates pass in a dedicated cleanup PR.
