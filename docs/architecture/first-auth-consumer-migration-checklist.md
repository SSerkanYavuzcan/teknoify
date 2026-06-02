# First auth consumer migration checklist

## 1. Title and purpose

This document started as the **Phase 4E** planning/checklist document for the first runtime consumer migration to the new route and role/access constants.

Phase 4E was documentation-only. Phase 4F completed the first runtime consumer migration by updating only `js/lib/auth.js` to use the centralized route and role helpers while preserving Firebase setup, App Check setup, redirects, impersonation behavior, dashboard pages, and data files.

## 2. Candidate first consumer

`js/lib/auth.js` was selected as the first runtime consumer to migrate because it already contained:

- dashboard route helper behavior through `getDashboardPath`;
- role defaulting and role-type assumptions through `buildRealSession`, `getEffectiveSession`, and `requireAuth`;
- exported `requireAuth` route-guard behavior used by dashboard entry points;
- exported `logout` behavior used by dashboard UI;
- unauthorized and unauthenticated redirect behavior; and
- the impersonation localStorage key shared with admin/sidebar flows.

The Phase 4F runtime PR focused only on swapping equivalent route and role logic inside `js/lib/auth.js` after this checklist was reviewed.

## 3. Current behavior snapshot

### `js/lib/auth.js` imports and Firebase usage

Current imports are:

- `auth`, `db`, and `app` from `/js/lib/firebase.js`.
- `getDashboardRouteForRole` and `PUBLIC_ROUTES` from `/packages/config/routes.js`.
- `DEFAULT_ROLE_STATUS`, `DEFAULT_ROLE_TYPE`, `getRoleTypeFromRole`, `isAdminRole`, and `isRoleAllowed` from `/packages/auth/roles.js`.
- `onAuthStateChanged` and `signOut` from Firebase Auth v9.23.0 CDN.
- `doc` and `getDoc` from Firebase Firestore v9.23.0 CDN.
- `initializeAppCheck` and `ReCaptchaV3Provider` from Firebase App Check v9.23.0 CDN.

Firestore usage is limited to reading `users/{uid}` documents through `getDoc(doc(db, "users", uid))` inside `readUserDocument`. Auth usage is limited to `onAuthStateChanged(auth, ...)` in `waitForAuthUser` and `signOut(auth)` in `logout`.

### App Check initialization and debug token behavior

If `app` is truthy, `js/lib/auth.js` initializes App Check immediately at module evaluation time. Before initialization, it sets `window.self.FIREBASE_APPCHECK_DEBUG_TOKEN = true` only when the hostname is `localhost` or `127.0.0.1`. It then calls `initializeAppCheck(app, { provider: new ReCaptchaV3Provider("6LetmtgsAAAAAHOxEkJG4sa29oKLNnAZjQZ1dAwk"), isTokenAutoRefreshEnabled: true })`.

The Phase 4F migration did not reorder this setup, change the site key, change the local debug-token condition, or change token auto-refresh behavior.

### Security-ban behavior

`checkSecurityBan` reads `localStorage.getItem("tk_access_denied")`. When the value is the string `"true"`, it replaces `document.documentElement.innerHTML` with a minimal Turkish 403 page, calls `window.stop()`, and returns `true`. Otherwise it returns `false`.

`requireAuth` calls this check first and returns `null` immediately when the ban page is rendered.

### Impersonation key behavior

`IMPERSONATE_UID_KEY` is the string `"teknoify_impersonate_uid"`. It is used by `getEffectiveSession` and `logout`. If a future PR imports constants, the storage key must still resolve to exactly this value.

`getEffectiveSession` reads the target UID from `window.localStorage`. Impersonation only proceeds when `realSession.isAdmin` is true and a target UID exists. Non-admin sessions ignore the key in this file because the early return happens before any target document read.

When an admin has an impersonation target but the target user document cannot be read, the key is removed and the real session is returned with `impersonating: false`.

When impersonation succeeds, the effective session keeps the real session fields, replaces `uid` with the target UID, replaces `role` with the target document role or the default member role object, sets `impersonating: true`, sets `realIsAdmin: true`, and sets `isAdmin: false`.

### Login path helper behavior

`getLoginPath` currently returns `"/"`. The comment notes that there is no separate login page for this guard path and unauthenticated users are sent to the main page where the login modal exists.

This differs from the route constants file, where `PUBLIC_ROUTES.login` currently points to `/pages/login.html`. Phase 4F preserved the current `js/lib/auth.js` behavior by continuing to redirect unauthenticated guarded-dashboard users to `/` through the home/root route constant instead of the non-equivalent login route constant.

### Dashboard path helper behavior

`getDashboardPath(roleType = "member")` currently builds dashboard paths as follows:

