# ADR-0002: `teknoify.com` is a public marketing surface; authentication and users belong to `platform.teknoify.com`

## Status

Accepted (2026-09-05). Supersedes the implicit assumption in ADR-0001 that this repository hosts the dashboard, admin and auth surfaces.

## Context

Historically this repository served `teknoify.com` as a mixed surface: marketing pages, a Firebase-authenticated dashboard, admin tooling, premium gating, and a password-reset handler, all published from the repository root (see `docs/marketing-rebuild/01-repository-production-audit.md`). A separate product now exists at `platform.teknoify.com` with its own repository, backend, database and authentication.

## Decision

1. **Marketing visitors are not authenticated marketing users.** `teknoify.com` is browsed anonymously. A visitor may later become, or already be, a user of `platform.teknoify.com`; that relationship starts on the platform, not here.
2. This repository therefore does **not** own: authenticated user state, Firebase user state, sessions, authorization, entitlements, premium-user logic, login, signup, password reset, account management, or authenticated dashboards.
3. Any existing functionality built on those concepts is **legacy application functionality** or a **platform concern**. It is scheduled for removal from this repository; Git history (baseline `24f3044`) is its archive. It must not be copied into the platform repository from here.
4. A marketing page may **describe** a paid or premium capability and link to the platform. The capability itself, and any gate around it, is implemented on the platform.
5. Compatibility for legacy URLs (dashboard, login, reset-password) is provided at the **routing level** (redirects in the public artifact), never by keeping Firebase or auth code in the public artifact.
6. Production output of `teknoify.com` is a deliberately constructed public artifact (`dist/`), not the repository root (`docs/marketing-rebuild/05-production-boundary-and-legacy-exit.md`).

## Consequences

- The login modal, Firebase SDK tags, reCAPTCHA/App Check, `js/session-manager.js`, `js/premium-content-gate.js`, `js/lib/**`, `js/pages/**`, `dashboard/**`, `pages/{login,impersonate,unauthorized}.html`, `reset-password.html` and the premium preview pages are removal candidates with the ordering in doc 05 §6 and doc 06 §6.
- Links that used to open the modal will point at the platform's sign-in URL. Until the platform publishes a stable URL contract, redirects target the platform root and are recorded as "platform target TBD".
- Firebase project configuration is not changed from this repository; only references are removed.
- The transitional exceptions (`reset-password.html`, premium previews, the two auth scripts) exist only because public pages still reference them; each has a written sunset condition in `scripts/public-artifact/manifest.json`.

## Alternatives considered

- **Keep a lightweight auth layer on the marketing site for "logged-in" navigation.** Rejected: it recreates the coupling that made the repository unmaintainable and duplicates platform responsibilities.
- **Preserve legacy pages indefinitely for URL compatibility.** Rejected: routing-level redirects achieve compatibility without shipping application code to anonymous visitors.
