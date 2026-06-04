# Final Architecture Scorecard

## Phase 16A note

- Phase 16A added the final enterprise readiness seal in [`enterprise-readiness-seal.md`](enterprise-readiness-seal.md), closing architecture preparation and keeping future runtime migrations gated through targeted PRs.

## 1. Title and purpose

Phase 15B freezes the enterprise architecture preparation scorecard after the migration readiness, public mirror, parity, sync workflow, route/access, and archive planning work completed in earlier phases. This document is a governance-only closeout artifact: it summarizes what is ready, what remains gated, and which future runtime or archive actions require separate PRs.

It does not claim that every runtime file has been physically moved. The current phase records the preparation state so future implementation work can proceed only through documented smoke, compatibility, rollback, and checker gates.

## 2. Executive scorecard

| Area                                     | Score / Readiness              | Current State                                                                                                                        | Remaining Gate                                                                                   | Next Action                                                                      |
| ---------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Repository inventory and folder skeleton | Complete                       | Repository inventory and target domain/app/package/service skeletons are documented.                                                 | Keep inventory current when future runtime files move.                                           | Use existing inventory docs as the source for future migration scoping.          |
| Documentation architecture               | Enterprise-ready               | Architecture README, ADR/index docs, plans, audits, smoke tests, and runbooks exist.                                                 | Keep cross-links updated as new governance docs are added.                                       | Reference this scorecard and the final runbook before runtime PRs.               |
| Auth/config/routes/access helpers        | Enterprise-ready               | Shared helper ownership boundaries and bridge patterns are documented and partially centralized without changing protected behavior. | Manual auth, redirect, Firebase/App Check, and role/access smoke before protected runtime moves. | Use the helper and bridge contracts for future targeted consumers.               |
| Investment CSS migration                 | Gated by smoke test            | Public Investment manifest relink is complete and parity/readiness documentation exists.                                             | Manual visual smoke for Investment Analytics and related consumers.                              | Capture smoke evidence before deleting or moving legacy CSS surfaces.            |
| Investment JS helper migration           | Gated by compatibility wrapper | Helper bridge/fallback pattern is established while the legacy orchestrator remains in place.                                        | Bridge smoke and module-loading compatibility before cleanup or conversion.                      | Keep `js/investment-analytics.js` stable until a dedicated module-conversion PR. |
| Investment Data/RAG readiness            | Do not move yet                | Data/RAG ownership and compatibility risks are documented.                                                                           | Producer/consumer compatibility path and command/search smoke.                                   | Start with doc-only or compatibility-path migration work.                        |
| Dashboard protected route readiness      | Do not move yet                | Protected route access and smoke gates are documented.                                                                               | Manual admin, premium, member, shared Dashboard, redirect, and Firebase/App Check smoke.         | Keep protected runtime files in place until smoke gates pass.                    |
| Dashboard route compatibility            | Gated by compatibility wrapper | Compatibility maps and route move prerequisites exist.                                                                               | Static-hosting path, wrapper/rollback plan, and route smoke.                                     | Use compatibility wrappers before any public route or protected route move.      |
| Corporate Automation ownership           | Ready for targeted runtime PR  | Domain ownership mirrors exist for public service pages while live routes remain in `pages/`.                                        | Public route parity, visual/navigation smoke, and static-hosting proof.                          | Use RPA as the first low-risk wrapper/build strategy candidate after gates.      |
| Public service mirrors                   | Enterprise-ready               | Corporate service public mirrors exist and are checked for parity/source policy.                                                     | Manual page smoke and wrapper/static-hosting proof before promotion.                             | Keep source and mirror content aligned through the sync policy/workflow.         |
| Product/funnel mirrors                   | Gated by smoke test            | High-risk Subscription and AI Assistant mirrors exist for ownership only.                                                            | Product/funnel, auth/session, payment/subscription, premium access, and AI tool smoke.           | Do not promote before lower-risk public service wrapper strategy is proven.      |
| Public mirror source policy              | Complete                       | Live `pages/*.html` routes remain the serving source while domain mirrors prepare ownership.                                         | Continued parity checks and no navigation-to-mirror regressions.                                 | Enforce policy in public mirror PRs.                                             |
| RPA mirror sync workflow                 | Ready for targeted runtime PR  | Dry-run-first RPA mirror sync workflow and checker documentation exist.                                                              | Review dry-run diff, run mirror checks, then decide if write mode is safe in a dedicated PR.     | Use the dry-run workflow for any RPA page content update.                        |
| Archive/cleanup readiness                | Gated by smoke test            | Archive candidates and delete policy exist, but cleanup is not executed.                                                             | Consumer proof, rollback proof, manual smoke, and relevant checker passes.                       | Keep all archive/delete work in separate cleanup PRs after gates.                |
| Developer runbook/check commands         | Complete                       | Package script entrypoints and final migration runbook define checker order and no-go criteria.                                      | Commands must pass in future PRs; manual smoke remains area-specific.                            | Run the documented check commands before governance, runtime, or cleanup PRs.    |

## 3. What is enterprise-ready now

