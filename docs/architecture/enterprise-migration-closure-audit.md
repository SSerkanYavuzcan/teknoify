# Enterprise Migration Closure Audit

## 1. Title and purpose

This Phase 10A audit closes the current enterprise architecture migration preparation cycle for Teknoify. It does not claim that every runtime file has been moved into the target enterprise folder structure. Instead, it verifies that the architecture documentation, ownership maps, audit commands, and smoke-test gates are ready for controlled future runtime moves.

Phase 10A is governance-only. It records readiness, remaining risk, and sequencing rules so later PRs can move one bounded area at a time without changing routes, access behavior, data contracts, generated data, CSS behavior, or package scripts by accident.

## 2. Current migration status summary

| Area                                   | Current Status                                                                                         | Readiness                                              | Remaining Work                                                                                                 | Risk                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Repository inventory / folder skeleton | Current inventory and target ownership skeletons are documented.                                       | Ready for targeted migration planning.                 | Keep inventory synchronized when files move.                                                                   | Medium: stale ownership docs can mislead future PRs. |
| Docs architecture                      | Architecture docs are grouped under `docs/architecture/` with index entrypoints.                       | Ready.                                                 | Keep new governance docs linked from the index.                                                                | Low: documentation drift.                            |
| Auth/config/routes/access helpers      | Centralization plans and route/access migration docs exist.                                            | Ready for smoke-gated wrapper work.                    | Add route/access smoke documentation before protected moves.                                                   | High: auth or role regression.                       |
| Investment frontend JS helpers         | Bridge/fallback assumptions and runtime map audit exist.                                               | Ready for future small helper migrations.              | Keep `js/investment-analytics.js` classic until module boot ownership is proven.                               | Medium: boot order or bridge drift.                  |
| Investment CSS manifest migration      | Investment HTML consumers are relinked to the domain-owned manifest; public manifest remains rollback. | Ready for manual visual smoke closure.                 | Complete visual smoke tests before deleting or archiving old manifests/partials.                               | Medium: visual CSS regression.                       |
| Investment Data + RAG audit            | Data/RAG source, generated, script, and consumer areas are audited.                                    | Ready for compatibility planning.                      | Do not move `data/stock/turkey` or generated outputs until producers and consumers are proven.                 | High: stale data or retrieval drift.                 |
| Dashboard + Corporate Automation audit | Protected dashboard and corporate automation ownership boundaries are audited.                         | Ready for route/access smoke planning.                 | Do not move protected dashboard or public service runtime pages yet.                                           | High: protected route or access regression.          |
| Dashboard protected runtime migration  | Not started; current runtime locations remain authoritative.                                           | Not ready for physical moves.                          | Add smoke gates for admin, premium, member, login/logout, unauthorized, Firebase/App Check, and impersonation. | High.                                                |
| Corporate automation runtime migration | Not started; public pages remain in current locations.                                                 | Not ready for physical moves.                          | Preserve public static routes and map product ownership before moves.                                          | Medium.                                              |
| Archive/cleanup                        | Candidate policy is documented separately.                                                             | Ready for review, not deletion.                        | Archive only after compatibility and smoke gates pass in a dedicated PR.                                       | High if rollback paths are deleted too early.        |
| Final smoke testing                    | Gate checklist is defined in this audit.                                                               | Ready to execute manually and through existing checks. | Capture results before runtime moves or archive/deletion PRs.                                                  | Medium.                                              |

## 3. Audit scripts and readiness commands

Run the final Phase 10A readiness checker from the repository root:

```bash
node scripts/architecture/check-enterprise-migration-readiness.js
```

The readiness checker runs these underlying audits:

- `node scripts/architecture/check-investment-css-manifest-parity.js`
- `node scripts/architecture/check-investment-runtime-map.js`
- `node scripts/architecture/check-investment-data-rag-map.js`
- `node scripts/architecture/check-dashboard-automation-map.js`

It also performs lightweight static checks for legacy Investment Analytics CSS HTML consumers, the Financial Indicators stylesheet boundary, the single `js/investment-analytics.js` HTML consumer, and tracked-file merge conflict marker warnings.

## 4. What is considered ready

- CSS manifest relink is complete for investment pages.
- `js/investment-analytics.js` remains classic but bridge/fallback helpers are guarded.
- Investment data/RAG assets are audited but not moved.
- Dashboard/Corporate Automation assets are audited but not moved.
- Ownership skeletons exist for future app/domain/service/package migration.
- Runtime moves should now be done only through targeted PRs with smoke tests.

## 5. What is not done yet

- Protected dashboard runtime files are not moved yet.
- Corporate automation runtime pages are not moved yet.
- `data/stock/turkey` files are not moved yet.
- RAG producers/consumers are not rewired yet.
- CSS partial files are not moved yet.
- `css/investment-analytics.css` is not deleted yet.
- `js/investment-analytics.js` is not converted to `type="module"`.
- Dashboard/auth routes are not physically moved yet.

