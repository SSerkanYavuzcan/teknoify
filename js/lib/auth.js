import { auth, db, app } from "/js/lib/firebase.js";
import { getDashboardRouteForRole, PUBLIC_ROUTES } from "/packages/config/routes.js";
import {
  DEFAULT_ROLE_STATUS,
  DEFAULT_ROLE_TYPE,
  getRoleTypeFromRole,
  isAdminRole,
  isRoleAllowed,
} from "/packages/auth/roles.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Doğru CDN bağlantısı
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app-check.js";

// ================================================================
// APP CHECK BAŞLATMA
// ================================================================
if (app) {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        window.self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider('6LetmtgsAAAAAHOxEkJG4sa29oKLNnAZjQZ1dAwk'),
        isTokenAutoRefreshEnabled: true
    });
}

const IMPERSONATE_UID_KEY = "teknoify_impersonate_uid";

// ================================================================
// GÜVENLİK YARDIMCI FONKSİYONLARI
// ================================================================
function checkSecurityBan() {
    if (localStorage.getItem('tk_access_denied') === 'true') {
        document.documentElement.innerHTML = `
        <div style="background:#05080a; color:white; height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:sans-serif; text-align:center; padding:20px;">
            <h1 style="color:#ff4b4b; font-size:4rem; margin-bottom:0;">403</h1>
            <h2 style="margin-top:10px;">Erişim Reddedildi</h2>
        </div>`;
        window.stop();
        return true;
    }
    return false;
}

// GÜNCELLEME: Ayrı bir login sayfası olmadığı için ana sayfaya yönlendiriyoruz
function getLoginPath() {
  return PUBLIC_ROUTES.home;
}

function getDashboardPath(roleType = DEFAULT_ROLE_TYPE) {
  return getDashboardRouteForRole(getRoleTypeFromRole(roleType));
}

async function waitForAuthUser() {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user || null);
    });
  });
}

async function readUserDocument(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error("🚨 Firestore Veri Hatası:", err);
    return null;
  }
}

// ================================================================
// OTURUM YÖNETİMİ
// ================================================================
async function buildRealSession(user) {
  const userDoc = await readUserDocument(user.uid);
  const roleData = userDoc?.role || {
    type: DEFAULT_ROLE_TYPE,
    status: DEFAULT_ROLE_STATUS
  };
  const profileData = userDoc?.profile || {};

  return {
    uid: user.uid,
    email: user.email,
    name: profileData.fullName || user.email.split("@")[0],
    role: roleData,
    isAdmin: isAdminRole(roleData)
  };
}

async function getEffectiveSession(realSession) {
  const targetUid = window.localStorage.getItem(IMPERSONATE_UID_KEY);
  if (!realSession.isAdmin || !targetUid) return { ...realSession, impersonating: false };

  const targetDoc = await readUserDocument(targetUid);
  if (!targetDoc) {
    window.localStorage.removeItem(IMPERSONATE_UID_KEY);
    return { ...realSession, impersonating: false };
  }

  return {
    ...realSession,
    uid: targetUid,
    role: targetDoc.role || {
      type: DEFAULT_ROLE_TYPE,
      status: DEFAULT_ROLE_STATUS
    },
    impersonating: true,
    realIsAdmin: true,
    isAdmin: false
  };
}

export async function logout() {
  window.localStorage.removeItem(IMPERSONATE_UID_KEY);
  await signOut(auth);
  window.location.replace(getLoginPath());
}

/**
 * requireAuth: Sayfa Koruma Fonksiyonu
 */
export async function requireAuth({ allowedRoles = [] } = {}) {
  if (checkSecurityBan()) return null;

  const user = await waitForAuthUser();

  // Oturum yoksa ana sayfaya (login modal'ın olduğu yere) gönder
  if (!user) {
    console.warn("Oturum bulunamadı, ana sayfaya yönlendiriliyor...");
    window.location.href = getLoginPath(); // GÜNCELLEME: Yorum satırı kaldırıldı
    return null;
  }

  const real = await buildRealSession(user);
  const effective = await getEffectiveSession(real);

  // Rol kontrolü
  const roleType = getRoleTypeFromRole(effective.role);

  if (!isRoleAllowed(effective.role, allowedRoles)) {
    console.warn("Yetkisiz rol erişimi, dashboard köküne yönlendiriliyor.");
    window.location.href = getDashboardPath(roleType);
    return null;
  }

  console.log("✅ Oturum başarıyla doğrulandı:", roleType);
  return effective;
}
