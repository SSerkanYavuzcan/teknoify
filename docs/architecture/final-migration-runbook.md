# Final Migration Runbook

## 1. Title and purpose

Phase 14B provides the developer-facing runbook for running architecture readiness checks and deciding go/no-go for future runtime migrations. It turns the Phase 14A final readiness layer into repeatable package-script entrypoints while keeping this phase governance-only: no runtime pages, mirrored HTML, JavaScript behavior, CSS behavior, data, API behavior, workflow behavior, or deployment behavior changes are introduced here.

Use this runbook before proposing any runtime migration, wrapper promotion, archive cleanup, or compatibility-path move. The goal is to make every future migration PR small, explicit, reversible, and backed by the relevant automated architecture checker plus manual smoke evidence.

## 2. Quick commands

```bash
npm run check
npm run check:architecture
npm run check:investment-runtime
npm run check:public-mirrors
npm run check:dashboard-routes
```

## 3. When to run each command

| Command                            | When to Run                                                                                                                  | What It Protects                                                                                     | Blocks Runtime Move?                                                              |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `npm run check`                    | Before every PR and after any formatting, JavaScript, CSS, or documentation change.                                          | Repository-wide formatting, JavaScript linting, and CSS linting through the existing check script.   | Yes, for every PR. Existing check behavior remains the baseline gate.             |
| `npm run check:architecture`       | Before any architecture, ownership, wrapper, runtime migration, data/RAG, or cleanup PR.                                     | The full enterprise migration readiness set across Investment, Dashboard, public mirrors, and RAG.   | Yes, for any runtime move or architecture-governed ownership change.              |
| `npm run check:investment-runtime` | Before touching Investment Analytics runtime ownership, CSS relink cleanup, JS extraction, or RAG-adjacent Investment files. | Investment runtime map integrity, current consumer boundaries, and migration assumptions.            | Yes, for Investment runtime moves.                                                |
| `npm run check:public-mirrors`     | Before touching public page mirrors, wrappers, source policy, public service pages, or product/funnel mirrors.               | Public page mirror source policy, mirror parity expectations, and navigation/source ownership rules. | Yes, for public mirror, wrapper, or static-hosting promotion work.                |
| `npm run check:dashboard-routes`   | Before touching protected Dashboard routes, role-gated pages, route compatibility paths, or dashboard wrapper plans.         | Dashboard route readiness and route compatibility expectations.                                      | Yes, for protected Dashboard runtime moves or route/access compatibility changes. |

## 4. Runtime migration go/no-go checklist

A future runtime migration is a **go** only when all applicable items below are satisfied:

- The relevant architecture checker passes.
- `npm run check` passes.
- Manual smoke test is complete for the affected area.
- Rollback path is documented in the PR or linked runbook.
- Only one runtime area changes per PR.
- No unrelated files are staged.
- Known unrelated `tools/stylelint/bin/stylelint.js` and `node_modules/` worktree items are not committed.

A future runtime migration is a **no-go** when any applicable checker fails, manual smoke is missing, rollback is unclear, multiple runtime areas are mixed, unrelated files are staged, or the change reaches beyond its documented ownership boundary.

## 5. Area-specific runbooks

### Investment CSS/JS

- **Command to run:** `npm run check:investment-runtime`, then `npm run check:architecture`, then `npm run check`.
- **Minimum manual smoke required:** Investment Analytics visual smoke for calculator sections, chart/card rendering, expected CSS loading, helper-driven UI updates, console errors, and any affected retail/airlines consumers when shared Investment CSS boundaries are involved.
- **No-go conditions:** CSS partials are moved or deleted without visual smoke, `css/investment-analytics.css` is removed without consumer proof, `js/investment-analytics.js` is converted or split without a compatibility path, or Investment and non-Investment runtime areas are mixed in one PR.

### Public service mirrors/wrappers