- `"admin"` maps to `/dashboard/admin.html`.
- Any other role type maps to `/dashboard/${roleType}.html`.
- With the default argument, missing role type maps to `/dashboard/member.html`.
- `"premium"` maps to `/dashboard/premium.html` by string construction.
- Unknown strings such as `"owner"` would currently map to `/dashboard/owner.html` if they reach this helper.

The new `getDashboardRouteForRole` helper in `packages/config/routes.js` intentionally normalizes unknown role types to `/dashboard/member.html`. A future PR must account for this difference and should combine role normalization with route resolution so missing/unknown role behavior remains safe and reviewed.

### `waitForAuthUser` behavior

`waitForAuthUser` returns a Promise that subscribes to `onAuthStateChanged(auth, callback)`, immediately calls the unsubscribe function on the first callback, and resolves to the Firebase user object or `null`.

It does not reject on auth listener errors and does not inspect custom claims.

### `readUserDocument` behavior

`readUserDocument(uid)` reads `users/{uid}` from Firestore. It returns `snap.data()` when the document exists and `null` when it does not. On Firestore errors, it logs `console.error("🚨 Firestore Veri Hatası:", err)` and returns `null`.

The collection name `users`, the return shape, and the error-to-null behavior must not change in the first runtime migration.

### `buildRealSession` behavior

`buildRealSession(user)` reads the user's Firestore document and derives:

- `roleData` from `userDoc?.role` or the default object `{ type: "member", status: "active" }`.
- `profileData` from `userDoc?.profile` or `{}`.
- `uid` from `user.uid`.
- `email` from `user.email`.
- `name` from `profileData.fullName` or `user.email.split("@")[0]`.
- `role` from `roleData`.
- `isAdmin` from `roleData.type === "admin"`.

Important role assumptions:

- The default role is an object with `type: "member"` and `status: "active"`.
- `isAdmin` assumes `roleData` has a `.type` property.
- If Firestore stores `role` as the string `"admin"`, `roleData.type` is undefined, so `isAdmin` becomes false in this file today.
- If Firestore stores `role` as the string `"premium"`, `effective.role.type` is also undefined later unless another fallback transforms it.
- `role.status` is preserved when role is an object but is not actively enforced by `requireAuth`.

A future migration to `getRoleTypeFromRole` may improve string-role handling, but that is a behavior-sensitive change and should be called out explicitly if adopted.

### `getEffectiveSession` behavior

`getEffectiveSession(realSession)` returns a shallow copy of the real session with `impersonating: false` unless both conditions are true: the real session is admin and `teknoify_impersonate_uid` exists.

When admin impersonation is active and the target document exists, it preserves the real session's `email` and `name`, changes `uid` to the impersonated UID, changes `role` to the target user's role or the default member role object, marks `impersonating: true`, marks `realIsAdmin: true`, and forces `isAdmin: false` so impersonated sessions do not act as admin sessions.

### `logout` behavior

`logout()` removes `teknoify_impersonate_uid`, awaits `signOut(auth)`, and then calls `window.location.replace("/")`.

The exported signature, storage cleanup, Firebase sign-out call, and root redirect must not change in the first runtime migration.

### `requireAuth` behavior

`requireAuth({ allowedRoles = [] } = {})` behaves as follows:

1. Calls `checkSecurityBan`; returns `null` when access is locally denied.
2. Awaits the first Firebase auth state via `waitForAuthUser`.
3. If no user exists, logs `console.warn("Oturum bulunamadı, ana sayfaya yönlendiriliyor...")`, sets `window.location.href = getLoginPath()`, and returns `null`.
4. Builds the real session from the user document.
5. Builds the effective session, including admin impersonation if applicable.
6. Checks roles only when `allowedRoles.length > 0`.
7. If roles are restricted and `allowedRoles` does not include `effective.role.type`, logs `console.warn("Yetkisiz rol erişimi, dashboard köküne yönlendiriliyor.")`, redirects to `getDashboardPath(effective.role.type)`, and returns `null`.
8. On success, logs `console.log("✅ Oturum başarıyla doğrulandı:", effective.role.type)` and returns the effective session.

### `allowedRoles` behavior and unauthorized redirects

An empty `allowedRoles` array allows any authenticated user. A non-empty array uses direct string inclusion against `effective.role.type`.

Unauthorized users redirect to the dashboard path for their current effective role type. With current object roles, this sends members to `/dashboard/member.html`, premium users to `/dashboard/premium.html`, and admins to `/dashboard/admin.html`. With missing default role, it sends users to `/dashboard/member.html`. With a string role, `effective.role.type` is undefined, which means a restricted page can redirect to `/dashboard/undefined.html` today. The first migration must not accidentally hide this behavior change unless it is intentionally reviewed and documented.

