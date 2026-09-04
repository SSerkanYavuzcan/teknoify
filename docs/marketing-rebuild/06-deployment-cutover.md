# 06 — Deployment Cutover Verification & Production Ownership Lock (Phase A.3)

Date: 2026-09-05. Branch: `chore/marketing-rebuild-audit`. Builds on doc 05 (Phase A.2). Evidence labels: **CONFIRMED** / **LIKELY** / **UNVERIFIED**, applied strictly. Nothing was merged, pushed, or deployed; no Netlify, Firebase, GitHub or DNS setting was changed.

> **Update, same day.** Sections 1–13 were written before the Netlify and GitHub UIs were read. The owner then supplied the verified settings; **§14–§20 below incorporate them and supersede §2, §4, §8, §11, §12 and §13 wherever they differ.** In particular: the demo site does **not** use `demo/` as its base directory; both sites use base `/`, and the demo site differs only by publish directory `demo`.

---

## 1. Ownership decision (locked)

Recorded as `docs/decisions/ADR-0002-marketing-platform-ownership.md`: `teknoify.com` is anonymous public marketing; authentication, users, sessions, entitlements, premium logic, dashboards and account flows belong to `platform.teknoify.com`. Existing implementations of those concepts here are legacy and scheduled for removal; compatibility is handled by routing, not by retaining auth code. The transitional files in the artifact (`reset-password.html`, two premium previews, `js/session-manager.js`, `js/premium-content-gate.js`) are the only exceptions, each with a written sunset condition in the manifest.

---

## 2. What could be read about the Netlify sites from this environment

No Netlify CLI, credential file, environment variable, or `.netlify/` state exists on this machine (checked `netlify --version`, `%APPDATA%\netlify\Config\config.json`, `~/.netlify`, `~/.config/netlify`, `NETLIFY*` env, repository history). Netlify site settings therefore cannot be read here. Everything below comes from GitHub API data (`gh` is authenticated, read-only calls only), live HTTP behaviour, and the official Netlify documentation fetched during this phase.

### 2.1 Main site (`teknoify.com`)

| Field | Value | Label | Evidence |
| --- | --- | --- | --- |
| Site name (subdomain) | `fancy-klepon-8eac4e` | LIKELY | PR commit status context `netlify/fancy-klepon-8eac4e/deploy-preview`; `fancy-klepon-8eac4e.netlify.app` serves byte-identical `/js/script.js` and the same `<title>` as `teknoify.com`. Netlify status contexts use the site name, so this is close to certain, but the UI has not been read. |
| Site ID | — | UNVERIFIED | Only visible in the UI / API. |
| Custom domains | `teknoify.com`, `www.teknoify.com` (301 → apex) | CONFIRMED (behaviour) | `Server: Netlify` on both; www redirects. |
| Repository | `SSerkanYavuzcan/teknoify` | CONFIRMED | Deploy Preview statuses are posted to this repository's PR commits. |
| Production branch | `main` | CONFIRMED (behaviour), UNVERIFIED (setting) | Production serves the Sep 4 bot commit's data file (doc 05 §1). |
| Base directory | repository root | LIKELY | Every repository-root file is served at `/` (21 probes), and `/docs/marketing-rebuild/README.md` from this branch is absent. A non-root base would not publish root files. |
| Build command | none | LIKELY | Files are served as committed (identical JS bytes); no build output exists. |
| Publish directory | repository root (`/`) | CONFIRMED (behaviour) | Same evidence. |
| Deploy Previews | enabled | CONFIRMED | "Deploy Preview ready!" statuses on PR commits `76e4bfb`, `82a0d7c`, `fecc6c5`, `e40791e`, `a2ce522`; preview `deploy-preview-318--fancy-klepon-8eac4e.netlify.app` still `200`. |
| Branch deploys | — | UNVERIFIED | Not observable from outside. |
| `netlify.toml` applied | there is none in the repository today | CONFIRMED | `git log --all` never contained one. After merge, Netlify would read the root file (docs: "The netlify.toml is normally stored in the root of your site repository"). |
| UI overrides / conflicts | unknown | UNVERIFIED | Per Netlify docs, "settings specified in `netlify.toml` override any corresponding settings in the Netlify UI", so a UI build command or publish directory would be overridden, not conflict. What remains unknown is whether the UI defines environment variables, a deploy hook, or a Pretty URLs toggle that the toml would change (see §3 checklist). |
| Monorepo / package directory | not used | LIKELY | Root publishing observed. |
| Post-processing | link rewriting active (`href="pages/x.html"` → `href='/pages/x'`; `/pages/rpa/` → `301` → `/pages/rpa`; `.html` still `200`) | CONFIRMED (behaviour) | Note: current Netlify docs describe Pretty URLs as rewriting `/about.html` to `/about/` (trailing slash), which is **not** what production does. The site LIKELY runs the older post-processing behaviour; the toml pins `pretty_urls = true` and the first Deploy Preview must show the same rewriting before merge. |

### 2.2 Demo site (`demo.teknoify.com`)

| Field | Value | Label | Evidence |
| --- | --- | --- | --- |
| Site name | `teknoify-demo` | LIKELY | Status context `netlify/teknoify-demo/deploy-preview`; `teknoify-demo.netlify.app` serves the Demo Lab page. |
| Custom domain | `demo.teknoify.com` | CONFIRMED (behaviour) | Same content hash class and title as the `.netlify.app` host; `Server: Netlify`. |
| Repository | `SSerkanYavuzcan/teknoify` | CONFIRMED | Preview statuses on this repo's PRs (present since PR #309/#310 era, absent at PR #231). |
| Production branch | `main` | LIKELY | Its content matches `main`'s `demo/` folder. |
| What is published | the contents of `demo/` as site root | CONFIRMED (behaviour) | `/index.html`, `/scripts/app.js`, `/scripts/demo-catalog.js`, `/data/demos.js`, `/styles/index.css`, **`/README.md`** are `200`; `/css/style.css`, `/pages/rpa.html`, `/demo/`, `/package.json` are `404`. |
| How that is configured | base `/`, package directory not set, publish directory `demo`, no build command | **CONFIRMED (UI, §14)** | Earlier text in this table and in §4 that considered base = `demo/` is superseded. |
| Build command | none | LIKELY | Raw files served, including `README.md`. |
| Deploy Previews | enabled | CONFIRMED | Statuses; `deploy-preview-318--teknoify-demo.netlify.app` `200`. |
| Post-processing | **no** link rewriting | CONFIRMED (behaviour) | Its served `index.html` keeps `href="/pages/gizlilik.html"` etc., whereas the same file at `teknoify.com/demo/` is rewritten to `href='/pages/gizlilik'`. |
| Current defect | unstyled | CONFIRMED | `demo/index.html` links `/css/style.css` absolutely; that path is `404` on the demo site. The page also links `/pages/*.html` and `/images/favicon.*`, all `404` there. Its own `<link rel="canonical">` points at `https://teknoify.com/demo/`. |

