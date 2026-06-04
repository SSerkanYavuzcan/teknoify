# Dashboard and Corporate Automation Migration Audit

## 1. Purpose

This audit documents the current Dashboard and Corporate Automation migration state. It is governance-only: protected dashboard runtime files and corporate automation runtime pages remain in their current locations.

## 2. Current runtime areas

| Area                                         | Current Location                                | Future Ownership Direction                                        | Phase 10A Status    |
| -------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------- | ------------------- |
| Protected dashboard shell                    | `dashboard/`                                    | `apps/dashboard/`                                                 | Audited, not moved. |
| Dashboard shared auth/config/profile helpers | `dashboard/shared/`                             | `packages/auth/`, `packages/config/`, and dashboard app adapters  | Audited, not moved. |
| Admin dashboard route                        | `dashboard/admin.html`                          | Dashboard app route ownership                                     | Audited, not moved. |
| Premium dashboard route                      | `dashboard/premium.html`                        | Dashboard app route ownership                                     | Audited, not moved. |
| Member dashboard route                       | `dashboard/member.html` and `dashboard/member/` | Dashboard app route ownership                                     | Audited, not moved. |
| Web scraping / quick commerce automation     | `dashboard/web-scraping/`                       | `domains/corporate-automation/` plus `services/scraping-workers/` | Audited, not moved. |
| BIM request automation                       | `dashboard/bim-istekleri/`                      | `domains/corporate-automation/` plus service ownership as needed  | Audited, not moved. |

## 3. Validation command

```bash
node scripts/architecture/check-dashboard-automation-map.js
```

The script verifies that key current dashboard/corporate automation runtime paths and target skeletons still exist, prints dashboard and corporate automation file counts, and confirms that the areas are audited but not moved.

## 4. Phase 10A note

The enterprise readiness checker now runs the dashboard/corporate audit:

```bash
node scripts/architecture/check-enterprise-migration-readiness.js
```

Dashboard and Corporate Automation runtime migration must remain separate from Phase 10A. Future runtime movement requires protected route smoke tests and public route mapping.

## 5. Required smoke gates before movement

- [ ] Auth login/logout smoke.
- [ ] Dashboard admin route smoke.
- [ ] Dashboard premium route smoke.
- [ ] Dashboard member route smoke.
- [ ] Shared dashboard config smoke.
- [ ] Corporate automation public route mapping.
- [ ] Backend/service helper caller search.
- [ ] Rollback path documented.

## 6. Risks

| Risk                                                      | Impact                                                    | Mitigation                                                           |
| --------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------- |
| Moving protected routes before auth smoke                 | Users may lose access or gain incorrect access.           | Keep `dashboard/` authoritative until route/access smoke gates pass. |
| Breaking static dashboard paths                           | Existing links, scripts, or CSS may 404.                  | Preserve URLs or add wrappers/redirects in the same targeted PR.     |
| Moving corporate automation pages without backend mapping | Automation pages may lose API/config/script dependencies. | Map page, script, CSS, backend, and service ownership together.      |
| Accidental archive of dashboard files                     | Rollback path disappears before replacement is verified.  | Archive only in a dedicated PR after route smoke tests pass.         |

## 7. Relationship to existing docs

- [`folder-structure.md`](folder-structure.md)
- [`auth-config-centralization-plan.md`](auth-config-centralization-plan.md)
- [`role-access-migration.md`](role-access-migration.md)
- [`route-constants-migration.md`](route-constants-migration.md)
- [`enterprise-migration-closure-audit.md`](enterprise-migration-closure-audit.md)
