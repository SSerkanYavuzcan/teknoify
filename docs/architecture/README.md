# Architecture Documentation

## Purpose

Home for architecture inventories, target structure docs, and migration architecture plans.

## Documents

- [`current-inventory.md`](current-inventory.md): Current repository inventory and migration candidates.
- [`folder-structure.md`](folder-structure.md): Target domain-based folder structure.
- [`auth-config-centralization-plan.md`](auth-config-centralization-plan.md): Phase 4A design plan for future auth, Firebase, role access, dashboard config, and shared app configuration centralization. Phase 4B package README updates in `packages/auth`, `packages/config`, and `packages/data-access` support this plan by documenting future module boundaries before runtime files are created.
- [`route-constants-migration.md`](route-constants-migration.md): Phase 4C route constants migration plan, route inventory summary, migration safety rules, and future consumer migration order.

## What belongs here

Architecture decisions, inventories, folder-structure guidance, and migration rules.

## What does not belong here yet

Runtime files, imports, public route changes, or broad formatting updates.

## Migration status

Architecture documentation lives here; runtime files have not been moved.
