# Marketing Rebuild

Audit and planning documents for transforming this repository into the public marketing site for `https://teknoify.com`, separate from the authenticated platform at `https://platform.teknoify.com`.

Phase A (2026-09-04) is an audit only: no runtime files were changed.

## Documents

- [`01-repository-production-audit.md`](01-repository-production-audit.md): Git baseline, actual stack, repository structure, Netlify/production findings, route/component/asset/dependency inventories, legacy auth findings, responsive/accessibility/SEO/performance findings, quality-gate results.
- [`02-rebuild-boundaries.md`](02-rebuild-boundaries.md): marketing vs platform ownership boundary, KEEP/REBUILD/REMOVE classification matrix, dependency-oriented legacy removal map, production-critical files, known unknowns, risk register.
- [`03-marketing-architecture-proposal.md`](03-marketing-architecture-proposal.md): proposed information architecture, content model, toolchain recommendation, brand/design foundation, responsive and motion principles.
- [`04-phased-implementation-plan.md`](04-phased-implementation-plan.md): phased roadmap with prerequisites, risks, validation and production checkpoints.

## Evidence convention

Findings are labelled CONFIRMED (observed in the repository, a command result, or a live HTTP response), LIKELY (strong indirect evidence), or UNVERIFIED (requires console access outside the repository). Secrets are never reproduced; only variable names or file locations are cited.