---

## 3. Minimal manual verification checklist (Netlify UI)

Report these values back; nothing else is needed and none is a secret.

**Main site** (`app.netlify.com` → the site whose primary domain is `teknoify.com`)
- Site name (the `*.netlify.app` subdomain): ______ (expected `fancy-klepon-8eac4e`)
- Build & deploy → Continuous deployment → Build settings: **Base directory** ______ · **Package directory** ______ · **Build command** ______ · **Publish directory** ______
- Build & deploy → Branches and deploy contexts: **Production branch** ______ · **Deploy Previews** (any PR / none) ______ · **Branch deploys** (none / all / list) ______
- Build & deploy → Environment variables: **any defined?** (names only) ______
- Build & deploy → Build hooks: **any defined?** (yes/no) ______
- Build & deploy → Post processing: **Pretty URLs** (on/off) ______ · **Asset optimization** (any option on?) ______
- Deploys: **ID and date of the current production deploy** ______ (this is the rollback target, §10)

**Demo site** (`teknoify-demo`)
- Build settings: **Base directory** ______ · **Package directory** ______ · **Build command** ______ · **Publish directory** ______
- **Production branch** ______ · **Deploy Previews** ______ · **Branch deploys** ______
- Domain management: is `demo.teknoify.com` a custom domain on this site, and should it keep existing? ______

---

## 4. Effect of the root `netlify.toml` on the demo site

Documented Netlify behaviour (fetched 2026-09-05):
- "settings specified in `netlify.toml` override any corresponding settings in the Netlify UI".
- With a base directory set, Netlify searches for configuration files in this order: **package directory → base directory → root directory** (monorepo docs). The root file is therefore the *fallback* for every site built from this repository that has no closer `netlify.toml`.
- "All paths configured in the `netlify.toml` should be absolute paths relative to the base directory".
- "A base directory specified in a root-level `netlify.toml` overrides the UI setting."

Consequences for the two possible demo-site configurations:

| Demo configuration (UNVERIFIED which) | Root `netlify.toml` after merge | Outcome |
| --- | --- | --- |
| Base = `demo/` (no `demo/netlify.toml`) | Applied as fallback | `command = "npm run check:public"` runs inside `demo/` where there is no `package.json` → **build fails**; `publish = "dist"` resolves to `demo/dist`. A failed build does not replace the last published deploy, so `demo.teknoify.com` keeps serving today's content but every future push logs a failed demo build. |
| Base = root, publish (or package dir) = `demo` | Applied and overriding the UI | `publish = "dist"` overrides `demo` → the demo site would **publish the marketing artifact**. To prevent exactly this, `build.mjs` now refuses to run when Netlify's `SITE_NAME` is not the marketing site (exit 3, message names the actual site), so the build fails and the demo site keeps its last deploy. |

Either way the root file is **safe against data loss or wrong content** (a failed build never publishes) but **not acceptable as a steady state** (permanent build failures on the demo site). Therefore the demo site's configuration must be read and one isolation model chosen **before** merging:

