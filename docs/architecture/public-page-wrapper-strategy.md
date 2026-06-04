# Public Page Wrapper Strategy

## 1. Title and purpose

Phase 13A defines the public page wrapper strategy for mirrored public pages. It explains how existing public `pages/*.html` routes can eventually become compatibility wrappers around domain-owned page mirrors without changing live runtime behavior in this phase.

The strategy is intentionally non-runtime. It does not replace any public source page with a wrapper, does not make domain mirrors live routes, and does not change navigation, CSS, JavaScript, auth, payment, subscription, premium, product, deployment, or build behavior.

## Phase 14A enterprise readiness note

Phase 14A includes public page wrapper readiness in the enterprise readiness checker, so any wrapper/runtime candidate remains gated by the all-checkers migration readiness flow plus manual smoke.

## 2. Scope

In scope for this strategy:

- Corporate service public pages.
- Product/funnel public pages.
- Domain page mirrors.
- Public route preservation.
- Static hosting constraints.
- Wrapper readiness gates.

Out of scope for Phase 13A:

- Replacing any live public page with a wrapper.
- Changing public URLs.
- Changing navigation links.
- Changing CSS/JS behavior.
- Changing auth/payment/product behavior.
- Deleting public pages.
- Changing deployment/build behavior.

## 3. Current mirror inventory

| Public Source Page               | Domain Mirror                                                | Area                | Risk Level   | Parity Checker                                                 | Parity Status    | Wrapper Candidate?               | Notes                                                                                                            |
| -------------------------------- | ------------------------------------------------------------ | ------------------- | ------------ | -------------------------------------------------------------- | ---------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `pages/rpa.html`                 | `domains/corporate-automation/rpa/page.html`                 | RPA                 | lower        | `scripts/architecture/check-rpa-page-mirror-parity.js`         | Passing when run | Yes, first candidate             | Lower-risk service page with dedicated and combined mirror parity coverage.                                      |
| `pages/webscraping.html`         | `domains/corporate-automation/web-scraping/page.html`        | Web scraping        | lower/medium | `scripts/architecture/check-corporate-service-page-mirrors.js` | Passing when run | Candidate after RPA              | Service page mirror is covered by the combined corporate service parity checker.                                 |
| `pages/api.html`                 | `domains/corporate-automation/api-automation/page.html`      | API automation      | medium       | `scripts/architecture/check-corporate-service-page-mirrors.js` | Passing when run | Candidate after lower-risk pages | Medium path and integration messaging risk; keep behind RPA and lower/medium service pages.                      |
| `pages/training-consulting.html` | `domains/corporate-automation/training-consulting/page.html` | Training/consulting | lower/medium | `scripts/architecture/check-corporate-service-page-mirrors.js` | Passing when run | Candidate after RPA              | Service page mirror is covered by the combined corporate service parity checker.                                 |
| `pages/subscription.html`        | `domains/products/subscription/page.html`                    | Subscription        | high         | `scripts/architecture/check-product-funnel-page-mirrors.js`    | Passing when run | No, defer first wrapper          | High-risk funnel page with auth, payment, subscription, premium, and conversion behavior concerns.               |
| `pages/ai-assistant.html`        | `domains/products/ai-assistant/page.html`                    | AI Assistant        | high         | `scripts/architecture/check-product-funnel-page-mirrors.js`    | Passing when run | No, defer first wrapper          | High-risk product/tool page with AI Assistant behavior concerns; do not use as the first wrapper implementation. |

## 4. What a wrapper means in this repo

A wrapper in this repository must preserve the existing public route while allowing domain-owned content to become the future ownership source. Because the current live public pages are static HTML files under `pages/`, wrapper language must be conservative until static hosting support is proven.

Possible wrapper models include:

- Keep `pages/*.html` as the public route and source of served HTML.
- Use a future thin compatibility file that loads or redirects to domain-owned content only if static hosting supports that behavior without breaking public URLs, assets, scripts, or forms.
- Avoid assuming that static HTML can import another HTML file at runtime; without a build/deploy strategy, the public page cannot simply include a domain mirror safely.

A safe first wrapper may therefore mean one of the following instead of an immediate runtime wrapper:

- Keeping the public file as the served source while treating the domain mirror as the ownership source.
- Replacing public page content only after byte parity and visual smoke testing pass.
- Introducing a build-time copy strategy in a later dedicated PR.
- Documenting route ownership without changing the served file yet.

## 5. Static hosting constraints

- Direct static HTML cannot safely include another HTML file unless a supported include or build mechanism exists.
- Relative CSS/JS links may break if mirrors are served from domain paths rather than the original `pages/` path.
- Public URLs must stay stable.
- Route wrappers must not break direct links or bookmarks.
- No wrapper should be attempted without smoke testing and a rollback plan.

## 6. First wrapper candidate analysis

