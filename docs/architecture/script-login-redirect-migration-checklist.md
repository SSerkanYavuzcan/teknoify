# Phase 4G: `js/script.js` Login Redirect Migration Checklist

## 1. Title and purpose

This document is the **Phase 4G** planning checklist for a future
`js/script.js` login redirect migration to centralized route and role constants.

Phase 4G is **documentation-only**. It records the current behavior of the
legacy public-site script before any runtime import, redirect, Firebase, App
Check, login modal, UI, contact form, terminal, or background-effect behavior is
changed.

## 2. Candidate consumer

`js/script.js` is the next candidate consumer because it contains login redirect
logic and legacy auth UI behavior. It is also a high-risk candidate because the
same file contains unrelated UI systems, contact form behavior, terminal effects,
background effects, legacy/global Firebase setup, App Check initialization, and
DOM orchestration. The first runtime migration for this file must avoid touching
those unrelated systems.

## 3. Current behavior snapshot

### Firebase config usage

- `js/script.js` defines an inline `firebaseConfig` object with the current API
  key, auth domain, project ID, storage bucket, messaging sender ID, app ID, and
  measurement ID.
- The script uses that local object directly when initializing the global
  Firebase app.

### Legacy/global Firebase initialization

- The script assumes the browser `firebase` global exists.
- It calls `firebase.initializeApp(firebaseConfig)` only when `firebase` is
  defined and `firebase.apps.length` is empty.
- If Firebase is missing or an app already exists, initialization is skipped.

### App Check initialization and debug token behavior

- App Check is initialized only when `firebase` exists and `firebase.appCheck` is
  available.
- On `localhost` or `127.0.0.1`, the script sets
  `self.FIREBASE_APPCHECK_DEBUG_TOKEN = true` before activation.
- It activates App Check through `firebase.appCheck().activate()` with the
  existing reCAPTCHA v3 site key and token auto-refresh enabled.

### `auth`/`db` global setup

- `auth` is assigned to `firebase.auth()` only when the global Firebase object
  exists and exposes `firebase.auth` as a function; otherwise it is `null`.
- `db` is assigned to `firebase.firestore()` only when the global Firebase object
  exists and exposes `firebase.firestore` as a function; otherwise it is `null`.
- The rest of the auth UI code tolerates `auth === null` by opening the modal or
  returning early, depending on the path.

### `consumePostLoginRedirect()` behavior

- Reads `tk_post_login_redirect` from `sessionStorage` inside a `try` block.
- Removes `tk_post_login_redirect` from `sessionStorage` immediately when a value
  exists, even before the value is validated.
- Logs `Post-login yönlendirmesi okunamadı.` with `error.message` if storage
  access fails.
- Returns the stored path only when it exists and starts with `/`; otherwise it
  returns `null`.

### `redirectAfterLogin(isAdmin, isPremium)` behavior

- Calls `consumePostLoginRedirect()` first.
- If a valid post-login redirect exists, assigns it to `window.location.href` and
  skips role-based dashboard routing.
- Without a post-login redirect, admin users go to `/dashboard/admin.html`.
- Without a post-login redirect, non-admin premium users go to
  `/dashboard/premium.html`.
- All remaining users go to `/dashboard/member.html`.
- The function currently accepts boolean flags and must keep the signature
  `redirectAfterLogin(isAdmin, isPremium)` in the next runtime PR.

### Admin, premium, and member redirect outcomes

- `isAdmin === true` wins over `isPremium === true` when no post-login redirect
  exists.
- `isAdmin === false` and `isPremium === true` routes to the premium dashboard.
- `isAdmin === false` and `isPremium === false` routes to the member dashboard.
- Role-check failures outside `redirectAfterLogin()` also fall back to the member
  dashboard.

### Post-login redirect behavior

- A valid `tk_post_login_redirect` value must remain higher priority than role
  dashboards after login.
- Only root-relative values beginning with `/` are accepted.
- The stored value is consumed once because it is removed from `sessionStorage`
  as soon as it is read.

### `DOMContentLoaded` orchestration

On `DOMContentLoaded`, the script currently initializes systems in this order:

1. If `#loginModal` exists, instantiate `AuthSystem`.
2. Instantiate `UISystem` unconditionally.
3. If `.contact-form` exists, instantiate `ContactSystem`.
4. After a 200 ms timeout, instantiate `TerminalEffect('#heroTerminal')` when
   `#heroTerminal` exists.
5. In the same timeout, instantiate `BackgroundFX('#stars-container')` when
   `#stars-container` exists.

### `AuthSystem` constructor behavior

- Stores references to `#loginModal`, `#loginForm`, and triggers matching
  `#openLoginBtn, .trigger-login`.
- Exposes the instance as `window.teknoifyAuthSystem`.
- Calls `bindEvents()` immediately.
- Calls `checkCurrentUser()` immediately after binding events.

### Login modal trigger behavior

- Every login trigger prevents the default click action.
- If `auth.currentUser` exists, the click path performs role detection and then
  redirects.
- If no current user exists, the click opens the login modal.

### Current-user click behavior

- For an existing user, the click handler reads custom claims from
  `user.getIdTokenResult()` without forcing refresh.
- It sets `isAdmin` from `claims.admin` and `isPremium` from `claims.premium`.
- If the token does not identify an admin and `db` is available, it reads the
  Firestore `users/{uid}` document and derives role flags from `data.role`.
- On success, it calls `redirectAfterLogin(isAdmin, isPremium)`.
- On role-check failure, it logs
  `Kullanıcı rolü kontrol edilemedi, standart üyeye yönlendiriliyor.` and sends
  the user to `/dashboard/member.html`.

### Modal open/close behavior

- `open()` adds `active` to the modal and sets `document.body.style.overflow` to
  `hidden`.
- `close()` removes `active` from the modal and restores
  `document.body.style.overflow` to an empty string.
- The `.modal-close` button closes the modal.
- Clicking the modal backdrop closes the modal only when `e.target === modal`.
- Pressing Escape closes the modal only when the modal exists and currently has
  the `active` class.

### Login submit behavior

- Login submission prevents the default form submit.
- It reads and trims `#email` and `#password` values.
- If `auth` is unavailable, it returns without changing redirects.
- It changes the submit button to a spinner state with
  `Kontrol Ediliyor...` and disables the button.
- It calls `auth.signInWithEmailAndPassword(emailInput, passInput)`.
- After successful sign-in, it waits 600 ms before role checks to let Firebase
  Auth synchronize.
- It reads forced-refresh custom claims through `user.getIdTokenResult(true)`.
- If no admin claim is present and `db` is available, it reads the Firestore
  `users/{uid}` document for fallback role detection.
- It writes `session_start_time` to `localStorage` with `Date.now()` after role
  detection succeeds.
- It shows the success button state `Giriş Başarılı`, changes the button
  background to `#10b981`, and redirects after 500 ms.
- If the role/database check fails after sign-in, it logs
  `--- YETKİ KONTROL UYARISI ---`, shows the same success button state, and
  redirects with `redirectAfterLogin(false, false)` after 1000 ms.
- If sign-in fails, it logs `Giriş Hatası:`, maps selected Firebase Auth error
  codes to existing Turkish messages, calls `showToast("Erişim Reddedildi", msg,
"error")` when available, and restores the original button HTML/enabled state.

### Role detection from token claims

- Current-user trigger clicks use `user.getIdTokenResult()` and inspect
  `claims.admin` and `claims.premium`.
- Login submit uses `user.getIdTokenResult(true)` and inspects the same claim
  names.
- Claims are converted to booleans with `!!`.

### Role detection from Firestore user document

- Both the current-user trigger path and login-submit path read
  `db.collection('users').doc(user.uid).get()` when token claims do not already
  identify the user as admin and `db` is available.
- The collection name is `users` and must not change.
- Firestore fallback is skipped when `db` is unavailable.

### String role vs. object role handling

- The current-user trigger path supports both direct role strings and role
  objects by checking `data.role === 'admin'`, `data.role === 'premium'`,
  `data.role.type === 'admin'`, and `data.role.type === 'premium'`.
- The login-submit path normalizes `data.role` to a local `roleType`, supporting
  `role: "admin"`, `role: "premium"`, `role: { type: "admin" }`, and
  `role: { type: "premium" }`.