- **Command to run:** `npm run check:public-mirrors`, then `npm run check:architecture`, then `npm run check`.
- **Minimum manual smoke required:** Visual and navigation smoke for the affected public route, static-hosting path proof for any wrapper/static-hosting promotion, source/mirror parity confirmation, console-error review, and rollback confirmation to the current `pages/*.html` route.
- **No-go conditions:** A live public route changes unexpectedly, a domain mirror diverges from its public source without policy documentation, static-hosting behavior is unproven, or wrapper work changes navigation/deployment behavior in the same PR.

### Product/funnel pages

- **Command to run:** `npm run check:public-mirrors`, then `npm run check:architecture`, then `npm run check`.
- **Minimum manual smoke required:** Page-specific visual smoke plus funnel, form, auth/session, payment/subscription, premium access, AI Assistant interaction, console-error, and rollback smoke for the affected product page.
- **No-go conditions:** Subscription or AI Assistant mirrors are promoted before a lower-risk public wrapper is proven, payment/auth behavior changes are mixed with ownership work, or high-risk product/funnel smoke evidence is incomplete.

### Dashboard protected routes

- **Command to run:** `npm run check:dashboard-routes`, then `npm run check:architecture`, then `npm run check`.
- **Minimum manual smoke required:** Admin, premium, member, shared Dashboard, login/logout, unauthorized redirect, Firebase/App Check, impersonation, protected data access, and direct URL smoke for the affected route set.
- **No-go conditions:** Protected runtime files move before manual access smoke is documented, a route compatibility path is missing, unauthorized access behavior is unverified, or multiple protected route families are changed in one PR.

### Data/RAG

- **Command to run:** `npm run check:architecture`, then `npm run check`; also run any area-specific checker for the runtime surface that consumes the data.
- **Minimum manual smoke required:** Producer/consumer compatibility smoke, document/catalog search smoke where relevant, path-resolution smoke, stale-cache review, and rollback proof to the current data path.
- **No-go conditions:** Data producers and consumers are rewired simultaneously without a compatibility path, `data/stock/turkey` is moved without consumer proof, generated artifacts are mixed with doc-only planning unexpectedly, or RAG/search behavior changes without dedicated smoke evidence.

### Archive/cleanup

- **Command to run:** `npm run check:architecture`, then `npm run check`; add the relevant area-specific checker for any files that reference the cleanup candidate.
- **Minimum manual smoke required:** Consumer search proof, route/link proof, affected-area smoke, rollback plan, and confirmation that the cleanup is isolated from runtime migration work.
- **No-go conditions:** Archive/delete work is bundled with a runtime move, consumer checks are incomplete, rollback cannot restore the previous path quickly, or any uncertain candidate still has live references.

## 6. Recommended next PR sequence

7. Manual smoke results documentation for Investment CSS relink.
8. Manual dashboard route/access smoke results.
9. RPA wrapper implementation plan or static-hosting proof.
10. Data/RAG doc-only or compatibility-path first move.
11. Archive/deprecation only after smoke and consumer checks.

## 12. Relationship to existing docs

- [`final-migration-readiness-report.md`](final-migration-readiness-report.md)
- [`enterprise-migration-closure-audit.md`](enterprise-migration-closure-audit.md)
- [`archive-cleanup-candidates.md`](archive-cleanup-candidates.md)
- [`public-page-mirror-source-policy.md`](public-page-mirror-source-policy.md)
- [`public-page-wrapper-strategy.md`](public-page-wrapper-strategy.md)
- [`dashboard-route-access-smoke-test.md`](dashboard-route-access-smoke-test.md)
- [`dashboard-route-compatibility-map.md`](dashboard-route-compatibility-map.md)
- [`investment-css-consumer-audit.md`](investment-css-consumer-audit.md)
- [`investment-js-orchestrator-cleanup-plan.md`](investment-js-orchestrator-cleanup-plan.md)
- [`investment-data-rag-migration-audit.md`](investment-data-rag-migration-audit.md)