| Isolation model | When it applies | Notes |
| --- | --- | --- |
| **Retire the demo site** and serve the demo only at `teknoify.com/demo/` (the page's own canonical), pointing `demo.teknoify.com` at a domain-level redirect | Recommended in all cases | The demo site is unstyled today and duplicates content; the artifact already contains `/demo/`. A `_redirects` rule for `https://demo.teknoify.com/*` can only be added once that host is attached to the main site. |
| **Site-specific config**: `demo/netlify.toml` with `publish = "."` and no build | Only if base directory = `demo/` (search order makes it win over the root file) | Would publish `demo/` including its `README.md`, as today. Wrong if base = root (then `publish = "."` means the repository root). Not added in this phase because the base directory is unknown. |
| **Monorepo-style**: keep base = root, set the demo site's *package directory* to `demo/`, and give it `demo/netlify.toml` | Only if the UI is changed to that model | Netlify's documented pattern for several sites in one repo; paths in `demo/netlify.toml` are then relative to root (`publish = "demo"`). |
| **Move demo deployment ownership elsewhere** | Later | The demo is marketing content; it belongs in this artifact, not in a separate site. |

Guard implemented in this phase (trivial, isolated, necessary): `scripts/public-artifact/manifest.json → netlify.siteName` plus the refusal in `build.mjs` (tested: `SITE_NAME=teknoify-demo` → exit 3 and no output directory; `SITE_NAME=fancy-klepon-8eac4e` → normal build). Netlify documents `SITE_NAME` as "name of the site, its Netlify subdomain" and it is set for Deploy Previews as well, so the first preview build log of the PR both validates the guard and confirms the real site name.

---

## 5. Main-site cutover contract validation

Model: repository → `npm run check:public` (= `build:public` then `verify:public`) → `dist/` → Netlify publishes `dist/`.

| Property | Result | Evidence |
| --- | --- | --- |
| Deterministic | CONFIRMED | Three consecutive in-place builds produce the same artifact hash; the hash covers every file's sha256. |
| Reproducible from a clean checkout | CONFIRMED | `git archive HEAD` exported to an empty directory (no `node_modules`, no `dist`, no report) → `npm run check:public` exits 0 with the **same hash** as the working tree after line-ending normalization (see below). |
| Independent of developer-local files | CONFIRMED | The clean export contains only tracked files; `.artifact-report.json`, `dist/`, `node_modules/` are ignored and absent there. |
| Independent of ignored runtime artifacts | CONFIRMED | A planted `dist/docs/README.md` was removed by the build (`rm -rf` of the output directory first). |
| Independent of checkout line-ending mode | CONFIRMED after a fix in this phase | The first clean-export run differed only in CR bytes (Windows checkout CRLF vs export LF). `build.mjs` now writes every text file (`.html .css .js .mjs .svg .xml .txt .json .webmanifest`, plus `_headers`/`_redirects`) with LF, the form Git stores; `--keep-eol` disables it. Zero CR bytes remain in the artifact. |
| Zero dependency | CONFIRMED | The scripts use only `node:fs`, `node:path`, `node:crypto`, `node:url`; no `npm install` was run in the clean export. Netlify will still run `npm install` because `package.json` exists (installing the unused `firebase-admin` tree); harmless, and it disappears with the legacy cleanup. |
| Safe on Node 20 | LIKELY | Only stable APIs are used (`fs/promises`, `String.prototype.matchAll`, `URL`, ES modules); tested on Node 24.13.1. `netlify.toml` pins `NODE_VERSION = "20"`; the Deploy Preview build is the Node 20 test. |
| Reproduces the current legitimate marketing surface | CONFIRMED | 76 files; 14 entry pages; local serving of `/`, RPA, investment analytics, `/demo/`, `404.html` with zero failed same-origin requests (doc 05 §5). |
| Fails closed | CONFIRMED | Negative tests: injected internal files → verifier exit 1; forbidden entry (`dashboard/admin.html`) → build exit 1; wrong Netlify site → build exit 3. |

---

## 6. Public / private separation, expected post-cutover behaviour

All of the following are `200` on production today and **absent from `dist/`** (checked file-by-file), so after cutover Netlify serves `404.html` for them:

| Category | Representative URLs (all currently 200) | Post-cutover |
| --- | --- | --- |
| Python source | `/scripts/update-usd-try-rates.py`, `/services/equity-data-service/app/main.py`, `/dashboard/web-scraping/backend/main.py` | 404 |
| Deploy scripts / infra | `/dashboard/bim-istekleri/backend/deploy.sh`, `/render.yaml` | 404 |
| Internal docs | `/docs/README.md`, `/ARCHITECTURE.md`, `/DEVELOPMENT.md`, `/CHANGELOG.md` | 404 |
| Package / dev metadata | `/package.json`, `/package-lock.json`, `/eslint.config.js`, `/tools/stylelint/package.json` | 404 |
| Internal data | `/data/entitlements.json`, `/data/stock/turkey/document-catalog.json`, `/data/stock/turkey/mgros/reports/mgros-2026-q1-activity-report.pdf` | 404 |
| Backend / app source | `/api/chat.js`, `/dashboard/admin.html` (redirect rule → `302` to platform), `/domains/corporate-automation/rpa/page.html` (`404` rule) | 302 / 404 |
| Legacy auth pages | `/pages/login.html` (`302`), `/pages/impersonate.html` (`404`) | 302 / 404 |

Structural guarantee: the verifier rejects any `.py .md .yaml .yml .toml .sh .ps1 .env .example .lock .geojson .pdf` file, any `docs/ .github/ dashboard/ services/ scripts/ api/ tools/ apps/ packages/(non-config) _archive/ node_modules/ data/(non-allowed)` prefix, `README.md` anywhere, `package.json`/`render.yaml`/`netlify.toml` basenames, and private-key / service-account / `firebase-admin` content markers, independent of today's filenames.

---

## 7. Redirect strategy for legacy application URLs (ownership applied)

| URL(s) | Class | Rule now (artifact) | Note |
| --- | --- | --- | --- |
| `/dashboard/*` (all 32 pages and their assets) | **REDIRECT TO PLATFORM NOW** (root) / **TARGET TBD** (per route) | `302 https://platform.teknoify.com/` | Only the platform root is known to exist. Upgrade to `301` with per-route targets when the platform publishes its URL contract. |
| `/pages/login`, `/pages/login.html`, `/login.html` | **REDIRECT TO PLATFORM NOW** / **TARGET TBD** (sign-in URL) | `302 https://platform.teknoify.com/` | |
| `/pages/impersonate*`, `/pages/unauthorized*` | **RETIRE / 404** | `404 /404.html` | Admin tooling, no product purpose. |
| `/domains/*` | **RETIRE / 404** | `404 /404.html` | Unrouted mirrors. |
| `/reset-password.html` | **TEMPORARY COMPATIBILITY** → **REDIRECT TO PLATFORM LATER** | served (transitional page) | Kept only until the Firebase e-mail action URL points at the platform (U4); then `301` with query passthrough (Netlify passes query strings for 301/302 by default, documented). This is the one place auth code remains in the artifact, time-boxed. |
| `/pages/investment-retail`, `/pages/investment-airlines` | **TEMPORARY COMPATIBILITY** → **REDIRECT TO PLATFORM LATER** / **TARGET TBD** | served (transitional pages, `Disallow`ed) | Premium previews; platform hosts the capability. |
| `/pages/subscription` | **TEMPORARY COMPATIBILITY** (public pricing content) | served (entry page) | Not auth; but its CTAs reference premium gating. Phase B decides `/pricing`. |
| Login modal on `/` and 14 pages (`#loginModal`, `.trigger-login`) | not a URL; **RETIRE** in the legacy-exit step | present (unchanged HTML) | Replaced by a link to the platform sign-in URL (TARGET TBD). |
| `/api/chat`, `/api/chat-log` | **RETIRE / 404** | absent → `404` | Already 404 in production. |
| `/index.html` | keep | served | canonical decision Phase B. |
| `https://www.teknoify.com/*` | keep | `301! https://teknoify.com/:splat` | Codifies the UI domain redirect. |
| `https://demo.teknoify.com/*` | **TARGET: `https://teknoify.com/demo/`** | not possible yet | Requires the demo host to be attached to the main site (§4). |

Netlify's documented redirect status codes are `200, 301, 302, 404` (`410` is not documented), so retired URLs use `404`.

---

## 8. Branch protection plan

Facts: `main` is unprotected (CONFIRMED); the repository is **user-owned and public**; two GitHub Actions workflows push to `main` with the default `GITHUB_TOKEN` (`contents: write`). GitHub docs fetched in this phase: "Actors may only be added to bypass lists when the repository belongs to an organization" (classic branch protection); rulesets have separate bypass handling. Pushes made with `GITHUB_TOKEN` are subject to the same protections as any other push (LIKELY per GitHub's documented model; not separately verified).

**Required before redesign begins (settings → Branches or Rules → Rulesets, target `main`):**
1. Require a pull request before merging; required approvals: **1** (with a single maintainer today this means self-review of a PR opened from a branch; raise to 1 external approver when a second maintainer exists).
2. Dismiss stale pull request approvals when new commits are pushed.
3. Require conversation resolution before merging.
4. Require status checks to pass: initially **Netlify Deploy Preview** (`netlify/fancy-klepon-8eac4e/deploy-preview`), plus a GitHub Actions job running `npm run check:public` once added (the boundary PR can add `.github/workflows/public-artifact.yml`).
5. Block force pushes and deletions of `main`.
6. Apply the rules to administrators ("Do not allow bypassing the above settings") — with one owner this is the only way the rules mean anything.
7. Restrict direct pushes to `main` (implicit in 1 with 6).

**Bot workflows and protection:** with rule 1 active, the daily `update-usd-try-rates.yml` push will be rejected (no bypass actors are possible on a user-owned repo with classic protection; a ruleset could exempt "repository admin" but `GITHUB_TOKEN` is not an admin). Options, in order of preference: (a) **move the data pipeline to the platform/data repository** (its output is investment-product data; the investment page will move too); (b) until then, change the workflow to open a pull request (for example with `peter-evans/create-pull-request`) and enable auto-merge once checks pass; (c) run the workflow with a personal access token of the owner and a ruleset that lets repository admins bypass — rejected, it weakens the protection the site needs. Do not disable the workflow in this phase; it feeds production data.

**Can be improved later:** CODEOWNERS (`/public/`, `/netlify.toml`, `/scripts/public-artifact/` owned by the site maintainer), required signed commits, a merge queue, linear history, secret scanning / push protection (free for public repos), Dependabot for the toolchain once `firebase-admin` is gone.

---

## 9. Deploy Preview model

Available today (CONFIRMED): Netlify builds a Deploy Preview for every PR on both sites and posts a commit status with the preview URL. Therefore the desired lifecycle `main → feature branch → PR → automated checks → Deploy Preview → visual review → merge → production` is already half-configured:

| Step | Status | To configure |
| --- | --- | --- |
| Feature branch → PR | practice in place (282 merges) | Branch protection makes it mandatory (§8). |
| Automated checks | none | Add `public-artifact.yml` running `npm run check:public` on `pull_request`; make it a required check. |
| Deploy Preview | CONFIRMED enabled | With `netlify.toml` merged, previews run the same build as production, so the preview is the true pre-production test. The first preview of the boundary PR must be inspected for: `SITE_NAME` in the log, link rewriting, `_redirects` and `_headers` taking effect, the 13 sitemap URLs `200`, internals `404`. |
| Visual review | manual | Viewport matrix 375/768/1440 on the preview URL. |
| Merge → production | automatic on `main` | Unchanged. |

Not deployed in this phase; opening the PR (a push) is the first action that creates a preview and is deferred until instructed.

---

## 10. Rollback contract for the first cutover

| Layer | Action | Time | Notes |
| --- | --- | --- | --- |
| Netlify deploy | Deploys → select the last root-published production deploy (record its ID from the checklist in §3 **before** merging) → "Publish deploy" | seconds | Restores the exact previous site including the legacy dashboard URLs, without any Git change. Netlify also offers "Lock to this deploy" to stop auto-publishing while investigating. |
| Git | `git revert <merge-commit>` of the boundary PR on `main` (removes `netlify.toml`, `public/`, `scripts/public-artifact/`, the `package.json` scripts) | minutes | Netlify then builds `main` again with UI settings (no toml → root publishing). The previous production model is any commit without `netlify.toml`; the reference commit is **`24f3044`** (last root-published state that also predates all Phase A/A.2/A.3 changes). |
| Configuration | Nothing in the Netlify/Firebase/Render/DNS UI is changed by the cutover, so nothing needs to be reverted there | — | This is why the demo-site question must be settled by reading the UI, not by changing it, before merge. |
| Data workflows | continue to commit to `main` in either model | — | A revert does not affect them. |

Everything the cutover introduces is reversible by one revert; the only irreversible actions (deleting legacy files, changing Firebase/Render links) are explicitly deferred to later PRs.

---

## 11. Merge-readiness verdict

**NOT MERGE-READY.** Concrete blockers, each a read-only UI action:

1. **Demo site configuration unknown** (§2.2, §4): read `teknoify-demo`'s base/package/publish settings and choose its isolation model (recommended: retire it and redirect `demo.teknoify.com` → `teknoify.com/demo/`). Until then the merged toml would put the demo site into permanent build failure.
2. **Main site name and UI settings unconfirmed** (§2.1, §3): the `siteName` guard is set to the LIKELY value; a wrong value fails the marketing site's own build. The checklist values (site name, env vars, build hooks, Pretty URLs toggle, current production deploy ID) are needed; the production deploy ID is also the rollback anchor.
3. **No required check / branch protection** (§8): merging the boundary PR through an unprotected `main` with an unreviewed Deploy Preview is exactly the class of change the boundary exists to prevent. At minimum, protection rules 1, 5 and 6 and the Deploy Preview status must be in place, and the bot workflow's PR-based path (§8 option b) or relocation (a) decided so protection does not silently break the data feed.

Not blockers (already resolved or acceptable): artifact determinism and reproducibility; internals exclusion; redirect rules for legacy URLs; rollback path; Deploy Previews availability; `api.teknoify.com` (pre-existing, unchanged by the cutover).

---

## 12. Next PR plan (prepared, not opened)

**Title:** `chore(deploy): publish teknoify.com from a verified public artifact instead of the repository root`

**Scope (production safety only):** `netlify.toml`; `public/` (`_redirects`, `_headers`, `robots.txt`, `sitemap.xml`, `404.html`); `scripts/public-artifact/` (manifest, build, verify, lib); `package.json` scripts (`build:public`, `verify:public`, `check:public`); `.gitignore` additions; `docs/marketing-rebuild/05` and `06`, `docs/decisions/ADR-0002`; optionally `.github/workflows/public-artifact.yml` running `npm run check:public` on pull requests.

**Explicitly excluded:** any change to `index.html`, `pages/*.html`, CSS, JS; legacy deletions; framework migration; design work; Firebase/Render/workflow changes.

**Description (concise):**
> Production currently publishes the repository root, so backend source, docs, datasets and package metadata are served at teknoify.com and every file added to the repo goes live. This PR switches Netlify to publish a constructed `dist/` produced by `npm run check:public`: an allow-listed set of public pages and their referenced assets, verified to contain no internal paths, plus routing-level compatibility for legacy dashboard/login URLs (302 to platform.teknoify.com, targets TBD), security headers with a report-only CSP, robots, sitemap and a 404 page. No page, script or stylesheet changes. Build is deterministic and dependency-free; a site guard refuses to run for any Netlify site other than the marketing site. Rollback: republish the previous deploy in Netlify or revert this PR (`24f3044` is the last root-published reference). Pre-merge checklist: Deploy Preview shows `SITE_NAME`, link rewriting, redirects/headers, 13 sitemap URLs 200 and internals 404; demo-site isolation decided; branch protection enabled.

---

## 13. Remaining external unknowns (superseded by §20)

U1 (main-site UI settings, env vars, hooks, Pretty URLs toggle, production deploy ID), U2/U13 (demo site base/package directory and its future), U3 (shared Firebase project), U4 (reset e-mail action URL), U6 (contact endpoint from another network), U7 (Search Console), U14 (UI build settings the toml would override). U5 and U11 are resolved (doc 05). New in this phase: U15 — whether the observed link rewriting (`/x.html` → `/x`, no trailing slash) is reproduced by `[build.processing.html] pretty_urls = true` on a fresh build, given current docs describe a trailing-slash form; the first Deploy Preview answers it.

---

# Phase A.3 (continued) — verified external configuration

## 14. Confirmed Netlify and GitHub configuration

Supplied from the Netlify and GitHub UIs on 2026-09-05. All rows **CONFIRMED** unless labelled.

| Setting | Main site (`teknoify.com`) | Demo site (`demo.teknoify.com`) |
| --- | --- | --- |
| Repository | `SSerkanYavuzcan/teknoify` | `SSerkanYavuzcan/teknoify` |
| Production branch | `main` | `main` |
| Branch deploys | production branch only | production branch only |
| Deploy Previews | enabled for PRs against the production branch | enabled for PRs against the production branch |
| Base directory | `/` | `/` |
| Package directory | not set | **`demo`** — CONFIRMED (set in the Netlify UI on 2026-09-05 after §20's blocker was raised; previously "not set") |
| Build command | not set | not set |
| Publish directory | `/` | `demo` |
| Build status | Active | Active |
| Site name (`*.netlify.app`) | `fancy-klepon-8eac4e` — **LIKELY** (not among the supplied values; from PR statuses plus identical served JS) | `teknoify-demo` — **LIKELY** (same basis) |

GitHub: the repository is `SSerkanYavuzcan/teknoify` (public). The local folder name `teknoify-marketing` is only a clone name; there is no separate marketing repository and none will be created. **No repository rulesets and no branch protection exist on `main`** (CONFIRMED; matches the API result in doc 05). The repository, its history and both Netlify relationships remain intact.

Corrections to earlier text: doc 05 §4/§9/§13/§14 and doc 06 §2.2/§4 treated "base directory = `demo/`" as a possibility. It is not the case. The demo site is a plain "same base, different publish directory" configuration.

## 15. Reassessment of the root `netlify.toml`

Documented Netlify behaviour (fetched in this phase): settings in `netlify.toml` override the UI; a configuration file is looked up in the order package directory → base directory → repository root; paths are relative to the base directory.

With both sites at base `/` and no package directory, **the root `netlify.toml` is read by both sites**. For the demo site it would override publish `demo` → `dist` and add the marketing build command; the `SITE_NAME` guard would then fail every demo build (keeping the last deploy but never updating it). That satisfies "no wrong content" but fails "both sites remain operational". **Therefore the root `netlify.toml` as designed in A.2 cannot be merged on its own.** The content of the root file does not need to change; what must change is that the demo site stops reading it.

## 16. Site isolation options

| Option | How it works | Git changes | Netlify UI changes | Deploy Previews | Rollback | Failure modes | Maintainability | Astro/static migration |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **A. Package-directory isolation (Netlify's documented multi-site model)** | Demo site gets Package directory `demo`; Netlify then reads `demo/netlify.toml` first (`publish = "demo"`, no build) and never the root file. Root `netlify.toml` governs only `teknoify.com`. | `demo/netlify.toml` (added; one config key) | **One field**: demo site → Build settings → Package directory = `demo`. Main site unchanged. | Both sites keep building previews, each with its own file. | Revert the PR: root file gone → main site returns to UI root publishing; the demo file pins behaviour identical to its UI, so reverting it changes nothing. | If the package directory is ever cleared, the root file applies to the demo again; the `SITE_NAME` guard then fails that build loudly instead of publishing marketing content. If Netlify merged both files rather than stopping at the first, the demo would inherit root `[build.processing]`/env keys; docs describe a search order, not a merge, and the preview verifies it. | One tiny file per site; no shared script; each contract is readable in its own folder. | Clean: the root file later runs `astro build`; the demo file is untouched. |
| B. Site-specific build dispatch | Root command becomes a dispatcher that inspects `SITE_NAME` (or a per-site env var) and writes the demo surface into `dist/` for the demo site, the marketing artifact for the main site. | Dispatcher script + demo copy logic; single root file. | None (or one env var per site for explicit roles). | Both work. | Revert PR. | Demo deploys depend on the marketing build script forever; a dispatcher bug breaks both sites; identification by `SITE_NAME` is LIKELY-grade until confirmed; `publish = "dist"` is shared, so the demo can never publish a different directory. | Coupled; every marketing build change is a demo risk. | Every future build tool must keep the dispatcher; awkward with Astro's own `astro build` entry point. |
| C. Temporary UI-owned build settings for the demo site | Keep the demo on UI settings by preventing the root file from reaching it. | — | Not achievable without a package/base directory change: the toml overrides the UI whenever it is read. | — | — | Not a real option; it collapses into A. | — | — |
| D. Marketing config in a package directory instead | Main site gets a Package directory (for example `site`) containing the marketing `netlify.toml`; the repository root has no toml; demo untouched. | Move `netlify.toml` into a subfolder; paths stay relative to root. | One field on the **main** site instead of the demo site. | Both work. | Revert PR. | Inverts the risk: a misconfigured main site silently returns to root publishing (the thing being removed) rather than failing loudly. Root has no visible deployment contract. | Acceptable but less discoverable. | Astro expects its config at the package root; workable but non-standard. |
| E. Base-directory isolation (`demo/` as base) | Demo site base = `demo`. | `demo/netlify.toml` with `publish = "."` | One field, plus paths become relative to `demo/`. | Both work. | Same as A. | Changes the demo's dependency-install root and cache; `demo/` has no `package.json`, fine today, but any future demo tooling needs its own. | Equivalent to A with more moving parts. | Equivalent. |
| F. Restructure the demo boundary (retire the site, serve `/demo/` from the artifact) | — | — | Delete site / redirect domain. | — | — | **Excluded**: not decided; the demo site must keep publishing its surface. | — | — |

**Recommendation: A, package-directory isolation.** It is Netlify's documented pattern for several sites in one repository, needs exactly one UI field on the demo site and one one-key file in Git, changes nothing about what the demo site publishes today, keeps the root file a pure marketing contract, keeps both Deploy Preview pipelines working, is reversible by reverting the PR, and leaves the `SITE_NAME` guard as a loud backstop rather than a load-bearing mechanism. `demo/netlify.toml` is added on this branch. It pins today's behaviour exactly (publish `demo/` as-is, no build); the demo site's known styling defect (`/css/style.css` 404 there) is deliberately not addressed, because that is a demo-surface change, not a deployment-safety change.

Note: with publish `demo` the demo site already serves `demo/README.md` publicly and will also serve `demo/netlify.toml`; both are harmless text. The marketing artifact never contains either (`.md` and `.toml` are forbidden extensions and the crawler follows references only; verified after adding the file).

## 17. Role of the `SITE_NAME` guard after isolation

Keep it, as defence in depth only. With option A the demo site never reads the root file, so the guard never fires in normal operation. It fires only if the demo site's package directory is cleared or a third site is attached to the repository; a loud failed build is then strictly better than a silent publish of the marketing artifact under the wrong domain. It is not, and must not become, the mechanism that keeps the demo operational. If the main site's real name differs from the LIKELY value, the first Deploy Preview of the boundary PR fails with a message naming the actual site; the fix is one manifest field. The guard is skipped outside Netlify (`NETLIFY` unset), so local and CI builds are unaffected.

## 18. GitHub protection model (recommendation only; nothing enabled)

Constraints: user-owned public repository; classic branch protection cannot grant bypass actors on user-owned repositories; rulesets are the modern mechanism; two workflows push generated data to `main` with the default `GITHUB_TOKEN`, which is subject to whatever rules exist.

**Bot workflow evolution (must land before or together with protection):**
1. Preferred: relocate `update-usd-try-rates.yml`, `extract-stock-document-text.yml`, their scripts, `data/currency/` and `data/stock/` to the platform/data repository together with the investment analytics consumer (doc 05 §12). Until the consumer moves, the marketing artifact still needs `data/currency/usd_try_rates.json`, so:
2. Interim: change the rates workflow to **open a pull request** instead of pushing (for example `peter-evans/create-pull-request` on a `bot/usd-try-rates` branch) and enable **auto-merge** for it once required checks pass. The `Public artifact check` builds the artifact with the new data, Netlify builds a Deploy Preview, and the merge is automatic; production receives the data minutes later than today, once per day. Requires "Allow auto-merge" in repository settings (currently off) and a PAT or GitHub App token for creating the PR, because PRs opened with the default `GITHUB_TOKEN` do not trigger `pull_request` workflows (documented GitHub behaviour).
3. Rejected: running the bot with an admin token and a ruleset bypass; it makes the owner's token the weakest link and hides bot writes from review.

**Required before substantial redesign (as a ruleset targeting `main`):**
- Require a pull request before merging; 1 approval (self-review with one maintainer; raise later).
- Dismiss stale approvals on new commits; require conversation resolution.
- Required status checks: `Public artifact check / Build and verify dist/` (workflow added on this branch) and the main site's Netlify Deploy Preview status.
- Block force pushes; block deletion.
- No bypass list (rulesets on user-owned repositories allow "repository admin" bypass; leave it off so the rules bind the owner too).
- Enable only after step 2 above is merged; otherwise the daily push is rejected and the rates feed silently stops.

**Hardening that can follow:** CODEOWNERS for `netlify.toml`, `demo/netlify.toml`, `public/`, `scripts/public-artifact/`, `.github/`; required linear history; signed commits; secret scanning with push protection (free on public repos); Dependabot once `firebase-admin` is removed; a second maintainer and one external approval; a merge queue if PR volume warrants it.

## 19. First production-safety PR

**Branch strategy:** open the PR from the existing `chore/marketing-rebuild-audit` branch (it holds only audit docs, the artifact tooling, the two Netlify files, the workflow and `.gitignore`; no page changes). Squash-merge into `main` so one commit is the revert unit. Later work starts from fresh branches off `main`; `main` remains the only production branch.

**Title:** `chore(deploy): publish teknoify.com from a verified public artifact; isolate the demo site`

**Description:**
> Production currently publishes the repository root, so backend source, docs, datasets and package metadata are served at teknoify.com and every file added to the repo goes live. This PR switches the `teknoify.com` Netlify site to publish `dist/`, built by `npm run check:public` from an allow-list of public pages and their referenced assets and verified to contain no internal paths. It adds routing-level compatibility for legacy dashboard/login URLs (302 to platform.teknoify.com; per-route targets TBD), security headers with a report-only CSP, `robots.txt`, `sitemap.xml` and a 404 page. The separate `demo.teknoify.com` site keeps publishing `demo/` unchanged via `demo/netlify.toml`, which Netlify reads once that site's Package directory is set to `demo` (done before merge). A `SITE_NAME` guard prevents any other site from publishing the marketing artifact. No page, script or stylesheet changes. Rollback: republish the previous deploy in Netlify or revert this PR; `24f3044` is the last root-published reference. Docs: `docs/marketing-rebuild/05`, `06`, `docs/decisions/ADR-0002`.

**Scope (files):** `netlify.toml`, `demo/netlify.toml`, `public/*`, `scripts/public-artifact/*`, `.github/workflows/public-artifact.yml`, `package.json` scripts, `.gitignore`, `ARCHITECTURE.md`, `docs/marketing-rebuild/*`, `docs/decisions/ADR-0002-*`. **Excluded:** anything under `index.html`, `pages/`, `css/`, `js/`, `dashboard/`, Firebase, Render, data workflows, design.

**Required automated checks:** `Public artifact check` (GitHub Actions, Node 20, `build.mjs` + `verify.mjs`); Netlify Deploy Preview for the main site; Netlify Deploy Preview for the demo site.

**Deploy Preview checks, main site (`deploy-preview-<n>--fancy-klepon-8eac4e.netlify.app`):**
1. Build log: `SITE_NAME` accepted (no "BUILD REFUSED"), `verify.mjs` green, Node 20.
2. The 13 sitemap URLs return 200 in both forms (`/pages/rpa` and `/pages/rpa.html`); `/demo/` 200; `/` renders the hero and 8 service cards.
3. Served HTML links are rewritten as on production (`href='/pages/rpa'`), confirming `pretty_urls = true` reproduces current behaviour (U15).
4. `/dashboard/admin.html`, `/pages/login.html`, `/login.html` → 302 to `https://platform.teknoify.com/`; `/pages/impersonate.html`, `/domains/corporate-automation/rpa/page.html` → 404 page.
5. `/package.json`, `/docs/README.md`, `/render.yaml`, `/scripts/update-usd-try-rates.py`, `/dashboard/web-scraping/backend/main.py`, `/data/entitlements.json` → 404 page.
6. Response headers on `/` include `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy-Report-Only`; `/data/currency/usd_try_rates.json` → 200 with `Cache-Control: public, max-age=300, must-revalidate`.
7. `/robots.txt`, `/sitemap.xml`, `/404.html` → 200; `/reset-password.html` → 200 (transitional).

**Deploy Preview checks, demo site (`deploy-preview-<n>--teknoify-demo.netlify.app`):** build log shows no marketing build and no refusal; `/` is the Demo Lab page; `/scripts/demo-catalog.js` 200; `/css/style.css` still 404 and `/pages/rpa.html` still 404 (unchanged, known).

**Manual smoke test after merge (production):** repeat checks 2–7 against `teknoify.com`; `curl -I https://www.teknoify.com/` → 301 to apex; `demo.teknoify.com` unchanged; submit nothing but open the contact form and confirm it renders unchanged (it still depends on `api.teknoify.com`); read both sites' deploy logs; record the new production deploy ID.

**Rollback procedure:** (1) Netlify → main site → Deploys → the deploy recorded before merge → "Publish deploy" (seconds; restores root publishing and legacy URLs); optionally "Lock to this deploy". (2) If the code must go too: `git revert` the squash-merge commit on `main` through a PR; Netlify rebuilds from UI settings (root publish). (3) Demo site: nothing to roll back; if its build ever fails, restore the package directory and republish its previous deploy. No Firebase, Render, DNS or workflow change is part of this PR, so none needs reverting.

## 20. Verdict and remaining blockers

**Initial verdict (before the UI change): NOT MERGE-READY** with one blocker, the demo site's Package directory. That blocker was resolved the same day: the owner set Package directory = `demo` on `teknoify-demo` (base `/`, publish `demo`, no build command, Active), CONFIRMED from the Netlify UI.

**Final verdict: MERGE-READY.** Re-evaluation after the change (§21):

- `teknoify.com` (base `/`, no package directory) resolves the **root** `netlify.toml` — the only configuration file on its search path (package → base → root, with package unset and base = root). CONFIRMED by Netlify's documented lookup order.
- `demo.teknoify.com` (base `/`, package directory `demo`) resolves **`demo/netlify.toml`** first and stops there; its `publish = "demo"` (relative to base `/`) equals the UI value, so behaviour is unchanged. CONFIRMED by the same documented order; observed confirmation comes from the PR's demo Deploy Preview.
- The `SITE_NAME` guard is not on either site's normal path: the demo never runs the marketing command, and the main site's name is expected to match. It remains defence in depth only (§17).
- Neither site is designed to fail: the demo site has no build command; the main site's build succeeds locally and in CI. The only way a build fails intentionally is the guard on a misconfigured site.
- The clean-export artifact remains deterministic (§21 re-run).
- Forbidden internal files remain excluded from `dist/` (§21 re-run).

Resolved and no longer listed: all UI settings (§14); artifact determinism, reproducibility, EOL independence, internals exclusion (§5–§6, §21); rollback (§19). Branch protection is required before substantial redesign, not before this PR, and must be preceded by the bot-workflow change (§18); it is deliberately **not** enabled now because the rates automation still pushes to `main`.

Remaining external unknowns unrelated to this PR: U3 (shared Firebase project), U4 (reset e-mail action URL), U6 (contact endpoint from another network), U7 (Search Console), U12 (GA property), U15 (pretty-URL behaviour on a fresh build, answered by the preview). Site names remain LIKELY until the first preview build log.

## 21. Re-verification after the demo-site Package directory was set (2026-09-05)

Resolution model, per Netlify's documented lookup order (package directory → base directory → repository root; first file found wins; `netlify.toml` overrides UI settings; paths relative to base):

| Site | Base | Package dir | File resolved | Effective settings |
| --- | --- | --- | --- | --- |
| `teknoify.com` | `/` | not set | root `netlify.toml` | `command = "npm run check:public"`, `publish = "dist"`, Node 20, post-processing pinned (`pretty_urls = true`, no bundling/minify/image compression) |
| `demo.teknoify.com` | `/` | `demo` (CONFIRMED) | `demo/netlify.toml` | `publish = "demo"` (relative to base `/`), no build command — identical to the UI values, so the demo surface is unchanged |

Checks executed on the branch state that becomes the PR:

| Check | Result |
| --- | --- |
| `npm run check:public` (working tree) | exit 0; 76 files; verifier green |
| Clean `git archive` export, no `node_modules`, no `dist`, `npm run check:public` | exit 0; **artifact hash identical** to the working-tree build |
| `SITE_NAME=teknoify-demo` with `NETLIFY=true` | build refused, exit 3, no output directory (defence in depth) |
| `SITE_NAME=fancy-klepon-8eac4e` with `NETLIFY=true`, `CONTEXT=deploy-preview` | exit 0 |
| `SITE_NAME` set but `NETLIFY` unset (local/CI) | exit 0 (guard inactive outside Netlify) |
| 16 representative internal paths (`.py`, `render.yaml`, docs, `package*.json`, entitlements, stock catalog, `api/`, dashboard, login page, both `netlify.toml`, `demo/README.md`, the workflow) | all absent from `dist/` |
| Verifier negative test (`services/main.py` injected) | exit 1 |
| Both `netlify.toml` files | parse with Python `tomllib`; keys as intended |
| `scripts/public-artifact/*.mjs` | `node --check` clean |
| GitHub Actions workflow | structurally valid (`jobs.check-public-artifact`) |

Conclusions required before the PR is considered ready: `teknoify.com` uses the root marketing configuration — yes; `demo.teknoify.com` resolves `demo/netlify.toml` through Package directory `demo` — yes; the `SITE_NAME` guard remains defence in depth only — yes; both sites build without intentionally failing — yes (the demo has no build step; the main build passes locally, in the clean export and in CI); the clean-export artifact remains deterministic — yes; forbidden internal files remain excluded — yes. Observed confirmation of the two resolution rows comes from the PR's Deploy Previews (§19 checklists).

## 22. Deploy Preview results for PR #319 (commit `7568b2d`, 2026-09-05)

PR: https://github.com/SSerkanYavuzcan/teknoify/pull/319 (open, not merged). GitHub statuses: `netlify/fancy-klepon-8eac4e/deploy-preview` success, `netlify/teknoify-demo/deploy-preview` success, `Build and verify dist/` success, Netlify "Header rules" and "Redirect rules" checks success for the main site (neutral for the demo site, which has none).

**Site names are now CONFIRMED**: the main-site preview built and published, which is only possible if the `SITE_NAME` guard accepted `fancy-klepon-8eac4e`; the demo preview built without running the marketing command, which is only possible if it resolved `demo/netlify.toml` rather than the root file.

Main site preview (`deploy-preview-319--fancy-klepon-8eac4e.netlify.app`):

| Check | Result |
| --- | --- |
| 13 sitemap URLs | all 200, in both extensionless and `.html` form |
| Homepage content | title correct; 32 `service-hub-card` occurrences (8 cards and their CSS hooks) |
| Link rewriting | `href='/pages/rpa'` present in served HTML — `pretty_urls = true` reproduces production behaviour (**U15 resolved**) |
| Legacy redirects | `/dashboard/admin.html`, `/dashboard/member.html`, `/pages/login.html`, `/pages/login`, `/login.html` → 302 `https://platform.teknoify.com/` |
| Retired | `/pages/impersonate.html`, `/pages/unauthorized`, `/domains/corporate-automation/rpa/page.html` → 404 |
| Internals | `/package.json`, `/docs/README.md`, `/render.yaml`, `/scripts/update-usd-try-rates.py`, `/data/entitlements.json`, `/api/chat.js`, `/netlify.toml`, `/demo/netlify.toml`, `/demo/README.md` → 404; `/dashboard/web-scraping/backend/main.py` → 302 (caught by the `/dashboard/*` rule; not served) |
| Headers on `/` | `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy-Report-Only` present. `Strict-Transport-Security` shows `max-age=31536000; includeSubDomains; preload` on the preview host: Netlify's platform HSTS for `*.netlify.app` superseded the `_headers` value. Post-merge check on `teknoify.com`: confirm which HSTS value is served on the custom domain and remove the `_headers` line if Netlify's HTTPS setting already emits one. |
| Data file | `/data/currency/usd_try_rates.json` → 200, `Cache-Control: public,max-age=300,must-revalidate` |
| Plumbing | `/robots.txt`, `/sitemap.xml`, `/404.html`, `/reset-password.html` → 200; unknown path → 404 with the branded page title |

Demo site preview (`deploy-preview-319--teknoify-demo.netlify.app`):

| Check | Result |
| --- | --- |
| `/`, `/index.html`, `/scripts/demo-catalog.js`, `/data/demos.js`, `/styles/index.css`, `/README.md` | 200 — unchanged demo surface |
| `/css/style.css`, `/pages/rpa.html` | 404 — pre-existing, unchanged |
| `/dist/`, `/package.json`, `/netlify.toml` | 404 — no marketing artifact, no repository root, Netlify does not publish its own config file |
| Link rewriting | none (`href="/pages/gizlilik.html"`) — unchanged |
| Marketing `_headers` | not applied (no CSP header) — isolation confirmed |

Not testable on preview hosts: the `www.teknoify.com` domain-level redirect (verify after merge). Verdict unchanged: **MERGE-READY**.
