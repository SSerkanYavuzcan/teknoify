# Architecture Documentation

## Purpose

Home for architecture inventories, target structure docs, and migration architecture plans.

## Documents

- [`current-inventory.md`](current-inventory.md): Current repository inventory and migration candidates.
- [`folder-structure.md`](folder-structure.md): Target domain-based folder structure.
- [`auth-config-centralization-plan.md`](auth-config-centralization-plan.md): Phase 4A design plan for future auth, Firebase, role access, dashboard config, and shared app configuration centralization. Phase 4B package README updates in `packages/auth`, `packages/config`, and `packages/data-access` support this plan by documenting future module boundaries before runtime files are created.
- [`route-constants-migration.md`](route-constants-migration.md): Phase 4C route constants migration plan, route inventory summary, migration safety rules, and future consumer migration order.
- [`role-access-migration.md`](role-access-migration.md): Phase 4D role/access constants and pure helper migration plan, current inventory summary, preservation rules, and future consumer migration order.
- [`first-auth-consumer-migration-checklist.md`](first-auth-consumer-migration-checklist.md): Phase 4E planning checklist and Phase 4F completion notes for the first `js/lib/auth.js` consumer migration to route and role/access constants, with current behavior notes and smoke-test requirements.
- [`script-login-redirect-migration-checklist.md`](script-login-redirect-migration-checklist.md): Phase 4G documentation-only checklist for a future `js/script.js` login redirect migration, including legacy Firebase/App Check, auth UI, redirect behavior, UI-system risks, and smoke-test requirements.
- [`route-global-bridge.md`](route-global-bridge.md): Phase 4I bridge plan and runtime contract for exposing centralized route constants as `window.TEKNOIFY_ROUTES` to legacy plain scripts before migrating `js/script.js`.
- [`route-bridge-loading-plan.md`](route-bridge-loading-plan.md): Phase 4J documentation-only loading plan for adding the route global bridge to public HTML pages in a later PR.
- [`public-route-bridge-smoke-test.md`](public-route-bridge-smoke-test.md): Phase 4N manual smoke test checklist and result template for validating the public route bridge rollout before fallback cleanup or larger script refactors.
- [`investment-intelligence-migration-plan.md`](investment-intelligence-migration-plan.md): Phase 5A documentation-only migration plan for the Investment Intelligence domain, including inventory, target structure, risks, smoke tests, staged migration order, and Phase 5B README-only skeleton status.

## What belongs here

Architecture decisions, inventories, folder-structure guidance, and migration rules.

## What does not belong here yet

Runtime files, imports, public route changes, or broad formatting updates.

## Migration status

Architecture documentation lives here; Phase 4F migrated only `js/lib/auth.js` to consume centralized route and role constants without moving runtime files.
