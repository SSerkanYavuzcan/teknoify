# 06 — Deployment Cutover Verification & Production Ownership Lock (Phase A.3)

Date: 2026-09-05. Branch: `chore/marketing-rebuild-audit`. Builds on doc 05 (Phase A.2). Evidence labels: **CONFIRMED** / **LIKELY** / **UNVERIFIED**, applied strictly. Nothing was merged, pushed, or deployed; no Netlify, Firebase, GitHub or DNS setting was changed.

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
| How that is configured (base = `demo` vs base = root + publish/package = `demo`) | — | **UNVERIFIED** | Indistinguishable from outside. This is the blocker: the two configurations react differently to a root `netlify.toml` (§4). |
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

## 13. Remaining external unknowns

U1 (main-site UI settings, env vars, hooks, Pretty URLs toggle, production deploy ID), U2/U13 (demo site base/package directory and its future), U3 (shared Firebase project), U4 (reset e-mail action URL), U6 (contact endpoint from another network), U7 (Search Console), U14 (UI build settings the toml would override). U5 and U11 are resolved (doc 05). New in this phase: U15 — whether the observed link rewriting (`/x.html` → `/x`, no trailing slash) is reproduced by `[build.processing.html] pretty_urls = true` on a fresh build, given current docs describe a trailing-slash form; the first Deploy Preview answers it.
