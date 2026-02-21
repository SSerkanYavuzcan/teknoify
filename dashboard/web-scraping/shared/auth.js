/**
 * shared/auth.js
 * Firebase Auth + RBAC bootstrapper.
 * Reads PROJECT_CONFIG (must be loaded before this script).
 */

const _FIREBASE_CONFIG = {
  apiKey: "AIzaSyC1Id7kdU23_A7fEO1eDna0HKprvIM30E8",
  authDomain: "teknoify-9449c.firebaseapp.com",
  projectId: "teknoify-9449c",
  storageBucket: "teknoify-9449c.firebasestorage.app",
  messagingSenderId: "704314596026",
  appId: "1:704314596026:web:f63fff04c00b7a698ac083",
  measurementId: "G-1DZKJE7BXE"
};

if (!firebase.apps.length) firebase.initializeApp(_FIREBASE_CONFIG);
const auth = firebase.auth();

// ─── Helpers ──────────────────────────────────────────────────────────────────
function safeLower(s) { return String(s || "").trim().toLowerCase(); }

function toggleSidebar() { document.body.classList.toggle("sidebar-closed"); }

function safeStorageGet(storage, key) {
  try {
    return storage.getItem(key) || "";
  } catch {
    return "";
  }
}

function safeStorageSet(storage, key, value) {
  try {
    storage.setItem(key, value);
  } catch {
    // ignore
  }
}

function getImpersonatedContext() {
  const params = new URLSearchParams(window.location.search || "");
  const queryUid = String(params.get("imp_uid") || "").trim();
  const queryName = String(params.get("imp_name") || "").trim();

  const storageUid = (
    safeStorageGet(localStorage, "teknoify_impersonate_uid") ||
    safeStorageGet(localStorage, "tk_impersonate_uid") ||
    safeStorageGet(localStorage, "impersonate_uid") ||
    safeStorageGet(localStorage, "impersonateUid") ||
    safeStorageGet(sessionStorage, "teknoify_impersonate_uid") ||
    safeStorageGet(sessionStorage, "tk_impersonate_uid") ||
    safeStorageGet(sessionStorage, "impersonate_uid") ||
    safeStorageGet(sessionStorage, "impersonateUid")
  );

  const storageName =
    safeStorageGet(localStorage, "teknoify_impersonate_name") ||
    safeStorageGet(sessionStorage, "teknoify_impersonate_name");

  const uid = queryUid || String(storageUid || "").trim();
  const name = queryName || String(storageName || "").trim();

  if (uid) {
    safeStorageSet(localStorage, "teknoify_impersonate_uid", uid);
    try { localStorage.removeItem("tk_impersonate_uid"); } catch { /* ignore */ }
    if (name) safeStorageSet(localStorage, "teknoify_impersonate_name", name);
  }

  return { uid, name };
}

function applyUserUI(displayName) {
  const finalName = String(displayName || "User").trim() || "User";
  const nameEl = document.getElementById("user-name-display");
  const avatarEl = document.getElementById("user-avatar");

  if (nameEl) nameEl.textContent = finalName;
  if (avatarEl) avatarEl.textContent = finalName.charAt(0).toUpperCase();
}

function resolveDisplayName({ user, isImpersonating, impersonatedName }) {
  const realEmail = safeLower(user?.email);
  const realName = String(user?.displayName || "").trim();

  if (isImpersonating && impersonatedName) return impersonatedName;
  if (isImpersonating) return "İmpersonated User";
  if (realName) return realName;
  if (realEmail) return realEmail.split("@")[0];
  return "User";
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
async function bootstrap() {
  const cfg = PROJECT_CONFIG;

  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = cfg.rootPath + "pages/login.html";
      return;
    }

    try {
      const realUid = user.uid;
      const imp = getImpersonatedContext();
      const isImpersonating = Boolean(imp.uid && imp.uid !== realUid);
      const effectiveUid = isImpersonating ? imp.uid : realUid;

      const displayName = resolveDisplayName({
        user,
        isImpersonating,
        impersonatedName: imp.name
      });
      applyUserUI(displayName);

      // yetki/entitlement kontrolü backend'de effective_uid ile yapılır.
      window.USER_ALLOWED_STORES = [];
      window.USER_EFFECTIVE_UID = effectiveUid;
      window.USER_IS_IMPERSONATING = isImpersonating;

      initCalendar();
    } catch (err) {
      console.error("Bootstrap error:", err);
      const tbody = document.getElementById("table-body");
      if (tbody) {
        tbody.innerHTML =
          '<tr><td colspan="100%" style="text-align:center;padding:30px;color:#ef4444;">Profil yüklenirken hata oluştu.</td></tr>';
      }
    }
  });

  // Global menu close
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".multi-select-wrapper")) {
      document.querySelectorAll(".multi-select-menu").forEach((m) => m.classList.remove("show"));
    }
    const wrapper = document.querySelector(".download-wrapper");
    const menu = document.getElementById("download-menu");
    if (wrapper && menu && !wrapper.contains(e.target)) menu.classList.remove("show");
  });
}

function logout() {
  if (confirm("Çıkış yapmak istediğinize emin misiniz?")) {
    auth.signOut().finally(() => {
      window.location.href = PROJECT_CONFIG.rootPath + "index.html";
    });
  }
}

document.addEventListener("DOMContentLoaded", bootstrap);
