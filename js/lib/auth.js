import { auth, db, app } from "/js/lib/firebase.js";
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
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
        self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
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

function getLoginPath() {
  return "/login.html"; // Ana dizindeki login sayfası
}

function getDashboardPath(roleType = "member") {
  const page = roleType === "admin" ? "admin.html" : `${roleType}.html`;
  return `/dashboard/${page}`;
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
  const roleData = userDoc?.role || { type: "member", status: "active" };
  const profileData = userDoc?.profile || {};

  return {
    uid: user.uid,
    email: user.email,
    name: profileData.fullName || user.email.split("@")[0],
    role: roleData,
    isAdmin: roleData.type === "admin"
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
    role: targetDoc.role || { type: "member", status: "active" },
    impersonating: true,
    realIsAdmin: true,
    isAdmin: false
  };
}

export async function logout() {
  window.localStorage.removeItem(IMPERSONATE_UID_KEY);
  await signOut(auth);
  window.location.replace("/");
}

/**
 * requireAuth: Sayfa Koruma Fonksiyonu
 */
export async function requireAuth({ allowedRoles = [] } = {}) {
  if (checkSecurityBan()) return null;

  const user = await waitForAuthUser();

  // Oturum yoksa login'e gönder
  if (!user) {
    console.warn("Oturum bulunamadı, login sayfasına yönlendiriliyor...");
    window.location.href = getLoginPath();
    return null;
  }

  const real = await buildRealSession(user);
  const effective = await getEffectiveSession(real);

  // Rol kontrolü
  if (allowedRoles.length > 0 && !allowedRoles.includes(effective.role.type)) {
    console.warn("Yetkisiz rol erişimi, dashboard köküne yönlendiriliyor.");
    window.location.href = getDashboardPath(effective.role.type);
    return null;
  }

  console.log("✅ Oturum başarıyla doğrulandı:", effective.role.type);
  return effective;
}