| Candidate           | Pros                                                                | Risks                                                                                          | Required Gate                                                                                          | Recommendation                                                                  |
| ------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| RPA                 | Lower-risk service page; already has dedicated and combined parity. | Relative CSS/JS and route-path assumptions still need static-hosting review.                   | Dedicated RPA parity, combined parity, path-risk review, visual smoke, navigation/CTA smoke, rollback. | Keep as the first wrapper candidate after static-hosting strategy is confirmed. |
| Web scraping        | Lower/medium-risk service page covered by corporate mirror parity.  | Should not precede the lower-risk RPA wrapper learning path.                                   | Combined parity, path-risk review, visual smoke, navigation/CTA smoke, rollback.                       | Candidate after RPA proves the wrapper pattern.                                 |
| API automation      | Existing mirror covered by corporate parity.                        | Medium risk because API/integration language and CTAs may have more path or behavior coupling. | Combined parity, path-risk review, visual smoke, navigation/CTA smoke, rollback.                       | Defer until RPA and lower/medium candidates prove the wrapper approach.         |
| Training/consulting | Lower/medium-risk service page covered by corporate mirror parity.  | Consulting and contact CTAs still need smoke coverage.                                         | Combined parity, path-risk review, visual smoke, navigation/CTA smoke, rollback.                       | Candidate after RPA proves the wrapper pattern.                                 |
| Subscription        | Product/funnel mirror already exists and has parity coverage.       | High risk due to auth, payment, subscription, premium, conversion, and session expectations.   | Product parity, full funnel smoke, auth/payment/subscription/premium smoke, rollback.                  | Do not use as the first wrapper candidate.                                      |
| AI Assistant        | Product/tool mirror already exists and has parity coverage.         | High risk due to product tool behavior, scripts, session expectations, and AI Assistant flows. | Product parity, full product tool smoke, auth/session smoke, rollback.                                 | Do not use as the first wrapper candidate.                                      |

RPA should remain the first wrapper candidate because it is lower-risk and already has dedicated mirror parity. Subscription and AI Assistant should not be first wrapper candidates.

## 7. Recommended Phase 13B action

Phase 13B should probably create an RPA wrapper implementation plan only, still non-runtime, unless static hosting support is obvious and explicitly documented.

If the repo has a safe static-hosting wrapper mechanism, Phase 13B may instead propose a controlled RPA wrapper implementation behind parity, smoke testing, and rollback gates. If no safe wrapper mechanism exists, do not replace `pages/rpa.html`; instead, create a domain-source ownership policy where the public route remains full HTML until build tooling exists.

Do not implement a runtime wrapper in Phase 13A.

## 8. Wrapper smoke checklist

| Page                | Route Loads | Layout  | Navigation | CTA     | CSS     | JS      | Forms   | Mobile  | Rollback | Result  |
| ------------------- | ----------- | ------- | ---------- | ------- | ------- | ------- | ------- | ------- | -------- | ------- |
| RPA                 | Not run     | Not run | Not run    | Not run | Not run | Not run | Not run | Not run | Not run  | Not run |
| Web scraping        | Not run     | Not run | Not run    | Not run | Not run | Not run | Not run | Not run | Not run  | Not run |
| API automation      | Not run     | Not run | Not run    | Not run | Not run | Not run | Not run | Not run | Not run  | Not run |
| Training/consulting | Not run     | Not run | Not run    | Not run | Not run | Not run | Not run | Not run | Not run  | Not run |
| Subscription        | Not run     | Not run | Not run    | Not run | Not run | Not run | Not run | Not run | Not run  | Not run |
| AI Assistant        | Not run     | Not run | Not run    | Not run | Not run | Not run | Not run | Not run | Not run  | Not run |

## 9. Rollback plan

If a future wrapper fails:

- Restore original `pages/*.html` full page content.
- Keep the domain mirror unchanged.
- Rerun the relevant parity checker after rollback.
- Do not update navigation until the wrapper is proven.
- Do not delete mirrors or public pages.

## 10. Decision gate

- Do not create runtime wrappers until a safe static hosting strategy is confirmed.
- Do not wrapper high-risk product/funnel pages first.
- Do not delete public pages.
- Do not change navigation links.
- Public page wrappers must preserve CSS/JS relative paths or intentionally update them with smoke coverage.

## 11. Relationship to existing docs

- [`public-service-route-compatibility-map.md`](public-service-route-compatibility-map.md)
- [`corporate-service-page-mirrors.md`](corporate-service-page-mirrors.md)
- [`product-funnel-page-mirrors.md`](product-funnel-page-mirrors.md)
- [`rpa-page-domain-mirror.md`](rpa-page-domain-mirror.md)
- [`enterprise-migration-closure-audit.md`](enterprise-migration-closure-audit.md)
- [`../../apps/web/README.md`](../../apps/web/README.md)
- [`../../domains/corporate-automation/README.md`](../../domains/corporate-automation/README.md)
- [`../../domains/products/README.md`](../../domains/products/README.md)

## Phase 13B source-of-truth policy note

Phase 13B adds the public page mirror source-of-truth policy. The policy now favors public routes in `pages/` as the served source, with domain mirrors as parity ownership preparation until a build/deploy copy mechanism or safe wrapper strategy exists.