- Any missing, unknown, or non-admin/non-premium role falls through to member
  routing.

### `localStorage` `session_start_time` behavior

- `session_start_time` is written only after successful sign-in and successful
  role detection.
- The stored value is `Date.now()`.
- If the role/database check throws after sign-in, the catch path does not write
  `session_start_time` before redirecting to member.

### Fallback behavior when role check fails

- Existing logged-in trigger role-check failures go directly to
  `/dashboard/member.html`.
- Login-submit role/database failures after successful sign-in call
  `redirectAfterLogin(false, false)`, which still consumes any valid post-login
  redirect first and otherwise sends the user to `/dashboard/member.html`.

### Error handling behavior

- Storage read errors in `consumePostLoginRedirect()` are logged as warnings and
  result in no post-login redirect.
- Existing-user role-check errors are logged as warnings and route to member.
- Post-sign-in role/database errors are logged as warnings and use the member
  fallback through `redirectAfterLogin(false, false)`.
- Sign-in failures log an error, choose one of the existing Turkish user-facing
  messages, and call `showToast` when available.

### UI, contact, terminal, and background systems

- `UISystem` controls header scroll state, hamburger menu state, nav-menu close
  behavior on nav-link click, and closing the active menu on outside document
  clicks.
- `ContactSystem` owns `.contact-form`, the honeypot `#tk_hp_field`, the API URL
  `https://api.teknoify.com/submitContactForm`, one-minute repeat-submit
  throttling via `tk_last_success`, contact validation, bot ban state through
  `tk_access_denied`, payload construction, success/error toasts, and submit
  button loading/restoration.
- `TerminalEffect` continuously types a predefined terminal sequence in
  `#heroTerminal`.
- `BackgroundFX` clears `#stars-container` and creates 20 stars on narrow
  screens or 50 stars otherwise.

### Hardcoded route and URL strings in `js/script.js`

- `/dashboard/admin.html`
- `/dashboard/premium.html`
- `/dashboard/member.html`
- `https://api.teknoify.com/submitContactForm`

## 4. Proposed future imports for the next runtime PR

These imports are **future-only**. Do not add them in Phase 4G.

- `getDashboardRouteForRole` from `/packages/config/routes.js`
- `DASHBOARD_ROUTES` from `/packages/config/routes.js`, only if direct route
  names are clearer than a helper for the boolean mapping
- `getRoleTypeFromRole` from `/packages/auth/roles.js`
- `ROLE_TYPES` from `/packages/auth/roles.js`
- `normalizeRoleType` from `/packages/auth/roles.js`, only if a tiny local
  adapter needs explicit fallback semantics

The future runtime PR must first verify how `js/script.js` is loaded before
adding any ES module import.

## 5. Exact behavior preservation requirements

- Existing Firebase config must not change.
- Existing App Check site key and debug token behavior must not change.
- Existing auth/db setup must not change.
- `consumePostLoginRedirect()` behavior must not change.
- If a valid post-login redirect exists, it must remain prioritized over
  role-based dashboard redirects.
- Admin users must still go to `/dashboard/admin.html`.
- Premium users must still go to `/dashboard/premium.html`.
- Standard/member users must still go to `/dashboard/member.html`.
- Firestore fallback role detection must support both `role: "admin"` and
  `role: { type: "admin" }`.
- Role check error fallback must remain the member dashboard, except for the
  existing post-sign-in path where `redirectAfterLogin(false, false)` may still
  consume a valid post-login redirect first.
- Login modal open/close behavior must not change.
- DOMContentLoaded initialization order must not change.
- UI effects/contact form behavior must not change.
- `session_start_time` localStorage behavior must not change.
- Error messages/toasts must not change.

## 6. Proposed code-change plan for the next PR

1. Verify whether `js/script.js` is loaded as a classic script or an ES module.
2. Add imports from route/role constants only if the loading mode supports them
   safely.
3. Update only `redirectAfterLogin()` first.
4. Keep the function signature `redirectAfterLogin(isAdmin, isPremium)`
   unchanged.
5. Convert the existing boolean flags to the same existing target dashboard route
   using constants.
6. Optionally add a tiny local helper only if it reduces duplication without
   changing behavior.
