# Archive and Cleanup Candidates

## 1. Title and purpose

This Phase 10A document lists candidates for future archive or cleanup after the enterprise migration readiness gates pass. It is not an instruction to delete, move, archive, or rewrite anything now.

Archive decisions must happen in dedicated follow-up PRs with consumer searches, smoke-test evidence, and rollback notes.

## 2. Archive principles

- Archive only after consumers are verified.
- Prefer deprecation notes before deletion.
- Keep rollback paths until smoke tests pass.
- Do not archive generated/source data without producer/consumer proof.
- Do not archive protected dashboard files before route smoke tests.

## 3. Candidate table

| Candidate Path / Area                                                                | Why Candidate                                                         | Current Consumer Risk                                                                     | Archive Priority              | Required Gate Before Archive                                           | Notes                                                                      |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `css/investment-analytics.css`                                                       | Legacy public manifest kept as rollback after domain manifest relink. | Medium: rollback path and possible untracked/static consumers.                            | Do-not-archive-yet            | Investment visual smoke, static HTML consumer search, and parity pass. | Keep until all relinked pages are visually verified.                       |
| `css/06-pages/investment-analytics/`                                                 | Partial ownership may move later under the domain stylesheet tree.    | High: both public and domain manifests import these partials.                             | Do-not-archive-yet            | Manifest parity plus dedicated CSS partial movement PR.                | Do not move partials as part of archive cleanup.                           |
| Legacy public investment stylesheet links, if any remain                             | Any remaining page links would be stale after relink closure.         | High: direct HTML asset loading.                                                          | Candidate-after-smoke         | Readiness checker reports no legacy HTML consumers.                    | Current Phase 10A checker should fail if root/pages HTML consumers return. |
| Duplicated formatter/chart/calculator fallback logic in `js/investment-analytics.js` | Bridge helpers now guard several extracted utility responsibilities.  | High: classic fallback behavior still protects runtime boot.                              | Candidate-after-smoke         | Formatter, chart, compound, CAGR, retirement, and module boot smoke.   | Cleanup only after module ownership and fallback removal gates exist.      |
| `data/stock/turkey/` old/generated locations                                         | Future ownership likely belongs under `data/investment/turkey/`.      | High: scripts, workflows, catalogs, source documents, and generated text depend on paths. | Do-not-archive-yet            | Producer/consumer compatibility proof and generated parity checks.     | Source and generated data must remain clearly separated.                   |
| RAG generated text/catalog outputs                                                   | Generated outputs may move after RAG worker ownership is finalized.   | High: extraction workflow and retrieval diagnostics may depend on these outputs.          | Do-not-archive-yet            | RAG producer/consumer rewiring plus retrieval smoke checks.            | Do not delete generated outputs without replacement and rollback.          |
| Dashboard current runtime folders                                                    | Future ownership may move under `apps/dashboard/`.                    | High: protected dashboard routes and shared auth/config scripts.                          | Candidate-after-route-move    | Admin, premium, member, login/logout, and access smoke tests.          | Current `dashboard/` remains authoritative.                                |
| Public service page current locations                                                | Future public service ownership may move into domains/apps.           | Medium: static routes and marketing links are path-sensitive.                             | Candidate-after-route-move    | Public route mapping, redirects/wrappers if needed, and visual smoke.  | Move one low-risk route group at a time.                                   |
| One-off scripts                                                                      | Some scripts may become service workers or maintenance helpers.       | Medium: workflows and local operators may still call old paths.                           | Candidate-after-compatibility | Script caller search, workflow review, dry-run check, and rollback.    | Prefer compatibility wrappers before path changes.                         |
| Docs that became index-only entrypoints                                              | Some root/index docs may only point to new docs after migration.      | Low: links and onboarding still use entrypoints.                                          | Candidate-after-smoke         | Link search and docs index review.                                     | Prefer keeping small entrypoints over deleting useful navigation.          |
| Needs-review areas from architecture audits                                          | Audits intentionally flag unknown ownership rather than guessing.     | Unknown until reviewed.                                                                   | needs-review                  | Dedicated owner review and audit-script update.                        | Do not archive unknowns by implication.                                    |

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