- The folder/domain/app/package/service ownership model exists and is documented for future migration planning.
- Architecture documents, ADR references, index docs, audits, and runbooks exist to support staged migration work.
- Automated readiness scripts exist for enterprise migration readiness, Investment runtime boundaries, public mirrors, and Dashboard route compatibility.
- Package script entrypoints exist for the architecture check suite and full project check.
- The Investment CSS public manifest relink is complete, with parity and visual smoke expectations documented.
- The Investment helper bridge/fallback pattern is established so helper extraction can remain compatible with legacy script loading.
- Public service and product/funnel mirrors exist for ownership preparation without changing live public routes.
- Mirror parity, readiness, and source policy documentation exists to keep `pages/*.html` and `domains/**/page.html` aligned.
- Dashboard route/access gates exist for protected route smoke, compatibility mapping, and rollback planning.
- Archive/delete policy exists through cleanup candidate documentation and this Phase 15B archive readiness freeze.

## 4. What is intentionally not done

- Protected dashboard runtime files are not moved.
- Dashboard public route URLs are not changed.
- Corporate service public routes still serve from `pages/`.
- Product/funnel public routes still serve from `pages/`.
- Source data/RAG paths are not moved.
- CSS partials are not moved.
- Rollback files are not deleted.
- `js/investment-analytics.js` is not converted to a module.
- Archive cleanup is not executed.

## 5. Recommended next runtime sequence

1. Complete manual visual smoke tests for Investment CSS relink.
2. Complete manual Dashboard route/access smoke tests.
3. Use RPA dry-run sync workflow for any RPA page content update.
4. Only then consider a controlled RPA wrapper/build strategy PR.
5. Start Data/RAG with doc-only or compatibility-path migration.
6. Keep dashboard protected runtime migration blocked until smoke and route compatibility gates pass.
7. Archive only after consumers, rollback, and smoke gates are verified.

## 6. Completion estimate

- Architecture/governance readiness: around 95%+.
- Physical runtime migration: intentionally partial and gated.
- Archive cleanup: planned but not executed.
- Overall enterprise migration preparation: effectively complete for the current phase.

This estimate is limited to preparation and governance. It does not overclaim that all runtime files, route files, generated data, CSS partials, or rollback surfaces have been physically moved or removed.

## 7. Relationship to check commands

Run these commands for the current governance baseline and before future architecture-governed runtime, wrapper, data/RAG, mirror, or cleanup work:

```bash
npm run check:architecture
npm run check:investment-runtime
npm run check:public-mirrors
npm run check:dashboard-routes
npm run check
```

Passing commands are necessary but not sufficient for runtime movement. Area-specific manual smoke and rollback proof remain required where documented.

## 8. Go/no-go summary

| Future Work                     | Go Condition                                                                                                                                        | No-Go Condition                                                                                                                                    |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| RPA content sync                | Dry-run diff is reviewed, parity checks pass, source policy remains intact, and rollback is clear.                                                  | Dry-run shows unexpected divergence, checks fail, source/mirror ownership is unclear, or unrelated files are staged.                               |
| RPA wrapper/static hosting PR   | RPA mirror parity is current, static-hosting path proof exists, visual/navigation smoke is planned, and rollback to `pages/rpa.html` is documented. | Wrapper changes live route behavior unexpectedly, static-hosting paths are unproven, or smoke/rollback evidence is missing.                        |
| Dashboard route move            | Protected route replacement is live behind a compatibility path, admin/premium/member/access smoke passes, and rollback is documented.              | Protected runtime files move before smoke, route compatibility is incomplete, or unauthorized behavior is unverified.                              |
| Data/RAG path move              | Producer and consumer compatibility paths are proven, generated output behavior is understood, and command/search smoke passes.                     | Producers and consumers are rewired together without compatibility, generated outputs are stale/unclear, or consumers still require old paths.     |
| Investment JS module conversion | Bridge smoke passes, module-loading compatibility is proven, helper fallback cleanup is isolated, and visual/function smoke passes.                 | `js/investment-analytics.js` is converted without a compatibility path, bridge fallback is removed too early, or multiple runtime areas are mixed. |
| CSS partial move/delete         | Investment and shared consumer visual smoke passes, public manifest consumers are verified, and rollback path exists.                               | CSS partials or public manifest files are removed without visual smoke, consumer proof, or rollback.                                               |
| Archive cleanup                 | Consumers are searched, relevant checkers pass, manual smoke passes, rollback is documented, and no runtime migration is mixed in.                  | Any candidate still has uncertain consumers, data loss risk exists, rollback is unclear, or unrelated worktree items are staged.                   |

## 9. Relationship to existing docs

- [`final-migration-readiness-report.md`](final-migration-readiness-report.md)
- [`final-migration-runbook.md`](final-migration-runbook.md)
- [`archive-cleanup-candidates.md`](archive-cleanup-candidates.md)
- [`enterprise-migration-closure-audit.md`](enterprise-migration-closure-audit.md)
- [`rpa-page-mirror-sync-workflow.md`](rpa-page-mirror-sync-workflow.md)
- [`public-page-mirror-source-policy.md`](public-page-mirror-source-policy.md)
- [`dashboard-route-access-smoke-test.md`](dashboard-route-access-smoke-test.md)
- [`investment-data-rag-migration-audit.md`](investment-data-rag-migration-audit.md)
