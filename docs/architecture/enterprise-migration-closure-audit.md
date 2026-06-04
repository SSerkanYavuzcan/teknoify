# Enterprise Migration Closure Audit

## 1. Title and purpose

This Phase 10A audit closes the current enterprise architecture migration preparation cycle. It does not claim that all runtime files are moved. Instead, it verifies that the architecture, ownership documentation, and audit automation are ready for controlled runtime moves in targeted follow-up PRs.

Phase 10A is governance-only. It consolidates migration state, records the remaining gates, and adds a final readiness checker that can be run before any future runtime migration or archive decision.

## 2. Current migration status summary

| Area                                   | Current Status                                                                                                     | Readiness                                            | Remaining Work                                                                   | Risk                                                           |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Repository inventory / folder skeleton | Current inventory and target skeletons exist for apps, domains, packages, services, data, scripts, and docs.       | Ready for targeted ownership migrations.             | Keep inventory synchronized when runtime files move.                             | Stale target ownership notes if future PRs skip documentation. |
| Docs architecture                      | Architecture, product, API contract, data contract, RAG, security, deployment, and decision folders are organized. | Ready as the migration entrypoint.                   | Continue linking new migration docs from the architecture index.                 | Docs can become fragmented if new gates are not indexed.       |
| Auth/config/routes/access helpers      | Route, role/access, auth/config, and global bridge planning docs and helper packages exist.                        | Ready for guarded consumer migrations.               | Physically move dashboard/auth routes only after smoke-test coverage.            | Protected route regression if moved before auth smoke.         |
| Investment frontend JS helpers         | Formatter, chart math, compound, CAGR, and retirement bridge/fallback work is documented and guarded.              | Ready for targeted helper cleanup PRs.               | Keep `js/investment-analytics.js` classic until module boot ownership is proven. | Module loading or fallback regressions.                        |
| Investment CSS manifest migration      | Analytics, retail, airlines, and subscription pages are relinked to the domain-owned manifest.                     | Ready for visual smoke closure.                      | Manual visual smoke must pass before archiving rollback CSS.                     | Visual CSS regression or static path breakage.                 |
| Investment Data + RAG audit            | Data/RAG producers, consumers, generated outputs, and target ownership are audited.                                | Ready for compatibility planning.                    | Create path constants/wrappers before moving source or generated data.           | Stale generated data or RAG retrieval drift.                   |
| Dashboard + Corporate Automation audit | Dashboard and corporate automation runtime areas are audited by map checks and docs.                               | Ready for route smoke-test planning.                 | Add protected route smoke documentation before runtime movement.                 | Dashboard access regression.                                   |
| Dashboard protected runtime migration  | Not moved. Current `dashboard/` runtime remains authoritative.                                                     | Not ready for movement without smoke gates.          | Validate admin, premium, member, login, logout, and route access behavior.       | Protected routes can become inaccessible or overexposed.       |
| Corporate automation runtime migration | Not moved. Current dashboard-hosted automation pages and assets remain authoritative.                              | Not ready for movement without public route mapping. | Map public routes, service ownership, backend helpers, and compatibility paths.  | Static hosting path and worker coupling regressions.           |
| Archive/cleanup                        | Candidate policy is documented, but no cleanup is executed in Phase 10A.                                           | Ready for a separate archive PR after gates.         | Search consumers, pass smoke tests, identify rollback paths, then archive.       | Deleting rollback or source files too early.                   |
| Final smoke testing                    | Final gate is documented and readiness automation exists.                                                          | Ready to run before future runtime PRs.              | Complete manual visual, auth, dashboard, bridge, and command smoke tests.        | False confidence if manual smoke tests are skipped.            |

## 3. Audit scripts and readiness commands

Run the Phase 10A readiness checker from the repository root:

```bash
node scripts/architecture/check-enterprise-migration-readiness.js
```

The readiness checker runs these underlying architecture audits:

- `node scripts/architecture/check-investment-css-manifest-parity.js`
- `node scripts/architecture/check-investment-runtime-map.js`
- `node scripts/architecture/check-investment-data-rag-map.js`
- `node scripts/architecture/check-dashboard-automation-map.js`

It also performs lightweight static checks for legacy Investment Analytics CSS consumers, the financial indicators stylesheet, the sole `js/investment-analytics.js` HTML consumer, and unresolved conflict-marker patterns in tracked text files.

## 4. What is considered ready

- CSS manifest relink is complete for investment pages.
- `js/investment-analytics.js` remains classic, but bridge/fallback helpers are guarded.
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

Before any runtime move or archive PR, complete this checklist:

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

- Do not archive or delete the old public manifest until visual smoke tests pass.
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

| Risk                                                  | Impact                                                      | Likelihood | Mitigation                                                              |
| ----------------------------------------------------- | ----------------------------------------------------------- | ---------- | ----------------------------------------------------------------------- |
| Deleting rollback files too early                     | Removes the fastest recovery path after a failed relink.    | Medium     | Keep rollback files until visual and command smoke tests pass.          |
| Moving protected routes before auth smoke             | Can break access control or expose protected content.       | High       | Require admin, premium, member, login, and logout smoke gates first.    |
| Breaking static hosting paths                         | Public pages, assets, or data may 404.                      | Medium     | Preserve routes or add wrappers/redirects before physical movement.     |
| Stale generated data                                  | Catalogs or extracted text can drift from source inputs.    | Medium     | Keep producer scripts authoritative and verify generated output parity. |
| RAG retrieval drift                                   | Retrieval can miss or cite stale document chunks.           | Medium     | Rewire producers/consumers together and compare retrieval outputs.      |
| Dashboard access regression                           | Members or admins may lose access or gain incorrect access. | High       | Add protected dashboard route smoke tests before moving files.          |
| Visual CSS regression                                 | Relinked investment pages can render differently.           | Medium     | Complete visual smoke tests before archive or CSS partial movement.     |
| Merge conflict markers                                | Broken text can ship into docs, scripts, or runtime files.  | Low        | Run readiness checks and review warnings before merge.                  |
| Unrelated dirty worktree items accidentally committed | Review scope expands and may ship unintended changes.       | Medium     | Stage only Phase 10A governance files and inspect `git status --short`. |
| Package script drift                                  | CI/check behavior can change unexpectedly.                  | Low        | Do not edit `package.json` or add npm scripts in Phase 10A.             |

## 10. Relationship to existing docs

- [`current-inventory.md`](current-inventory.md)
- [`folder-structure.md`](folder-structure.md)
- [`auth-config-centralization-plan.md`](auth-config-centralization-plan.md)
- [`investment-js-orchestrator-cleanup-plan.md`](investment-js-orchestrator-cleanup-plan.md)
- [`investment-css-consumer-audit.md`](investment-css-consumer-audit.md)
- [`investment-data-rag-migration-audit.md`](investment-data-rag-migration-audit.md)
- [`dashboard-corporate-automation-migration-audit.md`](dashboard-corporate-automation-migration-audit.md)