### Console/logging behavior

Current console behavior includes:

- `console.error("🚨 Firestore Veri Hatası:", err)` for Firestore read failures.
- `console.warn("Oturum bulunamadı, ana sayfaya yönlendiriliyor...")` for unauthenticated guarded-page visits.
- `console.warn("Yetkisiz rol erişimi, dashboard köküne yönlendiriliyor.")` for unauthorized role access.
- `console.log("✅ Oturum başarıyla doğrulandı:", effective.role.type)` for successful guard checks.

The first runtime migration should not remove or materially change these log side effects unless the PR explicitly says it is changing logging.

### Related consumers and dependencies inspected

The following files were inspected for dependencies and compatibility constraints, without editing runtime behavior:

- `js/script.js`: owns public-site login modal behavior, legacy/global Firebase initialization, legacy App Check activation, post-login redirect consumption from `tk_post_login_redirect`, and dashboard redirects to `/dashboard/admin.html`, `/dashboard/premium.html`, or `/dashboard/member.html`.
- `dashboard/shared/auth.js`: separate dashboard/project guard that redirects anonymous users to `/pages/login.html`, handles entitlements, uses the same `teknoify_impersonate_uid` key, exposes `window.USER_SESSION`, and has its own logout modal/sign-out flow.
- `dashboard/shared/config.js`: builds `window.PROJECT_CONFIG` with `basePath: "/dashboard/"` and `rootPath: "/"`.
- `dashboard/shared/sidebar.js`: imports `logout` from `/js/lib/auth.js`, appends `teknoify_impersonate_uid` to generated URLs, and links the general dashboard item to `/dashboard/member.html`.
- `dashboard/admin.html`: loads `../js/pages/admin.js`, which imports `requireAuth` and `logout`, gates admin behavior with `session.isAdmin`, and uses the same impersonation key.
- `dashboard/member.html`: loads `/dashboard/shared/sidebar.js` and `/js/pages/member.js`; `member.js` imports `requireAuth`, stores the session on `window.USER_SESSION`, and loads member dashboard data.
- `dashboard/premium.html`: imports `requireAuth` and `logout`, then calls `requireAuth({ allowedRoles: ["admin", "premium"] })`.
- `dashboard/index.html`: imports `requireAuth`, then redirects admin sessions to `/dashboard/admin.html`, premium sessions to `/dashboard/premium.html`, and other sessions to `/dashboard/member.html`.
- `pages/impersonate.html`: provides a manual impersonation helper that writes `teknoify_impersonate_uid` and redirects to selected dashboard routes.
- `pages/investment-retail.html`: uses the public login modal and `js/premium-content-gate.js`; it should not be part of the first `js/lib/auth.js` consumer migration.
- `packages/config/routes.js`: defines non-invasive route constants and `getDashboardRouteForRole(roleType)`.
- `packages/auth/roles.js`: defines role constants, default role type/status, role normalization, and `isRoleAllowed`.
- `packages/auth/premium-access.js`: defines access-level constants and pure premium/authenticated/admin access helpers.

## 4. Phase 4F runtime imports

Phase 4F added root-relative browser ES module imports inside `js/lib/auth.js` similar to the following:

```js
import { getDashboardRouteForRole, PUBLIC_ROUTES } from '/packages/config/routes.js';
import {
    DEFAULT_ROLE_STATUS,
    DEFAULT_ROLE_TYPE,
    getRoleTypeFromRole,
    isAdminRole,
    isRoleAllowed
} from '/packages/auth/roles.js';
```

Only the helpers actually used by `js/lib/auth.js` were imported. `ROLE_TYPES` was not imported because the migrated consumer does not need it directly.

## 5. Exact behavior preservation requirements

- `getLoginPath` must continue returning the same login/root route it returns today: `/`.
- Dashboard redirects must resolve to the same admin, member, and premium pages as today: `/dashboard/admin.html`, `/dashboard/member.html`, and `/dashboard/premium.html`.
- Unknown or missing role must continue to fall back safely to member behavior in reviewed code; if string-role behavior is intentionally normalized, document that as a compatibility fix.
- `allowedRoles` as an empty array must continue to allow authenticated users.
- Unauthorized users must continue to redirect to the same dashboard path for their effective role.
- Unauthenticated users must continue to redirect to the same login/root path.
- The impersonation localStorage key must not change from `teknoify_impersonate_uid`.
- Admin-only impersonation behavior must not change.
- The Firestore users collection name must not change from `users`.
- App Check debug token behavior must not change.
- Firebase/App Check initialization order must not change.
- `logout` must preserve existing cleanup and redirect behavior.
- Current console warnings/errors/logs should remain unless a dedicated logging change is approved.
- The exported `requireAuth` and `logout` function signatures must remain unchanged.