## 6. Final smoke-test gate

Before runtime moves, archive/deletion work, or broad ownership rewiring, complete this gate:

- [ ] Investment analytics page visual smoke.
- [ ] Retail page visual smoke.
- [ ] Airlines page visual smoke.
- [ ] Subscription page visual smoke.
- [ ] Financial indicators separate CSS smoke.
- [ ] Auth login/logout smoke.
- [ ] Dashboard admin route smoke.
- [ ] Dashboard premium route smoke.
- [ ] Dashboard member route smoke.
- [ ] Route bridge/global config smoke.
- [ ] Formatter/chart/calculator bridge smoke.
- [ ] Data/RAG audit command.
- [ ] Dashboard/corporate audit command.
- [ ] No conflict markers.
- [ ] No legacy Investment Analytics CSS HTML consumers.
- [ ] `npm run check`.

## 7. Archive/cleanup gate

- Do not archive or delete old public manifest until visual smoke tests pass.
- Do not archive old data paths until producer/consumer compatibility is proven.
- Do not archive old dashboard files until protected route smoke tests pass.
- Do not archive old JS files until module boot ownership is implemented and verified.
- Archive should be a separate dedicated PR after readiness checks pass.

## 8. Recommended next runtime migration sequence

1. Complete manual visual smoke tests for CSS relink.
2. Add dashboard route/access smoke-test documentation.
3. Move/copy one low-risk public service ownership artifact or doc.
4. Create compatibility wrappers/path constants for Data/RAG if needed.
5. Move one low-risk doc-only or generated mirror asset.
6. Plan dashboard runtime move only after auth/access smoke gates.
7. Plan corporate automation runtime move after public route mapping.
8. Archive only after all consumers are verified.

## 9. Risk matrix

| Risk                                                  | Impact                                                                         | Likelihood | Mitigation                                                                              |
| ----------------------------------------------------- | ------------------------------------------------------------------------------ | ---------- | --------------------------------------------------------------------------------------- |
| Deleting rollback files too early                     | Fast rollback is unavailable if relinked pages regress.                        | Medium     | Keep rollback manifests and old paths until visual smoke and consumer searches pass.    |
| Moving protected routes before auth smoke             | Admin, premium, or member users can be blocked or over-permitted.              | High       | Add protected route smoke tests before moving dashboard/auth runtime files.             |
| Breaking static hosting paths                         | Public pages, scripts, styles, or dashboard routes fail in production hosting. | Medium     | Preserve URLs and use compatibility wrappers or hosting rules before physical moves.    |
| Stale generated data                                  | Consumers read old catalogs, JSON, CSV, or extracted text.                     | Medium     | Keep producer scripts authoritative and validate generated outputs before moving paths. |
| RAG retrieval drift                                   | Retrieval misses source documents or cites stale/generated text.               | Medium     | Preserve schemas and compare retrieval output before/after any RAG path change.         |
| Dashboard access regression                           | Role, subscription, impersonation, or Firebase/App Check behavior changes.     | High       | Gate dashboard work with auth/access smoke tests and small PRs.                         |
| Visual CSS regression                                 | Investment, subscription, or financial indicator pages render differently.     | Medium     | Complete visual smoke tests across affected pages before cleanup.                       |
| Merge conflict markers                                | Broken docs/scripts land after a conflicted PR recovery.                       | Medium     | Run the readiness checker and review conflict marker warnings before merge.             |
| Unrelated dirty worktree items accidentally committed | Mode-only or dependency artifacts pollute governance PRs.                      | Medium     | Stage explicit files only and inspect `git status --short` before commit.               |
| Package script drift                                  | Governance checker becomes part of default checks unexpectedly.                | Low        | Do not change `package.json`; run Phase 10A readiness explicitly.                       |

## 10. Relationship to existing docs

- [`current-inventory.md`](current-inventory.md)
- [`folder-structure.md`](folder-structure.md)
- [`auth-config-centralization-plan.md`](auth-config-centralization-plan.md)
- [`investment-js-orchestrator-cleanup-plan.md`](investment-js-orchestrator-cleanup-plan.md)
- [`investment-css-consumer-audit.md`](investment-css-consumer-audit.md)
- [`investment-data-rag-migration-audit.md`](investment-data-rag-migration-audit.md)
- [`dashboard-corporate-automation-migration-audit.md`](dashboard-corporate-automation-migration-audit.md)

## Phase 11A protected Dashboard route smoke gate note

Phase 11A documents the protected Dashboard route/access smoke gate as the next pre-runtime requirement. Protected admin, premium, member, shared Dashboard, Firebase/App Check, impersonation, and unauthorized redirect behavior must be manually smoke-tested before any protected Dashboard runtime file is moved.