7. Do not touch Firebase initialization.
8. Do not touch App Check setup.
9. Do not touch login modal open/close code.
10. Do not touch `ContactSystem`, `UISystem`, `TerminalEffect`, or
    `BackgroundFX`.
11. Do not migrate Firestore role extraction in the same PR unless it is trivial
    and behavior-identical.
12. Run static behavior review for redirect outputs.

## 7. Do-not-change list

- Do not alter Firebase config.
- Do not alter App Check site key.
- Do not alter auth/db initialization.
- Do not alter Firestore collection names.
- Do not alter post-login redirect storage key.
- Do not alter modal DOM selectors.
- Do not alter visual effects.
- Do not alter contact form behavior.
- Do not alter error messages.
- Do not alter dashboard route filenames.
- Do not alter `package.json`.
- Do not alter data files.

## 8. Smoke test checklist

After the future runtime PR, manually verify the following cases:

- [ ] Anonymous user clicks login trigger: the login modal opens and body scroll
      is disabled.
- [ ] Logged-in admin clicks login/dashboard trigger: the user is redirected to
      `/dashboard/admin.html` unless a valid post-login redirect exists.
- [ ] Logged-in premium user clicks login/dashboard trigger: the user is
      redirected to `/dashboard/premium.html` unless a valid post-login redirect
      exists.
- [ ] Logged-in member user clicks login/dashboard trigger: the user is
      redirected to `/dashboard/member.html` unless a valid post-login redirect
      exists.
- [ ] User logs in successfully as admin: the success button state appears and
      the user lands on `/dashboard/admin.html` unless a valid post-login
      redirect exists.
- [ ] User logs in successfully as premium: the success button state appears and
      the user lands on `/dashboard/premium.html` unless a valid post-login
      redirect exists.
- [ ] User logs in successfully as member: the success button state appears and
      the user lands on `/dashboard/member.html` unless a valid post-login
      redirect exists.
- [ ] User starts from premium overlay or saved post-login redirect and logs in:
      the saved root-relative redirect is consumed once and wins over the
      dashboard route.
- [ ] Firestore role as string: `role: "admin"` and `role: "premium"` still map
      to the admin and premium dashboards respectively.
- [ ] Firestore role as object: `role: { type: "admin" }` and
      `role: { type: "premium" }` still map to the admin and premium dashboards
      respectively.
- [ ] Token claims admin: `claims.admin` still sends the user to the admin
      dashboard without needing Firestore role data.
- [ ] Token claims premium: `claims.premium` still sends a non-admin user to the
      premium dashboard.
- [ ] Firestore role check failure fallback: the existing-user click path falls
      back to `/dashboard/member.html`, and the post-sign-in path uses
      `redirectAfterLogin(false, false)`.
- [ ] Wrong password / failed login: the modal remains open, the button is
      restored, and the existing error toast text is shown.
- [ ] Modal close by button: clicking `.modal-close` removes `active` and
      restores body scrolling.
- [ ] Modal close by backdrop: clicking the backdrop itself removes `active` and
      restores body scrolling.
- [ ] Modal close by Escape: pressing Escape while the modal is active removes
      `active` and restores body scrolling.
- [ ] Contact form still works if present: validation, throttling, honeypot,
      fetch payload, toasts, and button restoration match the current behavior.
- [ ] Terminal/background effects still initialize if present: terminal typing
      and star generation still begin after the existing delayed initialization.

## 9. Risk notes

- `js/script.js` uses legacy global Firebase while `js/lib/auth.js` uses modular
  Firebase.
- Importing ES modules into a legacy script may require changing script tags
  later, so the next PR must inspect how `js/script.js` is loaded before adding
  imports.
- If `js/script.js` is loaded as a normal script, direct ES imports will break
  unless converted to `type="module"` or constants are exposed another way.
- Therefore, the future runtime PR must first verify script loading mode before
  adding imports.
- UI behavior is mixed with auth behavior, so avoid broad refactors.
- Redirect migration should be isolated from Firebase/App Check centralization.

## 10. Recommended next runtime PR

The next runtime PR should migrate only `redirectAfterLogin()` route target
selection if `js/script.js` can safely import ES modules. If not, create a bridge
strategy first rather than converting the whole script to a module.