## 6. Phase 4F code-change completion notes

1. `getLoginPath()` now returns `PUBLIC_ROUTES.home`, preserving `/`.
2. `getDashboardPath()` now delegates to `getDashboardRouteForRole(getRoleTypeFromRole(roleType))`, preserving the known admin, premium, and member dashboard routes.
3. Missing role objects now use `DEFAULT_ROLE_TYPE` and `DEFAULT_ROLE_STATUS`, preserving the member/active default object shape.
4. Admin detection now uses `isAdminRole(roleData)`.
5. `requireAuth` now derives the effective role type with `getRoleTypeFromRole(effective.role)` and checks access with `isRoleAllowed(effective.role, allowedRoles)`, preserving empty-array access for authenticated users.
6. The exported `requireAuth` and `logout` signatures remain unchanged.
7. Firebase imports, App Check setup, Firestore reads, and the impersonation storage key were not changed.

## 7. Do-not-change list

- Do not alter Firebase config.
- Do not alter App Check site key.
- Do not alter Firestore collection names.
- Do not alter redirects beyond using equivalent constants.
- Do not alter role permissions.
- Do not alter dashboard route filenames.
- Do not alter login modal behavior.
- Do not alter `js/script.js` in the first consumer migration PR unless that PR explicitly targets it.
- Do not alter `dashboard/shared/*.js` in the first consumer migration PR unless that PR explicitly targets one of those files.
- Do not alter `data/projects.json` or `data/entitlements.json`.
- Do not alter `package.json`.
- Do not touch `node_modules/`.

## 8. Smoke test checklist

After the `js/lib/auth.js` migration, manually verify each item:

- [ ] Anonymous user visits `/dashboard/member.html`: user is redirected to `/` and sees the existing public login entry point.
- [ ] Anonymous user visits `/dashboard/premium.html`: user is redirected to `/` and does not see premium dashboard content.
- [ ] Anonymous user visits `/dashboard/admin.html`: user is redirected to `/` before admin data is loaded.
- [ ] Member user visits `/dashboard/member.html`: user remains on the member dashboard and receives a valid session.
- [ ] Member user attempts `/dashboard/premium.html`: user is redirected to `/dashboard/member.html`.
- [ ] Member user attempts `/dashboard/admin.html`: admin UI refuses access and the user does not receive admin capabilities.
- [ ] Premium user visits `/dashboard/premium.html`: user remains on the premium dashboard.
- [ ] Premium user visits `/dashboard/member.html`: user remains on the member dashboard unless the page's own code redirects elsewhere.
- [ ] Premium user attempts `/dashboard/admin.html`: admin UI refuses access and the user does not receive admin capabilities.
- [ ] Admin user visits `/dashboard/admin.html`: user remains on the admin dashboard and `session.isAdmin` is true.
- [ ] Admin user visits `/dashboard/member.html`: user can load the member dashboard as an authenticated user.
- [ ] Admin user uses impersonation flow if available: `teknoify_impersonate_uid` is set, effective UID changes, and impersonated sessions are not treated as admin sessions.
- [ ] User logs out from dashboard: impersonation key is cleared, Firebase signs out, and the browser is redirected to `/`.
- [ ] User with missing Firestore role document: session falls back to member role behavior and protected redirects remain safe.
- [ ] User with role as string: behavior is explicitly verified against current production expectations before and after normalization.
- [ ] User with role as object `{ type, status }`: `type` controls access and `status` remains preserved on the session role object.

## 9. Risk notes

- ES module path compatibility from `js/lib/auth.js` to `packages/*` must be tested in the browser, not only in Node-based tooling.
- Static hosting path resolution may differ between local development, preview hosting, and production hosting.
- Browser import behavior for files under `packages/` depends on whether those files are publicly served by the current host.
- Future package files may not be covered by the existing `npm run lint` script unless the next PR targets them manually.
- Frontend-only auth and role checks are still not sufficient for backend security; Firestore rules, backend APIs, and Cloud Functions must enforce authorization independently.
- Route constants currently include `/pages/login.html`, while `js/lib/auth.js` unauthenticated redirects currently use `/`; the future PR must avoid substituting a non-equivalent login route by accident.
- `getDashboardRouteForRole` normalizes unknown role types to member, while the current string-construction helper can produce unknown dashboard filenames; treat this as a reviewed safety improvement if adopted.

## 10. Phase 4F completion note

Phase 4F migrated only `js/lib/auth.js` to use equivalent route and role constants. It did not touch `js/script.js`, dashboard pages, Firebase setup, App Check setup, dashboard shared scripts, package scripts, or data files.
